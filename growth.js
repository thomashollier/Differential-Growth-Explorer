#!/usr/bin/env node
/**
 * Differential growth on the command line.
 *
 *   node growth.js --seed 987 --repulsion-radius 100 --output growth.svg
 *   node growth.js --help
 *
 * This runs the exact code the browser runs: both load growth-core.js, so
 * there is no second implementation to drift out of step. The interactive
 * version's "Copy node command" button writes the invocation for whatever is
 * on screen, including a traced seed and any boundary or obstacles.
 */

'use strict';

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const { Growth, STYLES, svgSink } = require(path.join(__dirname, 'growth-core.js'));

/* Flag name -> parameter name, with the type to coerce to. The browser writes
   these same flags, and the defaults match its opening state. */
const FLAGS = {
  'shape':             ['shape', 'str', 'circle'],
  'initial-nodes':     ['initialNodes', 'int', 10],
  'seed-radius':       ['startRadius', 'num', 125],
  'seed':              ['seed', 'int', 10],
  'min-edge':          ['minEdge', 'num', 11],
  'max-edge':          ['maxEdge', 'num', 16],
  'repulsion-radius':  ['repulsionRadius', 'num', 100],
  'attraction-factor': ['attractionFactor', 'num', 1],
  'repulsion-factor':  ['repulsionFactor', 'num', 8],
  'alignment-factor':  ['alignmentFactor', 'num', 1],
  'noise-factor':      ['noiseFactor', 'num', 0.1],
  'damping':           ['damping', 'num', 0.6],
  'smoothing':         ['smoothing', 'num', 0.3],
  'wall-repulsion':    ['wallRepulsion', 'num', 1],
  'repulsion-ramp':    ['repulsionRamp', 'num', 0],
  'repulsion-skip':    ['repulsionSkip', 'int', 2],
  'split-jitter':      ['splitJitter', 'num', 1],
  'max-nodes':         ['maxNodes', 'int', 4000],
  'prune-short':       ['pruneShort', 'bool', false],
  'settle-at':         ['settleAt', 'num', 0.001],
  'tension':           ['tension', 'num', 0.33],
  'style':             ['style', 'str', 'smooth'],
  'sketch-passes':     ['skPasses', 'int', 2],
  'sketch-density':    ['skDensity', 'num', 9],

  'sketch-bow':        ['skBowMin:skBowMax', 'range', [0.2, 0.5]],
  'sketch-wander':     ['skJitMin:skJitMax', 'range', [1.2, 3.6]],
  // ranges, given as "min,max"
  'sketch-length':     ['skLenMin:skLenMax', 'range', [16, 54]],
  'sketch-width':      ['skWidthMin:skWidthMax', 'range', [0.4, 1.6]],
  'sketch-opacity':    ['skOpMin:skOpMax', 'range', [0.25, 0.8]],
  'sketch-hue':        ['skHueMin:skHueMax', 'range', [-10, 10]],
  'sketch-sat':        ['skSatMin:skSatMax', 'range', [-0.1, 0.1]],
  'sketch-val':        ['skValMin:skValMax', 'range', [-0.12, 0.12]],
  'dot-spacing':       ['stSpacing', 'num', 7],
  'dot-size':          ['stSizeMin:stSizeMax', 'range', [0.6, 2.6]],
  'dot-scatter':       ['stScatMin:stScatMax', 'range', [0, 2.5]],
  'tile':              ['tileMode', 'str', 'none'],
  'tile-shape':        ['tileShape', 'str', 'ring'],
  'tile-rows':         ['tileRows', 'num', 4],
  'tile-cols':         ['tileCols', 'num', 6],
  'tile-count':        ['tileCount', 'num', 160],
  'tile-turn':         ['tileTurn', 'num', 137.5],
  'tile-spread':       ['tileSpread', 'num', 5],
  'tile-hole':         ['tileHole', 'num', 0.3],
  'tile-gap':          ['tileGap', 'num', 0.85],
  'tile-jitter':       ['tileJitter', 'num', 0],
  'tile-spin':         ['tileSpin', 'num', 0],
  'tile-size':         ['tileScaleMin:tileScaleMax', 'range', [0.3, 0.3]],
  'blend':             ['blend', 'str', 'normal'],
  'dot-power':         ['stScatPow', 'num', 5],
  'dot-opacity':       ['stOpMin:stOpMax', 'range', [0.25, 0.9]],
  'echoes':            ['ctCount', 'int', 4],
  'echo-gap':          ['ctGap', 'num', 7],
  'echo-fade':         ['ctFade', 'num', 0.72],


};

const OUTPUT = {
  'steps':        ['steps', 'int', 2000],
  'output':       ['output', 'str', 'growth.svg'],
  'width':        ['width', 'int', 2000],
  'height':       ['height', 'int', 2000],
  'fill':         ['fill', 'str', '#000000'],
  'stroke':       ['stroke', 'str', '#ff0000'],
  'background':   ['background', 'str', '#ffffff'],
  'stroke-width': ['strokeWidth', 'num', 3],
  'quiet':        ['quiet', 'bool', false],
};

const USAGE = `
Differential growth -> SVG.

  node growth.js [options]

Seed
  --shape NAME           circle | ring | star | square | line
  --initial-nodes N      corner points of the seed, before subdivision
  --seed-radius R        size of the built-in seeds
  --seed N               random seed

  Several seeds grow as separate curves that never join but do push each other
  around. Give one flag per seed, in the order you want them laid out:
  --seed-shape NAME[@x,y,rot,scale]   another built-in, optionally placed
  --seed-path "x,y ..."      a traced closed outline, at its own coordinates
  --seed-open-path "x,y ..." a traced open strand

Growth
  --settle-at N          stop once the outline stops getting anywhere: how much
                         its length changed over the last hundred steps, as a
                         fraction. 0 never stops for this
  --min-edge N           attraction pulls until edges reach this
  --max-edge N           longer edges split in two
  --repulsion-radius N   sets the gap between folds
  --max-nodes N          growth stops at this many nodes

Forces
  --attraction-factor N  --repulsion-factor N  --alignment-factor N
  --wall-repulsion N     how hard drawn walls push back (x repulsion-factor)
  --noise-factor N       --damping N           --smoothing N
  --repulsion-skip N     --split-jitter N      --prune-short
  --repulsion-ramp N     grades repulsion by distance along the line: nothing
                         at zero, full strength this many nodes apart, so folds
                         stand off each other while the line stays free to bend

Tiling
  --tile MODE            none | grid | spiral | scatter
  --tile-shape NAME      circle | ring | star | square | line | mixed
  --tile-size MIN,MAX    each seed's size, as a fraction of the seed radius
  --tile-spin N          random rotation either way, in degrees
  (grid)    --tile-rows N --tile-cols N --tile-gap N --tile-jitter N
  (spiral)  --tile-count N --tile-turn DEG --tile-spread N --tile-hole N
  (scatter) --tile-count N --tile-spread N --tile-gap N

Constraints
  --boundary-path "x,y ..."   area the growth must stay inside
  --obstacle-path "x,y ..."   area it must keep out of; repeatable

Render
  --style NAME           smooth | pencil | stipple | contour
  --tension N            curve smoothing for the smooth style
  --sketch-passes N --sketch-density N
  (pencil style; the ranges give every stroke its own value)
  --sketch-length MIN,MAX  --sketch-width MIN,MAX   --sketch-opacity MIN,MAX
  --sketch-bow MIN,MAX     --sketch-wander MIN,MAX
  --sketch-hue MIN,MAX     --sketch-sat MIN,MAX      --sketch-val MIN,MAX
  (stipple) --dot-spacing N --dot-size MIN,MAX --dot-scatter MIN,MAX
            --dot-power N  how the dots fall across the scatter: 5 spreads them
                           evenly, 1 thins them out with distance from the line,
                           below 1 packs them against it
            --dot-opacity MIN,MAX
  (contour) --echoes N --echo-gap N --echo-fade N

Output
  --steps N              maximum steps            --output FILE
  --width N --height N   SVG size attributes
  --fill C --stroke C --background C --stroke-width N   ("none" allowed)
  --quiet                only print the final line
`;

function parseArgs(argv){
  const P = {}, O = {};
  for (const [flag, [key, type, def]] of Object.entries(FLAGS)){
    if (type === 'range'){ const [a, b] = key.split(':'); P[a] = def[0]; P[b] = def[1]; }
    else P[key] = def;
  }
  for (const [flag, [key, , def]] of Object.entries(OUTPUT)) O[key] = def;
  P.drawnShapes = []; P.seeds = null; P.boundary = null; P.obstacles = [];

  const coerce = (type, raw, flag) => {
    if (type === 'bool') return true;
    if (raw === undefined) die(`--${flag} needs a value`);
    if (type === 'str') return raw;
    const v = Number(raw);
    if (!Number.isFinite(v)) die(`--${flag} expects a number, got "${raw}"`);
    return type === 'int' ? Math.round(v) : v;
  };
  const points = (raw, flag) => raw.trim().split(/\s+/).map(pair => {
    const [a, b] = pair.split(',');
    const x = Number(a), y = Number(b);
    if (!Number.isFinite(x) || !Number.isFinite(y))
      die(`--${flag} must look like "x,y x,y x,y ..."`);
    return [x, y];
  });

  let fillGiven = false;
  const seeds = [];                 // in the order the flags appear
  for (let i = 2; i < argv.length; i++){
    const arg = argv[i];
    if (arg === '--fill') fillGiven = true;
    if (arg === '--help' || arg === '-h'){ console.log(USAGE); process.exit(0); }
    if (!arg.startsWith('--')) die(`unexpected argument "${arg}"`);
    const flag = arg.slice(2);
    const next = () => argv[++i];

    if (FLAGS[flag]){
      const [key, type] = FLAGS[flag];
      if (type === 'range'){
        const parts = String(next()).split(',').map(Number);
        if (parts.length !== 2 || parts.some(v => !Number.isFinite(v)))
          die(`--${flag} expects "min,max"`);
        const [a, b] = key.split(':');
        P[a] = Math.min(parts[0], parts[1]); P[b] = Math.max(parts[0], parts[1]);
      } else {
        P[key] = coerce(type, type === 'bool' ? undefined : next(), flag);
      }
    } else if (OUTPUT[flag]){
      const [key, type] = OUTPUT[flag];
      O[key] = coerce(type, type === 'bool' ? undefined : next(), flag);
    } else if (flag === 'seed-shape'){
      // "circle@x,y,rot,scale" — the placement the browser gave it
      const [name, place] = next().split('@');
      const t = (place || '').split(',').map(Number);
      seeds.push({ builtin: name, dx: t[0] || 0, dy: t[1] || 0,
                   rot: t[2] || 0, scale: t[3] === undefined || !t[3] ? 1 : t[3] });
    } else if (flag === 'seed-path'){
      seeds.push({ pts: points(next(), flag), closed: true });
    } else if (flag === 'seed-open-path'){
      seeds.push({ pts: points(next(), flag), closed: false });
    } else if (flag === 'boundary-path'){
      P.boundary = points(next(), flag);
    } else if (flag === 'obstacle-path'){
      P.obstacles.push(points(next(), flag));
    } else {
      die(`unknown option "${arg}"  (try --help)`);
    }
  }

  // "--shape drawn-line --seed-path" is how a single traced strand used to be
  // spelled; honour it by making that one seed open
  if ((P.shape === 'drawn-line' || P.shape === 'drawnLine') &&
      seeds.length === 1 && seeds[0].pts) seeds[0].closed = false;
  if ((P.shape === 'drawn' || P.shape === 'drawn-line' || P.shape === 'drawnLine') && !seeds.length)
    die(`--shape ${P.shape} needs a traced outline. Use the browser's `
        + `"Copy node command" button, which includes the one you traced.`);

  P.drawnShapes = [];
  P.seeds = seeds.length
    ? seeds.map((sd, i) => {
        const at = { dx: sd.dx || 0, dy: sd.dy || 0,
                     rot: sd.rot || 0, scale: sd.scale === undefined ? 1 : sd.scale };
        if (sd.builtin) return { key: sd.builtin, ...at };
        if (sd.pts.length < 3) die('a traced seed needs at least 3 points');
        const id = 'cli' + i;
        P.drawnShapes.push({ id, name: 'seed ' + (i + 1), closed: sd.closed, pts: sd.pts });
        // traced points arrive already placed, so no further transform
        return { key: 'drawn:' + id, dx:0, dy:0, rot:0, scale:1 };
      })
    : [{ key: P.shape, dx:0, dy:0, rot:0, scale:1 }];

  // an open curve has no inside; filling one closes it across the ends
  const anyOpen = P.seeds.some(sd => {
    const d = P.drawnShapes.find(e => 'drawn:' + e.id === sd.key);
    return d ? !d.closed : sd.key === 'line';
  });
  if (anyOpen && !fillGiven) O.fill = 'none';
  return { P, O };
}

function die(msg){
  console.error('growth.js: ' + msg);
  process.exit(1);
}

/* ---------- SVG ---------- */
function toSvg(sim, P, O){
  const b = sim.bounds();
  const pad = Math.max(20, P.repulsionRadius * 0.5);
  const x0 = b.minX - pad, y0 = b.minY - pad;
  const w = (b.maxX - b.minX) + pad * 2, h = (b.maxY - b.minY) + pad * 2;
  const f = (v) => (Math.round(v * 100) / 100);
  const none = (c) => !c || c.toLowerCase() === 'none';

  // the CLI's colour flags stand in for the browser's palette
  const style = STYLES[P.style] || STYLES.smooth;
  const view = Object.assign({}, P, {
    fill: O.fill, stroke: O.stroke,
    fillOn: !none(O.fill), strokeOn: !none(O.stroke),
    strokeWidth: O.strokeWidth,
  });
  // one output pixel is this much of the world, given the requested SVG size
  const unit = w / O.width;
  const sink = svgSink(view.blend);
  style.render(sink, sim, view, unit);

  const bg = none(O.background) ? ''
    : `\n<rect x="${f(x0)}" y="${f(y0)}" width="${f(w)}" height="${f(h)}" fill="${O.background}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${O.width}" height="${O.height}" `
       + `viewBox="${f(x0)} ${f(y0)} ${f(w)} ${f(h)}">${bg}
${sink.toString()}
</svg>\n`;
}

/* ---------- run ---------- */
function main(){
  const { P, O } = parseArgs(process.argv);
  const say = (msg) => { if (!O.quiet) console.error(msg); };

  const sim = new Growth(P);
  const bad = sim.seedViolations();
  if (bad) say(`warning: ${bad} seed node(s) start on the wrong side of a barrier`);
  say(`seeded ${sim.ranges.length} curve(s) with ${sim.n} nodes`);

  // the same three stop conditions the interactive version uses
  let stop = 'step limit', settleRun = 0;
  for (let i = 0; i < O.steps; i++){
    sim.step(null);
    if (sim.unstable){ stop = 'went unstable — soften the forces'; break; }
    if (sim.saturated){ stop = 'node budget reached'; break; }
    settleRun = (P.settleAt > 0 && sim.change < P.settleAt) ? settleRun + 1 : 0;
    if (settleRun >= 60){
      stop = P.boundary ? 'growth filled the boundary'
           : (sim.n < 200 ? 'growth stalled' : 'shape settled');
      break;
    }
    if (!O.quiet && i % 20 === 0) say(`  step ${i}, ${sim.n} nodes`);
  }

  // an .svgz name means write it deflated; every renderer reads it as it is
  const out = toSvg(sim, P, O);
  fs.writeFileSync(O.output, /\.svgz$/i.test(O.output) ? zlib.gzipSync(out, { level: 9 }) : out);
  console.log(`${O.output} — ${sim.n} nodes, ${sim.steps} steps (${stop})`);
}

main();
