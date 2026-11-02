import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/systems/Game.js';
import { GuardStateMachine, STATES } from '../src/ai/GuardStateMachine.js';

function makeLoopGame() {
  const guard = {
    suspicion: 0,
    machine: {
      state: STATES.CHASE,
      canSeePlayer: false,
      lastKnown: null,
      attention: 'none',
      attentionTimer: 0,
      set(state) { this.state = state; }
    }
  };
  const game = Object.create(Game.prototype);
  Object.assign(game, {
    guards: [guard],
    player: { score: 0, decoys: 0, maxDecoys: 3, x: 100, y: 100 },
    echoResonance: 0,
    echoDiversions: 0,
    rewardedEchoInvestigations: new Set(),
    lockdownGraceActive: true,
    lockdownGraceTimer: 3.2,
    lockdownRescueUsed: false,
    highAlertWarned: false,
    security: { lockdown: true, alert: 100 },
    sound: { play() {} },
    hud: null,
    status: ''
  });
  return { game, guard };
}

test('completed decoy diversions build resonance and refund a charge at 100%', () => {
  const { game, guard } = makeLoopGame();

  assert.equal(game.rewardDecoyDiversion(guard, 11), true);
  assert.equal(game.echoResonance, 34);
  assert.equal(game.player.decoys, 0);
  assert.equal(game.player.score, 85);

  assert.equal(game.rewardDecoyDiversion(guard, 11), false);
  assert.equal(game.echoResonance, 34);
  assert.equal(game.echoDiversions, 1);

  game.rewardDecoyDiversion(guard, 12);
  game.rewardDecoyDiversion(guard, 13);

  assert.equal(game.echoResonance, 2);
  assert.equal(game.player.decoys, 1);
  assert.equal(game.echoDiversions, 3);
  assert.equal(game.player.score, 380);
});

test('lockdown recovery requires line of sight to be broken and is available once', () => {
  const { game, guard } = makeLoopGame();
  guard.machine.canSeePlayer = true;

  assert.equal(game.breakLockdown('JAMMER'), false);
  assert.equal(game.security.lockdown, true);

  guard.machine.canSeePlayer = false;
  assert.equal(game.breakLockdown('DECOY', { x: 240, y: 180 }), true);
  assert.equal(game.security.lockdown, false);
  assert.equal(game.security.alert, 52);
  assert.equal(game.lockdownRescueUsed, true);
  assert.equal(guard.machine.state, STATES.INVESTIGATE);
  assert.deepEqual(guard.machine.lastKnown, { x: 240, y: 180 });

  game.security.lockdown = true;
  game.lockdownGraceActive = true;
  assert.equal(game.breakLockdown('JAMMER'), false);
  assert.equal(game.security.lockdown, true);
});

test('guards only pay out Echo Resonance after reaching an accepted decoy', () => {
  const guard = {
    x: 100,
    y: 100,
    facing: 0,
    fov: Math.PI,
    visionRange: 120,
    suspicion: 0,
    route: [{ x: 5, y: 5 }],
    routeIndex: 0,
    speed: 40
  };
  const machine = new GuardStateMachine(guard);
  let accepted = 0;
  const game = {
    elapsed: 0,
    player: { x: 400, y: 280, crouching: true, sprinting: false },
    map: {
      cellAtWorld: () => ({ x: 4, y: 4 }),
      lineOfSight: () => false
    },
    noises: { events: [] },
    notify() {},
    onDecoyAccepted() { accepted++; },
    rewardDecoyDiversion(_guard, eventId) { this.rewarded = eventId; }
  };

  machine.hearNoise({ id: 21, x: 100, y: 100, type: 'decoy' }, game, 100);
  assert.equal(accepted, 1);
  assert.equal(machine.state, STATES.INVESTIGATE);
  assert.equal(machine.lastDecoyEventId, 21);
  assert.equal(game.rewarded, undefined);

  machine.moveToward = () => {};
  machine.update(0.016, game);
  assert.equal(game.rewarded, 21);
  assert.equal(machine.state, STATES.SEARCH);

  machine.update(0.016, game);
  assert.equal(game.rewarded, 21);
});
