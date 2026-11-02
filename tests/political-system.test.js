import test from 'node:test';
import assert from 'node:assert/strict';
import { PoliticalSystem } from '../src/systems/PoliticalSystem.js';

function fixture() {
  const state = { data: { unlocked: 1, best: {} } };
  return {
    state,
    manager: {
      load() { return JSON.parse(JSON.stringify(state.data)); },
      save(data) { state.data = JSON.parse(JSON.stringify(data)); }
    }
  };
}

test('Valthorne starts with a civic pact, an official-private agreement and two rival blocs', () => {
  const politics = new PoliticalSystem();
  assert.equal(politics.relationship('residents', 'switchboard').status, 'ALLIANCE');
  assert.equal(politics.relationship('quietNet', 'rooks').status, 'ALLIANCE');
  assert.equal(politics.relationship('residents', 'quietNet').status, 'RIVALRY');
  assert.equal(politics.snapshot().factions.length, 4);
});

test('mission decisions change faction influence and diplomacy persistently', () => {
  const { manager } = fixture();
  const politics = new PoliticalSystem(manager);
  const priorInfluence = politics.state.influence.residents;
  assert.equal(politics.recordChoice(1, 'evacuate'), true);
  assert.ok(politics.state.influence.residents > priorInfluence);
  assert.ok(politics.state.relations['residents:switchboard'] > 62);

  const restored = new PoliticalSystem(manager);
  assert.equal(restored.state.flags.crewEvacuated, true);
  assert.equal(restored.state.influence.residents, politics.state.influence.residents);
});

test('a negotiated Rook truce can be broken by stealing the survey ledger', () => {
  const politics = new PoliticalSystem();
  politics.recordSideQuestReward('rook-truce');
  assert.equal(politics.relationship('residents', 'rooks').status, 'ALLIANCE');
  assert.equal(politics.relationship('switchboard', 'rooks').status, 'ALLIANCE');

  politics.applyEvent('rookLedgerStolen');
  assert.equal(politics.state.flags.rookContractExposed, true);
  assert.equal(politics.relationship('quietNet', 'rooks').status, 'RIVALRY');
  assert.equal(politics.relationship('residents', 'rooks').status, 'PRAGMATIC');
  assert.ok(politics.snapshot().recentEvents.some(event => /CONTRACT IS EXPOSED/.test(event.title)));
});

test('diplomacy influences later mission loadouts and patrol alertness', () => {
  const politics = new PoliticalSystem();
  assert.equal(politics.missionModifiers(2).extraDecoys, 1);
  assert.ok(politics.missionModifiers(2).startAlert >= 0);
  assert.ok(politics.missionModifiers(4, true).scavengerAwareness > 1);

  politics.recordSideQuestReward('rook-truce');
  assert.ok(politics.missionModifiers(4, true).scavengerAwareness < 1);
});

test('repeated diversions, detections, jammers and clean extracts shift influence', () => {
  const politics = new PoliticalSystem();
  politics.recordAction('diversions', 3);
  politics.recordAction('detections', 2);
  politics.recordAction('jammers', 1);
  politics.recordAction('cleanExtractions', 1);
  assert.ok(politics.state.influence.switchboard > 22);
  assert.ok(politics.state.influence.quietNet > 39);
  assert.ok(politics.state.influence.residents > 24);
});
