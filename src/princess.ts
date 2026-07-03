import * as THREE from 'three'
import { MAT } from './common3d'

export type ArmPose = 'drive' | 'idle' | 'walk' | 'cheer'

/**
 * The princess is her own character: she can stand on the road,
 * sit in the car (re-parented by the game) or cheer on the podium.
 */
export class Princess {
  readonly group = new THREE.Group()
  private leftArm: THREE.Group
  private rightArm: THREE.Group
  private backHair: THREE.Mesh
  pose: ArmPose = 'idle'
  private time = 0

  constructor() {
    const p = this.group

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

    // Arms pivot at the shoulders so poses can change
    const makeArm = (side: number): THREE.Group => {
      const arm = new THREE.Group()
      const sleeve = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), MAT.roseLight)
      arm.add(sleeve)
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 8), MAT.skin)
      upper.position.y = -0.23
      arm.add(upper)
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), MAT.skin)
      hand.position.y = -0.46
      arm.add(hand)
      arm.position.set(side * 0.24, 0.78, -0.02)
      return arm
    }
    this.leftArm = makeArm(-1)
    this.rightArm = makeArm(1)
    p.add(this.leftArm, this.rightArm)

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

    p.scale.setScalar(1.05)
    this.setPose('idle')
  }

  setPose(pose: ArmPose) {
    this.pose = pose
    if (pose === 'drive') {
      this.leftArm.rotation.set(-1.15, 0, 0.12)
      this.rightArm.rotation.set(-1.15, 0, -0.12)
    } else if (pose === 'cheer') {
      this.leftArm.rotation.set(0, 0, -2.55)
      this.rightArm.rotation.set(0, 0, 2.55)
    } else {
      this.leftArm.rotation.set(-0.15, 0, -0.25)
      this.rightArm.rotation.set(-0.15, 0, 0.25)
    }
  }

  update(dt: number) {
    this.time += dt
    this.backHair.rotation.x = Math.sin(this.time * 3) * 0.08 - 0.05

    if (this.pose === 'walk') {
      const swing = Math.sin(this.time * 9) * 0.55
      this.leftArm.rotation.set(swing, 0, -0.15)
      this.rightArm.rotation.set(-swing, 0, 0.15)
    } else if (this.pose === 'cheer') {
      const wave = Math.sin(this.time * 7) * 0.25
      this.leftArm.rotation.z = -2.55 + wave
      this.rightArm.rotation.z = 2.55 - wave
    }
  }
}
