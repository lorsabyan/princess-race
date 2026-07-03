import * as THREE from 'three'
import { LANES } from './world'

function heartShape(size: number): THREE.ExtrudeGeometry {
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

export class Car {
  readonly group = new THREE.Group()
  lane = 1
  private wheels: THREE.Mesh[] = []
  private hood: THREE.Mesh
  private princess: THREE.Group
  private time = 0

  constructor() {
    const pink = new THREE.MeshStandardMaterial({ color: 0xff5c9e, roughness: 0.35, metalness: 0.1 })
    const cream = new THREE.MeshStandardMaterial({ color: 0xfff4d6, roughness: 0.5 })
    const dark = new THREE.MeshStandardMaterial({ color: 0x4a3b5c, roughness: 0.8 })
    const gold = new THREE.MeshStandardMaterial({
      color: 0xffc93c, roughness: 0.3, metalness: 0.5, emissive: 0xffaa00, emissiveIntensity: 0.35,
    })

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.9), pink)
    body.position.y = 0.55
    body.castShadow = true
    this.group.add(body)

    // Rounded nose + tail
    const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.68, 16, 1, false, 0, Math.PI), pink)
    nose.rotation.z = Math.PI / 2
    nose.rotation.y = Math.PI / 2
    nose.scale.set(0.32, 1, 1)
    nose.position.set(0, 0.82, -1.44)
    nose.castShadow = true
    this.group.add(nose)

    // Cabin back rest
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.5), pink)
    back.position.set(0, 0.98, 1.05)
    back.castShadow = true
    this.group.add(back)

    // Cream side stripe
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.14, 2.5), cream)
    stripe.position.y = 0.62
    this.group.add(stripe)

    // Windshield
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xbfe8ff, roughness: 0.1, transparent: true, opacity: 0.55,
    })
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.07), glassMat)
    glass.position.set(0, 1.05, -0.5)
    glass.rotation.x = -0.28
    glass.userData.baseOpacity = 0.55
    this.group.add(glass)

    // Golden heart on the hood
    this.hood = new THREE.Mesh(heartShape(0.19), gold)
    this.hood.position.set(0, 1.02, -1.05)
    this.group.add(this.hood)

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18)
    const hubGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.34, 12)
    for (const [x, z] of [[-0.88, -0.95], [0.88, -0.95], [-0.88, 0.95], [0.88, 0.95]]) {
      const wheel = new THREE.Mesh(wheelGeo, dark)
      wheel.rotation.z = Math.PI / 2
      wheel.position.set(x, 0.36, z)
      wheel.castShadow = true
      const hub = new THREE.Mesh(hubGeo, cream)
      wheel.add(hub)
      this.group.add(wheel)
      this.wheels.push(wheel)
    }

    // Princess
    this.princess = this.buildPrincess()
    this.princess.position.set(0, 0.82, 0.45)
    this.group.add(this.princess)

    this.group.position.set(LANES[1], 0, 0)
  }

  private buildPrincess(): THREE.Group {
    const p = new THREE.Group()
    const skin = new THREE.MeshStandardMaterial({ color: 0xffd9b8, roughness: 0.6 })
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x7a4a28, roughness: 0.7 })
    const dressMat = new THREE.MeshStandardMaterial({ color: 0xff8fb8, roughness: 0.5 })
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffc93c, roughness: 0.25, metalness: 0.6, emissive: 0xffaa00, emissiveIntensity: 0.4,
    })

    const dress = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.8, 12), dressMat)
    dress.position.y = 0.32
    dress.castShadow = true
    p.add(dress)

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), skin)
    head.position.y = 0.94
    head.castShadow = true
    p.add(head)

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.315, 16, 12), hairMat)
    hair.position.set(0, 0.99, 0.06)
    hair.scale.set(1, 0.92, 1)
    p.add(hair)

    // Crown sits clearly on top of the head
    const crown = new THREE.Group()
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.12, 10), goldMat)
    crown.add(band)
    for (let i = 0; i < 5; i++) {
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 6), goldMat)
      const a = (i / 5) * Math.PI * 2
      tip.position.set(Math.cos(a) * 0.14, 0.12, Math.sin(a) * 0.14)
      crown.add(tip)
    }
    const gem = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xff5c9e, emissive: 0xff2d7a, emissiveIntensity: 0.6, roughness: 0.2 })
    )
    gem.position.set(0, 0.03, -0.19)
    crown.add(gem)
    crown.position.set(0, 1.24, 0)
    p.add(crown)

    // Cheeks
    const cheekMat = new THREE.MeshStandardMaterial({ color: 0xff9db8, roughness: 0.8 })
    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), cheekMat)
      cheek.position.set(side * 0.17, 0.88, -0.22)
      p.add(cheek)
    }

    // Eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x46305a, roughness: 0.4 })
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), eyeMat)
      eye.position.set(side * 0.1, 0.98, -0.27)
      p.add(eye)
    }

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

    // Gentle bob + spinning wheels + twinkling heart
    this.group.position.y = Math.sin(this.time * 9) * 0.025
    for (const wheel of this.wheels) wheel.rotation.x -= speed * dt / 0.36
    this.hood.rotation.y += dt * 2.4
    this.princess.rotation.z = Math.sin(this.time * 4) * 0.04
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
