// Geometry helpers shared by beasts, props, buildings and characters.
import { THREE } from './renderer.js';
import { mergeGeometries } from '../../vendor/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
export const UP = new THREE.Vector3(0, 1, 0);
export const FWD = new THREE.Vector3(0, 0, 1);

export function ensureIndexed(g) {
  if (!g.index) {
    const n = g.attributes.position.count;
    const idx = new Array(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    g.setIndex(idx);
  }
  return g;
}

/** Apply translation / rotation (euler array or quaternion) / scale to a geometry in place. */
export function xf(g, { p = [0, 0, 0], r = null, q = null, s = 1 } = {}) {
  const sc = Array.isArray(s) ? s : [s, s, s];
  if (q) _q.copy(q); else if (r) _q.setFromEuler(_e.set(r[0], r[1], r[2])); else _q.identity();
  _m.compose(_v.set(p[0], p[1], p[2]), _q, _s.set(sc[0], sc[1], sc[2]));
  g.applyMatrix4(_m);
  return g;
}

/** Adds per-vertex color. col: hex or fn(position, normal) => hex|THREE.Color */
export function paint(g, col, pat = 0) {
  const pos = g.attributes.position, nor = g.attributes.normal;
  const n = pos.count;
  const arr = new Float32Array(n * 3);
  const c = new THREE.Color();
  const p = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    if (typeof col === 'function') {
      p.fromBufferAttribute(pos, i);
      if (nor) nn.fromBufferAttribute(nor, i); else nn.set(0, 1, 0);
      const r = col(p, nn);
      if (r instanceof THREE.Color) c.copy(r); else c.set(r);
    } else c.set(col);
    arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  const pa = new Float32Array(n).fill(pat);
  g.setAttribute('aPat', new THREE.BufferAttribute(pa, 1));
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  return g;
}

export function merge(list) {
  const prepared = list.filter(Boolean).map((g) => {
    ensureIndexed(g);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.color) paint(g, 0xffffff);
    if (!g.attributes.aPat) g.setAttribute('aPat', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count), 1));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color', 'aPat'].includes(k)) g.deleteAttribute(k);
    return g;
  });
  if (!prepared.length) return null;
  const m = mergeGeometries(prepared, false);
  for (const g of prepared) g.dispose();
  return m;
}

export function sphere(rx, ry = rx, rz = rx, w = 28, h = 20) {
  return new THREE.SphereGeometry(1, w, h).scale(rx, ry, rz);
}

export function cone(r, h, seg = 16, open = false) {
  // base at y=0, tip at y=h
  return new THREE.ConeGeometry(r, h, seg, 1, open).translate(0, h / 2, 0);
}

export function cyl(rt, rb, h, seg = 16) {
  return new THREE.CylinderGeometry(rt, rb, h, seg).translate(0, h / 2, 0);
}

export function capsule(r, len, seg = 12) {
  // from y=0 to y=len+2r
  return new THREE.CapsuleGeometry(r, len, 6, seg).translate(0, len / 2 + r, 0);
}

export function box(w, h, d) { return new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0); }

export function rbox(w, h, d, r = 0.08, seg = 3) {
  // rounded box from a subdivided box projected toward a rounded shape
  const g = new THREE.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2);
  const pos = g.attributes.position;
  const hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
  const v = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    c.set(THREE.MathUtils.clamp(v.x, -hw, hw), THREE.MathUtils.clamp(v.y, -hh, hh), THREE.MathUtils.clamp(v.z, -hd, hd));
    const d2 = v.clone().sub(c);
    if (d2.lengthSq() > 1e-9) { d2.setLength(r); v.copy(c).add(d2); }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g.translate(0, h / 2, 0);
}

/** Tube along points with radius tapering r0 -> r1. Capped at the start, pointed or rounded at the end. */
export function taperTube(points, r0, r1, radial = 10, seg = 18, endRound = true) {
  const curve = new THREE.CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(seg, false);
  const pos = [], idx = [], uv = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const p = curve.getPointAt(t);
    const r = r0 + (r1 - r0) * t;
    const N = frames.normals[i], B = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const cx = Math.cos(a), sy = Math.sin(a);
      pos.push(p.x + r * (cx * N.x + sy * B.x), p.y + r * (cx * N.y + sy * B.y), p.z + r * (cx * N.z + sy * B.z));
      uv.push(j / radial, t);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  // end cap point
  const endP = curve.getPointAt(1);
  const tan = curve.getTangentAt(1);
  const tipIdx = pos.length / 3;
  const tip = endP.clone().addScaledVector(tan, endRound ? r1 * 0.9 : r1 * 2.5 + 0.001);
  pos.push(tip.x, tip.y, tip.z); uv.push(0.5, 1);
  const last = seg * (radial + 1);
  for (let j = 0; j < radial; j++) idx.push(last + j, tipIdx, last + j + 1);
  // start cap
  const st = curve.getPointAt(0);
  const stIdx = pos.length / 3;
  pos.push(st.x, st.y, st.z); uv.push(0.5, 0);
  for (let j = 0; j < radial; j++) idx.push(j + 1, stIdx, j);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Leaf / feather / petal: flattened ellipsoid with a pointed tip along +Z. */
export function leaf(len, width, thick = 0.25, curl = 0.15) {
  const g = new THREE.SphereGeometry(1, 16, 12);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = (z + 1) / 2; // 0 base .. 1 tip
    const taper = Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.05)), 0.8) * (1 - 0.35 * t);
    x *= width * taper;
    y *= width * thick * taper;
    z = t * len;
    y += curl * len * t * t; // gentle upward curl
    y -= Math.abs(x) * 0.25; // central crease
    pos.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

/** Sculpted flame: a main tongue with two smaller side licks (no emissive: vertex gradient). Base at y=0. */
export function flame(h, r, twist = 1, colors = [0xff4a1a, 0xffa02a, 0xffe46a]) {
  const tongue = (hh, rr, tw, lean) => {
    const pts = [];
    const N = 16;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const rad = rr * Math.pow(Math.sin(Math.PI * Math.min(1, 0.12 + t * 0.88)), 0.8) * Math.pow(1 - t, 0.55) + 0.0005;
      pts.push(new THREE.Vector2(rad, t * hh));
    }
    const g = new THREE.LatheGeometry(pts, 12);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = y / hh;
      const a = t * tw * 2.4;
      const x = pos.getX(i), z = pos.getZ(i);
      const ox = Math.sin(t * 4.5) * rr * 0.35 * t + lean * t * t * hh;
      pos.setXYZ(i, x * Math.cos(a) - z * Math.sin(a) + ox, y, x * Math.sin(a) + z * Math.cos(a));
    }
    g.computeVertexNormals();
    return g;
  };
  const parts = [tongue(h, r, twist, 0.12), xf(tongue(h * 0.62, r * 0.6, -twist, -0.25), { p: [-r * 0.5, 0, r * 0.1] }), xf(tongue(h * 0.5, r * 0.5, twist, 0.3), { p: [r * 0.55, 0, -r * 0.1] })];
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()), false);
  g.computeVertexNormals();
  ensureIndexed(g);
  const c0 = new THREE.Color(colors[0]), c1 = new THREE.Color(colors[1]), c2 = new THREE.Color(colors[2]);
  paint(g, (p) => {
    const t = THREE.MathUtils.clamp(p.y / h, 0, 1);
    return t < 0.45 ? c0.clone().lerp(c1, t / 0.45) : c1.clone().lerp(c2, (t - 0.45) / 0.55);
  });
  return g;
}

/** Faceted crystal prism, base at y=0. */
export function crystal(r, h, sides = 6) {
  const g = new THREE.CylinderGeometry(r * 0.75, r, h * 0.75, sides, 1);
  g.translate(0, h * 0.375, 0);
  const tip = new THREE.ConeGeometry(r * 0.75, h * 0.25, sides, 1).translate(0, h * 0.75 + h * 0.125, 0);
  const m = mergeGeometries([g.toNonIndexed(), tip.toNonIndexed()], false);
  m.computeVertexNormals();
  return ensureIndexed(m);
}

export function torusArc(R, r, arc, seg = 16) {
  return new THREE.TorusGeometry(R, r, 8, seg, arc);
}

export function placeOnNormal(g, point, normal, extraRot = null) {
  _q.setFromUnitVectors(FWD, normal.clone().normalize());
  if (extraRot) _q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...extraRot)));
  _m.compose(point, _q, _s.set(1, 1, 1));
  g.applyMatrix4(_m);
  return g;
}

// Rotation whose local +Z points along dir (and +Y roughly along up)
export function lookQuat(dir, up = UP) {
  const d = dir.clone().normalize();
  const u = Math.abs(d.dot(up)) > 0.98 ? new THREE.Vector3(0, 0, 1) : up;
  const m = new THREE.Matrix4().lookAt(d, new THREE.Vector3(), u);
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

export function star5(rOut, rIn, depth) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 ? rIn : rOut;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: depth * 0.3, bevelThickness: depth * 0.3, bevelSegments: 2 });
}

export function boltShape(len, w, depth) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(w * 0.6, len * 0.45);
  s.lineTo(w * 0.15, len * 0.5);
  s.lineTo(w * 0.7, len);
  s.lineTo(-w * 0.2, len * 0.42);
  s.lineTo(w * 0.25, len * 0.38);
  s.lineTo(-w * 0.3, 0);
  s.lineTo(0, 0);
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: depth * 0.35, bevelThickness: depth * 0.4, bevelSegments: 2 }).translate(0, 0, -depth / 2);
}

export { mergeGeometries };
