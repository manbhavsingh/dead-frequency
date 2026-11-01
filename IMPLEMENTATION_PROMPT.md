# Master implementation prompt

Act as a senior indie game developer, gameplay engineer, pixel-art game designer, AI systems programmer and QA engineer. Build the actual DEAD FREQUENCY browser game described in [GDD.md](GDD.md). Do not return only a plan or mockup.

## Project constraints

Target hardware: 2017 Intel MacBook Air, dual-core Core i5, 8 GB RAM, Intel HD Graphics 6000, macOS Monterey 12.7.6. Use HTML5 Canvas 2D, vanilla JavaScript ES modules, HTML/CSS, browser-native APIs and static hosting. No Unity, Unreal, Docker, local LLM, GPU compute, paid API or always-running background process. Avoid heavy dependencies.

## Game objective

Create a top-down pixel-art stealth extraction game. Ghost infiltrates a surveillance-controlled city, manipulates enemy hearing with signal decoys, retrieves encrypted memory fragments and escapes. The hook is sound propagation and the enemy response to false signals.

## Required mechanics

- WASD / arrows move; Shift sprints and creates more noise; C crouches and suppresses footstep noise; E throws a limited decoy; Q activates a limited jammer; hold F to hack/extract; Escape pauses.
- Sound fields are calculated on a tile grid when a noise event occurs. Concrete walls block sound; carpet attenuates; metal carries sound farther; machinery has intermediate attenuation.
- Guards hear only when computed intensity exceeds their archetype threshold. Decoys attract guards to the emitted location rather than to the player.
- Implement PATROL, SUSPICIOUS, INVESTIGATE, SEARCH, CHASE, RETURN and DISABLED states.
- Use line-of-sight and A* pathfinding. When a guard loses sight, it must investigate the last known position rather than track the player's current coordinates.
- Add Echo Memory: guards become skeptical of repeated decoy locations within a short time window. Keep behaviour fair and communicate compromised patterns.
- Add a jammer with limited charges that temporarily disables camera detection and masks player-generated movement noise.
- Implement three levels: Dead Channel, The Silent Market and Antenna Zero. Each level has a terminal, memory fragment, patrol route and extraction point.
- Add win/loss conditions, immediate restart, debrief, scoring, ranks and localStorage best scores.

## Presentation

Use a logical 640×360 render surface and nearest-neighbour scaling. Palette: dark navy, cyan, amber, magenta and red. First establish readable procedural Canvas visuals; polish only after mechanics work. Use original assets or clearly licensed assets. Generate simple sound effects through Web Audio API. Ensure the audio can be muted and is not necessary for comprehension.

## Architecture

Keep input, world/tile map, acoustics, entities, enemy AI, mission control, UI, audio and save data modular. Separate update and rendering. Use requestAnimationFrame with a bounded timestep. Avoid repeated allocations and recalculating paths or sound fields every frame.

## Verification

Write tests with Node.js built-in test runner for collision, sound attenuation, wall blocking, pathfinding, guard hearing, state transitions, detection and mission progression. Run tests and syntax checks after each milestone. Launch the game in an actual browser and verify the interactions; never claim a browser test happened if it did not. Record limitations honestly.

## Milestones

1. Playable movement, collision, camera and tile map.
2. Acoustic propagation, guard vision/hearing and patrol behaviour.
3. Decoys, Echo Memory, jammer and security escalation.
4. Three missions, objectives, extraction, scoring and saves.
5. Pixel-art polish, sound, balancing, public deployment and QA.

Keep a working playable build after every milestone. Prioritize one complete excellent mission over multiple broken missions if time becomes constrained. Do not add wallet, token or cryptocurrency features. Produce README.md, GDD.md, AI_USAGE.md, ASSET_CREDITS.md and SUBMISSION_CHECKLIST.md. Never fabricate test results, metrics, assets, public links or AI capabilities.

Start by inspecting the workspace, then implement the first playable milestone immediately.