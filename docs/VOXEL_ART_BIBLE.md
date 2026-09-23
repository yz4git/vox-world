# VOX WORLD — Voxel Art Bible

## Core rule

LOD is not surface subdivision.

As the player gets closer, the model must gain **meaningful form**:
- silhouette changes
- secondary masses appear
- depth and overlap increase
- structural hierarchy becomes readable

Avoid replacing a coarse model with the same silhouette covered in tiny voxels.

## Visual priorities

1. Silhouette
2. Large masses
3. Depth / overlap
4. Mid-scale structure
5. Controlled palette
6. Small detail

Small detail must never compensate for weak large shapes.

## Trees

### FAR
- thick trunk
- 2–3 large crown masses
- broad readable silhouette
- visible root flare at the base

### MID
- trunk keeps its weight
- crown separates into several large clumps
- 2–4 primary branches become readable
- canopy must still read as one healthy crown from a distance

### NEAR
- thick primary branches
- secondary crown masses
- clear gaps between foliage groups
- branches travel upward and outward
- roots visibly enter the ground

### EXTREME CLOSE
- secondary branches
- a small amount of tertiary branching
- smaller foliage clusters
- color variation stays grouped, not random
- never turn the tree into thin wires

Tree proportions:
- thickest at the base
- taper gradually upward/outward
- branch hierarchy: trunk > primary > secondary > twig
- foliage mass must remain proportional to trunk/branch weight

## Ground

Ground should remain visually broad.

Do:
- meter-scale shelves
- broad grass / dirt / moss patches
- gentle stepped elevation
- paths with large readable shapes

Avoid:
- centimeter-scale bumps
- evenly scattered tiny blocks
- noisy checkerboard coloring
- "sandpaper" surface detail

Close-range ground detail should reveal **larger soil shelves and material regions**, not micro roughness.

## Rocks / cliffs

Build geology as layers and directional forms.

### FAR
- few large stacked masses
- strong silhouette

### MID
- separate major rock masses
- large shelves / ledges
- one or two material bands

### NEAR
- overhangs
- split ridges
- vertical rock faces
- coherent light/dark regions
- moss/soil caps

### EXTREME CLOSE
- smaller outcrops
- cracks represented as missing/notched geometry
- supporting rock columns
- a few sharp ledges

Avoid uniform random noise across the entire rock face.

## Architecture

Order of importance:
1. overall tower / building mass
2. secondary towers and roofs
3. wall depth
4. arches / portals / buttresses / stairs
5. battlements and structural accents
6. small ornament

Use recessed and projecting forms rather than covering flat walls in tiny voxels.

Palette should use a small family:
- structural dark stone
- body stone
- lighter edge stone
- one weathered/warm stone
- moss/vegetation accent
- rare gold/glow gameplay accent

Do not spread accent colors randomly.

## Negative space

Good voxel forms need empty space:
- gaps in tree canopy
- recesses around doors/windows
- notches in rock silhouettes
- gaps between architectural masses

Detail should frame important shapes, not cover everything.

## LOD transition rule

Each closer LOD should preserve the identity of the previous level while adding form hierarchy.

FAR -> MID:
- split one big mass into several meaningful masses

MID -> NEAR:
- reveal structural relationships and depth

NEAR -> EXTREME CLOSE:
- add secondary structure, not visual noise

The closest LOD must look richer and more believable, never thinner or more fragile.

## References distilled

This guide follows recurring Minecraft-builder principles:
- plan large form before details
- use depth instead of flat surface decoration
- keep palettes coherent
- avoid over-detailing
- use asymmetry and grouped variation for organic forms
- tree trunks and branches taper hierarchically
- foliage is built as separated clumps with air gaps
- terrain uses broad flows, shelves, and directional shading rather than uniform random noise
