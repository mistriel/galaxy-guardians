import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGE_WAVES, goldReady, groundDifficulty, scaleCount, stageWaveStep } from './groundTuning.js';
import { emptyCampaign, normalizeCampaign, noteGoldCharge, takeGoldCharge } from './campaign.js';

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
