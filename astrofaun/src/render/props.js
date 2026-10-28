// Island flora, rocks and set dressing. Static props are merged per island into a couple of meshes
// (matte + gloss) with ink outlines, so whole islands of decoration cost only a few draw calls.
import { THREE } from './renderer.js';
import * as G from './geom.js';
import { toonify, addOutlines } from './toon.js';
import { RNG, shade, mixHex, clamp } from '../core/util.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

let MATS = null;
export function propMaterials() {
  if (MATS) return MATS;
  const mk = (o, phys) => { const m = phys ? new THREE.MeshPhysicalMaterial(o) : new THREE.MeshStandardMaterial(o); m.userData.shared = true; return toonify(m); };
  MATS = {
    matte: mk({ vertexColors: true, roughness: 0.78 }),
    gloss: mk({ vertexColors: true, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 }, true),
  };
  return MATS;
}

// Faceted rock blob
function rockGeo(rng, r, squash = 0.8, detail = 1) {
  const g = new THREE.IcosahedronGeometry(r, detail);
  const pos = g.attributes.position;
  const k = rng.range(0, 100);
  for (let i = 0; i < pos.count; i++) {
    const v = V(pos.getX(i), pos.getY(i), pos.getZ(i));
    const n = 1 + 0.18 * Math.sin(v.x * 5 + k) * Math.cos(v.z * 4 - k) + 0.1 * Math.sin(v.y * 7 + k);
    v.multiplyScalar(n);
    v.y *= squash;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function gradientPaint(g, c0, c1, h0, h1) {
  return G.paint(g, (p) => mixHex(c0, c1, clamp((p.y - h0) / (h1 - h0), 0, 1)));
}

// Each builder returns { matte: [geos], gloss: [geos] } in local space (base at y = 0)
const BUILDERS = {
  puff(rng, B) {
    const out = { matte: [], gloss: [] };
    const h = rng.range(1.4, 2.4);
    const lean = rng.range(-0.25, 0.25);
    const pts = [V(0, 0, 0), V(lean * 0.3, h * 0.35, 0.05), V(lean * 0.8, h * 0.7, -0.05), V(lean, h, 0)];
    out.matte.push(gradientPaint(G.taperTube(pts, 0.16, 0.09, 8, 10), 0x5a3a24, 0x8a5a34, 0, h));
    const leaf = B.leaf || [0x3ea84a, 0x7ad85a, 0x24703a];
    const n = rng.int(4, 6);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng.range(0, 0.5);
      const r = rng.range(0.42, 0.62);
      const c = V(lean + Math.cos(a) * 0.45, h + rng.range(-0.1, 0.35), Math.sin(a) * 0.45);
      const g = G.sphere(r, r * 0.85, r, 16, 12);
      G.xf(g, { p: c.toArray() });
      out.gloss.push(G.paint(g, (p, nn) => (nn.y > 0.35 ? leaf[1] : nn.y > -0.3 ? leaf[0] : leaf[2])));
    }
    const top = G.sphere(0.6, 0.55, 0.6, 16, 12);
    G.xf(top, { p: [lean, h + 0.45, 0] });
    out.gloss.push(G.paint(top, (p, nn) => (nn.y > 0.3 ? leaf[1] : leaf[0])));
    return out;
  },
  cloudtree(rng, B) { return BUILDERS.puff(rng, { leaf: [0xf0f4ff, 0xffffff, 0xc8d0f0] }); },
  fern(rng, B) {
    const out = { matte: [], gloss: [] };
    const col = B.leaf || [0x3aa848, 0x8ad85a, 0x1e6a30];
    const n = rng.int(6, 9);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng.range(0, 0.4);
      const len = rng.range(0.7, 1.15);
      const g = G.leaf(len, 0.14, 0.15, -0.35);
      G.xf(g, { r: [-0.9 + rng.range(-0.2, 0.25), a, 0] });
      out.gloss.push(G.paint(g, (p) => mixHex(col[2], col[1], clamp(p.y / 0.6 + 0.3, 0, 1))));
    }
    return out;
  },
  bush(rng, B) {
    const out = { matte: [], gloss: [] };
    const leaf = B.leaf || [0x3ea84a, 0x7ad85a, 0x24703a];
    for (let i = 0; i < 4; i++) {
      const r = rng.range(0.22, 0.36);
      const g = G.sphere(r, r * 0.8, r, 14, 10);
      G.xf(g, { p: [rng.range(-0.25, 0.25), r * 0.7, rng.range(-0.25, 0.25)] });
      out.gloss.push(G.paint(g, (p, nn) => (nn.y > 0.3 ? leaf[1] : leaf[0])));
    }
    if (rng.chance(0.6)) for (let i = 0; i < 5; i++) {
      const g = G.sphere(0.045);
      G.xf(g, { p: [rng.range(-0.3, 0.3), rng.range(0.25, 0.55), rng.range(-0.3, 0.3)] });
      out.gloss.push(G.paint(g, B.berry || 0xff4a6a));
    }
    return out;
  },
  cactus(rng, B) {
    const out = { matte: [], gloss: [] };
    const h = rng.range(0.9, 1.7);
    const green = [0x3aa04a, 0x6ad06a, 0x24703a];
    const trunk = new THREE.CylinderGeometry(0.17, 0.2, h, 10, 6);
    const pos = trunk.attributes.position;
    for (let i = 0; i < pos.count; i++) { const a = Math.atan2(pos.getZ(i), pos.getX(i)); const k = 1 + 0.12 * Math.cos(a * 5); pos.setX(i, pos.getX(i) * k); pos.setZ(i, pos.getZ(i) * k); }
    trunk.computeVertexNormals();
    trunk.translate(0, h / 2, 0);
    out.gloss.push(G.paint(trunk, (p, nn) => mixHex(green[2], green[1], clamp(0.5 + nn.x * 0.5, 0, 1))));
    out.gloss.push(G.paint(G.xf(G.sphere(0.17, 0.12, 0.17), { p: [0, h, 0] }), green[1]));
    const arms = rng.int(1, 2);
    for (let i = 0; i < arms; i++) {
      const sx = i === 0 ? 1 : -1;
      const y0 = h * rng.range(0.35, 0.6);
      const pts = [V(0, y0, 0), V(sx * 0.32, y0 + 0.02, 0), V(sx * 0.36, y0 + 0.4, 0)];
      out.gloss.push(G.paint(G.taperTube(pts, 0.1, 0.1, 8, 8), green[0]));
    }
    if (rng.chance(0.7)) {
      for (let i = 0; i < 5; i++) {
        const g = G.leaf(0.12, 0.07, 0.2, 0.1);
        G.xf(g, { r: [-0.6, (i / 5) * Math.PI * 2, 0], p: [0, h + 0.08, 0] });
        out.gloss.push(G.paint(g, B.flower || 0xff6aa8));
      }
    }
    return out;
  },
  spire(rng, B) {
    const out = { matte: [], gloss: [] };
    const h = rng.range(1.8, 3.4);
    const g = new THREE.CylinderGeometry(0.18, rng.range(0.45, 0.7), h, 7, 5).toNonIndexed();
    const pos = g.attributes.position;
    const lean = rng.range(-0.25, 0.25);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / h + 0.5;
      pos.setX(i, pos.getX(i) + lean * y * y * h * 0.3 + 0.05 * Math.sin(y * 9 + i));
    }
    g.computeVertexNormals();
    g.translate(0, h / 2, 0);
    const rc = B.rock || [0xc06a4a, 0x8a4a34];
    out.matte.push(G.paint(g, (p, nn) => mixHex(rc[1], rc[0], clamp(0.35 + nn.x * 0.4 + p.y / h * 0.4, 0, 1))));
    return out;
  },
  rock(rng, B) {
    const out = { matte: [], gloss: [] };
    const rc = B.rock || [0xb8b0a8, 0x7a7068];
    const n = rng.int(1, 3);
    for (let i = 0; i < n; i++) {
      const r = rng.range(0.22, 0.5) * (i === 0 ? 1.2 : 0.8);
      const g = rockGeo(rng, r, rng.range(0.6, 0.9)).toNonIndexed();
      g.computeVertexNormals();
      G.xf(g, { p: [i === 0 ? 0 : rng.range(-0.5, 0.5), r * 0.5, i === 0 ? 0 : rng.range(-0.5, 0.5)] });
      out.matte.push(G.paint(g, (p, nn) => mixHex(rc[1], rc[0], clamp(0.45 + nn.y * 0.5, 0, 1))));
    }
    return out;
  },
  boulder(rng, B) {
    const out = { matte: [], gloss: [] };
    const rc = B.rock || [0xb8b0a8, 0x7a7068];
    const r = rng.range(0.5, 0.85);
    const g = rockGeo(rng, r, 0.85, 1).toNonIndexed();
    g.computeVertexNormals();
    G.xf(g, { p: [0, r * 0.6, 0] });
    out.matte.push(G.paint(g, (p, nn) => mixHex(rc[1], rc[0], clamp(0.4 + nn.y * 0.55, 0, 1))));
    return out;
  },
  coral(rng, B) {
    const out = { matte: [], gloss: [] };
    const col = B.coral || rng.pick([[0xff7a5a, 0xffb07a], [0xb05ae6, 0xe0a0ff], [0xffd23c, 0xfff08a], [0x2ac8b8, 0x8af0e0]]);
    const branch = (p, dir, len, r, depth) => {
      const end = p.clone().addScaledVector(dir, len);
      const mid = p.clone().lerp(end, 0.5).add(V(rng.range(-0.05, 0.05), 0, rng.range(-0.05, 0.05)));
      out.gloss.push(G.paint(G.taperTube([p, mid, end], r, r * 0.7, 7, 6), (pp) => mixHex(col[0], col[1], clamp(pp.y / 1.1, 0, 1))));
      if (depth > 0) for (let k = 0; k < 2; k++) branch(end, dir.clone().add(V(rng.range(-0.7, 0.7), 0.5, rng.range(-0.7, 0.7))).normalize(), len * 0.7, r * 0.7, depth - 1);
      else out.gloss.push(G.paint(G.xf(G.sphere(r * 1.3), { p: end.toArray() }), col[1]));
    };
    branch(V(0, 0, 0), V(0, 1, 0), 0.4, 0.07, 2);
    return out;
  },
  mushroom(rng, B) {
    const out = { matte: [], gloss: [] };
    const n = rng.int(1, 3);
    const capC = B.cap || rng.pick([0xff5a5a, 0xb05ae6, 0x5ad8c8, 0xffa03a]);
    for (let i = 0; i < n; i++) {
      const h = rng.range(0.4, 1.2) * (i === 0 ? 1.3 : 0.7);
      const x = i === 0 ? 0 : rng.range(-0.4, 0.4), z = i === 0 ? 0 : rng.range(-0.4, 0.4);
      const stem = G.taperTube([V(x, 0, z), V(x + 0.05, h * 0.5, z), V(x, h, z)], 0.09 * (h + 0.4), 0.07 * (h + 0.4), 8, 6);
      out.matte.push(G.paint(stem, 0xfff0d8));
      const r = 0.25 * (h + 0.4);
      const cap = G.sphere(r, r * 0.55, r, 18, 10);
      const cp = cap.attributes.position;
      for (let k = 0; k < cp.count; k++) if (cp.getY(k) < 0) cp.setY(k, cp.getY(k) * 0.25);
      cap.computeVertexNormals();
      G.xf(cap, { p: [x, h, z] });
      out.gloss.push(G.paint(cap, (p, nn) => (nn.y > 0.2 && Math.sin(p.x * 30) * Math.sin(p.z * 30) > 0.72 ? 0xfff6e8 : nn.y < -0.2 ? shade(capC, -0.25) : capC)));
    }
    return out;
  },
  crystal(rng, B) {
    const out = { matte: [], gloss: [] };
    const col = B.crystal || rng.pick([0x7ae0ff, 0xd88aff, 0x7affc8, 0xff8ad8]);
    const n = rng.int(3, 6);
    for (let i = 0; i < n; i++) {
      const h = rng.range(0.35, 1.1) * (i === 0 ? 1.4 : 1);
      const g = G.crystal(rng.range(0.07, 0.15), h, 6).toNonIndexed();
      g.computeVertexNormals();
      G.xf(g, { r: [rng.range(-0.45, 0.45), rng.range(0, 6), rng.range(-0.45, 0.45)], p: [rng.range(-0.2, 0.2), 0, rng.range(-0.2, 0.2)] });
      out.gloss.push(G.paint(g, (p, nn) => mixHex(shade(col, -0.15), mixHex(col, 0xffffff, 0.45), clamp(0.5 + nn.x * 0.4 + nn.y * 0.2, 0, 1))));
    }
    const base = rockGeo(rng, 0.3, 0.5).toNonIndexed();
    base.computeVertexNormals();
    out.matte.push(G.paint(base, B.rock ? B.rock[1] : 0x6a5a7a));
    return out;
  },
  icecrystal(rng, B) { return BUILDERS.crystal(rng, { ...B, crystal: 0xb8ecff }); },
  prismtree(rng, B) { return BUILDERS.crystal(rng, { ...B, crystal: rng.pick([0xff8ad0, 0x7af0ff, 0xffe08a]) }); },
  obsidian(rng, B) { return BUILDERS.crystal(rng, { ...B, crystal: 0x2a2030 }); },
  deadtree(rng, B) {
    const out = { matte: [], gloss: [] };
    const col = B.wood || [0x5a4030, 0x8a6a50];
    const branch = (p, dir, len, r, depth) => {
      const end = p.clone().addScaledVector(dir, len);
      const mid = p.clone().lerp(end, 0.5).add(V(rng.range(-0.08, 0.08), 0, rng.range(-0.08, 0.08)));
      out.matte.push(G.paint(G.taperTube([p, mid, end], r, r * 0.6, 7, 6, depth === 0 ? false : true), (pp) => mixHex(col[0], col[1], clamp(pp.y / 2, 0, 1))));
      if (depth > 0) for (let k = 0; k < 2; k++) branch(end, dir.clone().add(V(rng.range(-0.9, 0.9), 0.35, rng.range(-0.9, 0.9))).normalize(), len * 0.65, r * 0.6, depth - 1);
    };
    branch(V(0, 0, 0), V(rng.range(-0.15, 0.15), 1, 0).normalize(), rng.range(0.8, 1.2), 0.12, 3);
    return out;
  },
  palm(rng, B) {
    const out = { matte: [], gloss: [] };
    const h = rng.range(1.6, 2.4);
    const bend = rng.range(0.3, 0.6) * rng.sign();
    const pts = [V(0, 0, 0), V(bend * 0.2, h * 0.4, 0), V(bend * 0.6, h * 0.8, 0), V(bend, h, 0)];
    out.matte.push(G.paint(G.taperTube(pts, 0.13, 0.08, 8, 14), (p) => (Math.sin(p.y * 22) > 0.4 ? 0x8a6a40 : 0xa8844e)));
    const leaf = B.leaf || [0x3ea84a, 0x7ad85a, 0x24703a];
    for (let i = 0; i < 7; i++) {
      const g = G.leaf(rng.range(0.9, 1.3), 0.2, 0.1, -0.5);
      G.xf(g, { r: [-0.4, (i / 7) * Math.PI * 2, 0], p: [bend, h, 0] });
      out.gloss.push(G.paint(g, (p) => mixHex(leaf[2], leaf[1], clamp((p.y - h + 0.5) / 0.6, 0, 1))));
    }
    return out;
  },
  jungle(rng, B) {
    const o = BUILDERS.puff(rng, { leaf: [0x1e8a3a, 0x4ac85a, 0x0e5a2a] });
    const f = BUILDERS.fern(rng, { leaf: [0x2a9a3a, 0x6ad04a, 0x145a24] });
    return { matte: [...o.matte, ...f.matte], gloss: [...o.gloss, ...f.gloss] };
  },
  snowpine(rng, B) {
    const out = { matte: [], gloss: [] };
    const h = rng.range(1.6, 2.6);
    out.matte.push(G.paint(G.cyl(0.08, 0.12, h * 0.3, 8), 0x5a3a24));
    const green = B.leaf || [0x2a6a5a, 0x3a8a6a];
    for (let i = 0; i < 3; i++) {
      const y = h * 0.2 + i * h * 0.24;
      const r = (0.6 - i * 0.15) * (h / 2);
      const c = G.cone(r, h * 0.38, 9);
      G.xf(c, { p: [0, y, 0] });
      out.gloss.push(G.paint(c, (p, nn) => (nn.y > 0.55 ? (B.snow === false ? green[1] : 0xf4faff) : green[0])));
    }
    return out;
  },
  starpine(rng, B) {
    const o = BUILDERS.snowpine(rng, { leaf: [0x2a2a6a, 0x4a4a9a], snow: false });
    for (let i = 0; i < 4; i++) o.gloss.push(G.paint(G.xf(G.sphere(0.06), { p: [rng.range(-0.3, 0.3), rng.range(0.5, 1.5), rng.range(-0.3, 0.3)] }), 0xffe08a));
    return o;
  },
  pillar(rng, B) {
    const out = { matte: [], gloss: [] };
    const h = rng.range(1, 2.4);
    const g = new THREE.CylinderGeometry(0.28, 0.3, h, 10, 1).toNonIndexed();
    g.computeVertexNormals();
    g.translate(0, h / 2 + 0.15, 0);
    out.matte.push(G.paint(g, (p, nn) => mixHex(0xc8b088, 0xf0dcb0, clamp(0.5 + nn.x * 0.5, 0, 1))));
    out.matte.push(G.paint(G.xf(G.box(0.8, 0.18, 0.8), {}), 0xd8c098));
    if (rng.chance(0.5)) out.matte.push(G.paint(G.xf(G.box(0.75, 0.16, 0.75), { p: [0, h + 0.15, 0] }), 0xd8c098));
    return out;
  },
  obelisk(rng, B) {
    const out = { matte: [], gloss: [] };
    const h = rng.range(1.8, 2.8);
    const g = new THREE.CylinderGeometry(0.12, 0.3, h, 4, 1).toNonIndexed();
    g.rotateY(Math.PI / 4);
    g.computeVertexNormals();
    g.translate(0, h / 2, 0);
    out.matte.push(G.paint(g, (p, nn) => mixHex(0x3a3a4a, 0x6a6a7a, clamp(0.5 + nn.x * 0.5, 0, 1))));
    out.gloss.push(G.paint(G.xf(G.crystal(0.08, 0.3), { p: [0, h, 0] }), 0x7af0ff));
    return out;
  },
  lava(rng, B) {
    const out = { matte: [], gloss: [] };
    const r = rng.range(0.5, 0.9);
    const pool = new THREE.CircleGeometry(r, 18);
    pool.rotateX(-Math.PI / 2);
    pool.translate(0, 0.03, 0);
    out.gloss.push(G.paint(pool, (p) => mixHex(0xffd23c, 0xff4a1a, clamp(Math.hypot(p.x, p.z) / r, 0, 1))));
    const ring = new THREE.TorusGeometry(r, 0.09, 6, 20);
    ring.rotateX(Math.PI / 2);
    ring.translate(0, 0.04, 0);
    out.matte.push(G.paint(ring, 0x2a2024));
    return out;
  },
  coil(rng, B) {
    const out = { matte: [], gloss: [] };
    const h = rng.range(1.4, 2);
    out.gloss.push(G.paint(G.cyl(0.08, 0.14, h, 10), 0x6a7484));
    for (let i = 0; i < 6; i++) {
      const t = new THREE.TorusGeometry(0.18 - i * 0.012, 0.035, 6, 14);
      t.rotateX(Math.PI / 2);
      t.translate(0, h * 0.3 + i * h * 0.1, 0);
      out.gloss.push(G.paint(t, 0xd8803a));
    }
    out.gloss.push(G.paint(G.xf(G.sphere(0.16), { p: [0, h + 0.1, 0] }), 0xb8c8d8));
    return out;
  },
  pipe(rng, B) {
    const out = { matte: [], gloss: [] };
    const h = rng.range(0.6, 1.2);
    const pts = [V(0, 0, 0), V(0, h, 0), V(0.3, h + 0.2, 0), V(0.8, h + 0.2, 0)];
    out.gloss.push(G.paint(G.taperTube(pts, 0.12, 0.12, 10, 16), 0x8a7a6a));
    out.gloss.push(G.paint(G.xf(G.cyl(0.17, 0.17, 0.1, 12), { p: [0, h * 0.5, 0] }), 0x5a4a3a));
    return out;
  },
  tank(rng, B) {
    const out = { matte: [], gloss: [] };
    const h = rng.range(0.8, 1.3);
    out.gloss.push(G.paint(G.cyl(0.42, 0.42, h, 16), (p, nn) => (Math.abs(p.y - h * 0.5) < 0.05 ? 0x3a3a44 : 0x9aa4b4)));
    out.gloss.push(G.paint(G.xf(G.sphere(0.42, 0.2, 0.42), { p: [0, h, 0] }), 0x8a94a4));
    return out;
  },
  barrel(rng, B) {
    const out = { matte: [], gloss: [] };
    for (let i = 0; i < rng.int(1, 3); i++) {
      const g = G.cyl(0.2, 0.2, 0.5, 14);
      G.xf(g, { p: [i * 0.42 - 0.3, 0, rng.range(-0.15, 0.15)] });
      out.gloss.push(G.paint(g, (p) => (Math.abs(p.y - 0.25) < 0.04 || Math.abs(p.y - 0.12) < 0.03 ? 0x3a4a2a : 0x8ad83a)));
    }
    return out;
  },
  reeds(rng, B) {
    const out = { matte: [], gloss: [] };
    for (let i = 0; i < 7; i++) {
      const x = rng.range(-0.3, 0.3), z = rng.range(-0.3, 0.3), h = rng.range(0.6, 1.1);
      out.matte.push(G.paint(G.taperTube([V(x, 0, z), V(x + 0.05, h * 0.5, z), V(x + 0.1, h, z)], 0.025, 0.015, 5, 6), 0x5a7a2a));
      if (rng.chance(0.5)) out.gloss.push(G.paint(G.xf(G.capsule(0.04, 0.12, 6), { p: [x + 0.1, h - 0.05, z] }), 0x6a3a1a));
    }
    return out;
  },
  flowers(rng, B) {
    const out = { matte: [], gloss: [] };
    const col = rng.pick([0xff6aa8, 0xffd23c, 0x8a7aff, 0xff7a3a, 0xffffff]);
    for (let i = 0; i < 5; i++) {
      const x = rng.range(-0.3, 0.3), z = rng.range(-0.3, 0.3), h = rng.range(0.15, 0.35);
      out.matte.push(G.paint(G.cyl(0.015, 0.015, h, 4), 0x3a8a3a).translate(x, 0, z));
      for (let k = 0; k < 5; k++) {
        const g = G.leaf(0.08, 0.05, 0.2, 0);
        G.xf(g, { r: [-0.3, (k / 5) * Math.PI * 2, 0], p: [x, h, z] });
        out.gloss.push(G.paint(g, col));
      }
      out.gloss.push(G.paint(G.xf(G.sphere(0.03), { p: [x, h + 0.01, z] }), 0xffe06a));
    }
    return out;
  },
  grasstuft(rng, B) {
    const out = { matte: [], gloss: [] };
    const col = B.grass || [0x3ea84a, 0x8ad85a];
    const n = rng.int(5, 8);
    for (let i = 0; i < n; i++) {
      const a = rng.range(0, Math.PI * 2);
      const h = rng.range(0.2, 0.42);
      const bx = Math.cos(a) * 0.08, bz = Math.sin(a) * 0.08;
      const g = G.taperTube([V(bx, 0, bz), V(bx * 1.6, h * 0.55, bz * 1.6), V(bx * 3, h, bz * 3)], 0.035, 0.004, 4, 5, false);
      out.gloss.push(G.paint(g, (p) => mixHex(col[0], col[1], clamp(p.y / h, 0, 1))));
    }
    return out;
  },
  thickgrass(rng, B) {
    const out = { matte: [], gloss: [] };
    const col = B.thick || [0x2a7a2e, 0x6ac83a, 0xa8e85a];
    const n = rng.int(16, 22);
    for (let i = 0; i < n; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r0 = rng.range(0, 0.32);
      const h = rng.range(0.55, 0.95);
      const bx = Math.cos(a) * r0, bz = Math.sin(a) * r0;
      const lean = rng.range(0.1, 0.35);
      const g = G.taperTube([V(bx, 0, bz), V(bx * 1.2 + Math.cos(a) * lean * 0.3, h * 0.55, bz * 1.2 + Math.sin(a) * lean * 0.3), V(bx * 1.4 + Math.cos(a) * lean, h, bz * 1.4 + Math.sin(a) * lean)], 0.07, 0.006, 4, 6, false);
      out.gloss.push(G.paint(g, (p) => (p.y / h < 0.45 ? mixHex(col[0], col[1], p.y / h / 0.45) : mixHex(col[1], col[2], (p.y / h - 0.45) / 0.55))));
    }
    const base = G.sphere(0.42, 0.18, 0.42, 14, 8);
    out.gloss.push(G.paint(base, col[0]));
    return out;
  },
  spore(rng, B) {
    const out = { matte: [], gloss: [] };
    for (let i = 0; i < 4; i++) {
      const h = rng.range(0.3, 0.8);
      const x = rng.range(-0.25, 0.25), z = rng.range(-0.25, 0.25);
      out.matte.push(G.paint(G.taperTube([V(x, 0, z), V(x, h * 0.5, z + 0.03), V(x, h, z)], 0.03, 0.02, 5, 5), 0x6a4a9a));
      out.gloss.push(G.paint(G.xf(G.sphere(0.09), { p: [x, h, z] }), 0xb08aff));
    }
    return out;
  },
};
export const PROP_TYPES = Object.keys(BUILDERS);

const geoCache = new Map();
function propGeos(type, variant, biomeOpts) {
  const key = type + ':' + variant + ':' + (biomeOpts.key || '');
  if (!geoCache.has(key)) {
    const rng = new RNG(`${type}-${variant}-${biomeOpts.key || ''}`);
    const b = BUILDERS[type] || BUILDERS.rock;
    const out = b(rng, biomeOpts);
    geoCache.set(key, { matte: G.merge(out.matte), gloss: G.merge(out.gloss) });
  }
  return geoCache.get(key);
}

/** Collects many props and merges them into one matte and one gloss mesh. */
export class PropBatch {
  constructor(biomeOpts = {}) {
    this.opts = biomeOpts;
    this.lists = { matte: [], gloss: [] };
  }
  add(type, variant, x, y, z, rotY = 0, scale = 1) {
    const g = propGeos(type, variant % 6, this.opts);
    const m = new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)), V(scale, scale, scale));
    for (const k of ['matte', 'gloss']) if (g[k]) this.lists[k].push(g[k].clone().applyMatrix4(m));
  }
  build() {
    const grp = new THREE.Group();
    const mats = propMaterials();
    for (const k of ['matte', 'gloss']) {
      if (!this.lists[k].length) continue;
      const geo = G.merge(this.lists[k]);
      const mesh = new THREE.Mesh(geo, mats[k]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      grp.add(mesh);
    }
    addOutlines(grp, { width: 1 });
    return grp;
  }
}

/** A single standalone prop (for interactive objects that need their own mesh). */
export function makeProp(type, variant = 0, biomeOpts = {}) {
  const g = propGeos(type, variant % 6, biomeOpts);
  const grp = new THREE.Group();
  const mats = propMaterials();
  for (const k of ['matte', 'gloss']) if (g[k]) { const m = new THREE.Mesh(g[k], mats[k]); m.castShadow = true; m.receiveShadow = true; grp.add(m); }
  addOutlines(grp, { width: 1 });
  return grp;
}

/** Prop options derived from a biome palette. */
export function biomePropOpts(biome, key) {
  return {
    key,
    leaf: [biome.grass[0], biome.grass[1], biome.grass[2]],
    grass: [biome.grass[2], biome.grass[1]],
    rock: [biome.cliff[2], biome.cliff[1]],
    flower: biome.grass[3],
  };
}
