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
import { starGeo, MAT, CAR_COLORS, type CarColorId } from './common3d'

type State = 'menu' | 'intro' | 'playing' | 'paused' | 'celebrate' | 'over'

const MAX_HEARTS = 3
const BEST_KEY = 'princess-race-best'
const BANK_KEY = 'princess-race-bank'
const THEME_EVERY_COINS = 40
const POWER_DURATION = 6

const SPEED_MODES = {
  calm: { base: 10, max: 16, ramp: 0.1 },
  fast: { base: 13, max: 26, ramp: 0.22 },
}

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
  private speed = SPEED_MODES.fast.base
  private speedMode = SPEED_MODES.fast
  private hearts = MAX_HEARTS
  private coins = 0
  private invincibleFor = 0
  private magnetFor = 0
  private shieldFor = 0
  private sparkleTimer = 0
  private themeIndex = 0
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
    this.ui.onPause = () => this.pause()
    this.ui.onResume = () => this.resume()
    this.ui.onHome = () => this.goHome()
    this.ui.onColorSelect = (id) => this.applyCarColor(id)

    // Pause automatically when the tab is hidden (kid switches apps)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause()
    })

    this.applyCarColor(this.ui.selectedColor)
    this.ui.renderGarage(this.bank)
    this.ui.showStart()
  }

  private get bank(): number {
    return Number(localStorage.getItem(BANK_KEY) ?? 0)
  }

  private applyCarColor(id: CarColorId) {
    const color = CAR_COLORS.find((c) => c.id === id) ?? CAR_COLORS[0]
    MAT.paint.color.setHex(color.paint)
    MAT.paintDeep.color.setHex(color.deep)
  }

  private pause() {
    if (this.state !== 'playing') return
    this.state = 'paused'
    this.audio.stopMusic()
    this.ui.showPause()
  }

  private resume() {
    if (this.state !== 'paused') return
    this.state = 'playing'
    this.audio.startMusic()
    this.ui.hidePause()
  }

  private goHome() {
    if (this.state !== 'paused' && this.state !== 'over') return
    this.audio.stopMusic()
    this.spawner.clear()
    this.podium.visible = false
    this.car.lane = 1
    this.car.group.position.set(0, 0, 0)
    this.world.scene.add(this.princess.group)
    this.princess.group.position.copy(WALK_FROM)
    this.princess.group.rotation.set(0, Math.PI / 2, 0)
    this.princess.setPose('idle')
    this.ui.renderGarage(this.bank)
    this.ui.showStart()
    this.setState('menu')
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
    this.speedMode = SPEED_MODES[this.ui.speedMode]
    this.speed = this.speedMode.base
    this.hearts = MAX_HEARTS
    this.coins = 0
    this.invincibleFor = 0
    this.magnetFor = 0
    this.shieldFor = 0
    this.themeIndex = 0
    this.world.transitionTo(0)
    MAT.paint.emissiveIntensity = 0
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

    // Collected coins go into the garage bank
    localStorage.setItem(BANK_KEY, String(this.bank + this.coins))
    MAT.paint.emissiveIntensity = 0
    this.ui.setPower(null, 0)
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
      const stars = this.coins >= 30 ? 3 : this.coins >= 15 ? 2 : 1
      this.ui.showGameOver(this.coins, best, stars)
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

    // Pickups: heart, magnet, star shield
    for (const pickup of this.spawner.pickups) {
      if (!pickup.active) continue
      const dz = Math.abs(pickup.root.position.z)
      const dx = Math.abs(pickup.root.position.x - carX)
      if (dz < 1.5 && dx < 1.2) {
        pickup.active = false
        pickup.root.visible = false
        this.particles.burst(pickup.root.position.clone())
        if (pickup.kind === 'heart') {
          this.hearts = Math.min(MAX_HEARTS, this.hearts + 1)
          this.ui.setHearts(this.hearts, MAX_HEARTS)
          this.audio.heartPickup()
        } else if (pickup.kind === 'magnet') {
          this.magnetFor = POWER_DURATION
          this.audio.magnetPickup()
        } else {
          this.shieldFor = POWER_DURATION
          this.audio.shieldPickup()
        }
      }
    }

    for (const obstacle of this.spawner.obstacles) {
      if (!obstacle.active) continue
      const dz = Math.abs(obstacle.root.position.z)
      const dx = Math.abs(obstacle.root.position.x - carX)
      if (dz < 1.5 && dx < 1.2) {
        // With the star shield the obstacle pops harmlessly
        if (this.shieldFor > 0) {
          obstacle.active = false
          obstacle.root.visible = false
          this.particles.burst(obstacle.root.position.clone(), 18)
          this.audio.pop()
          continue
        }
        if (this.invincibleFor > 0) continue
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

  /** Magnet pulls coins toward the car; the star shield sparkles. */
  private updatePowers(dt: number) {
    const carX = this.car.group.position.x

    if (this.magnetFor > 0) {
      this.magnetFor -= dt
      for (const coin of this.spawner.coins) {
        if (!coin.active) continue
        const z = coin.root.position.z
        if (z > -22 && z < 2) {
          coin.root.position.x += (carX - coin.root.position.x) * Math.min(1, dt * 5)
          coin.root.position.z += this.speed * dt * 0.5
        }
      }
    }

    if (this.shieldFor > 0) {
      this.shieldFor -= dt
      MAT.paint.emissive.setHex(0xffc93c)
      MAT.paint.emissiveIntensity = 0.22 + Math.sin(this.elapsed * 12) * 0.12
      this.sparkleTimer -= dt
      if (this.sparkleTimer <= 0) {
        this.sparkleTimer = 0.16
        const pos = this.car.group.position.clone()
        pos.y += 0.9
        pos.x += (Math.random() - 0.5) * 1.6
        pos.z += (Math.random() - 0.5) * 2.4
        this.particles.burst(pos, 4)
      }
      if (this.shieldFor <= 0) MAT.paint.emissiveIntensity = 0
    }

    if (this.shieldFor > 0) this.ui.setPower('star', this.shieldFor)
    else if (this.magnetFor > 0) this.ui.setPower('magnet', this.magnetFor)
    else this.ui.setPower(null, 0)
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
        this.speed = Math.min(this.speedMode.max, this.speedMode.base + this.elapsed * this.speedMode.ramp)
        this.world.update(dt, this.speed)
        this.spawner.update(dt, this.speed, this.hearts < MAX_HEARTS)
        this.car.update(dt, this.speed)
        this.princess.update(dt)
        this.checkCollisions()
        // checkCollisions may have ended the run — don't re-show power HUD then
        if (this.state === 'playing') this.updatePowers(dt)

        // Scenery changes as the coin count grows
        const theme = Math.floor(this.coins / THEME_EVERY_COINS) % this.world.themeCount
        if (theme !== this.themeIndex) {
          this.themeIndex = theme
          this.world.transitionTo(theme)
        }

        if (this.invincibleFor > 0) {
          this.invincibleFor -= dt
          this.car.blink(this.elapsed)
          if (this.invincibleFor <= 0) this.car.setBlinking(false)
        }
        break
      }

      case 'paused':
        break

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
