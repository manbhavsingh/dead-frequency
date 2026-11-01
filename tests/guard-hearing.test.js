import test from 'node:test';
import assert from 'node:assert/strict';
import { Guard } from '../src/entities/Guard.js';
import { TileMap } from '../src/world/TileMap.js';

function makeGame() {
  const grid = Array.from({ length: 14 }, (_, y) =>
    Array.from({ length: 18 }, (_, x) =>
      (x === 0 || y === 0 || x === 17 || y === 13) ? 1 : 0
    )
  );
  const messages = [];
  const map = new TileMap(grid);
  const game = {
    map,
    player: { x: 50, y: 50, detections: 0 },
    elapsed: 0,
    security: { addAlert() {} },
    noises: {
      events: [],
      getIntensity() { return 90; }
    },
    notify(message) { messages.push(message); },
    messages
  };
  return game;
}

test('guard investigates a decoy at the sound origin', () => {
  const game = makeGame();
  const guard = new Guard({
    type: 'patrol',
    x: 8.5,
    y: 7.5,
    route: [{ x: 8.5, y: 7.5 }]
  });
  game.noises.events = [{ id: 1, x: 50, y: 50, type: 'decoy' }];

  guard.update(0.1, game);

  assert.equal(guard.machine.state, 'INVESTIGATE');
  assert.deepEqual(guard.machine.lastKnown, { x: 50, y: 50 });
  assert.equal(guard.machine.attention, 'decoy');
  assert.ok(game.messages.some(message => message.includes('GUARD INVESTIGATING')));

  const initialDistance = Math.hypot(guard.x - 50, guard.y - 50);
  for (let i = 0; i < 10; i++) {
    game.elapsed += 0.1;
    guard.update(0.1, game);
  }
  const finalDistance = Math.hypot(guard.x - 50, guard.y - 50);
  assert.ok(finalDistance < initialDistance, 'guard should move toward the decoy origin');
});

test('repeated decoys at one location eventually become compromised', () => {
  const game = makeGame();
  const guard = new Guard({
    type: 'patrol',
    x: 8.5,
    y: 7.5,
    route: [{ x: 8.5, y: 7.5 }]
  });

  for (let id = 1; id <= 4; id++) {
    game.elapsed = id;
    game.noises.events = [{ id, x: 50, y: 50, type: 'decoy' }];
    guard.update(0.01, game);
  }

  assert.equal(guard.machine.skepticism, 3);
  assert.ok(game.messages.some(message => message.includes('PATTERN COMPROMISED')));
});
