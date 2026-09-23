/** Ground-battle march: three regular wins, then a boss, then a tarot gift. */

export const BOSS_EVERY = 3;
export const PERK_CAP = 2;

export const PERK_IDS = ['shield', 'company', 'cannon', 'banner', 'destroyer'];

/** Tarot / Tasso deck. Copy lives in i18n; this is the draw order and numeral. */
export const TAROT = [
  { id: 'shield', numeral: 'א׳' },
  { id: 'company', numeral: 'ב׳' },
  { id: 'cannon', numeral: 'ג׳' },
  { id: 'banner', numeral: 'ד׳' },
  { id: 'destroyer', numeral: 'ה׳' },
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
  return base;
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

/** Prefer the gift the player has least of, so the deck stays varied. */
export function drawTarot(state, rng = Math.random) {
  const perks = normalizeCampaign(state).perks;
  let min = PERK_CAP;
  for (const card of TAROT) min = Math.min(min, perks[card.id] || 0);
  const pool = TAROT.filter((card) => (perks[card.id] || 0) === min);
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[Math.max(0, index)];
}

export function grantTarot(state, id) {
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
