import test from 'node:test';
import assert from 'node:assert/strict';
import {SecurityDirector} from '../src/systems/SecurityDirector.js';
test('jammer timer expires and camera surveillance resumes',()=>{
 const security=new SecurityDirector();security.jam(4);assert.equal(security.isJammed(),true);security.update(2);assert.equal(security.isJammed(),true);security.update(2.1);assert.equal(security.isJammed(),false);
});
