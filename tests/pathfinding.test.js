import test from 'node:test';
import assert from 'node:assert/strict';
import {findPath} from '../src/ai/Pathfinding.js';
import {TileMap} from '../src/world/TileMap.js';
test('A* returns a route between two open cells',()=>{
 const grid=Array.from({length:6},(_,y)=>Array.from({length:6},(_,x)=>(x===0||y===0||x===5||y===5)?1:0));
 const map=new TileMap(grid);const path=findPath(map,{x:30,y:30},{x:90,y:90});
 assert.ok(path.length>0);assert.deepEqual(path.at(-1),{x:90,y:90});
});
test('A* routes around a wall',()=>{
 const grid=Array.from({length:6},(_,y)=>Array.from({length:7},(_,x)=>(x===0||y===0||x===6||y===5)?1:0));
 for(let y=1;y<5;y++)grid[y][3]=1;grid[4][3]=0;
 const map=new TileMap(grid);const path=findPath(map,{x:30,y:30},{x:90,y:30});
 assert.ok(path.length>0);assert.ok(path.some(p=>p.y>=80));
});
