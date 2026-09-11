/* ============================================================================
   Presets — eight complete examples, each one a full configuration: what it
   grows from, the forces, any constraints, and how it is drawn.

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
  fillOn: true, strokeOn: true, showNodes: false,
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
  {
    name: 'Coral',
    note: 'One circle, left to fill the plane. The original script’s look: black fill, red outline.',
    cfg: { seeds: [seed('circle')], maxNodes: 3200 },
  },
  {
    name: 'Lobes',
    note: 'A repulsion radius half again as wide, longer edges, and stopped early: fat arms with room between them instead of a filled disc. Same algorithm, four different numbers.',
    cfg: { seeds: [seed('circle')], repulsionRadius: 150, repulsionFactor: 9,
           minEdge: 15, maxEdge: 24, maxNodes: 600 },
  },
  {
    name: 'Strand',
    note: 'An open seed has two ends, so it meanders instead of closing into a blob.',
    cfg: { seeds: [seed('line')], initialNodes: 12, minEdge: 10, maxEdge: 15,
           repulsionRadius: 70, repulsionFactor: 6, alignmentFactor: 1.2,
           noiseFactor: 0.15, maxNodes: 2600,
           fillOn: false, bg: '#f7f4ec', stroke: '#1a1a1a', strokeWidth: 1.6 },
  },
  {
    name: 'Twins',
    note: 'Two seeds grow as separate curves. They never join, but they push on each other and meet along a seam.',
    cfg: { seeds: [seed('circle', -250), seed('circle', 250)], startRadius: 80,
           repulsionRadius: 80, maxNodes: 2600, strokeOn: false, fill: '#111111' },
  },
  {
    name: 'Corral',
    note: 'A drawn boundary pens the growth in and two obstacles stand in its way. The wall pushes back like a line of nodes, so the curve keeps its distance.',
    cfg: { seeds: [seed('circle')], startRadius: 55, repulsionRadius: 46,
           wallRepulsion: 0.6, boundary: ring(0, 0, 330, 64, 0.18),
           obstacles: [ring(150, -70, 72, 28, 0), ring(-150, 90, 60, 24, 0)],
           maxNodes: 2600 },
  },
  {
    name: 'Graphite',
    note: 'The pencil style: the same outline drawn as hundreds of short strokes, each taking its own length, width and opacity from a range.',
    cfg: { seeds: [seed('circle')], maxNodes: 1600,
           style: 'pencil', fillOn: false, bg: '#f2efe9', stroke: '#2b2b33',
           strokeWidth: 2.2, skOpMin: 0.3, skOpMax: 0.85 },
  },
  {
    name: 'Scribble',
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
    name: 'Grain',
    note: 'The stipple style: the outline read as dots rather than a line, each taking its own size and opacity, scattered a little off the true edge.',
    cfg: { seeds: [seed('circle')], maxNodes: 1500,
           style: 'stipple', fillOn: false, bg: '#f7f4ec', stroke: '#1a1a1a',
           stSpacing: 6, stSizeMin: 0.5, stSizeMax: 2.4, stScatMin: 0, stScatMax: 3,
           stOpMin: 0.3, stOpMax: 0.95 },
  },
  {
    name: 'Topography',
    note: 'The contour style: the outline echoed outward and inward in fading steps, so the form reads like a map.',
    cfg: { seeds: [seed('circle')], maxNodes: 1300, repulsionRadius: 110,
           style: 'contour', fillOn: false, bg: '#f4f2ec', stroke: '#1a3a5c',
           strokeWidth: 1.2, ctCount: 6, ctGap: 7, ctFade: 0.74,
           skValMin: -0.05, skValMax: 0.1 },
  },
  {
    name: 'Ember',
    note: 'Every stroke is nudged around the colour wheel and up or down in value, so the line burns unevenly.',
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
  PRESETS[p.name] = Object.assign({}, BASE, p.cfg);
  PRESET_NOTES[p.name] = p.note;
}

if (typeof module !== 'undefined' && module.exports){
  module.exports = { PRESETS, PRESET_NOTES, PRESET_LIST, BASE, ring, seed };
}
