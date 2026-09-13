# Differential growth — live

An interactive version of the differential growth algorithm: a closed or open chain of
nodes that pushes itself apart, pulls itself together, and grows by splitting its own
edges until it fills the space available. It began as a batch Python script that took
minutes per image; this runs a step per frame with every parameter live.

| file | what it is |
|---|---|
| `growth-core.js` | the algorithm and the render styles. The only copy of either. |
| `index.html` | the interactive version. Open it directly — no server, no build. |
| `presets.js` | the fifteen examples below, as complete configurations |
| `growth.js` | the command line version: `node growth.js --help` |
| `make-examples.js` | re-renders `examples/` from `presets.js` |

Both front ends load `growth-core.js`, so there is no second implementation to drift out
of step.

---

## The presets

Each is a whole picture — seeds, forces, constraints, drawing and whether the view
follows — and selecting one applies every setting, including the ones it does not
mention, which come from the defaults rather than from whatever was loaded before. They
fall into two kinds.

### Growth and shape

What the simulation itself can do. All six wear the same black body and red edge, so the
only thing differing between them is the form, and any walls are left visible.

| | |
|---|---|
| ![Coral](examples/coral.png) | **Coral** — one circle, left to fill the plane. The baseline the rest depart from. |
| ![Rosette](examples/rosette.png) | **Rosette** — the Coral again at the same budget, with the repulsion radius cut by a third and the edges shortened to match. The radius sets the gap the folds keep from one another, so the same three thousand nodes buy many more and finer arms: they radiate from the centre, forking as they go, and fill a disc with a clean rim rather than sprawling into a few fat lobes. Stopped at the budget, which is what keeps the rim sharp. |
| ![Pinwheel](examples/pinwheel.png) | **Pinwheel** — the Rosette forces from a star instead of a circle, started large so the growth elaborates the outline rather than expanding away from it. The five points do not survive as a silhouette, the rim comes out roughly round; they survive as organisation. Each becomes a domain of arms combed parallel at its own angle, meeting the next along a visible seam. A seed can set the grain of a form long after it has stopped setting its shape. |
| ![Lobes](examples/lobes.png) | **Lobes** — a repulsion radius half again as wide, longer edges, and a budget of six hundred: fat arms with room between them instead of a filled disc. With the pause off, the budget goes in a hundred steps and the next nine hundred are spent pushing those arms apart into an even splay. |
| ![Meander](examples/meander.png) | **Meander** — weak attraction against heavy repulsion with the damping right down. The curve settles slowly and wanders into a labyrinth instead of packing radially. It runs at five steps a frame, since at one it barely moves, and holds a still frame sized for where it ends up: it spreads nearly three times as wide as it is tall. |
| ![Sprawl](examples/sprawl.png) | **Sprawl** — the Meander forces with the budget more than trebled and *Pause when the budget is reached* switched off. Growth still stops at the last node, but the run does not: the curve keeps relaxing into the room it has left and ends only when the settle test says it has stopped moving. It spends the budget at step 9,290 and settles at 12,004, packing the plane far denser than the Meander ever gets. |
| ![Strand](examples/strand.png) | **Strand** — an open seed has two ends, so it meanders rather than closing into a blob. With no inside to fill, only the edge is drawn. |
| ![Twins](examples/twins.png) | **Twins** — a circle and a square four times its size, set well apart, both starting from sixteen corner points. They grow as separate curves that never join, but each pushes the other back where they meet, and the smaller one comes off worse. |
| ![Tracings](examples/tracings.png) | **Tracings** — two outlines drawn by hand and set side by side. A traced seed keeps the place and size it was drawn at, so the pair grows exactly where it was put, each pressing on the other where they meet. The pause at the budget is off: the ten thousand nodes go in seventy-eight steps, and the five hundred after them are what combs the fringes out and settles the line between the two. |
| ![Snail](examples/snail.png) | **Snail** — a spiral traced by hand in one open line and grown to twenty thousand nodes. An open strand has two ends and no inside, so rather than filling a body it folds back on itself until it has packed the area out, and the turns of the original spiral still read as bands across the finished sheet. |
| ![Warren](examples/warren.png) | **Warren** — edges a third the usual length, nothing skipped in the repulsion, and heavy smoothing. Every node feels every neighbour, so the folding is as fine and as even as the tool gets: a round mass packed with passages of one width throughout, with none of the radial arms the coarser settings throw out. The budget goes in thirty-five steps and twelve hundred more go into working the folds even. |
| ![Whelk](examples/whelk.png) | **Whelk** — the Snail again, the same traced spiral under the same forces, with the repulsion graded by how far apart two nodes are *along the line* rather than only in space. A node and its near neighbours barely push, so the line stays free to bend; a fold meeting another fold pushes at full strength, so the folds stand well off each other. The mean gap between passes goes from 61 to 89 and the sheet opens out. |
| ![Corral](examples/corral.png) | **Corral** — a drawn boundary pens the growth in and two obstacles stand in its way. The walls are shown dashed, as they are in the app. |

### Applications

Whole pictures, where the drawing is as much the point as the shape.

| | |
|---|---|
| ![Graphite](examples/graphite.png) | **Graphite** — the pencil style: the outline as hundreds of short strokes, each taking its own length, width and opacity from a range. |
| ![Scribble](examples/scribble.png) | **Scribble** — wide ranges and long strokes that mostly ignore the curve, four passes of loose hatching. |
| ![Grain](examples/grain.png) | **Grain** — the stipple style at close spacing with the dots thrown well off the line, stacked as it grows: the outline reads as a drifting grain rather than an edge. Dialled in by hand and saved out of the app. |
| ![Topography](examples/topography.png) | **Topography** — the contour style: nine echoes at close spacing, each stepped round the colour wheel, so the form reads as banded ground rather than a line. Dialled in by hand and saved out of the app. |
| ![Rings](examples/rings.png) | **Rings** — stacking, with the oldest layers sinking back. Auto-fit is off in this one, because the layers only line up if the view holds still. |
| ![Sediment](examples/sediment.png) | **Sediment** — the same with nothing fading: every layer carries the same weight, so the record thickens evenly. Auto-fit off as well. |
| ![Neon rabbit](examples/neon-rabbit.png) | **Neon rabbit** — a strand traced by hand, set loose among four drawn obstacles and stacked every step. It threads the gaps between them in cyan, and the record of where it has been fills the space they leave. The pause at the budget is off, so it carries on past its last node until the settle test calls it done. Auto-fit off, framed for where it ends up. |
| ![Verdigris](examples/verdigris.png) | **Verdigris** — the Meander forces again, but with the body filled in dark olive under mint strokes whose hue swings right round toward amber. The labyrinth reads as a corroded, speckled surface rather than a line. |
| ![Topiary](examples/topiary.png) | **Topiary** — two obstacles with the constraints hidden, so nothing shows of them but the shape they impose. The growth packs tight where it is penned in and fans loose where it is not, and the record of every third frame in olive stipple turns that difference into a canopy over a trunk. Scatter power down at 0.75, which is what keeps a line readable inside the haze. |
| ![Sheaf](examples/sheaf.png) | **Sheaf** — the lineage style: not the outline at all, but the path every node has taken, forking wherever a split gave the curve a new point. Each arm is the swept sheet of filaments that built it, tangled and dark at the trunk where the threads crowd and combed open where they fan out. 700 nodes go in a hundred steps; the six hundred after them are what draw the picture. |
| ![Venation](examples/venation.png) | **Venation** — the same threads as the Sheaf, but each laid down at full strength when it branches and faded to nothing twenty-five steps later. Only the neighbourhood of a split survives, so the picture stops being the swept sheet and becomes the branching itself. Once the budget is spent nothing branches again and the record fades out, so this draws the growing and not the settling. |
| ![Ember](examples/ember.png) | **Ember** — two concentric rings, every stroke nudged around the colour wheel and up or down in value, so the line burns unevenly. |
| ![Phyllotaxis](examples/phyllotaxis.png) | **Phyllotaxis** — 160 circles on a golden-angle spiral, grown together and drawn with no outline at all, so the cells read as shapes against the ground the way the florets of a seed head do. No two curves ever join, so the spiral arrangement survives as the pattern of the gaps between them. |
| ![Scatter](examples/scatter.png) | **Scatter** — 45 triangles, squares and circles dropped at random and kept only where they touched nothing already placed, then sketched rather than outlined, so the field reads as a plate of specimens drawn one at a time. What each started as is still legible in the arms it puts out. |
| ![Lattice](examples/lattice.png) | **Lattice** — a five by seven grid shaken off the lattice, each tile spun at random, drawn as a specimen sheet: contour echoes ring every cell and step round the colour wheel as they go out, so each sits in its own halo. |

The pictures are rendered from those definitions by `node make-examples.js`.

---

## The algorithm

Per step, as in the original script:

1. **Attraction** — each node pulls toward its two path neighbours, once the edge is
   longer than `min-edge`.
2. **Repulsion** — every node pushes away from all nodes inside `repulsion-radius`,
   falling off linearly to zero at the radius.
3. **Noise** — a small random kick.
4. **Alignment** — each node is pulled toward the midpoint of its neighbours.
5. **Integration** — velocity accumulates with `damping` and is consumed on each move,
   exactly as the original's `add_force` / `update_position` did.
6. **Growth** — any edge longer than `max-edge` gets a jittered midpoint node.

Rendering uses the same collinear-tangent cubic Bézier construction the original script
used, so the on-screen curve matches the exported SVG.

The repulsion loop is the one performance change: the original compared every pair, this
uses a uniform grid and visits each close pair once. About 9 ms/step at 4 000 nodes,
where the original took minutes to get there.

Several curves share one node array, each holding a contiguous range. Attraction,
alignment, smoothing and splitting work within a curve; repulsion and the barriers work
across all of them. That is what lets two seeds push on each other while staying separate
outlines. A single seed is bit-identical to before multi-curve support existed, verified
against stored digests.

---

## Using it

### Seeds

The **Seed shape** menu holds the primitives (circle — the original's distorted circle —
plus ring, star, square, and an open line), anything you have traced, and *Draw closed…*
/ *Draw open…* / *Import SVG…*.

Choosing any of them puts the shape on the canvas provisionally, and a bar over the
canvas asks what to do with it: **Add** puts it alongside what is already growing,
**Replace** makes it the only seed, **Cancel** leaves things as they were. Tracing works
the same way, with Add and Replace live once the line is long enough.

**Import SVG…** reads a file and turns every shape in it into a traced outline. It walks
each shape with `getPointAtLength` rather than parsing path commands, so paths, polygons,
rectangles, circles and the rest all work and their transforms come along; a path that
closes itself becomes a closed seed and one that does not stays open. The file is scaled
and centred as a unit so its parts stay in register, and an import arrives on the same
bar, so cancelling drops all of it. `samples/elephant.svg` is there to try it on.

Growth is expansion, so a detailed silhouette used as a *seed* swells out of recognition
within a hundred steps — the elephant is a coral by step eighty. Import it as a boundary
instead if you want the shape itself to survive.

The panel then reads as the menu, the pills for what is currently seeded, and **X, Y,
Rotate, Scale** for whichever pill is selected. You can drag a seed on the canvas too,
from inside it or by its outline. Seeds show as blue outlines while nothing has grown,
the selected one solid, and disappear once growth starts. Scale and rotation work about
each shape's own centre. A traced outline keeps the position and size you drew it at.

**Clear** (next to Auto-fit) empties the canvas — nothing grows until a shape is chosen.

### Tiling

Instead of placing shapes one at a time, lay the seed out as a field. The **Tiling**
section has a layout and its numbers, and the field is *derived* from them — there is
nothing to place, and changing any of them relays the whole thing. **Shape** picks what
gets tiled; *mixed* gives each tile three, four or many sides, so what a cell started as
stays legible in the arms it puts out.

- **Grid** — **Rows**, **Columns**, **Spacing**, and **Jitter** to shake each one off the
  lattice.
- **Spiral** — **Count**, **Spread**, a **Hole** to clear the middle, and **Turn**, the
  angle between one seed and the next. 137.5° is the golden angle and gives phyllotaxis,
  the sunflower packing; the reason that number and not another is that it is the one that
  never repeats, so successive rings cannot line up. Move a degree off it and the spokes
  come straight back.
- **Scatter** — **Count** dropped at random within **Spread**, keeping only those with at
  least **Spacing** of air around them. It may place fewer than you ask if it runs out of
  room.

All three take a **Tile size** range and a **Spin**. While tiling is on the seed list
shows the count rather than the shapes, since the layout, not the list, is the source of
truth; turn it off to go back to placing by hand.

A tiled field is only interesting while its cells are still separate. Growth runs to the
node budget, and if you let it run on, the outlines fill every gap and the arrangement is
lost in a labyrinth indistinguishable from a single seed's — at 1,200 steps the spiral is
completely gone. Choosing the budget is choosing how much cell you get.

The spiral and scatter layouts are adapted from the shape studies in
[Jason Webb's 2d-differential-growth-experiments](https://github.com/jasonwebb/2d-differential-growth-experiments).

### Constraints

*Draw boundary…* pens the growth inside an area it cannot leave; *Draw obstacle…* marks
an area it has to flow around, and you can add as many as you like. Both are kept where
you draw them.

**Wall repel** decides how they behave. At 1 a wall's edge is sampled into points spaced
like the curve's own nodes and pushes back with the same force law, so the growth holds
the same gap from a wall as from its own folds — measured 39–42 units against a 44–50
unit fold gap. At 0 the wall is only a hard stop and the curve presses flat against it.
A hard clearance sits underneath either way, so nothing can cross.

**Show constraints** (Appearance, or `C`) hides the dashed guides so you see the form on
its own. They are never included in an export.

### Forces

Every force parameter is live — drag a slider mid-growth and the form responds. What each
one does to the finished result is below, and the pictures are the argument: one run of
the same seed to the same 1 600-node budget, one control changed along each strip, every
panel of a strip drawn at one scale so a control that changes the *size* of the form shows
that rather than having it normalised away. `node make-sweeps.js` regenerates them.

#### What you start from

![Seed shape](sweeps/seed-shape.png)

A closed seed is forgotten. Circle, ring, star and square are four different shapes and
they converge on the same form, because the growth runs to five times the radius it
started at and nothing of the original survives that. The open **line** is the one that
differs, and not because of its outline — because it has two ends, so it never closes into
a body and only its edge is drawn.

![Seed size](sweeps/seed-size.png)

Which means the seed is not forgotten because of what it is, but because of how far the
growth runs past it. The same star started larger keeps more: at radius 125 there is no
trace of five-fold anything, at 600 the five domains are unmistakable, each with its arms
combed at its own angle. This is the Rosette and Pinwheel pair above. It also shows a
large seed filling *inward* — there is empty room inside it, and the curve folds into that
as readily as it spreads outward, which is the whorl at the centre of the last two panels.

#### How coarse the form is

![Repulsion radius](sweeps/repulsion-radius.png)

**Repulsion radius** is the strongest single control here. It sets how far strands stay
off each other, so it decides how coarse the form is relative to its own size: measured
across that strip, the gap between neighbouring strands goes from 39 to 87 units while the
form itself only grows from 459 to 736. Fewer, fatter folds, not just a bigger picture.

![Max edge](sweeps/max-edge.png)

**Min/Max edge** is how much line each node carries — how long an edge gets before it
splits, and how short before attraction stops pulling. Raising it scales the whole form
up at much the same texture: the strand gap and the form radius move together, 46→88 and
426→927. It is also expensive in steps, because a fresh edge has further to stretch before
it splits again: the same budget takes 28 steps at 7–10 and 547 at 18–26.

#### The balance of forces

![Repulsion](sweeps/repulsion-factor.png)

**Repulsion factor** is how hard that push is, as distinct from how far it reaches. It
mostly buys speed — 690 steps to the budget at 3, 28 at 20 — and tightens the form a
little as it rises, since the curve is being shoved outward faster than attraction can
draw it in.

![Attraction](sweeps/attraction.png)

**Attraction** pulls each node toward its path neighbours, and only once the edge is
longer than the minimum. Over its useful range it changes the result least of any force
here: the four panels differ in arrangement more than in character. What it really governs
is how taut the line is against everything else pushing it about.

![Alignment](sweeps/alignment.png)

**Alignment** pulls each node toward the midpoint of its two neighbours. Under about 1.5
it is a mild tidying force and the form barely notices. Past that it dominates — the last
panel is a different animal, small and prickly, because every node is being dragged onto
the line between its neighbours faster than the other forces can build a fold.

![Damping](sweeps/damping.png)

**Damping** is the one to know about, for two reasons. It has the largest effect on the
finished form of anything on this page, and its name is inverted: the value is how much
velocity *carries over* between steps, so a higher number damps less. At 0.9 the nodes
move far each step, the budget is gone in 25 steps and the form is small and crowded
because it never had time to spread. At 0.35 it creeps, takes 1 038 steps, and the extra
thousand steps of pushing produce something a third again as wide — 717 units against
527 — and much looser.

#### Finish and detail

![Smoothing](sweeps/smoothing.png)

**Smoothing** is Taubin λ/μ — shrink-free, unlike a plain Laplacian, which would pull the
whole form in and starve the growth. Up to about 0.5 it cleans up the fold without costing
anything. Beyond that it fights the growth for control of the line and the form comes back
tighter and busier.

![Repulsion skip](sweeps/repulsion-skip.png)

**Repulsion skip** ignores that many nodes either side of each node when computing
repulsion. It exists for speed, and the default of 2 is free at normal edge lengths — but
it is free only because those neighbours are close compared to the repulsion radius. Skip
more and you coarsen the fold; skip none and you get the finest, most even folding the
tool makes, which is the whole of the Warren preset. Shorten the edges and the default
stops being free, because then the skipped neighbours *are* most of the neighbourhood.

**Fold spacing** grades that same repulsion by how far apart two nodes are *along the line*
rather than only in space: nothing at zero separation, full strength at the given number of
nodes apart. Skip is the blunt version of the idea — ignore everything within N — and this
is the ramp. A node and its near neighbours barely push, so the line stays free to bend,
while a fold meeting another fold pushes at full force and the folds stand off each other.
On the Snail at 12 the mean gap between passes goes from 61 to 89. It has the same cliff as
skip, and for the same reason: past roughly the number of nodes the repulsion radius reaches
— about six at the default settings — the near-neighbour push that drives growth goes with
it, and the run stalls rather than filling. Compare Snail and Whelk above.

![Noise](sweeps/noise.png)

**Noise** is the honest negative result on this page. Across its whole slider range it
re-rolls which arrangement you land on and leaves the character of the form alone. Use it
to get a different picture from the same settings, not a different kind of picture — for
that, change the random **seed**, which does the same thing more directly.

#### How far it runs

![Node budget](sweeps/node-budget.png)

**Node budget** is the plainest control of the lot: more line, bigger form, same texture.
It is also the one with a stopping rule attached, and whether you pause at it or run on to
the settle test is a real difference in the result rather than a difference in patience —
see [When a run stops](#when-a-run-stops).

**Speed** goes below 1 step per frame if you want to watch a fast configuration work.

Two cliffs are worth knowing about, since either turns the picture into a stalled
forty-node blob rather than a form. At the default forces, damping below about 0.3 and a
maximum edge above about 28 both starve the growth: splitting is the only outlet these
forces have, and both settings stop edges reaching the length that splits them. The run
ends as *stalled* rather than *settled*, and the node count in the HUD is the tell.

### Appearance

Everything visual is in one section, under Draw / Colour / Line / Sketch headings, with
the **Style** menu on its header so it is reachable while the section is folded.

- **Smooth** — the Bézier outline, fill and stroke.
- **Stipple** — dots along the outline: spacing, size, scatter and opacity, the last
  three as ranges. **Scatter power** sets how the dots fall across that scatter rather
  than how wide it is. At 5 they are spread evenly through the band, which is a cloud
  with no line left in it. At 1 their density thins out in a straight line with distance,
  so the edge still reads through the haze. Below 1 they pack in tight against the
  outline and it comes back as a line with a little fuzz on it.
- **Contour** — the outline echoed outward and inward: how many, how far apart, and how
  fast they fade.
- **Lineage** — the only style that draws history rather than shape. Each node leaves a
  thread behind it every step, and a node born from a split starts its thread where its
  parent stood, so the record forks wherever the curve gained a point. The picture is the
  accumulation, so this style turns stacking on and keeps it on; **Thread weight** sets how
  heavily one step is laid down, and low values are right — the weave comes from hundreds
  of passes, not from one dark one. **Draw 1 thread in** thins the weave, and it is the
  control that changes this style most: at 1 the threads close into solid swept sheets, at
  4 they separate into distinct ribbons, at 8 the form is a sparse burst of fibre. Which
  threads are kept is decided at birth and never changes, so none of them flickers; the
  ones left out still grow and still push on their neighbours, they are simply not drawn.
  It is also the lever for export size, since the segment count is nodes × steps.

  **Thread choice** decides *which* threads those are, and the two answers give different
  pictures rather than different densities of the same one. *Scattered* keeps every nth
  node ever born; since only one parent in n is itself drawn, most threads fork off one
  that is not, and the result reads as a comb of separate fibres. *Tree* starts from evenly
  spaced nodes on the seed and lets a new thread fork only off a thread already being
  drawn, so the picture is one connected branching structure — trunks running out from the
  centre, forking, ending in fans. It is also far sparser at the same setting: at 1 in 4,
  scattered keeps a quarter of the nodes and tree keeps about three per cent, because a
  thread has to be descended from a drawn one to be recruited at all.

  **Branch width** is a range rather than a single number: a branch is drawn at the high
  width where it forks and tapers to the low one as it ages, so the threads read as roots
  thinning toward their tips. Reverse the two for the opposite, thin at the fork and
  swelling outward. Set them equal for an even line. The taper runs over the fade span, or
  sixty steps when fading is off. **Hue ±**, **Saturation ±** and **Value ±** vary per
  *branch* here rather than per mark — one colour drawn at each fork and kept for that
  branch's whole life, so the tints separate the branches instead of dithering along them.

  **Fade over** lays a thread down at full strength each time it branches and fades it to
  nothing that many steps later, after which it stops being drawn at all. Since only the
  neighbourhood of a split survives, the picture stops being the swept sheet and becomes
  the branching: short values leave a bare dendritic skeleton, long ones fill back in
  toward the unfaded look. It has a hard edge worth knowing — once the node budget is
  spent nothing branches again, so the entire record fades out within that many steps of
  the budget and every step after contributes nothing. With fading on you are drawing the
  growing; with it off you are drawing the settling as well. Switching to it restarts the run, because the record
  has to be kept from the first step. Growth has to run *past* its budget for this to have
  anything to draw: all the interest is in what the nodes do once they have stopped being
  created.
- **Pencil sketch** — hundreds of short overlapping strokes. **Length**, **Follow
  curve**, **Wander**, **Width ×**, **Opacity**, **Hue ±**, **Saturation ±** and
  **Value ±** are two-handled sliders: each stroke takes its own value from between the
  handles, which is what makes the line read as hand-made. Collapse a range and every
  stroke matches, giving a mechanical line; open Follow curve wide and some strokes cut
  straight across the curve while others trace it. Value is what varies a black sketch,
  where hue and saturation have nothing to work with.

**Hue ±**, **Saturation ±** and **Value ±** are shared by every style that makes marks,
so stipple and contour vary their colour the same way.

A style measures in **output pixels**, not world units — it is handed how much world one
pixel covers. So a sketch keeps the same character whether you are zoomed out on a
4 000-node form or exporting at 4 000 px, exactly as a real pen does not get finer
because the subject got bigger.

The corollary is that these styles do not survive being resized afterwards. Grain asks
for dots of 0.2 to 1.3 px and Scribble for strokes of 0.6 px: shrink the finished image
by half and the finest of them fall under a pixel and resample into a grey wash, which
looks like a different and much weaker setting rather than a smaller picture. Export at
the size you want to look at it, and if you need a smaller image, render it small rather
than scaling one down. The example pictures here are written out at the size they were
measured for, which is why `to-png.sh` converts one to one.

**Compositing** (Appearance → Stacking) decides how a mark combines with what is already
down. *Normal* adds them, so wherever stacked frames overlap the colour builds toward
saturation and the individual layers are lost in a flat patch. *Lighten* and *Darken* take
the per-channel max or min instead, so an overlap can only be as strong as the strongest
layer in it — on a stacked Sediment that cuts the area saturated to flat red from 54% to
44%, and the layer lines stay legible through the densest part.

Match it to the ground: Lighten for light marks on a dark background, Darken for dark
marks on a light one. The wrong way round erases the drawing, since every mark loses to
the background. Two things follow from how it works. It has to compare whole layers, not
marks, so each frame is drawn over its own copy of the background before the comparison —
which means the result is the strongest layer rather than the sum, and tone flattens: a
lineage stack goes from ten thousand distinct colours to about ninety. And marks laid down
this way no longer compound, so a setting that looked right under Normal will come out
much fainter; raise the opacity or the thread weight to compensate.

**Keep every frame** (Appearance → Stacking) stops clearing the canvas: each frame is
kept and the next drawn over it, so the evolution piles up into one image. **Stack every**
sets the steps between layers — low values lay down a dense blur, high ones leave distinct
outlines — and **Fade** lets the oldest layers sink back toward the paper.

The stack lives in screen pixels, so the view has to hold still while it fills: turning
it on switches auto-fit off, and panning or zooming starts a clean sheet. Frame the shape
for its finished size first, then reset and let it grow into that frame. PNG export writes
the stack at canvas resolution rather than the usual 2000 px.

**Auto-fit** (toolbar, or `F`) is a toggle: on, the view keeps the whole form in frame;
turning it on re-frames straight away, and panning or zooming turns it off. With it off,
Reset leaves your view alone.

Reset always holds paused, so a fresh seed can be looked at before it runs. Which panel
sections you leave folded is remembered between visits.

`space` play · `R` reset · `S` step · `F` auto-fit · `C` constraints · `Tab` panel ·
scroll zoom · drag pan · hold `B` (or shift) and drag to push the curve.

### Saving and export

- **Save current…** keeps a named copy in browser storage; chip to load, × to delete.
- **Copy link** puts the whole configuration in a URL — the way to move a form to
  another machine.
- **To file / Load from file** writes it as JSON. Prefer this for traced outlines, which
  make long links.
- **SVG** and **PNG** export the artwork; constraints and guides are never included.
- **Copy node command** writes the `growth.js` invocation for exactly what is on screen
  — seeds with their placement, traced outlines, constraints, style and all its ranges.

View state is saved only when auto-fit is off, because at that point the framing is a
choice you made rather than something the app picked. It is stored as the world rectangle to
frame — centre and half-extents — so it lands the same whatever size the window is, and a
form wider than it is tall is framed on both counts rather than left small in the middle.

Four presets rely on this. The two stacking ones must, since their layers only line up if
the view holds still. Meander and Neon do because following them would rescale the window constantly
as they sprawl. All three arrive framed for the size the shape finishes at, and
grow into the picture rather than off the edge of it.

---

## Adding a render style

Add an entry to `STYLES` in `growth-core.js`:

```js
myStyle: {
  label: 'My style',
  params: ['someParam'],            // rows tagged style:'myStyle' in index.html
  render(sink, sim, P, unit){       // unit = world units per output pixel
    sink.begin();
    sink.moveTo(x, y); sink.lineTo(x, y); sink.quadTo(cx, cy, x, y);
    sink.stroke(P.stroke, P.strokeWidth * unit, 0.8);
  },
},
```

Styles draw into a *sink* rather than onto a canvas, so one implementation serves the
live canvas, the PNG export and the SVG export in both the browser and the CLI. A new
style appears in the menu, exports, and works from the CLI as `--style myStyle` with no
further wiring. `arcTable(sim, range)` gives arc-length lookup along a curve if a style
wants to walk it rather than follow nodes.

---

## What was fixed along the way

**Scalloped edges.** Two causes, found by measuring node offset from the neighbours'
midpoint over mean edge length. First, running past the node budget: splitting edges is
the only outlet these forces have, and once it is shut off the curve keeps compressing —
mean edge 10.9 → 19 → 1e84 → NaN, degrading into scallops on the way. The run now stops
at the budget and says so, and a node may never move further than one max edge per step.
Second, nodes one or two apart along the path repelling each other, which forces excess
length into the shortest wavelength available. Measured wobble before → after: Brain
0.43 → 0.15, Coral 0.34 → 0.15, Strand 0.24 → 0.13.

Two controls address the second cause. **Strand smoothing** is a Taubin λ/μ low-pass —
plain Laplacian smoothing shrinks the curve and shrinkage eats the length growth feeds
on, so the negative pass puts the low frequencies back. **Skip path neighbours** exempts
nearby nodes from repulsion, but that repulsion is also part of what *drives* growth, so
the value is capped automatically at what the repulsion radius can afford. Set both to 0
for the original behaviour, scalloping included.

**Bézier hooks.** Sharp kinks rendered as curled hooks that were not in the node data.
The control arm now fades as the tangent turns away from its chord.

**Seed subdivision.** A 10-gon at radius 125 has ~78-unit edges, far above min-edge, so
it contracted instead of growing. The seed is now subdivided to the working edge length
first — an earlier version of the original script sized its seed the same way.

**Barrier tunnelling.** With a boundary in play, per-step motion could exceed the
clearance margin and jump the wall, after which the node was too far out to recover.
Steps are capped below the margin, and a node found on the wrong side is pulled back
whatever its distance. Zero escapes across boundary-only, boundary-plus-obstacles and
obstacles-only runs.

## When a run stops

Two conditions end a run, and the HUD reports which.

**The node budget** is reached. Splitting edges is the only outlet these forces have, so
once it is shut off the curve keeps compressing and the outline degrades; the run stops
there rather than spoiling what it made. Turn off **Pause when the budget is reached**
and only the growth stops: the form carries on relaxing into whatever room it has left,
until the settle test ends it. Sprawl and Neon rabbit both work that way.

**The shape settles** — it is no longer getting anywhere. Measured as the change in the
outline's total length over the last hundred steps, as a fraction, shown live in the HUD
next to the node count, and stopped once it stays under **Settle at** for sixty steps.

Length over a window, rather than movement between two frames, because neither simpler
measure works. Raw movement says nothing: a heavily damped run creeps at a hundredth the
speed of a lively one while growing perfectly well, so any threshold on speed calls it
finished immediately. Per-step length change says nothing either: a slow configuration
adds a ten-thousandth of its length per step while filling, which is indistinguishable
from zero. Over a hundred steps the difference between creeping and finished is plain —
Corral settles at 0.0001 once its boundary is full, while Meander is still reading 0.07
after fifteen hundred steps and is left to carry on.

An unbounded form never settles, since it can always spread further; those end at the
budget. A walled one ends when it has filled its walls.

The useful thresholds run over two decades, from a couple of ten-thousandths for a form
that has genuinely stopped to a few hundredths for one only creeping, so the slider is
geometric rather than linear and its bottom notch reads **off**, never stopping for this.
A tight threshold and a loose one are different pictures, not different waits: Neon rabbit
at 0.07 stops after 367 steps, and at 0.01 it runs to 954 and lays down nearly three times
the record.

Numerical instability also halts a run, though that is a fault rather than a finish.
