import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { World } from './world'
import { Car, SEAT_POSITION } from './car'
import { Princess } from './princess'
import { Spawner } from './spawner'
import { Particles } from './particles'
import { AudioKit } from './audio'
import { UI } from './ui'
import { starGeo, MAT } from './common3d'

type State = 'menu' | 'intro' | 'playing' | 'celebrate' | 'over'

const MAX_HEARTS = 3
const BASE_SPEED = 13
const MAX_SPEED = 26
const BEST_KEY = 'princess-race-best'

// Intro: walk to the car, then hop in
const WALK_FROM = new THREE.Vector3(3.6, 0, 1.8)
const WALK_TO = new THREE.Vector3(1.45, 0, 0.8)
const WALK_TIME = 1.5
const HOP_TIME = 0.6

// Celebration: podium rises, princess hops on top
const PODIUM_POS = new THREE.Vector3(0, 0, -6)
const PODIUM_TOP = 1.1
const CELE_JUMP_START = 0.45
const CELE_JUMP_TIME = 0.85
const CELE_SHOW_SCREEN = 3.6

export class Game {
  private renderer: THREE.WebGLRenderer
  private camera: THREE.PerspectiveCamera
  private composer: EffectComposer
  private world = new World()
  private car = new Car()
  private princess = new Princess()
  private podium: THREE.Group
  private spawner: Spawner
  private particles: Particles
  private audio = new AudioKit()
  private ui = new UI()
  private clock = new THREE.Clock()

  private state: State = 'menu'
  private stateTime = 0
  private speed = BASE_SPEED
  private hearts = MAX_HEARTS
  private coins = 0
  private invincibleFor = 0
  private elapsed = 0
  private confettiTimer = 0
  private jumpFrom = new THREE.Vector3()

  private camPos = new THREE.Vector3(0, 5.6, 9.2)
  private camLook = new THREE.Vector3(0, 0.9, -16)

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    container.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 400)
    this.camera.position.copy(this.camPos)
    this.camera.lookAt(this.camLook)

    // Soft studio reflections make the gold and the car paint shine
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.world.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    this.world.scene.environmentIntensity = 0.18

    this.world.scene.add(this.car.group)

    // The princess waits at the roadside until the run starts
    this.princess.group.position.copy(WALK_FROM)
    this.princess.group.rotation.y = Math.PI / 2
    this.world.scene.add(this.princess.group)

    this.podium = this.buildPodium()
    this.podium.position.copy(PODIUM_POS)
    this.podium.visible = false
    this.world.scene.add(this.podium)

    this.spawner = new Spawner(this.world.scene)
    this.particles = new Particles(this.world.scene)

    // Post-processing: soft bloom makes coins and the sun glow
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.world.scene, this.camera))
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.7, 0.93
    )
    this.composer.addPass(bloom)
    this.composer.addPass(new OutputPass())

    window.addEventListener('resize', () => this.onResize())

    this.ui.onStart = () => this.beginRun()
    this.ui.onRestart = () => this.beginRun()
    this.ui.onLeft = () => { if (this.state === 'playing') this.car.moveLeft() }
    this.ui.onRight = () => { if (this.state === 'playing') this.car.moveRight() }
    this.ui.onToggleMute = () => this.audio.toggleMute()

    this.ui.showStart()
  }

  private buildPodium(): THREE.Group {
    const g = new THREE.Group()
    const steps: Array<[number, number, THREE.Material]> = [
      [0, 1.1, MAT.gold],
      [-1.3, 0.7, MAT.rose],
      [1.3, 0.5, MAT.lavender],
    ]
    for (const [x, h, mat] of steps) {
      const step = new THREE.Mesh(new RoundedBoxGeometry(1.25, h, 1.4, 3, 0.08), mat)
      step.position.set(x, h / 2, 0)
      step.castShadow = true
      step.receiveShadow = true
      g.add(step)
    }
    const star = new THREE.Mesh(starGeo(0.3, 0.08), MAT.cream)
    star.position.set(0, 0.62, 0.72)
    g.add(star)
    return g
  }

  private onResize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
    this.composer.setSize(w, h)
  }

  private setState(state: State) {
    this.state = state
    this.stateTime = 0
  }

  private beginRun() {
    this.audio.ensure()
    this.speed = BASE_SPEED
    this.hearts = MAX_HEARTS
    this.coins = 0
    this.invincibleFor = 0
    this.elapsed = 0
    this.car.lane = 1
    this.car.group.position.set(0, 0, 0)
    this.car.setBlinking(false)
    this.spawner.reset()
    this.podium.visible = false

    // Princess starts at the roadside and walks in
    this.world.scene.add(this.princess.group)
    this.princess.group.position.copy(WALK_FROM)
    this.princess.group.rotation.set(0, Math.PI / 2, 0)
    this.princess.setPose('walk')

    this.ui.showPlaying()
    this.ui.setHearts(this.hearts, MAX_HEARTS)
    this.ui.setCoins(this.coins)
    this.setState('intro')
  }

  private startDriving() {
    // Sit the princess in the car
    this.car.group.add(this.princess.group)
    this.princess.group.position.copy(SEAT_POSITION)
    this.princess.group.rotation.set(0, 0, 0)
    this.princess.setPose('drive')
    this.audio.vroom()
    this.audio.startMusic()
    this.setState('playing')
  }

  private startCelebration() {
    this.audio.stopMusic()
    this.audio.victory()
    this.car.setBlinking(false)
    this.spawner.clear()

    // Podium rises ahead of the car
    this.podium.visible = true
    this.podium.position.set(PODIUM_POS.x, -1.4, PODIUM_POS.z)

    // Princess leaves the car (keep her world position)
    this.princess.group.getWorldPosition(this.jumpFrom)
    this.world.scene.add(this.princess.group)
    this.princess.group.position.copy(this.jumpFrom)
    this.setState('celebrate')
  }

  private updateIntro(dt: number) {
    const t = this.stateTime
    this.princess.update(dt)

    if (t < WALK_TIME) {
      const p = t / WALK_TIME
      this.princess.group.position.lerpVectors(WALK_FROM, WALK_TO, p)
      this.princess.group.position.y = Math.abs(Math.sin(p * Math.PI * 5)) * 0.09
    } else if (t < WALK_TIME + HOP_TIME) {
      if (this.princess.pose !== 'idle') this.princess.setPose('idle')
      const p = (t - WALK_TIME) / HOP_TIME
      const seatWorld = SEAT_POSITION.clone().add(this.car.group.position)
      this.princess.group.position.lerpVectors(WALK_TO, seatWorld, p)
      this.princess.group.position.y += Math.sin(p * Math.PI) * 0.85
      this.princess.group.rotation.y = (1 - p) * Math.PI / 2
    } else {
      this.startDriving()
    }
  }

  private updateCelebrate(dt: number) {
    const t = this.stateTime
    this.princess.update(dt)

    // Podium rises
    this.podium.position.y = Math.min(0, -1.4 + t * 2.8)

    // Princess hops from the car to the top step
    if (t >= CELE_JUMP_START && t < CELE_JUMP_START + CELE_JUMP_TIME) {
      const p = (t - CELE_JUMP_START) / CELE_JUMP_TIME
      const target = new THREE.Vector3(PODIUM_POS.x, PODIUM_TOP, PODIUM_POS.z)
      this.princess.group.position.lerpVectors(this.jumpFrom, target, p)
      this.princess.group.position.y += Math.sin(p * Math.PI) * 1.4
      this.princess.group.rotation.y = p * Math.PI
    } else if (t >= CELE_JUMP_START + CELE_JUMP_TIME) {
      if (this.princess.pose !== 'cheer') this.princess.setPose('cheer')
      this.princess.group.rotation.y = Math.PI
      this.princess.group.position.set(
        PODIUM_POS.x,
        PODIUM_TOP + Math.abs(Math.sin((t - CELE_JUMP_START - CELE_JUMP_TIME) * 5)) * 0.16,
        PODIUM_POS.z
      )

      // Confetti bursts around the podium
      this.confettiTimer -= dt
      if (this.confettiTimer <= 0) {
        this.confettiTimer = 0.35
        this.particles.burst(new THREE.Vector3(
          PODIUM_POS.x + (Math.random() - 0.5) * 3,
          2.6 + Math.random() * 1.2,
          PODIUM_POS.z + (Math.random() - 0.5) * 2
        ), 10)
      }
    }

    if (t >= CELE_SHOW_SCREEN && this.state === 'celebrate') {
      const best = Math.max(this.coins, Number(localStorage.getItem(BEST_KEY) ?? 0))
      localStorage.setItem(BEST_KEY, String(best))
      this.ui.showGameOver(this.coins, best)
      this.setState('over')
    }
  }

  private checkCollisions() {
    const carX = this.car.group.position.x

    for (const coin of this.spawner.coins) {
      if (!coin.active) continue
      const dz = Math.abs(coin.root.position.z)
      const dx = Math.abs(coin.root.position.x - carX)
      if (dz < 1.4 && dx < 1.1) {
        coin.active = false
        coin.root.visible = false
        this.coins++
        this.ui.setCoins(this.coins)
        this.audio.coin()
        this.particles.burst(coin.root.position.clone())
      }
    }

    if (this.invincibleFor > 0) return

    for (const obstacle of this.spawner.obstacles) {
      if (!obstacle.active) continue
      const dz = Math.abs(obstacle.root.position.z)
      const dx = Math.abs(obstacle.root.position.x - carX)
      if (dz < 1.5 && dx < 1.2) {
        obstacle.active = false
        obstacle.root.visible = false
        this.hearts--
        this.ui.setHearts(this.hearts, MAX_HEARTS)
        this.audio.hit()
        if (this.hearts <= 0) {
          this.startCelebration()
        } else {
          this.invincibleFor = 1.8
          this.car.setBlinking(true)
        }
        return
      }
    }
  }

  start() {
    this.renderer.setAnimationLoop(() => this.tick())
  }

  private tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05)
    this.stateTime += dt

    switch (this.state) {
      case 'menu':
        this.world.update(dt, 4)
        this.car.update(dt, 4)
        this.princess.update(dt)
        break

      case 'intro':
        this.car.update(dt, 0)
        this.updateIntro(dt)
        break

      case 'playing': {
        this.elapsed += dt
        this.speed = Math.min(MAX_SPEED, BASE_SPEED + this.elapsed * 0.22)
        this.world.update(dt, this.speed)
        this.spawner.update(dt, this.speed)
        this.car.update(dt, this.speed)
        this.princess.update(dt)
        this.checkCollisions()
        if (this.invincibleFor > 0) {
          this.invincibleFor -= dt
          this.car.blink(this.elapsed)
          if (this.invincibleFor <= 0) this.car.setBlinking(false)
        }
        break
      }

      case 'celebrate':
      case 'over':
        this.car.update(dt, 0)
        this.updateCelebrate(dt)
        break
    }

    this.particles.update(dt, this.state === 'playing' ? this.speed : 0)
    this.updateCamera(dt)
    this.composer.render()
  }

  private updateCamera(dt: number) {
    const targetPos = new THREE.Vector3()
    const targetLook = new THREE.Vector3()

    const landed = this.state === 'over' ||
      (this.state === 'celebrate' && this.stateTime >= CELE_JUMP_START + CELE_JUMP_TIME)
    if (landed) {
      // Glide in only after the princess lands on the podium
      targetPos.set(0, 2.7, -0.8)
      targetLook.set(0, 1.7, PODIUM_POS.z)
    } else {
      const carX = this.car.group.position.x
      targetPos.set(carX * 0.55, 5.6, 9.2)
      targetLook.set(carX * 0.33, 0.9, -16)
    }

    const k = Math.min(1, dt * 2.6)
    this.camPos.lerp(targetPos, k)
    this.camLook.lerp(targetLook, k)
    this.camera.position.copy(this.camPos)
    this.camera.lookAt(this.camLook)
  }
}
