import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { World } from './world'
import { Car } from './car'
import { Spawner } from './spawner'
import { Particles } from './particles'
import { AudioKit } from './audio'
import { UI } from './ui'

type State = 'menu' | 'playing' | 'over'

const MAX_HEARTS = 3
const BASE_SPEED = 13
const MAX_SPEED = 26
const BEST_KEY = 'princess-race-best'

export class Game {
  private renderer: THREE.WebGLRenderer
  private camera: THREE.PerspectiveCamera
  private composer: EffectComposer
  private world = new World()
  private car = new Car()
  private spawner: Spawner
  private particles: Particles
  private audio = new AudioKit()
  private ui = new UI()
  private clock = new THREE.Clock()

  private state: State = 'menu'
  private speed = BASE_SPEED
  private hearts = MAX_HEARTS
  private coins = 0
  private invincibleFor = 0
  private elapsed = 0

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
    this.camera.position.set(0, 5.6, 9.2)
    this.camera.lookAt(0, 0.9, -16)

    // Soft studio reflections make the gold and the car paint shine
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.world.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    this.world.scene.environmentIntensity = 0.18

    this.world.scene.add(this.car.group)
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

  private onResize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
    this.composer.setSize(w, h)
  }

  private beginRun() {
    this.audio.ensure()
    this.audio.startMusic()
    this.state = 'playing'
    this.speed = BASE_SPEED
    this.hearts = MAX_HEARTS
    this.coins = 0
    this.invincibleFor = 0
    this.elapsed = 0
    this.car.lane = 1
    this.car.group.position.x = 0
    this.car.setBlinking(false)
    this.spawner.reset()
    this.ui.showPlaying()
    this.ui.setHearts(this.hearts, MAX_HEARTS)
    this.ui.setCoins(this.coins)
  }

  private endRun() {
    this.state = 'over'
    this.audio.stopMusic()
    this.audio.gameOver()
    this.car.setBlinking(false)
    const best = Math.max(this.coins, Number(localStorage.getItem(BEST_KEY) ?? 0))
    localStorage.setItem(BEST_KEY, String(best))
    this.ui.showGameOver(this.coins, best)
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
          this.endRun()
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

    if (this.state === 'playing') {
      this.elapsed += dt
      this.speed = Math.min(MAX_SPEED, BASE_SPEED + this.elapsed * 0.22)

      this.world.update(dt, this.speed)
      this.spawner.update(dt, this.speed)
      this.car.update(dt, this.speed)
      this.checkCollisions()

      if (this.invincibleFor > 0) {
        this.invincibleFor -= dt
        this.car.blink(this.elapsed)
        if (this.invincibleFor <= 0) this.car.setBlinking(false)
      }
    } else {
      // Attract mode: the world drifts gently behind the menus
      this.world.update(dt, 4)
      this.car.update(dt, 4)
    }

    this.particles.update(dt, this.speed)

    // Camera trails the car with a soft sway
    const targetX = this.car.group.position.x * 0.55
    this.camera.position.x += (targetX - this.camera.position.x) * Math.min(1, 6 * (1 / 60))
    this.camera.lookAt(this.camera.position.x * 0.6, 0.9, -16)

    this.composer.render()
  }
}
