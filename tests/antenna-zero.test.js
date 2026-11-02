import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/systems/Game.js';
import { LEVELS } from '../src/data/levels.js';

test('Antenna Zero awakens The Chorus when the final memory is downloaded', () => {
  const warden = {
    type: 'warden',
    suspicion: 12,
    isBoss: false,
    machine: {
      state: 'PATROL',
      lastKnown: null,
      attention: 'none',
      attentionTimer: 0,
      set(state) { this.state = state; }
    }
  };
  const alerts = [];
  const noises = [];
  const sounds = [];
  const messages = [];
  const game = Object.create(Game.prototype);
  Object.assign(game, {
    level: LEVELS[2],
    player: { x: 510, y: 70 },
    guards: [warden],
    bossAwakened: false,
    security: { add(value) { alerts.push(value); } },
    noises: { emit(...event) { noises.push(event); } },
    sound: { play(value) { sounds.push(value); } },
    notify(value) { messages.push(value); }
  });

  game.wakeAntennaZeroBoss();

  assert.equal(game.bossAwakened, true);
  assert.equal(warden.isBoss, true);
  assert.equal(warden.machine.state, 'INVESTIGATE');
  assert.deepEqual(warden.machine.lastKnown, { x: 510, y: 70 });
  assert.equal(warden.machine.attention, 'core');
  assert.deepEqual(alerts, [14]);
  assert.equal(noises.length, 1);
  assert.deepEqual(sounds, ['boss']);
  assert.match(messages[0], /THE CHORUS/);

  game.wakeAntennaZeroBoss();
  assert.deepEqual(alerts, [14], 'boss should only awaken once');
});
