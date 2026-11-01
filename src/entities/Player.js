export class Player {
  constructor(x, y) {
    this.x = x * 20;
    this.y = y * 20;
    this.radius = 5;
    this.speed = 78;
    this.facing = 0;
    this.crouching = false;
    this.sprinting = false;
    this.noiseTimer = 0;
    this.decoys = 3;
    this.jammers = 1;
    this.jammerTime = 0;
    this.hacking = 0;
    this.memory = false;
    this.detections = 0;
    this.score = 0;
  }

  update(dt, input, map, game) {
    let dx = (input.down('d', 'arrowright') ? 1 : 0) - (input.down('a', 'arrowleft') ? 1 : 0);
    let dy = (input.down('s', 'arrowdown') ? 1 : 0) - (input.down('w', 'arrowup') ? 1 : 0);
    const moving = dx !== 0 || dy !== 0;

    if (moving) {
      const length = Math.hypot(dx, dy);
      dx /= length;
      dy /= length;
      this.facing = Math.atan2(dy, dx);
    }

    this.crouching = input.down('c');
    this.sprinting = input.down('shift') && !this.crouching;
    const speed = this.speed * (this.crouching ? 0.54 : this.sprinting ? 1.65 : 1);
    const nextX = this.x + dx * speed * dt;
    const nextY = this.y + dy * speed * dt;

    if (map.canOccupy(nextX, this.y, this.radius)) this.x = nextX;
    if (map.canOccupy(this.x, nextY, this.radius)) this.y = nextY;

    if (this.jammerTime > 0) this.jammerTime = Math.max(0, this.jammerTime - dt);
    this.noiseTimer -= dt;

    if (moving && this.noiseTimer <= 0 && !this.crouching && this.jammerTime <= 0) {
      game.noises.emit(this.x, this.y, this.sprinting ? 48 : 24, 'movement', 0.35);
      this.noiseTimer = this.sprinting ? 0.23 : 0.48;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.facing);

    if (this.sprinting) {
      ctx.strokeStyle = 'rgba(242,182,93,.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-13, 0);
      ctx.lineTo(-7, 0);
      ctx.stroke();
    }

    ctx.globalAlpha = this.crouching ? 0.72 : 1;
    ctx.fillStyle = this.crouching ? 'rgba(85,226,220,.1)' : 'rgba(85,226,220,.14)';
    ctx.beginPath();
    ctx.arc(0, 0, this.crouching ? 10 : 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.sprinting ? '#f2b65d' : '#55e2dc';
    ctx.fillRect(this.crouching ? -4 : -5, this.crouching ? -4 : -5, this.crouching ? 8 : 10, this.crouching ? 8 : 10);
    ctx.fillStyle = '#e4ffff';
    ctx.fillRect(1, -2, 6, 4);
    ctx.fillStyle = '#0c4550';
    ctx.fillRect(-3, -3, 4, 6);
    ctx.restore();

    if (this.jammerTime > 0) {
      ctx.strokeStyle = 'rgba(85,226,220,.5)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 25 + 4 * Math.sin(performance.now() / 90), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
