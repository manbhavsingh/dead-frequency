import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/systems/Game.js';
import { GuardStateMachine, STATES } from '../src/ai/GuardStateMachine.js';

function makeGame(levelIndex = 0) {
  const canvas = { getContext: () => ({ imageSmoothingEnabled: true }) };
  const hud = { toast() {}, update() {} };
  const game = new Game(canvas, hud, () => {}, null);
  game.loadLevel(levelIndex);
  return game;
}

test('stage 1 teaches movement and decoys before introducing cameras or a Listener', () => {
  const game = makeGame(0);

  assert.equal(game.pacingStage, 1);
  assert.equal(game.pacingStageLabel, 'READ THE PATROL');
  assert.equal(game.player.decoys, 3);
  assert.equal(game.player.jammers, 0);
  assert.deepEqual(game.guards.map(guard => guard.enabled), [true, false]);
  assert.deepEqual(game.cameras.map(camera => camera.enabled), [false, false]);
});

test('stage 2 follows a short maintenance rest and unlocks the jammer, Listener and cameras', () => {
  const game = makeGame(0);
  game.disabledRelays.add(0);

  game.updatePacing(0.1);
  assert.equal(game.pacingRestActive, true);
  assert.equal(game.pacingRestTimer, 3.5);
  assert.equal(game.pacingStageLabel, 'MAINTENANCE SILENCE');
  assert.equal(game.player.jammers, 0);
  assert.deepEqual(game.guards.map(guard => guard.enabled), [true, false]);
  assert.deepEqual(game.cameras.map(camera => camera.enabled), [false, false]);

  game.updatePacing(3.5);
  assert.equal(game.pacingRestActive, false);
  assert.equal(game.pacingStage, 2);
  assert.equal(game.pacingStageLabel, 'FALSE ECHO');
  assert.equal(game.player.jammers, 1);
  assert.deepEqual(game.guards.map(guard => guard.enabled), [true, true]);
  assert.deepEqual(game.cameras.map(camera => camera.enabled), [true, true]);
});

test('stage 4 delays the Market reinforcement wave until after a five-second rest', () => {
  const game = makeGame(1);
  assert.equal(game.pacingStage, 3);
  assert.deepEqual(game.guards.map(guard => guard.enabled), [true, true, false]);
  assert.deepEqual(game.cameras.map(camera => camera.enabled), [true, false, false]);

  game.disabledRelays.add(0);
  game.updatePacing(0.1);
  assert.equal(game.pacingRestActive, true);
  assert.equal(game.pacingRestTimer, 5);
  assert.equal(game.guards[2].enabled, false);

  game.updatePacing(5);
  assert.equal(game.pacingStage, 4);
  assert.equal(game.guards[2].enabled, true);
  assert.deepEqual(game.cameras.map(camera => camera.enabled), [true, true, true]);
});

test('stage 6 holds the Warden and final security layer until two relays and a six-second rest', () => {
  const game = makeGame(2);
  assert.equal(game.pacingStage, 5);
  assert.deepEqual(game.guards.map(guard => guard.enabled), [true, true, false, false]);
  assert.deepEqual(game.cameras.map(camera => camera.enabled), [true, true, false, false]);

  game.disabledRelays.add(0);
  game.updatePacing(1);
  assert.equal(game.pacingRestActive, false);
  assert.equal(game.pacingStage, 5);

  game.disabledRelays.add(1);
  game.updatePacing(0.1);
  assert.equal(game.pacingRestActive, true);
  assert.equal(game.pacingRestTimer, 6);
  assert.equal(game.guards[2].enabled, false);

  game.updatePacing(6);
  assert.equal(game.pacingStage, 6);
  assert.equal(game.pacingStageLabel, 'THE CHORUS');
  assert.equal(game.guards[2].enabled, true);
  assert.equal(game.guards[3].enabled, true);
  assert.deepEqual(game.cameras.map(camera => camera.enabled), [true, true, true, true]);
});

test('maintenance silence lets a guard reset instead of continuing a chase', () => {
  const guard = {
    x: 100,
    y: 100,
    suspicion: 35,
    disabledFor: 3,
    routeIndex: 0,
    route: [{ x: 5, y: 5 }]
  };
  const machine = new GuardStateMachine(guard);
  machine.state = STATES.CHASE;
  machine.canSeePlayer = true;
  machine.attention = 'noise';
  machine.moveToward = () => {};

  const game = {
    pacingRestActive: true,
    player: { x: 102, y: 103, crouching: false, sprinting: false },
    map: { lineOfSight: () => true },
    noises: { events: [] }
  };
  machine.update(0.5, game);

  assert.equal(machine.canSeePlayer, false);
  assert.equal(machine.state, STATES.PATROL);
  assert.equal(machine.attention, 'none');
  assert.equal(guard.suspicion, 23);
});
