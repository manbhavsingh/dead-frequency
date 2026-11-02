const W = 32;
const H = 18;

function base() {
  return Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) =>
      x === 0 || y === 0 || x === W - 1 || y === H - 1 ? 1 : 0
    )
  );
}

function rect(grid, x, y, width, height, tile = 1) {
  for (let y2 = y; y2 < y + height; y2++) {
    for (let x2 = x; x2 < x + width; x2++) {
      if (grid[y2] && grid[y2][x2] !== undefined) grid[y2][x2] = tile;
    }
  }
}

function line(grid, x1, y1, x2, y2, tile = 1) {
  if (x1 === x2) {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) grid[y][x1] = tile;
  } else if (y1 === y2) {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) grid[y1][x] = tile;
  }
}

export const LEVELS = [
  {
    id: 1,
    name: 'DEAD CHANNEL',
    subtitle: 'MAINTENANCE SECTOR // LOWER GRID',
    objective: 'DISABLE THE SECURITY RELAY',
    palette: { background: '#101a35', wall: '#293d63', wallTop: '#657ba5', wallShadow: '#16233f', floor: '#1b2e4b', carpet: '#24525b', metal: '#287b86', machinery: '#be793b', neon: '#63eadb', detail: '#e2b36c' },
    start: { x: 3.5, y: 14.5 },
    terminal: { x: 25.5, y: 4.5 },
    extraction: { x: 28.5, y: 14.5 },
    terminalHackTime: 3.2,
    extractionTime: 2.2,
    decoys: 3,
    jammers: 0,
    pacing: {
      initialStage: 1,
      initialLabel: 'READ THE PATROL',
      initialGuards: 1,
      initialCameras: 0,
      waves: [
        {
          afterRelays: 1,
          stage: 2,
          label: 'FALSE ECHO',
          restSeconds: 3.5,
          restMessage: 'MAINTENANCE SILENCE — REPOSITION BEFORE THE NEXT SWEEP',
          releaseMessage: 'JAMMER UNLOCKED — LISTENER ONLINE. Q BLINDS THE CAMERA GRID.',
          grantJammers: 1,
          guards: [1],
          cameras: [0, 1]
        }
      ]
    },
    relays: [
      { x: 4.5, y: 8.5, hackTime: 2.1 }
    ],
    guards: [
      { type: 'patrol', x: 14.5, y: 9.5, route: [{ x: 11.5, y: 9.5 }, { x: 20.5, y: 9.5 }] },
      { type: 'listener', x: 25.5, y: 11.5, route: [{ x: 24.5, y: 11.5 }, { x: 28.5, y: 13.5 }] }
    ],
    cameras: [
      { x: 23.5, y: 3.5, dir: Math.PI / 2, sweep: 0.5, phase: 0.2 },
      { x: 12.5, y: 12.5, dir: 0, sweep: 0.38, phase: 1.8 }
    ],
    makeMap() {
      const grid = base();
      rect(grid, 7, 3, 1, 8);
      rect(grid, 7, 3, 9, 1);
      rect(grid, 15, 3, 1, 5);
      rect(grid, 20, 7, 1, 8);
      rect(grid, 20, 7, 8, 1);
      rect(grid, 11, 13, 10, 1);
      rect(grid, 26, 8, 1, 4);
      rect(grid, 3, 5, 2, 1, 2);
      rect(grid, 9, 5, 3, 1, 3);
      rect(grid, 12, 10, 4, 1, 3);
      rect(grid, 22, 11, 4, 1, 2);
      rect(grid, 24, 13, 3, 1, 3);
      line(grid, 8, 8, 10, 8, 4);
      return grid;
    }
  },
  {
    id: 2,
    name: 'THE SILENT MARKET',
    subtitle: 'UNDERCITY // COMMERCIAL DISTRICT',
    objective: 'DISABLE TWO SECURITY RELAYS',
    palette: { background: '#16213a', wall: '#344960', wallTop: '#bd7c8b', wallShadow: '#1d3047', floor: '#243d4e', carpet: '#326255', metal: '#35858a', machinery: '#d77b5e', neon: '#68f0c8', detail: '#f0c27a' },
    start: { x: 3.5, y: 14.5 },
    terminal: { x: 26.5, y: 3.5 },
    extraction: { x: 28.5, y: 14.5 },
    terminalHackTime: 3.7,
    extractionTime: 2.5,
    decoys: 4,
    jammers: 2,
    pacing: {
      initialStage: 3,
      initialLabel: 'READ THE CROWD',
      initialGuards: 2,
      initialCameras: 1,
      waves: [
        {
          afterRelays: 1,
          stage: 4,
          label: 'CROSSING SIGNALS',
          restSeconds: 5,
          restMessage: 'MARKET RELAY DOWN — MAINTENANCE SILENCE. PLAN YOUR CROSSING.',
          releaseMessage: 'MARKET SECURITY REDEPLOYED — MULTIPLE SIGNALS IN PLAY.',
          guards: [2],
          cameras: [1, 2]
        }
      ]
    },
    relays: [
      { x: 3.5, y: 9.5, hackTime: 2.3 },
      { x: 28.5, y: 13.5, hackTime: 2.5 }
    ],
    guards: [
      { type: 'patrol', x: 12.5, y: 7.5, route: [{ x: 10.5, y: 7.5 }, { x: 18.5, y: 7.5 }] },
      { type: 'listener', x: 23.5, y: 12.5, route: [{ x: 23.5, y: 12.5 }, { x: 17.5, y: 12.5 }] },
      { type: 'patrol', x: 5.5, y: 7.5, route: [{ x: 4.5, y: 5.5 }, { x: 4.5, y: 10.5 }] }
    ],
    cameras: [
      { x: 7.5, y: 4.5, dir: Math.PI / 2, sweep: 0.42, phase: 0.4 },
      { x: 25.5, y: 9.5, dir: Math.PI, sweep: 0.48, phase: 1.2 },
      { x: 16.5, y: 8.5, dir: Math.PI / 2, sweep: 0.34, phase: 2.1 }
    ],
    makeMap() {
      const grid = base();
      rect(grid, 6, 2, 1, 12);
      rect(grid, 6, 2, 9, 1);
      rect(grid, 14, 2, 1, 5);
      rect(grid, 20, 5, 1, 11);
      rect(grid, 20, 5, 9, 1);
      rect(grid, 10, 11, 11, 1);
      rect(grid, 10, 11, 1, 4);
      rect(grid, 25, 8, 1, 5);
      rect(grid, 3, 5, 2, 2, 2);
      rect(grid, 8, 4, 4, 1, 3);
      rect(grid, 12, 8, 5, 1, 2);
      rect(grid, 16, 13, 3, 1, 4);
      rect(grid, 22, 7, 5, 1, 3);
      rect(grid, 23, 14, 4, 1, 2);
      return grid;
    }
  },
  {
    id: 3,
    name: 'ANTENNA ZERO',
    subtitle: 'CENTRAL TOWER // CORE ACCESS',
    objective: 'DISABLE THREE SECURITY RELAYS',
    palette: { background: '#1b1538', wall: '#413163', wallTop: '#8d6ab4', wallShadow: '#241d46', floor: '#30244e', carpet: '#514067', metal: '#65508e', machinery: '#d35e79', neon: '#84dcff', detail: '#f3a177' },
    start: { x: 3.5, y: 14.5 },
    terminal: { x: 25.5, y: 3.5 },
    extraction: { x: 28.5, y: 14.5 },
    terminalHackTime: 4.2,
    extractionTime: 2.8,
    decoys: 4,
    jammers: 2,
    pacing: {
      initialStage: 5,
      initialLabel: 'FINAL APPROACH',
      initialGuards: 2,
      initialCameras: 2,
      waves: [
        {
          afterRelays: 2,
          stage: 6,
          label: 'THE CHORUS',
          restSeconds: 6,
          restMessage: 'TOWER RELAYS 02/03 — SIX SECONDS OF MAINTENANCE SILENCE.',
          releaseMessage: 'WARDEN ONLINE — THE FINAL SECURITY LAYER IS ACTIVE.',
          guards: [2, 3],
          cameras: [2, 3]
        }
      ]
    },
    relays: [
      { x: 3.5, y: 9.5, hackTime: 2.4 },
      { x: 28.5, y: 13.5, hackTime: 2.7 },
      { x: 16.5, y: 15.5, hackTime: 2.8 }
    ],
    guards: [
      { type: 'patrol', x: 12.5, y: 5.5, route: [{ x: 10.5, y: 5.5 }, { x: 18.5, y: 5.5 }] },
      { type: 'listener', x: 23.5, y: 11.5, route: [{ x: 23.5, y: 11.5 }, { x: 17.5, y: 11.5 }] },
      { type: 'warden', x: 16.5, y: 14.5, route: [{ x: 13.5, y: 14.5 }, { x: 21.5, y: 14.5 }] },
      { type: 'patrol', x: 4.5, y: 11.5, route: [{ x: 3.5, y: 8.5 }, { x: 4.5, y: 12.5 }] }
    ],
    cameras: [
      { x: 8.5, y: 3.5, dir: Math.PI / 2, sweep: 0.48, phase: 0.3 },
      { x: 24.5, y: 7.5, dir: Math.PI / 2, sweep: 0.42, phase: 1.1 },
      { x: 14.5, y: 12.5, dir: Math.PI, sweep: 0.56, phase: 1.9 },
      { x: 28.5, y: 3.5, dir: Math.PI / 2, sweep: 0.38, phase: 2.6 }
    ],
    makeMap() {
      const grid = base();
      rect(grid, 6, 2, 1, 12);
      rect(grid, 6, 2, 9, 1);
      rect(grid, 14, 2, 1, 6);
      rect(grid, 20, 4, 1, 12);
      rect(grid, 20, 4, 9, 1);
      rect(grid, 9, 10, 12, 1);
      rect(grid, 9, 10, 1, 5);
      rect(grid, 25, 8, 1, 5);
      rect(grid, 3, 5, 2, 1, 2);
      rect(grid, 8, 4, 4, 1, 3);
      rect(grid, 11, 7, 3, 1, 4);
      rect(grid, 16, 7, 3, 1, 2);
      rect(grid, 22, 6, 5, 1, 3);
      rect(grid, 12, 14, 8, 1, 3);
      rect(grid, 23, 14, 4, 1, 2);
      return grid;
    }
  }
];
