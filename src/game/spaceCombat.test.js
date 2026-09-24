import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALLY,
  PLAYER,
  SPACE_CAMERA,
  playerTriggerDown,
  recoverPlayerVitals,
} from './balance.js';

test('player guns stay cold without a held fire control', () => {
  assert.equal(playerTriggerDown({}), false);
  assert.equal(playerTriggerDown({ space: false, fireButton: false, mouseHeld: false }), false);
  assert.equal(playerTriggerDown({ mouseHeld: false }), false);
});

test('space, the fire button, or a held mouse click each fire', () => {
  assert.equal(playerTriggerDown({ space: true }), true);
  assert.equal(playerTriggerDown({ fireButton: true }), true);
  assert.equal(playerTriggerDown({ mouseHeld: true }), true);
});

test('cruise camera is wider than the old FOV 82 / 30-back chase', () => {
  assert.ok(SPACE_CAMERA.fov > 82);
  assert.ok(SPACE_CAMERA.aimFov > 76);
  assert.ok(SPACE_CAMERA.back > 30);
  assert.ok(SPACE_CAMERA.aimBack > 24);
  assert.ok(SPACE_CAMERA.fov < 112);
  assert.ok(SPACE_CAMERA.back < 48);
  assert.equal(SPACE_CAMERA.boostFov, 122);
});

test('hull and shield wait out the grace, then climb without passing max', () => {
  const hurt = recoverPlayerVitals({
    hull: 40,
    shield: 20,
    sinceHit: 0.2,
    invuln: 0,
    dt: 0.5,
  });
  assert.equal(hurt.hull, 40);
  assert.equal(hurt.shield, 20);

  const blinking = recoverPlayerVitals({
    hull: 40,
    shield: 20,
    sinceHit: 5,
    invuln: 0.4,
    dt: 0.5,
  });
  assert.equal(blinking.hull, 40);
  assert.equal(blinking.shield, 20);

  const shieldOnly = recoverPlayerVitals({
    hull: 40,
    shield: 20,
    sinceHit: PLAYER.shieldDelay + 0.01,
    invuln: 0,
    dt: 0.5,
  });
  assert.equal(shieldOnly.hull, 40);
  assert.ok(shieldOnly.shield > 20);
  assert.ok(shieldOnly.shield <= PLAYER.shield);

  const both = recoverPlayerVitals({
    hull: 40,
    shield: 20,
    sinceHit: PLAYER.hullDelay + 0.01,
    invuln: 0,
    dt: 1,
  });
  assert.equal(both.hull, 40 + PLAYER.hullRegen);
  assert.equal(both.shield, 20 + PLAYER.shieldRegen);

  const capped = recoverPlayerVitals({
    hull: PLAYER.hull - 1,
    shield: PLAYER.shield - 1,
    sinceHit: 10,
    invuln: 0,
    dt: 5,
  });
  assert.equal(capped.hull, PLAYER.hull);
  assert.equal(capped.shield, PLAYER.shield);
});

test('escort still has its own gun, but not a simultaneous volley', () => {
  assert.ok(ALLY.fireEvery > 0);
  assert.ok(ALLY.supportGap >= 0.8);
  assert.ok(ALLY.supportOpen >= 1);
  assert.ok(ALLY.shotDamage > 0);
});
