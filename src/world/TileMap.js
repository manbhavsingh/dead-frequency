export const TILE = { FLOOR: 0, WALL: 1, CARPET: 2, METAL: 3, MACHINERY: 4 };

const DEFAULT_PALETTE = {
  background: '#071521',
  wall: '#142b3a',
  wallTop: '#2a4b5d',
  wallShadow: '#0a1925',
  floor: '#0c1d2a',
  carpet: '#142b35',
  metal: '#1a303c',
  machinery: '#192d37',
  neon: '#55e2dc',
  detail: '#f2b65d'
};

export class TileMap {
  constructor(grid, tileSize = 20, palette = DEFAULT_PALETTE) {
    this.grid = grid;
    this.tileSize = tileSize;
    this.height = grid.length;
    this.width = grid[0].length;
    this.palette = { ...DEFAULT_PALETTE, ...palette };
  }

  cellAtWorld(x, y) {
    return { x: Math.floor(x / this.tileSize), y: Math.floor(y / this.tileSize) };
  }

  tileAtWorld(x, y) {
    const cell = this.cellAtWorld(x, y);
    return this.tileAt(cell.x, cell.y);
  }

  tileAt(x, y) {
    if (y < 0 || x < 0 || y >= this.height || x >= this.width) return TILE.WALL;
    return this.grid[y][x];
  }

  isSolidWorld(x, y) {
    return this.tileAtWorld(x, y) === TILE.WALL;
  }

  canOccupy(x, y, radius = 5) {
    return !this.isSolidWorld(x - radius, y - radius) &&
      !this.isSolidWorld(x + radius, y - radius) &&
      !this.isSolidWorld(x - radius, y + radius) &&
      !this.isSolidWorld(x + radius, y + radius);
  }

  lineOfSight(x0, y0, x1, y1) {
    let x = Math.floor(x0 / this.tileSize);
    let y = Math.floor(y0 / this.tileSize);
    const tx = Math.floor(x1 / this.tileSize);
    const ty = Math.floor(y1 / this.tileSize);
    const dx = Math.abs(tx - x);
    const sx = x < tx ? 1 : -1;
    const dy = -Math.abs(ty - y);
    const sy = y < ty ? 1 : -1;
    let error = dx + dy;

    while (true) {
      if (!(x === Math.floor(x0 / this.tileSize) && y === Math.floor(y0 / this.tileSize)) &&
          this.tileAt(x, y) === TILE.WALL) return false;
      if (x === tx && y === ty) return true;
      const twice = 2 * error;
      if (twice >= dy) {
        error += dy;
        x += sx;
      }
      if (twice <= dx) {
        error += dx;
        y += sy;
      }
    }
  }

  draw(ctx, time = 0) {
    const size = this.tileSize;
    const p = this.palette;
    ctx.fillStyle = p.background;
    ctx.fillRect(0, 0, this.width * size, this.height * size);

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.grid[y][x];
        const px = x * size;
        const py = y * size;
        const detail = (x * 17 + y * 31) % 11;

        if (tile === TILE.WALL) {
          ctx.fillStyle = p.wall;
          ctx.fillRect(px, py, size, size);
          ctx.fillStyle = p.wallTop;
          ctx.fillRect(px + 1, py + 1, size - 2, 2);
          ctx.fillStyle = p.wallShadow;
          ctx.fillRect(px + 2, py + 5, size - 4, size - 7);
          ctx.fillStyle = 'rgba(255,255,255,.08)';
          ctx.fillRect(px + 3, py + 7, size - 6, 1);
          if (detail < 3) {
            ctx.fillStyle = p.detail;
            ctx.globalAlpha = 0.45;
            ctx.fillRect(px + 4, py + 12, 2, 2);
            ctx.fillRect(px + 14, py + 12, 2, 2);
            ctx.globalAlpha = 1;
          }
          if ((x + y) % 5 === 0) {
            ctx.fillStyle = p.neon;
            ctx.globalAlpha = 0.19;
            ctx.fillRect(px + 4, py + 16, size - 8, 1);
            ctx.globalAlpha = 1;
          }
          continue;
        }

        const floorColor = tile === TILE.CARPET ? p.carpet
          : tile === TILE.METAL ? p.metal
            : tile === TILE.MACHINERY ? p.machinery : p.floor;
        ctx.fillStyle = floorColor;
        ctx.fillRect(px, py, size, size);
        ctx.strokeStyle = 'rgba(255,255,255,.1)';
        ctx.lineWidth = 0.65;
        ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);

        if (tile === TILE.METAL) {
          ctx.fillStyle = 'rgba(255,255,255,.16)';
          ctx.fillRect(px + 3, py + 3, size - 6, 1);
          ctx.fillRect(px + 3, py + size - 4, size - 6, 1);
          ctx.fillStyle = p.neon;
          ctx.globalAlpha = 0.7;
          ctx.fillRect(px + 3, py + 3, 2, 2);
          ctx.fillRect(px + size - 5, py + 3, 2, 2);
          ctx.fillRect(px + 3, py + size - 5, 2, 2);
          ctx.fillRect(px + size - 5, py + size - 5, 2, 2);
          ctx.globalAlpha = 1;
        } else if (tile === TILE.MACHINERY) {
          const glow = 0.3 + 0.18 * Math.sin(time / 210 + x * 0.7 + y);
          ctx.fillStyle = p.detail;
          ctx.globalAlpha = glow;
          ctx.fillRect(px + 5, py + 5, 10, 10);
          ctx.globalAlpha = 1;
          ctx.fillStyle = 'rgba(255,255,255,.48)';
          ctx.fillRect(px + 7, py + 7, 6, 1);
          ctx.fillRect(px + 7, py + 10, 4, 1);
        } else if (tile === TILE.CARPET) {
          ctx.fillStyle = p.neon;
          ctx.globalAlpha = 0.22;
          for (let k = 4; k < size - 2; k += 5) ctx.fillRect(px + k, py + 4, 1, size - 8);
          ctx.globalAlpha = 1;
        } else if (detail === 0 || detail === 6) {
          ctx.fillStyle = p.neon;
          ctx.globalAlpha = 0.38;
          ctx.fillRect(px + 5, py + 5, 2, 2);
          ctx.fillRect(px + 13, py + 13, 2, 2);
          ctx.globalAlpha = 1;
        }
      }
    }

    // A restrained moving scanline preserves the retro console look without obscuring play.
    const scanY = (time * 0.018) % (this.height * size);
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    ctx.fillRect(0, scanY, this.width * size, 2);
  }
}
