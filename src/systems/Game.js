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
import { StorySystem } from './StorySystem.js';
import { SIDE_QUEST, getSideQuestLoadoutBonus } from '../data/sideQuest.js';
import { PoliticalSystem } from './PoliticalSystem.js';

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

  loadLevel(index, levelOverride = null) {
    this.levelIndex = index;
    this.level = levelOverride || LEVELS[index];
    this.isSideQuest = Boolean(this.level.isSideQuest);
    this.story = new StorySystem(this.saveManager);
    this.politics = new PoliticalSystem(this.saveManager);
    this.politicalModifiers = this.politics.missionModifiers(this.level.id, this.isSideQuest);
    this.storyModifiers = this.isSideQuest
      ? { extraDecoys: 0, extraJammers: 0, startAlert: 0, disabledCameras: [] }
      : this.story.missionModifiers(this.level.id);
    this.storyModifiers.extraDecoys += this.politicalModifiers.extraDecoys;
    this.storyModifiers.extraJammers += this.politicalModifiers.extraJammers;
    this.storyModifiers.startAlert += this.politicalModifiers.startAlert;
    const savedQuest = this.saveManager?.load?.()?.sideQuest || {};
    if (!this.isSideQuest) {
      const gearBonus = getSideQuestLoadoutBonus(savedQuest, this.level.id);
      this.storyModifiers.extraDecoys += gearBonus.extraDecoys;
      this.storyModifiers.extraJammers += gearBonus.extraJammers;
    }
    this.storyMessage = (this.isSideQuest ? this.level.briefing : this.story.getBriefing(this.level.id)) + '  |  ' +
      this.politics.getFieldBriefing(this.level.id, this.isSideQuest);
    this.sideQuestState = this.isSideQuest ? {
      minerals: new Set(),
      mineralProgress: 0,
      cacheProgress: 0,
      surveyRecovered: false,
      choiceOpened: false,
      rewardChoice: null
    } : null;
    this.storyDetectionCount = 0;
    this.map = new TileMap(this.level.makeMap(), 20, this.level.palette);
    this.player = new Player(this.level.start.x, this.level.start.y);
    this.player.decoys = this.level.decoys + this.storyModifiers.extraDecoys;
    this.player.maxDecoys = this.player.decoys;
    this.player.jammers = this.level.jammers + this.storyModifiers.extraJammers;
    this.pacing = this.level.pacing || {};
    const initialGuards = this.pacing.initialGuards ?? this.level.guards.length;
    const initialCameras = this.pacing.initialCameras ?? (this.level.cameras || []).length;
    this.guards = this.level.guards.map((config, index) => {
      const guard = new Guard(config);
      if (this.isSideQuest && config.type === 'scavenger') {
        guard.visionRange *= this.politicalModifiers.scavengerAwareness;
        guard.speed *= this.politicalModifiers.scavengerAwareness;
      }
      guard.enabled = index < initialGuards;
      return guard;
    });
    this.cameras = (this.level.cameras || []).map((camera, index) => ({
      ...camera,
      enabled: index < initialCameras && !this.storyModifiers.disabledCameras.includes(index)
    }));
    this.decoys = [];
    this.noises = new NoiseSystem(this.map);
    this.security = new DetectionSystem();
    this.security.alert = this.storyModifiers.startAlert;
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
    this.pacingStage = this.pacing.initialStage || this.level.id * 2 - 1;
    this.pacingStageLabel = this.pacing.initialLabel || 'INFILTRATE';
    this.pacingRestActive = false;
    this.pacingRestTimer = 0;
    this.pacingRestDuration = 0;
    this.pacingPendingWave = null;
    this.pacingActivatedWaves = new Set();
    this.finished = false;
    this.navTimer = 0;
    this.navPath = [];
    this.navDirection = '—';
    this.navDistance = 0;
    this.navLabel = 'SECURITY RELAY';
    this.interactionHint = 'FOLLOW THE SIGNAL TO YOUR FIRST RELAY';
    this.notify('OPERATION LIVE — SECURITY NETWORK ACTIVE');
  }

  loadSideQuest() {
    this.loadLevel(-1, SIDE_QUEST);
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
    this.story?.recordAction('diversions');
    this.politics?.recordAction('diversions');

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
      if (guard.enabled === false || guard.machine.state !== 'CHASE') continue;
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

  updatePacing(dt) {
    if (this.pacingRestActive) {
      this.pacingRestTimer = Math.max(0, this.pacingRestTimer - dt);
      if (this.pacingRestTimer <= 0) this.releasePacingWave();
      return;
    }

    const wave = (this.pacing.waves || []).find(candidate =>
      !this.pacingActivatedWaves.has(candidate.stage) &&
      this.disabledRelays.size >= candidate.afterRelays
    );
    if (!wave) return;

    this.pacingActivatedWaves.add(wave.stage);
    this.pacingPendingWave = wave;
    this.pacingStageLabel = 'MAINTENANCE SILENCE';
    this.pacingRestTimer = wave.restSeconds || 0;
    this.pacingRestDuration = this.pacingRestTimer;
    this.pacingRestActive = this.pacingRestTimer > 0;

    // A relay outage briefly blinds the camera network and lets guards reset.
    if (this.pacingRestActive) {
      this.securityDirector.jam(this.pacingRestTimer);
      this.security.alert = Math.max(0, this.security.alert - 12);
      for (const guard of this.guards) {
        if (!guard.enabled || guard.machine.state === 'DISABLED') continue;
        guard.suspicion = Math.min(guard.suspicion, 35);
        guard.machine.canSeePlayer = false;
        guard.machine.attention = 'none';
        guard.machine.attentionTimer = 0;
        if (guard.machine.state !== 'PATROL') guard.machine.set('RETURN');
      }
      this.notify(wave.restMessage || 'MAINTENANCE SILENCE — REPOSITION');
    } else {
      this.releasePacingWave();
    }
  }

  releasePacingWave() {
    const wave = this.pacingPendingWave;
    if (!wave) return;

    for (const index of wave.guards || []) {
      if (this.guards[index]) this.guards[index].enabled = true;
    }
    for (const index of wave.cameras || []) {
      if (this.cameras[index] && !this.story?.isCameraDisabledForMission(this.level.id, index)) {
        this.cameras[index].enabled = true;
      }
    }
    if (wave.grantJammers) this.player.jammers += wave.grantJammers;

    this.pacingStage = wave.stage;
    this.pacingStageLabel = wave.label || 'SECURITY ESCALATION';
    this.pacingRestActive = false;
    this.pacingRestTimer = 0;
    this.pacingPendingWave = null;
    this.notify(wave.releaseMessage || 'SECURITY WAVE ACTIVE — ADAPT YOUR ROUTE');
    this.openStoryChoice('relay');
  }

  update(dt, input) {
    if (this.paused || this.finished) return;
    this.elapsed += dt;
    this.player.update(dt, input, this.map, this);
    this.noises.update(dt);
    this.securityDirector.update(dt);
    this.guards.forEach(guard => {
      if (guard.enabled) guard.update(dt, this);
    });
    this.security.update(dt, this.guards.filter(guard => guard.enabled));
    if (this.player.detections > this.storyDetectionCount) {
      const newDetections = this.player.detections - this.storyDetectionCount;
      this.story.recordAction('detections', newDetections);
      this.politics?.recordAction('detections', newDetections);
      this.storyDetectionCount = this.player.detections;
    }
    this.story.recordAlert(this.security.alert);
    this.decoys.forEach(decoy => decoy.update(dt));
    this.decoys = this.decoys.filter(decoy => decoy.age < decoy.life);
    this.updateCameras(dt);
    this.updateInteractions(dt, input);
    if (this.paused) {
      this.hud?.update(this);
      return;
    }
    this.updatePacing(dt);
    if (this.paused) {
      this.hud?.update(this);
      return;
    }
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

    if (this.isSideQuest) {
      const nextMineral = this.level.minerals.find(node => !this.sideQuestState.minerals.has(node.id));
      let target;
      if (nextMineral) {
        target = nextMineral;
        this.navLabel = 'GLASSITE SEAM ' + (this.sideQuestState.minerals.size + 1) + ' / 3';
      } else if (!this.sideQuestState.surveyRecovered) {
        target = this.level.scavengerCache;
        this.navLabel = 'OPTIONAL ROOK SURVEY LEDGER';
      } else {
        target = this.level.extraction;
        this.navLabel = 'EXTRACTION ZONE';
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
      return;
    }
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
      if (!camera.enabled) continue;
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
    if (this.isSideQuest) {
      this.updateSideQuestInteractions(dt, input);
      return;
    }
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
          if (this.level.id === 3) this.openStoryChoice('archive');
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

  updateSideQuestInteractions(dt, input) {
    const player = this.player;
    const minerals = this.sideQuestState.minerals;
    const nextMineral = this.level.minerals.find(node => !minerals.has(node.id));
    const nearExtraction = Math.hypot(player.x - this.level.extraction.x * 20, player.y - this.level.extraction.y * 20) < 28;
    const cache = this.level.scavengerCache;
    const nearCache = !this.sideQuestState.surveyRecovered &&
      Math.hypot(player.x - cache.x * 20, player.y - cache.y * 20) < 26;
    this.actionProgress = 0;

    if (nextMineral) {
      const nearMineral = Math.hypot(player.x - nextMineral.x * 20, player.y - nextMineral.y * 20) < 25;
      if (nearMineral) {
        this.interactionHint = player.moving
          ? 'STOP MOVING — HOLD F TO HARVEST GLASSITE'
          : input.down('f') ? 'CUTTING GLASSITE CORE — HOLD POSITION' : 'HOLD F — HARVEST ' + nextMineral.label;
        if (input.down('f') && !player.moving) {
          this.sideQuestState.mineralProgress += dt;
          this.actionProgress = Math.min(1, this.sideQuestState.mineralProgress / 1.7);
          this.applyHackPressure(dt, 42, 'salvage');
          this.status = 'GLASSITE CUTTER ACTIVE — VIBRATION CARRIES';
          if (this.sideQuestState.mineralProgress >= 1.7) {
            minerals.add(nextMineral.id);
            this.sideQuestState.mineralProgress = 0;
            player.score += 220;
            this.security.add(4);
            this.sound.play('success');
            this.notify('GLASSITE CORE RECOVERED — ' + minerals.size + ' / 3');
            if (minerals.size === 3 && !this.sideQuestState.choiceOpened) {
              this.sideQuestState.choiceOpened = true;
              this.openSideQuestChoice();
            }
          }
        } else {
          this.sideQuestState.mineralProgress = 0;
          if (player.moving) this.status = 'STOP MOVING TO KEEP THE CUTTER ALIGNED';
        }
        return;
      }
    }

    if (nearCache) {
      this.interactionHint = player.moving
        ? 'STOP MOVING — HOLD F TO COPY THE ROOK LEDGER'
        : input.down('f') ? 'BYPASSING ROOK LOCKBOX — KEEP HOLDING F' : 'OPTIONAL — HOLD F TO STEAL THE ROOK SURVEY LEDGER';
      if (input.down('f') && !player.moving) {
        this.sideQuestState.cacheProgress += dt;
        this.actionProgress = Math.min(1, this.sideQuestState.cacheProgress / 2.8);
        this.applyHackPressure(dt, 56, 'salvage');
        this.status = 'ROOK LOCKBOX OPENING — SCAVENGERS MAY HEAR THIS';
        if (this.sideQuestState.cacheProgress >= 2.8) {
          this.sideQuestState.surveyRecovered = true;
          this.politics?.applyEvent('rookLedgerStolen');
          this.storyMessage = this.politics.getFieldBriefing(this.level.id, true);
          this.sideQuestState.cacheProgress = 0;
          player.score += 350;
          this.security.add(6);
          this.sound.play('success');
          this.notify('ROOK SURVEY LEDGER STOLEN — FINAL LOADOUT PROFILE UNLOCKED');
        }
      } else {
        this.sideQuestState.cacheProgress = 0;
        if (player.moving) this.status = 'STOP MOVING TO COPY THE ROOK LEDGER';
      }
      return;
    }

    if (nearExtraction) {
      if (minerals.size < this.level.minerals.length) {
        this.interactionHint = 'EXTRACTION LOCKED — GLASSITE CORES ' + minerals.size + ' / 3';
        this.status = 'THREE GLASSITE CORES REQUIRED BEFORE EXTRACTION';
        return;
      }
      this.interactionHint = player.moving
        ? 'STOP MOVING — HOLD F TO EXTRACT'
        : input.down('f') ? 'EXTRACTING GLASSITE — HOLD POSITION' : 'HOLD F — EXTRACT THE GLASSITE';
      if (input.down('f') && !player.moving) {
        this.extractProgress += dt;
        this.actionProgress = Math.min(1, this.extractProgress / this.level.extractionTime);
        this.applyHackPressure(dt, 48, 'extract');
        this.status = 'EXTRACTION IN PROGRESS — ROOKS CLOSING IN';
        if (this.extractProgress >= this.level.extractionTime) this.finish(true);
      } else {
        this.extractProgress = 0;
        if (player.moving) this.status = 'STOP MOVING TO COMPLETE EXTRACTION';
      }
      return;
    }

    this.sideQuestState.mineralProgress = 0;
    this.sideQuestState.cacheProgress = 0;
    this.extractProgress = 0;
    if (minerals.size < 3) this.interactionHint = 'HARVEST GLASSITE CORES ' + minerals.size + ' / 3 — FOLLOW THE SIGNAL';
    else if (!this.sideQuestState.surveyRecovered) this.interactionHint = 'OPTIONAL: ROOK SURVEY LEDGER — OR HEAD TO EXTRACTION';
    else this.interactionHint = 'GLASSITE SECURED — REACH THE EXTRACTION BEACON';
  }

  openSideQuestChoice() {
    const choice = {
      kicker: 'THE SHATTERBELT // GLASSITE CLAIM',
      title: 'WHO GETS THE LAST CORE?',
      speaker: 'NIX + MARA // OPEN CHANNEL',
      context: 'The Glassite can be refined into better signal gear, turned into a decoy spool for the Ash Quarter, or sold for an immediate payout. The Rook survey ledger is optional, but it contains a second calibration profile for the final operation.',
      options: this.level.rewardOptions.map(({ id, title, detail }) => ({ id, title, detail }))
    };
    if (!this.hud?.showStoryChoice) return;
    this.pendingStoryChoice = choice;
    this.paused = true;
    if (typeof document !== 'undefined' && document.pointerLockElement && typeof document.exitPointerLock === 'function') document.exitPointerLock();
    const shown = this.hud.showStoryChoice(choice, rewardId => {
      if (!this.chooseSideQuestReward(rewardId)) return;
      this.storyMessage = this.sideQuestState.rewardChoice === 'signal-lens'
        ? 'NIX // Glassite signal lens calibrated. I have a jammer upgrade waiting.'
        : this.sideQuestState.rewardChoice === 'echo-spool'
          ? 'MARA // The Glassite spool is ready. The Ash Quarter will put it to use.'
          : this.sideQuestState.rewardChoice === 'rook-truce'
            ? 'GHOST // Glassite buys us passage. Keep your hands off the Rook ledger.'
            : 'GHOST // The last core stays with me. No more debts.';
      this.storyMessage += '  |  ' + this.politics.getFieldBriefing(this.level.id, true);
      this.pendingStoryChoice = null;
      this.paused = false;
      this.hud.hideStoryChoice?.();
      this.hud.update(this);
    });
    if (shown === false) {
      this.pendingStoryChoice = null;
      this.paused = false;
    }
  }

  chooseSideQuestReward(rewardId) {
    const reward = this.level.rewardOptions.find(option => option.id === rewardId);
    if (!reward || !this.sideQuestState) return false;
    this.sideQuestState.rewardChoice = rewardId;
    if (rewardId === 'signal-lens') this.story.state.factions.switchboard += 2;
    if (rewardId === 'echo-spool') this.story.state.factions.residents += 2;
    if (rewardId === 'keep-core') this.player.score += 650;
    this.politics?.recordSideQuestReward(rewardId);
    this.sound.play('success');
    this.notify('CONTRACT CHOICE LOCKED — REACH EXTRACTION');
    return true;
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
          this.story?.recordAction('decoysThrown');
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
        this.story?.recordAction('jammersUsed');
        this.politics?.recordAction('jammers');
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

  openStoryChoice(trigger) {
    const choice = this.story?.getChoice(this.level.id, trigger);
    if (!choice || !this.hud?.showStoryChoice) return;

    this.pendingStoryChoice = choice;
    this.paused = true;
    if (typeof document !== 'undefined' &&
        document.pointerLockElement &&
        typeof document.exitPointerLock === 'function') {
      document.exitPointerLock();
    }
    const shown = this.hud.showStoryChoice(choice, optionId => {
      const reaction = this.story.choose(this.level.id, optionId);
      if (!reaction) return;
      this.politics?.recordChoice(this.level.id, optionId);
      this.storyMessage = reaction + '  |  ' + this.politics.getFieldBriefing(this.level.id);
      this.pendingStoryChoice = null;
      this.paused = false;
      this.hud.hideStoryChoice?.();
      this.hud.update(this);
    });
    if (shown === false) {
      this.pendingStoryChoice = null;
      this.paused = false;
    }
  }

  finish(won) {
    if (this.finished) return;
    this.finished = true;
    if (!this.isSideQuest) this.story?.recordMission(this.level.id, {
      won,
      detections: this.player.detections,
      alert: this.security.alert,
      diversions: this.echoDiversions
    });
    if (won) {
      const player = this.player;
      if (player.detections === 0) this.politics?.recordAction('cleanExtractions');
      const rank = player.detections === 0 && this.security.alert < 35
        ? 'GHOST'
        : player.detections <= 1 ? 'OPERATOR' : 'EXPOSED';
      const score = player.score + 250 +
        (player.detections === 0 ? 500 : 0) +
        (this.security.alert < 100 ? 250 : 0) +
        Math.max(0, Math.round(300 - this.elapsed * 4)) +
        (this.isSideQuest && this.sideQuestState.surveyRecovered ? 350 : 0);

      if (this.isSideQuest) {
        this.story?.persist();
        const saved = this.saveManager?.load?.();
        const rewardId = this.sideQuestState.rewardChoice || 'keep-core';
        const reward = this.level.rewardOptions.find(option => option.id === rewardId);
        if (saved && this.saveManager?.save) {
          const prior = saved.sideQuest || {};
          saved.sideQuest = {
            completed: true,
            reward: rewardId,
            surveyRecovered: this.sideQuestState.surveyRecovered,
            bestScore: Math.max(prior.bestScore || 0, score),
            completions: (prior.completions || 0) + 1
          };
          this.saveManager.save(saved);
        }
        this.onFinish({
          won: true, sideQuest: true, score, rank, time: this.elapsed,
          detections: player.detections, glassite: this.sideQuestState.minerals.size,
          surveyRecovered: this.sideQuestState.surveyRecovered,
          rewardTitle: reward?.title || 'PRIVATE PAYOUT', rewardId,
          politicalLegacy: this.politics?.getPoliticalLegacy()
        });
        return;
      }

      this.saveManager?.record(this.level.id, score);
      const hasNext = this.levelIndex < LEVELS.length - 1;
      this.onFinish({
        won: true,
        score,
        rank,
        time: this.elapsed,
        detections: player.detections,
        hasNext,
        levelIndex: this.levelIndex,
        storyReflection: this.story?.getMissionReflection(this.level.id),
        ending: hasNext ? null : this.story?.getEnding(),
        politicalLegacy: this.politics?.getPoliticalLegacy()
      });
    } else {
      this.sound.play('fail');
      this.onFinish({
        won: false,
        sideQuest: this.isSideQuest,
        levelIndex: this.levelIndex,
        storyReflection: this.story?.getMissionReflection(this.level.id),
        politicalLegacy: this.politics?.getPoliticalLegacy()
      });
    }
  }

  drawStoryEnvironment(ctx) {
    if (this.isSideQuest) {
      ctx.save();
      ctx.fillStyle = 'rgba(22,13,15,.84)';
      ctx.fillRect(8, 338, 624, 15);
      ctx.strokeStyle = 'rgba(239,183,106,.58)';
      ctx.strokeRect(8.5, 338.5, 623, 14);
      ctx.font = '7px monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f2c486';
      ctx.fillText('SHATTERBELT // SOUND CARRIES FARTHER THAN YOU THINK // ROOKS ARE LISTENING', 14, 348, 610);
      ctx.restore();
      return;
    }
    const line = this.story?.getEnvironmentText(this.level.id);
    if (!line) return;
    ctx.save();
    ctx.fillStyle = 'rgba(5,15,25,.88)';
    ctx.fillRect(8, 338, 624, 15);
    ctx.strokeStyle = 'rgba(85,226,220,.42)';
    ctx.lineWidth = 1;
    ctx.strokeRect(8.5, 338.5, 623, 14);
    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8ddbd7';
    ctx.fillText(line, 14, 348, 610);
    ctx.restore();
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 640, 360);
    this.map.draw(ctx, this.elapsed * 1000);
    this.drawObjects(ctx);
    this.noises.draw(ctx);
    this.decoys.forEach(decoy => decoy.draw(ctx));
    this.guards.forEach(guard => {
      if (guard.enabled) guard.draw(ctx);
    });
    this.player.draw(ctx);
    this.drawEffects(ctx);
    this.drawStoryEnvironment(ctx);
  }

  drawObjects(ctx) {
    if (this.isSideQuest) {
      this.drawSideQuestObjects(ctx);
      return;
    }
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
      if (!camera.enabled) continue;
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

  drawSideQuestObjects(ctx) {
    for (const node of this.level.minerals) {
      const collected = this.sideQuestState.minerals.has(node.id);
      const x = node.x * 20;
      const y = node.y * 20;
      ctx.save();
      ctx.globalAlpha = collected ? 0.28 : 1;
      ctx.shadowColor = '#7df1df';
      ctx.shadowBlur = collected ? 2 : 13;
      ctx.fillStyle = collected ? '#718c82' : '#7df1df';
      ctx.beginPath();
      ctx.moveTo(x, y - 13);
      ctx.lineTo(x + 9, y - 2);
      ctx.lineTo(x + 6, y + 12);
      ctx.lineTo(x - 7, y + 10);
      ctx.lineTo(x - 10, y - 3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = collected ? '#82928a' : '#e4fff6';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.font = 'bold 6px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = collected ? '#a0a9a2' : '#aaffed';
      ctx.fillText(collected ? 'SECURED' : 'GLASSITE', x, y - 18);
      ctx.restore();
    }

    const cache = this.level.scavengerCache;
    const cx = cache.x * 20;
    const cy = cache.y * 20;
    ctx.save();
    ctx.shadowColor = this.sideQuestState.surveyRecovered ? '#7d8c80' : '#ff9b62';
    ctx.shadowBlur = this.sideQuestState.surveyRecovered ? 2 : 10;
    ctx.fillStyle = this.sideQuestState.surveyRecovered ? '#56675f' : '#bd6845';
    ctx.fillRect(cx - 11, cy - 8, 22, 16);
    ctx.strokeStyle = this.sideQuestState.surveyRecovered ? '#89978a' : '#ffc28b';
    ctx.strokeRect(cx - 11.5, cy - 8.5, 23, 17);
    ctx.fillStyle = '#2b2225';
    ctx.fillRect(cx - 2, cy - 8, 4, 16);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffc28b';
    ctx.fillText(this.sideQuestState.surveyRecovered ? 'LEDGER TAKEN' : 'ROOK CACHE', cx, cy - 15);
    ctx.restore();

    const exit = this.level.extraction;
    const ex = exit.x * 20;
    const ey = exit.y * 20;
    const pulse = 0.65 + 0.25 * Math.sin(this.elapsed * 3);
    ctx.save();
    ctx.shadowColor = '#7df1df';
    ctx.shadowBlur = 13;
    ctx.fillStyle = 'rgba(125,241,223,' + (pulse * 0.24) + ')';
    ctx.beginPath();
    ctx.arc(ex, ey, 20 + Math.sin(this.elapsed * 4) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7df1df';
    ctx.lineWidth = 2;
    ctx.strokeRect(ex - 10, ey - 10, 20, 20);
    ctx.fillStyle = '#7df1df';
    ctx.fillRect(ex - 3, ey - 3, 6, 6);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EXTRACT', ex, ey - 18);
    ctx.restore();
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
    if (this.isSideQuest) {
      ctx.fillStyle = '#aaffed';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('GLASSITE CORES // ' + this.sideQuestState.minerals.size + ' / 3', 12, 15);
      if (this.sideQuestState.surveyRecovered) {
        ctx.fillStyle = '#ffc28b';
        ctx.fillText('ROOK LEDGER SECURED', 12, 28);
      }
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
