const W = 32;
const H = 18;
function base() {
  return Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => x === 0 || y === 0 || x === W - 1 || y === H - 1 ? 1 : 0)
  );
}
function rect(grid, x, y, width, height, tile = 1) {
  for (let yy = y; yy < y + height; yy++) for (let xx = x; xx < x + width; xx++) {
    if (grid[yy] && grid[yy][xx] !== undefined) grid[yy][xx] = tile;
  }
}
export const SIDE_QUEST = {
  id: 4,
  isSideQuest: true,
  name: 'DUST AND STATIC',
  subtitle: 'THE SHATTERBELT // VALTHORNE FRINGE',
  objective: 'HARVEST THREE GLASSITE CORES',
  briefing: 'NIX // A signal storm exposed a Glassite seam in the Shatterbelt. The Rook Scavengers are already there. Dune Stalkers hunt by vibration. Bring me three cores before the storm buries the route.',
  palette: {
    background: '#322b35', wall: '#514348', wallTop: '#a77b60', wallShadow: '#29232d',
    floor: '#55433a', carpet: '#76553d', metal: '#7d7662', machinery: '#b17b42',
    neon: '#7df1df', detail: '#efb76a'
  },
  start: { x: 3.5, y: 15.5 },
  terminal: { x: 15.5, y: 9.5 },
  extraction: { x: 28.5, y: 15.5 },
  terminalHackTime: 1,
  extractionTime: 2.6,
  decoys: 3,
  jammers: 1,
  pacing: { initialStage: 1, initialLabel: 'THE SHATTERBELT', initialGuards: 4, initialCameras: 0, waves: [] },
  relays: [],
  minerals: [
    { id: 'west-seam', x: 6.5, y: 4.5, label: 'WEST GLASSITE SEAM' },
    { id: 'upper-seam', x: 18.5, y: 3.5, label: 'UPPER GLASSITE SEAM' },
    { id: 'east-seam', x: 27.5, y: 11.5, label: 'EAST GLASSITE SEAM' }
  ],
  scavengerCache: { x: 15.5, y: 9.5, label: 'ROOK SURVEY LEDGER' },
  guards: [
    { type: 'stalker', x: 9.5, y: 5.5, route: [{ x: 8.5, y: 5.5 }, { x: 12.5, y: 5.5 }], speed: 39, visionRange: 94, hearingThreshold: 6, fov: 1.18 },
    { type: 'stalker', x: 24.5, y: 11.5, route: [{ x: 23.5, y: 11.5 }, { x: 28, y: 12.5 }], speed: 43, visionRange: 102, hearingThreshold: 6, fov: 1.35 },
    { type: 'scavenger', x: 13.5, y: 9.5, route: [{ x: 13.5, y: 8.5 }, { x: 17.5, y: 9.5 }], speed: 42, visionRange: 116, hearingThreshold: 11, fov: 0.78 },
    { type: 'scavenger', x: 18.5, y: 12.5, route: [{ x: 17.5, y: 11.5 }, { x: 20.5, y: 13.5 }], speed: 44, visionRange: 112, hearingThreshold: 11, fov: 0.82 }
  ],
  cameras: [],
  rewardOptions: [
    { id: 'signal-lens', title: 'TRADE TO NIX // SIGNAL LENS', detail: 'Nix refines the Glassite into a jammer lens. Gain +1 jammer charge on every campaign operation.' },
    { id: 'echo-spool', title: 'GIVE IT TO MARA // ECHO SPOOL', detail: 'Mara turns it into a resonance spool. Gain +1 decoy charge on every campaign operation.' },
    { id: 'keep-core', title: 'KEEP THE LAST CORE // PRIVATE PAYOUT', detail: 'Fence the sample through the Ash Quarter. Gain 650 contract points, but no campaign gear upgrade.' }
  ],
  makeMap() {
    const grid = base();
    rect(grid, 10, 3, 1, 5, 1);
    rect(grid, 15, 2, 1, 4, 1);
    rect(grid, 21, 7, 4, 1, 1);
    rect(grid, 9, 11, 3, 1, 1);
    rect(grid, 14, 14, 4, 1, 1);
    rect(grid, 25, 4, 1, 3, 1);
    rect(grid, 4, 8, 3, 1, 2);
    rect(grid, 18, 6, 3, 1, 3);
    rect(grid, 22, 14, 3, 1, 2);
    rect(grid, 5, 13, 3, 1, 3);
    return grid;
  }
};
export function getSideQuestLoadoutBonus(savedQuest, missionId) {
  const bonus = { extraDecoys: 0, extraJammers: 0 };
  if (!savedQuest?.completed) return bonus;
  if (savedQuest.reward === 'signal-lens') bonus.extraJammers += 1;
  if (savedQuest.reward === 'echo-spool') bonus.extraDecoys += 1;
  if (savedQuest.surveyRecovered && missionId === 3) {
    if (savedQuest.reward === 'signal-lens') bonus.extraDecoys += 1;
    if (savedQuest.reward === 'echo-spool') bonus.extraJammers += 1;
  }
  return bonus;
}