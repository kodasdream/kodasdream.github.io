// Procedural beast models in the spirit of the original game's creature art: inked outlines,
// cel-banded shading with glossy highlights, attitude-heavy eyes, jagged-tooth grins and spiky fur.
// No emissive materials: flames and crystals get their colors from glossy vertex gradients.
import { THREE } from './renderer.js';
import * as G from './geom.js';
import { toonify, addOutlines } from './toon.js';
import { species } from '../data/beasts.js';
import { shade, hexToHsl, hslToHex, mixHex, clamp } from '../core/util.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// Turn a geometry whose tip points +Y so the tip points +Z (lookQuat aims +Z)
const tipZ = (g) => G.xf(g, { r: [Math.PI / 2, 0, 0] });

// ---------------------------------------------------------------- materials
const NOISE = /* glsl */`
vec3 bh33(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
float bvor(vec3 p){ vec3 i = floor(p), f = fract(p); float md = 8.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(float(x), float(y), float(z)); vec3 r = g + bh33(i + g) - f; md = min(md, dot(r, r)); }
  return sqrt(md); }
float bvn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = bh33(i).x, b = bh33(i + vec3(1,0,0)).x, c = bh33(i + vec3(0,1,0)).x, d = bh33(i + vec3(1,1,0)).x;
  float e = bh33(i + vec3(0,0,1)).x, f2 = bh33(i + vec3(1,0,1)).x, g = bh33(i + vec3(0,1,1)).x, h = bh33(i + vec3(1,1,1)).x;
  return mix(mix(mix(a,b,f.x), mix(c,d,f.x), f.y), mix(mix(e,f2,f.x), mix(g,h,f.x), f.y), f.z); }
`;
const PATTERN = /* glsl */`
{
  float pm = 0.0;
  vec3 q = vObj * uPatScale;
  if (uPatType == 1) { pm = 1.0 - smoothstep(0.27, 0.31, bvor(q)); }
  else if (uPatType == 2) { pm = smoothstep(0.12, 0.2, sin((vObj.z * 1.3 + vObj.y * 0.35) * uPatScale * 2.4 + bvn(q * 0.7) * 3.0)); }
  else if (uPatType == 3) { pm = smoothstep(0.55, 0.58, bvn(q * 0.5 + 3.1)); }
  else if (uPatType == 4) { pm = smoothstep(0.45, 0.85, vObj.y / max(uHeight, 0.01)) * 0.85; }
  else if (uPatType == 5) { pm = smoothstep(-0.12, 0.12, sin(vObj.z * uPatScale * 5.0)); }
  diffuseColor.rgb = mix(diffuseColor.rgb, uPatColor, pm * vPat);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.98, 0.95), uFlash);
}
`;
const PAT_IDS = { none: 0, spots: 1, stripes: 2, patches: 3, gradient: 4, rings: 5 };

function skinMaterial(pattern, metal, height) {
  const m = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: metal ? 0.28 : 0.38, metalness: metal ? 0.3 : 0.0,
    clearcoat: 1.0, clearcoatRoughness: metal ? 0.06 : 0.1,
  });
  const uniforms = {
    uPatColor: { value: new THREE.Color(pattern.color) },
    uPatScale: { value: pattern.scale },
    uPatType: { value: PAT_IDS[pattern.type] || 0 },
    uFlash: { value: 0 },
    uHeight: { value: height },
  };
  m.userData.uniforms = uniforms;
  m.userData.pattern = pattern;
  m.userData.metal = !!metal;
  m.userData.height = height;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aPat;\nvarying float vPat;\nvarying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPat = aPat;\nvObj = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vPat;\nvarying vec3 vObj;\nuniform vec3 uPatColor;\nuniform float uPatScale;\nuniform int uPatType;\nuniform float uFlash;\nuniform float uHeight;\n' + NOISE)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + PATTERN);
  };
  m.customProgramCacheKey = () => 'beast-skin-v2';
  return toonify(m, 'toon');
}

let SHARED = null;
function shared() {
  if (SHARED) return SHARED;
  const mk = (o, toon = true) => { const m = new THREE.MeshPhysicalMaterial(o); m.userData.shared = true; return toon ? toonify(m) : m; };
  SHARED = {
    gloss: mk({ vertexColors: true, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.04 }),
    mouth: mk({ vertexColors: true, roughness: 0.45, clearcoat: 0.6 }),
    hi: (() => { const m = new THREE.MeshBasicMaterial({ color: 0xffffff }); m.userData.shared = true; return m; })(),
    wing: mk({ color: 0xe8f6ff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }, false),
    membrane: mk({ vertexColors: true, roughness: 0.35, clearcoat: 0.6, side: THREE.DoubleSide }),
    shadow: (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(10,6,30,0.38)');
      gr.addColorStop(0.65, 'rgba(10,6,30,0.2)');
      gr.addColorStop(1, 'rgba(10,6,30,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
      const t = new THREE.CanvasTexture(c);
      const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false });
      m.userData.shared = true;
      return m;
    })(),
  };
  return SHARED;
}

// ---------------------------------------------------------------- part buckets
class Bucket {
  constructor() { this.b = { skin: [], gloss: [], mouth: [], hi: [], wing: [], membrane: [] }; }
  add(kind, g) { this.b[kind].push(g); return g; }
  build(mats) {
    const grp = new THREE.Group();
    for (const [kind, list] of Object.entries(this.b)) {
      if (!list.length) continue;
      const geo = G.merge(list);
      if (!geo) continue;
      const mesh = new THREE.Mesh(geo, mats[kind]);
      mesh.castShadow = kind !== 'wing' && kind !== 'hi';
      mesh.receiveShadow = kind === 'skin';
      if (kind === 'hi' || kind === 'wing') mesh.userData.noOutline = true;
      grp.add(mesh);
    }
    return grp;
  }
}

// Paint with a color function and a pattern mask in one pass
function skin(g, fn) {
  const pos = g.attributes.position, nor = g.attributes.normal;
  const n = pos.count;
  const col = new Float32Array(n * 3), pat = new Float32Array(n);
  const p = new THREE.Vector3(), nn = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    p.fromBufferAttribute(pos, i);
    nn.fromBufferAttribute(nor, i);
    const [hex, pm] = fn(p, nn);
    c.set(hex);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    pat[i] = pm;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aPat', new THREE.BufferAttribute(pat, 1));
  return g;
}

const lerpHex = (a, b, t) => mixHex(a, b, clamp(t, 0, 1));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// A curved pointy spike (fur tuft, spine, claw) from p0 along dir
function spike(p0, dir, len, r, curl = V(0, 0, 0)) {
  const d = dir.clone().normalize();
  const p1 = p0.clone().addScaledVector(d, len * 0.5).addScaledVector(curl, len * 0.15);
  const p2 = p0.clone().addScaledVector(d, len).addScaledVector(curl, len * 0.45);
  return G.taperTube([p0, p1, p2], r, r * 0.12, 7, 8, false);
}

// Bend face-local geometry onto a sphere of radius R (face-local: x right, y up, z out of the face)
function bend(g, R) {
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    pos.setZ(i, pos.getZ(i) - (x * x + y * y) / (2 * R));
  }
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- palette
function paletteFor(gn, variant) {
  const P = { ...gn.palette };
  if (variant) {
    const rot = (hex, d, ds = 0.05) => { const [h, s, l] = hexToHsl(hex); return hslToHex(h + d, clamp(s + ds, 0, 1), l); };
    P.main = rot(P.main, 0.42);
    P.second = rot(P.second, 0.42);
    P.accent = rot(P.accent, 0.3);
    P.horn = rot(P.horn, 0.3);
    if (P.wisp) P.wisp = rot(P.wisp, 0.42);
  }
  return P;
}

// ---------------------------------------------------------------- builder
const cache = new Map();

export function beastTemplate(spId, variant = false) {
  const key = spId + (variant ? 'v' : '');
  if (!cache.has(key)) cache.set(key, buildBeast(spId, variant));
  return cache.get(key);
}

export function makeBeast(spId, variant = false, opts = {}) {
  const tpl = beastTemplate(spId, variant);
  const obj = tpl.clone(true);
  if (opts.ownMaterial) {
    const m = tpl.userData.skinMat;
    const clone = skinMaterial(m.userData.pattern, m.userData.metal, m.userData.height);
    obj.traverse((o) => { if (o.isMesh && o.material === m) o.material = clone; });
    obj.userData.skinMat = clone;
  } else obj.userData.skinMat = tpl.userData.skinMat;
  const a = tpl.userData.anim;
  const find = (name) => obj.getObjectByName(name);
  obj.userData.anim = {
    ...a,
    rig: find('rig'),
    legs: a.legNames.map(find),
    arms: a.armNames.map(find),
    eyes: a.eyeNames.map(find),
    tail: a.tail ? find('tail') : null,
    wings: a.wingNames.map(find),
    phase: Math.random() * 10,
    nextBlink: 1 + Math.random() * 3,
    blinkT: 0,
  };
  obj.userData.height = tpl.userData.height;
  obj.userData.radius = tpl.userData.radius;
  obj.userData.spId = spId;
  return obj;
}

function buildBeast(spId, variant) {
  const sp = species(spId);
  const gn = sp.genome;
  const P = paletteFor(gn, variant);
  const S = shared();
  const body = new Bucket();
  const W = gn.torso.w, Hh = gn.torso.h, Dd = gn.torso.d;
  const L = gn.limbs.len, TH = gn.limbs.thick;
  const hs = gn.head.size / 0.75;
  const dark = shade(P.main, -0.14, 0.06);
  const footCol = shade(P.main, -0.1, 0.03);
  const build = gn.build;

  const bodyPaint = () => (p, n) => {
    const belly = sstep(0.05, 0.75, n.z) * sstep(0.55, -0.35, n.y) * 0.95 + sstep(-0.3, -0.85, n.y) * 0.6;
    return [lerpHex(P.main, P.belly, belly), 1 - belly];
  };
  const headPaint = (p, n) => {
    const face = sstep(0.4, 0.95, n.z) * sstep(0.15, -0.6, n.y);
    return [lerpHex(P.main, P.belly, face * 0.95), 1 - face];
  };

  // ---------- layout per body type
  let torsoC, tr, headC, hR, legPts = [], armPts = [], tailBase, tailDir, spine = [], wingPts = [], headIsBody = false;
  let legH = 0.2 * L, legR = 0.085 * TH, armScale = 1, neckFrom = null;
  const shapeS = { round: [1, 1, 1], wide: [1.2, 0.9, 1], tall: [0.9, 1.14, 0.95], pear: [1.05, 0.96, 1.02], long: [0.92, 0.9, 1.3], bulb: [1.08, 1.08, 1.05], flat: [1.34, 0.78, 1.06] }[gn.head.shape] || [1, 1, 1];
  let torsoTilt = 0;

  switch (gn.body) {
    case 'quad': {
      const tall = build === 'tall', low = build === 'low', stocky = build === 'stocky';
      legH = (tall ? 0.25 : low ? 0.12 : 0.18) * L; legR = (stocky ? 0.095 : tall ? 0.068 : 0.075) * TH;
      tr = [(stocky ? 0.29 : 0.24) * W, (stocky ? 0.25 : 0.21) * Hh, (low ? 0.44 : 0.34) * Dd];
      torsoC = V(0, legH + tr[1] * 0.85, -0.02);
      const h = (tall ? 0.27 : 0.29) * hs;
      hR = [h * shapeS[0], h * shapeS[1], h * shapeS[2]];
      const neckUp = tall ? 0.24 : low ? 0.02 : 0.1;
      headC = V(0, torsoC.y + tr[1] * 0.55 + h * 0.3 + neckUp, torsoC.z + tr[2] * 0.82 + h * (tall ? 0.55 : 0.42));
      if (tall) neckFrom = torsoC.clone().add(V(0, tr[1] * 0.5, tr[2] * 0.6));
      for (const sx of [-1, 1]) for (const sz of [1, -1]) legPts.push(V(sx * tr[0] * 0.6, legH + 0.03, torsoC.z + sz * tr[2] * 0.58));
      tailBase = V(0, torsoC.y + tr[1] * 0.35, torsoC.z - tr[2] * 0.92);
      tailDir = V(0, 0.7, -1).normalize();
      for (let i = 0; i < 5; i++) { const t = i / 4; spine.push(V(0, torsoC.y + tr[1] * (0.95 - 0.25 * Math.abs(t - 0.4)), torsoC.z + tr[2] * (0.35 - t * 0.95))); }
      wingPts = [V(-tr[0] * 0.7, torsoC.y + tr[1] * 0.55, torsoC.z + tr[2] * 0.15), V(tr[0] * 0.7, torsoC.y + tr[1] * 0.55, torsoC.z + tr[2] * 0.15)];
      if (stocky) body.add('skin', skin(G.xf(G.sphere(tr[0] * 1.05, tr[1] * 1.1, tr[2] * 0.6, 28, 20), { p: torsoC.clone().add(V(0, tr[1] * 0.12, tr[2] * 0.45)).toArray() }), bodyPaint()));
      break;
    }
    case 'blob': {
      tr = [0.4 * W, 0.36 * Hh, 0.37 * Dd];
      torsoC = V(0, tr[1] * 0.95, 0);
      headIsBody = true;
      hR = tr;
      headC = torsoC.clone().add(V(0, 0.02, 0));
      legPts = [V(-tr[0] * 0.45, 0.06, tr[2] * 0.35), V(tr[0] * 0.45, 0.06, tr[2] * 0.35)];
      legH = 0.06; legR = 0.09 * TH;
      tailBase = V(0, tr[1] * 0.6, -tr[2] * 0.9);
      tailDir = V(0, 0.5, -1).normalize();
      for (let i = 0; i < 5; i++) { const a = 0.35 + i * 0.28; spine.push(V(0, torsoC.y + tr[1] * Math.cos(a) * 0.97, -tr[2] * Math.sin(a) * 0.97)); }
      armPts = [V(-tr[0] * 0.92, torsoC.y - tr[1] * 0.1, tr[2] * 0.2), V(tr[0] * 0.92, torsoC.y - tr[1] * 0.1, tr[2] * 0.2)];
      wingPts = [V(-tr[0] * 0.75, torsoC.y + tr[1] * 0.35, -tr[2] * 0.3), V(tr[0] * 0.75, torsoC.y + tr[1] * 0.35, -tr[2] * 0.3)];
      break;
    }
    case 'serpent': {
      tr = [0.19 * W, 0.19 * Hh, 0.19 * Dd];
      const pts = [];
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        pts.push(V(Math.sin(t * Math.PI * 1.6) * 0.16 * (1 - t), 0.14 + Math.pow(t, 2.2) * 0.52, -0.62 + t * 0.8));
      }
      const neck = pts[pts.length - 1];
      body.add('skin', skin(G.taperTube([...pts].reverse(), tr[0] * 1.05, 0.045, 14, 40, false), bodyPaint()));
      torsoC = pts[3].clone();
      const h = 0.31 * hs;
      hR = [h * shapeS[0], h * shapeS[1], h * shapeS[2]];
      headC = neck.clone().add(V(0, h * 0.55, h * 0.4));
      tailBase = null;
      for (let i = 1; i < 6; i++) spine.push(pts[i].clone().add(V(0, tr[1] * 0.85 * (0.6 + i * 0.08), 0)));
      wingPts = [neck.clone().add(V(-0.12, -0.05, -0.15)), neck.clone().add(V(0.12, -0.05, -0.15))];
      legH = 0;
      break;
    }
    case 'avian': {
      const plump = build === 'plump';
      legH = (plump ? 0.17 : 0.26) * L; legR = 0.03;
      tr = [(plump ? 0.28 : 0.22) * W, (plump ? 0.28 : 0.26) * Hh, (plump ? 0.27 : 0.3) * Dd];
      torsoC = V(0, legH + tr[1] * 0.9, 0);
      torsoTilt = plump ? 0 : -0.25;
      const h = 0.25 * hs;
      hR = [h * shapeS[0], h * shapeS[1], h * shapeS[2]];
      headC = V(0, torsoC.y + tr[1] * 0.85 + h * 0.45, tr[2] * 0.32);
      legPts = [V(-tr[0] * 0.4, legH + 0.04, 0.02), V(tr[0] * 0.4, legH + 0.04, 0.02)];
      tailBase = V(0, torsoC.y - tr[1] * 0.1, -tr[2] * 0.9);
      tailDir = V(0, 0.2, -1).normalize();
      for (let i = 0; i < 3; i++) spine.push(V(0, torsoC.y + tr[1] * (0.9 - i * 0.15), -tr[2] * (0.1 + i * 0.3)));
      wingPts = [V(-tr[0] * 0.85, torsoC.y + tr[1] * 0.25, 0), V(tr[0] * 0.85, torsoC.y + tr[1] * 0.25, 0)];
      break;
    }
    case 'bug': {
      legH = 0.16;
      tr = [0.17 * W, 0.16 * Hh, 0.17 * Dd];
      torsoC = V(0, legH + 0.12, 0.05);
      const ab = [0.22 * W, 0.19 * Hh, 0.3 * Dd];
      const abC = V(0, legH + 0.15, -0.3 * Dd);
      body.add('skin', skin(G.xf(G.sphere(ab[0], ab[1], ab[2]), { p: abC.toArray() }), bodyPaint()));
      const h = 0.26 * hs;
      hR = [h * shapeS[0], h * shapeS[1], h * shapeS[2]];
      headC = V(0, torsoC.y + 0.1, torsoC.z + tr[2] * 0.7 + h * 0.6);
      for (const sx of [-1, 1]) for (const z of [0.14, 0.04, -0.06]) legPts.push(V(sx * tr[0] * 0.8, torsoC.y - 0.02, torsoC.z + z));
      tailBase = abC.clone().add(V(0, 0.02, -ab[2] * 0.95));
      tailDir = V(0, 0.4, -1).normalize();
      for (let i = 0; i < 4; i++) spine.push(V(0, abC.y + ab[1] * 0.92, abC.z + ab[2] * (0.5 - i * 0.35)));
      wingPts = [V(-0.06, torsoC.y + tr[1] * 0.8, torsoC.z - 0.02), V(0.06, torsoC.y + tr[1] * 0.8, torsoC.z - 0.02)];
      break;
    }
    case 'floater': {
      const prof = [];
      const N = 24;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        prof.push(new THREE.Vector2(Math.max(0.001, 0.37 * W * Math.pow(Math.sin(Math.PI * Math.pow(t, 1.4)), 0.7)), t * 0.8 * Hh));
      }
      const lathe = new THREE.LatheGeometry(prof, 36);
      const pos = lathe.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const t = clamp(1 - y / (0.8 * Hh), 0, 1);
        pos.setZ(i, pos.getZ(i) - Math.pow(t, 2.5) * 0.28);
        pos.setX(i, pos.getX(i) + Math.sin(t * 4) * Math.pow(t, 3) * 0.09);
      }
      lathe.computeVertexNormals();
      body.add('skin', skin(lathe, headPaint));
      tr = [0.35 * W, 0.3 * Hh, 0.35 * W];
      torsoC = V(0, 0.5 * Hh, 0);
      headIsBody = true;
      hR = [0.36 * W, 0.31 * Hh, 0.36 * W];
      headC = V(0, 0.53 * Hh, 0.01);
      armPts = [V(-hR[0] * 0.95, headC.y - 0.12, 0.05), V(hR[0] * 0.95, headC.y - 0.12, 0.05)];
      tailBase = null;
      for (let i = 0; i < 4; i++) { const a = 0.3 + i * 0.3; spine.push(V(0, headC.y + hR[1] * Math.cos(a), -hR[2] * Math.sin(a))); }
      wingPts = [V(-hR[0] * 0.7, headC.y + 0.05, -0.12), V(hR[0] * 0.7, headC.y + 0.05, -0.12)];
      legH = 0;
      break;
    }
    case 'fish': {
      tr = [0.22 * W, 0.25 * Hh, 0.38 * Dd];
      torsoC = V(0, 0.32, 0);
      headIsBody = true;
      hR = [tr[0] * 1.02, tr[1], tr[2]];
      headC = torsoC.clone();
      tailBase = V(0, torsoC.y, -tr[2] * 0.95);
      tailDir = V(0, 0, -1);
      for (let i = 0; i < 4; i++) spine.push(V(0, torsoC.y + tr[1] * (0.95 - Math.abs(i - 1) * 0.06), tr[2] * (0.25 - i * 0.28)));
      wingPts = [V(-tr[0] * 0.9, torsoC.y - 0.05, tr[2] * 0.2), V(tr[0] * 0.9, torsoC.y - 0.05, tr[2] * 0.2)];
      legH = 0;
      break;
    }
    default: { // biped
      const chibi = build === 'chibi', pear = build === 'pear', ath = build === 'athletic', hunch = build === 'hunch';
      legH = (chibi ? 0.15 : ath ? 0.27 : 0.2) * L; legR = (hunch ? 0.095 : 0.08) * TH;
      tr = [(pear ? 0.31 : chibi ? 0.24 : 0.26) * W, (chibi ? 0.23 : ath ? 0.32 : 0.28) * Hh, (pear ? 0.27 : 0.23) * Dd];
      torsoC = V(0, legH + tr[1] * 0.85, 0);
      torsoTilt = hunch ? 0.35 : 0;
      const h = (chibi ? 0.39 : hunch ? 0.3 : 0.33) * hs;
      hR = [h * shapeS[0], h * shapeS[1], h * shapeS[2]];
      headC = hunch ? V(0, torsoC.y + tr[1] * 0.55 + h * 0.45, tr[2] * 0.75) : V(0, torsoC.y + tr[1] * 0.72 + h * 0.62, 0.03);
      legPts = [V(-tr[0] * 0.5, legH + 0.03, 0), V(tr[0] * 0.5, legH + 0.03, 0)];
      armScale = hunch ? 1.5 : ath ? 1.2 : 1;
      armPts = [V(-tr[0] * 0.92, torsoC.y + tr[1] * (hunch ? 0.45 : 0.3), hunch ? 0.08 : 0.03), V(tr[0] * 0.92, torsoC.y + tr[1] * (hunch ? 0.45 : 0.3), hunch ? 0.08 : 0.03)];
      tailBase = V(0, legH + tr[1] * 0.55, -tr[2] * 0.9);
      tailDir = V(0, 0.35, -1).normalize();
      for (let i = 0; i < 4; i++) { const a = 0.25 + i * 0.32; spine.push(V(0, torsoC.y + tr[1] * Math.cos(a) * 0.98, -tr[2] * Math.sin(a) * 0.98)); }
      wingPts = [V(-tr[0] * 0.55, torsoC.y + tr[1] * 0.45, -tr[2] * 0.65), V(tr[0] * 0.55, torsoC.y + tr[1] * 0.45, -tr[2] * 0.65)];
      if (hunch) {
        for (const sx of [-1, 1]) body.add('skin', skin(G.xf(G.sphere(tr[0] * 0.5, tr[1] * 0.45, tr[2] * 0.55), { p: [sx * tr[0] * 0.75, torsoC.y + tr[1] * 0.45, 0.04] }), bodyPaint()));
      }
    }
  }

  // ---------- torso + head
  if (gn.body === 'blob' || gn.body === 'fish') {
    const g = G.sphere(tr[0], tr[1], tr[2], 36, 28);
    if (gn.body === 'blob') {
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y < 0) pos.setY(i, y * 0.78); }
      g.computeVertexNormals();
    }
    body.add('skin', skin(G.xf(g, { p: torsoC.toArray() }), headPaint));
  } else if (gn.body !== 'serpent' && gn.body !== 'floater') {
    const g = G.sphere(tr[0], tr[1], tr[2], 32, 24);
    if (build === 'pear') {
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); const k = 1 + 0.22 * clamp(-y / tr[1], 0, 1); pos.setX(i, pos.getX(i) * k); pos.setZ(i, pos.getZ(i) * k); }
      g.computeVertexNormals();
    }
    G.xf(g, { r: [torsoTilt, 0, 0], p: torsoC.toArray() });
    body.add('skin', skin(g, bodyPaint()));
  }
  if (gn.body === 'biped' && build !== 'hunch') {
    // soft neck so head and torso read as one figure rather than stacked balls
    const nc = torsoC.clone().lerp(headC, 0.55);
    body.add('skin', skin(G.xf(G.sphere(Math.min(tr[0], hR[0]) * 0.72, (headC.y - torsoC.y) * 0.45, Math.min(tr[2], hR[2]) * 0.72, 20, 14), { p: nc.toArray() }), bodyPaint()));
  }
  if (neckFrom) {
    body.add('skin', skin(G.taperTube([neckFrom, neckFrom.clone().lerp(headC, 0.5).add(V(0, 0.04, 0)), headC.clone().add(V(0, -hR[1] * 0.3, -hR[2] * 0.3))], tr[0] * 0.55, hR[0] * 0.6, 14, 10), bodyPaint()));
  }
  if (!headIsBody) {
    const g = G.sphere(hR[0], hR[1], hR[2], 36, 28);
    if (gn.head.shape === 'long' || gn.head.shape === 'pear' || gn.head.shape === 'wide') {
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const z = pos.getZ(i) / hR[2];
        const k = gn.head.shape === 'long' ? 1 - 0.25 * clamp(z, 0, 1) : 1 + (gn.head.shape === 'wide' ? 0.18 : 0.12) * clamp(-pos.getY(i) / hR[1], 0, 1);
        pos.setX(i, pos.getX(i) * k);
        if (gn.head.shape === 'long') pos.setY(i, pos.getY(i) * (1 - 0.15 * clamp(z, 0, 1)));
      }
      g.computeVertexNormals();
    }
    body.add('skin', skin(G.xf(g, { p: headC.toArray() }), headPaint));
  }
  const H = { c: headC, r: hR };
  const hmax = Math.max(hR[0], hR[1]);
  // features scale with the head; on blob-style bodies the 'head' is the whole body, so tone them down
  const fscale = headIsBody ? 0.62 : 1;
  const headPt = (az, el, push = 0) => {
    const d = V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    const p = V(d.x * H.r[0], d.y * H.r[1], d.z * H.r[2]).add(H.c);
    const n = V(d.x / H.r[0], d.y / H.r[1], d.z / H.r[2]).normalize();
    p.addScaledVector(n, push);
    return { p, n };
  };
  const faceEl = gn.body === 'fish' ? 0.05 : headIsBody ? 0.14 : 0.12;

  // ---------- jaw (big lower face for toothy beasts)
  const bigJaw = gn.head.jaw > 0.55 && gn.mouth.type !== 'beak' && gn.body !== 'fish' && !headIsBody;
  let mouthAt = headPt(0, faceEl - 0.46, 0);
  let mouthR = hmax;
  if (bigJaw) {
    const jr = [hR[0] * (0.78 + 0.25 * gn.head.jaw), hR[1] * 0.52, hR[2] * 0.82];
    const jc = headC.clone().add(V(0, -hR[1] * 0.42, hR[2] * 0.22));
    body.add('skin', skin(G.xf(G.sphere(jr[0], jr[1], jr[2], 30, 20), { p: jc.toArray() }), (p, n) => [lerpHex(P.main, P.belly, sstep(-0.1, -0.7, n.y) * 0.9 + sstep(0.5, 1, n.z) * 0.4), 0.5]));
    const pz = jc.clone().add(V(0, jr[1] * 0.35, jr[2] * 0.93));
    mouthAt = { p: pz, n: V(0, 0.15, 1).normalize() };
    mouthR = Math.max(jr[0], jr[2]);
  }

  // ---------- snout
  if (gn.head.snoutType === 'muzzle' || gn.head.snoutType === 'snout') {
    const { p, n } = headPt(0, faceEl - 0.32, -hmax * 0.08);
    const mz = [hR[0] * 0.5, hR[1] * 0.34, hR[2] * 0.42 * (0.8 + gn.head.snout * 0.5)];
    const g = G.sphere(mz[0], mz[1], mz[2], 24, 18);
    G.xf(g, { p: p.clone().addScaledVector(n, mz[2] * 0.55).toArray() });
    body.add('skin', skin(g, (pp, nn) => [lerpHex(P.belly, P.main, sstep(0.4, 0.95, nn.y) * 0.6), 0]));
    const tip = p.clone().addScaledVector(n, mz[2] * 1.45).add(V(0, mz[1] * 0.35, 0));
    if (gn.head.snoutType === 'snout') {
      body.add('skin', skin(G.xf(G.sphere(mz[0] * 0.55, mz[1] * 0.5, mz[2] * 0.25), { p: tip.toArray() }), () => [shade(P.belly, -0.08), 0]));
    } else {
      body.add('gloss', G.paint(G.xf(G.sphere(mz[0] * 0.34, mz[1] * 0.26, mz[2] * 0.22), { p: tip.toArray() }), 0x2a1820));
    }
    if (!bigJaw) { mouthAt = { p: p.clone().addScaledVector(n, mz[2] * 1.05).add(V(0, -mz[1] * 0.45, 0)), n }; mouthR = mz[0] * 1.4; }
  } else if (gn.head.snoutType === 'trunk') {
    const { p, n } = headPt(0, faceEl - 0.25, -0.01);
    const pts = [p, p.clone().addScaledVector(n, 0.12).add(V(0, -0.05, 0)), p.clone().addScaledVector(n, 0.18).add(V(0, -0.18, 0)), p.clone().addScaledVector(n, 0.24).add(V(0, -0.24, 0.02))];
    body.add('skin', skin(G.taperTube(pts, hmax * 0.18, hmax * 0.1, 12, 16), () => [P.main, 1]));
    mouthAt = headPt(0, faceEl - 0.62, 0);
  }

  // ---------- eyes
  const eyeNames = [];
  const eyeGroups = [];
  const E = gn.eyes;
  const eyeR = hmax * E.size * (headIsBody ? 1.05 : 1.25);
  const makeEye = (az, el, re, idx) => {
    const { p, n } = headPt(az, el, 0);
    const grp = new THREE.Group();
    grp.name = 'eye' + idx;
    grp.position.copy(p);
    grp.quaternion.copy(G.lookQuat(n));
    const side = az === 0 ? 1 : Math.sign(az);
    const eb = new Bucket();
    const tilt = -side * E.tilt;
    const sclera = G.sphere(re, re * 1.08, re * 0.6, 26, 18);
    G.xf(sclera, { r: [0, 0, tilt], p: [0, 0, -re * 0.14] });
    eb.add('gloss', G.paint(sclera, E.sclera));
    if (E.look === 'cute') {
      eb.add('gloss', G.paint(G.xf(G.sphere(re * 0.68, re * 0.74, re * 0.3, 20, 14), { p: [0, -re * 0.05, re * 0.34] }), E.iris));
      eb.add('gloss', G.paint(G.xf(G.sphere(re * 0.38, re * 0.42, re * 0.2, 16, 12), { p: [0, -re * 0.05, re * 0.44] }), 0x05050a));
      eb.add('hi', G.paint(G.xf(G.sphere(re * 0.2, re * 0.2, re * 0.1, 12, 8), { p: [-re * 0.24, re * 0.24, re * 0.52] }), 0xffffff));
      eb.add('hi', G.paint(G.xf(G.sphere(re * 0.09, re * 0.09, re * 0.05, 10, 6), { p: [re * 0.22, -re * 0.26, re * 0.48] }), 0xffffff));
    } else {
      const look = { x: side * -0.08 * re, y: -0.04 * re };
      if (E.look === 'iris') eb.add('gloss', G.paint(G.xf(G.sphere(re * 0.52, re * 0.56, re * 0.25, 20, 14), { p: [look.x, look.y, re * 0.36] }), E.iris));
      if (E.pupil === 'slit') eb.add('gloss', G.paint(G.xf(G.sphere(re * 0.09, re * 0.5, re * 0.12, 12, 12), { p: [look.x, look.y, re * 0.43] }), 0x0a0508));
      else if (E.pupil === 'dot') eb.add('gloss', G.paint(G.xf(G.sphere(re * 0.2, re * 0.22, re * 0.12, 14, 10), { p: [look.x, look.y, re * 0.44] }), 0x0a0508));
      else if (E.pupil === 'round') eb.add('gloss', G.paint(G.xf(G.sphere(re * 0.27, re * 0.3, re * 0.14, 14, 10), { p: [look.x, look.y, re * 0.44] }), 0x0a0508));
      eb.add('hi', G.paint(G.xf(G.sphere(re * 0.14, re * 0.14, re * 0.08, 10, 8), { p: [-re * 0.28, re * 0.3, re * 0.47] }), 0xffffff));
    }
    // Eyelid: the attitude of the face
    const lidCol = lerpHex(P.main, dark, 0.2);
    if (E.lid !== 'none') {
      const lid = G.sphere(re * 1.14, re * 0.62, re * 0.74, 22, 12);
      const cfg = {
        smug: { y: 0.52, r: side * 0.06 },
        sleepy: { y: 0.36, r: side * 0.04 },
        angry: { y: 0.6, r: side * 0.5, x: -side * 0.12 },
        sad: { y: 0.62, r: -side * 0.42, x: side * 0.1 },
      }[E.lid] || { y: 0.55, r: 0 };
      G.xf(lid, { r: [0, 0, cfg.r], p: [(cfg.x || 0) * re, cfg.y * re, -re * 0.06] });
      eb.add('skin', skin(lid, () => [lidCol, 0]));
    }
    const built = eb.build({ ...S, skin: null });
    grp.add(built);
    eyeNames.push(grp.name);
    eyeGroups.push(grp);
  };
  if (E.look === 'visor') {
    const { p, n } = headPt(0, faceEl + 0.05, -0.01);
    const vb = new Bucket();
    vb.add('gloss', G.paint(G.placeOnNormal(G.sphere(hR[0] * 0.8, eyeR * 0.8, eyeR * 0.45, 28, 14), p, n), 0x101828));
    for (const sx of [-1, 1]) {
      const q = headPt(sx * 0.32, faceEl + 0.08, eyeR * 0.28);
      vb.add('gloss', G.paint(G.xf(G.sphere(eyeR * 0.26, eyeR * 0.2, eyeR * 0.1), { p: q.p.toArray() }), E.iris));
    }
    const grp = vb.build({ ...S, skin: null });
    grp.name = 'visor';
    eyeGroups.push(grp);
  } else if (E.count === 1) makeEye(0, faceEl + 0.06, eyeR * 1.3, 0);
  else if (E.count === 3) {
    makeEye(-E.spacing * 1.08, faceEl, eyeR * 0.8, 0);
    makeEye(0, faceEl + 0.32, eyeR * 0.82, 1);
    makeEye(E.spacing * 1.08, faceEl, eyeR * 0.8, 2);
  } else {
    const az = E.spacing * (gn.body === 'fish' ? 1.6 : 1.0);
    makeEye(-az, faceEl, eyeR, 0);
    makeEye(az, faceEl, eyeR, 1);
  }

  // ---------- mouth (built face-local, bent onto the head and placed at mouthAt)
  const M = gn.mouth;
  {
    const { p, n } = mouthAt;
    const q = G.lookQuat(n);
    const place = (g, push = 0.004) => { bend(g, mouthR); G.xf(g, { q, p: p.clone().addScaledVector(n, push).toArray() }); return g; };
    const mw = mouthR * 0.42 * M.w;
    const toothCol = 0xfff8e6;
    const crescent = (w, h, curve) => {
      const s = new THREE.Shape();
      s.moveTo(-w, curve);
      s.quadraticCurveTo(0, -curve * 0.3, w, curve);
      s.quadraticCurveTo(0, -h * 2 + curve, -w, curve);
      return new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 18 });
    };
    const tooth = (x, y, len, up) => {
      const c = G.cone(len * 0.42, len, 4);
      G.xf(c, { r: [up ? 0 : Math.PI, Math.PI / 4, 0] });
      c.scale(1, 1, 0.45);
      G.xf(c, { p: [x, y, 0.012] });
      body.add('gloss', G.paint(place(c, 0.006), toothCol));
    };
    if (M.type === 'beak') {
      const beak = G.cone(hmax * 0.2, hmax * 0.6, 16);
      tipZ(beak);
      beak.scale(1, 0.75, 1);
      G.xf(beak, { q, p: p.clone().addScaledVector(n, -0.02).add(V(0, hmax * 0.12, 0)).toArray() });
      body.add('gloss', G.paint(beak, mixHex(0xffa02a, 0xffd25a, 0.3)));
      const low = G.cone(hmax * 0.14, hmax * 0.32, 14);
      tipZ(low);
      G.xf(low, { q, p: p.clone().add(V(0, -hmax * 0.02, 0)).toArray() });
      body.add('gloss', G.paint(low, 0xe0802a));
    } else if (M.type === 'mandible') {
      for (const sx of [-1, 1]) {
        const a = p.clone().add(V(sx * mw * 0.6, 0, 0));
        const pts = [a, a.clone().addScaledVector(n, mw * 0.8).add(V(sx * mw * 0.3, -mw * 0.2, 0)), a.clone().addScaledVector(n, mw * 1.3).add(V(-sx * mw * 0.2, -mw * 0.35, 0))];
        body.add('gloss', G.paint(G.taperTube(pts, mw * 0.18, mw * 0.03, 8, 10, false), P.accent));
      }
    } else if (M.type === 'smile' || M.type === 'cat' || M.type === 'buck' || M.type === 'fang1') {
      if (M.type === 'cat') {
        for (const sx of [-1, 1]) {
          const arc = G.torusArc(mw * 0.34, mw * 0.07, Math.PI, 12);
          G.xf(arc, { r: [0, 0, Math.PI], p: [sx * mw * 0.34, 0, 0] });
          body.add('mouth', G.paint(place(arc), 0x3a1020));
        }
      } else {
        const arc = G.torusArc(mw * 0.8, mw * 0.09, Math.PI * 0.8, 18);
        G.xf(arc, { r: [0, 0, Math.PI + Math.PI * 0.1], p: [0, mw * 0.55, 0] });
        body.add('mouth', G.paint(place(arc), 0x3a1020));
      }
      if (M.type === 'buck') {
        for (const sx of [-1, 1]) {
          const t = G.rbox(mw * 0.26, mw * 0.32, 0.02, 0.008, 2);
          G.xf(t, { r: [Math.PI, 0, 0], p: [sx * mw * 0.14, -mw * 0.22, 0.01] });
          body.add('gloss', G.paint(place(t), toothCol));
        }
      } else if (M.type === 'fang1') {
        tooth(mw * 0.42, -mw * 0.22, mw * 0.36, false);
      }
    } else {
      // grin / maw / tusks: crescent cavity with jagged teeth rows
      const maw = M.type === 'maw';
      const w = mw * (maw ? 1.25 : 1.05);
      const h = mw * (maw ? 0.75 : 0.32);
      const curve = mw * (maw ? 0.18 : 0.3);
      body.add('mouth', G.paint(place(crescent(w, h, curve), 0.0), (pp) => lerpHex(0x4a0f1e, 0x8a1a2e, sstep(0, -h, pp.y))));
      if (maw) {
        const tongue = G.sphere(w * 0.45, h * 0.35, 0.03, 16, 10);
        G.xf(tongue, { p: [0, -h * 1.1, 0.015] });
        body.add('gloss', G.paint(place(tongue, 0.004), 0xff5a7a));
      }
      const nTop = Math.max(3, Math.round(M.teeth * (maw ? 1 : 0.8)));
      for (let i = 0; i < nTop; i++) {
        const t = (i / (nTop - 1)) * 2 - 1;
        const y = curve * (t * t) - curve * 0.3 * (1 - t * t) + 0.004;
        tooth(t * w * 0.88, y, mw * (maw ? 0.42 : 0.28) * (i % 2 ? 0.72 : 1) * (1 - 0.25 * Math.abs(t)), false);
      }
      if (maw || M.teeth >= 8) {
        const nb = Math.max(3, Math.round(nTop * 0.7));
        for (let i = 0; i < nb; i++) {
          const t = (i / (nb - 1)) * 2 - 1;
          const y = -h * (1 - t * t) + curve * t * t * 0.8 + h * (maw ? 0.5 : 0.25);
          tooth(t * w * 0.7, y, mw * (maw ? 0.32 : 0.2) * (i % 2 ? 0.75 : 1), true);
        }
      }
      if (M.type === 'tusks') {
        for (const sx of [-1, 1]) {
          const a = p.clone().add(V(sx * w * 0.85, -mw * 0.15, 0));
          const pts = [a, a.clone().addScaledVector(n, mw * 0.35).add(V(sx * mw * 0.25, mw * 0.1, 0)), a.clone().addScaledVector(n, mw * 0.55).add(V(sx * mw * 0.35, mw * 0.7, 0))];
          body.add('gloss', G.paint(G.taperTube(pts, mw * 0.18, mw * 0.03, 10, 12, false), toothCol));
        }
      }
    }
  }

  // ---------- cheeks blush
  if (gn.cheeks && E.look !== 'visor') {
    for (const sx of [-1, 1]) {
      const { p, n } = headPt(sx * (E.spacing + 0.4), faceEl - 0.26, -hmax * 0.02);
      const g = G.sphere(hmax * 0.12, hmax * 0.08, hmax * 0.05);
      G.xf(g, { q: G.lookQuat(n), p: p.toArray() });
      body.add('skin', skin(g, () => [mixHex(P.main, 0xff7a9a, 0.6), 0]));
    }
  }

  // ---------- fur tufts
  const T = gn.tufts;
  const furCol = shade(P.main, 0.04);
  if (T.head !== 'none' && gn.horns.type !== 'crest') {
    if (T.head === 'spiky') {
      const n = 4 + (sp.stage - 1);
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1) - 0.5;
        const { p } = headPt(t * 0.9, 0.86 - Math.abs(t) * 0.2, -0.02);
        const dir = V(t * 0.9, 1, -0.55 - Math.abs(t) * 0.3);
        body.add('skin', skin(spike(p, dir, hmax * (0.55 - Math.abs(t) * 0.25) * (1 + 0.15 * (sp.stage - 1)), hmax * 0.11, V(0, 0, -1)), () => [i % 2 ? P.second : furCol, 0]));
      }
    } else if (T.head === 'mohawk') {
      for (let i = 0; i < 5; i++) {
        const { p, n } = headPt(0, 1.0 - i * 0.32, -0.02);
        body.add('skin', skin(spike(p, n.clone().add(V(0, 0.4, -0.6)), hmax * (0.42 - i * 0.04), hmax * 0.1, V(0, 0, -1)), () => [P.second, 0]));
      }
    } else if (T.head === 'tuft') {
      for (let i = -1; i <= 1; i++) {
        const { p } = headPt(i * 0.22, 0.95, -0.02);
        body.add('skin', skin(spike(p, V(i * 0.5, 1, 0.25), hmax * (i === 0 ? 0.4 : 0.28), hmax * 0.08, V(i * 0.6, 0, 1)), () => [furCol, 0]));
      }
    } else if (T.head === 'curl') {
      const { p } = headPt(0, 0.85, -0.02);
      const pts = [];
      for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI * 1.6; pts.push(p.clone().add(V(0, Math.sin(a) * hmax * 0.2 + i * 0.008, hmax * (0.05 + 0.18 * (1 - Math.cos(a)) * 0.5)))); }
      body.add('skin', skin(G.taperTube(pts, hmax * 0.07, hmax * 0.02, 8, 16), () => [P.second, 0]));
    }
  }
  if (T.cheek && !headIsBody) {
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
      const { p, n } = headPt(sx * (1.25 + k * 0.08), -0.15 - k * 0.22, -0.03);
      body.add('skin', skin(spike(p, n.clone().add(V(0, -0.2, -0.5)), hmax * (0.32 - k * 0.06), hmax * 0.09, V(0, -0.3, -1)), () => [lerpHex(P.main, P.belly, 0.35), 0]));
    }
  }
  if (T.chest && !headIsBody && gn.body !== 'serpent') {
    const base = torsoC.clone().add(V(0, tr[1] * 0.45, tr[2] * 0.9));
    for (let k = -1; k <= 1; k++) body.add('skin', skin(spike(base.clone().add(V(k * tr[0] * 0.25, 0, 0)), V(k * 0.3, -1, 0.6), tr[1] * 0.5, tr[0] * 0.18, V(0, 0, 1)), () => [P.belly, 0]));
  }
  if (T.mane && !headIsBody) {
    for (let i = 0; i < 9; i++) {
      const a = (i / 8) * Math.PI * 1.3 - Math.PI * 0.65;
      const { p } = headPt(a + Math.PI, 0.15, -0.04);
      body.add('skin', skin(spike(p, V(Math.sin(a + Math.PI) * 0.8, 0.3, -1), hmax * 0.55, hmax * 0.16, V(0, -0.2, -1)), () => [i % 2 ? P.second : shade(P.second, -0.08), 0]));
    }
  }

  // ---------- ears
  const ear = gn.ears.type;
  const es = gn.ears.size * hmax * fscale;
  const innerCol = mixHex(P.belly, 0xff9ab8, 0.35);
  if (ear !== 'none') {
    for (const sx of [-1, 1]) {
      if (ear === 'cat' || ear === 'horn') {
        const { p, n } = headPt(sx * 0.62, 0.78, -0.02);
        const dir = n.clone().add(V(0, 0.6, 0)).normalize();
        const q = G.lookQuat(dir);
        const outer = G.cone(es * 0.34, es * 0.8, 4);
        G.xf(outer, { r: [Math.PI / 2, Math.PI / 4, 0] });
        outer.scale(1, 0.55, 1);
        G.xf(outer, { q, p: p.toArray() });
        body.add('skin', skin(outer, () => [ear === 'horn' ? P.horn : P.main, 0]));
        if (ear === 'cat') {
          const inner = G.cone(es * 0.2, es * 0.56, 4);
          G.xf(inner, { r: [Math.PI / 2, Math.PI / 4, 0] });
          inner.scale(1, 0.4, 1);
          G.xf(inner, { p: [0, es * 0.05, es * 0.04] });
          G.xf(inner, { q, p: p.toArray() });
          body.add('skin', skin(inner, () => [innerCol, 0]));
          const tip = p.clone().addScaledVector(dir, es * 0.78);
          body.add('skin', skin(spike(tip, dir.clone().add(V(sx * 0.3, 0.4, 0)), es * 0.25, es * 0.05), () => [dark, 0]));
        }
      } else if (ear === 'bunny') {
        const { p } = headPt(sx * 0.35, 0.85, -0.03);
        const g = G.sphere(es * 0.16, es * 0.62, es * 0.09, 18, 14);
        G.xf(g, { p: [0, es * 0.55, 0] });
        G.xf(g, { r: [-0.15, 0, -sx * 0.25], p: p.toArray() });
        body.add('skin', skin(g, (pp, nn) => [nn.z > 0.3 ? innerCol : P.main, 0]));
      } else if (ear === 'round') {
        const { p } = headPt(sx * 0.68, 0.78, 0);
        const g = G.sphere(es * 0.27, es * 0.27, es * 0.1, 20, 14);
        G.xf(g, { q: G.lookQuat(V(sx * 0.3, 0.2, 1)), p: p.toArray() });
        body.add('skin', skin(g, (pp, nn) => [nn.z > 0.5 ? innerCol : P.main, 0]));
      } else if (ear === 'droop') {
        const { p } = headPt(sx * 1.2, 0.35, -0.02);
        const g = G.sphere(es * 0.15, es * 0.42, es * 0.08, 16, 12);
        G.xf(g, { p: [0, -es * 0.35, 0] });
        G.xf(g, { r: [0, 0, sx * 0.5], p: p.toArray() });
        body.add('skin', skin(g, () => [P.second, 0]));
      } else if (ear === 'fin' || ear === 'leaf') {
        const { p } = headPt(sx * 1.05, 0.3, -0.02);
        const g = G.leaf(es * 0.7, es * 0.34, 0.18, 0.1);
        G.xf(g, { r: [-0.6, sx * 1.6, 0] });
        G.xf(g, { p: p.toArray() });
        body.add('skin', skin(g, () => [ear === 'leaf' ? P.second : mixHex(P.second, P.main, 0.3), 0]));
      } else if (ear === 'tuft') {
        const { p } = headPt(sx * 0.55, 0.85, -0.02);
        for (let k = 0; k < 3; k++) body.add('skin', skin(spike(p, V(sx * (0.4 + k * 0.35), 1, -0.3 + k * 0.1), es * (0.45 - k * 0.08), es * 0.09), () => [P.main, 0]));
      } else if (ear === 'bolt') {
        const { p } = headPt(sx * 0.62, 0.7, -0.02);
        const g = G.boltShape(es * 0.7, es * 0.35, es * 0.08);
        G.xf(g, { r: [0, 0, -sx * 0.35], s: [sx, 1, 1], p: p.toArray() });
        body.add('gloss', G.paint(g, P.second));
      } else if (ear === 'dish') {
        const { p } = headPt(sx * 1.25, 0.2, 0);
        const g = tipZ(G.cone(es * 0.3, es * 0.16, 18, true));
        G.xf(g, { q: G.lookQuat(V(-sx * 1, 0, 0.2)), p: p.toArray() });
        const g2 = G.sphere(es * 0.06);
        G.xf(g2, { p: p.toArray() });
        body.add('gloss', G.paint(G.merge([g, g2]), shade(P.main, 0.08)));
      }
    }
  }

  // ---------- horns
  const horn = gn.horns.type;
  const hsz = gn.horns.size * hmax * fscale;
  const hornCol = P.horn;
  if (horn !== 'none') {
    const pairs = (fn) => { for (const sx of [-1, 1]) fn(sx); };
    if (horn === 'nub' || horn === 'spike') {
      pairs((sx) => {
        const { p, n } = headPt(sx * 0.42, 0.95, -0.03);
        const dir = n.clone().add(V(sx * 0.2, 1.2, 0)).normalize();
        body.add('gloss', G.paint(spike(p, dir, hsz * (horn === 'nub' ? 0.28 : 0.7), hsz * 0.14, V(sx * 0.4, 0, -0.6)), (pp) => lerpHex(hornCol, shade(hornCol, 0.22), (pp.y - p.y) / (hsz * 0.6))));
      });
    } else if (horn === 'curl' || horn === 'ram') {
      pairs((sx) => {
        const { p } = headPt(sx * (horn === 'ram' ? 0.75 : 0.45), horn === 'ram' ? 0.75 : 0.9, -0.03);
        const pts = [];
        const turns = horn === 'ram' ? 1.1 : 0.55;
        for (let i = 0; i <= 8; i++) {
          const t = i / 8;
          const a = t * Math.PI * 2 * turns;
          const rad = hsz * (horn === 'ram' ? 0.38 : 0.55) * (1 - t * 0.35);
          pts.push(p.clone().add(V(sx * (Math.sin(a) * rad * 0.7 + t * hsz * 0.15), (1 - Math.cos(a)) * rad * 0.5 + t * hsz * (horn === 'ram' ? 0.05 : 0.25), -Math.sin(a * 0.5) * rad * 0.6)));
        }
        body.add('gloss', G.paint(G.taperTube(pts, hsz * 0.13, hsz * 0.02, 10, 24, false), hornCol));
      });
    } else if (horn === 'antler') {
      pairs((sx) => {
        const { p } = headPt(sx * 0.42, 0.95, -0.03);
        const top = p.clone().add(V(sx * hsz * 0.35, hsz * 0.75, -hsz * 0.1));
        body.add('gloss', G.paint(G.taperTube([p, p.clone().add(V(sx * hsz * 0.12, hsz * 0.35, 0)), top], hsz * 0.08, hsz * 0.03, 8, 12), hornCol));
        const mid = p.clone().add(V(sx * hsz * 0.15, hsz * 0.4, 0));
        body.add('gloss', G.paint(G.taperTube([mid, mid.clone().add(V(sx * hsz * 0.05, hsz * 0.18, hsz * 0.18)), mid.clone().add(V(sx * hsz * 0.02, hsz * 0.35, hsz * 0.22))], hsz * 0.05, hsz * 0.02, 8, 8), hornCol));
        body.add('gloss', G.paint(G.taperTube([mid, mid.clone().add(V(sx * hsz * 0.28, hsz * 0.15, 0)), mid.clone().add(V(sx * hsz * 0.42, hsz * 0.3, -hsz * 0.05))], hsz * 0.05, hsz * 0.02, 8, 8), hornCol));
      });
    } else if (horn === 'unicorn') {
      const { p, n } = headPt(0, 0.62, -0.03);
      const g = G.cone(hsz * 0.13, hsz * 0.85, 16);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); const a = y * 18; const x = pos.getX(i), z = pos.getZ(i); pos.setX(i, x * Math.cos(a) - z * Math.sin(a)); pos.setZ(i, x * Math.sin(a) + z * Math.cos(a)); }
      g.computeVertexNormals();
      tipZ(g);
      G.xf(g, { q: G.lookQuat(n.clone().add(V(0, 1.2, 0.3)).normalize(), V(0, 0, 1)), p: p.toArray() });
      body.add('gloss', G.paint(g, (pp) => lerpHex(hornCol, 0xffffff, (pp.y - p.y) / hsz)));
    } else if (horn === 'crystal') {
      const cols = [P.accent, P.second, shade(P.accent, 0.15)];
      [-0.4, 0, 0.4].forEach((az, k) => {
        const { p, n } = headPt(az, 0.92 - Math.abs(az) * 0.2, -0.03);
        const g = tipZ(G.crystal(hsz * 0.12, hsz * (k === 1 ? 0.75 : 0.5)));
        G.xf(g, { q: G.lookQuat(n.clone().add(V(az * 0.6, 1, 0)).normalize(), V(0, 0, 1)), p: p.toArray() });
        body.add('gloss', G.paint(g, (pp, nn) => lerpHex(cols[k], 0xffffff, 0.12 + 0.2 * Math.abs(nn.x))));
      });
    } else if (horn === 'antenna') {
      pairs((sx) => {
        const { p } = headPt(sx * 0.3, 0.95, -0.02);
        const pts = [p, p.clone().add(V(sx * hsz * 0.1, hsz * 0.35, hsz * 0.05)), p.clone().add(V(sx * hsz * 0.25, hsz * 0.65, hsz * 0.15))];
        body.add('skin', skin(G.taperTube(pts, hsz * 0.035, hsz * 0.025, 8, 12), () => [dark, 0]));
        body.add('gloss', G.paint(G.xf(G.sphere(hsz * 0.09), { p: pts[2].toArray() }), P.accent));
      });
    } else if (horn === 'crest') {
      for (let k = -2; k <= 2; k++) {
        const { p } = headPt(k * 0.12, 0.92, -0.02);
        const g = G.leaf(hsz * (0.6 - Math.abs(k) * 0.08), hsz * 0.14, 0.3, 0.25);
        G.xf(g, { r: [-1.1 - Math.abs(k) * 0.05, k * 0.25, 0], p: p.toArray() });
        body.add('skin', skin(g, () => [k % 2 ? P.second : P.accent, 0]));
      }
    } else if (horn === 'sprout') {
      const { p } = headPt(0, 1.0, -0.02);
      const top = p.clone().add(V(0, hsz * 0.3, 0));
      body.add('skin', skin(G.taperTube([p, p.clone().add(V(0.01, hsz * 0.15, 0)), top], hsz * 0.035, hsz * 0.025, 8, 8), () => [0x3a9a3a, 0]));
      for (const sx of [-1, 1]) {
        const g = G.leaf(hsz * 0.42, hsz * 0.2, 0.2, 0.2);
        G.xf(g, { r: [-0.35, sx * 1.4, 0], p: top.toArray() });
        body.add('skin', skin(g, () => [0x5cd65a, 0]));
      }
    }
  }

  // ---------- back features
  const back = gn.back.type;
  const bs = gn.back.size;
  const nB = Math.min(spine.length, gn.back.count);
  const spinePick = (k) => spine[Math.min(spine.length - 1, Math.round((k / Math.max(1, nB - 1)) * (spine.length - 1)))];
  const spineUp = (pt) => (gn.body === 'quad' || gn.body === 'bug' || gn.body === 'serpent' ? V(0, 1, 0) : pt.clone().sub(torsoC).normalize());
  if (back !== 'none' && spine.length) {
    if (back === 'shell') {
      const g = new THREE.IcosahedronGeometry(1, 2);
      g.scale(tr[0] * 1.15, tr[1] * 0.85, tr[2] * 1.12);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) if (pos.getY(i) < -tr[1] * 0.1) pos.setY(i, -tr[1] * 0.1);
      g.computeVertexNormals();
      G.xf(g, { p: torsoC.clone().add(V(0, tr[1] * 0.28, -0.01)).toArray() });
      body.add('gloss', G.paint(g, (pp) => lerpHex(P.second, shade(P.second, -0.15), 0.5 + 0.5 * Math.sin(pp.x * 30) * Math.sin(pp.z * 30))));
    } else {
      for (let k = 0; k < nB; k++) {
        const pt = spinePick(k);
        const up = spineUp(pt);
        const mid = 1 - Math.abs(k - (nB - 1) / 2) / Math.max(1, nB / 2);
        const sz = bs * (0.6 + 0.5 * mid) * (gn.body === 'blob' ? 1.1 : 1);
        if (back === 'spikes') {
          body.add('gloss', G.paint(spike(pt, up.clone().add(V(0, 0, -0.5)), 0.2 * sz, 0.055 * sz, V(0, 0, -1)), P.accent === P.main ? P.second : P.accent));
        } else if (back === 'plates') {
          const g = G.sphere(0.018 * sz, 0.09 * sz, 0.08 * sz, 16, 12);
          G.xf(g, { q: G.lookQuat(V(0, 0, 1), up), p: pt.clone().addScaledVector(up, 0.05 * sz).toArray() });
          body.add('gloss', G.paint(g, P.second));
        } else if (back === 'leaves') {
          const g = G.leaf(0.22 * sz, 0.09 * sz, 0.2, 0.25);
          G.xf(g, { r: [-1.2, (k % 2 ? 0.4 : -0.4), 0], p: pt.toArray() });
          body.add('skin', skin(g, () => [k % 2 ? P.second : mixHex(P.second, 0x4ac84a, 0.5), 0]));
        } else if (back === 'flames' || back === 'wisps') {
          const cols = back === 'wisps' ? [P.wisp || P.second, shade(P.wisp || P.second, 0.12), 0xf4f0ff] : (gn.palette.flame || [0xff4a1a, 0xffb02e, 0xffe46a]);
          const g = G.flame(0.24 * sz * (back === 'wisps' ? 1.3 : 1), 0.065 * sz, 1, cols);
          G.xf(g, { r: [-0.4, 0, 0], p: pt.toArray() });
          body.add('gloss', g);
        } else if (back === 'crystals') {
          const g = tipZ(G.crystal(0.035 * sz, 0.18 * sz));
          G.xf(g, { q: G.lookQuat(up, V(0, 0, 1)), p: pt.toArray() });
          const g2 = G.crystal(0.022 * sz, 0.1 * sz);
          G.xf(g2, { r: [0.5, 0, (k % 2 ? 0.6 : -0.6)], p: pt.toArray() });
          body.add('gloss', G.paint(G.merge([g, g2]), (pp, nn) => lerpHex(P.accent === P.main ? P.second : P.accent, 0xffffff, 0.1 + 0.25 * Math.abs(nn.x))));
        } else if (back === 'fins') {
          if (k === Math.floor(nB / 2)) {
            const g = G.leaf(0.32 * sz, 0.16 * sz, 0.12, 0);
            G.xf(g, { r: [-Math.PI / 2 - 0.5, 0, Math.PI / 2] });
            g.scale(0.4, 1, 1);
            G.xf(g, { p: pt.toArray() });
            body.add('skin', skin(g, () => [P.second, 0]));
          }
        } else if (back === 'mushroom') {
          if (k % 2 === 0) {
            body.add('skin', skin(G.xf(G.cyl(0.025 * sz, 0.03 * sz, 0.08 * sz, 10), { p: pt.toArray() }), () => [0xfff4e0, 0]));
            const cap = G.sphere(0.09 * sz, 0.055 * sz, 0.09 * sz, 18, 10);
            G.xf(cap, { p: pt.clone().add(V(0, 0.08 * sz, 0)).toArray() });
            body.add('gloss', G.paint(cap, (pp, nn) => (Math.sin(pp.x * 90) * Math.sin(pp.z * 90) > 0.7 && nn.y > 0.3 ? 0xffffff : P.second)));
          }
        } else if (back === 'flower') {
          if (k === Math.floor(nB / 2)) {
            for (let i = 0; i < 6; i++) {
              const g = G.leaf(0.14 * sz, 0.07 * sz, 0.2, 0.1);
              G.xf(g, { r: [-0.25, (i / 6) * Math.PI * 2, 0], p: pt.clone().add(V(0, 0.03, 0)).toArray() });
              body.add('skin', skin(g, () => [P.accent, 0]));
            }
            body.add('gloss', G.paint(G.xf(G.sphere(0.05 * sz), { p: pt.clone().add(V(0, 0.05, 0)).toArray() }), 0xffd23c));
          }
        } else if (back === 'tufts') {
          for (let i = 0; i < 2; i++) body.add('skin', skin(spike(pt, up.clone().add(V(i ? 0.35 : -0.35, 0, -0.8)), 0.16 * sz, 0.045 * sz, V(0, 0, -1)), () => [shade(P.main, 0.05), 0]));
        } else if (back === 'vents') {
          if (k % 2 === 1) body.add('gloss', G.paint(G.xf(G.cyl(0.035 * sz, 0.04 * sz, 0.09 * sz, 12), { p: pt.toArray() }), 0x4a5260));
        }
      }
    }
  }

  // ---------- assemble rig
  const skinMat = skinMaterial(gn.pattern, gn.metal, (torsoC.y + hR[1]) * 1.4);
  const mats = { ...S, skin: skinMat };
  const root = new THREE.Group();
  const rig = new THREE.Group();
  rig.name = 'rig';
  root.add(rig);
  rig.add(body.build(mats));
  for (const eg of eyeGroups) {
    eg.traverse((o) => { if (o.isMesh && !o.material) o.material = skinMat; });
    rig.add(eg);
  }

  // ---------- legs
  const legNames = [];
  legPts.forEach((hp, i) => {
    const pivot = new THREE.Group();
    pivot.name = 'leg' + i;
    pivot.position.copy(hp);
    const lb = new Bucket();
    if (gn.body === 'bug') {
      const sx = Math.sign(hp.x);
      const pts = [V(0, 0, 0), V(sx * 0.1, 0.05, 0), V(sx * 0.18, -hp.y * 0.5, 0), V(sx * 0.21, -hp.y + 0.02, 0)];
      lb.add('skin', skin(G.taperTube(pts, 0.024, 0.01, 8, 12, false), () => [dark, 0]));
    } else if (gn.body === 'avian') {
      lb.add('gloss', G.paint(G.xf(G.cyl(legR, legR, hp.y, 8), { p: [0, -hp.y, 0] }), 0xffa030));
      for (let k = -1; k <= 1; k++) {
        const t = G.cyl(legR * 0.8, legR * 0.6, 0.09, 6);
        G.xf(t, { r: [Math.PI / 2 - 0.1, k * 0.45, 0], p: [0, -hp.y + 0.015, 0] });
        lb.add('gloss', G.paint(t, 0xffa030));
      }
    } else if (gn.body === 'blob') {
      lb.add('skin', skin(G.xf(G.sphere(legR * 1.2, legR * 0.7, legR * 1.4), { p: [0, -hp.y + legR * 0.6, legR * 0.3] }), () => [footCol, 0]));
    } else {
      const len = Math.max(0.01, hp.y - legR * 1.2);
      // thigh: a fuller upper leg blending into the body
      const thigh = G.sphere(legR * 1.28, Math.min(hp.y * 0.42, legR * 2.2), legR * 1.32, 16, 12);
      G.xf(thigh, { p: [0, -Math.min(hp.y * 0.25, legR * 1.2), 0] });
      lb.add('skin', skin(thigh, () => [P.main, 0.8]));
      const g = G.capsule(legR, len, 12);
      G.xf(g, { p: [0, -hp.y + legR * 0.4, 0] });
      lb.add('skin', skin(g, (pp) => [lerpHex(P.main, footCol, sstep(-0.05, -hp.y * 0.8, pp.y)), 0.8]));
      const foot = G.sphere(legR * 1.2, legR * 0.62, legR * 1.45, 18, 12);
      G.xf(foot, { p: [0, -hp.y + legR * 0.55, legR * 0.35] });
      lb.add('skin', skin(foot, () => [footCol, 0]));
      if (sp.types.includes('primal') || sp.stage >= 2 || sp.types.includes('venom')) {
        for (let k = -1; k <= 1; k++) {
          const c = tipZ(G.cone(legR * 0.22, legR * 0.6, 6));
          G.xf(c, { r: [0.35, 0, 0], p: [k * legR * 0.55, -hp.y + legR * 0.3, legR * 1.55] });
          lb.add('gloss', G.paint(c, 0xfff6e8));
        }
      }
    }
    pivot.add(lb.build(mats));
    rig.add(pivot);
    legNames.push(pivot.name);
  });

  // ---------- arms
  const armNames = [];
  armPts.forEach((ap, i) => {
    const sx = Math.sign(ap.x);
    const pivot = new THREE.Group();
    pivot.name = 'arm' + i;
    pivot.position.copy(ap);
    const ab = new Bucket();
    const ar = (gn.body === 'floater' ? 0.05 : 0.055 * TH) * Math.sqrt(armScale);
    const len = (gn.body === 'floater' ? 0.08 : 0.12 * L) * armScale;
    const g = G.capsule(ar, len, 10);
    G.xf(g, { r: [0, 0, Math.PI + sx * 0.5] });
    ab.add('skin', skin(g, () => [P.main, 0.6]));
    const hand = G.sphere(ar * 1.3, ar * 1.15, ar * 1.25);
    const hx = sx * Math.sin(0.5) * (len + ar), hy = -Math.cos(0.5) * (len + ar * 1.7);
    G.xf(hand, { p: [hx, hy, 0.01] });
    ab.add('skin', skin(hand, () => [lerpHex(P.main, P.belly, 0.35), 0]));
    if (sp.stage >= 2 && gn.body !== 'floater') {
      for (let k = -1; k <= 1; k++) {
        const c = tipZ(G.cone(ar * 0.25, ar * 0.7, 6));
        G.xf(c, { r: [0.9, 0, 0], p: [hx + k * ar * 0.5, hy - ar * 0.4, ar * 0.9] });
        ab.add('gloss', G.paint(c, 0xfff6e8));
      }
    }
    pivot.add(ab.build(mats));
    rig.add(pivot);
    armNames.push(pivot.name);
  });

  // ---------- tail
  let hasTail = false;
  if (tailBase && gn.tail.type !== 'none') {
    hasTail = true;
    const pivot = new THREE.Group();
    pivot.name = 'tail';
    pivot.position.copy(tailBase);
    pivot.quaternion.copy(G.lookQuat(tailDir, V(0, 1, 0)));
    const tb = new Bucket();
    const ts = gn.tail.size;
    const t = gn.tail.type;
    const curve = (len, up) => [V(0, 0, 0), V(0, up * 0.3 * len, len * 0.45), V(0, up * len, len * 0.8), V(0, up * len * 1.35, len)];
    const tipAt = (pts) => pts[pts.length - 1];
    const striped = (pp) => [Math.sin(pp.z * 60) > 0.2 && sp.stage > 1 ? shade(P.main, -0.25) : P.main, 0];
    if (t === 'stub') tb.add('skin', skin(G.sphere(0.07 * ts), () => [P.main, 1]));
    else if (t === 'fluffy') {
      const pts = curve(0.18 * ts, 0.6);
      tb.add('skin', skin(G.taperTube(pts, 0.045, 0.04, 10, 10), () => [P.main, 1]));
      const tip = tipAt(pts);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        tb.add('skin', skin(spike(tip.clone().add(V(0, 0, -0.04)), V(Math.cos(a) * 0.6, Math.sin(a) * 0.6, 1), 0.16 * ts, 0.07 * ts), () => [lerpHex(P.main, P.belly, 0.5), 0]));
      }
      tb.add('skin', skin(G.xf(G.sphere(0.09 * ts, 0.1 * ts, 0.1 * ts), { p: tip.toArray() }), () => [P.main, 0]));
    } else if (t === 'long' || t === 'curly' || t === 'wisp' || t === 'cable') {
      const pts = t === 'curly' ? [V(0, 0, 0), V(0, 0.05, 0.15 * ts), V(0, 0.18 * ts, 0.25 * ts), V(0, 0.28 * ts, 0.18 * ts), V(0, 0.22 * ts, 0.1 * ts)] : curve(0.42 * ts, t === 'wisp' ? 0.2 : 0.5);
      const col = t === 'wisp' ? (P.wisp || P.second) : t === 'cable' ? 0x3a4250 : null;
      tb.add('skin', skin(G.taperTube(pts, 0.05 * Math.max(0.8, ts), t === 'cable' ? 0.03 : 0.012, 10, 20, t !== 'long'), col ? () => [col, 0] : striped));
      if (t === 'cable') tb.add('gloss', G.paint(G.xf(G.rbox(0.07, 0.05, 0.09, 0.015, 2), { p: tipAt(pts).toArray() }), P.accent));
      if (t === 'long') tb.add('skin', skin(spike(tipAt(pts), V(0, 0.4, 1), 0.12 * ts, 0.035, V(0, 1, 0)), () => [P.second, 0]));
    } else if (t === 'flame') {
      const pts = curve(0.22 * ts, 0.6);
      tb.add('skin', skin(G.taperTube(pts, 0.045, 0.03, 10, 10), striped));
      const f = G.flame(0.3 * ts, 0.1 * ts, 1, gn.palette.flame || [0xff4a1a, 0xffb02e, 0xffe46a]);
      G.xf(f, { r: [-0.6, 0, 0], p: tipAt(pts).toArray() });
      tb.add('gloss', f);
    } else if (t === 'leaf' || t === 'fin' || t === 'feather') {
      const pts = curve(0.14 * ts, 0.3);
      if (t !== 'feather') tb.add('skin', skin(G.taperTube(pts, 0.04, 0.03, 8, 8), () => [P.main, 1]));
      const n = t === 'feather' ? 5 : t === 'fin' ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const spread = n === 1 ? 0 : (k / (n - 1) - 0.5) * (t === 'fin' ? 1.2 : 1.1);
        const g = G.leaf((t === 'feather' ? 0.34 : 0.28) * ts, (t === 'fin' ? 0.15 : 0.11) * ts, t === 'fin' ? 0.12 : 0.2, 0.15);
        if (t === 'fin') G.xf(g, { r: [0, 0, Math.PI / 2] });
        G.xf(g, { r: [-0.25 + (t === 'fin' ? spread * 0.6 : 0), t === 'fin' ? 0 : spread, 0], p: (t === 'feather' ? V(0, 0, 0) : tipAt(pts)).toArray() });
        const col = t === 'leaf' ? mixHex(P.second, 0x4ac84a, 0.4) : k % 2 ? P.second : P.main;
        tb.add('skin', skin(g, () => [col, 0]));
      }
    } else if (t === 'club' || t === 'crystal' || t === 'stinger' || t === 'bolt') {
      const pts = t === 'stinger' ? [V(0, 0, 0), V(0, 0.1 * ts, 0.18 * ts), V(0, 0.28 * ts, 0.24 * ts), V(0, 0.4 * ts, 0.16 * ts)] : curve(0.28 * ts, 0.4);
      if (t !== 'bolt') tb.add('skin', skin(G.taperTube(pts, 0.05, t === 'stinger' ? 0.025 : 0.035, 10, 14), striped));
      const tip = tipAt(pts);
      if (t === 'club') {
        tb.add('skin', skin(G.xf(G.sphere(0.09 * ts), { p: tip.toArray() }), () => [P.second, 0]));
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          tb.add('gloss', G.paint(spike(tip, V(Math.cos(a), Math.sin(a), 0.3), 0.12 * ts, 0.03 * ts), P.accent));
        }
      } else if (t === 'crystal') {
        const c = G.crystal(0.05 * ts, 0.2 * ts);
        G.xf(c, { r: [0.6, 0, 0], p: tip.toArray() });
        tb.add('gloss', G.paint(c, (pp, nn) => lerpHex(P.accent, 0xffffff, 0.15 + 0.2 * Math.abs(nn.x))));
      } else if (t === 'stinger') {
        tb.add('gloss', G.paint(spike(tip, V(0, -0.3, 1), 0.14 * ts, 0.03 * ts, V(0, -1, 0)), P.accent));
      } else if (t === 'bolt') {
        const b = G.boltShape(0.42 * ts, 0.2 * ts, 0.05);
        G.xf(b, { r: [Math.PI / 2 - 0.4, 0, 0] });
        tb.add('gloss', G.paint(b, (pp) => lerpHex(P.main, P.second, pp.z * 2)));
      }
    }
    pivot.add(tb.build(mats));
    rig.add(pivot);
  }

  // ---------- wings
  const wingNames = [];
  if (gn.wings.type !== 'none' && wingPts.length) {
    const ws = gn.wings.size;
    wingPts.forEach((wp, i) => {
      const sx = Math.sign(wp.x) || (i ? 1 : -1);
      const pivot = new THREE.Group();
      pivot.name = 'wing' + i;
      pivot.position.copy(wp);
      const wb = new Bucket();
      if (gn.wings.type === 'feather') {
        for (let k = 0; k < 4; k++) {
          const g = G.leaf(0.38 * ws * (1 - k * 0.12), 0.1 * ws, 0.18, 0.05);
          G.xf(g, { r: [0, sx * (Math.PI / 2 + 0.25 + k * 0.32), 0.15], p: [0, -k * 0.012, -k * 0.03] });
          wb.add('skin', skin(g, () => [k === 0 ? P.second : lerpHex(P.main, P.second, k / 4), 0]));
        }
      } else if (gn.wings.type === 'bat') {
        // membrane in its own plane: mostly upright, swept back
        const s = new THREE.Shape();
        const w = 0.48 * ws, h = 0.34 * ws;
        s.moveTo(0, 0);
        s.lineTo(w * 0.3, h * 0.85);
        s.lineTo(w, h * 0.62);
        s.quadraticCurveTo(w * 0.82, h * 0.15, w * 0.7, -h * 0.2);
        s.quadraticCurveTo(w * 0.52, 0.02, w * 0.42, -h * 0.32);
        s.quadraticCurveTo(w * 0.26, -h * 0.02, w * 0.13, -h * 0.26);
        s.lineTo(0, 0);
        const plane = (g) => { G.xf(g, { s: [sx, 1, 1] }); G.xf(g, { r: [0.25, -sx * 0.75, sx * 0.15] }); return g; };
        const g = plane(new THREE.ExtrudeGeometry(s, { depth: 0.014, bevelEnabled: false }).translate(0, 0, -0.007));
        wb.add('membrane', G.paint(g, (pp) => lerpHex(P.second, shade(P.second, -0.18), Math.abs(pp.x) / w)));
        for (const tip of [[w * 0.3, h * 0.85], [w, h * 0.62], [w * 0.7, -h * 0.2], [w * 0.42, -h * 0.32]]) {
          const bone = plane(G.taperTube([V(0, 0, 0), V(tip[0] * 0.5, tip[1] * 0.55 + 0.01, 0), V(tip[0], tip[1], 0)], 0.016, 0.008, 6, 8, false));
          wb.add('skin', skin(bone, () => [dark, 0]));
        }
      } else if (gn.wings.type === 'insect') {
        for (let k = 0; k < 2; k++) {
          const g = G.leaf(0.32 * ws * (1 - k * 0.2), 0.1 * ws, 0.08, 0);
          G.xf(g, { r: [0.25, sx * (Math.PI / 2 + 0.55 + k * 0.5), 0], p: [0, 0.01, -k * 0.03] });
          wb.add('wing', g);
        }
      }
      pivot.add(wb.build(mats));
      rig.add(pivot);
      wingNames.push(pivot.name);
    });
  }

  // ---------- ink outlines
  addOutlines(rig, { width: 1.35 });

  // ---------- blob shadow
  const shadowR = Math.max(tr[0], tr[2]) * 1.6 + 0.08;
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(shadowR * 2, shadowR * 2), S.shadow);
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.012;
  sh.renderOrder = 1;
  sh.name = 'shadow';
  root.add(sh);

  const floats = gn.float || gn.body === 'floater' || gn.body === 'fish';
  const baseY = gn.body === 'floater' ? 0.22 : gn.body === 'fish' ? 0.18 : 0;
  rig.position.y = baseY;

  const bb = new THREE.Box3().setFromObject(rig);
  const height = bb.max.y;
  const scale = gn.scale * 0.95;
  root.scale.setScalar(scale);
  root.userData.height = height * scale;
  root.userData.radius = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * 0.5 * scale;
  root.userData.skinMat = skinMat;
  root.userData.anim = {
    legNames, armNames, eyeNames, wingNames, tail: hasTail, floats, baseY,
    body: gn.body, flyer: gn.wings.type !== 'none' && (gn.body === 'avian' || sp.types.includes('flying')),
  };
  return root;
}

// ---------------------------------------------------------------- animation
export function animateBeast(obj, t, dt, mode = 'idle', speed = 1) {
  const a = obj.userData.anim;
  if (!a || !a.rig) return;
  const ph = a.phase;
  const walk = mode === 'walk' ? 1 : 0;
  const rig = a.rig;
  const breathe = Math.sin(t * 2.4 + ph);
  let y = a.baseY;
  if (a.floats) y += 0.06 * Math.sin(t * 1.8 + ph) + 0.04;
  else if (walk) y += Math.abs(Math.sin(t * 9 * speed + ph)) * 0.035;
  if (a.flyer && a.body === 'avian' && walk) y += 0.04;
  rig.position.y = y;
  rig.scale.set(1 + 0.012 * breathe, 1 - 0.016 * breathe, 1 + 0.012 * breathe);
  const sw = Math.sin(t * 9 * speed + ph);
  a.legs.forEach((l, i) => {
    if (!l) return;
    const opp = (a.body === 'quad' ? (i === 0 || i === 3) : i % 2 === 0) ? 1 : -1;
    if (a.body === 'bug') { l.rotation.y = walk * 0.35 * Math.sin(t * 14 + i * 2.1); l.rotation.z = walk * 0.15 * Math.sin(t * 14 + i * 2.1 + 1); }
    else l.rotation.x = walk * 0.65 * sw * opp;
  });
  a.arms.forEach((ar, i) => { if (ar) ar.rotation.x = (walk ? -0.5 * sw * (i % 2 ? 1 : -1) : 0.12 * Math.sin(t * 2.2 + ph + i)); });
  if (a.tail) a.tail.rotation.y = Math.sin(t * (walk ? 7 : 2.6) + ph) * (walk ? 0.4 : 0.3);
  a.wings.forEach((w, i) => {
    if (!w) return;
    const s = i === 0 ? 1 : -1;
    const amp = a.flyer ? (walk ? 0.7 : 0.35) : 0.12;
    const f = a.flyer ? (walk ? 12 : 5) : 2;
    w.rotation.z = s * Math.sin(t * f + ph) * amp;
  });
  a.nextBlink -= dt;
  if (a.nextBlink <= 0) { a.blinkT = 0.13; a.nextBlink = 2 + Math.random() * 3.5; }
  if (a.blinkT > 0) a.blinkT -= dt;
  const sy = a.blinkT > 0 ? 0.12 : 1;
  for (const e of a.eyes) if (e) e.scale.y = sy;
}

export function setFlash(obj, v) {
  const m = obj.userData.skinMat;
  if (m && m.userData.uniforms) m.userData.uniforms.uFlash.value = v;
}
