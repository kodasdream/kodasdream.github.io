// Floating island generator. Takes a set of tiles and produces a chunky floating rock: a sandy top
// with painted grass patches, faceted vertical rock-column cliffs, and an underside that breaks into
// hanging rock spikes and dangling roots. Also provides height/walkability queries.
import { THREE } from './renderer.js';
import { noise3, fbm2, smoothstep, clamp, RNG } from '../core/util.js';
import { toonify, addOutlines } from './toon.js';

/**
 * cells: array of [x, z] tiles. Tile (x, z) covers [x, x+1] x [z, z+1].
 * opts: { y, thickness, depth, res, extend, rough, topAmp, seed, mats, texScale, under, grassBias(x,z), ink }
 */
export function buildIsland(cells, opts = {}) {
  const y0 = opts.y ?? 0;
  const T = opts.thickness ?? 2.2;
  const D = opts.depth ?? 4.5;
  const res = opts.res ?? 3;
  const extend = opts.extend ?? 0.32;
  const rough = opts.rough ?? 0.22;
  const topAmp = opts.topAmp ?? 0.1;
  const seed = opts.seed ?? 1;
  const withUnder = opts.under !== false;
  const bevel = 0.07;
  const s = 1 / res;
  const rng = new RNG(seed * 977 + 13);

  const occ = new Set(cells.map(([x, z]) => x + ',' + z));
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of cells) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
  const ox = minX - 2, oz = minZ - 2;
  const nx = Math.ceil((maxX - minX + 5) * res) + 1;
  const nz = Math.ceil((maxZ - minZ + 5) * res) + 1;

  // ---- signed field: positive inside
  const field = new Float32Array(nx * nz);
  const sx = (i) => ox + i * s, sz = (j) => oz + j * s;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const px = sx(i), pz = sz(j);
    const cx = Math.floor(px), cz = Math.floor(pz);
    let best = 3;
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      if (!occ.has((cx + dx) + ',' + (cz + dz))) continue;
      const qx = Math.abs(px - (cx + dx + 0.5)) - 0.5;
      const qz = Math.abs(pz - (cz + dz + 0.5)) - 0.5;
      const out = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0);
      if (out < best) best = out;
    }
    field[j * nx + i] = -best + extend + rough * fbm2(px * 0.35 + seed * 7.1, pz * 0.35 - seed * 3.3, 3);
  }
  for (let pass = 0; pass < 2; pass++) {
    const tmp = new Float32Array(field);
    for (let j = 1; j < nz - 1; j++) for (let i = 1; i < nx - 1; i++) {
      let sum = 0;
      for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) sum += tmp[(j + b) * nx + i + a];
      field[j * nx + i] = sum / 9;
    }
  }
  const F = (i, j) => field[j * nx + i];
  const topY = (x, z, f) => y0 + topAmp * fbm2(x * 0.18 + seed, z * 0.18 - seed, 3) * smoothstep(0, 0.8, f) - bevel * (1 - smoothstep(0, 0.2, f));

  // ---- top surface via clipped marching squares
  const tPos = [], tIdx = [], tCol = [], tGrass = [];
  const vmap = new Map();
  const vert = (key, x, z, f) => {
    if (vmap.has(key)) return vmap.get(key);
    const id = tPos.length / 3;
    tPos.push(x, topY(x, z, f), z);
    const rim = 0.88 + 0.12 * smoothstep(0, 0.45, f);
    tCol.push(rim, rim, rim);
    tGrass.push(opts.grassBias ? opts.grassBias(x, z, f) : 0);
    vmap.set(key, id);
    return id;
  };
  const segs = [];
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const c = [[i, j], [i, j + 1], [i + 1, j + 1], [i + 1, j]];
    const v = c.map(([a, b]) => F(a, b));
    if (v.every((x) => x <= 0)) continue;
    const poly = [];
    for (let k = 0; k < 4; k++) {
      const [a, b] = c[k], [a2, b2] = c[(k + 1) % 4];
      const va = v[k], vb = v[(k + 1) % 4];
      if (va > 0) poly.push({ id: vert(`c${a},${b}`, sx(a), sz(b), va), cross: false });
      if ((va > 0) !== (vb > 0)) {
        const t = va / (va - vb);
        const key = a === a2 ? `v${a},${Math.min(b, b2)}` : `h${Math.min(a, a2)},${b}`;
        poly.push({ id: vert(key, sx(a) + (sx(a2) - sx(a)) * t, sz(b) + (sz(b2) - sz(b)) * t, 0), cross: true });
      }
    }
    for (let k = 1; k < poly.length - 1; k++) tIdx.push(poly[0].id, poly[k].id, poly[k + 1].id);
    for (let k = 0; k < poly.length; k++) {
      const a = poly[k], b = poly[(k + 1) % poly.length];
      if (a.cross && b.cross) segs.push([a.id, b.id]);
    }
  }

  // ---- chain boundary segments into loops
  const next = new Map();
  for (const [a, b] of segs) next.set(a, b);
  const used = new Set();
  const loops = [];
  for (const [a] of segs) {
    if (used.has(a)) continue;
    const loop = [];
    let cur = a, guard = 0;
    while (!used.has(cur) && next.has(cur) && guard++ < 100000) { used.add(cur); loop.push(cur); cur = next.get(cur); }
    if (loop.length > 8) loops.push(loop);
  }
  loops.sort((p, q) => q.length - p.length);

  const fieldAt = (x, z) => {
    const fi = clamp((x - ox) / s, 0, nx - 1.001), fj = clamp((z - oz) / s, 0, nz - 1.001);
    const i = Math.floor(fi), j = Math.floor(fj), u = fi - i, w = fj - j;
    return (F(i, j) * (1 - u) + F(i + 1, j) * u) * (1 - w) + (F(i, j + 1) * (1 - u) + F(i + 1, j + 1) * u) * w;
  };
  const grad = (x, z) => { const e = 0.15; return [fieldAt(x + e, z) - fieldAt(x - e, z), fieldAt(x, z + e) - fieldAt(x, z - e)]; };

  const topGeo = new THREE.BufferGeometry();
  topGeo.setAttribute('position', new THREE.Float32BufferAttribute(tPos, 3));
  topGeo.setAttribute('color', new THREE.Float32BufferAttribute(tCol, 3));
  topGeo.setAttribute('aGrass', new THREE.Float32BufferAttribute(tGrass, 1));
  const tUv = [];
  const ts = opts.texScale ?? 7;
  for (let k = 0; k < tPos.length; k += 3) tUv.push(tPos[k] / ts, -tPos[k + 2] / ts);
  topGeo.setAttribute('uv', new THREE.Float32BufferAttribute(tUv, 2));
  topGeo.setIndex(tIdx);
  topGeo.computeVertexNormals();

  // ---- faceted rock-column cliffs and underside
  const sPos = [], sUv = [], sIdx = [], sCol = [];
  const uPos = [], uUv = [], uIdx = [], uCol = [];
  const bottoms = [];
  loops.forEach((loop, li) => {
    // resample the loop at even spacing
    const raw = loop.map((id) => [tPos[id * 3], tPos[id * 3 + 1], tPos[id * 3 + 2]]);
    const arcRaw = [0];
    for (let k = 1; k <= raw.length; k++) { const a = raw[k - 1], b = raw[k % raw.length]; arcRaw.push(arcRaw[k - 1] + Math.hypot(b[0] - a[0], b[2] - a[2])); }
    const total = arcRaw[raw.length];
    const n = Math.max(12, Math.round(total / 0.11));
    const pts = [];
    let seg = 0;
    for (let k = 0; k < n; k++) {
      const d = (k / n) * total;
      while (arcRaw[seg + 1] < d) seg++;
      const a = raw[seg], b = raw[(seg + 1) % raw.length];
      const t = (d - arcRaw[seg]) / Math.max(1e-6, arcRaw[seg + 1] - arcRaw[seg]);
      pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, d]);
    }
    // columns along the arc
    const colOf = [];
    const cols = [];
    let acc = 0, ci = 0, cw = rng.range(0.35, 0.8);
    for (let k = 0; k < n; k++) {
      const d = pts[k][3];
      while (d > acc + cw) { acc += cw; ci++; cw = rng.range(0.35, 0.8); }
      if (!cols[ci]) cols[ci] = { depth: rng.range(-0.04, 0.1), len: rng.range(0.85, 1.35), drop: rng.range(0.35, 1.0), start: acc, w: cw };
      colOf.push([ci, (d - acc) / cw]);
    }
    const outward = pts.map(([x, , z]) => { const [gx, gz] = grad(x, z); const l = Math.hypot(gx, gz) || 1; return [-gx / l, -gz / l]; });
    const rows = [[0, 0], [0.035, -0.05], [0.06, -0.14], [1, -0.32], [1, -0.55], [1, -0.78], [0.9, -1]];
    const base = sPos.length / 3;
    const nCol = cols.length;
    for (let k = 0; k <= n; k++) {
      const kk = k % n;
      const p = pts[kk], o = outward[kk];
      const [c, u] = k === n ? [nCol, 0] : colOf[kk];
      const C = cols[c % nCol];
      const ridge = 0.1 * (0.5 - Math.abs(u - 0.5));
      const L = T * (k === n ? cols[0].len : C.len);
      for (let r = 0; r < rows.length; r++) {
        const [mode, dy] = rows[r];
        let off = mode < 1 ? mode : (C.depth + ridge) * (r === rows.length - 1 ? 0.6 : 1) + 0.05;
        const jag = r >= 3 ? 0.05 * noise3(p[0] * 1.3, dy * 3, p[2] * 1.3 + seed) : 0;
        off += jag;
        const yy = r === 0 ? p[1] : y0 - bevel + dy * (r <= 2 ? 1 : L);
        sPos.push(p[0] + o[0] * off, yy, p[2] + o[1] * off);
        // texture: one painted column per geometric column, v from rim down
        sUv.push(((k === n ? nCol : c) + u) / 10, Math.min(1, (y0 - yy) / (T * 1.35)));
        const shade = 1 - 0.32 * clamp((y0 - yy) / (T * 1.4), 0, 1);
        sCol.push(shade, shade, shade);
      }
      if (k < n) bottoms.push({ x: p[0] + o[0] * 0.05, y: y0 - bevel - L, z: p[2] + o[1] * 0.05, ox: o[0], oz: o[1], col: c, drop: C.drop });
    }
    for (let k = 0; k < n; k++) for (let r = 0; r < rows.length - 1; r++) {
      const a = base + k * rows.length + r, b = base + (k + 1) * rows.length + r;
      sIdx.push(a, a + 1, b, b, a + 1, b + 1);
    }
    if (li > 0 || !withUnder) return;
    // underside: jagged lobes converging to a center tip
    let cx = 0, cz = 0;
    for (const p of pts) { cx += p[0]; cz += p[2]; }
    cx /= n; cz /= n;
    const U = 7;
    const ubase = uPos.length / 3;
    const bot = bottoms.slice(bottoms.length - n);
    for (let k = 0; k <= n; k++) {
      const b = bot[k % n];
      const C = cols[b.col % nCol];
      const ridge = 0.12 * (0.5 - Math.abs(colOf[k % n][1] - 0.5));
      for (let u = 0; u <= U; u++) {
        const t = u / U;
        const shrink = Math.pow(1 - t, 0.85);
        const lobe = D * (0.45 + 0.55 * C.drop);
        const x = cx + (b.x - cx) * shrink + b.ox * ridge * (1 - t);
        const z = cz + (b.z - cz) * shrink + b.oz * ridge * (1 - t);
        const yy = b.y - lobe * Math.pow(t, 0.9) - (u === U ? D * 0.25 : 0);
        uPos.push(x, yy, z);
        uUv.push((b.col + colOf[k % n][1]) / 7, (y0 - yy) / 5);
        const shade = 0.8 - 0.45 * t;
        uCol.push(shade, shade * 0.97, shade * 1.03);
      }
    }
    for (let k = 0; k < n; k++) for (let u = 0; u < U; u++) {
      const a = ubase + k * (U + 1) + u, b = ubase + (k + 1) * (U + 1) + u;
      uIdx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  });

  const mk = (pos, uv, idx, col) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };

  const group = new THREE.Group();
  const top = new THREE.Mesh(topGeo, opts.mats.top);
  top.receiveShadow = true;
  top.userData.ground = true;
  const side = new THREE.Mesh(mk(sPos, sUv, sIdx, sCol), opts.mats.side);
  side.castShadow = true;
  side.receiveShadow = true;
  group.add(top, side);
  const ink = opts.ink ?? 0x1a1024;
  const inked = [side];
  if (withUnder && uPos.length) {
    const under = new THREE.Mesh(mk(uPos, uUv, uIdx, uCol), opts.mats.under);
    group.add(under);
    inked.push(under);
    // hanging rock spikes under the island
    const spikes = [];
    const area = cells.length;
    const nSp = Math.min(14, 2 + Math.floor(area / 10));
    for (let i = 0; i < nSp; i++) {
      const [cxk, czk] = cells[rng.int(0, cells.length - 1)];
      const px = cxk + rng.range(0.1, 0.9), pz = czk + rng.range(0.1, 0.9);
      const f = fieldAt(px, pz);
      if (f < 0.6) continue;
      const len = rng.range(1.2, 2.2 + D * 0.4) * (0.6 + 0.4 * Math.min(1, f / 2.5));
      const r = rng.range(0.25, 0.6);
      const g = new THREE.ConeGeometry(r, len, rng.int(5, 7), 3).toNonIndexed();
      const pos = g.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        const yy = pos.getY(v);
        pos.setX(v, pos.getX(v) + 0.06 * noise3(pos.getX(v) * 3, yy * 2, i));
      }
      g.computeVertexNormals();
      g.rotateX(Math.PI);
      g.rotateZ(rng.range(-0.15, 0.15));
      g.translate(px, y0 - T - 0.2 - len / 2 + rng.range(-0.2, 0.3), pz);
      const nC = g.attributes.position.count;
      const cc = new Float32Array(nC * 3);
      for (let v = 0; v < nC; v++) { const t = clamp((y0 - T - g.attributes.position.getY(v)) / (len + 1), 0, 1); const sh = 0.75 - 0.45 * t; cc[v * 3] = sh; cc[v * 3 + 1] = sh * 0.97; cc[v * 3 + 2] = sh * 1.03; }
      g.setAttribute('color', new THREE.BufferAttribute(cc, 3));
      spikes.push(g);
    }
    if (spikes.length) {
      const merged = mergeList(spikes);
      const sm = new THREE.Mesh(merged, opts.mats.under);
      group.add(sm);
      inked.push(sm);
    }
    // dangling roots from the cliff bottoms
    if (opts.roots !== false) {
      const roots = [];
      const nR = Math.min(40, Math.floor(bottoms.length / 6));
      for (let i = 0; i < nR; i++) {
        const b = bottoms[rng.int(0, bottoms.length - 1)];
        const len = rng.range(0.6, 2.2);
        const sway = rng.range(-0.3, 0.3);
        const p0 = new THREE.Vector3(b.x - b.ox * 0.08, b.y + 0.25, b.z - b.oz * 0.08);
        const pts = [p0];
        for (let k = 1; k <= 4; k++) pts.push(new THREE.Vector3(p0.x + b.ox * 0.06 * k + sway * Math.sin(k) * 0.2, p0.y - (len * k) / 4, p0.z + b.oz * 0.06 * k + sway * Math.cos(k) * 0.2));
        const curve = new THREE.CatmullRomCurve3(pts);
        roots.push(new THREE.TubeGeometry(curve, 12, rng.range(0.045, 0.085), 6, false));
      }
      if (roots.length) {
        const rg = mergeList(roots.map((g) => { const c = new Float32Array(g.attributes.position.count * 3).fill(1); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; }));
        const rm = new THREE.Mesh(rg, opts.mats.roots);
        group.add(rm);
      }
    }
  }
  addOutlines({ traverse: (fn) => inked.forEach(fn) }, { color: ink, vertexColors: false, width: 1.1 });

  const heightAt = (x, z) => topY(x, z, fieldAt(x, z));
  const walkable = new Set();
  for (const [x, z] of cells) if (fieldAt(x + 0.5, z + 0.5) > 0.3) walkable.add(x + ',' + z);
  const outline = loops[0] ? loops[0].map((id) => new THREE.Vector3(tPos[id * 3], tPos[id * 3 + 1], tPos[id * 3 + 2])) : [];

  return { group, top, side, heightAt, fieldAt, walkable, outline, bottoms, rng, bottom: y0 - T - D };
}

function mergeList(list) {
  // simple merge for non-indexed or indexed geometries with position/normal/uv/color
  const geos = list.map((g) => (g.index ? g.toNonIndexed() : g));
  let total = 0;
  for (const g of geos) total += g.attributes.position.count;
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv', 'color']) {
    const size = name === 'uv' ? 2 : 3;
    const arr = new Float32Array(total * size);
    let off = 0;
    for (const g of geos) {
      const a = g.attributes[name];
      if (a) arr.set(a.array, off * size);
      else if (name === 'color') arr.fill(1, off * size, (off + g.attributes.position.count) * size);
      off += g.attributes.position.count;
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  return out;
}

// Island shapes for planets: organic blobs of tiles
export function blobCells(rng, w, d, fill = 0.85) {
  const cells = [];
  const cx = (w - 1) / 2, cz = (d - 1) / 2;
  const phase = rng.range(0, 10);
  for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) {
    const nx = (x - cx) / (w / 2), nz = (z - cz) / (d / 2);
    const ang = Math.atan2(nz, nx);
    const r = Math.hypot(nx, nz);
    const lim = fill * (0.85 + 0.15 * Math.sin(ang * 3 + phase) + 0.08 * Math.sin(ang * 5 - phase));
    if (r < lim) cells.push([x, z]);
  }
  return cells;
}

// ---------------------------------------------------------------- materials
const SPLAT_VERT_HEAD = /* glsl */`
attribute float aGrass;
varying float vGrassBias;
varying vec3 vWPos;
`;
const SPLAT_FRAG_HEAD = /* glsl */`
uniform sampler2D uGrassMap;
uniform sampler2D uMask;
uniform float uGrassAmt;
varying float vGrassBias;
varying vec3 vWPos;
`;
const SPLAT_FRAG = /* glsl */`
#ifdef USE_MAP
  vec4 sandC = texture2D( map, vMapUv );
  vec4 grassC = texture2D( uGrassMap, vMapUv * 1.4 );
  vec3 mk = texture2D( uMask, vWPos.xz / 28.0 ).rgb;
  vec3 mk2 = texture2D( uMask, vWPos.xz / 4.5 ).rgb;
  float m = (mk.r - 0.5) * 2.2 + (mk2.g - 0.5) * 0.22 + (mk.b - 0.5) * 0.35 + uGrassAmt + vGrassBias;
  float g = smoothstep( 0.5, 0.512, m );
  float rimS = ( 1.0 - g ) * smoothstep( 0.44, 0.5, m );
  float rimG = g * ( 1.0 - smoothstep( 0.512, 0.555, m ) );
  vec3 c = mix( sandC.rgb * ( 1.0 - 0.42 * rimS ), grassC.rgb * ( 1.0 + 0.25 * rimG ), g );
  diffuseColor.rgb *= c;
#endif
`;

export function islandMaterials(tex, biome) {
  const top = new THREE.MeshStandardMaterial({ map: tex.ground.map, normalMap: tex.ground.normalMap, roughness: 0.85, metalness: 0, vertexColors: true });
  top.normalScale.set(0.8, 0.8);
  const uniforms = {
    uGrassMap: { value: tex.grass.map },
    uMask: { value: tex.mask.map },
    uGrassAmt: { value: biome.grassAmt ?? 0.5 },
  };
  top.userData.splat = uniforms;
  top.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + SPLAT_VERT_HEAD)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGrassBias = aGrass;\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + SPLAT_FRAG_HEAD)
      .replace('#include <map_fragment>', SPLAT_FRAG);
  };
  top.customProgramCacheKey = () => 'island-splat';
  toonify(top, 'toon');
  const side = toonify(new THREE.MeshStandardMaterial({ map: tex.cliff.map, normalMap: tex.cliff.normalMap, roughness: 0.82, vertexColors: true }));
  const under = toonify(new THREE.MeshStandardMaterial({ map: tex.rock.map, normalMap: tex.rock.normalMap, roughness: 0.88, vertexColors: true }));
  const roots = toonify(new THREE.MeshStandardMaterial({ color: biome.rootColor ?? 0x4a3a2a, roughness: 0.7, vertexColors: true }));
  for (const m of [top, side, under, roots]) m.userData.shared = true;
  return { top, side, under, roots };
}
