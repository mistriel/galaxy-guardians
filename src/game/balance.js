/** Arcade tuning. DESIGN.md mirrors these numbers. */

export const WORLD = {
  bounds: 430,
  fog: 0.0048,
  background: 0x070b16,
};

export const PLAYER = {
  hull: 100,
  shield: 80,
  shieldRegen: 16,
  shieldDelay: 2.5,
  invuln: 0.7,
  visualScale: 2.1,
  radius: 4.6,
  cruise: 24,
  boost: 240,
  brake: 8,
  strafe: 20,
  turn: 1.75,
  fireDelay: 0.15,
  rapidDelay: 0.075,
  bulletSpeed: 145,
  bulletLife: 1.15,
  bulletDamage: 36,
  bulletRadius: 2.1,
  boltGirth: 1.5,
  boltStretch: 5.8,
};

/** Hangar catalog. Shomeret and the thick laser are free. */
export const SHIPS = {
  shomeret: { id: 'shomeret', cost: 0, scale: 2.1 },
  netz: { id: 'netz', cost: 1200, scale: 1.75 },
  ogen: { id: 'ogen', cost: 2200, scale: 2.35 },
};

/**
 * Equipped weapon profile. The default laser is a small cinematic tracer.
 * Other weapons store their own scale on each bolt.
 */
export const WEAPONS = {
  laser: {
    id: 'laser',
    cost: 0,
    girth: 1.5,
    stretch: 5.8,
    muzzle: 2.2,
    sparks: 10,
    sparkSpeed: 24,
    sparkScale: 1.15,
    delay: 0.12,
    speed: 175,
    damage: 36,
    life: 0.9,
    radius: 1.15,
    angles: [0],
    color: 0xf4fbff,
  },
  fan: {
    id: 'fan',
    cost: 900,
    girth: 1.35,
    stretch: 5.2,
    muzzle: 2.2,
    sparks: 8,
    sparkSpeed: 22,
    sparkScale: 1,
    delay: 0.16,
    speed: 165,
    damage: 24,
    life: 0.85,
    radius: 1.05,
    angles: [-0.16, 0, 0.16],
    color: 0xf4fbff,
  },
  needle: {
    id: 'needle',
    cost: 1400,
    girth: 1.15,
    stretch: 7.4,
    muzzle: 2.4,
    sparks: 8,
    sparkSpeed: 42,
    sparkScale: 1.1,
    delay: 0.09,
    speed: 220,
    damage: 22,
    life: 1.55,
    radius: 1.05,
    angles: [0],
    color: 0xb9dcff,
  },
};

/**
 * Secondary weapon. A needle that crosses the sector before it blooms.
 * No contact fuse: it never pops on the first ship it passes.
 * Travel is speed × life (250 × 6.4 = 1600), past the 860-wide arena.
 */
export const MISSILE = {
  cooldown: 4,
  speed: 250,
  life: 6.4,
  blast: 1900,
  damage: 9999,
  visualScale: 1,
};

/** Fat special missile. Lifetime fuse, blooms in the swarm, not a sector wipe. */
export const GIANT = {
  cooldown: 3,
  speed: 160,
  life: 1.7,
  blast: 150,
  damage: 520,
  visualScale: 3.4,
};

/** Blue triangle army. Many small fighters, not a handful of giants. */
export const ALLY = {
  count: 32,
  hp: 80,
  speed: 78,
  radius: 2.3,
  visualScale: 2.5,
  fireEvery: 0.72,
  shotDamage: 22,
  color: 0x2f6dff,
};

/** Capitals. Both sides use the same huge scale. */
export const CARRIER = {
  hp: 780,
  enemyHp: 640,
  radius: 16,
  visualScale: 3.8,
  score: 2400,
  colorAlly: 0x6aa2ff,
  colorEnemy: 0xff4d3a,
};

export const POWER = {
  duration: 8,
  shield: 48,
  repair: 30,
};

export const ENEMIES = {
  glint: {
    hp: 30,
    speed: 34,
    radius: 1.8,
    score: 120,
    contact: 10,
    drop: 0.22,
    ai: 'gallery',
    band: 20,
    loiter: 14,
    wobble: 0,
    range: 0,
    fireEvery: 0,
    shotSpeed: 0,
    shotDamage: 0,
    shotScale: 1,
    color: 0xff2d2d,
  },
  nib: {
    hp: 12,
    speed: 44,
    radius: 1.15,
    score: 50,
    contact: 7,
    drop: 0.16,
    ai: 'gallery',
    band: 14,
    loiter: 14,
    wobble: 0,
    range: 0,
    fireEvery: 0,
    shotSpeed: 0,
    shotDamage: 0,
    shotScale: 1,
    color: 0xff4a4a,
  },
  howler: {
    hp: 54,
    speed: 22,
    radius: 2.5,
    score: 280,
    contact: 12,
    drop: 0.42,
    ai: 'gallery',
    band: 26,
    loiter: 11,
    wobble: 0,
    prefer: 38,
    range: 92,
    fireEvery: 1.2,
    shotSpeed: 62,
    shotDamage: 9,
    shotScale: 1.15,
    color: 0xff5a36,
  },
  slab: {
    hp: 140,
    speed: 13,
    radius: 3.6,
    score: 700,
    contact: 18,
    drop: 0.7,
    ai: 'gallery',
    band: 34,
    loiter: 8,
    wobble: 0.15,
    range: 110,
    fireEvery: 1.55,
    shotSpeed: 42,
    shotDamage: 16,
    shotScale: 1.8,
    color: 0xd01212,
  },
  vorak: {
    hp: 420,
    speed: 10,
    radius: 6.2,
    score: 1800,
    contact: 28,
    drop: 1,
    ai: 'maul',
    band: 30,
    loiter: 6,
    wobble: 0,
    prefer: 54,
    range: 96,
    fireEvery: 2.35,
    windup: 0.72,
    shotSpeed: 34,
    shotDamage: 24,
    shotScale: 3.2,
    arcSpeed: 56,
    arcDamage: 12,
    arcScale: 1.55,
    color: 0xff1f3a,
  },
};

export const TOWERS = {
  crate: { hp: 16, radius: 3.5, score: 80, color: 0xf0b45a },
  spire: { hp: 48, radius: 4.2, score: 220, color: 0x7ad7ff },
  silo: {
    hp: 32,
    radius: 4,
    score: 400,
    color: 0xffb020,
    blast: 30,
    blastDamage: 58,
    playerBlast: 16,
  },
  nest: {
    hp: 96,
    radius: 3.6,
    score: 520,
    color: 0xff4d6a,
    range: 100,
    fireEvery: 1.25,
    shotSpeed: 74,
    shotDamage: 11,
    shotScale: 1.2,
  },
};

export const WAVES = [
  { nib: 28, glint: 22 },
  { nib: 32, glint: 18, howler: 10 },
  { nib: 36, glint: 20, howler: 12, slab: 4 },
  { nib: 38, glint: 22, howler: 12, slab: 5, vorak: 1 },
  { nib: 40, glint: 22, howler: 14, slab: 6, vorak: 2 },
  { nib: 42, glint: 24, howler: 14, slab: 6, vorak: 2 },
];

export function waveSpec(n) {
  if (n <= WAVES.length) return WAVES[n - 1];
  const extra = n - WAVES.length;
  return {
    nib: Math.min(48, 42 + extra * 2),
    glint: Math.min(28, 24 + extra),
    howler: Math.min(16, 14 + Math.floor(extra * 0.5)),
    slab: Math.min(8, 6 + Math.floor(extra * 0.4)),
    vorak: 2,
  };
}

export const WAVE_BONUS = 150;
export const COMBO_WINDOW = 2;
export const COMBO_STEP = 0.25;
export const COMBO_MAX = 4;

export const POOLS = {
  glint: 36,
  nib: 56,
  howler: 18,
  slab: 8,
  vorak: 2,
  playerBolts: 80,
  enemyBolts: 180,
  pickups: 14,
  sparks: 240,
  rings: 28,
  bonusCrate: 12,
  bonusSpire: 4,
  bonusSilo: 4,
  bonusNest: 3,
};
