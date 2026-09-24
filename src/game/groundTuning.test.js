import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGE_WAVES, equalForceCounts, goldReady, groundDifficulty, scaleCount, stageWaveStep } from './groundTuning.js';
import { emptyCampaign, normalizeCampaign, noteForceMarch, noteGoldCharge, takeGoldCharge } from './campaign.js';

test('medium matches the baseline multipliers', () => {
  const medium = groundDifficulty('medium');
  assert.equal(medium.foeDamage, 1);
  assert.equal(medium.playerHp, 1);
  assert.equal(medium.spawn, 1);
  assert.equal(medium.cadence, 1);
  assert.equal(medium.playerHit, 1);
  assert.equal(medium.grace, 0);
  assert.equal(medium.lives, 0);
});

test('easy is gentler and hard is stricter', () => {
  const easy = groundDifficulty('easy');
  const hard = groundDifficulty('hard');
  assert.ok(easy.foeDamage < 1);
  assert.ok(easy.playerHp > 1);
  assert.ok(easy.spawn < 1);
  assert.ok(easy.cadence > 1);
  assert.ok(easy.playerHit < 1);
  assert.ok(easy.grace > 0);
  assert.ok(hard.foeDamage > 1);
  assert.ok(hard.playerHp < 1);
  assert.ok(hard.spawn > 1);
  assert.ok(hard.cadence < 1);
  assert.ok(hard.playerHit > 1);
  assert.equal(hard.grace, 0);
  assert.equal(hard.lives, 3);
});

test('unknown difficulty falls back to medium', () => {
  assert.equal(groundDifficulty('nope').id, 'medium');
  assert.equal(groundDifficulty(undefined).id, 'medium');
});

test('scaleCount keeps the authored squad on medium', () => {
  assert.equal(scaleCount(30, 1), 30);
  assert.equal(scaleCount(30, 0.72, 12), 22);
  assert.equal(scaleCount(30, 1.42, 12), 43);
  assert.equal(scaleCount(2, 0.1, 1), 1);
});

test('gold cup needs a win, full force, balance, and a streak', () => {
  assert.equal(goldReady({ win: true, fullForce: true, balanced: true, bestStreak: 3 }), true);
  assert.equal(goldReady({ win: true, fullForce: true, balanced: true, bestStreak: 2 }), false);
  assert.equal(goldReady({ win: true, fullForce: false, balanced: true, bestStreak: 4 }), false);
  assert.equal(goldReady({ win: false, fullForce: true, balanced: true, bestStreak: 4 }), false);
  assert.equal(goldReady({ win: true, boss: true, fullForce: true, balanced: true, bestStreak: 4 }), false);
});

test('ground stage stops at wave 10', () => {
  assert.equal(STAGE_WAVES, 10);
  assert.equal(stageWaveStep(1).done, false);
  assert.equal(stageWaveStep(1).wave, 2);
  assert.equal(stageWaveStep(9).done, false);
  assert.equal(stageWaveStep(9).wave, 10);
  assert.equal(stageWaveStep(9).beat, 'special');
  const last = stageWaveStep(10);
  assert.equal(last.done, true);
  assert.equal(last.wave, 10);
  assert.equal(last.beat, null);
  assert.equal(stageWaveStep(11).done, true);
  assert.equal(stageWaveStep(11).wave, 10);
});

test('equal force matches soldiers and tanks', () => {
  assert.deepEqual(equalForceCounts({ soldiers: 36, tanks: 4 }), { soldiers: 36, vehicles: 4 });
  assert.equal(equalForceCounts({ soldiers: 2, tanks: 0 }).soldiers, 8);
  assert.equal(equalForceCounts({}).vehicles, 1);
});

test('full force queues an equal fight, and that win banks a gold cup', () => {
  const armed = noteForceMarch(emptyCampaign(), { win: true, fullForce: true });
  assert.equal(armed.equalNext, true);
  assert.equal(armed.progressStreak, 1);
  assert.equal(armed.goldBadges, 0);
  assert.equal(armed.bossDue, false);
  const gold = noteForceMarch(armed, { win: true, balancedMatch: true });
  assert.equal(gold.equalNext, false);
  assert.equal(gold.progressStreak, 2);
  assert.equal(gold.goldBadges, 1);
  assert.equal(gold.goldCharges, 1);
  assert.equal(gold.sinceBoss, 2);
});

test('winning the equal fight with every force queues another equal fight', () => {
  const armed = noteForceMarch(emptyCampaign(), { win: true, fullForce: true });
  const again = noteForceMarch(armed, { win: true, balancedMatch: true, fullForce: true });
  assert.equal(again.goldBadges, 1);
  assert.equal(again.equalNext, true);
  assert.equal(again.progressStreak, 2);
});

test('a plain win or a retreat clears the path and keeps earned cups', () => {
  const armed = noteForceMarch(emptyCampaign(), { win: true, fullForce: true });
  const held = noteForceMarch(armed, { win: true, balancedMatch: true });
  const plain = noteForceMarch(held, { win: true });
  assert.equal(plain.progressStreak, 0);
  assert.equal(plain.equalNext, false);
  assert.equal(plain.goldBadges, 1);
  const fled = noteForceMarch(held, { win: false });
  assert.equal(fled.progressStreak, 0);
  assert.equal(fled.equalNext, false);
  assert.equal(fled.goldBadges, 1);
});

test('a boss win keeps the equal fight for the next regular battle', () => {
  const armed = noteForceMarch({ ...emptyCampaign(), sinceBoss: 2 }, { win: true, fullForce: true });
  assert.equal(armed.bossDue, true);
  assert.equal(armed.equalNext, true);
  const afterBoss = noteForceMarch(armed, { win: true, boss: true });
  assert.equal(afterBoss.bossDue, false);
  assert.equal(afterBoss.equalNext, true);
  assert.equal(afterBoss.progressStreak, 1);
  assert.equal(afterBoss.goldBadges, 0);
});

test('an in-fight gold cup still banks one charge', () => {
  const banked = noteForceMarch(emptyCampaign(), {
    win: true,
    fullForce: true,
    gold: true,
  });
  assert.equal(banked.goldCharges, 1);
  assert.equal(banked.goldBadges, 0);
  assert.equal(banked.equalNext, true);
});

test('gold charges save and spend one at a time', () => {
  const start = emptyCampaign();
  assert.equal(start.goldCharges, 0);
  const banked = noteGoldCharge(start);
  assert.equal(banked.goldCharges, 1);
  const spent = takeGoldCharge(banked);
  assert.equal(spent.had, true);
  assert.equal(spent.state.goldCharges, 0);
  const empty = takeGoldCharge(spent.state);
  assert.equal(empty.had, false);
  const restored = normalizeCampaign({ goldCharges: 4, sinceBoss: 1, perks: { cannon: 1 } });
  assert.equal(restored.goldCharges, 4);
  assert.equal(restored.perks.cannon, 1);
});
