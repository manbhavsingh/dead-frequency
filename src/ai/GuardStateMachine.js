import { findPath } from './Pathfinding.js';

const STATES = {
  PATROL: 'PATROL',
  SUSPICIOUS: 'SUSPICIOUS',
  INVESTIGATE: 'INVESTIGATE',
  SEARCH: 'SEARCH',
  CHASE: 'CHASE',
  RETURN: 'RETURN',
  DISABLED: 'DISABLED',
};

export class GuardStateMachine {
  constructor(guard) {
    this.guard = guard;
    this.state = STATES.PATROL;
    this.timer = 0;
    this.path = [];
    this.pathTimer = 0;
    this.lastKnown = null;
    this.processed = new Set();
    this.searchOrigin = null;
    this.skepticism = 0;
    this.deceptionMemory = [];
    this.detectionConfirmed = false;
    this.attention = 'none';
    this.attentionTimer = 0;
    this.canSeePlayer = false;
    this.lastDecoyEventId = null;
    this.lastDecoyRewarded = false;
  }

  set(state) {
    if (this.state === state) return;
    this.state = state;
    this.timer = 0;
    this.path = [];
    this.pathTimer = 0;
  }

  hearNoise(event, game, heard) {
    const g = this.guard;
    if (heard < g.hearingThreshold) return;

    this.attentionTimer = 2.4;
    if (event.type === 'decoy') {
      const cell = game.map.cellAtWorld(event.x, event.y);
      const patternKey = `${cell.x},${cell.y}`;
      this.deceptionMemory.push({ key: patternKey, time: game.elapsed });
      this.deceptionMemory = this.deceptionMemory.filter(item => game.elapsed - item.time < 35);
      const repeats = this.deceptionMemory.filter(item => item.key === patternKey).length;
      this.skepticism = Math.min(3, repeats - 1);
      const confidence = Math.max(0.25, 1 - this.skepticism * 0.22);

      if (confidence >= 0.45) {
        this.lastKnown = { x: event.x, y: event.y };
        this.lastDecoyEventId = event.id;
        this.lastDecoyRewarded = false;
        g.suspicion = Math.max(g.suspicion, 28);
        this.attention = 'decoy';
        if (this.state !== STATES.CHASE || !this.canSeePlayer) this.set(STATES.INVESTIGATE);
        game.notify('DECOY HEARD — GUARD INVESTIGATING');
        game.onDecoyAccepted?.(g, event);
      } else {
        this.attention = 'skeptical';
        g.suspicion = Math.max(g.suspicion, 18);
        if (this.state !== STATES.CHASE) this.set(STATES.SUSPICIOUS);
        game.notify('DECOY PATTERN COMPROMISED');
      }
      return;
    }

    this.lastKnown = { x: event.x, y: event.y };
    g.suspicion = Math.max(g.suspicion, 14);
    this.attention = 'noise';
    if (this.state !== STATES.CHASE) this.set(STATES.INVESTIGATE);
    game.notify('NOISE DETECTED — SIGNAL ORIGIN MARKED');
  }

  update(dt, game) {
    const g = this.guard;
    const p = game.player;
    const map = game.map;
    this.timer += dt;
    this.pathTimer -= dt;
    this.attentionTimer = Math.max(0, this.attentionTimer - dt);
    if (this.attentionTimer === 0 && this.state !== STATES.INVESTIGATE) this.attention = 'none';

    if (this.state === STATES.DISABLED) {
      if (this.timer >= g.disabledFor) this.set(STATES.PATROL);
      return;
    }

    const distance = Math.hypot(p.x - g.x, p.y - g.y);
    const angle = Math.atan2(p.y - g.y, p.x - g.x);
    const delta = Math.atan2(Math.sin(angle - g.facing), Math.cos(angle - g.facing));
    const visualRange = g.visionRange * (p.crouching ? 0.68 : p.sprinting ? 1.12 : 1);
    const canSee = distance < visualRange &&
      Math.abs(delta) < g.fov / 2 &&
      map.lineOfSight(g.x, g.y, p.x, p.y);
    this.canSeePlayer = canSee;

    if (canSee) {
      const exposure = p.crouching ? 0.58 : p.sprinting ? 1.22 : 1;
      g.suspicion = Math.min(100, g.suspicion + dt * (distance < 60 ? 90 : 45) * exposure);
      this.lastKnown = { x: p.x, y: p.y };
      if (g.suspicion >= 100) {
        if (!this.detectionConfirmed) {
          p.detections++;
          this.detectionConfirmed = true;
          game.security.add(30);
          game.notify('VISUAL CONTACT — MOVE!');
        }
        this.set(STATES.CHASE);
      } else if (this.state === STATES.PATROL) {
        this.set(STATES.SUSPICIOUS);
      }
    } else if (this.state === STATES.CHASE) {
      g.suspicion = Math.max(40, g.suspicion - dt * 3);
    }

    for (const event of game.noises.events) {
      if (this.processed.has(event.id)) continue;
      this.processed.add(event.id);
      this.hearNoise(event, game, game.noises.getIntensity(event, g.x, g.y));
    }

    if (this.state === STATES.PATROL) {
      const target = g.route[g.routeIndex];
      this.moveToward(target, dt, game);
      if (Math.hypot(g.x - target.x * 20, g.y - target.y * 20) < 8) {
        g.routeIndex = (g.routeIndex + 1) % g.route.length;
        this.path = [];
      }
    }

    if (this.state === STATES.SUSPICIOUS) {
      g.suspicion = Math.max(0, g.suspicion - dt * 8);
      if (this.timer > 1.1) this.set(STATES.PATROL);
    }

    if (this.state === STATES.INVESTIGATE) {
      if (this.lastKnown) {
        this.moveToward({ x: this.lastKnown.x / 20, y: this.lastKnown.y / 20 }, dt, game);
      }
      if (this.lastKnown && Math.hypot(g.x - this.lastKnown.x, g.y - this.lastKnown.y) < 12) {
        this.searchOrigin = { ...this.lastKnown };
        if (this.attention === 'decoy' && this.lastDecoyEventId != null && !this.lastDecoyRewarded) {
          this.lastDecoyRewarded = true;
          game.rewardDecoyDiversion?.(g, this.lastDecoyEventId);
        }
        this.set(STATES.SEARCH);
      } else if (this.timer > 9) {
        this.set(STATES.RETURN);
      }
    }

    if (this.state === STATES.SEARCH) {
      if (this.timer > 3.2) {
        g.suspicion = Math.max(0, g.suspicion - 15);
        this.set(STATES.RETURN);
      } else {
        g.facing += dt * 0.8;
      }
    }

    if (this.state === STATES.CHASE) {
      if (canSee) this.lastKnown = { x: p.x, y: p.y };
      if (this.lastKnown) {
        this.moveToward({ x: this.lastKnown.x / 20, y: this.lastKnown.y / 20 }, dt, game);
      }
      if (distance < 12 && canSee) game.security.addAlert(100);
      if (!canSee && this.timer > 1.4) {
        this.searchOrigin = this.lastKnown ? { ...this.lastKnown } : null;
        this.set(STATES.SEARCH);
      }
    }

    if (this.state === STATES.RETURN) {
      const target = g.route[g.routeIndex];
      this.moveToward(target, dt, game);
      if (Math.hypot(g.x - target.x * 20, g.y - target.y * 20) < 10) {
        this.set(STATES.PATROL);
        g.suspicion = Math.max(0, g.suspicion - 20);
        this.detectionConfirmed = false;
      }
      if (this.timer > 7) this.set(STATES.PATROL);
    }
  }

  moveToward(target, dt, game) {
    const g = this.guard;
    if (!target) return;
    if (this.pathTimer <= 0 || !this.path.length) {
      this.path = findPath(game.map, { x: g.x, y: g.y }, { x: target.x * 20, y: target.y * 20 });
      this.pathTimer = 0.45;
    }
    const next = this.path[0];
    if (!next) return;
    const dx = next.x - g.x;
    const dy = next.y - g.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 4) {
      this.path.shift();
      return;
    }
    g.facing = Math.atan2(dy, dx);
    const step = Math.min(distance, g.speed * dt);
    const nx = g.x + (dx / distance) * step;
    const ny = g.y + (dy / distance) * step;
    if (game.map.canOccupy(nx, ny, 5)) {
      g.x = nx;
      g.y = ny;
    } else {
      this.pathTimer = 0;
    }
  }
}

export { STATES };
