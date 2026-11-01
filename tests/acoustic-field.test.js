import test from 'node:test';
import assert from 'node:assert/strict';
import {AcousticField} from '../src/world/AcousticField.js';
import {TileMap} from '../src/world/TileMap.js';

test('sound reaches adjacent floor tiles with attenuation',()=>{
  const map=new TileMap(Array.from({length:5},(_,y)=>Array.from({length:5},(_,x)=>(x===0||y===0||x===4||y===4)?1:0)));
  const field=new AcousticField(map);const values=field.propagate(50,50,50);
  assert.equal(field.intensityAt(values,50,50),50);
  assert.ok(field.intensityAt(values,70,50)>0);
  assert.ok(field.intensityAt(values,70,50)<50);
});
test('concrete wall blocks sound propagation',()=>{
  const grid=Array.from({length:5},(_,y)=>Array.from({length:7},(_,x)=>(x===0||y===0||x===6||y===4)?1:0));
  for(let y=1;y<4;y++)grid[y][3]=1;
  const map=new TileMap(grid),field=new AcousticField(map),values=field.propagate(30,40,90);
  assert.equal(field.intensityAt(values,90,40),0);
});
test('metal tile transmits sound farther than carpet',()=>{
  const make=(tile)=>{const g=Array.from({length:5},(_,y)=>Array.from({length:7},(_,x)=>(x===0||y===0||x===6||y===4)?1:0));for(let x=2;x<=4;x++)g[2][x]=tile;return new TileMap(g);};
  const intensity=(map)=>new AcousticField(map).intensityAt(new AcousticField(map).propagate(30,50,50),90,50);
  assert.ok(intensity(make(3))>intensity(make(2)));
});
