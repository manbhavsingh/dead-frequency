# DEAD FREQUENCY

> **The city hears everything. Make it hear the wrong thing.**

DEAD FREQUENCY is an original top-down pixel-art stealth extraction browser game. Infiltrate a surveillance-controlled city, manipulate enemy hearing with signal decoys, recover encrypted memory fragments and escape before the network identifies you.

**Status:** Early playable prototype (v0.1.0)  
**Platform:** Desktop browser  
**Engine:** HTML5 Canvas 2D + vanilla JavaScript ES modules  
**Competition:** Loadout AI Game Competition (November 2026)

## Play locally

No build step or npm install is required. With Python 3 installed:

```bash
python3 -m http.server 4173
```

Open <http://localhost:4173> in a desktop browser. ES modules require a local HTTP server; opening `index.html` directly with `file://` is not supported.

Alternatively, use any static file server. The repository is designed for GitHub Pages deployment from the root directory.

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

- **Listen and manipulate:** noise propagates through the tile map; concrete walls block it, carpet dampens it, and metal floors transmit it farther.
- **Decoy:** creates a false sound origin that guards can investigate.
- **Enemy AI:** patrol guards, listeners and a warden use finite-state machines, hearing thresholds, line-of-sight and grid pathfinding.
- **Echo Memory:** guards remember repeated decoy locations and may become skeptical of reused distractions.
- **Jammer:** temporarily disrupts camera detection and masks player movement noise.
- **Missions:** Dead Channel, The Silent Market and Antenna Zero.

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
 tests/        Node.js built-in tests
```

## Development checks

Requires Node.js 18+ for the built-in test runner (no project dependencies):

```bash
npm test
npm run check
```

## Current limitations

This is an initial playable implementation, not a finished commercial game. The current build uses procedural Canvas-drawn visuals and synthesized tones rather than a full custom sprite/audio pack. The three mission layouts and AI behaviours require hands-on playtesting and balancing. The Warden coordination and adaptive-decoy behaviour are intentionally lightweight and should be refined after the core experience is verified in a browser.

## Competition submission

Read [SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md), [AI_USAGE.md](AI_USAGE.md), and [ASSET_CREDITS.md](ASSET_CREDITS.md) before submitting. Do not claim public deployment, completed testing, or gameplay footage that has not actually been verified.