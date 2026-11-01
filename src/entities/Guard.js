import { GuardStateMachine } from '../ai/GuardStateMachine.js';

export class Guard {
  constructor(config) {
    this.x = config.x * 20;
    this.y = config.y * 20;
    this.facing = 0;
    this.type = config.type || 'patrol';
    this.route = config.route || [{ x: config.x, y: config.y }];
    this.routeIndex = 0;
    this.speed = this.type === 'warden' ? 46 : this.type === 'listener' ? 38 : 34;
    this.visionRange = this.type === 'listener' ? 90 : this.type === 'warden' ? 132 : 112;
    this.hearingThreshold = this.type === 'listener' ? 6 : this.type === 'warden' ? 12 : 17;
    this.fov = this.type === 'warden' ? Math.PI * 0.85 : Math.PI * 0.62;
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
    const color = this.type === 'listener' ? '#f2b65d' : this.type === 'warden' ? '#ff5f66' : '#d66fe8';

    ctx.save();
    ctx.translate(this.x, this.y);
    if (investigating || chasing) {
      ctx.strokeStyle = chasing ? 'rgba(255,95,102,.8)' : 'rgba(242,182,93,.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 12 + (Math.sin(performance.now() / 100) + 1) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.rotate(this.facing);
    ctx.fillStyle = 'rgba(255,95,102,.08)';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(-5, -5, 10, 10);
    ctx.fillStyle = '#07111d';
    ctx.fillRect(1, -2, 6, 4);
    ctx.fillStyle = '#f3f6ed';
    ctx.fillRect(5, -1, 2, 2);
    ctx.restore();

    if (this.suspicion > 2) {
      ctx.fillStyle = '#273d49';
      ctx.fillRect(this.x - 10, this.y - 13, 20, 2);
      ctx.fillStyle = this.suspicion > 75 ? '#ff5f66' : '#f2b65d';
      ctx.fillRect(this.x - 10, this.y - 13, 20 * this.suspicion / 100, 2);
    }

    if (investigating || chasing) {
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = chasing ? '#ff5f66' : '#f2b65d';
      ctx.fillText(chasing ? '!' : state === 'SEARCH' ? '?' : '!', this.x, this.y - 19);
    }
  }
}
