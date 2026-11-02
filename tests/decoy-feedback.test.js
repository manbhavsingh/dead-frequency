import test from 'node:test';
import assert from 'node:assert/strict';
import { Decoy } from '../src/entities/Decoy.js';
import { Game, getDecoyLanding } from '../src/systems/Game.js';

test('decoy landing guide previews the facing direction and blocked throws', () => {
  const player = { x: 100, y: 80, facing: 0 };
  const openMap = { canOccupy: () => true };
  const landing = getDecoyLanding(player, openMap);

  assert.equal(landing.x, 212);
  assert.equal(landing.y, 80);
  assert.equal(landing.valid, true);

  player.facing = Math.PI / 2;
  const south = getDecoyLanding(player, openMap);
  assert.ok(Math.abs(south.x - 100) < 1e-9);
  assert.equal(south.y, 192);

  const blocked = getDecoyLanding(player, { canOccupy: () => false });
  assert.equal(blocked.valid, false);
});

test('decoy beacon stays visible long enough for a patrol guard to reach it', () => {
  const decoy = new Decoy(212, 80, 9);
  const slowGuardTravelTime = 112 / 40;

  assert.equal(decoy.eventId, 9);
  assert.ok(decoy.life > slowGuardTravelTime + 1);
});

test('decoy action links the visible beacon to its acoustic event', () => {
  const game = Object.create(Game.prototype);
  const event = { id: 42 };
  Object.assign(game, {
    player: { x: 100, y: 80, facing: 0, decoys: 2 },
    map: { canOccupy: () => true },
    noises: {
      emit(x, y, intensity, type, duration) {
        this.last = { x, y, intensity, type, duration };
        return event;
      }
    },
    decoys: [],
    sound: { play() {} },
    notify(message) { this.lastMessage = message; }
  });

  game.handleActions({ pressed: key => key === 'e' });

  assert.equal(game.player.decoys, 1);
  assert.equal(game.decoys.length, 1);
  assert.equal(game.decoys[0].eventId, 42);
  assert.equal(game.decoys[0].x, 212);
  assert.equal(game.decoys[0].y, 80);
  assert.equal(game.noises.last.type, 'decoy');
  assert.match(game.lastMessage, /CYAN BEACON/);
});

test('guard-heard and completed states are reflected by the decoy beacon', () => {
  const decoy = new Decoy(212, 80, 42);
  decoy.markHeard();
  assert.equal(decoy.heard, true);
  assert.equal(decoy.resolved, false);

  decoy.markResolved();
  assert.equal(decoy.heard, true);
  assert.equal(decoy.resolved, true);
});
