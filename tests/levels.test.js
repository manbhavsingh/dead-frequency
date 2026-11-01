import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS} from '../src/data/levels.js';
import {TileMap} from '../src/world/TileMap.js';
import {findPath} from '../src/ai/Pathfinding.js';
test('all three missions have reachable terminal and extraction routes',()=>{
 assert.equal(LEVELS.length,3);
 for(const level of LEVELS){
  const map=new TileMap(level.makeMap());
  const start={x:level.start.x*20,y:level.start.y*20};
  const terminal={x:level.terminal.x*20,y:level.terminal.y*20};
  const extraction={x:level.extraction.x*20,y:level.extraction.y*20};
  assert.ok(findPath(map,start,terminal).length>0,`${level.name}: terminal unreachable`);
  assert.ok(findPath(map,terminal,extraction).length>0,`${level.name}: extraction unreachable`);
 }
});
