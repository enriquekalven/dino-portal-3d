import * as THREE from '../../vendor/three/build/three.module.js';

/**
 * HyperRealKit.js — Hyper-Real Surface Synthesis & Rendering Toolkit.
 *
 * 1. Tileable multi-octave gradient noise + tileable Worley (cellular) noise.
 * 2. Pure (DOM-free) multi-layer surface synthesizer producing albedo, height, roughness
 *    for archosaur scales, pennaceous feathers, striated muscle, fossil bone, vascular
 *    membranes, keratin (teeth / claws / horns / beaks), bark, foliage and terrain.
 * 3. Height → tangent-space normal map (Sobel) + roughness map packing.
 * 4. MeshPhysicalMaterial factory with natural pigment palette, clearcoat skin sheen,
 *    feather sheen and GPU countershading (dark dorsum → pale ventrum) shader injection.
 * 5. Realistic eye builder (procedural iris, slit/round pupil, wet cornea, blinking lids).
 * 6. Alpha-cutout pennaceous feather cards & fan builder.
 * 7. Procedural HDR studio/paleo-sky environment scene for PMREM image-based lighting.
 * 8. Live Paleo-Earth Continental Drift (Pangaea → Laurasia/Gondwana → Today) renderer.
 */

// -----------------------------------------------------------------------------
// 0. SMALL MATH HELPERS
// -----------------------------------------------------------------------------
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic integer-lattice hash → [0, 1). */
export function hash2(ix, iy, seed = 0) {
  let h = Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263) + Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// -----------------------------------------------------------------------------
// 1. TILEABLE GRADIENT NOISE & WORLEY CELLULAR NOISE
// -----------------------------------------------------------------------------
export function createNoise2D(seed = 42) {
  const rand = mulberry32(seed);
  const perm = new Uint8Array(512);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = perm[i];
    perm[i] = perm[j];
    perm[j] = tmp;
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];

  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (hash, x, y) => {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) !== 0 ? -u : u) + ((h & 2) !== 0 ? -2.0 * v : 2.0 * v);
  };

  /**
   * Gradient noise. When `periodX` / `periodY` > 0 the lattice wraps on that axis so the
   * field tiles seamlessly (periods must match the sampled coordinate range).
   */
  function noise(x, y, periodX = 0, periodY = periodX) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    let X0;
    let X1;
    let Y0;
    let Y1;
    if (periodX > 0) {
      const p = Math.max(1, Math.round(periodX));
      X0 = ((xi % p) + p) % p;
      X1 = (X0 + 1) % p;
    } else {
      X0 = xi;
      X1 = xi + 1;
    }
    if (periodY > 0) {
      const p = Math.max(1, Math.round(periodY));
      Y0 = ((yi % p) + p) % p;
      Y1 = (Y0 + 1) % p;
    } else {
      Y0 = yi;
      Y1 = yi + 1;
    }
    X0 &= 255;
    X1 &= 255;
    Y0 &= 255;
    Y1 &= 255;
    const u = fade(xf);
    const v = fade(yf);
    const aa = perm[perm[X0] + Y0];
    const ab = perm[perm[X0] + Y1];
    const ba = perm[perm[X1] + Y0];
    const bb = perm[perm[X1] + Y1];
    const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    return 0.5 + 0.25 * lerp(x1, x2, v);
  }

  function fbm(x, y, octaves = 4, periodX = 0, periodY = periodX) {
    let val = 0;
    let amp = 0.5;
    let freq = 1;
    let norm = 0;
    let px = periodX;
    let py = periodY;
    for (let i = 0; i < octaves; i++) {
      val += amp * noise(x * freq, y * freq, px, py);
      norm += amp;
      freq *= 2;
      amp *= 0.5;
      if (px) px *= 2;
      if (py) py *= 2;
    }
    return clamp01(val / norm);
  }

  return { noise, fbm };
}

/**
 * Tileable Worley / cellular noise. `x` ∈ [0, cellsX) and `y` ∈ [0, cellsY) tile seamlessly.
 * Returns distance to nearest (f1) and second-nearest (f2) feature point plus a stable cell id.
 */
export function worley(x, y, cellsX, seed = 0, cellsY = cellsX) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let f1 = 1e9;
  let f2 = 1e9;
  let id = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = ix + dx;
      const cy = iy + dy;
      const wx = ((cx % cellsX) + cellsX) % cellsX;
      const wy = ((cy % cellsY) + cellsY) % cellsY;
      const jx = cx + 0.12 + 0.76 * hash2(wx, wy, seed);
      const jy = cy + 0.12 + 0.76 * hash2(wx, wy, seed + 7919);
      const ddx = x - jx;
      const ddy = y - jy;
      const d = ddx * ddx + ddy * ddy;
      if (d < f1) {
        f2 = f1;
        f1 = d;
        id = hash2(wx, wy, seed + 104729);
      } else if (d < f2) {
        f2 = d;
      }
    }
  }
  return { f1: Math.sqrt(f1), f2: Math.sqrt(f2), id };
}

// -----------------------------------------------------------------------------
// 2. COLOR UTILITIES & NATURAL PIGMENT PALETTE
// -----------------------------------------------------------------------------
export function hexToRgb(hex) {
  const clean = (hex || '#ffffff').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return [255, 255, 255];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function rgbToHex(r, g, b) {
  const to = (v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

export function hslToRgb(h, s, l) {
  if (s === 0) {
    const v = l * 255;
    return [v, v, v];
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1 / 3) * 255, hue2rgb(p, q, h) * 255, hue2rgb(p, q, h - 1 / 3) * 255];
}

/**
 * Pulls saturated UI palette colors toward believable animal pigmentation while keeping
 * each species' hue identity: skin → earthy mid-tones, belly → pale creams, accent →
 * display-structure colors (crests, sails, wattles) that stay vivid but not neon.
 */
export function naturalizeColor(hex, mode = 'skin') {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  let nh = h;
  let ns = s;
  let nl = l;
  switch (mode) {
    case 'skin':
      // Shift neon cyan/blue/indigo/purple skin palettes toward natural reptile slate-olive, warm umber, or charcoal
      if (h > 0.46 && h < 0.88) {
        nh = 0.14 + (h - 0.46) * 0.32;
        ns = Math.min(0.32, s * 0.36);
        nl = clamp(l * 0.88, 0.18, 0.44);
      } else {
        ns = Math.min(0.42, s * 0.44);
        nl = clamp(l, 0.18, 0.48);
      }
      break;
    case 'belly':
      if (h > 0.46 && h < 0.88) nh = 0.11;
      ns = Math.min(0.24, s * 0.25);
      nl = clamp(l * 0.96, 0.54, 0.78);
      break;
    case 'accent':
      ns = s * 0.72;
      nl = clamp(l, 0.22, 0.58);
      break;
    case 'foliage':
      ns = s * 0.62;
      nl = clamp(l, 0.18, 0.5);
      break;
    default:
      return hex;
  }
  const [nr, ng, nb] = hslToRgb(nh, ns, nl);
  return rgbToHex(nr, ng, nb);
}

export function shadeHex(hex, factor) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * factor, g * factor, b * factor);
}

// -----------------------------------------------------------------------------
// 3. PURE SURFACE SYNTHESIZER (NO DOM) — albedo + height + roughness
// -----------------------------------------------------------------------------
/**
 * @param {object} p
 * @param {string} p.style  scales | feathers | muscle | bone | sail | keratin | bark | foliage | ground
 * @param {number} p.size   texture edge length (power of two)
 * @param {number[]} p.baseRgb / p.accentRgb  0..255 colors
 * @param {number} p.scale  macro noise period (tiles per texture)
 * @param {number} p.cells  cellular feature count across the tile
 * @param {string} p.pattern  mottle | stripes | spots | plain
 * @param {number} p.patternStrength
 * @param {string} p.gradientAxis  'u' | 'v' (keratin growth axis)
 */
export function synthesizeSurface(p) {
  const style = p.style || 'scales';
  const size = p.size || 256;
  const base = p.baseRgb || [120, 90, 60];
  const acc = p.accentRgb || [40, 30, 20];
  const seed = p.seed ?? 17;
  let period = Math.max(2, Math.round(p.scale ?? 8));
  if (period % 2 === 1) period += 1;
  const cells = Math.max(3, Math.round(p.cells ?? 18));
  const pattern = p.pattern || 'mottle';
  const patternStrength = p.patternStrength ?? 0.55;
  const gradientAxis = p.gradientAxis || 'v';
  const stripeCount = Math.max(2, 2 * Math.round(period * 0.45));

  const n2 = createNoise2D(seed);
  const albedo = new Uint8ClampedArray(size * size * 4);
  const height = new Float32Array(size * size);
  const rough = new Float32Array(size * size);

  const macroPeriod = period / 2;

  for (let y = 0; y < size; y++) {
    const ny = y / size;
    // Canvas row 0 is the top of the image = texture v = 1 (flipY). Keep a v coordinate too.
    const tv = 1 - ny;
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const px = nx * period;
      const py = ny * period;
      let r = base[0];
      let g = base[1];
      let b = base[2];
      let h = 0.5;
      let ro = 0.7;

      if (style === 'scales') {
        // Two-tier paleontological archosaur skin:
        // 1) Fine pebbly non-overlapping basement tubercles (2.15x density)
        // 2) Scattered larger raised feature-scale rosettes / osteoderm bosses (0.65x density)
        const fineCells = Math.max(24, Math.round(cells * 2.15));
        const featCells = Math.max(7, Math.round(cells * 0.65));
        const wf = worley(nx * fineCells, ny * fineCells, fineCells, seed);
        const wFeat = worley(nx * featCells, ny * featCells, featCells, seed + 41);

        const fineEdge = wf.f2 - wf.f1;
        const innerFine = smoothstep(0.0, 0.085, fineEdge);
        const domeFine = 1 - clamp01(wf.f1 / 0.56);

        // ~28% of coarse cells host a raised feature tubercle (like Carnotaurus, T-Rex & Triceratops skin impressions)
        const hasFeature = wFeat.id > 0.72 ? 1.0 : 0.0;
        const featR = 0.28 + 0.14 * (wFeat.id - 0.72) * 3.5;
        const featMask = hasFeature * (1 - smoothstep(featR * 0.45, featR, wFeat.f1));
        const featDome = hasFeature * (1 - clamp01(wFeat.f1 / featR));

        const macro = n2.fbm(px * 0.5, py * 0.5, 3, macroPeriod);
        const micro = n2.fbm(px * 6, py * 6, 2, period * 6);
        const crease = 0.5 + 0.5 * Math.sin((ny * period * 3.0 + (macro - 0.5) * 1.8) * Math.PI * 2);

        let mix;
        if (pattern === 'stripes') {
          const band = Math.sin((px * (stripeCount / period) + (macro - 0.5) * 2.4) * Math.PI);
          mix = smoothstep(0.25, 0.78, band);
        } else if (pattern === 'spots') {
          const ws = worley(nx * 6, ny * 6, 6, seed + 99);
          const spotR = 0.24 + 0.16 * ws.id;
          mix = (1 - smoothstep(spotR * 0.65, spotR, ws.f1)) * (ws.id > 0.28 ? 1 : 0);
        } else if (pattern === 'plain') {
          mix = (macro - 0.5) * 0.35;
        } else {
          mix = smoothstep(0.38, 0.66, macro);
        }
        const tone = 0.92 + 0.15 * wf.id + 0.09 * featMask;
        // Soft natural inter-scale crease AO (avoids harsh black brick mortar lines)
        const ao = 0.72 + 0.28 * innerFine;
        const fine = 0.93 + 0.14 * micro + 0.04 * (crease - 0.5);
        const t = clamp01(mix * patternStrength + 0.18 * featMask + 0.08 * (micro - 0.5));
        const k = tone * ao * fine;
        r = lerp(base[0], acc[0], t) * k;
        g = lerp(base[1], acc[1], t) * k;
        b = lerp(base[2], acc[2], t) * k;
        const hFine = innerFine * (0.42 + 0.58 * Math.pow(domeFine, 0.78));
        const hFeat = featMask * (0.55 + 0.45 * featDome);
        h = clamp01(Math.max(hFine * 0.72, hFeat * 0.95) + micro * 0.12 + crease * 0.06);
        ro = 0.84 - 0.34 * innerFine * domeFine - 0.18 * featMask + (micro - 0.5) * 0.16;
      } else if (style === 'feathers') {
        const cols = Math.max(2, Math.round(cells * 0.55));
        const rows = Math.max(2, Math.round(cells * 1.0));
        const u = nx * cols;
        const v = ny * rows;
        const row = Math.floor(v);
        const featherAt = (rowIdx) => {
          const off = (((rowIdx % 2) + 2) % 2) * 0.5;
          const fv = v - rowIdx;
          const colIdx = Math.floor(u - off);
          const fu = u - off - colIdx - 0.5;
          const arc = 0.7 + 0.3 * Math.sqrt(Math.max(0, 1 - 4 * fu * fu));
          const len = 1.6 * arc;
          if (fv < 0 || fv > len) return null;
          const wr = ((rowIdx % rows) + rows) % rows;
          const wc = ((colIdx % cols) + cols) % cols;
          return { t: fv / len, fu, id: hash2(wc, wr, seed) };
        };
        let f = featherAt(row - 1);
        if (!f) f = featherAt(row);
        if (!f) f = { t: 0.5, fu: 0, id: 0.5 };
        const barb = 0.5 + 0.5 * Math.sin((Math.abs(f.fu) * 26 + f.t * 7) * Math.PI);
        const rachis = Math.exp(-Math.pow(f.fu / 0.035, 2));
        const tipDark = smoothstep(0.84, 1.0, f.t);
        const macro = n2.fbm(px * 0.5, py * 0.5, 3, macroPeriod);
        const micro = n2.fbm(px * 6, py * 6, 2, period * 6);
        let mix = smoothstep(0.4, 0.66, macro);
        if (pattern === 'stripes') {
          const band = Math.sin((px * (stripeCount / period) + (macro - 0.5) * 1.6) * Math.PI);
          mix = smoothstep(0.25, 0.8, band);
        }
        const t = clamp01(mix * patternStrength + 0.22 * (f.id - 0.5));
        const tone = (0.9 + 0.16 * f.id) * (1 - 0.28 * tipDark) * (0.93 + 0.1 * barb) * (1 + 0.12 * rachis) * (0.95 + 0.1 * micro);
        r = lerp(base[0], acc[0], t) * tone;
        g = lerp(base[1], acc[1], t) * tone;
        b = lerp(base[2], acc[2], t) * tone;
        // Each feather lamina rises from its (overlapped) base to its exposed tip, so the
        // only height steps are at tip arcs — exactly where real feathers overlap.
        h = 0.42 + 0.38 * f.t + 0.05 * barb + 0.08 * rachis;
        ro = 0.74 - 0.16 * barb - 0.08 * rachis + 0.08 * tipDark;
      } else if (style === 'muscle') {
        const macro = n2.fbm(px * 0.5, py * 0.5, 3, macroPeriod);
        const wobble = n2.fbm(px * 1.5, py * 0.5, 3, period * 1.5, macroPeriod);
        const fiber = 0.5 + 0.5 * Math.sin((py * 9 + wobble * 1.6) * Math.PI);
        const sheen = Math.pow(fiber, 3);
        const t = clamp01(0.55 * Math.pow(1 - fiber, 1.6) + macro * 0.3);
        const k = 0.88 + 0.22 * sheen;
        r = lerp(base[0], acc[0], t) * k;
        g = lerp(base[1], acc[1], t) * k;
        b = lerp(base[2], acc[2], t) * k;
        h = fiber * 0.7 + macro * 0.3;
        ro = 0.62 - 0.3 * sheen;
      } else if (style === 'bone') {
        const grain = n2.fbm(px * 1.5, py * 0.5, 4, period * 1.5, macroPeriod);
        const macro = n2.fbm(px * 0.5, py * 0.5, 3, macroPeriod);
        const wc = worley(nx * 5, ny * 5, 5, seed + 31);
        const crack = 1 - smoothstep(0.0, 0.03, wc.f2 - wc.f1);
        const wp = worley(nx * 42, ny * 42, 42, seed + 77);
        const pore = (1 - smoothstep(0.1, 0.2, wp.f1)) * (wp.id > 0.55 ? 1 : 0);
        const t = clamp01(grain * 0.55 + macro * 0.35 + crack * 0.5 + pore * 0.4);
        r = lerp(base[0], acc[0], t);
        g = lerp(base[1], acc[1], t);
        b = lerp(base[2], acc[2], t);
        h = grain * 0.55 + macro * 0.25 - crack * 0.45 - pore * 0.3 + 0.3;
        ro = 0.55 + 0.3 * crack + 0.1 * grain;
      } else if (style === 'sail') {
        const wv = worley(nx * 6, ny * 6, 6, seed + 5);
        const vein = 1 - smoothstep(0.0, 0.035, wv.f2 - wv.f1);
        const wv2 = worley(nx * 15, ny * 15, 15, seed + 55);
        const vein2 = (1 - smoothstep(0.0, 0.02, wv2.f2 - wv2.f1)) * 0.6;
        const macro = n2.fbm(px * 0.5, py * 0.5, 3, macroPeriod);
        const t = clamp01(vein + vein2 + (macro - 0.5) * 0.5);
        r = lerp(base[0], acc[0], t);
        g = lerp(base[1], acc[1], t);
        b = lerp(base[2], acc[2], t);
        h = 0.4 + vein * 0.45 + vein2 * 0.25 + macro * 0.1;
        ro = 0.48 - 0.1 * vein + macro * 0.12;
      } else if (style === 'keratin') {
        const along = gradientAxis === 'u' ? nx : tv;
        const across = gradientAxis === 'u' ? ny : nx;
        const grad = Math.pow(clamp01(along), 0.85);
        const striae = 0.5 + 0.5 * Math.sin(across * Math.PI * 44 + n2.fbm(px, py, 2, period) * 2.0);
        const rings = 0.5 + 0.5 * Math.sin(along * Math.PI * 18);
        const macro = n2.fbm(px * 0.5, py * 0.5, 3, macroPeriod);
        const k = 0.9 + 0.08 * striae + 0.03 * rings + 0.06 * macro;
        r = lerp(base[0], acc[0], grad) * k;
        g = lerp(base[1], acc[1], grad) * k;
        b = lerp(base[2], acc[2], grad) * k;
        h = 0.5 + 0.12 * striae + 0.04 * rings + 0.06 * macro;
        ro = lerp(0.55, 0.18, grad) + 0.08 * (striae - 0.5);
      } else if (style === 'bark') {
        const wf = worley(nx * 4, ny * 14, 4, seed + 3, 14);
        const fissure = 1 - smoothstep(0.0, 0.16, wf.f2 - wf.f1);
        const grain = n2.fbm(px * 0.5, py * 4, 4, macroPeriod, period * 4);
        const t = clamp01(fissure * 0.8 + grain * 0.35);
        r = lerp(base[0], acc[0], t);
        g = lerp(base[1], acc[1], t);
        b = lerp(base[2], acc[2], t);
        h = 0.7 - fissure * 0.6 + grain * 0.2;
        ro = 0.85 + 0.1 * fissure;
      } else if (style === 'foliage') {
        const vein = Math.abs(Math.sin((py * 6 + n2.fbm(px, py, 2, period) * 2) * Math.PI));
        const macro = n2.fbm(px * 0.5, py * 0.5, 3, macroPeriod);
        const t = clamp01(macro * 0.7 + Math.pow(1 - vein, 8) * 0.4);
        r = lerp(base[0], acc[0], t);
        g = lerp(base[1], acc[1], t);
        b = lerp(base[2], acc[2], t);
        h = 0.5 + macro * 0.3 - Math.pow(1 - vein, 8) * 0.3;
        ro = 0.6 + macro * 0.2;
      } else {
        // 'ground' — pebbles, cracked earth & silt
        const wr = worley(nx * 9, ny * 9, 9, seed + 11);
        const pebble = 1 - clamp01(wr.f1 / 0.5);
        const crack = 1 - smoothstep(0.0, 0.06, wr.f2 - wr.f1);
        const macro = n2.fbm(px * 0.5, py * 0.5, 4, macroPeriod);
        const micro = n2.fbm(px * 4, py * 4, 2, period * 4);
        const t = clamp01(macro * 0.6 + crack * 0.5 + (wr.id - 0.5) * 0.3);
        const k = 0.86 + 0.18 * micro + 0.1 * pebble;
        r = lerp(base[0], acc[0], t) * k;
        g = lerp(base[1], acc[1], t) * k;
        b = lerp(base[2], acc[2], t) * k;
        h = pebble * 0.6 * (1 - crack) + macro * 0.3 + micro * 0.1;
        ro = 0.9 - 0.15 * pebble + 0.05 * micro;
      }

      const idx = y * size + x;
      const i4 = idx * 4;
      albedo[i4] = r;
      albedo[i4 + 1] = g;
      albedo[i4 + 2] = b;
      albedo[i4 + 3] = 255;
      height[idx] = clamp01(h);
      rough[idx] = clamp01(ro);
    }
  }

  return { albedo, height, rough, size };
}

/** Height field → tangent-space normal map (Sobel, seamless wrap). */
export function heightToNormalMap(height, size, strength = 6) {
  const out = new Uint8ClampedArray(size * size * 4);
  const at = (x, y) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tl = at(x - 1, y - 1);
      const t = at(x, y - 1);
      const tr = at(x + 1, y - 1);
      const l = at(x - 1, y);
      const r = at(x + 1, y);
      const bl = at(x - 1, y + 1);
      const b = at(x, y + 1);
      const br = at(x + 1, y + 1);
      // +u → +x (right).  +v → up the canvas (row index decreasing) because CanvasTexture flips Y.
      const dHdu = ((tr + 2 * r + br) - (tl + 2 * l + bl)) / 8;
      const dHdv = ((tl + 2 * t + tr) - (bl + 2 * b + br)) / 8;
      let nx = -dHdu * strength;
      let ny = -dHdv * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      const i4 = (y * size + x) * 4;
      out[i4] = (nx * 0.5 + 0.5) * 255;
      out[i4 + 1] = (ny * 0.5 + 0.5) * 255;
      out[i4 + 2] = (nz * 0.5 + 0.5) * 255;
      out[i4 + 3] = 255;
    }
  }
  return out;
}

export function roughnessToRGBA(rough, size) {
  const out = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const v = rough[i] * 255;
    out[i * 4] = v;
    out[i * 4 + 1] = v;
    out[i * 4 + 2] = v;
    out[i * 4 + 3] = 255;
  }
  return out;
}

// -----------------------------------------------------------------------------
// 4. GLSL: ATMOSPHERE RIM SHELL & GPU COUNTERSHADING INJECTION
// -----------------------------------------------------------------------------
const ATMO_VERT = `
varying vec3 vNormalW;
varying vec3 vPosW;
void main() {
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vPosW = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const ATMO_FRAG = `
uniform vec3 uColor;
uniform float uStrength;
uniform float uFalloff;
varying vec3 vNormalW;
varying vec3 vPosW;
void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vPosW);
  float rim = pow(clamp(1.0 + dot(N, V), 0.0, 1.0), uFalloff);
  gl_FragColor = vec4(uColor * rim * uStrength, rim * 0.88);
}
`;

export function makeAtmosphereShell(radius, colorHex = '#38bdf8', strength = 1.35, falloff = 2.8) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uStrength: { value: strength },
      uFalloff: { value: falloff },
    },
    vertexShader: ATMO_VERT,
    fragmentShader: ATMO_FRAG,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(radius * 1.065, 48, 32), mat);
}

/**
 * Injects biological countershading into any Three.js lit material: the dorsum (world-space
 * upward-facing skin) is darkened and patterned with disruptive dorsal saddle bars, while the
 * ventrum is lightened into a warm cream/ochre belly, with subtle subsurface scatter on grazing rims.
 */
export function injectCountershading(material, { dorsal = 0.72, ventral = 1.18, rim = 0.14 } = {}) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uDorsalShade = { value: dorsal };
    shader.uniforms.uVentralShade = { value: ventral };
    shader.uniforms.uRimTint = { value: rim };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float aVentral;\nvarying float vCounterShade;\nvarying float vVentralAttr;\nvarying vec3 vCsWorldNrm;\nvarying vec3 vCsWorldPos;\nvarying vec3 vCsModelPos;'
      )
      .replace(
        '#include <beginnormal_vertex>',
        '#include <beginnormal_vertex>\n vCsWorldNrm = normalize( mat3( modelMatrix ) * objectNormal );'
      )
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\n vCsWorldPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;\n vCsModelPos = transformed;\n vVentralAttr = clamp( aVentral, 0.0, 1.0 );\n vCounterShade = vCsWorldNrm.y * 0.55 + clamp( ( transformed.y + 0.15 ) * 0.55, -0.65, 0.75 ) * 0.45 - vVentralAttr * 0.65;'
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying float vCounterShade;\nvarying float vVentralAttr;\nvarying vec3 vCsWorldNrm;\nvarying vec3 vCsWorldPos;\nvarying vec3 vCsModelPos;\nuniform float uDorsalShade;\nuniform float uVentralShade;\nuniform float uRimTint;'
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          float cs = smoothstep( -0.62, 0.68, vCounterShade );
          float foldA = sin( vCsModelPos.x * 28.0 + sin( vCsModelPos.y * 16.0 ) * 1.6 ) * 0.5 + 0.5;
          float foldB = sin( vCsModelPos.x * 74.0 - vCsModelPos.y * 34.0 + sin( vCsModelPos.z * 28.0 ) ) * 0.5 + 0.5;
          float saddleWave = sin( vCsModelPos.x * 11.5 + sin( vCsModelPos.y * 6.0 + vCsModelPos.z * 5.0 ) * 1.4 ) * 0.5 + 0.5;
          float saddleMask = smoothstep( 0.18, 0.78, cs ) * smoothstep( 0.42, 0.85, saddleWave );
          float wrinkle = mix( 0.89, 1.05, foldA * 0.58 + foldB * 0.42 );
          vec3 creamBelly = mix( diffuseColor.rgb * 1.28 + vec3( 0.08, 0.06, 0.03 ), vec3( 0.84, 0.78, 0.67 ), 0.46 );
          float ventralMix = clamp( vVentralAttr * 0.8 + ( 1.0 - cs ) * 0.36, 0.0, 0.86 );
          diffuseColor.rgb = mix( diffuseColor.rgb, creamBelly, ventralMix );
          diffuseColor.rgb *= ( 1.0 - saddleMask * 0.22 );
          diffuseColor.rgb *= mix( uVentralShade, uDorsalShade, cs ) * wrinkle;
        }`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        {
          vec3 csV = normalize( cameraPosition - vCsWorldPos );
          float csFr = pow( 1.0 - clamp( dot( normalize( vCsWorldNrm ), csV ), 0.0, 1.0 ), 3.4 );
          vec3 sssTint = mix( diffuseColor.rgb, vec3( 0.86, 0.34, 0.16 ), 0.35 );
          totalEmissiveRadiance += sssTint * csFr * uRimTint;
        }`
      );
  };
  material.customProgramCacheKey = () => `countershade_v4_${dorsal}_${ventral}_${rim}`;
  return material;
}

// -----------------------------------------------------------------------------
// 5. PROCEDURAL TEXTURE CACHE (CANVAS-BACKED)
// -----------------------------------------------------------------------------
class ProceduralTextureCache {
  constructor() {
    this.cache = new Map();
    this.anisotropy = 8;
  }

  setAnisotropy(n) {
    this.anisotropy = Math.max(1, n | 0);
  }

  get(key, builder) {
    if (!this.cache.has(key)) {
      this.cache.set(key, builder());
    }
    return this.cache.get(key);
  }

  _canvasFromRGBA(data, size) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size);
    img.data.set(data);
    ctx.putImageData(img, 0, 0);
    return c;
  }

  _texture(canvas, { srgb = false, repeat = true } = {}) {
    const tex = new THREE.CanvasTexture(canvas);
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    if (repeat) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
    }
    tex.anisotropy = this.anisotropy;
    return tex;
  }

  softGlowSprite(colorHex = '#ffffff', size = 128) {
    return this.get(`sprite:${colorHex}:${size}`, () => {
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d');
      const r = size / 2;
      const g = ctx.createRadialGradient(r, r, 0, r, r, r);
      const [cr, cg, cb] = hexToRgb(colorHex);
      g.addColorStop(0, `rgba(255,255,255,1)`);
      g.addColorStop(0.28, `rgba(${cr},${cg},${cb},0.88)`);
      g.addColorStop(0.68, `rgba(${cr},${cg},${cb},0.24)`);
      g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    });
  }

  /** Soft radial contact-shadow decal (dark center → transparent edge). */
  contactShadowSprite(size = 256) {
    return this.get(`contactShadow:${size}`, () => {
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d');
      const r = size / 2;
      const g = ctx.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, 'rgba(0,0,0,0.82)');
      g.addColorStop(0.35, 'rgba(0,0,0,0.5)');
      g.addColorStop(0.7, 'rgba(0,0,0,0.14)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      const tex = new THREE.CanvasTexture(c);
      return tex;
    });
  }

  /** Full PBR surface set: albedo (sRGB) + tangent normal + roughness maps. */
  surfaceSet(name, baseHex, accentHex, opts = {}) {
    const style = opts.style ?? 'scales';
    const size = opts.size ?? (style === 'scales' || style === 'feathers' ? 512 : 256);
    const scale = opts.scale ?? 8;
    const seed = opts.seed ?? 17;
    const cells = opts.cells ?? 18;
    const pattern = opts.pattern ?? 'mottle';
    const patternStrength = opts.patternStrength ?? 0.55;
    const gradientAxis = opts.gradientAxis ?? 'v';
    const key = `surf2:${name}:${baseHex}:${accentHex}:${style}:${size}:${scale}:${seed}:${cells}:${pattern}:${patternStrength}:${gradientAxis}`;
    return this.get(key, () => {
      const result = synthesizeSurface({
        style,
        size,
        baseRgb: hexToRgb(baseHex),
        accentRgb: hexToRgb(accentHex),
        scale,
        seed,
        cells,
        pattern,
        patternStrength,
        gradientAxis,
      });
      const normalStrength = opts.normalStrength ?? size / 56;
      const normalRGBA = heightToNormalMap(result.height, size, normalStrength);
      const roughRGBA = roughnessToRGBA(result.rough, size);
      const map = this._texture(this._canvasFromRGBA(result.albedo, size), { srgb: true });
      const normalMap = this._texture(this._canvasFromRGBA(normalRGBA, size));
      const roughnessMap = this._texture(this._canvasFromRGBA(roughRGBA, size));
      return { map, normalMap, roughnessMap };
    });
  }

  /** Backwards-compatible alias returning map + bumpMap-like normal map. */
  surfacePair(name, baseHex, accentHex, scale = 8, seed = 11, style = 'scales') {
    const set = this.surfaceSet(name, baseHex, accentHex, { scale, seed, style });
    return { map: set.map, bumpMap: set.normalMap };
  }

  /** Procedural eyeball texture (equirectangular; iris centered on the +X pole). */
  eyeTexture(irisHex = '#c47a1c', pupil = 'slit', scleraHex = '#dfd1bc') {
    return this.get(`eye_v5:${irisHex}:${pupil}:${scleraHex}`, () => {
      const W = 512;
      const H = 256;
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d');
      const rand = mulberry32(hashString(irisHex + pupil));

      const cx = W / 2;
      const cy = H / 2;
      // Warm dark-rimmed sclera so only a subtle realistic crescent shows at the corners of the eye
      const scleraGrad = ctx.createRadialGradient(cx, cy, H * 0.26, cx, cy, H * 0.52);
      scleraGrad.addColorStop(0, '#c8b496');
      scleraGrad.addColorStop(0.55, '#8a7258');
      scleraGrad.addColorStop(1, '#2a1d14');
      ctx.fillStyle = scleraGrad;
      ctx.fillRect(0, 0, W, H);

      // Large archosaur iris (R = H * 0.34 ≈ 61° angular radius) filling most of the palpebral fissure
      const R = H * 0.34;
      const [ir, ig, ib] = hexToRgb(irisHex);
      const [ih, is, il] = rgbToHsl(ir, ig, ib);
      const sat = Math.min(1, Math.max(0.72, is * 1.25));
      const [lr, lg, lb] = hslToRgb(ih, sat, clamp(il * 1.25 + 0.08, 0.48, 0.64));
      const [mr, mg, mb] = hslToRgb(ih, sat, clamp(il * 0.95, 0.32, 0.46));
      const [dr, dg, db] = hslToRgb(ih, sat, clamp(il * 0.42, 0.1, 0.22));

      // Iris base radial gradient (golden collarette → rich amber mid-iris → dark limbal ring)
      const grad = ctx.createRadialGradient(cx, cy, R * 0.16, cx, cy, R);
      grad.addColorStop(0, `rgb(${lr | 0},${lg | 0},${lb | 0})`);
      grad.addColorStop(0.52, `rgb(${mr | 0},${mg | 0},${mb | 0})`);
      grad.addColorStop(0.84, `rgb(${dr | 0},${dg | 0},${db | 0})`);
      grad.addColorStop(1, '#090503');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      // High-contrast radial stromal fibers
      for (let i = 0; i < 220; i++) {
        const a = (i / 220) * Math.PI * 2 + rand() * 0.02;
        const inner = R * (0.22 + rand() * 0.14);
        const outer = R * (0.78 + rand() * 0.18);
        const light = rand() > 0.48;
        ctx.strokeStyle = light
          ? `rgba(${lr | 0},${lg | 0},${lb | 0},${0.35 + rand() * 0.4})`
          : `rgba(${dr | 0},${dg | 0},${db | 0},${0.45 + rand() * 0.4})`;
        ctx.lineWidth = 1.1 + rand() * 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        ctx.lineTo(cx + Math.cos(a + 0.03) * outer, cy + Math.sin(a + 0.03) * outer);
        ctx.stroke();
      }

      // Pupil (jet-black with glowing golden pupillary ruff)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = '#010101';
      ctx.strokeStyle = `rgb(${lr | 0},${lg | 0},${lb | 0})`;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      if (pupil === 'slit') {
        ctx.ellipse(0, 0, R * 0.23, R * 0.78, 0, 0, Math.PI * 2);
      } else if (pupil === 'wide') {
        ctx.ellipse(0, 0, R * 0.54, R * 0.54, 0, 0, Math.PI * 2);
      } else {
        ctx.ellipse(0, 0, R * 0.44, R * 0.44, 0, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();

      // Crisp specular corneal catchlights at upper-front and lower-back
      ctx.fillStyle = 'rgba(255, 254, 250, 0.96)';
      ctx.beginPath();
      ctx.ellipse(-R * 0.22, -R * 0.25, R * 0.14, R * 0.095, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 248, 230, 0.72)';
      ctx.beginPath();
      ctx.arc(R * 0.2, R * 0.22, R * 0.055, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Thick dark limbal ring
      ctx.strokeStyle = 'rgba(8, 4, 2, 0.96)';
      ctx.lineWidth = R * 0.12;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.95, 0, Math.PI * 2);
      ctx.stroke();

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = this.anisotropy;
      return tex;
    });
  }

  /** Alpha-cutout pennaceous feather sprite (quill at bottom, tip at top). */
  featherSprite(baseHex, accentHex, seed = 1) {
    return this.get(`feather:${baseHex}:${accentHex}:${seed}`, () => {
      const W = 128;
      const H = 256;
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d');
      const img = ctx.createImageData(W, H);
      const d = img.data;
      const base = hexToRgb(baseHex);
      const acc = hexToRgb(accentHex);
      const bandPhase = hash2(seed, 3, 9) * Math.PI * 2;
      for (let y = 0; y < H; y++) {
        const v = 1 - y / H; // 0 = quill base, 1 = tip
        const vv = clamp01((v - 0.06) / 0.94);
        const halfW = v < 0.08 ? 0.03 : 0.47 * Math.pow(Math.sin(Math.PI * Math.min(1, vv * 0.92 + 0.08)), 0.55);
        for (let x = 0; x < W; x++) {
          const u = x / W - 0.5;
          const au = Math.abs(u);
          const i4 = (y * W + x) * 4;
          let inside = au < halfW;
          // Split barbs near the vane edge
          if (inside && v > 0.2) {
            const barbIdx = Math.floor(au * 46 + v * 160);
            const split = hash2(barbIdx, seed, 17) < 0.13;
            if (split && au > halfW * 0.58) inside = false;
          }
          if (!inside) {
            d[i4 + 3] = 0;
            continue;
          }
          const edgeSoft = clamp01((halfW - au) / 0.02);
          const band = 0.5 + 0.5 * Math.sin(v * Math.PI * 5.5 + bandPhase);
          const barb = 0.92 + 0.08 * Math.sin((au * 70 + v * 120) * Math.PI);
          const rachis = Math.exp(-Math.pow(u / 0.016, 2));
          const tipDark = smoothstep(0.86, 1.0, v);
          const t = clamp01(band * 0.55 + v * 0.3);
          const k = barb * (1 - 0.3 * tipDark) * (1 + 0.18 * rachis);
          d[i4] = lerp(base[0], acc[0], t) * k;
          d[i4 + 1] = lerp(base[1], acc[1], t) * k;
          d[i4 + 2] = lerp(base[2], acc[2], t) * k;
          d[i4 + 3] = 255 * edgeSoft;
        }
      }
      ctx.putImageData(img, 0, 0);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = this.anisotropy;
      return tex;
    });
  }
}

export const PBR = new ProceduralTextureCache();

// -----------------------------------------------------------------------------
// 6. MATERIAL FACTORIES
// -----------------------------------------------------------------------------
const SKIN_STYLES = new Set(['scales', 'feathers']);

/**
 * Physically-based procedural material.
 * opts: style, roughness, bumpScale (→ normalScale), scale, seed, cells, pattern, patternStrength,
 *       naturalize ('skin' | 'belly' | 'accent' | 'foliage' | false), clearcoat, sheen, doubleSide,
 *       transparent, opacity, emissive, emissiveIntensity, countershade (bool), wet (bool), size
 */
export function makePBRMaterial(name, baseHex, accentHex, opts = {}) {
  const style = opts.style ?? 'scales';
  const isSkin = SKIN_STYLES.has(style);
  const naturalMode = opts.naturalize === undefined ? (isSkin ? 'skin' : false) : opts.naturalize;
  let base = baseHex;
  let accent = accentHex;
  if (naturalMode) {
    base = naturalizeColor(baseHex, naturalMode);
    accent = naturalizeColor(accentHex, naturalMode === 'skin' ? 'accent' : naturalMode);
  }

  const { map, normalMap, roughnessMap } = PBR.surfaceSet(name, base, accent, {
    style,
    scale: opts.scale,
    seed: opts.seed,
    cells: opts.cells,
    pattern: opts.pattern,
    patternStrength: opts.patternStrength,
    gradientAxis: opts.gradientAxis,
    size: opts.size,
    normalStrength: opts.normalStrength,
  });

  const normalAmt = opts.normalScale ?? clamp((opts.bumpScale ?? 0.08) * 9, 0.35, 1.4);
  const wet = Boolean(opts.wet);
  const clearcoat = opts.clearcoat ?? (style === 'scales' ? (wet ? 0.7 : 0.18) : 0);
  const sheen = opts.sheen ?? (style === 'feathers' ? 0.65 : 0);
  const [br, bg, bb] = hexToRgb(base);
  const sheenColor = new THREE.Color(
    clamp01(br / 255 * 1.35 + 0.1),
    clamp01(bg / 255 * 1.35 + 0.1),
    clamp01(bb / 255 * 1.35 + 0.1)
  );

  const mat = new THREE.MeshPhysicalMaterial({
    map,
    normalMap,
    normalScale: new THREE.Vector2(normalAmt, normalAmt),
    roughnessMap,
    roughness: clamp((opts.roughness ?? 0.6) + 0.22, 0.25, 1.0),
    metalness: opts.metalness ?? 0.0,
    clearcoat,
    clearcoatRoughness: wet ? 0.18 : 0.42,
    sheen,
    sheenRoughness: 0.55,
    sheenColor,
    specularIntensity: style === 'feathers' ? 0.35 : 0.7,
    emissive: opts.emissive ? new THREE.Color(opts.emissive) : new THREE.Color(0x000000),
    emissiveIntensity: opts.emissiveIntensity ?? 0.0,
    transparent: Boolean(opts.transparent),
    opacity: opts.opacity ?? 1.0,
    side: opts.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
    envMapIntensity: opts.envMapIntensity ?? 1.0,
  });

  if (opts.countershade ?? isSkin) {
    injectCountershading(mat, {
      dorsal: opts.dorsalShade ?? 0.76,
      ventral: opts.ventralShade ?? 1.14,
      rim: style === 'feathers' ? 0.08 : 0.1,
    });
  }
  mat.userData.style = style;
  if (opts.lockUV) mat.userData.lockUV = true;
  return mat;
}

export const KERATIN_PRESETS = {
  tooth: ['#d9c38f', '#fff8e4'],
  fang: ['#cdb27c', '#fff5dc'],
  claw: ['#2a2420', '#6b5f55'],
  horn: ['#b89a6a', '#efe3c6'],
  darkHorn: ['#3b312a', '#8f7f6d'],
  beak: ['#3a342f', '#8d8174'],
  brightBeak: ['#b4621c', '#f2c76b'],
  hoof: ['#4a403a', '#8c7f73'],
  scute: ['#6b5a46', '#b9a383'],
};

/** Keratin / enamel material for teeth, claws, horns, beaks (root → tip gradient, clearcoat). */
export function makeKeratinMaterial(kind = 'tooth', opts = {}) {
  const [rootHex, tipHex] = KERATIN_PRESETS[kind] || KERATIN_PRESETS.tooth;
  const mat = makePBRMaterial(`keratin_${kind}_${opts.gradientAxis || 'v'}`, opts.rootHex || rootHex, opts.tipHex || tipHex, {
    style: 'keratin',
    size: 128,
    scale: 4,
    roughness: opts.roughness ?? 0.22,
    bumpScale: 0.04,
    clearcoat: opts.clearcoat ?? 0.55,
    naturalize: false,
    countershade: false,
    gradientAxis: opts.gradientAxis || 'v',
    lockUV: true,
    envMapIntensity: 1.1,
  });
  mat.userData.hardTissue = true;
  return mat;
}

export function makeSoftTissueMaterial(colorHex = '#8b2b3c', opts = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    roughness: opts.roughness ?? 0.38,
    clearcoat: opts.clearcoat ?? 0.6,
    clearcoatRoughness: 0.3,
    metalness: 0,
    side: opts.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
  });
}

// -----------------------------------------------------------------------------
// 7. REALISTIC EYE BUILDER
// -----------------------------------------------------------------------------
/**
 * Builds a living eye: textured eyeball (iris + pupil), wet corneal cap, fleshy orbital rim,
 * and two blinking eyelids. The eye looks along local +X before `gaze` orientation is applied.
 */
export function buildRealisticEye({
  radius = 0.05,
  irisHex = '#c47a1c',
  pupil = 'slit',
  scleraHex = '#dfd1bc',
  lidMaterial = null,
  rimHex = '#1f1813',
  gaze = new THREE.Vector3(0.3, 0.05, 1),
} = {}) {
  const group = new THREE.Group();

  const eyeMat = new THREE.MeshPhysicalMaterial({
    map: PBR.eyeTexture(irisHex, pupil, scleraHex),
    roughness: 0.24,
    metalness: 0,
    clearcoat: 0.85,
    clearcoatRoughness: 0.08,
    specularIntensity: 0.45,
    envMapIntensity: 0.35,
  });
  const eyeball = new THREE.Mesh(new THREE.SphereGeometry(radius, 36, 24), eyeMat);
  eyeball.userData.eyePart = true;
  eyeball.userData.noRefine = true;
  group.add(eyeball);

  const corneaMat = new THREE.MeshPhysicalMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.02,
    roughness: 0.05,
    metalness: 0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    depthWrite: false,
    envMapIntensity: 0.45,
  });
  const cornea = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.038, 28, 14, Math.PI - 0.85, 1.7, 0.65, 1.8),
    corneaMat
  );
  cornea.userData.eyePart = true;
  cornea.userData.noRefine = true;
  cornea.userData.noShadow = true;
  group.add(cornea);

  // Dark inner palpebral rim (wet caruncle & eyelid margin)
  const rimMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(rimHex),
    roughness: 0.42,
    clearcoat: 0.55,
    clearcoatRoughness: 0.35,
  });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.01, radius * 0.09, 12, 32), rimMat);
  rim.rotation.y = Math.PI / 2;
  rim.position.x = radius * 0.04;
  rim.userData.noRefine = true;
  group.add(rim);

  // Full-azimuth upper and lower eyelids with a wide open palpebral fissure around the +X iris pole
  const lidMat = lidMaterial || rimMat;
  const upperLid = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.07, 28, 12, 0, Math.PI * 2, 0.0, Math.PI * 0.28),
    lidMat
  );
  upperLid.rotation.z = -0.1;
  upperLid.userData.noRefine = true;
  const lowerLid = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.06, 28, 12, 0, Math.PI * 2, Math.PI * 0.74, Math.PI * 0.26),
    lidMat
  );
  lowerLid.rotation.z = 0.08;
  lowerLid.userData.noRefine = true;
  group.add(upperLid, lowerLid);

  // Thick scaly circumorbital socket ring that embeds the back of the eye into the skull
  const socketHood = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.04, radius * 0.26, 14, 32),
    lidMat
  );
  socketHood.rotation.y = Math.PI / 2;
  socketHood.scale.set(1.2, 0.92, 0.72);
  socketHood.position.x = -radius * 0.18;
  socketHood.userData.noRefine = true;
  group.add(socketHood);

  // Align local +X with gaze while keeping local +Y upright (dorsal up) so eyelids & vertical slit pupil never roll sideways!
  const xAxis = gaze.clone().normalize();
  const upRef = new THREE.Vector3(0, 1, 0);
  const zAxis = new THREE.Vector3().crossVectors(xAxis, upRef).normalize();
  const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
  const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  group.quaternion.setFromRotationMatrix(basis);

  return {
    group,
    eyeball,
    cornea,
    upperLid,
    lowerLid,
    /** blink ∈ [0,1]; saccadeYaw/Pitch in radians. */
    update(blink = 0, saccadeYaw = 0, saccadePitch = 0) {
      upperLid.rotation.z = -0.1 - blink * 0.92;
      lowerLid.rotation.z = 0.08 + blink * 0.48;
      eyeball.rotation.y = saccadeYaw;
      eyeball.rotation.z = saccadePitch;
      cornea.rotation.y = saccadeYaw;
      cornea.rotation.z = saccadePitch;
    },
    setVisible(v) {
      eyeball.visible = v;
      cornea.visible = v;
    },
  };
}

// -----------------------------------------------------------------------------
// 8. PENNACEOUS FEATHER CARDS & FANS
// -----------------------------------------------------------------------------
export function makeFeatherCardMaterial(name, baseHex, accentHex, opts = {}) {
  const base = opts.naturalize === false ? baseHex : naturalizeColor(baseHex, 'accent');
  const accent = opts.naturalize === false ? accentHex : naturalizeColor(accentHex, 'accent');
  const [br, bg, bb] = hexToRgb(base);
  const mat = new THREE.MeshPhysicalMaterial({
    map: PBR.featherSprite(base, accent, hashString(name) % 97),
    alphaTest: 0.45,
    side: THREE.DoubleSide,
    roughness: 0.62,
    metalness: 0,
    sheen: 0.85,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color(clamp01(br / 255 + 0.25), clamp01(bg / 255 + 0.25), clamp01(bb / 255 + 0.25)),
    specularIntensity: 0.3,
    envMapIntensity: 0.9,
  });
  mat.userData.featherCard = true;
  mat.userData.lockUV = true;
  return mat;
}

/**
 * Fan of overlapping feather cards. Cards point along local +Y from the origin and spread
 * about local Z (in the XY plane). Orient the returned group as needed.
 */
export function buildFeatherFan(material, {
  count = 9,
  length = 0.4,
  width = 0.09,
  spread = Math.PI * 0.42,
  taper = 0.35,
  curl = 0.12,
  layerGap = 0.004,
  startAngle = null,
} = {}) {
  const group = new THREE.Group();
  const a0 = startAngle === null ? -spread / 2 : startAngle;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const len = length * (1 - taper * Math.abs(t - 0.5) * 2);
    const geo = new THREE.PlaneGeometry(width, len, 2, 6);
    const pos = geo.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const y = pos.getY(v) + len / 2;
      const x = pos.getX(v);
      const n = y / len;
      pos.setY(v, y);
      pos.setZ(v, -curl * n * n * len + Math.abs(x / width) * 0.015);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    const card = new THREE.Mesh(geo, material);
    card.rotation.z = a0 + spread * t;
    card.position.z = layerGap * (i - (count - 1) / 2);
    card.castShadow = true;
    card.receiveShadow = true;
    card.userData.noRefine = true;
    group.add(card);
  }
  return group;
}

// -----------------------------------------------------------------------------
// 9. PROCEDURAL HDR ENVIRONMENT (FOR PMREM IMAGE-BASED LIGHTING)
// -----------------------------------------------------------------------------
const ENV_SKY_VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const ENV_SKY_FRAG = `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  vec3 col;
  if (d.y >= 0.0) {
    col = mix(uHorizon, uZenith, pow(d.y, 0.6));
  } else {
    col = mix(uHorizon, uGround, pow(-d.y, 0.45));
  }
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  col += uSunColor * (pow(sd, 1400.0) * 90.0 + pow(sd, 32.0) * 2.2 + pow(sd, 6.0) * 0.35);
  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * Builds a small HDR environment scene (gradient paleo-sky, sun, soft studio panels, warm
 * ground bounce) to be baked with PMREMGenerator.fromScene(). Tinted per geological era.
 */
export function buildStudioEnvironmentScene({ skyTint = [0.05, 0.1, 0.2], themeHex = '#10b981', sunDir = new THREE.Vector3(0.44, 0.76, 0.49) } = {}) {
  const scene = new THREE.Scene();
  const theme = new THREE.Color(themeHex);
  const zenith = new THREE.Color(0.14 + skyTint[0] * 1.6, 0.26 + skyTint[1] * 1.6, 0.52 + skyTint[2] * 1.6);
  const horizon = new THREE.Color(0.78, 0.74, 0.68).lerp(theme, 0.18);
  const ground = new THREE.Color(0.12, 0.1, 0.08);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(60, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: {
        uZenith: { value: zenith },
        uHorizon: { value: horizon },
        uGround: { value: ground },
        uSunDir: { value: sunDir.clone().normalize() },
        uSunColor: { value: new THREE.Color(1.0, 0.93, 0.82) },
      },
      vertexShader: ENV_SKY_VERT,
      fragmentShader: ENV_SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
    })
  );
  scene.add(sky);

  const panel = (w, h, color, intensity, pos) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide })
    );
    m.position.copy(pos);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  panel(12, 7, 0xfff4e4, 4.2, new THREE.Vector3(7, 10, 8)); // warm key soft-box
  panel(9, 5, 0xdbe9ff, 1.5, new THREE.Vector3(-9, 4, 4)); // cool fill
  panel(7, 4, 0xe8f2ff, 2.6, new THREE.Vector3(-4, 7, -10)); // rim
  panel(30, 30, 0x3a2e24, 0.9, new THREE.Vector3(0, -6, 0)); // warm ground bounce

  return scene;
}

// -----------------------------------------------------------------------------
// 10. PALEO-EARTH CONTINENTAL DRIFT ENGINE (PANGAEA 298 MYA → TODAY)
// -----------------------------------------------------------------------------
const CONTINENT_PLATES = [
  {
    id: 'North America',
    color: '#2d6a4f',
    mountainColor: '#8d775f',
    pangaeaPos: [0.43, 0.38],
    midPos100Ma: [0.30, 0.33],
    modernPos: [0.22, 0.30],
    poly: [
      [-0.09, -0.10], [-0.02, -0.13], [0.06, -0.09], [0.08, -0.02],
      [0.03, 0.06], [-0.01, 0.11], [-0.05, 0.07], [-0.10, -0.01],
    ],
  },
  {
    id: 'South America',
    color: '#1b4332',
    mountainColor: '#9c6644',
    pangaeaPos: [0.46, 0.62],
    midPos100Ma: [0.38, 0.64],
    modernPos: [0.32, 0.65],
    poly: [
      [-0.04, -0.09], [0.03, -0.08], [0.06, -0.01], [0.03, 0.09],
      [-0.01, 0.14], [-0.04, 0.08], [-0.05, -0.01],
    ],
  },
  {
    id: 'Africa',
    color: '#b5835a',
    mountainColor: '#52796f',
    pangaeaPos: [0.53, 0.56],
    midPos100Ma: [0.53, 0.53],
    modernPos: [0.54, 0.52],
    poly: [
      [-0.06, -0.10], [0.03, -0.10], [0.07, -0.03], [0.05, 0.09],
      [0.01, 0.14], [-0.03, 0.07], [-0.07, -0.01],
    ],
  },
  {
    id: 'Eurasia',
    color: '#40916c',
    mountainColor: '#a5a58d',
    pangaeaPos: [0.57, 0.34],
    midPos100Ma: [0.64, 0.30],
    modernPos: [0.68, 0.28],
    poly: [
      [-0.13, -0.07], [-0.02, -0.11], [0.12, -0.09], [0.16, -0.01],
      [0.11, 0.07], [0.01, 0.09], [-0.09, 0.05], [-0.14, -0.01],
    ],
  },
  {
    id: 'India',
    color: '#52b788',
    mountainColor: '#e9edc9',
    pangaeaPos: [0.59, 0.69],
    midPos100Ma: [0.64, 0.58],
    modernPos: [0.70, 0.43],
    poly: [
      [-0.025, -0.04], [0.025, -0.04], [0.03, 0.02], [0.0, 0.06], [-0.03, 0.02],
    ],
  },
  {
    id: 'Australia',
    color: '#d4a373',
    mountainColor: '#7f5539',
    pangaeaPos: [0.65, 0.74],
    midPos100Ma: [0.74, 0.72],
    modernPos: [0.82, 0.68],
    poly: [
      [-0.045, -0.035], [0.045, -0.04], [0.05, 0.03], [-0.01, 0.05], [-0.05, 0.02],
    ],
  },
  {
    id: 'Antarctica',
    color: '#94a3b8',
    mountainColor: '#cbd5e1',
    pangaeaPos: [0.56, 0.80],
    midPos100Ma: [0.55, 0.87],
    modernPos: [0.52, 0.92],
    poly: [
      [-0.14, -0.03], [0.14, -0.03], [0.18, 0.03], [-0.18, 0.03],
    ],
  },
];

export function renderContinentalDriftTexture(paleoMa = 152, options = {}) {
  const w = options.width || 1024;
  const h = options.height || 512;
  const canvas = options.canvas || document.createElement('canvas');
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d');

  // 1. Deep Panthalassa / Tethys Ocean Gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
  oceanGrad.addColorStop(0, '#041e42');
  oceanGrad.addColorStop(0.5, '#0353a4');
  oceanGrad.addColorStop(1, '#022c5e');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle lat/lon graticule grid
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.14)';
  ctx.lineWidth = 1;
  for (let gx = 1; gx < 8; gx++) {
    ctx.beginPath();
    ctx.moveTo((w * gx) / 8, 0);
    ctx.lineTo((w * gx) / 8, h);
    ctx.stroke();
  }
  for (let gy = 1; gy < 4; gy++) {
    ctx.beginPath();
    ctx.moveTo(0, (h * gy) / 4);
    ctx.lineTo(w, (h * gy) / 4);
    ctx.stroke();
  }

  const clampedMa = Math.max(0, Math.min(285, paleoMa));

  const interpPos = (plate) => {
    if (clampedMa >= 100) {
      const t = Math.max(0, Math.min(1, (260 - clampedMa) / 160));
      return [
        plate.pangaeaPos[0] + (plate.midPos100Ma[0] - plate.pangaeaPos[0]) * t,
        plate.pangaeaPos[1] + (plate.midPos100Ma[1] - plate.pangaeaPos[1]) * t,
      ];
    } else {
      const t = (100 - clampedMa) / 100;
      return [
        plate.midPos100Ma[0] + (plate.modernPos[0] - plate.midPos100Ma[0]) * t,
        plate.midPos100Ma[1] + (plate.modernPos[1] - plate.midPos100Ma[1]) * t,
      ];
    }
  };

  // 2. Mid-Atlantic Rift Zone (210 Ma → 10 Ma)
  if (clampedMa < 225 && clampedMa > 5) {
    ctx.save();
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.58)';
    ctx.lineWidth = 3.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(w * 0.39, h * 0.18);
    ctx.bezierCurveTo(w * 0.44, h * 0.42, w * 0.42, h * 0.62, w * 0.46, h * 0.85);
    ctx.stroke();
    ctx.restore();
  }

  // 3. Draw Each Drifting Continental Plate + Shallow Epicontinental Seas
  CONTINENT_PLATES.forEach((plate) => {
    const [cx, cy] = interpPos(plate);

    ctx.save();
    ctx.translate(cx * w, cy * h);

    // Shallow turquoise continental shelf (Tethys / Western Interior Seaway)
    ctx.beginPath();
    plate.poly.forEach(([px, py], i) => {
      const sx = px * w * 1.16;
      const sy = py * h * 1.16;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.32)';
    ctx.fill();

    // Main continental landmass
    ctx.beginPath();
    plate.poly.forEach(([px, py], i) => {
      const sx = px * w;
      const sy = py * h;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.closePath();
    ctx.fillStyle = clampedMa > 215 ? '#9a3412' : plate.color; // Arid red-beds in Permian/Triassic
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#a7f3d0';
    ctx.stroke();

    // Interior mountain ridge
    ctx.beginPath();
    plate.poly.forEach(([px, py], i) => {
      const sx = px * w * 0.5;
      const sy = py * h * 0.5;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.closePath();
    ctx.fillStyle = plate.mountainColor;
    ctx.fill();

    // Western Interior Seaway splitting North America during Late Cretaceous (100 - 66 MYA)
    if (plate.id === 'North America' && clampedMa >= 65 && clampedMa <= 105) {
      ctx.fillStyle = 'rgba(14, 165, 233, 0.78)';
      ctx.fillRect(-w * 0.015, -h * 0.11, w * 0.026, h * 0.21);
    }

    if (options.showLabels !== false) {
      ctx.font = `bold ${Math.max(11, Math.round(w * 0.015))}px system-ui, sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 4;
      ctx.fillText(plate.id, 0, 4);
    }
    ctx.restore();
  });

  // 4. Fossil Discovery Radar Pin
  if (options.mapPin && Array.isArray(options.mapPin)) {
    const [pu, pv] = options.mapPin;
    const px = pu * w;
    const py = pv * h;
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, Math.max(10, w * 0.022), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(250, 204, 21, 0.32)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#facc15';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(px, py, Math.max(4, w * 0.008), 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (options.pinLabel) {
      ctx.font = `bold ${Math.max(11, Math.round(w * 0.016))}px system-ui, sans-serif`;
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 5;
      ctx.fillText(`🦴 ${options.pinLabel}`, px + 14, py + 5);
    }
    ctx.restore();
  }

  return canvas;
}

export function createDriftingEarthGlobe(initialMa = 152, radius = 1.5, options = {}) {
  const group = new THREE.Group();
  const canvas = renderContinentalDriftTexture(initialMa, options);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.42,
    metalness: 0.08,
  });

  const globe = new THREE.Mesh(new THREE.SphereGeometry(radius, 56, 40), mat);
  globe.castShadow = true;
  globe.receiveShadow = true;
  group.add(globe);

  const atmo = makeAtmosphereShell(radius, '#38bdf8', 1.25, 2.9);
  group.add(atmo);

  return {
    group,
    globe,
    setPaleoMa(ma, extraOpts = {}) {
      renderContinentalDriftTexture(ma, { ...options, ...extraOpts, canvas });
      tex.needsUpdate = true;
    },
  };
}
