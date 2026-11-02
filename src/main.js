import { Input } from './core/Input.js';
import { Game } from './systems/Game.js';
import { HUD } from './ui/HUD.js';
import { SaveManager } from './data/SaveManager.js';

const $ = id => document.getElementById(id);
const screens = ['screen-menu', 'screen-manual', 'screen-game', 'screen-debrief', 'screen-fail', 'screen-pause'];
const canvas = $('game-canvas');
let game = null;
let raf = 0;
let last = 0;
let muted = false;

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

function start(index = 0) {
  cancelAnimationFrame(raf);
  releaseGamePointer();
  game = new Game(canvas, hud, handleFinish, save);
  game.loadLevel(index);
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
    $('journey-ledger').textContent = result.ending
      ? result.ending.journey + ' · Community trust ' + result.ending.communityTrust + ' · Quiet-Net heat ' + result.ending.heat
      : '';
    $('score-value').textContent = String(result.score).padStart(4, '0');
    $('rank-value').textContent = result.rank;
    $('debrief-time').textContent = fmt(result.time);
    $('detection-value').textContent = result.detections;
    $('next-button').textContent = result.hasNext ? 'NEXT OPERATION ↗' : 'RETURN TO MENU ↗';
    $('next-button').onclick = () => result.hasNext ? start(result.levelIndex + 1) : show('screen-menu');
    show('screen-debrief');
  } else {
    $('fail-story-reflection').textContent = result.storyReflection || '';
    show('screen-fail');
  }
}

function fmt(sec) {
  return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(Math.floor(sec % 60)).padStart(2, '0');
}

$('start-button').addEventListener('click', () => show('screen-manual'));
$('controls-button').addEventListener('click', () => show('screen-manual'));
$('manual-back').addEventListener('click', () => start(0));
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
$('restart-button').addEventListener('click', () => start(game?.levelIndex || 0));
$('quit-button').addEventListener('click', () => {
  cancelAnimationFrame(raf);
  releaseGamePointer();
  game = null;
  show('screen-menu');
});
$('retry-button').addEventListener('click', () => start(game?.levelIndex || 0));
$('fail-menu').addEventListener('click', () => { game = null; show('screen-menu'); });
$('debrief-menu').addEventListener('click', () => { game = null; show('screen-menu'); });
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
  } else if (event.key === 'Escape' && game?.paused) {
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
