import { GuardStateMachine } from '../ai/GuardStateMachine.js';

export class Guard {
  constructor(config) {
    this.x = config.x * 20;
    this.y = config.y * 20;
    this.facing = 0;
    this.type = config.type || 'patrol';
    this.route = config.route || [{ x: config.x, y: config.y }];
    this.routeIndex = 0;
    this.speed = config.speed ?? (this.type === 'warden' ? 54 : this.type === 'listener' ? 46 : this.type === 'stalker' ? 39 : this.type === 'scavenger' ? 42 : 40);
    this.visionRange = config.visionRange ?? (this.type === 'listener' ? 102 : this.type === 'warden' ? 146 : this.type === 'stalker' ? 96 : this.type === 'scavenger' ? 114 : 120);
    this.hearingThreshold = config.hearingThreshold ?? (this.type === 'listener' ? 5 : this.type === 'warden' ? 9 : this.type === 'stalker' ? 6 : this.type === 'scavenger' ? 11 : 14);
    this.fov = config.fov ?? (this.type === 'warden' ? Math.PI * 0.92 : this.type === 'listener' ? Math.PI * 0.72 : this.type === 'stalker' ? 1.18 : this.type === 'scavenger' ? 0.8 : Math.PI * 0.7);
    this.suspicion = 0;
    this.disabledFor = 3;
    this.machine = new GuardStateMachine(this);
  }

  update(dt, game) {
    this.machine.update(dt, game);
  }

  draw(ctx) {
    const state = this.machine.state;
    const investigating = state === 'INVESTIGATE' || state === 'SEARCH';
    const chasing = state === 'CHASE';
    const disabled = state === 'DISABLED';
    const boss = this.isBoss === true;
    const wildlife = this.type === 'stalker';
    const scavenger = this.type === 'scavenger';
    const color = boss ? '#ff486f' : wildlife ? '#d88c55' : scavenger ? '#e27b5c' : this.type === 'listener' ? '#f2b65d' : this.type === 'warden' ? '#ff5f66' : '#d66fe8';
    const coneColor = chasing ? 'rgba(255,95,102,.15)' : wildlife ? 'rgba(216,140,85,.12)' : scavenger ? 'rgba(226,123,92,.10)' : boss ? 'rgba(255,72,111,.13)' : 'rgba(214,111,232,.07)';
    const radius = this.visionRange;

    ctx.save();
    ctx.translate(this.x, this.y);
    if (!disabled) {
      ctx.rotate(this.facing);
      ctx.fillStyle = coneColor;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, -this.fov / 2, this.fov / 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);
    if (boss) {
      ctx.strokeStyle = 'rgba(255,72,111,.72)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 18 + Math.sin(performance.now() / 120) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ff486f';
      ctx.fillRect(-3, -13, 6, 3);
      ctx.fillRect(-10, -10, 3, 5);
      ctx.fillRect(7, -10, 3, 5);
    } else if (investigating || chasing) {
      ctx.strokeStyle = chasing ? 'rgba(255,95,102,.85)' : 'rgba(242,182,93,.82)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, 13 + (Math.sin(performance.now() / 100) + 1) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,.42)';
    ctx.beginPath();
    ctx.ellipse(1, 7, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(this.facing);
    ctx.shadowColor = color;
    ctx.shadowBlur = chasing ? 11 : 7;
    ctx.fillStyle = disabled ? '#526571' : color;
    ctx.fillRect(-6, -6, 12, 12);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#07111d';
    ctx.fillRect(1, -3, 7, 6);
    ctx.fillStyle = boss ? '#ffffff' : '#f3f6ed';
    ctx.fillRect(6, -1, boss ? 3 : 2, boss ? 3 : 2);
    if (boss) {
      ctx.fillStyle = '#ffe2a8';
      ctx.fillRect(-7, -2, 3, 4);
      ctx.fillRect(-3, -8, 6, 2);
    }
    ctx.restore();

    if (this.suspicion > 2) {
      ctx.fillStyle = '#273d49';
      ctx.fillRect(this.x - 11, this.y - 15, 22, 3);
      ctx.fillStyle = this.suspicion > 75 ? '#ff5f66' : '#f2b65d';
      ctx.fillRect(this.x - 11, this.y - 15, 22 * this.suspicion / 100, 3);
    }

    if (investigating || chasing) {
      const followingEcho = !chasing && this.machine.attention === 'decoy';
      ctx.font = followingEcho ? 'bold 7px monospace' : 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = chasing ? '#ff5f66' : followingEcho ? '#55e2dc' : '#f2b65d';
      ctx.fillText(chasing ? '!' : followingEcho ? 'ECHO' : state === 'SEARCH' ? '?' : '!', this.x, this.y - (followingEcho ? 25 : 21));
    }

    ctx.font = boss ? 'bold 8px monospace' : 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = boss ? '#ffb0c2' : '#091521';
    ctx.fillText(boss ? 'CHORUS' : wildlife ? 'DUNE' : scavenger ? 'ROOK' : this.type === 'warden' ? 'W' : this.type === 'listener' ? 'L' : 'P', this.x, this.y + (boss ? 27 : 2));
  }
}
