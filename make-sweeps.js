#!/usr/bin/env node
/**
 * Renders the parameter sweeps used in the README: one strip per control, the
 * same growth run four times with only that control changed. Re-run after
 * changing growth-core.js:
 *
 *   node make-sweeps.js && ./to-png.sh
 *
 * Every panel in a strip is drawn at one scale, framed to hold the largest of
 * them, so a control that changes the size of the form shows that rather than
 * having it normalised away. The baseline is deliberately small — 1600 nodes —
 * since the point is the difference between panels, not the detail in one.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { Growth, STYLES, svgSink } = require(path.join(__dirname, 'growth-core.js'));
const { BASE } = require(path.join(__dirname, 'presets.js'));

const OUT = path.join(__dirname, 'sweeps');
const PANEL = 250;          // output pixels per panel
const GAP = 10;
const CAP = 3000;           // step ceiling for one panel

const BASELINE = Object.assign({}, BASE, {
  seeds: [{ key: 'circle', dx: 0, dy: 0, rot: 0, scale: 1 }],
  seed: 10, maxNodes: 1600, strokeWidth: 2, follow: true,
});

/* Each sweep names a control, the values to try, and how to spell one in the
   panel label. `apply` is for the ones that are not a single key. */
const SWEEPS = [
  { file: 'repulsion-radius', key: 'repulsionRadius', label: 'Repulsion radius',
    values: [40, 65, 100, 150] },
  { file: 'max-edge', label: 'Max edge', values: [10, 16, 22, 26],
    apply: (P, v) => { P.maxEdge = v; P.minEdge = Math.max(4, Math.round(v * 0.7)); },
    spell: (v) => `${Math.max(4, Math.round(v * 0.7))}–${v}` },
  { file: 'attraction', key: 'attractionFactor', label: 'Attraction',
    values: [0.3, 0.6, 1, 2] },
  { file: 'repulsion-factor', key: 'repulsionFactor', label: 'Repulsion',
    values: [3, 8, 14, 20] },
  { file: 'alignment', key: 'alignmentFactor', label: 'Alignment',
    values: [0, 0.6, 1.2, 2] },
  { file: 'noise', key: 'noiseFactor', label: 'Noise', values: [0, 0.15, 0.4, 0.8] },
  // below about 0.3, and above about 28 on the edges, growth starves at these
  // forces: the panel comes out as a stalled forty-node blob rather than a form
  { file: 'damping', key: 'damping', label: 'Damping', values: [0.35, 0.5, 0.7, 0.9] },
  { file: 'smoothing', key: 'smoothing', label: 'Smoothing', values: [0, 0.25, 0.5, 0.75] },
  { file: 'repulsion-skip', key: 'repulsionSkip', label: 'Repulsion skip',
    values: [0, 1, 2, 4] },
  { file: 'node-budget', key: 'maxNodes', label: 'Node budget',
    values: [400, 1600, 4000, 9000] },
  /* How much of the seed survives is a question of how far the growth runs past
     it, not of the seed itself — so this is the same star at four sizes. */
  { file: 'seed-size', label: 'Seed size', values: [125, 250, 400, 600],
    apply: (P, v) => { P.seeds = [{ key: 'star', dx: 0, dy: 0, rot: 0, scale: 1 }];
                       P.startRadius = v; P.initialNodes = 58;
                       // a large start needs more line to fill out, or the last
                       // panels come out sparse and the comparison is unfair
                       P.maxNodes = 3200; },
    spell: (v) => `radius ${v}` },
  { file: 'seed-shape', label: 'Seed', values: ['circle', 'ring', 'star', 'square', 'line'],
    apply: (P, v) => {
      P.seeds = [{ key: v, dx: 0, dy: 0, rot: 0, scale: 1 }];
      // an open strand has no inside to fill
      if (v === 'line') P.fillOn = false;
    },
    spell: (v) => v },
];

function run(P){
  const sim = new Growth(P);
  let steps = 0, stop = 'step limit', settleRun = 0;
  for (; steps < CAP; steps++){
    sim.step(null);
    if (sim.unstable){ stop = 'unstable'; break; }
    if (sim.saturated && P.pauseAtBudget !== false){ stop = 'budget'; break; }
    settleRun = (P.settleAt > 0 && sim.change < P.settleAt) ? settleRun + 1 : 0;
    if (settleRun >= 60){ stop = 'settled'; break; }
  }
  return { sim, steps, stop };
}

fs.mkdirSync(OUT, { recursive: true });

for (const sw of SWEEPS){
  const panels = sw.values.map((v) => {
    const P = JSON.parse(JSON.stringify(BASELINE));
    if (sw.apply) sw.apply(P, v); else P[sw.key] = v;
    return Object.assign({ P, v }, run(P));
  });

  // one world window for the whole strip, square so no panel is stretched
  let half = 0;
  for (const p of panels){
    const b = p.sim.bounds();
    half = Math.max(half, Math.abs(b.minX), Math.abs(b.maxX), Math.abs(b.minY), Math.abs(b.maxY));
  }
  half *= 1.06;
  const unit = (half * 2) / PANEL;

  let body = '', report = [];
  panels.forEach((p, i) => {
    const sink = svgSink();
    STYLES.smooth.render(sink, p.sim, p.P, unit);
    const x = i * (PANEL + GAP);
    const spell = sw.spell ? sw.spell(p.v) : String(p.v);
    body += `<g transform="translate(${x},0)">`
         +  `<rect width="${PANEL}" height="${PANEL}" fill="${p.P.bg}"/>`
         +  `<g transform="scale(${PANEL / (half * 2)}) translate(${half},${half})">${sink.toString()}</g>`
         +  `<text x="8" y="${PANEL - 9}" font-family="ui-monospace,monospace" font-size="13" `
         +  `fill="#555">${spell}</text></g>`;
    report.push(`${spell}:${p.sim.n}n/${p.steps}s/${p.stop}`);
  });

  const w = panels.length * PANEL + (panels.length - 1) * GAP;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${PANEL}" `
    + `viewBox="0 0 ${w} ${PANEL}">\n<rect width="${w}" height="${PANEL}" fill="#ffffff"/>\n`
    + body + `\n</svg>\n`;
  const file = path.join(OUT, sw.file + '.svg');
  fs.writeFileSync(file, svg);
  console.log(`${sw.label.padEnd(16)} ${report.join('  ')}`);
}
