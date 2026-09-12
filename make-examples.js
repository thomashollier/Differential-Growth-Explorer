#!/usr/bin/env node
/**
 * Renders every preset to examples/<name>.svg, so the pictures in the README
 * are made from the same definitions the app loads. Re-run after changing
 * presets.js:
 *
 *   node make-examples.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { Growth, STYLES, svgSink } = require(path.join(__dirname, 'growth-core.js'));
const { PRESETS } = require(path.join(__dirname, 'presets.js'));

const OUT = path.join(__dirname, 'examples');
const SIZE = 1000;

fs.mkdirSync(OUT, { recursive: true });

for (const [name, cfg] of Object.entries(PRESETS)){
  const P = JSON.parse(JSON.stringify(cfg));
  const sim = new Growth(P);

  // A preset with stackEvery keeps every so-many-th frame in the picture, the
  // way the app's stacking mode does: each layer is drawn and none erased.
  const layers = [];
  // heavily damped settings need far more steps to fill, so a preset may ask
  // for more than the usual allowance
  const cap = P.maxSteps || 4000;
  let steps = 0, stop = 'step limit', settleRun = 0;
  for (; steps < cap; steps++){
    sim.step(null);
    if (P.stackEvery && steps % P.stackEvery === 0) layers.push(sim.steps);
    if (sim.unstable){ stop = 'unstable'; break; }
    if (sim.saturated){ stop = 'node budget'; break; }
    settleRun = (P.settleAt > 0 && sim.change < P.settleAt) ? settleRun + 1 : 0;
    if (settleRun >= 60){
      stop = P.boundary ? 'filled the boundary'
           : (sim.n < 200 ? 'stalled' : 'settled');
      break;
    }
  }

  const b = sim.bounds();
  const pad = Math.max(20, P.repulsionRadius * 0.5);
  const x0 = b.minX - pad, y0 = b.minY - pad;
  const w = (b.maxX - b.minX) + pad * 2, h = (b.maxY - b.minY) + pad * 2;
  const f = (v) => Math.round(v * 100) / 100;

  const style = STYLES[P.style] || STYLES.smooth;
  const unit = Math.max(w, h) / SIZE;
  const sink = svgSink();

  if (P.stackEvery){
    // replay, drawing a layer at each mark and keeping them all
    const replay = new Growth(JSON.parse(JSON.stringify(cfg)));
    let mark = 0;
    for (let i = 0; i < steps && mark < layers.length; i++){
      replay.step(null);
      if (replay.steps === layers[mark]){
        mark++;
        const fade = P.stackFade === undefined ? 0.55 : P.stackFade;
        const alpha = fade + (1 - fade) * (mark / layers.length);
        // a different random draw per layer, so stacked marks do not pile up
        // into tracks the way an identical draw repeated would
        style.render(sink, replay, Object.assign({}, P, { fillOn: false }), unit, alpha, replay.steps);
      }
    }
  }
  style.render(sink, sim, P, unit);

  // the page takes the shape of what grew, so a wide form is not letterboxed
  const outW = Math.round(w >= h ? SIZE : SIZE * (w / h));
  const outH = Math.round(h >= w ? SIZE : SIZE * (h / w));

  // a growth preset that has walls shows them, the way the app does, since the
  // whole point of that picture is what the walls did
  let guides = '';
  if (P.showConstraints){
    const poly = (pts) => pts.map((q, i) => `${i ? 'L' : 'M'} ${f(q[0])} ${f(q[1])}`).join(' ') + ' Z';
    const dash = Math.max(4, unit * 7);
    for (const g of [P.boundary, ...(P.obstacles || [])]){
      if (!g) continue;
      guides += `\n<path d="${poly(g)}" fill="none" stroke="#4ea3ff" stroke-opacity="0.75" `
             + `stroke-width="${(unit * 1.5).toFixed(2)}" stroke-dasharray="${dash.toFixed(1)} ${(dash * 0.8).toFixed(1)}"/>`;
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${outH}" `
    + `viewBox="${f(x0)} ${f(y0)} ${f(w)} ${f(h)}">
<rect x="${f(x0)}" y="${f(y0)}" width="${f(w)}" height="${f(h)}" fill="${P.bg}"/>
${sink.toString()}${guides}
</svg>\n`;

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const file = path.join(OUT, slug + '.svg');
  fs.writeFileSync(file, svg);
  console.log(`${name.padEnd(9)} ${String(sim.n).padStart(4)} nodes, `
    + `${sim.ranges.length} curve(s), ${steps} steps (${stop}) -> ${path.relative(__dirname, file)}`);
}
