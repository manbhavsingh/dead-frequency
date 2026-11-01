import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/data/levels.js';
import { TileMap } from '../src/world/TileMap.js';
import { findPath } from '../src/ai/Pathfinding.js';

test('all missions have reachable relays, terminal, and extraction in objective order', () => {
  assert.equal(LEVELS.length, 3);
  for (const level of LEVELS) {
    const map = new TileMap(level.makeMap());
    let current = { x: level.start.x * 20, y: level.start.y * 20 };

    for (const [index, relay] of (level.relays || []).entries()) {
      const target = { x: relay.x * 20, y: relay.y * 20 };
      assert.notEqual(map.tileAtWorld(target.x, target.y), 1, level.name + ': relay ' + (index + 1) + ' is inside a wall');
      assert.ok(findPath(map, current, target).length > 0, level.name + ': relay ' + (index + 1) + ' unreachable');
      assert.ok(relay.hackTime >= 2, level.name + ': relay should require a deliberate hack');
      current = target;
    }

    const terminal = { x: level.terminal.x * 20, y: level.terminal.y * 20 };
    const extraction = { x: level.extraction.x * 20, y: level.extraction.y * 20 };
    assert.ok(findPath(map, current, terminal).length > 0, level.name + ': terminal unreachable after relays');
    assert.ok(findPath(map, terminal, extraction).length > 0, level.name + ': extraction unreachable');
    assert.ok(level.terminalHackTime >= 3, level.name + ': terminal hack should take time');
    assert.ok(level.extractionTime >= 2, level.name + ': extraction should take time');
  }
});

test('mission difficulty ramps through objectives, patrols, and surveillance', () => {
  assert.deepEqual(LEVELS.map(level => level.relays.length), [1, 2, 3]);
  assert.ok(LEVELS[1].guards.length > LEVELS[0].guards.length);
  assert.ok(LEVELS[2].guards.length > LEVELS[1].guards.length);
  assert.ok(LEVELS[1].cameras.length > LEVELS[0].cameras.length);
  assert.ok(LEVELS[2].cameras.length > LEVELS[1].cameras.length);
});
