import test from 'node:test';
import assert from 'node:assert/strict';
import { Guard } from '../src/entities/Guard.js';
import { DetectionSystem } from '../src/systems/DetectionSystem.js';
import { TileMap } from '../src/world/TileMap.js';

test('guard close contact triggers lockdown without freezing its update', () => {
  const grid = Array.from({ length: 12 }, (_, y) =>
    Array.from({ length: 12 }, (_, x) =>
      x === 0 || y === 0 || x === 11 || y === 11 ? 1 : 0
    )
  );
  const map = new TileMap(grid);
  const security = new DetectionSystem();
  const guard = new Guard({
    type: 'warden',
    x: 5.5,
    y: 5.5,
    route: [{ x: 5.5, y: 5.5 }]
  });
  guard.machine.set('CHASE');

  const game = {
    map,
    player: {
      x: 110,
      y: 110,
      crouching: false,
      sprinting: false,
      moving: false,
      detections: 0
    },
    security,
    noises: { events: [], getIntensity: () => 0 },
    elapsed: 1,
    notify() {}
  };

  assert.doesNotThrow(() => guard.update(0.016, game));
  assert.equal(security.alert, 100);
  assert.equal(security.lockdown, true);
});
