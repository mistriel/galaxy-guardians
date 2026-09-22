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
  radius: 2,
  cruise: 24,
  boost: 48,
  brake: 8,
  strafe: 20,
  turn: 1.75,
  fireDelay: 0.15,
  rapidDelay: 0.075,
  bulletSpeed: 145,
  bulletLife: 1.15,
  bulletDamage: 16,
  bulletRadius: 0.75,
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
    ai: 'chase',
    wobble: 0.9,
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
    ai: 'chase',
    wobble: 0.25,
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
    ai: 'kite',
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
  { glint: 4 },
  { nib: 7, glint: 3 },
  { nib: 6, glint: 3, howler: 2 },
  { nib: 8, glint: 2, howler: 3, slab: 1 },
  { nib: 10, glint: 4, howler: 3, slab: 1, vorak: 1 },
  { nib: 12, glint: 4, howler: 4, slab: 2, vorak: 1 },
];

export function waveSpec(n) {
  if (n <= WAVES.length) return WAVES[n - 1];
  const extra = n - WAVES.length;
  return {
    nib: Math.min(16, 12 + extra),
    glint: Math.min(10, 4 + Math.floor(extra * 0.6)),
    howler: Math.min(8, 4 + Math.floor(extra * 0.45)),
    slab: Math.min(5, 2 + Math.floor(extra * 0.35)),
    vorak: 1,
  };
}

export const WAVE_BONUS = 150;
export const COMBO_WINDOW = 2;
export const COMBO_STEP = 0.25;
export const COMBO_MAX = 4;

export const POOLS = {
  glint: 10,
  nib: 16,
  howler: 8,
  slab: 6,
  vorak: 2,
  playerBolts: 72,
  enemyBolts: 48,
  pickups: 14,
  sparks: 160,
  rings: 10,
  bonusCrate: 12,
  bonusSpire: 4,
  bonusSilo: 4,
  bonusNest: 3,
};
