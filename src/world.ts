import * as THREE from 'three'

export const LANES = [-2.4, 0, 2.4]
export const ROAD_WIDTH = 7.8
export const SPAWN_Z = -150
export const DESPAWN_Z = 14

const PALETTE = {
  skyTop: '#a58bff',
  skyBottom: '#ffe3ee',
  fog: 0xffc9e0,
  grass: 0xa9e6c0,
  road: 0x7e6ba8,
  curb: 0xfff4d6,
  dash: 0xfff4d6,
  trunk: 0xd9a066,
  foliage: [0x8fdbb0, 0xffa8cc, 0xb9a8f0, 0x9be3c9],
  flower: [0xff8fb8, 0xffd166, 0xc9b8ff, 0xffffff],
}

function skyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 4
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, 0, 512)
  grad.addColorStop(0, PALETTE.skyTop)
  grad.addColorStop(0.55, '#ffa8d1')
  grad.addColorStop(1, PALETTE.skyBottom)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 4, 512)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

interface Scrolling {
  mesh: THREE.Object3D
  span: number
}

export class World {
  readonly scene = new THREE.Scene()
  readonly sunLight: THREE.DirectionalLight
  private dashes: Scrolling[] = []
  private scenery: Scrolling[] = []
  private clouds: THREE.Group[] = []

  constructor() {
    this.scene.fog = new THREE.Fog(PALETTE.fog, 40, 145)

    // Sky dome
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(320, 24, 16),
      new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false })
    )
    this.scene.add(sky)

    // Lights
    const hemi = new THREE.HemisphereLight(0xfff0f5, 0xa9e6c0, 0.65)
    this.scene.add(hemi)

    const sun = new THREE.DirectionalLight(0xfff2dd, 2.2)
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

    // Visible sun disc (blooms softly)
    const sunDisc = new THREE.Mesh(
      new THREE.CircleGeometry(11, 32),
      new THREE.MeshBasicMaterial({ color: 0xfff3b0, fog: false })
    )
    sunDisc.position.set(-42, 52, -230)
    this.scene.add(sunDisc)

    this.buildGroundAndRoad()
    this.buildRainbow()
    this.buildClouds()
    this.buildScenery()
  }

  private buildGroundAndRoad() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 700),
      new THREE.MeshStandardMaterial({ color: PALETTE.grass, roughness: 1 })
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.z = -200
    ground.receiveShadow = true
    this.scene.add(ground)

    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_WIDTH, 500),
      new THREE.MeshStandardMaterial({ color: PALETTE.road, roughness: 0.95 })
    )
    road.rotation.x = -Math.PI / 2
    road.position.set(0, 0.01, -180)
    road.receiveShadow = true
    this.scene.add(road)

    // Cream curbs
    const curbGeo = new THREE.BoxGeometry(0.34, 0.14, 500)
    const curbMat = new THREE.MeshStandardMaterial({ color: PALETTE.curb, roughness: 0.8 })
    for (const side of [-1, 1]) {
      const curb = new THREE.Mesh(curbGeo, curbMat)
      curb.position.set(side * (ROAD_WIDTH / 2 + 0.17), 0.07, -180)
      curb.receiveShadow = true
      this.scene.add(curb)
    }

    // Scrolling lane dashes
    const dashGeo = new THREE.BoxGeometry(0.16, 0.02, 1.7)
    const dashMat = new THREE.MeshStandardMaterial({ color: PALETTE.dash, roughness: 0.7 })
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
    const trunkMat = new THREE.MeshStandardMaterial({ color: PALETTE.trunk, roughness: 0.9 })

    // Candy trees on both roadsides
    for (let i = 0; i < 26; i++) {
      const tree = new THREE.Group()
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.1, 8), trunkMat)
      trunk.position.y = 0.55
      trunk.castShadow = true
      tree.add(trunk)

      const color = PALETTE.foliage[i % PALETTE.foliage.length]
      const foliageMat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true })
      const round = Math.random() > 0.45
      const crown = round
        ? new THREE.Mesh(new THREE.SphereGeometry(0.85 + Math.random() * 0.4, 8, 7), foliageMat)
        : new THREE.Mesh(new THREE.ConeGeometry(0.8 + Math.random() * 0.3, 1.7, 8), foliageMat)
      crown.position.y = round ? 1.75 : 1.9
      crown.castShadow = true
      tree.add(crown)

      const side = i % 2 === 0 ? -1 : 1
      tree.position.set(side * (5.6 + Math.random() * 9), 0, -i * (span / 26) - Math.random() * 6)
      const s = 0.8 + Math.random() * 0.7
      tree.scale.setScalar(s)
      this.scene.add(tree)
      this.scenery.push({ mesh: tree, span })
    }

    // Tiny flowers sprinkled in the grass
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
        new THREE.MeshStandardMaterial({ color: PALETTE.flower[i % PALETTE.flower.length], roughness: 0.6 })
      )
      head.position.y = 0.34
      flower.add(head)

      const side = Math.random() > 0.5 ? -1 : 1
      flower.position.set(side * (4.6 + Math.random() * 12), 0, -Math.random() * span)
      this.scene.add(flower)
      this.scenery.push({ mesh: flower, span })
    }
  }

  update(dt: number, speed: number) {
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
  }
}
