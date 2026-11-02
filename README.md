# DEAD FREQUENCY

> **The city hears everything. Make it hear the wrong thing.**

DEAD FREQUENCY is an original top-down pixel-art stealth extraction browser game. Infiltrate a surveillance-controlled city, manipulate enemy hearing with signal decoys, recover encrypted memory fragments and escape before the network identifies you.

**Status:** Playable prototype with multi-stage mission objectives (v0.2.0)  
**Live demo:** [Play DEAD FREQUENCY](https://manbhavsingh.github.io/dead-frequency/)  
**Platform:** Desktop browser  
**Engine:** HTML5 Canvas 2D + vanilla JavaScript ES modules  
**Competition:** Loadout AI Game Competition (November 2026)

## Play online

[https://manbhavsingh.github.io/dead-frequency/](https://manbhavsingh.github.io/dead-frequency/)

The game is hosted on GitHub Pages. Each push to `main` runs the automated tests and JavaScript syntax checks before deploying the static site.

## Play locally

No build step or npm install is required. With Python 3 installed:

```bash
python3 -m http.server 4173
```

Open <http://localhost:4173> in a desktop browser. ES modules require a local HTTP server; opening `index.html` directly with `file://` is not supported.

Alternatively, use any static file server.

## Controls

| Key | Action |
|---|---|
| WASD / Arrow keys | Move |
| Shift | Sprint (louder) |
| C | Crouch (quieter) |
| E | Deploy a signal decoy |
| Q | Activate the signal jammer |
| F | Hold to hack a terminal or extract |
| Esc | Pause / resume |

## Gameplay

- **Six-stage campaign curve:** learn one patrol and decoys; earn the jammer after the first relay; combine guards and acoustic surfaces; face staggered camera/guard reinforcements; then confront The Chorus during the final escape.
- **Earned rest beats:** relay outages create 3.5-, 5- and 6-second maintenance-silence windows. Cameras go dark and active guards reset to patrol before the next wave arrives.
- **Multi-stage objectives:** disable 1, 2, then 3 security relays across the three missions before the memory terminal unlocks.
- **Risky interactions:** relay bypasses, terminal downloads, and extraction require holding position; each hack emits a noise trace and slowly raises the network alert.
- **Listen and manipulate:** noise propagates through the tile map; concrete walls block it, carpet dampens it, and metal floors transmit it farther.
- **Decoy:** creates a false sound origin that guards can investigate; repeating the same throw location makes guards skeptical.
- **Enemy AI:** patrol guards, listeners and a warden use finite-state machines, faster pursuit, line-of-sight, hearing thresholds and grid pathfinding.
- **Surveillance:** camera cones sweep across rooms; crouching reduces visibility and sound, while sprinting makes the player easier to detect.
- **Jammer:** first unlocked after the Dead Channel relay, then included in later mission loadouts. It temporarily blinds cameras and masks player movement noise. Charges are limited, so use them to cross exposed lanes or finish a hack.
- **Ghost's operative dossier:** read Kael Veyrin's Ash Quarter origins, Lucien Blackthorn's betrayal, the Burning Archive incident, and his search for the Crown of Whispers from the main menu or Field Manual.
- **Optional side contract — Dust and Static:** travel to the Shatterbelt, harvest three Glassite cores while evading Dune Stalkers and Rook Scavengers, and optionally steal the Rook survey ledger. The extraction choice grants a persistent jammer or decoy upgrade to later campaign operations, or an immediate score payout.
- **Player-driven story:** decisions at relays and the archive change later equipment, alert pressure and camera coverage.
- **Remembering factions:** Residents, Switchboard and Quiet-Net track your decisions; Mara and Nix respond to what happened in earlier missions.
- **Living environment:** diegetic console messages and wall inscriptions change with your choices, diversions and detection history.
- **Journey-based endings:** five possible epilogues use the full run's faction trust, character memories, diversions, detections and peak alert—not only the last decision.
- **Campaign finale:** the last extraction gets a distinct epilogue that reflects the three-sector journey and The Chorus pursuit.

## Project structure

```text
src/
  ai/          Guard state machine and A* pathfinding
  audio/       Web Audio synthesizer
  core/        Keyboard input
  data/        Mission data and save manager
  entities/    Player, guards and decoys
  systems/     Game loop, noise, security and mission systems
  ui/          HUD
  world/       Tile map and acoustic propagation
tests/         Node.js built-in tests
```

## Development checks

Requires Node.js 18+ for the built-in test runner (no project dependencies):

```bash
npm test
npm run check
```

GitHub Actions runs both commands before each Pages deployment.

## Current limitations

This is an initial playable implementation, not a finished commercial game. The current build uses procedural Canvas-drawn visuals and synthesized tones rather than a full custom sprite/audio pack. Mission difficulty and guard pressure have been increased, but the complete three-mission campaign still needs hands-on balance testing on different browsers and play styles.

## Competition submission

Read [SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md), [AI_USAGE.md](AI_USAGE.md), and [ASSET_CREDITS.md](ASSET_CREDITS.md) before submitting. Record real playtesting findings and genuine gameplay footage; do not invent metrics or player statistics.
