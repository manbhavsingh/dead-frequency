import test from 'node:test';
import assert from 'node:assert/strict';
import { StorySystem } from '../src/systems/StorySystem.js';

function fixture() {
  const memory = { data: { unlocked: 1, best: {} } };
  return {
    memory,
    manager: {
      load() { return JSON.parse(JSON.stringify(memory.data)); },
      save(data) { memory.data = JSON.parse(JSON.stringify(data)); }
    }
  };
}

test('a choice persists and characters remember it', () => {
  const { manager } = fixture();
  const story = new StorySystem(manager);
  assert.equal(story.getChoice(1, 'relay').options.length, 2);
  assert.match(story.choose(1, 'evacuate'), /Six people made it out/);
  const next = new StorySystem(manager);
  assert.equal(next.getChoice(1, 'relay'), null);
  assert.equal(next.state.characters.mara, 2);
  assert.match(next.getBriefing(2), /crew made it out/);
  assert.match(next.getEnvironmentText(2), /SHELTER ROUTE OPEN/);
});

test('first decision changes the next mission loadout or cameras', () => {
  const first = fixture();
  new StorySystem(first.manager).choose(1, 'evacuate');
  const m2 = new StorySystem(first.manager).missionModifiers(2);
  assert.equal(m2.extraDecoys, 1);
  assert.equal(m2.startAlert, 10);

  const second = fixture();
  new StorySystem(second.manager).choose(1, 'scrub');
  assert.deepEqual(new StorySystem(second.manager).missionModifiers(2).disabledCameras, [0]);
});

test('Market power decision changes the tower mission', () => {
  const clinic = fixture();
  new StorySystem(clinic.manager).choose(2, 'clinic');
  assert.equal(new StorySystem(clinic.manager).missionModifiers(3).startAlert, 12);

  const uplink = fixture();
  const story = new StorySystem(uplink.manager);
  story.choose(2, 'uplink');
  assert.equal(story.missionModifiers(3).extraJammers, 1);
  assert.deepEqual(story.missionModifiers(3).disabledCameras, [3]);
  assert.match(story.getBriefing(3), /service spine/);
});

test('journey history influences the campaign ending', () => {
  const { manager } = fixture();
  const story = new StorySystem(manager);
  story.choose(1, 'evacuate');
  story.choose(2, 'clinic');
  story.recordAction('diversions', 4);
  story.recordMission(1, { won: true, detections: 0, alert: 18 });
  story.recordMission(2, { won: true, detections: 0, alert: 20 });
  story.choose(3, 'publish');
  const ending = new StorySystem(manager).getEnding();
  assert.equal(ending.id, 'open-frequency');
  assert.match(ending.journey, /4 completed diversions/);
  assert.match(ending.journey, /2 clean extractions/);
});

test('a quiet redacted run and a heavily detected run leave different legacies', () => {
  const { manager } = fixture();
  const story = new StorySystem(manager);
  story.choose(1, 'scrub');
  story.choose(2, 'uplink');
  story.recordAction('diversions', 3);
  story.recordMission(1, { won: true, detections: 0, alert: 20 });
  story.recordMission(2, { won: true, detections: 1, alert: 38 });
  story.choose(3, 'redact');
  assert.equal(story.getEnding().id, 'ghost-protocol');
  story.recordAction('detections', 5);
  assert.equal(story.getEnding().id, 'quiet-remembers');
});
