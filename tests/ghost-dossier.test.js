import test from 'node:test';
import assert from 'node:assert/strict';
import { GHOST_DOSSIER } from '../src/data/ghostDossier.js';
import { StorySystem } from '../src/systems/StorySystem.js';

test('Ghost dossier includes the requested rogue backstory elements', () => {
  assert.equal(GHOST_DOSSIER.name, 'KAEL VEYRIN');
  assert.match(GHOST_DOSSIER.origin, /ASH QUARTER/);
  assert.ok(GHOST_DOSSIER.sections.some(section => /LUCIEN BLACKTHORN/.test(section.title)));
  assert.ok(GHOST_DOSSIER.sections.some(section => /BURNING ARCHIVE/.test(section.title)));
  assert.ok(GHOST_DOSSIER.sections.some(section => /CROWN OF WHISPERS/.test(section.title)));
  assert.ok(GHOST_DOSSIER.sections.some(section => /MOTIVATIONS/.test(section.label)));
  assert.ok(GHOST_DOSSIER.sections.some(section => /FEARS/.test(section.label)));
  assert.ok(GHOST_DOSSIER.traits.length >= 4);
});

test('the first mission briefing connects the Crown to Ghost’s betrayal', () => {
  const story = new StorySystem();
  const briefing = story.getBriefing(1);
  assert.match(briefing, /Lucien left me in the Burning Archive/);
  assert.match(briefing, /Crown of Whispers/);
  assert.match(story.getEnvironmentText(1), /KAEL VEYRIN/);
});
