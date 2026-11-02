import { Input } from './core/Input.js';
import { Game } from './systems/Game.js';
import { HUD } from './ui/HUD.js';
import { SaveManager } from './data/SaveManager.js';
import { GHOST_DOSSIER } from './data/ghostDossier.js';
import { PoliticalSystem } from './systems/PoliticalSystem.js';

const $ = id => document.getElementById(id);
const screens = ['screen-menu', 'screen-dossier', 'screen-contract', 'screen-politics', 'screen-manual', 'screen-game', 'screen-debrief', 'screen-fail', 'screen-pause'];
const canvas = $('game-canvas');
let game = null;
let raf = 0;
let last = 0;
let muted = false;
let newCampaignRequested = false;
let dossierReturnScreen = 'screen-menu';

function focusGame() {
  canvas?.focus({ preventScroll: true });
}

function setPointerHint(locked) {
  const hint = $('pointer-hint');
  if (hint) {
    hint.textContent = locked
      ? 'MOUSE CAPTURED · ESC TO RELEASE'
      : 'CLICK GAME TO CAPTURE MOUSE · ESC TO RELEASE';
  }
  canvas?.classList.toggle('pointer-locked', locked);
}

function releaseGamePointer() {
  if (document.pointerLockElement === canvas && typeof document.exitPointerLock === 'function') {
    document.exitPointerLock();
  }
}

function captureGamePointer() {
  if (!canvas || !game || game.paused || game.finished) return;
  focusGame();
  if (document.pointerLockElement === canvas) return;
  if (typeof canvas.requestPointerLock !== 'function') {
    setPointerHint(false);
    return;
  }

  try {
    const request = canvas.requestPointerLock();
    if (request && typeof request.catch === 'function') {
      request.catch(() => setPointerHint(false));
    }
  } catch {
    setPointerHint(false);
  }
}

document.addEventListener('pointerlockchange', () => {
  setPointerHint(document.pointerLockElement === canvas);
});
document.addEventListener('pointerlockerror', () => setPointerHint(false));

function show(id) {
  if (id !== 'screen-game') releaseGamePointer();
  screens.forEach(screen => $(screen).classList.toggle('hidden', screen !== id));
  document.body.classList.toggle('game-active', id === 'screen-game');
}

const input = new Input();
const hud = new HUD();
const save = new SaveManager();

function addDossierText(parent, tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = value;
  parent.append(element);
  return element;
}

function renderDossier() {
  const dossier = GHOST_DOSSIER;
  $('dossier-name').textContent = dossier.name;
  $('dossier-alias').textContent = dossier.alias;
  $('dossier-callsign').textContent = dossier.callsign;
  $('dossier-age').textContent = dossier.age;
  $('dossier-origin').textContent = dossier.origin;
  $('dossier-role').textContent = dossier.role;
  $('dossier-summary').textContent = dossier.summary;
  $('dossier-tagline').textContent = '"' + dossier.tagline + '"';
  const status = document.querySelector('.dossier-status');
  if (status) status.textContent = dossier.status;

  const sections = $('dossier-sections');
  sections.replaceChildren();
  dossier.sections.forEach((entry, index) => {
    const card = document.createElement('article');
    card.className = 'dossier-card dossier-section' + (index === 2 ? ' dossier-event' : '');
    addDossierText(card, 'p', 'eyebrow', entry.label);
    addDossierText(card, 'h3', '', entry.title);
    addDossierText(card, 'p', 'dossier-body', entry.body);
    sections.append(card);
  });

  const traits = $('dossier-traits');
  traits.replaceChildren();
  dossier.traits.forEach(trait => addDossierText(traits, 'li', '', trait));

  const relationships = $('dossier-relationships');
  relationships.replaceChildren();
  dossier.relationships.forEach(person => {
    const item = document.createElement('div');
    item.className = 'dossier-relationship';
    addDossierText(item, 'strong', '', person.name);
    addDossierText(item, 'span', '', person.role);
    addDossierText(item, 'p', '', person.note);
    relationships.append(item);
  });
}

function openDossier(returnScreen) {
  dossierReturnScreen = returnScreen;
  show('screen-dossier');
}

renderDossier();
refreshContractStatus();

function start(index = 0, sideQuest = false) {
  cancelAnimationFrame(raf);
  releaseGamePointer();
  game = new Game(canvas, hud, handleFinish, save);
  if (sideQuest) game.loadSideQuest();
  else game.loadLevel(index);
  game.sound.muted = muted;
  show('screen-game');
  focusGame();
  setPointerHint(false);
  last = performance.now();
  raf = requestAnimationFrame(loop);
}

function loop(now) {
  if (!game) return;
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  if (!game.paused) {
    game.handleActions(input);
    game.update(dt, input);
    game.draw();
  }
  input.endFrame();
  if (!game.finished) raf = requestAnimationFrame(loop);
}

function handleFinish(result) {
  cancelAnimationFrame(raf);
  releaseGamePointer();
  hud.hideStoryChoice();
  if (result.sideQuest && result.won) {
    $('debrief-kicker').textContent = 'OPTIONAL CONTRACT // EXTRACTION CONFIRMED';
    const title = $('debrief-title');
    title.classList.remove('story-ending-title');
    title.textContent = 'DUST & STATIC';
    $('debrief-copy').textContent = result.surveyRecovered
      ? 'Three Glassite cores and the Rook survey ledger are secure. The Shatterbelt is already swallowing your tracks.'
      : 'Three Glassite cores are secure. The Rook ledger remains in the dust, but the contract is complete.';
    $('debrief-story').textContent = 'REWARD // ' + result.rewardTitle +
      (result.surveyRecovered ? ' · ROOK CALIBRATION PROFILE RECOVERED' : ' · OPTIONAL SURVEY LEDGER NOT RECOVERED');
    $('journey-ledger').textContent = 'GLASSITE ' + result.glassite + ' / 3 · ' +
      (result.surveyRecovered ? 'ROOK DATA SECURED' : 'ROOK DATA SKIPPED') +
      ' · CONTRACT PAYOUT ' + result.score + (result.politicalLegacy ? ' · ' + result.politicalLegacy : '');
    $('score-value').textContent = String(result.score).padStart(4, '0');
    $('rank-value').textContent = result.rank;
    $('debrief-time').textContent = fmt(result.time);
    $('detection-value').textContent = result.detections;
    $('next-button').textContent = 'RETURN TO CONTRACT BOARD ↗';
    $('next-button').onclick = () => {
      game = null;
      refreshContractStatus();
      show('screen-menu');
    };
    show('screen-debrief');
    return;
  }
  if (result.won) {
    $('debrief-kicker').textContent = result.ending
      ? 'FINAL TRANSMISSION // JOURNEY RECORDED'
      : 'EXTRACTION CONFIRMED';
    const title = $('debrief-title');
    title.classList.toggle('story-ending-title', Boolean(result.ending));
    title.textContent = result.ending
      ? result.ending.title
      : result.rank === 'GHOST' ? 'GHOST IN THE WIRES.' : 'OPERATION COMPLETE.';
    $('debrief-copy').textContent = result.ending
      ? result.ending.copy
      : 'The memory fragment is secure. The city is still listening.';
    $('debrief-story').textContent = result.ending
      ? 'Your ending reflects the people you helped, the signals you forged and the attention you drew.'
      : result.storyReflection || '';
    const journeyText = result.ending
      ? result.ending.journey + ' · Community trust ' + result.ending.communityTrust + ' · Quiet-Net heat ' + result.ending.heat
      : '';
    $('journey-ledger').textContent = [journeyText, result.politicalLegacy].filter(Boolean).join(' · ');
    $('score-value').textContent = String(result.score).padStart(4, '0');
    $('rank-value').textContent = result.rank;
    $('debrief-time').textContent = fmt(result.time);
    $('detection-value').textContent = result.detections;
    $('next-button').textContent = result.hasNext ? 'NEXT OPERATION ↗' : 'RETURN TO MENU ↗';
    $('next-button').onclick = () => result.hasNext ? start(result.levelIndex + 1) : show('screen-menu');
    show('screen-debrief');
  } else {
    $('fail-story-reflection').textContent = result.sideQuest
      ? 'THE SHATTERBELT CLAIMED THE SIGNAL. RETRY THE CONTRACT, USE FALSE ECHOES TO DIVERT THE STALKERS, OR CIRCLE AROUND THE ROOK CAMP.'
      : result.storyReflection || '';
    show('screen-fail');
  }
}


function renderPoliticalNetwork() {
  const network = new PoliticalSystem(save).snapshot();
  $('politics-summary').textContent = network.leader.name + ' currently holds the greatest share of civic influence (' +
    network.leader.influence + '/100). Political power is contested through alliances, rivalries, trade and public support.';

  const factionGrid = $('political-factions');
  factionGrid.replaceChildren();
  for (const faction of network.factions) {
    const card = document.createElement('article');
    card.className = 'political-faction faction-' + faction.color;
    const top = document.createElement('div');
    top.className = 'political-faction-top';
    const heading = document.createElement('div');
    addDossierText(heading, 'p', 'eyebrow', faction.region);
    addDossierText(heading, 'h3', '', faction.name);
    addDossierText(heading, 'small', '', faction.government);
    top.append(heading);
    const score = document.createElement('strong');
    score.className = 'political-score';
    score.textContent = String(faction.influence).padStart(2, '0');
    top.append(score);
    card.append(top);
    addDossierText(card, 'p', 'political-leader', 'REPRESENTATION // ' + faction.leadership);
    addDossierText(card, 'p', 'political-agenda', faction.agenda);
    const meter = document.createElement('div');
    meter.className = 'political-meter';
    const fill = document.createElement('div');
    fill.style.width = faction.influence + '%';
    meter.append(fill);
    card.append(meter);
    addDossierText(card, 'p', 'political-meter-label', 'INFLUENCE ' + faction.influence + ' / 100');
    factionGrid.append(card);
  }

  const relationGrid = $('political-relations');
  relationGrid.replaceChildren();
  for (const relation of network.relationships) {
    const row = document.createElement('article');
    row.className = 'political-relation relation-' + relation.status.toLowerCase();
    const names = document.createElement('div');
    names.className = 'political-relation-names';
    addDossierText(names, 'strong', '', network.factions.find(f => f.id === relation.a)?.name || relation.a);
    addDossierText(names, 'span', '', '↔');
    addDossierText(names, 'strong', '', network.factions.find(f => f.id === relation.b)?.name || relation.b);
    row.append(names);
    const state = document.createElement('span');
    state.className = 'political-relation-status';
    state.textContent = relation.status + ' · ' + (relation.score > 0 ? '+' : '') + relation.score;
    row.append(state);
    relationGrid.append(row);
  }

  const eventList = $('political-events');
  eventList.replaceChildren();
  if (!network.recentEvents.length) {
    addDossierText(eventList, 'p', 'political-empty', 'No major accord, rupture or public crisis has been recorded yet.');
  } else {
    for (const event of network.recentEvents) {
      const item = document.createElement('article');
      item.className = 'political-event';
      addDossierText(item, 'strong', '', event.title);
      addDossierText(item, 'p', '', event.text);
      eventList.append(item);
    }
  }

  const alliances = network.alliances.length ? network.alliances.join(' · ') : 'NONE';
  const rivalries = network.rivalries.length ? network.rivalries.join(' · ') : 'NONE';
  $('politics-summary-detail').textContent = 'ACTIVE ALLIANCES // ' + alliances + '    |    DECLARED RIVALRIES // ' + rivalries;
}

function fmt(sec) {
  return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(Math.floor(sec % 60)).padStart(2, '0');
}

function refreshContractStatus() {
  const quest = save.load().sideQuest || {};
  const status = $('sidequest-status');
  const button = $('sidequest-button');
  if (!status || !button) return;
  status.textContent = quest.completed
    ? 'COMPLETED · BEST PAYOUT ' + String(quest.bestScore || 0).padStart(4, '0')
    : 'NEW CONTRACT · OPTIONAL · CAMPAIGN PROGRESS UNAFFECTED';
  const title = $('sidequest-title');
  if (title) title.textContent = quest.completed ? 'REPLAY DUST AND STATIC' : 'DUST AND STATIC';
  button.setAttribute('aria-label', quest.completed ? 'Replay the Dust and Static contract' : 'Open the Dust and Static contract');
  button.classList.toggle('is-completed', Boolean(quest.completed));
}

$('start-button').addEventListener('click', () => {
  newCampaignRequested = true;
  openDossier('screen-menu');
});
$('story-button').addEventListener('click', () => {
  newCampaignRequested = false;
  openDossier('screen-menu');
});
$('dossier-begin').addEventListener('click', () => show('screen-manual'));
$('dossier-back').addEventListener('click', () => show(dossierReturnScreen));
$('manual-dossier').addEventListener('click', () => openDossier('screen-manual'));
$('sidequest-button').addEventListener('click', () => {
  refreshContractStatus();
  show('screen-contract');
});
$('contract-back').addEventListener('click', () => show('screen-menu'));
$('politics-button').addEventListener('click', () => {
  renderPoliticalNetwork();
  show('screen-politics');
});
$('politics-back').addEventListener('click', () => show('screen-menu'));
$('contract-begin').addEventListener('click', () => start(-1, true));
$('controls-button').addEventListener('click', () => {
  newCampaignRequested = false;
  show('screen-manual');
});
$('manual-back').addEventListener('click', () => {
  if (newCampaignRequested) save.resetStory();
  newCampaignRequested = false;
  start(0);
});
$('pause-button').addEventListener('click', () => {
  if (!game) return;
  game.paused = true;
  show('screen-pause');
});
$('resume-button').addEventListener('click', () => {
  if (!game) return;
  game.paused = false;
  last = performance.now();
  show('screen-game');
  focusGame();
});
$('restart-button').addEventListener('click', () => game?.isSideQuest ? start(-1, true) : start(game?.levelIndex || 0));
$('quit-button').addEventListener('click', () => {
  cancelAnimationFrame(raf);
  releaseGamePointer();
  game = null;
  show('screen-menu');
});
$('retry-button').addEventListener('click', () => game?.isSideQuest ? start(-1, true) : start(game?.levelIndex || 0));
$('fail-menu').addEventListener('click', () => { game = null; refreshContractStatus(); show('screen-menu'); });
$('debrief-menu').addEventListener('click', () => { game = null; refreshContractStatus(); show('screen-menu'); });
$('sound-toggle').addEventListener('click', () => {
  muted = !muted;
  if (game) game.sound.muted = muted;
  $('sound-toggle').innerHTML = muted ? '♫ <span>SOUND OFF</span>' : '♫ <span>SOUND ON</span>';
});

window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && game && !game.finished && !game.paused) {
    // Escape releases pointer lock in the browser; pausing also guarantees
    // release on browsers with different event timing.
    game.paused = true;
    show('screen-pause');
  } else if (event.key === 'Escape' && game?.paused && !game.pendingStoryChoice) {
    game.paused = false;
    last = performance.now();
    show('screen-game');
    focusGame();
  }
});

canvas?.addEventListener('pointerdown', focusGame);
canvas?.addEventListener('click', captureGamePointer);

$('game-frame')?.addEventListener('wheel', event => {
  if (document.pointerLockElement === canvas) event.preventDefault();
}, { passive: false });

window.addEventListener('resize', () => {
  if (canvas) canvas.style.imageRendering = 'pixelated';
});

show('screen-menu');
