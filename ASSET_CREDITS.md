# Asset credits and provenance

## Current prototype

- Environment tiles, player, guards, camera indicators, decoys, sound ripples and menu artwork are drawn procedurally with Canvas and CSS by the project code. There are no imported third-party game sprites in this initial build.
- Sound effects are synthesized at runtime using the browser Web Audio API. No external audio recordings are currently bundled.
- Typography requests IBM Plex Mono and Space Grotesk from Google Fonts, with system fallbacks. If the game is distributed offline or without network access, replace these with locally licensed font files or remove the external font request.

## Submission rule

Before release, list the origin, author, license and modifications for every third-party asset. For generated assets, record the generation tool and retain source outputs where practical. Do not include copyrighted characters, unlicensed music, commercial game sprites or assets whose license is unclear.