import { TileMap } from '../world/TileMap.js';
import { Player } from '../entities/Player.js';
import { Guard } from '../entities/Guard.js';
import { Decoy } from '../entities/Decoy.js';
import { NoiseSystem } from './NoiseSystem.js';
import { DetectionSystem } from './DetectionSystem.js';
import { SecurityDirector } from './SecurityDirector.js';
import { LEVELS } from '../data/levels.js';
import { SoundSynth } from '../audio/SoundSynth.js';
import { findPath } from '../ai/Pathfinding.js';

const DIRECTIONS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];

export class Game {
  constructor(canvas, hud, onFinish, saveManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.hud = hud;
    this.onFinish = onFinish;
    this.saveManager = saveManager;
    this.sound = new SoundSynth();
    this.paused = false;
    this.loadLevel(0);
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.level = LEVELS[index];
    this.map = new TileMap(this.level.makeMap());
    this.player = new Player(this.level.start.x, this.level.start.y);
    this.player.decoys = this.level.decoys;
    this.player.jammers = this.level.jammers;
    this.guards = this.level.guards.map(config => new Guard(config));
    this.cameras = this.level.cameras || [];
    this.decoys = [];
    this.noises = new NoiseSystem(this.map);
    this.security = new DetectionSystem();
    this.securityDirector = new SecurityDirector();
    this.elapsed = 0;
    this.status = 'NO HOSTILES IN RANGE';
    this.interactProgress = 0;
    this.extractProgress = 0;
    this.finished = false;
    this.navTimer = 0;
    this.navPath = [];
    this.navDirection = '—';
    this.navDistance = 0;
    this.navLabel = 'MEMORY TERMINAL';
    this.interactionHint = 'FOLLOW THE SIGNAL TO YOUR OBJECTIVE';
    this.notify('OPERATION LIVE — STAY OFF THE GRID');
  }

  notify(text) {
    this.status = text;
    if (this.hud) this.hud.toast(text);
  }

  update(dt, input) {
    if (this.paused || this.finished) return;
    this.elapsed += dt;
    this.player.update(dt, input, this.map, this);
    this.noises.update(dt);
    this.securityDirector.update(dt);
    this.guards.forEach(guard => guard.update(dt, this));
    this.security.update(dt, this.guards);
    this.decoys.forEach(decoy => decoy.update(dt));
    this.decoys = this.decoys.filter(decoy => decoy.age < decoy.life);
    this.updateCameras(dt);
    this.updateInteractions(dt, input);
    this.updateNavigation(dt);

    if (this.security.lockdown) {
      this.finish(false);
      return;
    }
    this.hud?.update(this);
  }

  updateNavigation(dt) {
    this.navTimer -= dt;
    const player = this.player;
    const target = player.memory ? this.level.extraction : this.level.terminal;
    this.navLabel = player.memory ? 'EXTRACTION ZONE' : 'MEMORY TERMINAL';

    if (this.navTimer <= 0) {
      const targetWorld = { x: target.x * 20, y: target.y * 20 };
      this.navPath = findPath(this.map, { x: player.x, y: player.y }, targetWorld);
      this.navTimer = 0.45;
    }

    const targetWorld = { x: target.x * 20, y: target.y * 20 };
    const waypoint = this.navPath[0] || targetWorld;
    const dx = waypoint.x - player.x;
    const dy = waypoint.y - player.y;
    const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    this.navDirection = DIRECTIONS[Math.round(angle / 45) % 8];
    this.navDistance = Math.hypot(targetWorld.x - player.x, targetWorld.y - player.y) / 20;
  }

  updateCameras(dt) {
    if (this.securityDirector.isJammed()) return;
    for (const camera of this.cameras) {
      const x = camera.x * 20;
      const y = camera.y * 20;
      const distance = Math.hypot(this.player.x - x, this.player.y - y);
      const angle = Math.atan2(this.player.y - y, this.player.x - x);
      const delta = Math.atan2(Math.sin(angle - camera.dir), Math.cos(angle - camera.dir));
      if (distance < 112 && Math.abs(delta) < 0.62 &&
          this.map.lineOfSight(x, y, this.player.x, this.player.y)) {
        this.security.add(dt * 13);
        this.status = 'CAMERA SWEEP — BREAK LINE OF SIGHT';
      }
    }
  }

  updateInteractions(dt, input) {
    const player = this.player;
    const terminal = { x: this.level.terminal.x * 20, y: this.level.terminal.y * 20 };
    const extraction = { x: this.level.extraction.x * 20, y: this.level.extraction.y * 20 };
    const nearTerminal = Math.hypot(player.x - terminal.x, player.y - terminal.y) < 25;
    const nearExtraction = Math.hypot(player.x - extraction.x, player.y - extraction.y) < 27;

    if (!player.memory) {
      this.interactionHint = nearTerminal
        ? (input.down('f') ? 'DOWNLOADING — KEEP HOLDING F' : 'HOLD F — DOWNLOAD MEMORY')
        : 'FOLLOW NAVIGATION — FIND THE MEMORY TERMINAL';
    } else {
      this.interactionHint = nearExtraction
        ? (input.down('f') ? 'EXTRACTING — KEEP HOLDING F' : 'HOLD F — EXTRACT')
        : 'MEMORY SECURED — FOLLOW NAVIGATION TO EXTRACTION';
    }

    if (input.down('f') && nearTerminal && !player.memory) {
      this.interactProgress += dt;
      this.status = 'DOWNLOADING MEMORY FRAGMENT';
      if (this.interactProgress >= 1.2) {
        player.memory = true;
        player.score += 500;
        this.interactProgress = 0;
        this.sound.play('success');
        this.notify('MEMORY FRAGMENT SECURED — REACH EXTRACTION');
      }
    } else if (!nearTerminal) {
      this.interactProgress = 0;
    } else if (nearTerminal && !player.memory) {
      this.status = 'TERMINAL IN RANGE — HOLD F TO HACK';
    }

    if (input.down('f') && nearExtraction && player.memory) {
      this.extractProgress += dt;
      this.status = 'EXTRACTION IN PROGRESS';
      if (this.extractProgress >= 1) this.finish(true);
    } else if (!nearExtraction) {
      this.extractProgress = 0;
    } else if (nearExtraction && player.memory) {
      this.status = 'EXTRACTION ZONE — HOLD F';
    }
  }

  handleActions(input) {
    if (input.pressed('e')) {
      if (this.player.decoys > 0) {
        const x = this.player.x + Math.cos(this.player.facing) * 112;
        const y = this.player.y + Math.sin(this.player.facing) * 112;
        if (this.map.canOccupy(x, y, 5)) {
          this.player.decoys--;
          this.decoys.push(new Decoy(x, y));
          this.noises.emit(x, y, 100, 'decoy', 1.2);
          this.sound.play('decoy');
          this.notify('SIGNAL DECOY DEPLOYED — WATCH FOR AMBER GUARD MARKERS');
        } else {
          this.notify('DECOY BLOCKED — CLEAR THE THROW');
        }
      } else {
        this.notify('NO DECOY CHARGES REMAINING');
      }
    }

    if (input.pressed('q')) {
      if (this.player.jammers > 0) {
        this.player.jammers--;
        this.player.jammerTime = 4;
        this.securityDirector.jam(4);
        this.noises.emit(this.player.x, this.player.y, 16, 'jam', 0.5);
        this.sound.play('jam');
        this.notify('SIGNAL JAMMER ACTIVE');
      } else {
        this.notify('JAMMER CHARGES DEPLETED');
      }
    }
  }

  finish(won) {
    if (this.finished) return;
    this.finished = true;
    if (won) {
      const player = this.player;
      const rank = player.detections === 0 && this.security.alert < 35
        ? 'GHOST'
        : player.detections <= 1 ? 'OPERATOR' : 'EXPOSED';
      const score = player.score + 250 +
        (player.detections === 0 ? 500 : 0) +
        (this.security.alert < 100 ? 250 : 0) +
        Math.max(0, Math.round(300 - this.elapsed * 4));
      this.saveManager?.record(this.level.id, score);
      this.onFinish({
        won: true,
        score,
        rank,
        time: this.elapsed,
        detections: player.detections,
        hasNext: this.levelIndex < LEVELS.length - 1,
        levelIndex: this.levelIndex
      });
    } else {
      this.sound.play('fail');
      this.onFinish({ won: false, levelIndex: this.levelIndex });
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 640, 360);
    this.map.draw(ctx, this.elapsed * 1000);
    this.drawObjects(ctx);
    this.noises.draw(ctx);
    this.decoys.forEach(decoy => decoy.draw(ctx));
    this.guards.forEach(guard => guard.draw(ctx));
    this.player.draw(ctx);
    this.drawEffects(ctx);
  }

  drawObjects(ctx) {
    const terminal = this.level.terminal;
    const extraction = this.level.extraction;
    const pulse = 0.65 + 0.25 * Math.sin(this.elapsed * 3);

    ctx.fillStyle = `rgba(242,182,93,${pulse * 0.2})`;
    ctx.fillRect(terminal.x * 20 - 14, terminal.y * 20 - 14, 28, 28);
    ctx.strokeStyle = '#f2b65d';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(terminal.x * 20 - 9, terminal.y * 20 - 9, 18, 18);
    ctx.fillStyle = '#f2b65d';
    ctx.fillRect(terminal.x * 20 - 5, terminal.y * 20 - 5, 10, 10);
    ctx.fillStyle = '#07111d';
    ctx.fillRect(terminal.x * 20 - 2, terminal.y * 20 - 2, 4, 4);
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f2b65d';
    ctx.fillText('DATA', terminal.x * 20, terminal.y * 20 - 17);

    ctx.fillStyle = `rgba(85,226,220,${pulse * 0.28})`;
    ctx.beginPath();
    ctx.arc(extraction.x * 20, extraction.y * 20, 20 + Math.sin(this.elapsed * 4) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#55e2dc';
    ctx.lineWidth = 2;
    ctx.strokeRect(extraction.x * 20 - 10, extraction.y * 20 - 10, 20, 20);
    ctx.fillStyle = '#55e2dc';
    ctx.fillRect(extraction.x * 20 - 3, extraction.y * 20 - 3, 6, 6);
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = '#55e2dc';
    ctx.fillText('EXIT', extraction.x * 20, extraction.y * 20 - 18);

    for (const camera of this.cameras) {
      ctx.fillStyle = this.securityDirector.isJammed() ? '#536b73' : '#d66fe8';
      ctx.fillRect(camera.x * 20 - 4, camera.y * 20 - 4, 8, 8);
      if (!this.securityDirector.isJammed()) {
        ctx.strokeStyle = 'rgba(214,111,232,.12)';
        ctx.beginPath();
        ctx.moveTo(camera.x * 20, camera.y * 20);
        ctx.lineTo(
          camera.x * 20 + Math.cos(camera.dir) * 95,
          camera.y * 20 + Math.sin(camera.dir) * 95
        );
        ctx.stroke();
      }
    }
  }

  drawEffects(ctx) {
    if (this.security.alert > 0) {
      ctx.fillStyle = `rgba(255,45,65,${this.security.alert / 100 * 0.055})`;
      ctx.fillRect(0, 0, 640, 360);
    }
    if (this.player.memory) {
      ctx.fillStyle = '#55e2dc';
      ctx.font = '9px monospace';
      ctx.fillText('MEMORY SECURED', 12, 15);
    }
    if (this.player.jammerTime > 0) {
      ctx.strokeStyle = 'rgba(85,226,220,.35)';
      ctx.strokeRect(2, 2, 636, 356);
    }
  }
}
