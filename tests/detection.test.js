import test from 'node:test';
import assert from 'node:assert/strict';
import {DetectionSystem} from '../src/systems/DetectionSystem.js';
test('security alert is capped and lockdown triggers at 100',()=>{
 const security=new DetectionSystem();security.add(40);assert.equal(security.lockdown,false);security.add(80);assert.equal(security.alert,100);assert.equal(security.lockdown,true);
});
test('security alert decays when there is no active chase',()=>{
 const security=new DetectionSystem();security.add(30);security.update(1,[]);assert.ok(security.alert<30);
});
