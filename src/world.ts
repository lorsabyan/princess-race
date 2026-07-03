import * as THREE from 'three'
import { limb } from './common3d'

export const LANES = [-2.4, 0, 2.4]
export const ROAD_WIDTH = 7.8
export const SPAWN_Z = -150
export const DESPAWN_Z = 14

interface Theme {
  name: string
  skyTop: number
  skyMid: number
  skyBottom: number
  fog: number
  ground: number
  sun: number
  sunScale: number
  hemiSky: number
  hemiGround: number
  hemiIntensity: number
  sunIntensity: number
  sunColor: number
  stars: number
  snow: number
  foliageWhite: number
}

export const THEMES: Theme[] = [
  {
    name: 'day',
    skyTop: 0xa58bff, skyMid: 0xffa8d1, skyBottom: 0xffe3ee, fog: 0xffc9e0,
    ground: 0xa9e6c0, sun: 0xfff3b0, sunScale: 1,
    hemiSky: 0xfff0f5, hemiGround: 0xa9e6c0, hemiIntensity: 0.65,
    sunIntensity: 2.2, sunColor: 0xfff2dd,
    stars: 0, snow: 0, foliageWhite: 0,
  },
  {
    name: 'sunset',
    skyTop: 0x8a5fc8, skyMid: 0xff8f6b, skyBottom: 0xffd89b, fog: 0xffc09a,
    ground: 0xc9d99a, sun: 0xffb347, sunScale: 1.35,
    hemiSky: 0xffe0c0, hemiGround: 0xc9d99a, hemiIntensity: 0.6,
    sunIntensity: 1.9, sunColor: 0xffd0a0,
    stars: 0, snow: 0, foliageWhite: 0,
  },
  {
    name: 'night',
    skyTop: 0x28285e, skyMid: 0x5d4a8a, skyBottom: 0x9a7fc0, fog: 0x8a75ab,
    ground: 0x5a7d6d, sun: 0xf2f2ff, sunScale: 0.8,
    hemiSky: 0xb8c0ff, hemiGround: 0x5a7d6d, hemiIntensity: 0.5,
    sunIntensity: 1.1, sunColor: 0xcfd8ff,
    stars: 0.95, snow: 0, foliageWhite: 0,
  },
  {
    name: 'winter',
    skyTop: 0x9dbfff, skyMid: 0xd6e6ff, skyBottom: 0xffffff, fog: 0xe6efff,
    ground: 0xf2f7ff, sun: 0xfff8e0, sunScale: 0.9,
    hemiSky: 0xffffff, hemiGround: 0xdbe8ff, hemiIntensity: 0.7,
    sunIntensity: 1.8, sunColor: 0xf0f6ff,
    stars: 0, snow: 0.9, foliageWhite: 0.85,
  },
  {
    name: 'beach',
    skyTop: 0x5fb8ff, skyMid: 0xa8e0ff, skyBottom: 0xfff2cc, fog: 0xd4ecff,
    ground: 0xffe9b3, sun: 0xfff3b0, sunScale: 1.1,
    hemiSky: 0xfffbe8, hemiGround: 0xffe9b3, hemiIntensity: 0.7,
    sunIntensity: 2.3, sunColor: 0xfff6d8,
    stars: 0, snow: 0, foliageWhite: 0,
  },
]

const FOLIAGE = [0x8fdbb0, 0xffa8cc, 0xb9a8f0, 0x9be3c9]
const FLOWER = [0xff8fb8, 0xffd166, 0xc9b8ff, 0xffffff]
const WHITE = new THREE.Color(0xffffff)

interface Scrolling {
  mesh: THREE.Object3D
  span: number
}

export class World {
  readonly scene = new THREE.Scene()
  readonly sunLight: THREE.DirectionalLight
  readonly themeCount = THEMES.length

  private dashes: Scrolling[] = []
  private scenery: Scrolling[] = []
  private clouds: THREE.Group[] = []
  private butterflies: { group: THREE.Group; wings: THREE.Mesh[]; phase: number }[] = []
  private balloons: THREE.Group[] = []
  private birds: { group: THREE.Group; wings: THREE.Mesh[] }[] = []
  private flock = new THREE.Group()

  private hemi: THREE.HemisphereLight
  private skyCtx: CanvasRenderingContext2D
  private skyTex: THREE.CanvasTexture
  private groundMat: THREE.MeshStandardMaterial
  private sunMat: THREE.MeshBasicMaterial
  private sunDisc: THREE.Mesh
  private crownMats: { mat: THREE.MeshStandardMaterial; original: THREE.Color }[] = []
  private stars!: THREE.Points
  private starsMat!: THREE.PointsMaterial
  private snow!: THREE.Points
  private snowMat!: THREE.PointsMaterial

  private themeFrom: Theme = THEMES[0]
  private themeTo: Theme = THEMES[0]
  private themeT = 1
  private time = 0

  constructor() {
    this.scene.fog = new THREE.Fog(THEMES[0].fog, 40, 145)

    // Sky dome with a repaintable gradient
    const canvas = document.createElement('canvas')
    canvas.width = 4
    canvas.height = 512
    this.skyCtx = canvas.getContext('2d')!
    this.skyTex = new THREE.CanvasTexture(canvas)
    this.skyTex.colorSpace = THREE.SRGBColorSpace
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(320, 24, 16),
      new THREE.MeshBasicMaterial({ map: this.skyTex, side: THREE.BackSide, fog: false })
    )
    this.scene.add(sky)

    // Lights
    this.hemi = new THREE.HemisphereLight(THEMES[0].hemiSky, THEMES[0].hemiGround, THEMES[0].hemiIntensity)
    this.scene.add(this.hemi)

    const sun = new THREE.DirectionalLight(THEMES[0].sunColor, THEMES[0].sunIntensity)
    sun.position.set(14, 26, -18)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left = -14
    sun.shadow.camera.right = 14
    sun.shadow.camera.top = 10
    sun.shadow.camera.bottom = -40
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 80
    sun.shadow.bias = -0.0005
    this.scene.add(sun)
    this.sunLight = sun

    // Sun/moon disc (blooms softly)
    this.sunMat = new THREE.MeshBasicMaterial({ color: THEMES[0].sun, fog: false })
    this.sunDisc = new THREE.Mesh(new THREE.CircleGeometry(11, 32), this.sunMat)
    this.sunDisc.position.set(-42, 52, -230)
    this.scene.add(this.sunDisc)

    this.groundMat = new THREE.MeshStandardMaterial({ color: THEMES[0].ground, roughness: 1 })

    this.buildGroundAndRoad()
    this.buildRainbow()
    this.buildClouds()
    this.buildScenery()
    this.buildStarsAndSnow()
    this.buildBalloons()
    this.buildBirds()
    this.buildButterflies()

    this.applyTheme(THEMES[0], THEMES[0], 1)
  }

  private buildGroundAndRoad() {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 700), this.groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.z = -200
    ground.receiveShadow = true
    this.scene.add(ground)

    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_WIDTH, 500),
      new THREE.MeshStandardMaterial({ color: 0x7e6ba8, roughness: 0.95 })
    )
    road.rotation.x = -Math.PI / 2
    road.position.set(0, 0.01, -180)
    road.receiveShadow = true
    this.scene.add(road)

    const curbGeo = new THREE.BoxGeometry(0.34, 0.14, 500)
    const curbMat = new THREE.MeshStandardMaterial({ color: 0xfff4d6, roughness: 0.8 })
    for (const side of [-1, 1]) {
      const curb = new THREE.Mesh(curbGeo, curbMat)
      curb.position.set(side * (ROAD_WIDTH / 2 + 0.17), 0.07, -180)
      curb.receiveShadow = true
      this.scene.add(curb)
    }

    const dashGeo = new THREE.BoxGeometry(0.16, 0.02, 1.7)
    const dashMat = new THREE.MeshStandardMaterial({ color: 0xfff4d6, roughness: 0.7 })
    const spacing = 4.5
    const count = 40
    const span = spacing * count
    for (let i = 0; i < count; i++) {
      for (const x of [-1.2, 1.2]) {
        const dash = new THREE.Mesh(dashGeo, dashMat)
        dash.position.set(x, 0.02, DESPAWN_Z - i * spacing)
        this.scene.add(dash)
        this.dashes.push({ mesh: dash, span })
      }
    }
  }

  private buildRainbow() {
    const rainbow = new THREE.Group()
    const colors = [0xff6b8a, 0xffa25c, 0xffe066, 0x7fe08f, 0x6fc3ff, 0xb28aff]
    colors.forEach((color, i) => {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(34 - i * 1.7, 0.85, 8, 60, Math.PI),
        new THREE.MeshBasicMaterial({ color, fog: false, transparent: true, opacity: 0.85 })
      )
      rainbow.add(arc)
    })
    rainbow.position.set(0, 0, -215)
    this.scene.add(rainbow)
  }

  private buildClouds() {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf5f8ff, roughness: 1, fog: false,
      emissive: 0xfff0f6, emissiveIntensity: 0.45,
    })
    for (let i = 0; i < 7; i++) {
      const cloud = new THREE.Group()
      const puffs = 3 + Math.floor(Math.random() * 3)
      for (let p = 0; p < puffs; p++) {
        const r = 2.2 + Math.random() * 2
        const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat)
        puff.position.set(p * 2.6 - puffs * 1.3, Math.random() * 1.2, (Math.random() - 0.5) * 2)
        puff.scale.y = 0.6
        cloud.add(puff)
      }
      cloud.position.set(-70 + Math.random() * 140, 26 + Math.random() * 18, -120 - Math.random() * 90)
      cloud.userData.speed = 0.6 + Math.random() * 0.8
      this.scene.add(cloud)
      this.clouds.push(cloud)
    }
  }

  private buildScenery() {
    const span = 280
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.9 })

    for (let i = 0; i < 26; i++) {
      const tree = new THREE.Group()
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.1, 8), trunkMat)
      trunk.position.y = 0.55
      trunk.castShadow = true
      tree.add(trunk)

      const original = new THREE.Color(FOLIAGE[i % FOLIAGE.length])
      const foliageMat = new THREE.MeshStandardMaterial({ color: original.clone(), roughness: 0.85, flatShading: true })
      this.crownMats.push({ mat: foliageMat, original })
      const round = Math.random() > 0.45
      const crown = round
        ? new THREE.Mesh(new THREE.SphereGeometry(0.85 + Math.random() * 0.4, 8, 7), foliageMat)
        : new THREE.Mesh(new THREE.ConeGeometry(0.8 + Math.random() * 0.3, 1.7, 8), foliageMat)
      crown.position.y = round ? 1.75 : 1.9
      crown.castShadow = true
      tree.add(crown)

      const side = i % 2 === 0 ? -1 : 1
      tree.position.set(side * (5.6 + Math.random() * 9), 0, -i * (span / 26) - Math.random() * 6)
      tree.scale.setScalar(0.8 + Math.random() * 0.7)
      this.scene.add(tree)
      this.scenery.push({ mesh: tree, span })
    }

    for (let i = 0; i < 40; i++) {
      const flower = new THREE.Group()
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.3, 5),
        new THREE.MeshStandardMaterial({ color: 0x6fbf8a })
      )
      stem.position.y = 0.15
      flower.add(stem)
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 8, 6),
        new THREE.MeshStandardMaterial({ color: FLOWER[i % FLOWER.length], roughness: 0.6 })
      )
      head.position.y = 0.34
      flower.add(head)

      const side = Math.random() > 0.5 ? -1 : 1
      flower.position.set(side * (4.6 + Math.random() * 12), 0, -Math.random() * span)
      this.scene.add(flower)
      this.scenery.push({ mesh: flower, span })
    }
  }

  private buildStarsAndSnow() {
    // Stars high in the sky, visible only at night
    const starPositions = new Float32Array(160 * 3)
    for (let i = 0; i < 160; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 120 + Math.random() * 160
      starPositions[i * 3] = Math.cos(a) * r
      starPositions[i * 3 + 1] = 40 + Math.random() * 160
      starPositions[i * 3 + 2] = -80 - Math.random() * 200
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    this.starsMat = new THREE.PointsMaterial({
      color: 0xffffff, size: 2.4, transparent: true, opacity: 0, fog: false, sizeAttenuation: true,
    })
    this.stars = new THREE.Points(starGeo, this.starsMat)
    this.scene.add(this.stars)

    // Snowflakes falling near the road, visible only in winter
    const snowPositions = new Float32Array(220 * 3)
    for (let i = 0; i < 220; i++) {
      snowPositions[i * 3] = (Math.random() - 0.5) * 50
      snowPositions[i * 3 + 1] = Math.random() * 18
      snowPositions[i * 3 + 2] = 8 - Math.random() * 70
    }
    const snowGeo = new THREE.BufferGeometry()
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3))
    this.snowMat = new THREE.PointsMaterial({
      color: 0xffffff, size: 0.32, transparent: true, opacity: 0, sizeAttenuation: true,
    })
    this.snow = new THREE.Points(snowGeo, this.snowMat)
    this.scene.add(this.snow)
  }

  private buildBalloons() {
    // Alternating gore stripes on a teardrop envelope, ropes and a wicker basket
    const palettes: [number, number][] = [
      [0xff8fb8, 0xfff4d6],
      [0x8fdbb0, 0xfff4d6],
      [0xffd166, 0xff8fb8],
    ]
    const profile = [
      new THREE.Vector2(0.55, 0),
      new THREE.Vector2(1.35, 0.55),
      new THREE.Vector2(2.0, 1.4),
      new THREE.Vector2(2.25, 2.4),
      new THREE.Vector2(1.95, 3.4),
      new THREE.Vector2(1.15, 4.15),
      new THREE.Vector2(0.0, 4.45),
    ]

    for (let i = 0; i < 3; i++) {
      const balloon = new THREE.Group()
      const [colorA, colorB] = palettes[i]
      const wedges = 10
      for (let w = 0; w < wedges; w++) {
        const mat = new THREE.MeshStandardMaterial({
          color: w % 2 === 0 ? colorA : colorB,
          roughness: 0.55,
          emissive: w % 2 === 0 ? colorA : colorB,
          emissiveIntensity: 0.28,
          fog: false,
        })
        const wedge = new THREE.Mesh(
          new THREE.LatheGeometry(profile, 5, (w / wedges) * Math.PI * 2, (Math.PI * 2) / wedges),
          mat
        )
        balloon.add(wedge)
      }

      // Golden ring around the mouth of the envelope
      const trimMat = new THREE.MeshStandardMaterial({
        color: 0xffc93c, roughness: 0.35, emissive: 0xdd9900, emissiveIntensity: 0.25, fog: false,
      })
      const trim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.11, 8, 18), trimMat)
      trim.rotation.x = Math.PI / 2
      balloon.add(trim)

      // Ropes down to the basket
      const ropeMat = new THREE.MeshStandardMaterial({ color: 0x8a6b4a, roughness: 0.9, fog: false })
      const basketTop = -1.35
      for (const [rx, rz] of [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]) {
        balloon.add(limb(
          new THREE.Vector3(rx * 1.25, 0, rz * 1.25),
          new THREE.Vector3(rx, basketTop, rz),
          0.035, ropeMat
        ))
      }

      // Wicker basket with a cream rim
      const basketMat = new THREE.MeshStandardMaterial({
        color: 0xb0793f, roughness: 0.85, emissive: 0x5a3a1a, emissiveIntensity: 0.2, fog: false,
      })
      const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 0.75, 10), basketMat)
      basket.position.y = basketTop - 0.35
      balloon.add(basket)
      const rimMat = new THREE.MeshStandardMaterial({ color: 0xfff4d6, roughness: 0.6, fog: false })
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 8, 14), rimMat)
      rim.rotation.x = Math.PI / 2
      rim.position.y = basketTop
      balloon.add(rim)

      balloon.position.set(-60 + i * 55, 20 + Math.random() * 10, -130 - Math.random() * 60)
      balloon.scale.setScalar(0.9 + Math.random() * 0.5)
      balloon.userData.speed = 0.4 + Math.random() * 0.5
      balloon.userData.phase = Math.random() * Math.PI * 2
      this.scene.add(balloon)
      this.balloons.push(balloon)
    }
  }

  private buildBirds() {
    const mat = new THREE.MeshBasicMaterial({ color: 0x6b5a7d, fog: false, side: THREE.DoubleSide })
    for (let i = 0; i < 4; i++) {
      const bird = new THREE.Group()
      const wings: THREE.Mesh[] = []
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.35), mat)
        wing.position.x = side * 0.55
        wing.rotation.y = side * 0.2
        bird.add(wing)
        wings.push(wing)
      }
      bird.position.set(i * 3 - 4, (i % 2) * 1.4, i * 1.5)
      this.flock.add(bird)
      this.birds.push({ group: bird, wings })
    }
    this.flock.position.set(-90, 26, -85)
    this.scene.add(this.flock)
  }

  private buildButterflies() {
    const colors = [0xff8fb8, 0xffd166, 0xb9a8f0]
    const span = 280
    for (let i = 0; i < 6; i++) {
      const group = new THREE.Group()
      const wings: THREE.Mesh[] = []
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length], side: THREE.DoubleSide,
      })
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.32), mat)
        wing.position.x = side * 0.12
        wing.rotation.z = side * 0.2
        group.add(wing)
        wings.push(wing)
      }
      const side = i % 2 === 0 ? -1 : 1
      group.position.set(side * (4.8 + Math.random() * 2.6), 1.0 + Math.random() * 0.6, -i * (span / 6) - Math.random() * 10)
      this.scene.add(group)
      this.butterflies.push({ group, wings, phase: Math.random() * Math.PI * 2 })
      this.scenery.push({ mesh: group, span })
    }
  }

  /** Smoothly transition to the theme with the given index. */
  transitionTo(index: number) {
    const target = THEMES[index % THEMES.length]
    if (target === this.themeTo) return
    this.themeFrom = this.snapshot()
    this.themeTo = target
    this.themeT = 0
  }

  /** Capture current applied values as a pseudo-theme to lerp from. */
  private snapshot(): Theme {
    const f = this.themeFrom
    const to = this.themeTo
    const t = this.themeT
    const lerpC = (a: number, b: number) =>
      new THREE.Color(a).lerp(new THREE.Color(b), t).getHex()
    const lerpN = (a: number, b: number) => a + (b - a) * t
    return {
      name: 'mix',
      skyTop: lerpC(f.skyTop, to.skyTop),
      skyMid: lerpC(f.skyMid, to.skyMid),
      skyBottom: lerpC(f.skyBottom, to.skyBottom),
      fog: lerpC(f.fog, to.fog),
      ground: lerpC(f.ground, to.ground),
      sun: lerpC(f.sun, to.sun),
      sunScale: lerpN(f.sunScale, to.sunScale),
      hemiSky: lerpC(f.hemiSky, to.hemiSky),
      hemiGround: lerpC(f.hemiGround, to.hemiGround),
      hemiIntensity: lerpN(f.hemiIntensity, to.hemiIntensity),
      sunIntensity: lerpN(f.sunIntensity, to.sunIntensity),
      sunColor: lerpC(f.sunColor, to.sunColor),
      stars: lerpN(f.stars, to.stars),
      snow: lerpN(f.snow, to.snow),
      foliageWhite: lerpN(f.foliageWhite, to.foliageWhite),
    }
  }

  private applyTheme(from: Theme, to: Theme, t: number) {
    const c = (a: number, b: number) => new THREE.Color(a).lerp(new THREE.Color(b), t)
    const n = (a: number, b: number) => a + (b - a) * t

    // Sky gradient
    const grad = this.skyCtx.createLinearGradient(0, 0, 0, 512)
    grad.addColorStop(0, '#' + c(from.skyTop, to.skyTop).getHexString())
    grad.addColorStop(0.55, '#' + c(from.skyMid, to.skyMid).getHexString())
    grad.addColorStop(1, '#' + c(from.skyBottom, to.skyBottom).getHexString())
    this.skyCtx.fillStyle = grad
    this.skyCtx.fillRect(0, 0, 4, 512)
    this.skyTex.needsUpdate = true

    ;(this.scene.fog as THREE.Fog).color.copy(c(from.fog, to.fog))
    this.groundMat.color.copy(c(from.ground, to.ground))
    this.sunMat.color.copy(c(from.sun, to.sun))
    this.sunDisc.scale.setScalar(n(from.sunScale, to.sunScale))
    this.hemi.color.copy(c(from.hemiSky, to.hemiSky))
    this.hemi.groundColor.copy(c(from.hemiGround, to.hemiGround))
    this.hemi.intensity = n(from.hemiIntensity, to.hemiIntensity)
    this.sunLight.intensity = n(from.sunIntensity, to.sunIntensity)
    this.sunLight.color.copy(c(from.sunColor, to.sunColor))
    this.starsMat.opacity = n(from.stars, to.stars)
    this.snowMat.opacity = n(from.snow, to.snow)

    const white = n(from.foliageWhite, to.foliageWhite)
    for (const { mat, original } of this.crownMats) {
      mat.color.copy(original.clone().lerp(WHITE, white))
    }
  }

  update(dt: number, speed: number) {
    this.time += dt

    // Theme transition
    if (this.themeT < 1) {
      this.themeT = Math.min(1, this.themeT + dt * 0.4)
      this.applyTheme(this.themeFrom, this.themeTo, this.themeT)
    }

    for (const d of this.dashes) {
      d.mesh.position.z += speed * dt
      if (d.mesh.position.z > DESPAWN_Z) d.mesh.position.z -= d.span
    }
    for (const s of this.scenery) {
      s.mesh.position.z += speed * dt
      if (s.mesh.position.z > DESPAWN_Z + 6) s.mesh.position.z -= s.span
    }
    for (const cloud of this.clouds) {
      cloud.position.x += cloud.userData.speed * dt
      if (cloud.position.x > 90) cloud.position.x = -90
    }

    // Balloons drift, bob and sway gently
    for (const balloon of this.balloons) {
      balloon.position.x += balloon.userData.speed * dt
      balloon.position.y += Math.sin(this.time * 0.8 + balloon.userData.phase) * dt * 0.6
      balloon.rotation.z = Math.sin(this.time * 0.6 + balloon.userData.phase) * 0.06
      if (balloon.position.x > 85) balloon.position.x = -85
    }

    // Bird flock crosses the sky
    this.flock.position.x += dt * 5.5
    if (this.flock.position.x > 110) {
      this.flock.position.x = -110
      this.flock.position.y = 22 + Math.random() * 10
    }
    for (const bird of this.birds) {
      const flap = Math.sin(this.time * 9 + bird.group.position.x) * 0.55
      bird.wings[0].rotation.z = flap
      bird.wings[1].rotation.z = -flap
      bird.group.position.y += Math.sin(this.time * 2 + bird.group.position.z) * dt * 0.3
    }

    // Butterflies flutter
    for (const b of this.butterflies) {
      const flap = Math.sin(this.time * 16 + b.phase) * 0.9
      b.wings[0].rotation.y = flap
      b.wings[1].rotation.y = -flap
      b.group.position.y = 1.1 + Math.sin(this.time * 2.2 + b.phase) * 0.25
      b.group.rotation.y = Math.sin(this.time * 0.9 + b.phase) * 0.8
    }

    // Snowfall
    if (this.snowMat.opacity > 0.01) {
      const pos = this.snow.geometry.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - dt * 3.2
        if (y < 0) y = 18
        pos.setY(i, y)
        pos.setX(i, pos.getX(i) + Math.sin(this.time * 1.5 + i) * dt * 0.4)
      }
      pos.needsUpdate = true
    }
  }
}
