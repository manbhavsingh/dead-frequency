import {Input} from './core/Input.js';
import {Game} from './systems/Game.js';
import {HUD} from './ui/HUD.js';
import {SaveManager} from './data/SaveManager.js';
const $=id=>document.getElementById(id);
const screens=['screen-menu','screen-manual','screen-game','screen-debrief','screen-fail','screen-pause'];
function show(id){screens.forEach(s=>$(s).classList.toggle('hidden',s!==id));}
const input=new Input(),hud=new HUD(),save=new SaveManager();let game=null,raf=0,last=0,muted=false;
function start(index=0){cancelAnimationFrame(raf);game=new Game($('game-canvas'),hud,handleFinish,save);game.loadLevel(index);game.sound.muted=muted;show('screen-game');last=performance.now();raf=requestAnimationFrame(loop);}
function loop(now){if(!game)return;const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;if(!game.paused){game.handleActions(input);game.update(dt,input);game.draw();}input.endFrame();if(!game.finished)raf=requestAnimationFrame(loop);}
function handleFinish(result){cancelAnimationFrame(raf);if(result.won){$('debrief-kicker').textContent='EXTRACTION CONFIRMED';$('debrief-title').innerHTML=result.rank==='GHOST'?'GHOST<br><span>IN THE WIRES.</span>':'OPERATION<br><span>COMPLETE.</span>';$('debrief-copy').textContent=result.hasNext?'The memory fragment is secure. The city is still listening.':'All memory fragments recovered. The truth is no longer buried.';$('score-value').textContent=String(result.score).padStart(4,'0');$('rank-value').textContent=result.rank;$('debrief-time').textContent=fmt(result.time);$('detection-value').textContent=result.detections;$('next-button').textContent=result.hasNext?'NEXT OPERATION ↗':'VIEW FINAL DEBRIEF ↗';$('next-button').onclick=()=>result.hasNext?start(result.levelIndex+1):show('screen-menu');show('screen-debrief');}else show('screen-fail');}
function fmt(sec){return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(Math.floor(sec%60)).padStart(2,'0')}`;}
$('start-button').addEventListener('click',()=>show('screen-manual'));
$('controls-button').addEventListener('click',()=>show('screen-manual'));
$('manual-back').addEventListener('click',()=>start(0));
$('pause-button').addEventListener('click',()=>{if(!game)return;game.paused=true;show('screen-pause');});
$('resume-button').addEventListener('click',()=>{if(!game)return;game.paused=false;last=performance.now();show('screen-game');});
$('restart-button').addEventListener('click',()=>start(game?.levelIndex||0));
$('quit-button').addEventListener('click',()=>{cancelAnimationFrame(raf);game=null;show('screen-menu');});
$('retry-button').addEventListener('click',()=>start(game?.levelIndex||0));
$('fail-menu').addEventListener('click',()=>{game=null;show('screen-menu');});
$('debrief-menu').addEventListener('click',()=>{game=null;show('screen-menu');});
$('sound-toggle').addEventListener('click',()=>{muted=!muted;if(game)game.sound.muted=muted;$('sound-toggle').innerHTML=muted?'♫ <span>SOUND OFF</span>':'♫ <span>SOUND ON</span>';});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&game&&!game.finished&&!game.paused){game.paused=true;show('screen-pause');}else if(e.key==='Escape'&&game?.paused){game.paused=false;show('screen-game');last=performance.now();}});
window.addEventListener('resize',()=>{const canvas=$('game-canvas');if(canvas)canvas.style.imageRendering='pixelated';});
show('screen-menu');
