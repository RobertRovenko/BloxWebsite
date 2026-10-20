// Generates the from-scratch hero artwork and injects it into index.html.
//
//   node tools/generate-hero-art.js
//
// The art is hand-authored vector - it is NOT traced from the raster banner.
// Everything except the BLOX BREAK! wordmark is vector; the wordmark is
// rendered artwork that cannot be expressed as flat SVG without losing the
// glossy plastic letterforms, so it ships as a WebP cut from
// "Glossy 3D BLOX BREAK Logo.png" (see generate-assets.js).
//
// The SVG is inlined into index.html (rather than referenced as a file) so the
// individual blocks can be transformed independently for the pointer parallax.
// Each block carries a `data-depth` attribute: higher = nearer = moves more.
//
// Writes between these markers in index.html:
//   <!-- hero-art:desktop --> ... <!-- /hero-art:desktop -->
//   <!-- hero-art:mobile -->  ... <!-- /hero-art:mobile -->

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const HTML = path.join(ROOT, "index.html");

/* ---------- cell geometry ---------- */
const CELL = 50;   // cell size in user units
const RADIUS = 15; // corner radius of the merged block

/* A polyomino is a list of [col,row] cells. */
const PIECES = {
  L: [[0, 0], [0, 1], [0, 2], [1, 2]],
  T: [[0, 0], [1, 0], [2, 0], [1, 1]],
  O: [[0, 0], [1, 0], [0, 1], [1, 1]],
};

/* Face gradients: light at the top-left, saturated base, deeper bottom-right. */
const FACES = {
  orange: ["#ffcf8a", "#ff9a2e", "#d95f0a"],
  cyan:   ["#a5efff", "#25c3f0", "#0582b4"],
  red:    ["#ffb0ba", "#f4485c", "#b81a36"],
  purple: ["#e2b8ff", "#a855f7", "#6a17b4"],
  gold:   ["#ffe98f", "#f5c518", "#b07f00"],
};

/**
 * Merges a polyomino into ONE closed path - no seams between cells.
 *
 * Walks the union outline of the cells (the edges that are not shared with a
 * neighbour), then rounds the outer corners. Concave corners stay sharp so the
 * piece keeps its crisp block silhouette.
 */
function mergedPath(cells) {
  const has = new Set(cells.map(([c, r]) => `${c},${r}`));
  const hasC = (c, r) => has.has(`${c},${r}`);

  // Boundary edges, wound clockwise on screen (y grows downwards).
  const edges = [];
  for (const [c, r] of cells) {
    if (!hasC(c, r - 1)) edges.push([c, r, c + 1, r]);
    if (!hasC(c + 1, r)) edges.push([c + 1, r, c + 1, r + 1]);
    if (!hasC(c, r + 1)) edges.push([c + 1, r + 1, c, r + 1]);
    if (!hasC(c - 1, r)) edges.push([c, r + 1, c, r]);
  }

  // Chain the edges into a single loop.
  const outgoing = new Map();
  for (const e of edges) {
    const k = `${e[0]},${e[1]}`;
    if (!outgoing.has(k)) outgoing.set(k, []);
    outgoing.get(k).push(e);
  }
  const used = new Set();
  const chain = [];
  let cur = edges[0];
  while (cur) {
    chain.push([cur[0], cur[1]]);
    const k = cur.join(",");
    if (used.has(k)) break;
    used.add(k);
    cur = (outgoing.get(`${cur[2]},${cur[3]}`) || []).find((e) => !used.has(e.join(",")));
  }

  const pts = chain.map(([c, r]) => [c * CELL, r * CELL]);
  const n = pts.length;
  const f = (v) => Math.round(v * 100) / 100;

  let d = "";
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const v = pts[i];
    const next = pts[(i + 1) % n];
    const d1 = [v[0] - prev[0], v[1] - prev[1]];
    const d2 = [next[0] - v[0], next[1] - v[1]];
    const cross = d1[0] * d2[1] - d1[1] * d2[0];
    const l1 = Math.hypot(d1[0], d1[1]);
    const l2 = Math.hypot(d2[0], d2[1]);
    const move = i === 0 ? "M" : "L";

    if (cross > 0 && l1 > 0 && l2 > 0) {
      // Convex corner: round it off.
      const r = Math.min(RADIUS, l1 / 2, l2 / 2);
      const p1 = [v[0] - (d1[0] / l1) * r, v[1] - (d1[1] / l1) * r];
      const p2 = [v[0] + (d2[0] / l2) * r, v[1] + (d2[1] / l2) * r];
      d += `${move}${f(p1[0])} ${f(p1[1])} A${f(r)} ${f(r)} 0 0 1 ${f(p2[0])} ${f(p2[1])}`;
    } else {
      d += `${move}${f(v[0])} ${f(v[1])}`;
    }
  }
  return d + " Z";
}

/**
 * One glossy 3D block, drawn as a single merged shape.
 *
 * Four layers, all sharing the same path so no seams appear:
 *   1. an extruded dark "side" offset down-right, giving the piece thickness
 *   2. the lit face, filled with a top-left-lit gradient
 *   3. a specular sheen across the top
 *   4. a rim that darkens the lower-right edges
 *
 * The block is static on its own - it only moves in response to the pointer,
 * via the transform script.js sets on `.hero-block`.
 */
function block(id, cells, opts = {}) {
  const {
    x = 0, y = 0, rot = 0, scale = 1, depth = 9, parallax = 0, prefix = "d-",
  } = opts;
  const d = mergedPath(cells);

  return `
    <g class="hero-block" data-depth="${parallax}">
      <g transform="translate(${x} ${y}) rotate(${rot}) scale(${scale})">
        <path class="b-side" d="${d}" transform="translate(${depth} ${depth * 1.2})"/>
        <path class="b-face" d="${d}" fill="url(#${prefix}g-${id})"/>
        <path class="b-gloss" d="${d}"/>
        <path class="b-rim" d="${d}"/>
      </g>
    </g>`;
}

/* ---------- gradients + shared styles ---------- */
function defs(prefix) {
  const stops = Object.entries(FACES)
    .map(
      ([id, [light, base, dark]]) => `
    <linearGradient id="${prefix}g-${id}" x1="0" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="${light}"/>
      <stop offset="0.38" stop-color="${base}"/>
      <stop offset="1" stop-color="${dark}"/>
    </linearGradient>`
    )
    .join("");

  return `
  <defs>
    ${stops}
    <linearGradient id="${prefix}gloss-fill" x1="0" y1="0" x2="0.55" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.78"/>
      <stop offset="0.28" stop-color="#ffffff" stop-opacity="0.24"/>
      <stop offset="0.52" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.12"/>
    </linearGradient>
    <linearGradient id="${prefix}rim-fill" x1="0" y1="0" x2="0.7" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.45"/>
      <stop offset="0.16" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="0.84" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.3"/>
    </linearGradient>
  </defs>`;
}

function swooshes(s) {
  return `
  <path d="${s.green}" fill="#24cc48"/>
  <path d="${s.yellow}" fill="#fcd824"/>
  <path d="${s.red}" fill="#fc3c48"/>
  <path d="${s.blue}" fill="#189cfc"/>`;
}

/* ---------- desktop: wide stage ---------- */
function desktop() {
  const W = 1024;
  const H = 520;

  // The bottom two swooshes stop short of the centre so the CTA row always
  // sits on clean navy.
  const s = {
    green: `M0 0 H330 C302 58 268 108 224 148 C186 182 132 208 74 224 C48 231 20 234 0 233 Z`,
    yellow: `M1024 0 H694 C722 52 758 96 800 130 C846 166 894 190 940 202 C966 208 994 211 1024 212 Z`,
    red: `M0 330 C56 352 116 388 168 430 C200 456 240 490 268 520 L0 520 Z`,
    blue: `M1024 350 C968 374 912 408 866 448 C830 478 786 504 748 520 L1024 520 Z`,
  };

  const blocks = [
    block("orange", PIECES.L, { x: -30, y: -40, rot: -24, scale: 1.0, depth: 10, parallax: 1.0, prefix: "d-" }),
    block("cyan", PIECES.T, { x: 700, y: -32, rot: 12, scale: 0.88, depth: 9, parallax: 0.8, prefix: "d-" }),
    block("gold", PIECES.O, { x: 936, y: 100, rot: -16, scale: 0.86, depth: 9, parallax: 0.62, prefix: "d-" }),
    block("red", PIECES.L, { x: -20, y: 288, rot: -18, scale: 0.92, depth: 10, parallax: 0.92, prefix: "d-" }),
    block("purple", PIECES.T, { x: 828, y: 320, rot: 10, scale: 0.85, depth: 9, parallax: 0.7, prefix: "d-" }),
  ].join("");

  return `<svg class="hero-svg hero-svg--desktop" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true" focusable="false">
${defs("d-")}
${swooshes(s)}
${blocks}
</svg>`;
}

/* ---------- mobile: vertical (portrait) stage ----------
   Phones get a tall poster-style composition rather than a squashed
   landscape one. The four swooshes hug the corners and stop short of
   the centre column, so the wordmark and the CTA row both sit on clean
   navy: logo in the upper third, buttons in the lower third. */
function mobile() {
  const W = 760;
  const H = 1000;

  const s = {
    // top corners
    green: `M0 0 H212 C184 40 150 84 114 122 C82 156 42 176 0 190 Z`,
    yellow: `M760 0 H548 C576 40 610 84 646 122 C678 156 718 176 760 190 Z`,
    // bottom corners - kept clear of the centre column
    red: `M0 1000 V758 C50 788 100 828 142 878 C176 918 196 958 206 1000 L0 1000 Z`,
    blue: `M760 1000 V758 C710 788 660 828 618 878 C584 918 564 958 554 1000 L760 1000 Z`,
  };

  const blocks = [
    block("orange", PIECES.L, { x: -34, y: -34, rot: -22, scale: 0.8, depth: 8, parallax: 1.0, prefix: "m-" }),
    block("cyan", PIECES.T, { x: 600, y: -28, rot: 12, scale: 0.72, depth: 7, parallax: 0.8, prefix: "m-" }),
    block("gold", PIECES.O, { x: 672, y: 150, rot: -16, scale: 0.66, depth: 7, parallax: 0.62, prefix: "m-" }),
    block("red", PIECES.L, { x: -28, y: 786, rot: -18, scale: 0.74, depth: 8, parallax: 0.92, prefix: "m-" }),
    block("purple", PIECES.T, { x: 604, y: 826, rot: 10, scale: 0.7, depth: 7, parallax: 0.7, prefix: "m-" }),
  ].join("");

  return `<svg class="hero-svg hero-svg--mobile" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true" focusable="false">
${defs("m-")}
${swooshes(s)}
${blocks}
</svg>
`;
}

/* ---------- inject into index.html ---------- */
function inject(name, markup) {
  const open = `<!-- hero-art:${name} -->`;
  const close = `<!-- /hero-art:${name} -->`;
  const src = fs.readFileSync(HTML, "utf8");
  const i = src.indexOf(open);
  const j = src.indexOf(close);
  if (i < 0 || j < 0) throw new Error(`markers for "${name}" not found in index.html`);
  const out = src.slice(0, i + open.length) + "\r\n" + markup.replace(/\n/g, "\r\n") + "\r\n    " + src.slice(j);
  fs.writeFileSync(HTML, out.replace(/\r?\n/g, "\r\n"), "utf8");
  console.log(`hero-art:${name}  ${markup.length} bytes`);
}

inject("desktop", desktop());
inject("mobile", mobile());
