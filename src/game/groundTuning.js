/** Ground-battle difficulty and the gold-cup check. Numbers stay family-arcade. */

export const DIFFICULTY_IDS = ['easy', 'medium', 'hard'];

const PROFILES = {
  easy: {
    id: 'easy',
    foeDamage: 0.62,
    playerHp: 1.5,
    spawn: 0.72,
    cadence: 1.38,
    playerHit: 0.62,
    grace: 0.42,
    lives: 0,
  },
  medium: {
    id: 'medium',
    foeDamage: 1,
    playerHp: 1,
    spawn: 1,
    cadence: 1,
    playerHit: 1,
    grace: 0,
    lives: 0,
  },
  hard: {
    id: 'hard',
    foeDamage: 1.58,
    playerHp: 0.75,
    spawn: 1.42,
    cadence: 0.66,
    playerHit: 1.08,
    grace: 0,
    lives: 3,
  },
};

export function groundDifficulty(id) {
  return PROFILES[id] || PROFILES.medium;
}

/**
 * Equal-strength reply to a full-force win.
 * One enemy soldier per friendly soldier, one enemy car per friendly tank.
 */
export function equalForceCounts(friends = {}) {
  const soldiers = Math.max(8, Math.round(Number(friends.soldiers) || 0));
  const vehicles = Math.max(1, Math.round(Number(friends.tanks) || 0));
  return { soldiers, vehicles };
}

/** How many of a scripted squad to place. Medium keeps the authored count. */
export function scaleCount(base, spawn, min = 1) {
  const n = Number(base) || 0;
  const scale = Number(spawn) || 1;
  return Math.max(min, Math.round(n * scale));
}

/**
 * Gold cup: a streak, every deploy button (full force), and a hit from each role.
 * Retreats and losses do not qualify.
 */
export function goldReady(info) {
  if (!info?.win || info.boss) return false;
  return Boolean(info.fullForce && info.balanced && (info.bestStreak || 0) >= 3);
}

/** A ground stage is ten waves. Wave 10 is the last. */
export const STAGE_WAVES = 10;

/** One beat per wave. The list is exactly ten long. */
export const STAGE_PLAN = [
  'artillery',
  'armor',
  'infantry',
  'special',
  'artillery',
  'armor',
  'infantry',
  'armor',
  'infantry',
  'special',
];

/**
 * Advance one ground wave. Clearing wave 10 finishes the stage.
 * Nothing past 10 is returned.
 */
export function stageWaveStep(wave) {
  const current = Math.max(1, Math.floor(Number(wave) || 1));
  if (current >= STAGE_WAVES) {
    return { done: true, wave: STAGE_WAVES, beat: null };
  }
  const next = current + 1;
  return { done: false, wave: next, beat: STAGE_PLAN[next - 1] };
}
