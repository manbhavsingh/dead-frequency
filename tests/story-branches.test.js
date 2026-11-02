import test from 'node:test';
import assert from 'node:assert/strict';
import { StorySystem } from '../src/systems/StorySystem.js';

test('story system defaults', () => {
  const story = new StorySystem();
  assert.equal(story.state.stats.diversions, 0);
});
