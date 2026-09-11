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
  let steps = 0, stop = 'step limit';
  for (; steps < 4000; steps++){
    sim.step(null);
    if (P.stackEvery && steps % P.stackEvery === 0) layers.push(sim.steps);
    if (sim.unstable){ stop = 'unstable'; break; }
    if (sim.saturated){ stop = 'node budget'; break; }
    if (sim.steps - sim.lastGrowth > 150){
      stop = P.boundary ? 'filled the boundary' : 'stalled';
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
        style.render(sink, replay, Object.assign({}, P, { fillOn: false }), unit, alpha);
      }
    }
  }
  style.render(sink, sim, P, unit);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" `
    + `viewBox="${f(x0)} ${f(y0)} ${f(w)} ${f(h)}">
<rect x="${f(x0)}" y="${f(y0)}" width="${f(w)}" height="${f(h)}" fill="${P.bg}"/>
${sink.toString()}
</svg>\n`;

  const file = path.join(OUT, name.toLowerCase() + '.svg');
  fs.writeFileSync(file, svg);
  console.log(`${name.padEnd(9)} ${String(sim.n).padStart(4)} nodes, `
    + `${sim.ranges.length} curve(s), ${steps} steps (${stop}) -> ${path.relative(__dirname, file)}`);
}
