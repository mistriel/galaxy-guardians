/** Arcade tuning. DESIGN.md mirrors these numbers. */

export const WORLD = {
  /** Safety radius. The ship is turned around softly before this. */
  bounds: 430,
  /** Where the closed curve begins. Inside this the flight is free. */
  soft: 200,
  fog: 0.0033,
  background: 0x070b16,
};

export const PLAYER = {
  hull: 160,
  shield: 140,
  shieldRegen: 28,
  shieldDelay: 1.4,
  invuln: 1.05,
  visualScale: 3,
  radius: 6.2,
  cruise: 24,
  /** Arcade lightspeed. The closed curve still turns a radial rush around. */
  boost: 4200,
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
  shomeret: { id: 'shomeret', cost: 0, scale: 3 },
  netz: { id: 'netz', cost: 0, scale: 1.75 },
  ogen: { id: 'ogen', cost: 0, scale: 2.35 },
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
 * Secondary weapon. A hairline movie dart. Lifetime fuse only:
 * no contact fuse and no arena-edge fuse, so it cannot pop early.
 * Travel is speed × life (900 × 32 = 28800).
 * Blast reaches back over that whole flight so the sector it crossed still clears.
 */
export const MISSILE = {
  cooldown: 4,
  speed: 900,
  life: 32,
  blast: 29200,
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

/**
 * Extra heavy cycle. Lifetime fuse only, colorful bursts, no gore.
 * Atoms sparkle, shells pop gold, ultra is a local festival bloom.
 */
export const HEAVY = {
  atoms: {
    id: 'atoms',
    cooldown: 1.45,
    speed: 175,
    life: 1.35,
    blast: 78,
    damage: 150,
    visualScale: 2.4,
    shake: 0.25,
  },
  shells: {
    id: 'shells',
    cooldown: 1.1,
    speed: 230,
    life: 0.95,
    blast: 62,
    damage: 220,
    visualScale: 2.1,
    shake: 0.35,
  },
  ultra: {
    id: 'ultra',
    cooldown: 5.5,
    speed: 120,
    life: 2.15,
    blast: 280,
    damage: 820,
    visualScale: 2.8,
    shake: 0.95,
  },
};

export const HEAVY_ORDER = ['atoms', 'shells', 'ultra'];

/** Blue triangle army. Many small fighters, not a handful of giants. */
export const ALLY = {
  count: 44,
  hp: 120,
  speed: 78,
  radius: 2.3,
  visualScale: 2.5,
  fireEvery: 0.55,
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
  duration: 11,
  shield: 90,
  repair: 60,
  partyScore: 250,
  partyShield: 36,
  wingCall: 6,
};

export const ENEMIES = {
  glint: {
    hp: 18,
    speed: 30,
    radius: 1.8,
    score: 120,
    contact: 6,
    drop: 0.4,
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
    hp: 8,
    speed: 38,
    radius: 1.15,
    score: 50,
    contact: 4,
    drop: 0.3,
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
    hp: 32,
    speed: 18,
    radius: 2.5,
    score: 280,
    contact: 7,
    drop: 0.62,
    ai: 'gallery',
    band: 26,
    loiter: 11,
    wobble: 0,
    prefer: 38,
    range: 92,
    fireEvery: 1.9,
    shotSpeed: 52,
    shotDamage: 5,
    shotScale: 1.15,
    color: 0xff5a36,
  },
  slab: {
    hp: 84,
    speed: 11,
    radius: 3.6,
    score: 700,
    contact: 10,
    drop: 0.85,
    ai: 'gallery',
    band: 34,
    loiter: 8,
    wobble: 0.15,
    range: 110,
    fireEvery: 2.4,
    shotSpeed: 36,
    shotDamage: 8,
    shotScale: 1.8,
    color: 0xd01212,
  },
  vorak: {
    hp: 240,
    speed: 8,
    radius: 6.2,
    score: 1800,
    contact: 14,
    drop: 1,
    ai: 'maul',
    band: 30,
    loiter: 6,
    wobble: 0,
    prefer: 54,
    range: 96,
    fireEvery: 3.6,
    windup: 1.05,
    shotSpeed: 28,
    shotDamage: 12,
    shotScale: 3.2,
    arcSpeed: 46,
    arcDamage: 6,
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
    playerBlast: 8,
  },
  nest: {
    hp: 60,
    radius: 3.6,
    score: 520,
    color: 0xff4d6a,
    range: 100,
    fireEvery: 2.1,
    shotSpeed: 60,
    shotDamage: 6,
    shotScale: 1.2,
  },
};

export const WAVES = [
  { nib: 18, glint: 14 },
  { nib: 22, glint: 14, howler: 6 },
  { nib: 24, glint: 16, howler: 8, slab: 2 },
  { nib: 26, glint: 16, howler: 8, slab: 3 },
  { nib: 28, glint: 18, howler: 8, slab: 3, vorak: 1 },
  { nib: 30, glint: 18, howler: 10, slab: 4, vorak: 1 },
];

/** Authored waves only. There is no endless climb after the last row. */
export function waveSpec(n) {
  if (n < 1 || n > WAVES.length) return null;
  return WAVES[n - 1];
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
  pickups: 20,
  sparks: 240,
  rings: 28,
  bonusCrate: 12,
  bonusSpire: 4,
  bonusSilo: 4,
  bonusNest: 3,
};
