import * as THREE from 'three'

export function heartGeo(size: number): THREE.ExtrudeGeometry {
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

export function starGeo(outer: number, depth: number): THREE.ExtrudeGeometry {
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

/** Cylinder stretched between two points — used for limbs. */
export function limb(from: THREE.Vector3, to: THREE.Vector3, radius: number, mat: THREE.Material): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(to, from)
  const len = dir.length()
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 8), mat)
  mesh.position.copy(from).addScaledVector(dir, 0.5)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
  return mesh
}

/** Unlockable car paint colors; `need` is the banked-coin total required. */
export const CAR_COLORS = [
  { id: 'pink', paint: 0xff5c9e, deep: 0xe8437f, css: '#ff5c9e', need: 0 },
  { id: 'lavender', paint: 0xb28aff, deep: 0x9a6fe8, css: '#b28aff', need: 30 },
  { id: 'mint', paint: 0x4fd1c5, deep: 0x38b2a6, css: '#4fd1c5', need: 60 },
  { id: 'gold', paint: 0xffc93c, deep: 0xe0a614, css: '#ffc93c', need: 100 },
] as const

export type CarColorId = typeof CAR_COLORS[number]['id']

export const MAT = {
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
  lavender: new THREE.MeshStandardMaterial({ color: 0xb9a8f0, roughness: 0.5 }),
}
