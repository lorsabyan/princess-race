import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { LANES } from './world'

function heartGeo(size: number): THREE.ExtrudeGeometry {
  const s = new THREE.Shape()
  const x = 0, y = 0
  s.moveTo(x, y + size * 0.35)
  s.bezierCurveTo(x, y + size * 0.85, x - size, y + size * 0.85, x - size, y + size * 0.25)
  s.bezierCurveTo(x - size, y - size * 0.35, x, y - size * 0.6, x, y - size)
  s.bezierCurveTo(x, y - size * 0.6, x + size, y - size * 0.35, x + size, y + size * 0.25)
  s.bezierCurveTo(x + size, y + size * 0.85, x, y + size * 0.85, x, y + size * 0.35)
  const geo = new THREE.ExtrudeGeometry(s, { depth: size * 0.35, bevelEnabled: false })
  geo.center()
  return geo
}

function starGeo(outer: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  const inner = outer * 0.45
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    const px = Math.cos(a) * r
    const py = Math.sin(a) * r
    if (i === 0) shape.moveTo(px, py)
    else shape.lineTo(px, py)
  }
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false })
  geo.center()
  return geo
}

/** Cylinder stretched between two points — used for arms. */
function limb(from: THREE.Vector3, to: THREE.Vector3, radius: number, mat: THREE.Material): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(to, from)
  const len = dir.length()
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 8), mat)
  mesh.position.copy(from).addScaledVector(dir, 0.5)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
  return mesh
}

const MAT = {
  paint: new THREE.MeshPhysicalMaterial({
    color: 0xff5c9e, roughness: 0.32, metalness: 0.05,
    clearcoat: 1, clearcoatRoughness: 0.18,
  }),
  paintDeep: new THREE.MeshPhysicalMaterial({
    color: 0xe8437f, roughness: 0.35, metalness: 0.05,
    clearcoat: 1, clearcoatRoughness: 0.2,
  }),
  cream: new THREE.MeshStandardMaterial({ color: 0xfff4d6, roughness: 0.5 }),
  plum: new THREE.MeshStandardMaterial({ color: 0x3d2f4f, roughness: 0.85 }),
  gold: new THREE.MeshStandardMaterial({
    color: 0xffc93c, roughness: 0.25, metalness: 0.7, emissive: 0xffaa00, emissiveIntensity: 0.3,
  }),
  headlight: new THREE.MeshStandardMaterial({
    color: 0xfff8d9, roughness: 0.2, emissive: 0xfff3b0, emissiveIntensity: 0.9,
  }),
  taillight: new THREE.MeshStandardMaterial({
    color: 0xff4477, roughness: 0.3, emissive: 0xff2255, emissiveIntensity: 0.8,
  }),
  skin: new THREE.MeshStandardMaterial({ color: 0xffdcc0, roughness: 0.55 }),
  blonde: new THREE.MeshStandardMaterial({ color: 0xf7c65e, roughness: 0.6 }),
  rose: new THREE.MeshStandardMaterial({ color: 0xff7fb0, roughness: 0.45 }),
  roseLight: new THREE.MeshStandardMaterial({ color: 0xffd1e3, roughness: 0.5 }),
  blush: new THREE.MeshStandardMaterial({ color: 0xffa6bf, roughness: 0.8 }),
  eyeWhite: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 }),
  eyeDark: new THREE.MeshStandardMaterial({ color: 0x46305a, roughness: 0.3 }),
  gem: new THREE.MeshStandardMaterial({
    color: 0xff5c9e, roughness: 0.15, emissive: 0xff2d7a, emissiveIntensity: 0.6,
  }),
}

export class Car {
  readonly group = new THREE.Group()
  lane = 1
  private wheels: THREE.Group[] = []
  private hoodHeart: THREE.Mesh
  private star: THREE.Group
  private princess: THREE.Group
  private backHair!: THREE.Mesh
  private time = 0

  constructor() {
    const shadowed = (mesh: THREE.Mesh): THREE.Mesh => {
      mesh.castShadow = true
      return mesh
    }

    // ---- Body ----
    const body = shadowed(new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.6, 3.0, 4, 0.2), MAT.paint))
    body.position.y = 0.6
    this.group.add(body)

    // Trunk hump behind the seat
    const trunk = shadowed(new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.45, 0.8, 4, 0.16), MAT.paint))
    trunk.position.set(0, 0.85, 1.05)
    this.group.add(trunk)

    // Dashboard cowl in front of the windshield
    const cowl = shadowed(new THREE.Mesh(new RoundedBoxGeometry(1.55, 0.35, 0.5, 4, 0.14), MAT.paint))
    cowl.position.set(0, 0.85, -0.55)
    this.group.add(cowl)

    // Wheel fenders in a deeper pink
    for (const [x, z] of [[-0.86, -0.95], [0.86, -0.95], [-0.86, 0.95], [0.86, 0.95]]) {
      const fender = shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.5, 1.05, 3, 0.13), MAT.paintDeep))
      fender.position.set(x, 0.62, z)
      this.group.add(fender)
    }

    // Cream bumpers
    for (const z of [-1.58, 1.58]) {
      const bumper = shadowed(new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.22, 0.3, 3, 0.1), MAT.cream))
      bumper.position.set(0, 0.38, z)
      this.group.add(bumper)
    }

    // Headlights and taillights
    for (const side of [-1, 1]) {
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), MAT.headlight)
      head.position.set(side * 0.5, 0.62, -1.55)
      this.group.add(head)
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), MAT.taillight)
      tail.position.set(side * 0.55, 0.68, 1.56)
      this.group.add(tail)
    }

    // Windshield
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xcfeaff, roughness: 0.05, transparent: true, opacity: 0.45,
    })
    const glass = new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.6, 0.06, 2, 0.03), glassMat)
    glass.position.set(0, 1.18, -0.32)
    glass.rotation.x = -0.24
    glass.userData.baseOpacity = 0.45
    this.group.add(glass)

    // Seat
    const seatBase = new THREE.Mesh(new RoundedBoxGeometry(1.05, 0.22, 0.65, 3, 0.08), MAT.plum)
    seatBase.position.set(0, 0.78, 0.55)
    this.group.add(seatBase)
    const seatBack = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.55, 0.22, 3, 0.08), MAT.plum)
    seatBack.position.set(0, 1.0, 0.88)
    this.group.add(seatBack)

    // Steering wheel + column
    const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 20), MAT.plum)
    wheelRing.position.set(0, 1.08, -0.3)
    wheelRing.rotation.x = -0.55
    this.group.add(wheelRing)
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.32, 8), MAT.plum)
    column.position.set(0, 1.0, -0.42)
    column.rotation.x = 1.0
    this.group.add(column)

    // Spinning golden heart on the hood
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.1, 8), MAT.gold)
    pedestal.position.set(0, 0.94, -1.15)
    this.group.add(pedestal)
    this.hoodHeart = new THREE.Mesh(heartGeo(0.15), MAT.gold)
    this.hoodHeart.position.set(0, 1.08, -1.15)
    this.group.add(this.hoodHeart)

    // Little golden hearts on the doors
    for (const side of [-1, 1]) {
      const doorHeart = new THREE.Mesh(heartGeo(0.11), MAT.gold)
      doorHeart.position.set(side * 0.87, 0.68, -0.15)
      doorHeart.rotation.y = side * Math.PI / 2
      this.group.add(doorHeart)
    }

    // Star antenna on the back — sways while driving
    this.star = new THREE.Group()
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 6), MAT.gold)
    rod.position.y = 0.275
    this.star.add(rod)
    const starMesh = new THREE.Mesh(starGeo(0.14, 0.05), MAT.gold)
    starMesh.position.y = 0.62
    this.star.add(starMesh)
    this.star.position.set(0.6, 1.0, 1.35)
    this.group.add(this.star)

    // ---- Wheels (group spins around X) ----
    for (const [x, z] of [[-0.92, -0.95], [0.92, -0.95], [-0.92, 0.95], [0.92, 0.95]]) {
      const wheel = new THREE.Group()
      const tire = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18), MAT.plum))
      tire.rotation.z = Math.PI / 2
      wheel.add(tire)
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.3, 14), MAT.cream)
      hub.rotation.z = Math.PI / 2
      wheel.add(hub)
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), MAT.gold)
      cap.scale.set(1.6, 1, 1)
      wheel.add(cap)
      wheel.position.set(x, 0.36, z)
      this.group.add(wheel)
      this.wheels.push(wheel)
    }

    // ---- Princess ----
    this.princess = this.buildPrincess()
    this.princess.position.set(0, 0.8, 0.45)
    this.princess.scale.setScalar(1.05)
    this.group.add(this.princess)

    this.group.position.set(LANES[1], 0, 0)
  }

  private buildPrincess(): THREE.Group {
    const p = new THREE.Group()

    // Skirt with a lighter ruffle layer
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.52, 14), MAT.rose)
    skirt.position.y = 0.26
    skirt.castShadow = true
    p.add(skirt)
    const ruffle = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.36, 14), MAT.roseLight)
    ruffle.position.y = 0.46
    p.add(ruffle)

    // Bodice
    const bodice = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.21, 0.36, 12), MAT.rose)
    bodice.position.y = 0.64
    bodice.castShadow = true
    p.add(bodice)

    // Puffy sleeves + arms reaching the steering wheel
    for (const side of [-1, 1]) {
      const sleeve = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), MAT.roseLight)
      sleeve.position.set(side * 0.21, 0.78, -0.02)
      p.add(sleeve)

      const shoulder = new THREE.Vector3(side * 0.24, 0.76, -0.05)
      const hand = new THREE.Vector3(side * 0.15, 0.38, -0.62)
      p.add(limb(shoulder, hand, 0.05, MAT.skin))
      const handMesh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), MAT.skin)
      handMesh.position.copy(hand)
      p.add(handMesh)
    }

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 18, 14), MAT.skin)
    head.position.y = 1.06
    head.castShadow = true
    p.add(head)

    // Eyes: whites, pupils, sparkle highlights
    for (const side of [-1, 1]) {
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), MAT.eyeWhite)
      white.position.set(side * 0.095, 1.09, -0.225)
      white.scale.z = 0.55
      p.add(white)
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), MAT.eyeDark)
      pupil.position.set(side * 0.095, 1.09, -0.258)
      p.add(pupil)
      const sparkle = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), MAT.eyeWhite)
      sparkle.position.set(side * 0.075, 1.105, -0.278)
      p.add(sparkle)
    }

    // Smile — a downward torus arc
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.014, 6, 12, Math.PI), MAT.blush)
    smile.position.set(0, 0.995, -0.25)
    smile.rotation.z = Math.PI
    smile.rotation.x = -0.15
    p.add(smile)

    // Blush cheeks
    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), MAT.blush)
      cheek.position.set(side * 0.165, 1.01, -0.2)
      cheek.scale.set(1, 0.7, 0.5)
      p.add(cheek)
    }

    // Golden hair: cap, side strands, long back hair
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 14), MAT.blonde)
    hairCap.position.set(0, 1.1, 0.045)
    hairCap.scale.set(1, 0.95, 1)
    hairCap.castShadow = true
    p.add(hairCap)
    for (const side of [-1, 1]) {
      const strand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), MAT.blonde)
      strand.position.set(side * 0.26, 0.92, 0.05)
      strand.scale.set(1, 2.1, 0.9)
      p.add(strand)
    }
    this.backHair = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), MAT.blonde)
    this.backHair.position.set(0, 0.82, 0.27)
    this.backHair.scale.set(1.15, 1.85, 0.75)
    p.add(this.backHair)

    // Earrings
    for (const side of [-1, 1]) {
      const earring = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), MAT.gold)
      earring.position.set(side * 0.27, 1.0, -0.02)
      p.add(earring)
    }

    // Crown: golden band, five points, pink gem
    const crown = new THREE.Group()
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 8, 16), MAT.gold)
    band.rotation.x = Math.PI / 2
    crown.add(band)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.13, 6), MAT.gold)
      tip.position.set(Math.cos(a) * 0.14, 0.08, Math.sin(a) * 0.14)
      crown.add(tip)
    }
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), MAT.gem)
    gem.position.set(0, 0.02, -0.15)
    crown.add(gem)
    crown.position.set(0, 1.33, 0.02)
    crown.rotation.x = -0.1
    p.add(crown)

    return p
  }

  get targetX(): number {
    return LANES[this.lane]
  }

  moveLeft() {
    this.lane = Math.max(0, this.lane - 1)
  }

  moveRight() {
    this.lane = Math.min(LANES.length - 1, this.lane + 1)
  }

  update(dt: number, speed: number) {
    this.time += dt

    // Smooth slide toward target lane, with a playful tilt
    const dx = this.targetX - this.group.position.x
    this.group.position.x += dx * Math.min(1, dt * 9)
    this.group.rotation.z = THREE.MathUtils.clamp(-dx * 0.22, -0.3, 0.3)
    this.group.rotation.y = THREE.MathUtils.clamp(-dx * 0.12, -0.18, 0.18)

    // Gentle bob, spinning wheels, twinkling details
    this.group.position.y = Math.sin(this.time * 9) * 0.025
    for (const wheel of this.wheels) wheel.rotation.x -= speed * dt / 0.36
    this.hoodHeart.rotation.y += dt * 2.4
    this.star.rotation.z = Math.sin(this.time * 3.2) * 0.18
    this.star.rotation.x = Math.cos(this.time * 2.1) * 0.08
    this.princess.rotation.z = Math.sin(this.time * 4) * 0.035
    this.backHair.rotation.x = Math.sin(this.time * 3) * 0.08 - 0.05
  }

  setBlinking(on: boolean) {
    this.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh) {
        const mat = mesh.material as THREE.MeshStandardMaterial
        const base = (mesh.userData.baseOpacity as number | undefined) ?? 1
        mat.transparent = on || base < 1
        if (!on) mat.opacity = base
      }
    })
  }

  blink(time: number) {
    const visible = Math.sin(time * 22) > -0.3
    this.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh) {
        const mat = mesh.material as THREE.MeshStandardMaterial
        const base = (mesh.userData.baseOpacity as number | undefined) ?? 1
        mat.opacity = visible ? base : base * 0.25
      }
    })
  }
}
