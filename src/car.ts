import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { LANES } from './world'
import { heartGeo, starGeo, MAT } from './common3d'

/** Local position of the driver's seat — the princess is parented here while driving. */
export const SEAT_POSITION = new THREE.Vector3(0, 0.8, 0.45)

export class Car {
  readonly group = new THREE.Group()
  lane = 1
  private wheels: THREE.Group[] = []
  private hoodHeart: THREE.Mesh
  private star: THREE.Group
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

    this.group.position.set(LANES[1], 0, 0)
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
    this.group.position.y = speed > 1 ? Math.sin(this.time * 9) * 0.025 : 0
    for (const wheel of this.wheels) wheel.rotation.x -= speed * dt / 0.36
    this.hoodHeart.rotation.y += dt * 2.4
    this.star.rotation.z = Math.sin(this.time * 3.2) * 0.18
    this.star.rotation.x = Math.cos(this.time * 2.1) * 0.08
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
