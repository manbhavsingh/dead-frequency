export class Player {
  constructor(x, y) {
    this.x = x * 20;
    this.y = y * 20;
    this.radius = 5;
    this.speed = 78;
    this.facing = 0;
    this.crouching = false;
    this.sprinting = false;
    this.moving = false;
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
    this.moving = moving;

    if (moving) {
      const length = Math.hypot(dx, dy);
      dx /= length;
      dy /= length;
      this.facing = Math.atan2(dy, dx);
    }

    this.crouching = input.down('c');
    this.sprinting = input.down('shift') && !this.crouching;
    const speed = this.speed * (this.crouching ? 0.48 : this.sprinting ? 1.65 : 1);
    const nextX = this.x + dx * speed * dt;
    const nextY = this.y + dy * speed * dt;

    if (map.canOccupy(nextX, this.y, this.radius)) this.x = nextX;
    if (map.canOccupy(this.x, nextY, this.radius)) this.y = nextY;

    if (this.jammerTime > 0) this.jammerTime = Math.max(0, this.jammerTime - dt);
    this.noiseTimer -= dt;

    if (moving && this.noiseTimer <= 0 && !this.crouching && this.jammerTime <= 0) {
      game.noises.emit(this.x, this.y, this.sprinting ? 54 : 27, 'movement', 0.38);
      this.noiseTimer = this.sprinting ? 0.21 : 0.44;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Ground shadow and quiet-mode indicator.
    ctx.fillStyle = 'rgba(0,0,0,.48)';
    ctx.beginPath();
    ctx.ellipse(1, 7, this.crouching ? 8 : 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.sprinting) {
      ctx.strokeStyle = 'rgba(242,182,93,.62)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-14, -3);
      ctx.lineTo(-7, -3);
      ctx.moveTo(-12, 3);
      ctx.lineTo(-6, 3);
      ctx.stroke();
    }

    // Direction cone makes orientation readable at a glance.
    ctx.save();
    ctx.rotate(this.facing);
    ctx.fillStyle = this.crouching ? 'rgba(85,226,220,.07)' : 'rgba(85,226,220,.12)';
    ctx.beginPath();
    ctx.moveTo(1, 0);
    ctx.lineTo(19, -8);
    ctx.lineTo(19, 8);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = this.crouching ? 0.72 : 1;
    ctx.shadowColor = this.sprinting ? '#f2b65d' : '#55e2dc';
    ctx.shadowBlur = this.sprinting ? 10 : 8;
    ctx.fillStyle = this.crouching ? '#399f9f' : this.sprinting ? '#f2b65d' : '#55e2dc';
    ctx.fillRect(this.crouching ? -5 : -5, this.crouching ? -4 : -6, this.crouching ? 10 : 11, this.crouching ? 8 : 12);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e4ffff';
    ctx.fillRect(2, -3, 5, 6);
    ctx.fillStyle = '#0c4550';
    ctx.fillRect(-3, -4, 4, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(6, -1, 2, 2);
    ctx.restore();

    ctx.restore();

    if (this.jammerTime > 0) {
      ctx.strokeStyle = 'rgba(85,226,220,.58)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 25 + 4 * Math.sin(performance.now() / 90), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
