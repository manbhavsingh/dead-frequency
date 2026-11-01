import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/systems/Game.js';
import { LEVELS } from '../src/data/levels.js';

function makeGame() {
  const level = LEVELS[0];
  const game = Object.create(Game.prototype);
  Object.assign(game, {
    level,
    levelIndex: 0,
    player: {
      x: level.start.x * 20,
      y: level.start.y * 20,
      moving: false,
      memory: false,
      score: 0,
      detections: 0
    },
    disabledRelays: new Set(),
    relayProgress: 0,
    interactProgress: 0,
    extractProgress: 0,
    actionProgress: 0,
    hackNoiseTimer: 0,
    elapsed: 0,
    security: { alert: 0, add() {} },
    noises: { emit() {} },
    sound: { play() {} },
    hud: null,
    status: ''
  });
  return game;
}

const holdF = { down: key => key === 'f' };

test('terminal remains locked until every security relay is bypassed', () => {
  const game = makeGame();
  game.player.x = game.level.terminal.x * 20;
  game.player.y = game.level.terminal.y * 20;

  for (let i = 0; i < 40; i++) game.updateInteractions(0.1, holdF);

  assert.equal(game.player.memory, false);
  assert.equal(game.disabledRelays.size, 0);
  assert.match(game.status, /TERMINAL INTERLOCKED/);

  const relay = game.level.relays[0];
  game.player.x = relay.x * 20;
  game.player.y = relay.y * 20;
  for (let i = 0; i < 24; i++) game.updateInteractions(0.1, holdF);

  assert.equal(game.disabledRelays.size, 1);
  assert.equal(game.player.score, 225);

  game.player.x = game.level.terminal.x * 20;
  game.player.y = game.level.terminal.y * 20;
  for (let i = 0; i < 36; i++) game.updateInteractions(0.1, holdF);

  assert.equal(game.player.memory, true);
});

test('moving interrupts a relay bypass and clears its progress', () => {
  const game = makeGame();
  const relay = game.level.relays[0];
  game.player.x = relay.x * 20;
  game.player.y = relay.y * 20;

  for (let i = 0; i < 6; i++) game.updateInteractions(0.1, holdF);
  assert.ok(game.relayProgress > 0);

  game.player.moving = true;
  game.updateInteractions(0.1, holdF);

  assert.equal(game.relayProgress, 0);
  assert.equal(game.disabledRelays.size, 0);
  assert.match(game.interactionHint, /STOP MOVING/);
});
