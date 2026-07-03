import * as THREE from 'three'
import { LANES, SPAWN_Z, DESPAWN_Z } from './world'

export type ObstacleKind = 'rock' | 'fence' | 'puddle'

export interface Entity {
  root: THREE.Group
  active: boolean
  lane: number
  kind?: ObstacleKind
}

const coinMat = new THREE.MeshStandardMaterial({
  color: 0xffc23c,
  roughness: 0.25,
  metalness: 0.85,
  emissive: 0xd97800,
  emissiveIntensity: 0.3,
})

function makeCoin(): THREE.Group {
  const g = new THREE.Group()
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.1, 24), coinMat)
  disc.rotation.x = Math.PI / 2
  disc.castShadow = true
  g.add(disc)
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.05, 8, 24), coinMat)
  g.add(rim)
  g.position.y = 1.0
  return g
}

function makeObstacle(kind: ObstacleKind): THREE.Group {
  const g = new THREE.Group()
  if (kind === 'rock') {
    const mat = new THREE.MeshStandardMaterial({ color: 0xb79fd4, roughness: 0.85, flatShading: true })
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.72), mat)
    rock.position.y = 0.55
    rock.rotation.set(Math.random() * 2, Math.random() * 2, 0)
    rock.castShadow = true
    g.add(rock)
    const small = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32), mat)
    small.position.set(0.55, 0.25, 0.3)
    small.castShadow = true
    g.add(small)
  } else if (kind === 'fence') {
    const wood = new THREE.MeshStandardMaterial({ color: 0xd9915b, roughness: 0.9 })
    for (const x of [-0.75, 0.75]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.0, 8), wood)
      post.position.set(x, 0.5, 0)
      post.castShadow = true
      g.add(post)
    }
    for (const y of [0.42, 0.78]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.14, 0.09), wood)
      rail.position.y = y
      rail.castShadow = true
      g.add(rail)
    }
  } else {
    // puddle
    const mat = new THREE.MeshStandardMaterial({
      color: 0x7ec8e3, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.9,
    })
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.85, 20), mat)
    puddle.rotation.x = -Math.PI / 2
    puddle.position.y = 0.03
    puddle.scale.x = 1.25
    g.add(puddle)
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat)
    drop.position.set(0.3, 0.1, 0.2)
    g.add(drop)
  }
  return g
}

export class Spawner {
  readonly coins: Entity[] = []
  readonly obstacles: Entity[] = []
  private distanceSinceSpawn = 0
  private nextGap = 12

  constructor(private scene: THREE.Scene) {
    for (let i = 0; i < 48; i++) {
      const root = makeCoin()
      root.visible = false
      scene.add(root)
      this.coins.push({ root, active: false, lane: 1 })
    }
    const kinds: ObstacleKind[] = ['rock', 'fence', 'puddle']
    for (let i = 0; i < 18; i++) {
      const kind = kinds[i % kinds.length]
      const root = makeObstacle(kind)
      root.visible = false
      scene.add(root)
      this.obstacles.push({ root, active: false, lane: 1, kind })
    }
  }

  /** Hide every coin and obstacle (used when the celebration starts). */
  clear() {
    for (const e of [...this.coins, ...this.obstacles]) {
      e.active = false
      e.root.visible = false
    }
    this.distanceSinceSpawn = 0
    this.nextGap = 12
  }

  reset() {
    this.clear()
    // Pre-fill the road so the fun starts right away
    this.spawnCoinLine(1, -40, 3)
    this.spawnCoinArc(-70)
    this.spawnObstacles(-100)
    this.spawnCoinLine(Math.floor(Math.random() * 3), -130, 4)
  }

  private takeCoin(): Entity | undefined {
    return this.coins.find((c) => !c.active)
  }

  private takeObstacle(kind?: ObstacleKind): Entity | undefined {
    return this.obstacles.find((o) => !o.active && (kind === undefined || o.kind === kind))
  }

  private spawnCoinLine(lane: number, z: number, n: number) {
    for (let i = 0; i < n; i++) {
      const coin = this.takeCoin()
      if (!coin) return
      coin.active = true
      coin.lane = lane
      coin.root.visible = true
      coin.root.position.set(LANES[lane], 1.0, z - i * 2.3)
    }
  }

  private spawnCoinArc(z: number) {
    const order = Math.random() > 0.5 ? [0, 1, 2] : [2, 1, 0]
    order.forEach((lane, i) => {
      const coin = this.takeCoin()
      if (!coin) return
      coin.active = true
      coin.lane = lane
      coin.root.visible = true
      coin.root.position.set(LANES[lane], 1.0, z - i * 2.6)
    })
  }

  private spawnObstacles(z: number) {
    // Block at most two lanes so there is always a way through
    const lanes = [0, 1, 2].sort(() => Math.random() - 0.5)
    const blocked = Math.random() > 0.55 ? 2 : 1
    for (let i = 0; i < blocked; i++) {
      const obstacle = this.takeObstacle()
      if (!obstacle) return
      obstacle.active = true
      obstacle.lane = lanes[i]
      obstacle.root.visible = true
      obstacle.root.position.set(LANES[lanes[i]], 0, z - i * 1.2)
    }
    // Reward lane: coins in one of the free lanes right after
    if (Math.random() > 0.4) {
      const free = lanes[2]
      this.spawnCoinLine(free, z - 5, 3)
    }
  }

  update(dt: number, speed: number) {
    this.distanceSinceSpawn += speed * dt

    if (this.distanceSinceSpawn >= this.nextGap) {
      this.distanceSinceSpawn = 0
      this.nextGap = 11 + Math.random() * 7
      const roll = Math.random()
      if (roll < 0.34) {
        this.spawnCoinLine(Math.floor(Math.random() * 3), SPAWN_Z, 3 + Math.floor(Math.random() * 3))
      } else if (roll < 0.52) {
        this.spawnCoinArc(SPAWN_Z)
      } else {
        this.spawnObstacles(SPAWN_Z)
      }
    }

    for (const coin of this.coins) {
      if (!coin.active) continue
      coin.root.position.z += speed * dt
      coin.root.rotation.y += dt * 3.2
      coin.root.position.y = 1.0 + Math.sin(coin.root.position.z * 0.8) * 0.08
      if (coin.root.position.z > DESPAWN_Z) {
        coin.active = false
        coin.root.visible = false
      }
    }

    for (const obstacle of this.obstacles) {
      if (!obstacle.active) continue
      obstacle.root.position.z += speed * dt
      if (obstacle.root.position.z > DESPAWN_Z) {
        obstacle.active = false
        obstacle.root.visible = false
      }
    }
  }
}
