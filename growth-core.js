"use strict";
/* ============================================================================
   Differential Growth — real-time port of DiffGrowth03/growth1.py
   Per step:  attraction(neighbours) + repulsion(all within radius) + noise
              -> alignment(to neighbour midpoint) -> integrate -> split edges
   Velocity accumulates with damping exactly as Node.add_force() does, and is
   zeroed on integration exactly as Node.update_position() does.
   The O(n^2) repulsion of the original is replaced by a uniform-grid
   neighbour search so thousands of nodes stay interactive.
============================================================================ */

/* ---------- deterministic RNG (so a seed reproduces a design) ---------- */
function mulberry32(a){
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* A seed traced by hand. The browser keeps a library of them and names the
   shape "drawn:<id>"; the command line passes a single one as --seed-path with
   --shape drawn / drawn-line. Both forms resolve here. */
function resolveDrawn(p){
  const sh = p.shape || '';
  if (sh.startsWith('drawn:')){
    const id = sh.slice(6);
    const e = (p.drawnShapes || []).find(d => d.id === id);
    return e ? { pts: e.pts, closed: e.closed } : null;
  }
  if (sh === 'drawn')     return p.drawnClosed ? { pts: p.drawnClosed, closed: true } : null;
  if (sh === 'drawnLine') return p.drawnOpen   ? { pts: p.drawnOpen,   closed: false } : null;
  return null;
}

/* A seed is a shape placed somewhere: which shape, and where/how big/what
   angle. Older settings stored a bare list of shape names, which is read as
   instances with no transform — and, if several were built-in shapes that would
   otherwise land on top of each other, laid out in a row as they used to be. */
/* ---- tiling -----------------------------------------------------------------
   A field of seeds laid out from parameters rather than placed by hand. The
   result is an ordinary seed list, so repulsion between curves, saving and the
   render styles all work on it unchanged, and because it is derived rather than
   stored, changing a number relays the whole field.

   Distances are in multiples of the seed radius and written out in world units,
   which is what an instance's dx/dy mean. Sizes are a scale on the same radius.

   The spiral and scatter layouts are adapted from the shape studies in Jason
   Webb's 2d-differential-growth-experiments. */

const TILE_SHAPES = ['circle', 'ring', 'star', 'square', 'line'];

/* Rows and columns, optionally shaken off the lattice. The shake is a fraction
   of the room actually left between two tiles, not of the spacing: two seeds
   that start out overlapping do not grow into two cells, they knot, and a
   jitter measured against the spacing walks them into each other as soon as the
   tiles are anywhere near as wide as the gap. Widen the spacing to buy more
   shake. */
function gridTiles(p, R, rnd, hi){
  const rows = Math.max(1, p.tileRows | 0), cols = Math.max(1, p.tileCols | 0);
  const gap = (p.tileGap === undefined ? 0.85 : p.tileGap);
  const room = Math.max(0, (gap - 2 * hi) / 2);
  const jit = (p.tileJitter === undefined ? 0 : p.tileJitter) * room;
  const out = [];
  for (let r = 0; r < rows; r++){
    for (let c = 0; c < cols; c++){
      const x = (c - (cols - 1) / 2) * gap + (rnd() * 2 - 1) * jit;
      const y = (r - (rows - 1) / 2) * gap + (rnd() * 2 - 1) * jit;
      out.push({ x, y });
    }
  }
  return out;
}

/* A turn of the given angle between one seed and the next, with the radius
   going as the square root of the index so the disc fills evenly. At 137.5
   degrees that is phyllotaxis; anything else spirals, spokes or rosettes. */
function spiralTiles(p, R, rnd){
  const count = Math.max(1, p.tileCount | 0);
  const spread = p.tileSpread === undefined ? 5 : p.tileSpread;
  const hole = p.tileHole === undefined ? 0.3 : p.tileHole;
  const turn = (p.tileTurn === undefined ? 137.5 : p.tileTurn) * Math.PI / 180;
  const out = [];
  for (let i = 1; i <= count; i++){
    const r = Math.sqrt(i / count) * spread;
    if (r < hole * spread) continue;
    const a = i * turn;
    out.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return out;
}

/* Dropped at random and kept only where nothing already placed is in the way.
   The test compares circumscribed circles rather than the shapes themselves,
   which leaves a little air around a triangle — no bad thing, since two seeds
   that start out touching grow as one curve. */
function scatterTiles(p, R, rnd, sized){
  const count = Math.max(1, p.tileCount | 0);
  const field = p.tileSpread === undefined ? 4.2 : p.tileSpread;
  const gap = p.tileGap === undefined ? 0.1 : p.tileGap;
  const out = [];
  let tries = 0;
  while (out.length < count && tries < count * 400){
    tries++;
    // uniform over the disc, not over the radius
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * field;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    const s = sized();
    let clear = true;
    for (const e of out){
      if (Math.hypot(e.x - x, e.y - y) < e.s + s + gap){ clear = false; break; }
    }
    if (clear) out.push({ x, y, s });
  }
  return out;
}

function tileSeeds(p){
  const mode = p.tileMode;
  if (!mode || mode === 'none') return null;
  const R = p.startRadius || 125;
  // its own stream, so laying out a field never shifts the growth's own randoms
  const rnd = mulberry32(((p.seed >>> 0) ^ 0x632be59b) >>> 0);
  const lo = p.tileScaleMin === undefined ? 0.3 : p.tileScaleMin;
  const hi = Math.max(lo, p.tileScaleMax === undefined ? 0.3 : p.tileScaleMax);
  const sized = () => lo + rnd() * (hi - lo);
  const spin = p.tileSpin === undefined ? 0 : p.tileSpin;

  const spots = mode === 'grid'    ? gridTiles(p, R, rnd, hi)
              : mode === 'spiral'  ? spiralTiles(p, R, rnd)
              : mode === 'scatter' ? scatterTiles(p, R, rnd, sized)
              : null;
  if (!spots) return null;

  const mixed = p.tileShape === 'mixed';
  const kinds = [3, 4, 24];
  return spots.map((q) => {
    const s = q.s === undefined ? sized() : q.s;
    return {
      key: mixed ? 'ring' : (p.tileShape || 'ring'),
      dx: q.x * R, dy: q.y * R,
      rot: spin ? (rnd() * 2 - 1) * spin : 0,
      scale: s,
      sides: mixed ? kinds[(rnd() * kinds.length) | 0] : undefined,
    };
  });
}

function normaliseSeeds(p){
  // a tiled field is derived from its parameters, so it wins over the list
  const tiled = tileSeeds(p);
  const raw = tiled || p.seeds;
  if (!Array.isArray(raw)) return [{ key: p.shape, dx: 0, dy: 0, rot: 0, scale: 1 }];

  const legacy = !tiled && raw.length > 0 && raw.every(e => typeof e === 'string');
  const list = raw.map(e => typeof e === 'string'
    ? { key: e, dx: 0, dy: 0, rot: 0, scale: 1 }
    : { key: e.key, dx: e.dx || 0, dy: e.dy || 0,
        rot: e.rot || 0, scale: e.scale === undefined ? 1 : e.scale,
        sides: e.sides });

  if (legacy){
    const builtIn = list.filter(e => !resolveDrawn({ ...p, shape: e.key }));
    if (builtIn.length > 1){
      const gap = p.startRadius * 2.6;
      builtIn.forEach((e, i) => { e.dx = (i - (builtIn.length - 1) / 2) * gap; });
    }
  }
  return list;
}

/* Scale and rotate about the shape's own centre, then move it. Doing it about
   the centre is what makes dragging and rotating behave the way they look. */
function transformPts(pts, inst){
  const rot = (inst.rot || 0) * Math.PI / 180;
  const sc = inst.scale === undefined ? 1 : inst.scale;
  if (!rot && sc === 1 && !inst.dx && !inst.dy) return pts.map(q => [q[0], q[1]]);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const q of pts){
    if (q[0] < minX) minX = q[0]; if (q[0] > maxX) maxX = q[0];
    if (q[1] < minY) minY = q[1]; if (q[1] > maxY) maxY = q[1];
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const co = Math.cos(rot), si = Math.sin(rot);
  return pts.map(q => {
    const ux = (q[0] - cx) * sc, uy = (q[1] - cy) * sc;
    return [cx + ux * co - uy * si + inst.dx, cy + ux * si + uy * co + inst.dy];
  });
}

class Growth {
  constructor(p){
    this.p = p;
    this.cap = 1024;
    this.x  = new Float64Array(this.cap);
    this.y  = new Float64Array(this.cap);
    this.vx = new Float64Array(this.cap);
    this.vy = new Float64Array(this.cap);
    this.bx = new Float64Array(this.cap);   // scratch for edge splitting
    this.by = new Float64Array(this.cap);
    this.bvx= new Float64Array(this.cap);
    this.bvy= new Float64Array(this.cap);
    this.fx = new Float64Array(this.cap);   // force accumulators
    this.fy = new Float64Array(this.cap);
    this.cid = new Int32Array(this.cap);    // which curve each node belongs to
    this.bcid = new Int32Array(this.cap);

    /* Lineage: where each node stood at the end of the last step, carried
       through splits so that a node created this step starts from wherever its
       left-hand parent was. Drawing those segments traces the history of the
       curve rather than its shape — one thread per node, branching at every
       split. Off unless a style asks for it, since it doubles the per-node
       arrays and the bookkeeping through split and prune. */
    this.px = new Float64Array(this.cap);
    this.py = new Float64Array(this.cap);
    this.bpx = new Float64Array(this.cap);
    this.bpy = new Float64Array(this.cap);
    /* Thinning the threads has to pick the same ones every step or they flicker
       in and out as splitting shifts the indices around them, so each node
       carries an id that never changes once it is born. */
    this.nid = new Int32Array(this.cap);
    this.bnid = new Int32Array(this.cap);
    this.nextId = 0;
    /* Descent mode marks a node drawn or not at birth instead of deriving it
       from the id, so that a new thread can only fork off one that is itself
       drawn. That makes the picture a single connected tree rooted in the seed,
       where sampling by id scatters the kept threads and most of them sprout
       from a parent that was never drawn. */
    this.drw = new Uint8Array(this.cap);
    this.bdrw = new Uint8Array(this.cap);
    this.recruit = 0;
    /* Steps since this node last branched. A thread can be drawn fading out
       over that count, so it is bright where the curve is still gaining points
       and gone where it has stopped. */
    this.age = new Int32Array(this.cap);
    this.bage = new Int32Array(this.cap);
    /* One random number per branch, redrawn at every fork, so a branch can be
       tinted as a whole rather than segment by segment. */
    this.tint = new Float32Array(this.cap);
    this.btint = new Float32Array(this.cap);
    this.moves = [];                       // x0,y0,x1,y1 … since last consumed
    this.ranges = [];
    this.n = 0;
    this.steps = 0;
    this.saturated = false;
    this.cellStart = new Int32Array(1);
    this.items     = new Int32Array(1);
    this.reset();
  }

  /* ---- storage ---- */
  grow(need){
    if (need <= this.cap) return;
    let c = this.cap; while (c < need) c *= 2;
    const cp = (src) => { const a = new Float64Array(c); a.set(src.subarray(0, this.n)); return a; };
    this.x = cp(this.x); this.y = cp(this.y); this.vx = cp(this.vx); this.vy = cp(this.vy);
    this.bx = new Float64Array(c); this.by = new Float64Array(c);
    this.bvx = new Float64Array(c); this.bvy = new Float64Array(c);
    this.fx = new Float64Array(c); this.fy = new Float64Array(c);
    const ci = new Int32Array(c); ci.set(this.cid.subarray(0, this.n)); this.cid = ci;
    this.bcid = new Int32Array(c);
    this.px = cp(this.px); this.py = cp(this.py);
    this.bpx = new Float64Array(c); this.bpy = new Float64Array(c);
    const ni = new Int32Array(c); ni.set(this.nid.subarray(0, this.n)); this.nid = ni;
    this.bnid = new Int32Array(c);
    const dw = new Uint8Array(c); dw.set(this.drw.subarray(0, this.n)); this.drw = dw;
    this.bdrw = new Uint8Array(c);
    const ag = new Int32Array(c); ag.set(this.age.subarray(0, this.n)); this.age = ag;
    this.bage = new Int32Array(c);
    const tn = new Float32Array(c); tn.set(this.tint.subarray(0, this.n)); this.tint = tn;
    this.btint = new Float32Array(c);
    this.cap = c;
  }

  /* ---- seed shape ---- */
  reset(){
    const p = this.p;
    this.rnd = mulberry32(p.seed >>> 0);
    // off while the seed is subdivided below, or the tree would open with a
    // burst of branches that belong to setting up rather than to growing
    this.tracking = false;
    this.moves = [];
    this.trnd = mulberry32(((p.seed >>> 0) ^ 0x5bf03635) >>> 0);
    const curves = this.seedCurves();

    let total = 0;
    for (const c of curves) total += c.pts.length;
    this.grow(total + 8);
    this.ranges = [];
    let m = 0;
    for (const c of curves){
      const s0 = m;
      for (const q of c.pts){
        this.x[m] = q[0]; this.y[m] = q[1];
        this.vx[m] = 0; this.vy[m] = 0;
        this.cid[m] = this.ranges.length;
        m++;
      }
      this.ranges.push({ s: s0, e: m, closed: c.closed });
    }
    this.n = m;

    // Subdivide each seed down to the working edge length before starting.
    // A 10-gon at radius 125 has ~78 unit edges: far above min-edge, so the
    // outline would simply contract instead of growing. DifferentialGrowth.py
    // sized its seed the same way, from point spacing rather than count.
    for (let k = 0; k < 14; k++){
      const before = this.n;
      this.splitEdges();
      if (this.n === before) break;
    }
    this.applyBarriers();

    // every thread starts where its node stands on the finished seed outline
    // a history style needs the shadow kept; nothing else pays for it
    this.tracking = !!(p.trackLineage || (STYLES[p.style] && STYLES[p.style].needsHistory));
    this.nextId = 0;
    if (this.tracking){
      this.px.set(this.x.subarray(0, this.n));
      this.py.set(this.y.subarray(0, this.n));
      const keep0 = Math.max(1, Math.round(p.lnKeep === undefined ? 1 : p.lnKeep));
      this.recruit = 0;
      for (let i = 0; i < this.n; i++){
        this.nid[i] = this.nextId++;
        this.drw[i] = (i % keep0 === 0) ? 1 : 0;
        this.age[i] = 0;
        this.tint[i] = this.trnd();
      }
    }

    this.steps = 0;
    this.lastGrowth = 0;
    this.motion = 1;                 // "still moving" until measured otherwise
    this.change = 1;                 // and still changing shape
    this.lenRing = new Float64Array(120);
    this.lenAt = 0;
    this.saturated = false;
    this.unstable = false;
  }

  /* Every seed this run starts from. More than one grows as separate curves
     that never join, but that do repel each other, so they compete for the
     same space. An empty list is a blank canvas: nothing grows until a shape
     is added. */
  seedCurves(){
    const p = this.p;
    const out = [];
    for (const inst of normaliseSeeds(p)){
      const drawn = resolveDrawn({ ...p, shape: inst.key });
      const base = (drawn && drawn.pts.length >= 3)
        ? { pts: drawn.pts, closed: drawn.closed }
        : this.builtInSeed(inst.key, 0, 0, p.startRadius, inst.sides);
      out.push({ pts: transformPts(base.pts, inst), closed: base.closed });
    }
    return out;
  }

  builtInSeed(shape, cx, cy, R, sides){
    // an arrangement gives each shape its own corner count; otherwise they all
    // take the one from the panel
    const count = Math.max(3, (sides || this.p.initialNodes) | 0);
    const rr = (a, b) => a + this.rnd() * (b - a);
    const pts = [];

    if (shape === 'line'){
      // open strand: a slightly wobbly horizontal segment
      const len = R * 2.4;
      for (let i = 0; i < count; i++){
        const t = count === 1 ? 0 : i / (count - 1);
        pts.push([cx - len / 2 + t * len, cy + rr(-R * 0.03, R * 0.03)]);
      }
      return { pts, closed: false };
    }

    for (let i = 0; i < count; i++){
      const a = (2 * Math.PI * i) / count;
      let r = R;
      if (shape === 'circle')      r = R * (1 + rr(-0.3, 0.3));          // growth1.py
      else if (shape === 'ring')   r = R;                                 // clean circle
      else if (shape === 'star')   r = R * (0.55 + 0.45 * Math.cos(a * 5));
      else if (shape === 'square'){
        const c4 = Math.cos(a), s4 = Math.sin(a);
        r = R / Math.max(Math.abs(c4), Math.abs(s4));
      }
      const jit = shape === 'ring' ? 0 : R * 0.04;
      pts.push([cx + r * Math.cos(a) + rr(-jit, jit),
                cy + r * Math.sin(a) + rr(-jit, jit)]);
    }
    return { pts, closed: true };
  }

  /* the first curve's topology, for callers that only care about one */
  get closed(){
    return this.ranges && this.ranges.length ? this.ranges[0].closed : true;
  }

  /* ---- uniform grid over the nodes, cell size = repulsion radius ---- */
  buildGrid(cell){
    const n = this.n, x = this.x, y = this.y;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < n; i++){
      if (x[i] < minX) minX = x[i]; if (x[i] > maxX) maxX = x[i];
      if (y[i] < minY) minY = y[i]; if (y[i] > maxY) maxY = y[i];
    }
    let cols = Math.floor((maxX - minX) / cell) + 1;
    let rows = Math.floor((maxY - minY) / cell) + 1;
    // keep the grid from exploding if the radius is tiny relative to the extent
    while (cols * rows > 1 << 21){ cell *= 2; cols = Math.floor((maxX-minX)/cell)+1; rows = Math.floor((maxY-minY)/cell)+1; }

    const nc = cols * rows;
    if (this.cellStart.length < nc + 1) this.cellStart = new Int32Array(nc + 1);
    if (this.items.length < n) this.items = new Int32Array(n);
    const start = this.cellStart, items = this.items;
    start.fill(0, 0, nc + 1);

    const cellOf = (i) => {
      const cxi = Math.min(cols - 1, Math.floor((x[i] - minX) / cell));
      const cyi = Math.min(rows - 1, Math.floor((y[i] - minY) / cell));
      return cyi * cols + cxi;
    };
    for (let i = 0; i < n; i++) start[cellOf(i) + 1]++;
    for (let c = 0; c < nc; c++) start[c + 1] += start[c];
    if (!this.cursor || this.cursor.length < nc) this.cursor = new Int32Array(nc);
    const cursor = this.cursor; cursor.fill(0, 0, nc);
    for (let i = 0; i < n; i++){ const c = cellOf(i); items[start[c] + cursor[c]++] = i; }

    this.g = { cell, cols, rows, minX, minY, nc };
  }

  /* ---- forces + integration + growth (one simulation step) ---- */
  step(brush){
    if (this.n === 0) return;      // blank canvas

    const p = this.p, n = this.n, x = this.x, y = this.y, vx = this.vx, vy = this.vy;
    const ranges = this.ranges, cid = this.cid;
    const minE = p.minEdge, R = p.repulsionRadius, damp = p.damping;
    const attF = p.attractionFactor, repF = p.repulsionFactor, noise = p.noiseFactor;
    const rnd = this.rnd;

    this.buildGrid(R);
    const { cell, cols, rows, minX, minY } = this.g;
    const start = this.cellStart, items = this.items;

    const fx = this.fx, fy = this.fy;
    fx.fill(0, 0, n); fy.fill(0, 0, n);

    /* --- 1a. attraction along the path, toward prev and next node --- */
    for (const rg of ranges){
    for (let i = rg.s; i < rg.e; i++){
      const xi = x[i], yi = y[i];
      const prev = i > rg.s ? i - 1 : (rg.closed ? rg.e - 1 : -1);
      const next = i < rg.e - 1 ? i + 1 : (rg.closed ? rg.s : -1);
      for (let k = 0; k < 2; k++){
        const j = k ? next : prev;
        if (j < 0) continue;
        const dx = x[j] - xi, dy = y[j] - yi;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > minE){
          const f = (d - minE) * attF / d;
          fx[i] += dx * f; fy[i] += dy * f;
        }
      }
    }
    }

    /* --- 1b. repulsion, visiting every close pair once (forces are equal
               and opposite, so each pair costs one distance computation) --- */
    const R2 = R * R, invR = 1 / R;
    // Excluding path neighbours only works when the repulsion radius still
    // reaches past them. Below that the curve loses its drive and stops
    // growing, so the request is capped at what the parameters can afford.
    const skip = Math.max(0, Math.min(p.repulsionSkip | 0,
                                      Math.floor(R / p.maxEdge) - 3));
    /* Repulsion can be graded by how far apart two nodes are along the path
       rather than only by how far apart they are in space. Skip is the blunt
       version of the same idea — ignore everything within N — and this is the
       ramp: nothing at zero separation, full strength at `ramp` nodes apart,
       so a fold meeting another fold pushes at full force while a node and its
       near neighbours barely push at all. The folds stand off each other and
       the line itself stays free to bend. Off at 0, and it only means anything
       within one curve. */
    const ramp = Math.max(0, p.repulsionRamp | 0);
    const NBX = Growth.NBX, NBY = Growth.NBY;
    for (let cy = 0; cy < rows; cy++){
      for (let cx = 0; cx < cols; cx++){
        const c = cy * cols + cx, s0 = start[c], e0 = start[c + 1];
        if (s0 === e0) continue;
        for (let k = 0; k < 5; k++){
          const gx = cx + NBX[k], gy = cy + NBY[k];
          if (gx < 0 || gx >= cols || gy >= rows) continue;
          const c2 = gy * cols + gx, same = c2 === c;
          const s1 = start[c2], e1 = start[c2 + 1];
          if (s1 === e1) continue;
          for (let a = s0; a < e0; a++){
            const i = items[a], xi = x[i], yi = y[i];
            for (let b = same ? a + 1 : s1; b < e1; b++){
              const j = items[b];
              let grade = 1;
              if ((skip > 0 || ramp > 0) && cid[i] === cid[j]){
                // nodes this close along the path are governed by attraction;
                // repelling them too is what drives the sawtooth buckling.
                // "Close along the path" only means anything within one curve.
                const rg2 = ranges[cid[i]];
                const len2 = rg2.e - rg2.s;
                let di = i - j; if (di < 0) di = -di;
                if (rg2.closed && di > (len2 >> 1)) di = len2 - di;
                if (di <= skip) continue;
                if (ramp > 0 && di < ramp) grade = di / ramp;
              }
              const dx = x[j] - xi, dy = y[j] - yi;
              const d2 = dx * dx + dy * dy;
              if (d2 < R2 && d2 > 0){
                const d = Math.sqrt(d2);
                const f = (1 - d * invR) * repF * grade / d;
                const ax = dx * f, ay = dy * f;
                fx[i] -= ax; fy[i] -= ay;
                fx[j] += ax; fy[j] += ay;
              }
            }
          }
        }
      }
    }

    /* --- 1b2. the same repulsion, but from the walls. Each wall sample acts
               exactly like a node would, so the curve keeps its usual distance
               from a boundary instead of flattening against it. --- */
    const wallF = repF * p.wallRepulsion;
    if (wallF > 0){
      this.syncBarriers();
      const walls = [];
      if (this.boundary) walls.push(this.boundary);
      for (const o of this.obstacles) walls.push(o);
      for (const w of walls){
        w.prepareField(p.minEdge, R);
        const g = w.fieldGrid, field = w.field;
        for (let i = 0; i < n; i++){
          const xi = x[i], yi = y[i];
          const gcx = Math.floor((xi - g.minX) / g.cell);
          const gcy = Math.floor((yi - g.minY) / g.cell);
          for (let gy = Math.max(0, gcy - 1); gy <= Math.min(g.rows - 1, gcy + 1); gy++){
            for (let gx = Math.max(0, gcx - 1); gx <= Math.min(g.cols - 1, gcx + 1); gx++){
              const list = g.buckets[gy * g.cols + gx];
              if (!list) continue;
              for (let s = 0; s < list.length; s++){
                const q = field[list[s]];
                const dx = q[0] - xi, dy = q[1] - yi;
                const d2 = dx * dx + dy * dy;
                if (d2 < R2 && d2 > 0){
                  const d = Math.sqrt(d2);
                  const f = (1 - d * invR) * wallF / d;
                  fx[i] -= dx * f; fy[i] -= dy * f;
                }
              }
            }
          }
        }
      }
    }

    /* --- 1c. noise, cursor brush, then damped accumulation into velocity --- */
    for (let i = 0; i < n; i++){
      let ax = fx[i], ay = fy[i];
      if (noise > 0){
        ax += (rnd() * 2 - 1) * noise;
        ay += (rnd() * 2 - 1) * noise;
      }
      if (brush){
        const dx = x[i] - brush.x, dy = y[i] - brush.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < brush.r && d > 0.0001){
          const f = (1 - d / brush.r) * brush.strength / d;
          ax += dx * f; ay += dy * f;
        }
      }
      vx[i] = (vx[i] + ax) * damp;
      vy[i] = (vy[i] + ay) * damp;
    }

    /* --- 2. alignment toward the midpoint of the two neighbours --- */
    const alF = p.alignmentFactor;
    if (alF !== 0){
      for (const rg of ranges)
      for (let i = rg.s; i < rg.e; i++){
        const prev = i > rg.s ? i - 1 : (rg.closed ? rg.e - 1 : -1);
        const next = i < rg.e - 1 ? i + 1 : (rg.closed ? rg.s : -1);
        if (prev < 0 || next < 0) continue;
        const mx = (x[prev] + x[next]) / 2, my = (y[prev] + y[next]) / 2;
        vx[i] = (vx[i] + (mx - x[i]) * alF) * damp;
        vy[i] = (vy[i] + (my - y[i]) * alF) * damp;
      }
    }

    /* --- 3. integrate (velocity is consumed, as in update_position).
             A node may never travel further than one max edge in a step:
             without this, an over-driven parameter set runs away to NaN. --- */
    // A step longer than the barrier clearance could jump the wall outright,
    // so the cap tightens whenever a barrier is in play.
    this.syncBarriers();
    const wall = this.boundary || this.obstacles.length;
    const lim = wall ? Math.min(p.maxEdge, this.barMargin * 0.8) : p.maxEdge;
    const lim2 = lim * lim;
    let travelled = 0;
    for (let i = 0; i < n; i++){
      let dx = vx[i], dy = vy[i];
      const m2 = dx * dx + dy * dy;
      if (!(m2 < 1e12)){ this.unstable = true; dx = dy = 0; }
      else if (m2 > lim2){ const k = lim / Math.sqrt(m2); dx *= k; dy *= k; }
      x[i] += dx; y[i] += dy;
      travelled += Math.sqrt(dx * dx + dy * dy);
      vx[i] = 0; vy[i] = 0;
    }

    /* How much the outline moved this step, as a fraction of an edge, so the
       number means the same thing whatever scale the form is at. Smoothed over
       several steps: a single frame is too noisy to decide anything on, since
       the noise force alone keeps every node twitching. */
    const inst = n ? (travelled / n) / Math.max(1e-6, minE) : 0;
    this.motion = this.steps < 2 ? inst : this.motion * 0.85 + inst * 0.15;

    /* --- 4. optional Laplacian smoothing, applied to positions rather than
             through the velocity accumulator. The alignment force shares the
             damped velocity with repulsion and so partly cancels itself;
             this pass is a direct low-pass and is stable for weight < 1,
             which is what actually suppresses per-node scalloping. --- */
    const lam = p.smoothing;
    if (lam > 0 && n > 4){
      // Taubin's lambda/mu pair: a positive smoothing pass followed by a
      // slightly larger negative one. Plain Laplacian smoothing shrinks the
      // curve, and here shrinkage eats the very length growth depends on;
      // the mu pass pushes the low frequencies back out, so only the
      // per-node wobble is removed.
      const mu = 1 / (0.1 - 1 / lam);
      for (let pass = 0; pass < 2; pass++){
        const w = pass ? mu : lam;
        const sx = fx, sy = fy;               // force arrays are free again
        for (const rg of ranges)
        for (let i = rg.s; i < rg.e; i++){
          const prev = i > rg.s ? i - 1 : (rg.closed ? rg.e - 1 : -1);
          const next = i < rg.e - 1 ? i + 1 : (rg.closed ? rg.s : -1);
          if (prev < 0 || next < 0){ sx[i] = x[i]; sy[i] = y[i]; continue; }
          sx[i] = x[i] + ((x[prev] + x[next]) / 2 - x[i]) * w;
          sy[i] = y[i] + ((y[prev] + y[next]) / 2 - y[i]) * w;
        }
        for (let i = 0; i < n; i++){ x[i] = sx[i]; y[i] = sy[i]; }
      }
    }

    this.splitEdges();
    if (p.pruneShort) this.pruneEdges();
    this.applyBarriers();

    /* How much the outline changed, as the relative change in its total length.
       Raw movement is no good for this: a heavily damped run creeps along at a
       hundredth the speed of a lively one while still growing perfectly well,
       so any fixed threshold on speed would call it finished immediately.
       Length says whether the shape is still getting anywhere. Splitting an
       edge does not change it, so what it measures is the outline spreading. */
    let len = 0;
    for (const rg of this.ranges){
      const last = rg.closed ? rg.e : rg.e - 1;
      for (let i = rg.s; i < last; i++){
        const j = (i + 1 < rg.e) ? i + 1 : rg.s;
        len += Math.hypot(this.x[j] - this.x[i], this.y[j] - this.y[i]);
      }
    }
    /* Measured over a window rather than a single step: a slow configuration
       adds a ten-thousandth of its length per step while filling perfectly
       well, which is indistinguishable from nothing. Over a hundred steps the
       difference between creeping and finished is plain. */
    /* One segment per node, from where it stood to where it stands. A node born
       this step starts at its parent, so that segment is the fork. The consumer
       empties this; nothing accumulates if nobody is looking. */
    if (this.tracking){
      const mv = this.moves, X = this.x, Y = this.y, PX = this.px, PY = this.py;
      /* Thinning drops threads from the drawing, never from the record: every
         shadow still follows its node, because a node born later inherits its
         parent's and a stale one would draw its branch from where that parent
         stood some hundreds of steps ago. */
      const keep = Math.max(1, Math.round(p.lnKeep === undefined ? 1 : p.lnKeep));
      const tree = p.lnMode === 'descent';
      const over = Math.max(0, Math.round(p.lnFade === undefined ? 0 : p.lnFade));
      /* How far a segment is through its branch, 1 at the fork and 0 at the end
         of the span. Tapering wants this whether or not the opacity fades, so
         when there is no fade the span falls back to a fixed reference. */
      const span = over > 0 ? over : 60;
      const ids = this.nid, dw = this.drw, ag = this.age, tn = this.tint;
      for (let i = 0; i < this.n; i++){
        const on = keep === 1 ? true : (tree ? dw[i] === 1 : ids[i] % keep === 0);
        if (on){
          const fresh = Math.max(0, 1 - ag[i] / span);
          // only the fade drops a thread entirely; a taper runs out to its end
          if (over === 0 || fresh > 0) mv.push(PX[i], PY[i], X[i], Y[i], fresh, tn[i]);
        }
        PX[i] = X[i]; PY[i] = Y[i];
        ag[i]++;
      }
    }

    const W = this.lenRing.length;
    const old = this.lenRing[this.lenAt];
    this.lenRing[this.lenAt] = len;
    this.lenAt = (this.lenAt + 1) % W;
    this.change = (this.steps >= W && old > 0) ? Math.abs(len - old) / len : 1;

    this.steps++;
  }

  /* ---- keep every node inside the boundary and out of the obstacles ----
       Runs last, so nodes created by splitting this step are corrected in the
       same step rather than a frame late. */
  syncBarriers(){
    const p = this.p;
    const margin = Math.max(1.5, p.minEdge * 0.5);
    this.barMargin = margin;
    const key = JSON.stringify([p.boundary, p.obstacles, margin]);
    if (key === this._barKey) return;
    this._barKey = key;
    this.boundary = p.boundary && p.boundary.length > 2
      ? new Barrier(p.boundary, margin) : null;
    this.obstacles = (p.obstacles || [])
      .filter(o => o && o.length > 2)
      .map(o => new Barrier(o, margin));
  }

  applyBarriers(){
    if (this.n === 0) return;
    this.syncBarriers();
    if (!this.boundary && !this.obstacles.length) return;
    const x = this.x, y = this.y, n = this.n;
    for (let i = 0; i < n; i++){
      if (this.boundary){
        const r = this.boundary.resolve(x[i], y[i], true);
        if (r){ x[i] = r[0]; y[i] = r[1]; }
      }
      for (let k = 0; k < this.obstacles.length; k++){
        const r = this.obstacles[k].resolve(x[i], y[i], false);
        if (r){ x[i] = r[0]; y[i] = r[1]; }
      }
    }
  }

  /* how many nodes start out on the wrong side of a barrier */
  seedViolations(){
    this.syncBarriers();
    let bad = 0;
    for (let i = 0; i < this.n; i++){
      if (this.boundary && !this.boundary.inside(this.x[i], this.y[i])){ bad++; continue; }
      for (const o of this.obstacles)
        if (o.inside(this.x[i], this.y[i])){ bad++; break; }
    }
    return bad;
  }

  /* ---- insert a node in the middle of any edge longer than maxEdge ----
       Curves stay contiguous in the arrays and keep their order, so the ranges
       can simply be rebuilt as we go. */
  splitEdges(){
    const n = this.n, lim = this.p.maxNodes;
    if (n === 0) return;
    if (n >= lim){ this.saturated = true; return; }
    this.saturated = false;

    this.grow(n * 2 + 4);
    const x = this.x, y = this.y, vx = this.vx, vy = this.vy, cid = this.cid;
    const bx = this.bx, by = this.by, bvx = this.bvx, bvy = this.bvy, bcid = this.bcid;
    const track = this.tracking;
    const px = this.px, py = this.py, bpx = this.bpx, bpy = this.bpy;
    const nid = this.nid, bnid = this.bnid;
    const drw = this.drw, bdrw = this.bdrw;
    const age = this.age, bage = this.bage;
    const tint = this.tint, btint = this.btint;
    const keep = Math.max(1, Math.round(this.p.lnKeep === undefined ? 1 : this.p.lnKeep));
    const maxE = this.p.maxEdge, maxE2 = maxE * maxE;
    const rnd = this.rnd, jit = this.p.splitJitter;
    const ranges = this.ranges, out = [];
    let m = 0, split = false;

    for (let c = 0; c < ranges.length; c++){
      const rg = ranges[c];
      const start = m;
      const last = rg.closed ? rg.e : rg.e - 1;
      for (let i = rg.s; i < rg.e; i++){
        bx[m] = x[i]; by[m] = y[i]; bvx[m] = vx[i]; bvy[m] = vy[i]; bcid[m] = c;
        // the first of the two keeps the identity, and the thread with it
        if (track){ bpx[m] = px[i]; bpy[m] = py[i]; bnid[m] = nid[i]; bdrw[m] = drw[i];
                    bage[m] = age[i]; btint[m] = tint[i]; }
        const mine = m;
        m++;
        if (i < last && m < lim){
          const j = (i + 1 < rg.e) ? i + 1 : rg.s;
          const dx = x[j] - x[i], dy = y[j] - y[i];
          if (dx * dx + dy * dy > maxE2){
            bx[m] = (x[i] + x[j]) / 2 + (rnd() * 2 - 1) * jit;
            by[m] = (y[i] + y[j]) / 2 + (rnd() * 2 - 1) * jit;
            bvx[m] = 0; bvy[m] = 0; bcid[m] = c;
            // born here, so its thread starts where its left parent stood: that
            // segment is the branch
            if (track){
              bpx[m] = px[i]; bpy[m] = py[i]; bnid[m] = this.nextId++;
              // a fork off a drawn thread, every keep-th time one splits
              bdrw[m] = (drw[i] && (++this.recruit % keep === 0)) ? 1 : 0;
              // the branching event resets both sides of the fork: each comes
              // out of it a new branch, with its own age and its own tint
              bage[m] = 0; bage[mine] = 0;
              // its own stream: drawing these from the simulation's would shift
              // every later split jitter and change the form itself
              btint[m] = this.trnd(); btint[mine] = this.trnd();
            }
            m++; split = true;
          }
        }
      }
      out.push({ s: start, e: m, closed: rg.closed });
    }

    if (!split) return;
    this.x = bx; this.y = by; this.vx = bvx; this.vy = bvy; this.cid = bcid;
    this.bx = x; this.by = y; this.bvx = vx; this.bvy = vy; this.bcid = cid;
    if (track){
      this.px = bpx; this.py = bpy; this.bpx = px; this.bpy = py;
      this.nid = bnid; this.bnid = nid;
      this.drw = bdrw; this.bdrw = drw;
      this.age = bage; this.bage = age;
      this.tint = btint; this.btint = tint;
    }
    this.ranges = out;
    this.n = m;
    this.lastGrowth = this.steps;
    if (m >= lim) this.saturated = true;
  }

  /* ---- optional: collapse edges shorter than half of minEdge ---- */
  pruneEdges(){
    const n = this.n;
    if (n < 12) return;
    const thresh = this.p.minEdge * 0.5;
    const x = this.x, y = this.y, vx = this.vx, vy = this.vy, cid = this.cid;
    const bx = this.bx, by = this.by, bvx = this.bvx, bvy = this.bvy, bcid = this.bcid;
    const track = this.tracking;
    const px = this.px, py = this.py, bpx = this.bpx, bpy = this.bpy;
    const nid = this.nid, bnid = this.bnid;
    const drw = this.drw, bdrw = this.bdrw;
    const age = this.age, bage = this.bage;
    const tint = this.tint, btint = this.btint;
    const ranges = this.ranges, out = [];
    let m = 0, removed = false;

    for (let c = 0; c < ranges.length; c++){
      const rg = ranges[c];
      const start = m;
      for (let i = rg.s; i < rg.e; i++){
        // drop a node that sits closer than the threshold to the last kept one
        if (m > start && Math.hypot(x[i] - bx[m-1], y[i] - by[m-1]) < thresh){
          removed = true; continue;
        }
        bx[m] = x[i]; by[m] = y[i]; bvx[m] = vx[i]; bvy[m] = vy[i]; bcid[m] = c;
        if (track){ bpx[m] = px[i]; bpy[m] = py[i]; bnid[m] = nid[i]; bdrw[m] = drw[i];
                    bage[m] = age[i]; btint[m] = tint[i]; }
        m++;
      }
      if (rg.closed && m - start > 8 &&
          Math.hypot(bx[m-1] - bx[start], by[m-1] - by[start]) < thresh){
        m--; removed = true;
      }
      // never prune a curve out of existence
      if (m - start < 8){
        m = start;
        for (let i = rg.s; i < rg.e; i++){
          bx[m] = x[i]; by[m] = y[i]; bvx[m] = vx[i]; bvy[m] = vy[i]; bcid[m] = c;
          if (track){ bpx[m] = px[i]; bpy[m] = py[i]; bnid[m] = nid[i]; bdrw[m] = drw[i];
                      bage[m] = age[i]; btint[m] = tint[i]; }
          m++;
        }
      }
      out.push({ s: start, e: m, closed: rg.closed });
    }

    if (!removed || m === n) return;
    this.x = bx; this.y = by; this.vx = bvx; this.vy = bvy; this.cid = bcid;
    this.bx = x; this.by = y; this.bvx = vx; this.bvy = vy; this.bcid = cid;
    if (track){
      this.px = bpx; this.py = bpy; this.bpx = px; this.bpy = py;
      this.nid = bnid; this.bnid = nid;
      this.drw = bdrw; this.bdrw = drw;
      this.age = bage; this.bage = age;
      this.tint = btint; this.btint = tint;
    }
    this.ranges = out;
    this.n = m;
  }

  bounds(){
    const n = this.n, x = this.x, y = this.y;
    if (n === 0) return { minX:-1, minY:-1, maxX:1, maxY:1 };
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    for (let i = 0; i < n; i++){
      if (x[i] < a) a = x[i]; if (x[i] > c) c = x[i];
      if (y[i] < b) b = y[i]; if (y[i] > d) d = y[i];
    }
    if (!isFinite(a)) return { minX:-1, minY:-1, maxX:1, maxY:1 };
    return { minX:a, minY:b, maxX:c, maxY:d };
  }
}

/* half-neighbourhood offsets, so each unordered cell pair is visited once */
Growth.NBX = [0, 1, -1, 0, 1];
Growth.NBY = [0, 0,  1, 1, 1];

/* ============================================================================
   Barriers: a polygon the outline must stay inside, or must stay out of.

   Rather than testing every node against the whole polygon each step, segments
   go into a uniform grid so a node only looks at the handful near it. The
   inside/outside test is the expensive part, so it runs only for nodes close
   enough to the wall to be at risk. Nodes are then held a clearance margin
   clear of it, on the side they are already on, which is what makes the wall
   impassable: a node is corrected before it can reach the boundary, not after.
============================================================================ */
class Barrier {
  constructor(pts, margin){
    this.pts = pts;
    this.margin = margin;
    const m = pts.length;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let total = 0;
    for (let i = 0; i < m; i++){
      const a = pts[i], b = pts[(i + 1) % m];
      if (a[0] < minX) minX = a[0]; if (a[0] > maxX) maxX = a[0];
      if (a[1] < minY) minY = a[1]; if (a[1] > maxY) maxY = a[1];
      total += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    this.minX = minX; this.minY = minY; this.maxX = maxX; this.maxY = maxY;

    // cells must be at least the margin, so anything close enough to matter is
    // guaranteed to sit in the 3x3 block around the node
    const cell = Math.max(margin * 2, (total / Math.max(1, m)) * 1.5, 1e-6);
    const cols = Math.max(1, Math.floor((maxX - minX) / cell) + 1);
    const rows = Math.max(1, Math.floor((maxY - minY) / cell) + 1);
    const cells = new Array(cols * rows);
    for (let i = 0; i < m; i++){
      const a = pts[i], b = pts[(i + 1) % m];
      const c0 = Math.max(0, Math.min(cols - 1, Math.floor((Math.min(a[0], b[0]) - minX) / cell)));
      const c1 = Math.max(0, Math.min(cols - 1, Math.floor((Math.max(a[0], b[0]) - minX) / cell)));
      const r0 = Math.max(0, Math.min(rows - 1, Math.floor((Math.min(a[1], b[1]) - minY) / cell)));
      const r1 = Math.max(0, Math.min(rows - 1, Math.floor((Math.max(a[1], b[1]) - minY) / cell)));
      for (let r = r0; r <= r1; r++)
        for (let c = c0; c <= c1; c++){
          const k = r * cols + c;
          (cells[k] || (cells[k] = [])).push(i);
        }
    }
    this.cell = cell; this.cols = cols; this.rows = rows; this.cells = cells;
  }

  /* nearest point on the polygon, or null if nothing is within a cell */
  nearest(x, y){
    const { cell, cols, rows, cells, pts, minX, minY } = this;
    const m = pts.length;
    const cx = Math.max(0, Math.min(cols - 1, Math.floor((x - minX) / cell)));
    const cy = Math.max(0, Math.min(rows - 1, Math.floor((y - minY) / cell)));
    let best = Infinity, bx = 0, by = 0;
    for (let gy = Math.max(0, cy - 1); gy <= Math.min(rows - 1, cy + 1); gy++){
      for (let gx = Math.max(0, cx - 1); gx <= Math.min(cols - 1, cx + 1); gx++){
        const list = cells[gy * cols + gx];
        if (!list) continue;
        for (let s = 0; s < list.length; s++){
          const i = list[s];
          const a = pts[i], b = pts[(i + 1) % m];
          const ex = b[0] - a[0], ey = b[1] - a[1];
          const len2 = ex * ex + ey * ey;
          let t = len2 > 0 ? ((x - a[0]) * ex + (y - a[1]) * ey) / len2 : 0;
          if (t < 0) t = 0; else if (t > 1) t = 1;
          const px = a[0] + ex * t, py = a[1] + ey * t;
          const d2 = (x - px) * (x - px) + (y - py) * (y - py);
          if (d2 < best){ best = d2; bx = px; by = py; }
        }
      }
    }
    return best === Infinity ? null : { d: Math.sqrt(best), px: bx, py: by };
  }

  /* Evenly spaced points along the wall, gridded for lookup. Spaced like the
     curve's own nodes so that a wall pushes back with the same force per unit
     length as a neighbouring fold does — which is what makes the growth hold
     the same gap from the boundary as it holds from itself. */
  prepareField(spacing, radius){
    const key = spacing + '/' + radius;
    if (key === this._fieldKey) return;
    this._fieldKey = key;

    const pts = this.pts, m = pts.length;
    const step = Math.max(spacing, 0.25);
    const out = [];
    let carry = 0;
    for (let i = 0; i < m; i++){
      const a = pts[i], b = pts[(i + 1) % m];
      const ex = b[0] - a[0], ey = b[1] - a[1];
      const len = Math.hypot(ex, ey);
      if (len <= 0) continue;
      for (let t = carry; t < len; t += step){
        out.push([a[0] + ex * (t / len), a[1] + ey * (t / len)]);
        if (out.length > 20000) break;          // pathological input guard
      }
      carry = ((carry - len) % step + step) % step;
      if (out.length > 20000) break;
    }
    this.field = out;

    // uniform grid over those points, one cell per repulsion radius
    let fx0 = Infinity, fy0 = Infinity, fx1 = -Infinity, fy1 = -Infinity;
    for (const p of out){
      if (p[0] < fx0) fx0 = p[0]; if (p[0] > fx1) fx1 = p[0];
      if (p[1] < fy0) fy0 = p[1]; if (p[1] > fy1) fy1 = p[1];
    }
    const cell = Math.max(radius, 1e-6);
    const cols = Math.max(1, Math.floor((fx1 - fx0) / cell) + 1);
    const rows = Math.max(1, Math.floor((fy1 - fy0) / cell) + 1);
    const buckets = new Array(cols * rows);
    for (let i = 0; i < out.length; i++){
      const c = Math.max(0, Math.min(cols - 1, Math.floor((out[i][0] - fx0) / cell)));
      const r = Math.max(0, Math.min(rows - 1, Math.floor((out[i][1] - fy0) / cell)));
      const k = r * cols + c;
      (buckets[k] || (buckets[k] = [])).push(i);
    }
    this.fieldGrid = { cell, cols, rows, minX: fx0, minY: fy0, buckets };
  }

  inside(x, y){
    const pts = this.pts, m = pts.length;
    let odd = false;
    for (let i = 0, j = m - 1; i < m; j = i++){
      const a = pts[i], b = pts[j];
      if ((a[1] > y) !== (b[1] > y) &&
          x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) odd = !odd;
    }
    return odd;
  }

  /* nearest point scanning every segment; the grid can miss a node that has
     ended up well outside its cells, and that node still has to come back */
  nearestExact(x, y){
    const pts = this.pts, m = pts.length;
    let best = Infinity, bx = 0, by = 0;
    for (let i = 0; i < m; i++){
      const a = pts[i], b = pts[(i + 1) % m];
      const ex = b[0] - a[0], ey = b[1] - a[1];
      const len2 = ex * ex + ey * ey;
      let t = len2 > 0 ? ((x - a[0]) * ex + (y - a[1]) * ey) / len2 : 0;
      if (t < 0) t = 0; else if (t > 1) t = 1;
      const px = a[0] + ex * t, py = a[1] + ey * t;
      const d2 = (x - px) * (x - px) + (y - py) * (y - py);
      if (d2 < best){ best = d2; bx = px; by = py; }
    }
    return { d: Math.sqrt(best), px: bx, py: by };
  }

  /* push a node to the legal side, a clearance margin clear of the wall */
  resolve(x, y, wantInside){
    const onRightSide = this.inside(x, y) === wantInside;
    // a node already on the wrong side is pulled back whatever its distance
    const near = onRightSide ? this.nearest(x, y) : this.nearestExact(x, y);
    if (!near) return null;
    if (onRightSide && near.d >= this.margin) return null;
    let dx = x - near.px, dy = y - near.py;
    const d = near.d;
    if (d > 1e-9){ dx /= d; dy /= d; }
    else {
      // sitting exactly on the wall: step along the segment normal instead
      const m = this.pts.length;
      let bi = 0, bd = Infinity;
      for (let i = 0; i < m; i++){
        const a = this.pts[i];
        const dd = (a[0] - x) * (a[0] - x) + (a[1] - y) * (a[1] - y);
        if (dd < bd){ bd = dd; bi = i; }
      }
      const a = this.pts[bi], b = this.pts[(bi + 1) % m];
      const ex = b[0] - a[0], ey = b[1] - a[1];
      const el = Math.hypot(ex, ey) || 1;
      dx = -ey / el; dy = ex / el;
    }
    if (!onRightSide){ dx = -dx; dy = -dy; }
    return [near.px + dx * this.margin, near.py + dy * this.margin];
  }
}

/* ---------- Bézier smoothing (same tangent construction as growth1.py) ---- */
function tangent(x0,y0, x1,y1, x2,y2){
  let ax = x1-x0, ay = y1-y0, bx = x2-x1, by = y2-y1;
  const da = Math.hypot(ax,ay); if (da > 0){ ax/=da; ay/=da; }
  const db = Math.hypot(bx,by); if (db > 0){ bx/=db; by/=db; }
  let tx = ax+bx, ty = ay+by;
  const dt = Math.hypot(tx,ty); if (dt > 0){ tx/=dt; ty/=dt; }
  return [tx,ty];
}

/* Emits every curve into a sink with moveTo / lineTo / bezierCurveTo — shared
   by the canvas and the SVG export. Each curve becomes its own subpath. */
function emitPath(g, sink, tension){
  const x = g.x, y = g.y;
  for (const rg of (g.ranges || [])){
    const n = rg.e - rg.s;
    if (n < 2) continue;
    const idx = rg.closed
      ? (i) => rg.s + (((i % n) + n) % n)
      : (i) => rg.s + Math.max(0, Math.min(n - 1, i));

    sink.moveTo(x[rg.s], y[rg.s]);
    const last = rg.closed ? n : n - 1;
    if (tension <= 0){
      for (let i = 1; i <= last; i++){ const j = idx(i); sink.lineTo(x[j], y[j]); }
    } else {
      for (let i = 0; i < last; i++){
        const p0 = idx(i-1), p1 = idx(i), p2 = idx(i+1), p3 = idx(i+2);
        const [t1x,t1y] = tangent(x[p0],y[p0], x[p1],y[p1], x[p2],y[p2]);
        const [t2x,t2y] = tangent(x[p1],y[p1], x[p2],y[p2], x[p3],y[p3]);
        const cx = x[p2]-x[p1], cy = y[p2]-y[p1];
        const len = Math.hypot(cx, cy) || 1;
        const seg = len * tension;
        // Fade the control arm out as the tangent turns away from the chord: a
        // full-length arm at a sharp kink throws the curve into a hook that is
        // not in the node data. Smooth stretches are unaffected (k is ~1).
        let k1 = (t1x*cx + t1y*cy) / len; if (k1 < 0) k1 = 0;
        let k2 = (t2x*cx + t2y*cy) / len; if (k2 < 0) k2 = 0;
        sink.bezierCurveTo(x[p1]+t1x*seg*k1, y[p1]+t1y*seg*k1,
                           x[p2]-t2x*seg*k2, y[p2]-t2y*seg*k2,
                           x[p2], y[p2]);
      }
    }
    if (rg.closed && sink.closePath) sink.closePath();
  }
}

/* ============================================================================
   Render styles

   A style draws the outline into a "sink" rather than straight onto a canvas,
   so the same code serves the live canvas, the PNG export and the SVG export
   (in the browser and on the command line). Adding a style means adding one
   entry to STYLES: give it a render(sink, sim, P) and it works everywhere.
============================================================================ */

/* --- sinks ---------------------------------------------------------------- */

function canvasSink(ctx){
  return {
    begin(){ ctx.beginPath(); },
    moveTo(x, y){ ctx.moveTo(x, y); },
    lineTo(x, y){ ctx.lineTo(x, y); },
    quadTo(cx, cy, x, y){ ctx.quadraticCurveTo(cx, cy, x, y); },
    bezierCurveTo(a, b, c, d, e, f){ ctx.bezierCurveTo(a, b, c, d, e, f); },
    closePath(){ ctx.closePath(); },
    fill(color, alpha){
      ctx.globalAlpha = alpha === undefined ? 1 : alpha;
      ctx.fillStyle = color; ctx.fill(); ctx.globalAlpha = 1;
    },
    stroke(color, width, alpha){
      ctx.globalAlpha = alpha === undefined ? 1 : alpha;
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
      ctx.globalAlpha = 1;
    },
    /* A filled disc. Worth its own call rather than four beziers: the stipple
       style draws tens of thousands of them, and in SVG each one is a <circle>
       of seventy bytes instead of a path of two hundred and sixty. */
    dot(x, y, r, color, alpha){
      ctx.globalAlpha = alpha === undefined ? 1 : alpha;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
      ctx.fillStyle = color; ctx.fill();
      ctx.globalAlpha = 1;
    },
  };
}

/* Collects the same calls as SVG elements. `scale` converts a screen-space
   width into user units so an export matches what is on screen. */
/* `blend` is 'lighten' or 'darken': min/max compositing between layers, so that
   overlapping stacked frames stop piling up into saturated patches.

   It has to be done a layer at a time, not a mark at a time. mix-blend-mode on
   the marks themselves does nothing here, because the blend applies to the
   source colour before alpha compositing — a pale mark over a dark ground is
   already the lighter of the two, so lighten degenerates to ordinary blending
   and the layers still accumulate. Measured on a stacked Sheaf, marks tagged
   that way came out pixel for pixel identical to no blending at all.

   What does work is compositing each layer as an opaque picture: the caller
   calls layer() between frames, each frame is drawn over its own copy of the
   ground inside an isolated group, and the group blends into the page as a
   unit. Then an overlap really is the max of two finished layers. */
function svgSink(blend, ground){
  const parts = [];
  const bl = (blend === 'lighten' || blend === 'darken') ? blend : '';
  let open = false;
  let d = [];
  const f = (v) => (Math.round(v * 100) / 100);
  return {
    begin(){ d = []; },
    /* Start a new blended layer. Without a blend this is a no-op and everything
       lands in one flat list, exactly as before. */
    layer(){
      if (!bl || !ground) return;
      if (open) parts.push('</g>');
      parts.push(`<g style="isolation:isolate;mix-blend-mode:${bl}">`
        + `<rect x="${f(ground.x)}" y="${f(ground.y)}" width="${f(ground.w)}" `
        + `height="${f(ground.h)}" fill="${ground.fill}"/>`);
      open = true;
    },
    moveTo(x, y){ d.push(`M ${f(x)} ${f(y)}`); },
    lineTo(x, y){ d.push(`L ${f(x)} ${f(y)}`); },
    quadTo(cx, cy, x, y){ d.push(`Q ${f(cx)},${f(cy)} ${f(x)},${f(y)}`); },
    bezierCurveTo(a, b, c, e, g, h){
      d.push(`C ${f(a)},${f(b)} ${f(c)},${f(e)} ${f(g)},${f(h)}`);
    },
    closePath(){ d.push('Z'); },
    fill(color, alpha){
      parts.push(`<path d="${d.join(' ')}" fill="${color}"`
        + (alpha !== undefined && alpha < 1 ? ` fill-opacity="${f(alpha)}"` : '')
        + ` stroke="none"/>`);
    },
    stroke(color, width, alpha){
      parts.push(`<path d="${d.join(' ')}" fill="none" stroke="${color}" `
        + `stroke-width="${Math.round(width * 1000) / 1000}"`
        + (alpha !== undefined && alpha < 1 ? ` stroke-opacity="${f(alpha)}"` : '')
        + ` stroke-linecap="round" stroke-linejoin="round"/>`);
    },
    dot(x, y, r, color, alpha){
      parts.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${color}"`
        + (alpha !== undefined && alpha < 1 ? ` opacity="${f(alpha)}"` : '') + `/>`);
    },
    toString(){
      return parts.join('\n') + (open ? '\n</g>' : '');
    },
  };
}

/* --- arc-length lookup along the outline ---------------------------------- */

function arcTable(sim, rg){
  const x = sim.x, y = sim.y;
  const n = rg.e - rg.s, closed = rg.closed;
  const cum = new Float64Array(n + 1);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++){
    const a = rg.s + i, b = rg.s + ((i + 1) % n);
    cum[i + 1] = cum[i] + Math.hypot(x[b] - x[a], y[b] - y[a]);
  }
  for (let i = last; i < n; i++) cum[i + 1] = cum[last];
  const total = cum[last];

  return {
    total,
    /* position at distance s along this curve */
    at(s){
      if (total <= 0) return [x[rg.s], y[rg.s]];
      const t = closed ? ((s % total) + total) % total
                       : Math.max(0, Math.min(total, s));
      let lo = 0, hi = last;
      while (lo < hi - 1){
        const mid = (lo + hi) >> 1;
        if (cum[mid] <= t) lo = mid; else hi = mid;
      }
      const seg = cum[lo + 1] - cum[lo];
      const k = seg > 0 ? (t - cum[lo]) / seg : 0;
      const a = rg.s + (lo % n), b = rg.s + ((lo + 1) % n);
      return [x[a] + (x[b] - x[a]) * k, y[a] + (y[b] - y[a]) * k];
    },
  };
}

/* --- the styles ----------------------------------------------------------- */

/* A style is handed `unit`: how many world units one output pixel covers. All
   of a style's measurements are in output pixels, so a sketch has the same
   character whatever the zoom or export size, exactly as a pen does not get
   finer just because the subject is bigger.

   `alpha` scales everything it draws, for a layer of a stack. `variant` picks
   which random draw to use: a style keeps its marks in the same places from
   frame to frame, which is right for a live sketch that would otherwise crawl,
   but wrong for stacking — identical draws pile up into tracks instead of
   accumulating into grain, so each stamped layer asks for a different one. */
function variantSeed(P, salt, variant){
  return mulberry32(((P.seed >>> 0) + salt + (variant | 0) * 0x9e3779b1) >>> 0);
}
/* Draws a colour a step off the base, within the hue/saturation/value ranges.
   Shared by every style that wants its marks to vary. */
function inkFrom(P, baseHsv, rr){
  const h = P.skHueMin, H = Math.max(P.skHueMin, P.skHueMax);
  const s = P.skSatMin, S = Math.max(P.skSatMin, P.skSatMax);
  const v = P.skValMin, V = Math.max(P.skValMin, P.skValMax);
  if (h === H && s === S && v === V && !h && !s && !v) return null;
  return hsvToCss(baseHsv[0] + rr(h, H), baseHsv[1] + rr(s, S), baseHsv[2] + rr(v, V));
}

/* Colour helpers, so a stroke can be nudged off the base colour. Offsets are
   added rather than multiplied: a multiplier does nothing to a black stroke,
   and black is the most likely colour to be sketching in. */
function hexToHsv(hex){
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  const n = m ? parseInt(m[1], 16) : 0;
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d){
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, mx ? d / mx : 0, mx];
}

function hsvToCss(h, s, v){
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  v = Math.max(0, Math.min(1, v));
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60){ r = c; g = x; }
  else if (h < 120){ r = x; g = c; }
  else if (h < 180){ g = c; b = x; }
  else if (h < 240){ g = x; b = c; }
  else if (h < 300){ r = x; b = c; }
  else { r = c; b = x; }
  const q = (u) => Math.round((u + m) * 255);
  return `rgb(${q(r)},${q(g)},${q(b)})`;
}

const STYLES = {
  smooth: {
    label: 'Smooth',
    params: [],
    render(sink, sim, P, unit, alpha){
      const lw = P.strokeWidth * unit;
      sink.begin();
      emitPath(sim, sink, P.tension);
      if (P.fillOn) sink.fill(P.fill, alpha);
      if (P.strokeOn && P.strokeWidth > 0) sink.stroke(P.stroke, lw, alpha);
    },
  },

  pencil: {
    label: 'Pencil sketch',
    params: ['skPasses', 'skDensity', 'skLength', 'skBow', 'skWander',
             'skWidth', 'skOpacity', 'skHue', 'skSat', 'skVal'],
    render(sink, sim, P, unit, alpha, variant){
      const lw = P.strokeWidth * unit;
      const A = alpha === undefined ? 1 : alpha;
      if (P.fillOn){
        sink.begin();
        emitPath(sim, sink, P.tension);
        sink.fill(P.fill);
      }
      if (!P.strokeOn || P.strokeWidth <= 0) return;

      const rnd = variantSeed(P, 0x9e3779b9, variant);
      const rr = (a, b) => a + rnd() * (b - a);

      // Length, width and opacity are ranges: each stroke draws its own value
      // from between the two ends. Collapse a range and every stroke matches,
      // which reads as a drawn line rather than a sketch.
      const lenLo = P.skLenMin * unit, lenHi = Math.max(P.skLenMin, P.skLenMax) * unit;
      const wLo = P.skWidthMin, wHi = Math.max(P.skWidthMin, P.skWidthMax);
      const oLo = P.skOpMin, oHi = Math.max(P.skOpMin, P.skOpMax);
      const bLo = P.skBowMin, bHi = Math.max(P.skBowMin, P.skBowMax);
      const jLo = P.skJitMin * unit, jHi = Math.max(P.skJitMin, P.skJitMax) * unit;
      const [baseH, baseS, baseV] = hexToHsv(P.stroke);
      const hLo = P.skHueMin, hHi = Math.max(P.skHueMin, P.skHueMax);
      const sLo = P.skSatMin, sHi = Math.max(P.skSatMin, P.skSatMax);
      const vLo = P.skValMin, vHi = Math.max(P.skValMin, P.skValMax);
      const tinted = hLo !== hHi || sLo !== sHi || vLo !== vHi || hLo || sLo || vLo;
      const spacing = Math.max(2, P.skDensity * unit);
      const passes = Math.max(1, P.skPasses | 0);
      // a stroke budget keeps a large form from stalling the frame, shared out
      // between the curves in proportion to their length
      const budget = 9000;
      let length = 0;
      const tables = [];
      for (const rg of sim.ranges){
        const t = arcTable(sim, rg);
        if (t.total > 0){ tables.push(t); length += t.total; }
      }
      if (!length) return;

      for (const arc of tables){
      const share = Math.max(1, Math.floor(budget * (arc.total / length)));
      const perPass = Math.min(Math.ceil(arc.total / spacing), Math.ceil(share / passes));
      for (let pass = 0; pass < passes; pass++){
        // each pass starts at a different offset so strokes interleave
        const phase = rr(0, spacing);
        for (let k = 0; k < perPass; k++){
          const mid = phase + k * spacing + rr(-spacing * 0.45, spacing * 0.45);
          const len = rr(lenLo, lenHi);
          // strokes overrun their span, the way a hand does, so they cross at
          // corners instead of meeting end to end
          const over = len * rr(0.02, 0.3);
          const s0 = mid - len / 2 - over / 2;
          const s1 = mid + len / 2 + over / 2;

          const [ax, ay] = arc.at(s0);
          const [bx, by] = arc.at(s1);
          const [px, py] = arc.at((s0 + s1) / 2);

          // perpendicular of the chord: strokes sit a little off the true line
          let ex = bx - ax, ey = by - ay;
          const el = Math.hypot(ex, ey) || 1;
          const nx = -ey / el, ny = ex / el;
          // drawn per stroke, so some run straight across while others follow
          // the curve, and some hug the line while others stray
          const bow = rr(bLo, bHi);
          const j = rr(jLo, jHi);

          // A quadratic through the path midpoint would trace the curve
          // exactly; blending that control point back toward the chord is what
          // makes strokes run mostly straight and cut across the curvature.
          const chx = (ax + bx) / 2, chy = (ay + by) / 2;
          const cx = chx + (px * 2 - chx - chx) * bow + nx * rr(-j, j);
          const cy = chy + (py * 2 - chy - chy) * bow + ny * rr(-j, j);

          sink.begin();
          sink.moveTo(ax + nx * rr(-j, j), ay + ny * rr(-j, j));
          sink.quadTo(cx, cy, bx + nx * rr(-j, j), by + ny * rr(-j, j));
          const ink = tinted
            ? hsvToCss(baseH + rr(hLo, hHi), baseS + rr(sLo, sHi), baseV + rr(vLo, vHi))
            : P.stroke;
          sink.stroke(ink, lw * rr(wLo, wHi), rr(oLo, oHi) * A);
        }
      }
      }
    },
  },

  /* Dots rather than lines: the outline read as a stippled edge. */
  stipple: {
    label: 'Stipple',
    params: ['stSpacing', 'stSize', 'stScatter', 'stScatPow', 'stOpacity', 'skHue', 'skSat', 'skVal'],
    render(sink, sim, P, unit, alpha, variant){
      const A = alpha === undefined ? 1 : alpha;
      if (P.fillOn){
        sink.begin();
        emitPath(sim, sink, P.tension);
        sink.fill(P.fill);
      }
      if (!P.strokeOn) return;

      const rnd = variantSeed(P, 0x85ebca6b, variant);
      const rr = (a, b) => a + rnd() * (b - a);
      const baseHsv = hexToHsv(P.stroke);

      const spacing = Math.max(1, P.stSpacing * unit);
      const rLo = P.stSizeMin * unit, rHi = Math.max(P.stSizeMin, P.stSizeMax) * unit;
      const scLo = P.stScatMin * unit, scHi = Math.max(P.stScatMin, P.stScatMax) * unit;
      const oLo = P.stOpMin, oHi = Math.max(P.stOpMin, P.stOpMax);

      /* How the dots are spread across the scatter band. Density falls off as
         (1 - d)^k with d the distance from the line as a fraction of the band,
         and the control is mapped so that k = 1 — a straight linear thinning —
         lands at 1, and k = 0 — an even spread — lands at 5. Below 1 the
         exponent climbs and the dots pack in against the line. */
      const k = Math.max(0, 1.25 / Math.max(0.05, P.stScatPow === undefined ? 5 : P.stScatPow) - 0.25);
      const invK = 1 / (k + 1);

      let budget = 20000;
      for (const rg of sim.ranges){
        const arc = arcTable(sim, rg);
        if (!(arc.total > 0)) continue;
        const count = Math.min(Math.ceil(arc.total / spacing), budget);
        budget -= count;
        for (let k = 0; k < count; k++){
          const at = k * spacing + rr(-spacing * 0.5, spacing * 0.5);
          const [px, py] = arc.at(at);
          // a dot sits a little off the line, so the edge reads as grain
          const [ax, ay] = arc.at(at - spacing * 0.5);
          const [bx, by] = arc.at(at + spacing * 0.5);
          let ex = bx - ax, ey = by - ay;
          const el = Math.hypot(ex, ey) || 1;
          /* One draw carries both the side and the distance, and the distance
             transform is the identity at k = 0, so an even spread lands on the
             same dots this did before there was a control for it. */
          const t = rnd() * 2 - 1;
          const d = k > 0 ? 1 - Math.pow(1 - Math.abs(t), invK) : Math.abs(t);
          const off = Math.sign(t) * (scLo + (scHi - scLo) * d);
          const nx = -ey / el * off, ny = ex / el * off;
          const r = rr(rLo, rHi);

          sink.dot(px + nx, py + ny, r, inkFrom(P, baseHsv, rr) || P.stroke, rr(oLo, oHi) * A);
        }
      }
    },
  },

  /* Not the outline at all: the path every node has taken since the last time
     anyone looked. A node created by a split starts from its parent, so the
     record forks wherever the curve gained a point. Stack it and the picture
     becomes the history of the growth rather than a snapshot of it — a root
     system, where the outline styles draw the rim. */
  lineage: {
    label: 'Lineage',
    params: ['lnW0', 'lnW1', 'lnGain', 'lnKeep', 'lnMode', 'lnFade', 'skHue', 'skSat', 'skVal'],
    needsHistory: true,
    render(sink, sim, P, unit, alpha, variant){
      const mv = sim.moves;
      if (!mv || mv.length === 0) return;
      const A = alpha === undefined ? 1 : alpha;
      const rnd = variantSeed(P, 0x27d4eb2f, variant);
      const rr = (a, b) => a + rnd() * (b - a);
      const baseHsv = hexToHsv(P.stroke);
      const gain = P.lnGain === undefined ? 1 : P.lnGain;

      const w0 = (P.lnW0 === undefined ? P.strokeWidth : P.lnW0) * unit;
      const w1 = (P.lnW1 === undefined ? P.strokeWidth : P.lnW1) * unit;
      const hueV = (P.skHueMax || 0) - (P.skHueMin || 0);
      const satV = (P.skSatMax || 0) - (P.skSatMin || 0);
      const valV = (P.skValMax || 0) - (P.skValMin || 0);
      const varies = hueV !== 0 || satV !== 0 || valV !== 0;
      const fades = P.lnFade > 0;
      const tapers = Math.abs(w0 - w1) > 1e-9;

      if (!fades && !tapers && !varies){
        sink.begin();
        for (let k = 0; k < mv.length; k += 6){
          sink.moveTo(mv[k], mv[k + 1]);
          sink.lineTo(mv[k + 2], mv[k + 3]);
        }
        sink.stroke(inkFrom(P, baseHsv, rr) || P.stroke, w0, gain * A);
        return;
      }

      /* Each segment now wants its own width, opacity and colour, and a path
         apiece would be tens of thousands of them. Width and opacity both come
         from how far through its branch the segment is, so they quantise
         together into one set of bands; the colour is per branch, so it gets
         its own. One path per combination that actually occurs keeps the output
         about the size it was, and at these opacities the banding does not
         show. */
      const AGE = 8, TINT = varies ? 8 : 1;
      const bins = new Map();
      for (let k = 0; k < mv.length; k += 6){
        const fresh = mv[k + 4];
        let a = Math.round(fresh * (AGE - 1));
        if (a < 0) a = 0; else if (a >= AGE) a = AGE - 1;
        let t = varies ? Math.floor(mv[k + 5] * TINT) : 0;
        if (t < 0) t = 0; else if (t >= TINT) t = TINT - 1;
        const key = a * TINT + t;
        let list = bins.get(key);
        if (!list){ list = []; bins.set(key, list); }
        list.push(k);
      }

      const hsv = P.stroke ? baseHsv : null;
      for (const [key, ks] of bins){
        const a = Math.floor(key / TINT), t = key % TINT;
        const fresh = AGE === 1 ? 1 : a / (AGE - 1);
        // fresh is 1 at the fork, so the start width belongs to the new branch
        const lw = w1 + (w0 - w1) * fresh;
        const alpha = gain * A * (fades ? Math.max(0.02, fresh) : 1);
        let ink = P.stroke;
        if (varies && hsv){
          /* One random per branch, so the three channels are pulled apart with
             a couple of cheap hashes — otherwise hue, saturation and value all
             move together and the eight tints read as one ramp. */
          const u = (t + 0.5) / TINT;
          const f2 = (u * 7.31) % 1, f3 = (u * 3.77) % 1;
          ink = hsvToCss(
            hsv[0] + (P.skHueMin || 0) + hueV * u,
            hsv[1] + (P.skSatMin || 0) + satV * f2,
            hsv[2] + (P.skValMin || 0) + valV * f3);
        }
        sink.begin();
        for (const k of ks){
          sink.moveTo(mv[k], mv[k + 1]);
          sink.lineTo(mv[k + 2], mv[k + 3]);
        }
        sink.stroke(ink, lw, alpha);
      }
    },
  },

  /* The outline echoed outward and inward, like contours on a map. */
  contour: {
    label: 'Contour',
    params: ['ctCount', 'ctGap', 'ctFade', 'skHue', 'skSat', 'skVal'],
    render(sink, sim, P, unit, alpha, variant){
      const A = alpha === undefined ? 1 : alpha;
      if (P.fillOn){
        sink.begin();
        emitPath(sim, sink, P.tension);
        sink.fill(P.fill);
      }
      if (!P.strokeOn || P.strokeWidth <= 0) return;

      const rnd = variantSeed(P, 0xc2b2ae35, variant);
      const rr = (a, b) => a + rnd() * (b - a);
      const baseHsv = hexToHsv(P.stroke);
      const lw = P.strokeWidth * unit;
      const n = Math.max(0, P.ctCount | 0);
      const gap = P.ctGap * unit;

      // the original line, then a pair of echoes at each step out
      for (let ring = 0; ring <= n; ring++){
        for (const side of (ring === 0 ? [0] : [1, -1])){
          const d = ring * gap * side;
          const ringAlpha = ring === 0 ? 1 : Math.pow(P.ctFade, ring);
          const ink = inkFrom(P, baseHsv, rr) || P.stroke;
          for (const rg of sim.ranges){
            const count = rg.e - rg.s;
            if (count < 3) continue;
            sink.begin();
            for (let i = 0; i < count; i++){
              const [ox, oy] = offsetNode(sim, rg, i, d);
              if (i === 0) sink.moveTo(ox, oy); else sink.lineTo(ox, oy);
            }
            if (rg.closed) sink.closePath();
            sink.stroke(ink, lw, ringAlpha * A);
          }
        }
      }
    },
  },
};

/* a node pushed along the local normal, for the contour echoes */
function offsetNode(sim, rg, i, d){
  const n = rg.e - rg.s;
  const at = (k) => rg.s + (rg.closed ? ((k % n) + n) % n : Math.max(0, Math.min(n - 1, k)));
  const a = at(i - 1), b = at(i + 1), c = at(i);
  if (!d) return [sim.x[c], sim.y[c]];
  const ex = sim.x[b] - sim.x[a], ey = sim.y[b] - sim.y[a];
  const el = Math.hypot(ex, ey) || 1;
  return [sim.x[c] - ey / el * d, sim.y[c] + ex / el * d];
}

/* ----------------------------------------------------------------------------
   This file is the one and only implementation of the algorithm. The browser
   loads it with a plain <script> tag; the command line loads it through
   require() from growth.js. There is deliberately no second copy to keep in
   step with this one.
---------------------------------------------------------------------------- */
if (typeof module !== 'undefined' && module.exports){
  module.exports = { mulberry32, Growth, Barrier, tangent, emitPath, resolveDrawn,
                    normaliseSeeds, transformPts, tileSeeds, TILE_SHAPES,
                    STYLES, canvasSink, svgSink, arcTable };
}
