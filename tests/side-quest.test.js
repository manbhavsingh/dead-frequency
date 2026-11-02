import test from 'node:test';
import assert from 'node:assert/strict';
import { SIDE_QUEST, getSideQuestLoadoutBonus } from '../src/data/sideQuest.js';
import { TileMap } from '../src/world/TileMap.js';
import { findPath } from '../src/ai/Pathfinding.js';
import { Game } from '../src/systems/Game.js';

test('Shatterbelt side quest objectives and extraction are reachable', () => {
  const map = new TileMap(SIDE_QUEST.makeMap(), 20, SIDE_QUEST.palette);
  let current = { x: SIDE_QUEST.start.x * 20, y: SIDE_QUEST.start.y * 20 };
  for (const node of SIDE_QUEST.minerals) {
    const target = { x: node.x * 20, y: node.y * 20 };
    assert.notEqual(map.tileAtWorld(target.x, target.y), 1, node.label + ' is inside a wall');
    assert.ok(findPath(map, current, target).length > 0, node.label + ' is unreachable');
    current = target;
  }
  const cache = { x: SIDE_QUEST.scavengerCache.x * 20, y: SIDE_QUEST.scavengerCache.y * 20 };
  const exit = { x: SIDE_QUEST.extraction.x * 20, y: SIDE_QUEST.extraction.y * 20 };
  assert.ok(findPath(map, current, cache).length > 0, 'Rook ledger is unreachable');
  assert.ok(findPath(map, cache, exit).length > 0, 'Extraction is unreachable');
  assert.ok(SIDE_QUEST.guards.some(guard => guard.type === 'stalker'));
  assert.ok(SIDE_QUEST.guards.some(guard => guard.type === 'scavenger'));
});

test('harvesting a Glassite seam requires holding position and F', () => {
  const game = Object.create(Game.prototype);
  const node = SIDE_QUEST.minerals[0];
  Object.assign(game, {
    isSideQuest: true, level: SIDE_QUEST,
    player: { x: node.x * 20, y: node.y * 20, moving: false, score: 0 },
    sideQuestState: { minerals: new Set(), mineralProgress: 0, cacheProgress: 0, surveyRecovered: false, choiceOpened: false, rewardChoice: null },
    extractProgress: 0, actionProgress: 0,
    security: { add() {} }, noises: { emit() {} }, sound: { play() {} },
    hackNoiseTimer: 0, interactionHint: '', status: '',
    notify(message) { this.status = message; },
    applyHackPressure() {}
  });
  const holdF = { down: key => key === 'f' };
  for (let i = 0; i < 18; i++) game.updateSideQuestInteractions(0.1, holdF);
  assert.equal(game.sideQuestState.minerals.has(node.id), true);
  assert.equal(game.player.score, 220);
  const second = SIDE_QUEST.minerals[1];
  game.player.x = second.x * 20;
  game.player.y = second.y * 20;
  game.player.moving = true;
  game.updateSideQuestInteractions(0.1, holdF);
  assert.equal(game.sideQuestState.minerals.has(second.id), false);
  assert.equal(game.sideQuestState.mineralProgress, 0);
});

test('side quest rewards alter later campaign loadouts without changing old saves', () => {
  assert.deepEqual(getSideQuestLoadoutBonus(null, 3), { extraDecoys: 0, extraJammers: 0 });
  assert.deepEqual(getSideQuestLoadoutBonus({ completed: true, reward: 'signal-lens', surveyRecovered: true }, 3), { extraDecoys: 1, extraJammers: 1 });
  assert.deepEqual(getSideQuestLoadoutBonus({ completed: true, reward: 'echo-spool', surveyRecovered: false }, 2), { extraDecoys: 1, extraJammers: 0 });
});
