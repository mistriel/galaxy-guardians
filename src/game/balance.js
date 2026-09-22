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
  boltGirth: 8,
  boltStretch: 4.2,
};

/** Hangar catalog. Shomeret and the thick laser are free. */
export const SHIPS = {
  shomeret: { id: 'shomeret', cost: 0, scale: 2.1 },
  netz: { id: 'netz', cost: 1200, scale: 1.75 },
  ogen: { id: 'ogen', cost: 2200, scale: 2.35 },
};

/**
 * Equipped weapon profile. The default laser keeps the thick beam
 * (girth 8, stretch 4.2, muzzle 8). Other weapons store their own scale
 * on each bolt so they do not resize the laser.
 */
export const WEAPONS = {
  laser: {
    id: 'laser',
    cost: 0,
    girth: 8,
    stretch: 4.2,
    muzzle: 8,
    sparks: 28,
    sparkSpeed: 32,
    sparkScale: 3.4,
    delay: 0.15,
    speed: 145,
    damage: 36,
    life: 1.15,
    radius: 2.1,
    angles: [0],
    color: 0xe8fff8,
  },
  fan: {
    id: 'fan',
    cost: 900,
    girth: 8,
    stretch: 4.2,
    muzzle: 8,
    sparks: 16,
    sparkSpeed: 28,
    sparkScale: 2.8,
    delay: 0.18,
    speed: 140,
    damage: 26,
    life: 1.05,
    radius: 1.9,
    angles: [-0.16, 0, 0.16],
    color: 0xe8fff8,
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

/** Friendly escorts. One shared scale, clearly larger than Shomeret. */
export const ALLY = {
  count: 8,
  hp: 220,
  speed: 70,
  radius: 6.4,
  visualScale: 6.8,
  fireEvery: 0.42,
  shotDamage: 30,
  color: 0x2ee6c7,
};

/** Capitals. Both sides use the same huge scale. */
export const CARRIER = {
  hp: 780,
  enemyHp: 640,
  radius: 16,
  visualScale: 3.8,
  score: 2400,
  colorAlly: 0x7af6ee,
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
    ai: 'lane',
    wobble: 0,
    range: 0,
    fireEvery: 0,
    shotSpeed: 0,
    shotDamage: 0,
    shotScale: 1,
    color: 0xff4d8d,
  },
  nib: {
    hp: 12,
    speed: 44,
    radius: 1.15,
    score: 50,
    contact: 7,
    drop: 0.16,
    ai: 'lane',
    wobble: 0,
    range: 0,
    fireEvery: 0,
    shotSpeed: 0,
    shotDamage: 0,
    shotScale: 1,
    color: 0xc084fc,
  },
  howler: {
    hp: 54,
    speed: 22,
    radius: 2.5,
    score: 280,
    contact: 12,
    drop: 0.42,
    ai: 'lane',
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
    ai: 'tank',
    wobble: 0.15,
    range: 110,
    fireEvery: 1.55,
    shotSpeed: 42,
    shotDamage: 16,
    shotScale: 1.8,
    color: 0x8b5cf6,
  },
  vorak: {
    hp: 420,
    speed: 10,
    radius: 6.2,
    score: 1800,
    contact: 28,
    drop: 1,
    ai: 'maul',
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
    color: 0xc45132,
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
  { glint: 16, nib: 20 },
  { nib: 22, glint: 14, howler: 8 },
  { nib: 24, glint: 16, howler: 10, slab: 4 },
  { nib: 26, glint: 16, howler: 10, slab: 5, vorak: 1 },
  { nib: 28, glint: 18, howler: 12, slab: 6, vorak: 2 },
  { nib: 30, glint: 18, howler: 12, slab: 6, vorak: 2 },
];

export function waveSpec(n) {
  if (n <= WAVES.length) return WAVES[n - 1];
  const extra = n - WAVES.length;
  return {
    nib: Math.min(36, 30 + extra * 2),
    glint: Math.min(24, 18 + extra),
    howler: Math.min(16, 12 + Math.floor(extra * 0.5)),
    slab: Math.min(8, 6 + Math.floor(extra * 0.4)),
    vorak: 2,
  };
}

export const WAVE_BONUS = 150;
export const COMBO_WINDOW = 2;
export const COMBO_STEP = 0.25;
export const COMBO_MAX = 4;

export const POOLS = {
  glint: 26,
  nib: 40,
  howler: 16,
  slab: 8,
  vorak: 2,
  playerBolts: 72,
  enemyBolts: 72,
  pickups: 14,
  sparks: 240,
  rings: 18,
  bonusCrate: 12,
  bonusSpire: 4,
  bonusSilo: 4,
  bonusNest: 3,
};
