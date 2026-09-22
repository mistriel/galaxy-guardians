import * as THREE from 'three';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tooClose(points, x, y, z, min) {
  for (const p of points) {
    const dx = p.x - x;
    const dy = p.y - y;
    const dz = p.z - z;
    if (dx * dx + dy * dy + dz * dz < min * min) return true;
  }
  return false;
}

/**
 * Fixed sector so every visit has crates dead ahead and a couple of
 * fuel-depot clusters worth blowing up.
 */
export function buildLayout() {
  const rand = mulberry32(0x0d15);
  const points = [];
  const push = (type, x, y, z, bonus = false) => {
    points.push({
      type,
      bonus,
      position: new THREE.Vector3(x, y, z),
    });
  };

  // Long welcome tunnel down local -Z. Cruise is fast, so the gallery
  // has to stay ahead of a player who takes a moment to start shooting.
  for (let i = 0; i < 11; i += 1) {
    const z = -48 - i * 18;
    push('crate', 0, 0, z);
    push('crate', -14, 3, z - 8);
    push('crate', 14, -3, z - 8);
  }
  push('spire', 26, 10, -70);
  push('spire', -28, -8, -120);
  push('silo', 0, 6, -160);
  push('crate', -10, 2, -160);
  push('crate', 10, -2, -168);

  const depots = [
    [170, 18, -30],
    [-190, -16, 140],
  ];
  for (const [cx, cy, cz] of depots) {
    push('silo', cx, cy, cz);
    push('silo', cx + 16, cy + 4, cz - 12);
    push('silo', cx - 12, cy - 6, cz + 14);
    push('crate', cx + 8, cy + 10, cz + 18);
    push('crate', cx - 18, cy + 2, cz - 8);
    push('spire', cx + 28, cy + 14, cz + 6);
  }

  const nests = [
    [120, 30, 210],
    [-140, 10, -200],
    [240, -20, 40],
    [-250, 24, -20],
    [30, 70, 150],
    [-40, -40, 250],
  ];
  for (const [x, y, z] of nests) push('nest', x, y, z);

  const fillers = [
    ['crate', 16],
    ['spire', 7],
    ['crate', 8],
  ];
  for (const [type, count] of fillers) {
    let placed = 0;
    let guard = 0;
    while (placed < count && guard < 80) {
      guard += 1;
      const dir = new THREE.Vector3(rand() * 2 - 1, rand() * 1.2 - 0.6, rand() * 2 - 1);
      if (dir.lengthSq() < 0.01) continue;
      dir.normalize();
      const dist = 70 + rand() * 280;
      const x = dir.x * dist;
      const y = THREE.MathUtils.clamp(dir.y * dist, -90, 130);
      const z = dir.z * dist;
      if (Math.hypot(x, z) < 50) continue;
      if (tooClose(points.map((p) => p.position), x, y, z, 16)) continue;
      push(type, x, y, z);
      placed += 1;
    }
  }

  return points;
}

export function bonusHome(type, occupied, rand = Math.random) {
  for (let i = 0; i < 40; i += 1) {
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(rand() * 2 - 1);
    const dist = 80 + rand() * 240;
    const x = Math.sin(phi) * Math.cos(theta) * dist;
    const y = THREE.MathUtils.clamp(Math.cos(phi) * dist * 0.45, -80, 110);
    const z = Math.sin(phi) * Math.sin(theta) * dist;
    if (tooClose(occupied, x, y, z, 18)) continue;
    if (Math.hypot(x, y, z) > 400) continue;
    return new THREE.Vector3(x, y, z);
  }
  return new THREE.Vector3(type === 'silo' ? 60 : -60, 20, -140);
}
