export const TILE = { FLOOR: 0, WALL: 1, CARPET: 2, METAL: 3, MACHINERY: 4 };

export class TileMap {
  constructor(grid, tileSize = 20) {
    this.grid = grid;
    this.tileSize = tileSize;
    this.height = grid.length;
    this.width = grid[0].length;
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
    ctx.fillStyle = '#050f19';
    ctx.fillRect(0, 0, this.width * size, this.height * size);

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.grid[y][x];
        const px = x * size;
        const py = y * size;
        const detail = (x * 17 + y * 31) % 11;

        if (tile === TILE.WALL) {
          ctx.fillStyle = '#142b3a';
          ctx.fillRect(px, py, size, size);
          ctx.fillStyle = '#2a4b5d';
          ctx.fillRect(px + 1, py + 1, size - 2, 2);
          ctx.fillStyle = '#0a1925';
          ctx.fillRect(px + 2, py + 5, size - 4, size - 7);
          ctx.fillStyle = 'rgba(81,137,153,.12)';
          ctx.fillRect(px + 3, py + 7, size - 6, 1);
          if (detail < 3) {
            ctx.fillStyle = '#35576a';
            ctx.fillRect(px + 4, py + 12, 2, 2);
            ctx.fillRect(px + 14, py + 12, 2, 2);
          }
          if ((x + y) % 5 === 0) {
            ctx.fillStyle = 'rgba(85,226,220,.12)';
            ctx.fillRect(px + 4, py + 16, size - 8, 1);
          }
          continue;
        }

        const floorColor = tile === TILE.CARPET ? '#142b35'
          : tile === TILE.METAL ? '#1a303c'
            : tile === TILE.MACHINERY ? '#192d37' : '#0c1d2a';
        ctx.fillStyle = floorColor;
        ctx.fillRect(px, py, size, size);
        ctx.strokeStyle = 'rgba(62,105,122,.26)';
        ctx.lineWidth = 0.65;
        ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);

        if (tile === TILE.METAL) {
          ctx.fillStyle = 'rgba(105,160,177,.18)';
          ctx.fillRect(px + 3, py + 3, size - 6, 1);
          ctx.fillRect(px + 3, py + size - 4, size - 6, 1);
          ctx.fillStyle = '#486777';
          ctx.fillRect(px + 3, py + 3, 2, 2);
          ctx.fillRect(px + size - 5, py + 3, 2, 2);
          ctx.fillRect(px + 3, py + size - 5, 2, 2);
          ctx.fillRect(px + size - 5, py + size - 5, 2, 2);
        } else if (tile === TILE.MACHINERY) {
          const glow = 0.2 + 0.1 * Math.sin(time / 210 + x * 0.7 + y);
          ctx.fillStyle = 'rgba(242,182,93,' + glow + ')';
          ctx.fillRect(px + 5, py + 5, 10, 10);
          ctx.fillStyle = 'rgba(255,219,157,.32)';
          ctx.fillRect(px + 7, py + 7, 6, 1);
          ctx.fillRect(px + 7, py + 10, 4, 1);
        } else if (tile === TILE.CARPET) {
          ctx.fillStyle = 'rgba(85,226,220,.13)';
          for (let k = 4; k < size - 2; k += 5) ctx.fillRect(px + k, py + 4, 1, size - 8);
        } else if (detail === 0 || detail === 6) {
          ctx.fillStyle = 'rgba(85,226,220,.13)';
          ctx.fillRect(px + 5, py + 5, 2, 2);
          ctx.fillRect(px + 13, py + 13, 2, 2);
        }
      }
    }

    // A restrained moving scan passes over the facility without obscuring navigation.
    const scanY = (time * 0.018) % (this.height * size);
    ctx.fillStyle = 'rgba(85,226,220,.035)';
    ctx.fillRect(0, scanY, this.width * size, 2);
  }
}
