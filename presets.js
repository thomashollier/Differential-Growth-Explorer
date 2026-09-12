/* ============================================================================
   Presets — each one a whole picture: what grows, the forces, any constraints,
   how it is drawn, and whether the view follows it. Selecting one applies all
   of that.

   They come in two kinds.

   growth & shape — what the simulation itself can do. All of them wear the same
     black body and red edge, so the only thing differing between them is the
     form, and any constraints are left visible.

   applications — whole pictures, where the drawing is as much the point as the
     shape: the render styles, stacked histories, colour.

   Loaded by index.html with a <script> tag and by make-examples.js through
   require(), so the pictures in the README are made from these exact settings.
============================================================================ */

'use strict';

/* a closed polygon, for boundaries and obstacles */
function ring(cx, cy, r, k, wobble){
  const out = [];
  for (let i = 0; i < k; i++){
    const t = (i / k) * Math.PI * 2;
    const rr = r * (1 + (wobble || 0) * Math.cos(t * 3));
    out.push([+(cx + rr * Math.cos(t)).toFixed(2), +(cy + rr * Math.sin(t)).toFixed(2)]);
  }
  return out;
}

const seed = (key, dx, dy, rot, scale) =>
  ({ key, dx: dx || 0, dy: dy || 0, rot: rot || 0, scale: scale === undefined ? 1 : scale });

/* Shared starting point, so each preset below only states what it changes. */
const BASE = {
  initialNodes: 10, startRadius: 125, seed: 10,
  minEdge: 11, maxEdge: 16, repulsionRadius: 100,
  attractionFactor: 1, repulsionFactor: 8, alignmentFactor: 1,
  noiseFactor: 0.1, damping: 0.6, smoothing: 0.3, repulsionSkip: 2,
  wallRepulsion: 1, splitJitter: 1, pruneShort: false,
  boundary: null, obstacles: [], drawnShapes: [],
  style: 'smooth', tension: 0.33, strokeWidth: 2,
  fillOn: true, strokeOn: true, showNodes: false, showConstraints: false,
  follow: true, accumulate: false, trailFade: 0, stampEvery: 4, frame: null,
  stepsPerFrame: 1,
  settleAt: 0.001,
  bg: '#ffffff', fill: '#000000', stroke: '#ff0000',
  skPasses: 2, skDensity: 9,
  skLenMin: 16, skLenMax: 54, skBowMin: 0.2, skBowMax: 0.5,
  skJitMin: 1.2, skJitMax: 3.6, skWidthMin: 0.4, skWidthMax: 1.6,
  skOpMin: 0.25, skOpMax: 0.8,
  skHueMin: 0, skHueMax: 0, skSatMin: 0, skSatMax: 0, skValMin: 0, skValMax: 0,
  stSpacing: 7, stSizeMin: 0.6, stSizeMax: 2.6, stScatMin: 0, stScatMax: 2.5,
  stOpMin: 0.25, stOpMax: 0.9,
  ctCount: 4, ctGap: 7, ctFade: 0.72,
};

const PRESET_LIST = [

  /* ---- growth & shape: same ink throughout, only the form changes ---- */

  {
    name: 'Coral', group: 'growth',
    note: 'One circle, left to fill the plane. The baseline every other form departs from.',
    cfg: { seeds: [seed('circle')], maxNodes: 3200 },
  },
  {
    name: 'Lobes', group: 'growth',
    note: 'A repulsion radius half again as wide, longer edges, and stopped early: fat arms with room between them instead of a filled disc.',
    cfg: { seeds: [seed('circle')], repulsionRadius: 150, repulsionFactor: 9,
           minEdge: 15, maxEdge: 24, maxNodes: 600 },
  },
  {
    name: 'Meander', group: 'growth',
    note: 'Weak attraction against heavy repulsion with the damping right down. The curve settles slowly and wanders into a labyrinth instead of packing radially.',
    cfg: { seeds: [seed('circle')], seed: 341, repulsionRadius: 99,
           attractionFactor: 0.52, repulsionFactor: 11.7, alignmentFactor: 1.21,
           damping: 0.23, maxNodes: 2600, maxSteps: 12000, strokeWidth: 2.6,
           // the damping is low enough that at one step a frame it barely moves
           stepsPerFrame: 5,
           // held still and framed for the size it finishes at: it spreads far
           // wider than it is tall, and following it would keep rescaling
           follow: false, frame: { cx: -6, cy: -61, rx: 2374, ry: 886 } },
  },
  {
    name: 'Strand', group: 'growth',
    note: 'An open seed has two ends, so it meanders instead of closing into a blob. With no inside to fill, only the edge is drawn.',
    cfg: { seeds: [seed('line')], initialNodes: 12, minEdge: 10, maxEdge: 15,
           repulsionRadius: 70, repulsionFactor: 6, alignmentFactor: 1.2,
           noiseFactor: 0.15, maxNodes: 2600, fillOn: false, strokeWidth: 2.4 },
  },
  {
    name: 'Twins', group: 'growth',
    note: 'A circle and a square twice its size, set well apart. They grow as separate curves that never join, but each pushes the other back where they meet.',
    cfg: { seeds: [seed('circle', -250), seed('square', 750, 0, 0, 2)], startRadius: 80,
           repulsionRadius: 80, maxNodes: 2600 },
  },
  {
    name: 'Corral', group: 'growth',
    note: 'A drawn boundary pens the growth in and two obstacles stand in its way. The walls push back like a line of nodes, so the curve keeps its distance, and the run ends when the boundary is full.',
    cfg: { seeds: [seed('circle')], startRadius: 55, repulsionRadius: 46,
           wallRepulsion: 0.6, boundary: ring(0, 0, 330, 64, 0.18),
           obstacles: [ring(150, -70, 72, 28, 0), ring(-150, 90, 60, 24, 0)],
           maxNodes: 2600, showConstraints: true },
  },

  /* ---- applications: the drawing matters as much as the form ---- */

  {
    name: 'Graphite', group: 'creative',
    note: 'The pencil style: the outline drawn as hundreds of short strokes, each taking its own length, width and opacity from a range.',
    cfg: { seeds: [seed('circle')], maxNodes: 1600,
           style: 'pencil', fillOn: false, bg: '#f2efe9', stroke: '#2b2b33',
           strokeWidth: 2.2, skOpMin: 0.3, skOpMax: 0.85 },
  },
  {
    name: 'Scribble', group: 'creative',
    note: 'Wide ranges and long strokes that mostly ignore the curve: four passes of loose hatching.',
    cfg: { seeds: [seed('star')], initialNodes: 24, minEdge: 9, maxEdge: 14,
           repulsionRadius: 120, repulsionFactor: 12, attractionFactor: 1.4,
           alignmentFactor: 0.4, noiseFactor: 0.05, damping: 0.7, maxNodes: 1400,
           style: 'pencil', fillOn: false, bg: '#f2efe9', stroke: '#22242b',
           strokeWidth: 2, skPasses: 4, skDensity: 6,
           skLenMin: 30, skLenMax: 120, skBowMin: 0, skBowMax: 0.25,
           skJitMin: 2, skJitMax: 8, skWidthMin: 0.3, skWidthMax: 1.4,
           skOpMin: 0.12, skOpMax: 0.5 },
  },
  {
    name: 'Grain', group: 'creative',
    note: 'The stipple style at close spacing with the dots thrown well off the line, stacked as it grows: the outline reads as a drifting grain rather than an edge. Dialled in by hand and saved out of the app.',
    cfg: { seeds: [seed('circle')], initialNodes: 10, startRadius: 125, seed: 10,
           minEdge: 11, maxEdge: 16, repulsionRadius: 100, attractionFactor: 1,
           repulsionFactor: 8, alignmentFactor: 1, noiseFactor: 0.1, damping: 0.6,
           smoothing: 0.3, repulsionSkip: 2, wallRepulsion: 1, splitJitter: 1,
           pruneShort: false, maxNodes: 1500, settleAt: 0.001, stepsPerFrame: 1,
           follow: false, frame: { cx: -43.9, cy: -20.7, rx: 1231.7, ry: 735.8 },
           boundary: null, obstacles: [], drawnShapes: [], style: 'stipple', tension: 0.33,
           strokeWidth: 2, fillOn: false, strokeOn: true, showNodes: false,
           showConstraints: false, accumulate: true, trailFade: 0.02, stampEvery: 2,
           bg: '#f7f4ec', fill: '#000000', stroke: '#766e65', skPasses: 2, skDensity: 9,
           skLenMin: 16, skLenMax: 54, skBowMin: 0.2, skBowMax: 0.5, skJitMin: 1.2,
           skJitMax: 3.6, skWidthMin: 0.4, skWidthMax: 1.6, skOpMin: 0.25, skOpMax: 0.8,
           skHueMin: -13, skHueMax: 16, skSatMin: 0, skSatMax: 0, skValMin: -0.27,
           skValMax: 0.35, stSpacing: 1.5, stSizeMin: 0.2, stSizeMax: 1.3, stScatMin: 0,
           stScatMax: 8.8, stOpMin: 0.23, stOpMax: 0.95, ctCount: 4, ctGap: 7, ctFade: 0.72,
           // a layer every dozen steps for the still picture; the app stacks
           // far more finely, but every dot of every layer ends up in the file
           stackEvery: 12, stackFade: 0.4 },
  },
  {
    name: 'Topography', group: 'creative',
    note: 'The contour style: the outline echoed outward and inward in fading steps, so the form reads like a map.',
    cfg: { seeds: [seed('circle')], maxNodes: 1300, repulsionRadius: 110,
           style: 'contour', fillOn: false, bg: '#f4f2ec', stroke: '#1a3a5c',
           strokeWidth: 1.2, ctCount: 6, ctGap: 7, ctFade: 0.74,
           skValMin: -0.05, skValMax: 0.1 },
  },
  {
    name: 'Rings', group: 'creative',
    note: 'Stacking, with the oldest layers sinking back: every few steps is left in the picture rather than erased. Auto-fit is off, because the layers only line up if the view holds still.',
    cfg: { seeds: [seed('circle')], maxNodes: 2400, repulsionRadius: 110,
           stackEvery: 3, stackFade: 0.35, follow: false,
           // framed for the size it finishes at, so it grows into the picture
           // rather than off the edge of it
           frame: { cx: -46, cy: 7, rx: 887, ry: 906 },
           accumulate: true, stampEvery: 3, trailFade: 0.03,
           fillOn: false, bg: '#fbf9f4', stroke: '#b0332a', strokeWidth: 1 },
  },
  {
    name: 'Sediment', group: 'creative',
    note: 'The same, with nothing fading: every layer carries the same weight, so the record thickens evenly and the first outline reads as clearly as the last.',
    cfg: { seeds: [seed('circle')], maxNodes: 2400, repulsionRadius: 110, seed: 7,
           stackEvery: 3, stackFade: 1, follow: false,
           frame: { cx: 3, cy: 6, rx: 884, ry: 894 },
           accumulate: true, stampEvery: 3, trailFade: 0,
           fillOn: false, bg: '#ffffff', stroke: '#c0392b', strokeWidth: 1 },
  },
  {
    name: 'Neon', group: 'creative',
    note: 'The Meander forces on a dark ground in mint, run to a much larger budget. Dialled in by hand in the app and saved out as a settings file, used here verbatim.',
    cfg: { seeds: [seed('circle')], seed: 341, maxSteps: 12000,
           // the same slow forces as Meander, with three times the budget: at
           // one step a frame it is two and a half minutes of watching
           stepsPerFrame: 8,
           follow: false, frame: { cx: 29, cy: -506, rx: 4003, ry: 1958 },
           repulsionRadius: 99, attractionFactor: 0.52, repulsionFactor: 11.7,
           alignmentFactor: 1.21, damping: 0.23, maxNodes: 8600, strokeWidth: 1.8,
           bg: '#07070c', fill: '#414349', stroke: '#3dffd0',
           skBowMin: 0.35, skBowMax: 0.74, skJitMin: 1.2, skJitMax: 4.3,
           skLenMin: 16, skLenMax: 62, skWidthMin: 0.4, skWidthMax: 1,
           skHueMin: -154, skHueMax: 0, skSatMin: -0.43, skSatMax: 0,
           skValMin: -0.5, skValMax: 0, skDensity: 8 },
  },
  {
    name: 'Ember', group: 'creative',
    note: 'Two concentric rings, and every stroke nudged around the colour wheel and up or down in value, so the line burns unevenly.',
    cfg: { seeds: [seed('ring'), seed('ring', 0, 0, 0, 0.45)], startRadius: 150,
           repulsionRadius: 85, maxNodes: 2200,
           style: 'pencil', fillOn: false, bg: '#140d14', stroke: '#f2542d',
           strokeWidth: 2, skPasses: 3, skDensity: 8,
           skLenMin: 12, skLenMax: 46, skJitMin: 1, skJitMax: 4,
           skWidthMin: 0.35, skWidthMax: 1.5, skOpMin: 0.2, skOpMax: 0.7,
           skHueMin: -28, skHueMax: 34, skSatMin: -0.35, skSatMax: 0.1,
           skValMin: -0.25, skValMax: 0.15 },
  },
];

/* name -> full settings */
const PRESETS = {};
const PRESET_NOTES = {};
for (const p of PRESET_LIST){
  PRESETS[p.name] = Object.assign({}, BASE, { group: p.group }, p.cfg);
  PRESET_NOTES[p.name] = p.note;
}

if (typeof module !== 'undefined' && module.exports){
  module.exports = { PRESETS, PRESET_NOTES, PRESET_LIST, BASE, ring, seed };
}
