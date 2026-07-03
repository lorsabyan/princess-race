import * as THREE from 'three'

interface Particle {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  spin: THREE.Vector3
  life: number
  maxLife: number
  active: boolean
}

const COLORS = [0xffc93c, 0xffe066, 0xff8fb8, 0xffffff]

export class Particles {
  private pool: Particle[] = []

  constructor(scene: THREE.Scene) {
    const geo = new THREE.OctahedronGeometry(0.14)
    for (let i = 0; i < 90; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: COLORS[i % COLORS.length],
        emissive: COLORS[i % COLORS.length],
        emissiveIntensity: 0.9,
        transparent: true,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.visible = false
      scene.add(mesh)
      this.pool.push({
        mesh,
        velocity: new THREE.Vector3(),
        spin: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        active: false,
      })
    }
  }

  burst(position: THREE.Vector3, count = 14) {
    let spawned = 0
    for (const p of this.pool) {
      if (p.active) continue
      p.active = true
      p.mesh.visible = true
      p.mesh.position.copy(position)
      p.mesh.scale.setScalar(0.7 + Math.random() * 0.7)
      const angle = Math.random() * Math.PI * 2
      const radial = 1.5 + Math.random() * 2.5
      p.velocity.set(Math.cos(angle) * radial, 3 + Math.random() * 3.5, Math.sin(angle) * radial * 0.6)
      p.spin.set(Math.random() * 8, Math.random() * 8, Math.random() * 8)
      p.maxLife = 0.55 + Math.random() * 0.35
      p.life = p.maxLife
      if (++spawned >= count) break
    }
  }

  update(dt: number, worldSpeed: number) {
    for (const p of this.pool) {
      if (!p.active) continue
      p.life -= dt
      if (p.life <= 0) {
        p.active = false
        p.mesh.visible = false
        continue
      }
      p.velocity.y -= 9.5 * dt
      p.mesh.position.addScaledVector(p.velocity, dt)
      p.mesh.position.z += worldSpeed * dt * 0.4
      p.mesh.rotation.x += p.spin.x * dt
      p.mesh.rotation.y += p.spin.y * dt
      const t = p.life / p.maxLife
      ;(p.mesh.material as THREE.MeshStandardMaterial).opacity = Math.min(1, t * 2)
    }
  }
}
