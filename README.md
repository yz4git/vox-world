# VOX WORLD — Voxel Veil Prototype

A browser-based voxel exploration adventure prototype focused on **distance-dependent detail (LOD)**, observation, item discovery, and environmental puzzles.

## Prototype flow

1. Start on the White Grass Hill.
2. Walk toward the tilted Observation Tower.
3. Inspect three clue sites: fallen tree, stone statue, and dry spring.
4. Reach the tower annex and obtain the **Observation Lens**.
5. Revisit the clue sites with the lens to reveal deeper information.
6. Return to the tower door and solve the symbol order puzzle.

There is intentionally **no crafting, mining, building, or combat** in this prototype.

## Controls

### Desktop
- Move: WASD / Arrow keys
- Look: drag mouse
- Interact: E / Space
- Observation Lens: Q

### iPhone / touch
- Move: left virtual stick
- Look: drag the right side of the screen
- Interact: ACTION button
- Observation Lens: LENS button

## Run

This is a static Three.js prototype. Serve the repository over HTTP, for example with any static server, or publish the repository root with GitHub Pages.

## Design target

The visual rule is:

- Far distance: very coarse voxel silhouettes
- Mid distance: Minecraft-scale blocks
- Near distance: ~10x finer visible detail
- Very near distance: ~100x detail used selectively for clues and inscriptions

The prototype simulates this using layered LOD meshes rather than storing the whole world at 1 cm voxel resolution.
