# DEAD FREQUENCY — Game Design Document

**Tagline:** The city hears everything. Make it hear the wrong thing.  
**Genre:** Top-down stealth / tactical arcade / extraction  
**Platform:** Desktop browser  
**Visual identity:** 16-bit-inspired pixel art, dark navy industrial spaces, cyan player tech, amber suspicion and red detection.

## High concept

In 2094, an automated surveillance network called THE QUIET monitors movement, sound and communication across a sprawling city. Ghost, a signal infiltrator, must recover three encrypted memory fragments from restricted facilities and escape. The defining mechanic is sound manipulation: footsteps and interactions create noise, signal decoys create false points of interest, and the network gradually becomes skeptical of repeated distractions.

## Design pillars

1. **Sound is gameplay:** sound changes enemy decisions, not just the audio mix.
2. **Readable stealth:** players can understand why a guard became suspicious.
3. **Player creativity:** there are multiple ways to solve an encounter.
4. **Short replayable missions:** compact levels with immediate retries.
5. **Polished simplicity:** mechanics should be understandable and testable.

## Core loop

**Observe → Manipulate → Infiltrate → Recover → Escape → Debrief**

Observe patrols, surfaces and security devices. Manipulate them with decoys or a jammer. Infiltrate the facility. Hold interact near the terminal to recover the memory fragment. Reach extraction and hold interact again. Review score, time and stealth rank.

## Player controls and abilities

- WASD / arrow keys: move.
- Shift: sprint; movement is faster but louder.
- C: crouch; movement is slower and suppresses movement noise.
- E: deploy a limited signal decoy ahead of the player.
- Q: activate a limited jammer charge; temporarily disrupt cameras and mask player movement noise.
- F: hold to hack a terminal or complete extraction.
- Escape: pause / resume.

## Sound propagation

Noise events contain an origin, intensity, category, duration and a precomputed tile-grid sound field. Propagation uses weighted grid traversal. Concrete walls block sound. Carpet attenuates strongly. Metal transmits sound with lower attenuation. Machinery has intermediate attenuation and can be used as environmental cover. Guards investigate only when sound at their tile exceeds their hearing threshold.

The implementation calculates a field when a noise event is emitted; it does not run propagation every animation frame.

## Echo Memory

Each guard records recent decoy locations for a short time window. Repeated use of the same location increases that guard's skepticism, making the next repeated decoy less reliable. This is a lightweight deterministic game-system concept; it is not an LLM or a trained model. The current prototype uses a probabilistic response for repeated patterns and requires playtesting for fairness.

## Enemy archetypes

| Archetype | Strength | Weakness |
|---|---|---|
| Patrol Guard | Balanced vision and hearing | Predictable route |
| Listener | Sensitive hearing | Shorter vision range |
| Warden | Stronger detection and pattern skepticism | Can still be evaded through line-of-sight breaks and route choices |

States: PATROL, SUSPICIOUS, INVESTIGATE, SEARCH, CHASE, RETURN and DISABLED. Enemies use line-of-sight, hearing fields and grid pathfinding. They should pursue the last known player position after losing sight rather than tracking the player's live coordinates through walls.

## Missions

### 01 — Dead Channel

A maintenance corridor introduces movement, noise, one patrol guard, a metal-floor strip, terminal hacking and extraction. Expected playtime: 2–3 minutes.

### 02 — The Silent Market

An underground commercial district introduces multiple guards, a Listener, cameras, mixed acoustic surfaces, jammer use and alternate routes. Expected playtime: 3–4 minutes.

### 03 — Antenna Zero

The central surveillance tower combines patrol guards, a Listener, a Warden, cameras, limited jammer resources and the final extraction. Expected playtime: 4–5 minutes.

## Scoring

- Main objective completed: 500.
- Optional data cache: 100 (planned extension).
- No detection: 500 bonus.
- No full security alarm: 250 bonus.
- Successful extraction: 250.

Ranks: GHOST, OPERATOR and EXPOSED. Personal-best scores and unlocked mission progress are saved in localStorage.

## Technical direction

HTML5 Canvas 2D at a logical 640×360 resolution, vanilla JavaScript ES modules, CSS interface, weighted grid sound propagation, finite-state-machine enemy logic, A* pathfinding, Web Audio API sound synthesis and localStorage persistence. The build has no required GPU, local model, paid API, Docker or game-engine installation.

## Definition of done

- Game loads in a normal desktop browser over HTTP(S).
- Core movement and collision are responsive.
- Sound visibly propagates and changes guard decisions.
- Decoy and jammer have meaningful, bounded uses.
- All published missions can be completed.
- Extraction, failure, restart and debrief work.
- The game remains readable at desktop and smaller browser widths.
- No critical progression or console errors remain.
- Public deployment is tested from a clean browser session.