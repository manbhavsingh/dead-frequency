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

- **Multi-stage objectives:** disable 1, 2, then 3 security relays across the three missions before the memory terminal unlocks.
- **Risky interactions:** relay bypasses, terminal downloads, and extraction require holding position; each hack emits a noise trace and slowly raises the network alert.
- **Listen and manipulate:** noise propagates through the tile map; concrete walls block it, carpet dampens it, and metal floors transmit it farther.
- **Decoy:** creates a false sound origin that guards can investigate; repeating the same throw location makes guards skeptical.
- **Enemy AI:** patrol guards, listeners and a warden use finite-state machines, faster pursuit, line-of-sight, hearing thresholds and grid pathfinding.
- **Surveillance:** camera cones sweep across rooms; crouching reduces visibility and sound, while sprinting makes the player easier to detect.
- **Jammer:** temporarily blinds cameras and masks player movement noise. Charges are limited, so use them to cross exposed lanes or finish a hack.

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
