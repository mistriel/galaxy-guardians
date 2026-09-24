/** Ground-battle march: three regular wins, then a boss, then a trophy. */

export const BOSS_EVERY = 3;
export const PERK_CAP = 2;

export const PERK_IDS = ['shield', 'company', 'cannon', 'banner', 'destroyer'];

/** Trophy cups. Hebrew copy lives in i18n. */
export const TROPHIES = [
  { id: 'shield' },
  { id: 'company' },
  { id: 'cannon' },
  { id: 'banner' },
  { id: 'destroyer' },
];

export function emptyPerks() {
  return {
    shield: 0,
    company: 0,
    cannon: 0,
    banner: 0,
    destroyer: 0,
  };
}

export function emptyCampaign() {
  return {
    sinceBoss: 0,
    bossDue: false,
    perks: emptyPerks(),
    goldCharges: 0,
    equalNext: false,
    progressStreak: 0,
    goldBadges: 0,
  };
}

function clampTier(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(PERK_CAP, Math.floor(n)));
}

export function normalizeCampaign(raw) {
  const base = emptyCampaign();
  if (!raw || typeof raw !== 'object') return base;
  const since = Number(raw.sinceBoss);
  base.sinceBoss = Number.isFinite(since)
    ? Math.max(0, Math.min(BOSS_EVERY - 1, Math.floor(since)))
    : 0;
  base.bossDue = Boolean(raw.bossDue);
  const perks = raw.perks && typeof raw.perks === 'object' ? raw.perks : {};
  for (const id of PERK_IDS) base.perks[id] = clampTier(perks[id]);
  const gold = Number(raw.goldCharges);
  base.goldCharges = Number.isFinite(gold) ? Math.max(0, Math.min(9, Math.floor(gold))) : 0;
  base.equalNext = Boolean(raw.equalNext);
  const streak = Number(raw.progressStreak);
  base.progressStreak = Number.isFinite(streak) ? Math.max(0, Math.min(9, Math.floor(streak))) : 0;
  const badges = Number(raw.goldBadges);
  base.goldBadges = Number.isFinite(badges) ? Math.max(0, Math.min(9, Math.floor(badges))) : 0;
  return base;
}

/**
 * Full force, then an equal fight, then a gold cup.
 * A win with every deploy button queues equal-strength enemies next.
 * Winning that match banks a visible gold trophy. A retreat clears the path.
 * Boss wins keep the path so the equal fight waits until the next regular battle.
 */
export function noteForceMarch(state, info = {}) {
  const current = normalizeCampaign(state);
  if (info.boss) {
    if (!info.win) return { ...current, equalNext: false, progressStreak: 0 };
    return { ...current, bossDue: false, sinceBoss: 0 };
  }
  if (!info.win) return { ...current, equalNext: false, progressStreak: 0 };
  const marched = noteRegularWin(current);
  const full = Boolean(info.fullForce);
  const equalWin = Boolean(info.balancedMatch);
  let streak = current.progressStreak || 0;
  let badges = current.goldBadges || 0;
  let charges = marched.goldCharges || 0;
  let equalNext = false;
  if (equalWin) {
    streak = Math.max(2, streak + 1);
    badges = Math.min(9, badges + 1);
    charges = Math.min(9, charges + 1);
  }
  if (full) {
    equalNext = true;
    if (!equalWin) streak = 1;
  } else if (!equalWin) {
    streak = 0;
  }
  if (info.gold && !equalWin) charges = Math.min(9, charges + 1);
  return {
    ...marched,
    equalNext,
    progressStreak: streak,
    goldBadges: badges,
    goldCharges: charges,
  };
}

/** Bank one gold cup earned by a streak, full force, and a balanced fight. */
export function noteGoldCharge(state) {
  const current = normalizeCampaign(state);
  return { ...current, goldCharges: Math.min(9, current.goldCharges + 1) };
}

/** Spend one banked gold cup when the commander’s trophy is taken. */
export function takeGoldCharge(state) {
  const current = normalizeCampaign(state);
  const had = current.goldCharges > 0;
  return {
    state: { ...current, goldCharges: had ? current.goldCharges - 1 : 0 },
    had,
  };
}

/** Count a regular ground victory. The third one schedules the boss. */
export function noteRegularWin(state) {
  const current = normalizeCampaign(state);
  const since = current.sinceBoss + 1;
  if (since >= BOSS_EVERY) {
    return { ...current, sinceBoss: 0, bossDue: true };
  }
  return { ...current, sinceBoss: since, bossDue: false };
}

/** Prefer the cup the player has least of, so the prizes stay varied. */
export function drawTrophy(state, rng = Math.random) {
  const perks = normalizeCampaign(state).perks;
  let min = PERK_CAP;
  for (const cup of TROPHIES) min = Math.min(min, perks[cup.id] || 0);
  const pool = TROPHIES.filter((cup) => (perks[cup.id] || 0) === min);
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[Math.max(0, index)];
}

export function grantTrophy(state, id) {
  const current = normalizeCampaign(state);
  if (!PERK_IDS.includes(id)) return { state: current, tier: 0, grew: false };
  const before = current.perks[id] || 0;
  const tier = Math.min(PERK_CAP, before + 1);
  return {
    state: { ...current, perks: { ...current.perks, [id]: tier } },
    tier,
    grew: tier > before,
  };
}
