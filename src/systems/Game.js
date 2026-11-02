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
const DECOY_RANGE = 112;

export function getDecoyLanding(player, map) {
  const x = player.x + Math.cos(player.facing) * DECOY_RANGE;
  const y = player.y + Math.sin(player.facing) * DECOY_RANGE;
  return { x, y, valid: map.canOccupy(x, y, 5) };
}

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
    this.map = new TileMap(this.level.makeMap(), 20, this.level.palette);
    this.player = new Player(this.level.start.x, this.level.start.y);
    this.player.decoys = this.level.decoys;
    this.player.maxDecoys = this.level.decoys;
    this.player.jammers = this.level.jammers;
    this.guards = this.level.guards.map(config => new Guard(config));
    this.cameras = (this.level.cameras || []).map(camera => ({ ...camera }));
    this.decoys = [];
    this.noises = new NoiseSystem(this.map);
    this.security = new DetectionSystem();
    this.securityDirector = new SecurityDirector();
    this.elapsed = 0;
    this.status = 'NO HOSTILES IN RANGE';
    this.interactProgress = 0;
    this.relayProgress = 0;
    this.extractProgress = 0;
    this.actionProgress = 0;
    this.hackNoiseTimer = 0;
    this.disabledRelays = new Set();
    this.bossAwakened = false;
    this.echoResonance = 0;
    this.echoDiversions = 0;
    this.rewardedEchoInvestigations = new Set();
    this.lockdownGraceActive = false;
    this.lockdownGraceTimer = 0;
    this.lockdownRescueUsed = false;
    this.highAlertWarned = false;
    this.finished = false;
    this.navTimer = 0;
    this.navPath = [];
    this.navDirection = '—';
    this.navDistance = 0;
    this.navLabel = 'SECURITY RELAY';
    this.interactionHint = 'FOLLOW THE SIGNAL TO YOUR FIRST RELAY';
    this.notify('OPERATION LIVE — SECURITY NETWORK ACTIVE');
  }

  notify(text) {
    this.status = text;
    if (this.hud) this.hud.toast(text);
  }

  onDecoyAccepted(guard, event) {
    const beacon = this.decoys.find(decoy => decoy.eventId === event.id);
    beacon?.markHeard();

    if (this.security?.lockdown && this.lockdownGraceActive) {
      this.breakLockdown('DECOY', event);
    }
  }

  rewardDecoyDiversion(guard, eventId) {
    const guardIndex = this.guards.indexOf(guard);
    if (guardIndex < 0 || eventId == null) return false;

    const key = guardIndex + ':' + eventId;
    if (this.rewardedEchoInvestigations.has(key)) return false;
    this.rewardedEchoInvestigations.add(key);
    this.decoys?.find(decoy => decoy.eventId === eventId)?.markResolved();

    this.echoDiversions++;
    this.player.score += 85;
    const nextResonance = this.echoResonance + 34;
    const hasDecoySpace = this.player.decoys < this.player.maxDecoys;

    if (nextResonance >= 100 && hasDecoySpace) {
      this.echoResonance = nextResonance - 100;
      this.player.decoys++;
      this.player.score += 125;
      this.sound.play('success');
      this.notify('ECHO LOOP COMPLETE — ONE DECOY CHARGE RECOVERED');
    } else {
      this.echoResonance = Math.min(99, nextResonance);
      this.notify('DIVERSION CONFIRMED — ECHO RESONANCE +' + (hasDecoySpace ? 34 : 0) + '%');
    }
    return true;
  }

  breakLockdown(source, event = null) {
    if (!this.security?.lockdown || !this.lockdownGraceActive || this.lockdownRescueUsed) return false;

    const visible = this.guards.some(guard => guard.machine.canSeePlayer);
    if (visible) {
      this.notify('LIVE VISUAL CONTACT — BREAK LINE OF SIGHT FIRST');
      return false;
    }

    this.security.lockdown = false;
    this.security.alert = 52;
    this.highAlertWarned = false;
    this.lockdownGraceActive = false;
    this.lockdownGraceTimer = 0;
    this.lockdownRescueUsed = true;

    for (const guard of this.guards) {
      if (guard.machine.state !== 'CHASE') continue;
      const target = source === 'DECOY' && event
        ? { x: event.x, y: event.y }
        : { x: this.player.x, y: this.player.y };
      guard.machine.lastKnown = target;
      guard.machine.attention = source === 'DECOY' ? 'decoy' : 'noise';
      guard.machine.attentionTimer = 3.2;
      guard.suspicion = Math.min(guard.suspicion, 65);
      guard.machine.set(source === 'DECOY' ? 'INVESTIGATE' : 'SEARCH');
    }

    this.notify(source === 'DECOY'
      ? 'LOCKDOWN BROKEN — THEY BOUGHT THE FALSE ECHO. MOVE!'
      : 'LOCKDOWN BROKEN — JAMMER MASKING ACTIVE. MOVE!');
    return true;
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

    if (this.security.alert >= 78 && !this.security.lockdown && !this.highAlertWarned) {
      this.highAlertWarned = true;
      this.notify('SIGNAL CRITICAL — BREAK LINE OF SIGHT OR SET A FALSE ECHO');
    } else if (this.security.alert < 55) {
      this.highAlertWarned = false;
    }

    if (this.security.lockdown) {
      if (!this.lockdownGraceActive && !this.lockdownRescueUsed) {
        this.lockdownGraceActive = true;
        this.lockdownGraceTimer = 3.2;
        this.notify('LAST TRANSMISSION — BREAK LINE OF SIGHT, THEN USE E OR Q');
      }

      if (this.lockdownGraceActive) {
        this.lockdownGraceTimer = Math.max(0, this.lockdownGraceTimer - dt);
        this.interactionHint = 'LOCKDOWN WINDOW ' + this.lockdownGraceTimer.toFixed(1) + 's — BREAK CONTACT + E / Q';
        if (this.lockdownGraceTimer <= 0) {
          this.finish(false);
          return;
        }
      } else {
        this.finish(false);
        return;
      }
    }
    this.hud?.update(this);
  }

  cameraDirection(camera) {
    return camera.dir + Math.sin(this.elapsed * 0.78 + (camera.phase || 0)) * (camera.sweep || 0);
  }

  updateNavigation(dt) {
    this.navTimer -= dt;
    const player = this.player;
    const nextRelay = (this.level.relays || []).findIndex((_, index) => !this.disabledRelays.has(index));
    let target;

    if (player.memory) {
      target = this.level.extraction;
      this.navLabel = 'EXTRACTION ZONE';
    } else if (nextRelay >= 0) {
      target = this.level.relays[nextRelay];
      this.navLabel = 'SECURITY RELAY ' + String(nextRelay + 1).padStart(2, '0') + ' / ' + String(this.level.relays.length).padStart(2, '0');
    } else {
      target = this.level.terminal;
      this.navLabel = 'MEMORY TERMINAL';
    }

    if (this.navTimer <= 0) {
      const targetWorld = { x: target.x * 20, y: target.y * 20 };
      this.navPath = findPath(this.map, { x: player.x, y: player.y }, targetWorld);
      this.navTimer = 0.4;
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
      const cameraRange = this.player.crouching ? 92 : this.player.sprinting ? 140 : 126;
      const angle = Math.atan2(this.player.y - y, this.player.x - x);
      const direction = this.cameraDirection(camera);
      const delta = Math.atan2(Math.sin(angle - direction), Math.cos(angle - direction));
      if (distance < cameraRange && Math.abs(delta) < 0.52 &&
          this.map.lineOfSight(x, y, this.player.x, this.player.y)) {
        this.security.add(dt * 15);
        this.status = 'CAMERA SWEEP — BREAK LINE OF SIGHT OR JAM IT';
      }
    }
  }

  applyHackPressure(dt, noiseIntensity, type = 'hack') {
    this.security.add(dt * 1.35);
    this.hackNoiseTimer -= dt;
    if (this.hackNoiseTimer <= 0) {
      this.noises.emit(this.player.x, this.player.y, noiseIntensity, type, 0.8);
      this.sound.play('hack');
      this.hackNoiseTimer = 0.88;
    }
  }

  updateInteractions(dt, input) {
    const player = this.player;
    const relays = this.level.relays || [];
    const nextRelayIndex = relays.findIndex((_, index) => !this.disabledRelays.has(index));
    const terminal = { x: this.level.terminal.x * 20, y: this.level.terminal.y * 20 };
    const extraction = { x: this.level.extraction.x * 20, y: this.level.extraction.y * 20 };
    const nearTerminal = Math.hypot(player.x - terminal.x, player.y - terminal.y) < 27;
    const nearExtraction = Math.hypot(player.x - extraction.x, player.y - extraction.y) < 28;

    this.actionProgress = 0;

    if (!player.memory && nextRelayIndex >= 0) {
      const relay = relays[nextRelayIndex];
      const relayWorld = { x: relay.x * 20, y: relay.y * 20 };
      const nearRelay = Math.hypot(player.x - relayWorld.x, player.y - relayWorld.y) < 26;
      const duration = relay.hackTime || 2.3;

      this.interactionHint = nearRelay
        ? player.moving
          ? 'STOP MOVING — HOLD F TO DISABLE RELAY'
          : input.down('f')
            ? 'BYPASSING RELAY ' + (nextRelayIndex + 1) + ' — KEEP HOLDING F'
            : 'HOLD F — DISABLE SECURITY RELAY'
        : 'DISABLE RELAY ' + (nextRelayIndex + 1) + ' / ' + relays.length + ' BEFORE THE TERMINAL';

      if (nearRelay && input.down('f') && !player.moving) {
        this.relayProgress += dt;
        this.actionProgress = Math.min(1, this.relayProgress / duration);
        this.applyHackPressure(dt, 58, 'hack');
        this.status = 'BYPASSING SECURITY RELAY ' + (nextRelayIndex + 1);
        if (this.relayProgress >= duration) {
          this.disabledRelays.add(nextRelayIndex);
          this.relayProgress = 0;
          this.actionProgress = 0;
          player.score += 225;
          this.security.add(5);
          this.sound.play('success');
          this.notify('SECURITY RELAY ' + this.disabledRelays.size + '/' + relays.length + ' DISABLED');
        }
      } else {
        this.relayProgress = 0;
        if (nearRelay && player.moving) this.status = 'STOP MOVING TO BYPASS THE RELAY';
        if (nearTerminal) this.status = 'TERMINAL INTERLOCKED — DISABLE ALL SECURITY RELAYS';
      }

      this.interactProgress = 0;
      this.extractProgress = 0;
      return;
    }

    if (!player.memory) {
      const duration = this.level.terminalHackTime || 3.5;
      this.interactionHint = nearTerminal
        ? player.moving
          ? 'STOP MOVING — HOLD F TO DOWNLOAD'
          : input.down('f')
            ? 'DOWNLOADING MEMORY — STAY ON THE TERMINAL'
            : 'HOLD F — DOWNLOAD MEMORY'
        : 'ALL RELAYS OFFLINE — FOLLOW NAVIGATION TO THE TERMINAL';

      if (input.down('f') && nearTerminal && !player.moving) {
        this.interactProgress += dt;
        this.actionProgress = Math.min(1, this.interactProgress / duration);
        this.applyHackPressure(dt, 68, 'hack');
        this.status = 'DOWNLOADING MEMORY — SIGNAL TRACE RISING';
        if (this.interactProgress >= duration) {
          player.memory = true;
          player.score += 650;
          this.interactProgress = 0;
          this.actionProgress = 0;
          this.security.add(7);
          this.sound.play('success');
          if (this.level.id === 3) this.wakeAntennaZeroBoss();
          this.notify(this.bossAwakened
            ? 'MEMORY SECURED — THE CHORUS IS HUNTING YOU. REACH EXTRACTION'
            : 'MEMORY FRAGMENT SECURED — REACH EXTRACTION');
        }
      } else {
        this.interactProgress = 0;
        if (nearTerminal && player.moving) this.status = 'STOP MOVING TO DOWNLOAD THE MEMORY';
        else if (nearTerminal) this.status = 'TERMINAL READY — HOLD F TO DOWNLOAD';
      }
      this.relayProgress = 0;
      this.extractProgress = 0;
      return;
    }

    const duration = this.level.extractionTime || 2.4;
    this.interactionHint = nearExtraction
      ? player.moving
        ? 'STOP MOVING — HOLD F TO EXTRACT'
        : input.down('f')
          ? 'EXTRACTION IN PROGRESS — HOLD POSITION'
          : 'HOLD F — COMPLETE EXTRACTION'
      : 'MEMORY SECURED — REACH THE EXTRACTION ZONE';

    if (input.down('f') && nearExtraction && !player.moving) {
      this.extractProgress += dt;
      this.actionProgress = Math.min(1, this.extractProgress / duration);
      this.applyHackPressure(dt, 48, 'extract');
      this.status = 'EXTRACTION IN PROGRESS — SIGNAL TRACE RISING';
      if (this.extractProgress >= duration) this.finish(true);
    } else {
      this.extractProgress = 0;
      if (nearExtraction && player.moving) this.status = 'STOP MOVING TO COMPLETE EXTRACTION';
      else if (nearExtraction) this.status = 'EXTRACTION ZONE — HOLD F';
    }
    this.interactProgress = 0;
    this.relayProgress = 0;
  }

  wakeAntennaZeroBoss() {
    if (this.bossAwakened) return;
    const warden = this.guards.find(guard => guard.type === 'warden');
    if (!warden) return;

    this.bossAwakened = true;
    warden.isBoss = true;
    warden.machine.lastKnown = { x: this.player.x, y: this.player.y };
    warden.machine.attention = 'core';
    warden.machine.attentionTimer = 10;
    warden.machine.set('INVESTIGATE');
    warden.suspicion = Math.max(warden.suspicion, 78);
    this.security.add(14);
    this.noises.emit(this.player.x, this.player.y, 110, 'core', 1.8);
    this.sound.play('boss');
    this.notify('CORE SENTINEL AWAKENED — THE CHORUS IS HUNTING YOUR SIGNAL');
  }

  handleActions(input) {
    if (input.pressed('e')) {
      if (this.player.decoys > 0) {
        const landing = getDecoyLanding(this.player, this.map);
        if (landing.valid) {
          this.player.decoys--;
          const event = this.noises.emit(landing.x, landing.y, 100, 'decoy', 1.2);
          this.decoys.push(new Decoy(landing.x, landing.y, event.id));
          this.sound.play('decoy');
          this.notify('ECHO DEPLOYED — WATCH FOR THE CYAN BEACON AND ECHO TAG');
        } else {
          this.notify('DECOY BLOCKED — ADJUST YOUR FACING');
        }
      } else {
        this.notify('NO DECOY CHARGES REMAINING');
      }
    }

    if (input.pressed('q')) {
      if (this.player.jammers > 0) {
        this.player.jammers--;
        this.player.jammerTime = 4.5;
        this.securityDirector.jam(4.5);
        this.noises.emit(this.player.x, this.player.y, 16, 'jam', 0.5);
        this.sound.play('jam');
        this.notify('SIGNAL JAMMER ACTIVE — CAMERAS BLIND');
        this.breakLockdown('JAMMER');
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

    (this.level.relays || []).forEach((relay, index) => {
      const x = relay.x * 20;
      const y = relay.y * 20;
      const active = !this.disabledRelays.has(index);
      const glow = active ? 0.2 + 0.1 * Math.sin(this.elapsed * 4 + index) : 0.12;

      ctx.save();
      ctx.shadowColor = active ? '#f2b65d' : '#55e2dc';
      ctx.shadowBlur = active ? 11 : 5;
      ctx.fillStyle = active ? 'rgba(242,182,93,' + glow + ')' : 'rgba(85,226,220,.12)';
      ctx.beginPath();
      ctx.arc(x, y, active ? 15 : 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = active ? '#f2b65d' : '#55e2dc';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(x - 8, y - 8, 16, 16);
      ctx.fillStyle = active ? '#f2b65d' : '#55e2dc';
      ctx.fillRect(x - 3, y - 3, 6, 6);
      ctx.fillStyle = '#07111d';
      ctx.fillRect(x - 1, y - 1, 2, 2);
      ctx.shadowBlur = 0;
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = active ? '#f2b65d' : '#55e2dc';
      ctx.fillText(active ? 'RELAY ' + String(index + 1).padStart(2, '0') : 'OFFLINE', x, y - 17);
      ctx.restore();
    });

    ctx.save();
    ctx.shadowColor = '#f2b65d';
    ctx.shadowBlur = this.disabledRelays.size === (this.level.relays || []).length ? 13 : 5;
    ctx.fillStyle = 'rgba(242,182,93,' + (pulse * 0.2) + ')';
    ctx.fillRect(terminal.x * 20 - 14, terminal.y * 20 - 14, 28, 28);
    ctx.strokeStyle = '#f2b65d';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(terminal.x * 20 - 9, terminal.y * 20 - 9, 18, 18);
    ctx.fillStyle = '#f2b65d';
    ctx.fillRect(terminal.x * 20 - 5, terminal.y * 20 - 5, 10, 10);
    ctx.fillStyle = '#07111d';
    ctx.fillRect(terminal.x * 20 - 2, terminal.y * 20 - 2, 4, 4);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f2b65d';
    ctx.fillText(this.disabledRelays.size === (this.level.relays || []).length ? 'DATA' : 'LOCKED', terminal.x * 20, terminal.y * 20 - 17);
    ctx.restore();

    ctx.save();
    ctx.shadowColor = '#55e2dc';
    ctx.shadowBlur = 12;
    ctx.fillStyle = 'rgba(85,226,220,' + (pulse * 0.28) + ')';
    ctx.beginPath();
    ctx.arc(extraction.x * 20, extraction.y * 20, 20 + Math.sin(this.elapsed * 4) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#55e2dc';
    ctx.lineWidth = 2;
    ctx.strokeRect(extraction.x * 20 - 10, extraction.y * 20 - 10, 20, 20);
    ctx.fillStyle = '#55e2dc';
    ctx.fillRect(extraction.x * 20 - 3, extraction.y * 20 - 3, 6, 6);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 8px monospace';
    ctx.fillText('EXIT', extraction.x * 20, extraction.y * 20 - 18);
    ctx.restore();

    for (const camera of this.cameras) {
      const x = camera.x * 20;
      const y = camera.y * 20;
      const direction = this.cameraDirection(camera);
      const range = 112;
      const halfFov = 0.52;
      const jammed = this.securityDirector.isJammed();

      if (!jammed) {
        ctx.fillStyle = 'rgba(214,111,232,.075)';
        ctx.strokeStyle = 'rgba(214,111,232,.26)';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, range, direction - halfFov, direction + halfFov);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      ctx.save();
      ctx.shadowColor = jammed ? '#55e2dc' : '#d66fe8';
      ctx.shadowBlur = 9;
      ctx.fillStyle = jammed ? '#536b73' : '#d66fe8';
      ctx.fillRect(x - 5, y - 5, 10, 10);
      ctx.fillStyle = '#07111d';
      ctx.fillRect(x - 2, y - 2, 4, 4);
      ctx.restore();
    }
  }

  drawEffects(ctx) {
    if (this.security.alert > 0) {
      ctx.fillStyle = 'rgba(255,45,65,' + (this.security.alert / 100 * 0.055) + ')';
      ctx.fillRect(0, 0, 640, 360);
    }
    if (this.bossAwakened) {
      ctx.fillStyle = '#ff5f66';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('CORE SENTINEL // THE CHORUS ACTIVE', 12, 29);
    }
    if (this.player.memory) {
      ctx.fillStyle = '#55e2dc';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('MEMORY SECURED // EXTRACT NOW', 12, 15);
    }
    if (this.player.jammerTime > 0) {
      ctx.strokeStyle = 'rgba(85,226,220,.55)';
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, 636, 356);
    }
    this.drawDecoyGuide(ctx);
  }

  drawDecoyGuide(ctx) {
    if (this.player.decoys <= 0) return;
    const landing = getDecoyLanding(this.player, this.map);
    const color = landing.valid ? '#55e2dc' : '#ff5f66';
    const alpha = 0.3 + Math.sin(this.elapsed * 5) * 0.08;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(this.player.x, this.player.y);
    ctx.lineTo(landing.x, landing.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(landing.x, landing.y, 8 + Math.sin(this.elapsed * 6) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(landing.x - 2, landing.y - 2, 4, 4);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(landing.valid ? 'E / DROP' : 'BLOCKED', landing.x, landing.y - 13);
    ctx.restore();
  }
}
