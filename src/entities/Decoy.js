export class Decoy {
  constructor(x, y, eventId = null) {
    this.x = x;
    this.y = y;
    this.eventId = eventId;
    // Keep the source visible long enough for a guard to travel to it.
    this.life = 5.5;
    this.age = 0;
    this.heard = false;
    this.resolved = false;
  }

  markHeard() {
    this.heard = true;
  }

  markResolved() {
    this.heard = true;
    this.resolved = true;
  }

  update(dt) {
    this.age += dt;
  }

  draw(ctx) {
    const fade = Math.min(1, Math.max(0, (this.life - this.age) / 1.4));
    const pulse = 0.5 + Math.sin(this.age * 7.5) * 0.5;
    const rgb = this.resolved ? '242,182,93' : this.heard ? '112,245,216' : '85,226,220';
    const radius = this.resolved ? 11 + pulse * 4 : 9 + pulse * 6;

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.shadowColor = this.resolved ? '#f2b65d' : '#55e2dc';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = `rgba(${rgb},.86)`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(${rgb},.48)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius + 5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(${rgb},.95)`;
    ctx.fillRect(this.x - 3, this.y - 3, 6, 6);
    ctx.fillStyle = '#07111d';
    ctx.fillRect(this.x - 1, this.y - 1, 2, 2);

    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = this.resolved ? '#f2b65d' : this.heard ? '#70f5d8' : '#55e2dc';
    ctx.fillText(this.resolved ? 'DIVERSION' : this.heard ? 'SIGNAL FOUND' : 'ECHO', this.x, this.y - 17);
    ctx.restore();
  }
}
