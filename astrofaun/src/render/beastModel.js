// Beast models sculpted and rigged in Blender (tools/beastgen), loaded as compressed GLB.
// The mesh carries colour-zone masks and baked occlusion; this module paints them with the
// species palette (glossy cel shading + pattern), adds skinned ink outlines, mounts the eyes on the
// exported sockets and animates the skeleton procedurally.
import { THREE } from './renderer.js';
import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import { MeshoptDecoder } from '../../vendor/meshopt_decoder.module.js';
import * as SkeletonUtils from '../../vendor/SkeletonUtils.js';
import * as G from './geom.js';
import { toonify, TOON } from './toon.js';
import { species } from '../data/beasts.js';
import { shade, hexToHsl, hslToHex, mixHex, clamp } from '../core/util.js';

const BASE = new URL('../../assets/beasts/', import.meta.url).href;
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();

/** Loads (once) and prepares the template for a species. */
export function loadBeast(spId) {
  if (!cache.has(spId)) {
    cache.set(spId, loader.loadAsync(BASE + spId + '.glb').then((gltf) => prepare(gltf, spId)).catch((e) => {
      console.warn('beast model failed', spId, e);
      cache.delete(spId);
      throw e;
    }));
  }
  return cache.get(spId);
}

export function preloadBeasts(ids) { return Promise.all([...new Set(ids)].map((id) => loadBeast(id).catch(() => null))); }

function prepare(gltf, spId) {
  const scene = gltf.scene;
  let mesh = null, rig = null;
  scene.traverse((o) => {
    if (o.isSkinnedMesh) mesh = o;
    if (o.name === 'rig') rig = o;
  });
  const g = mesh.geometry;
  // Friendlier attribute names (GLSL dislikes leading underscores) and rest-pose positions for patterns
  g.setAttribute('aMask', g.getAttribute('_mask'));
  g.setAttribute('aMask2', g.getAttribute('_mask2'));
  g.deleteAttribute('_mask');
  g.deleteAttribute('_mask2');
  scene.updateMatrixWorld(true);
  mesh.skeleton.update();
  const pos = g.getAttribute('position');
  const rest = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    mesh.applyBoneTransform(i, v);
    rest[i * 3] = v.x; rest[i * 3 + 1] = v.y; rest[i * 3 + 2] = v.z;
  }
  g.setAttribute('aRest', new THREE.BufferAttribute(rest, 3));
  g.computeBoundingSphere();
  const meta = { ...(rig?.userData || {}) };
  return { scene, meta, spId };
}

// ---------------------------------------------------------------- palette and materials
function paletteFor(gn, variant) {
  const P = { ...gn.palette };
  if (variant) {
    const rot = (hex, d, ds = 0.05) => { const [h, s, l] = hexToHsl(hex); return hslToHex(h + d, clamp(s + ds, 0, 1), l); };
    P.main = rot(P.main, 0.42);
    P.second = rot(P.second, 0.42);
    P.accent = rot(P.accent, 0.3);
    P.horn = rot(P.horn, 0.3);
  }
  return P;
}

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

// Zone colouring shared by the skin and outline shaders
const ZONES = /* glsl */`
uniform vec3 uMain, uSecond, uBelly, uAccent, uDark, uTooth, uTongue, uEmit, uPatColor;
uniform float uPatScale, uHeight;
uniform int uPatType;
vec3 zoneColor(vec4 m1, vec4 m2, vec3 p) {
  vec3 c = uMain;
  float plain = clamp(m1.z + m1.w + m2.x + m2.y + m2.z, 0.0, 1.0);
  float pm = 0.0;
  vec3 q = p * uPatScale;
  if (uPatType == 1) pm = 1.0 - smoothstep(0.27, 0.31, bvor(q));
  else if (uPatType == 2) pm = smoothstep(0.12, 0.2, sin((p.z * 1.3 + p.y * 0.35) * uPatScale * 2.4 + bvn(q * 0.7) * 3.0));
  else if (uPatType == 3) pm = smoothstep(0.55, 0.58, bvn(q * 0.5 + 3.1));
  else if (uPatType == 4) pm = smoothstep(0.45, 0.85, p.y / max(uHeight, 0.01)) * 0.85;
  else if (uPatType == 5) pm = smoothstep(-0.12, 0.12, sin(p.z * uPatScale * 5.0));
  c = mix(c, uPatColor, pm * (1.0 - plain) * (1.0 - m1.y * 0.8) * (1.0 - m1.x * 0.6));
  c = mix(c, uSecond, m1.x);
  c = mix(c, uBelly, m1.y * (1.0 - m1.x));
  c = mix(c, uAccent, m1.z);
  c = mix(c, uDark, m1.w);
  c = mix(c, uTooth, m2.x);
  c = mix(c, uTongue, m2.y);
  c = mix(c, uEmit, m2.z);
  return c;
}
`;

const PAT_IDS = { none: 0, spots: 1, stripes: 2, patches: 3, gradient: 4, rings: 5 };

function zoneUniforms(gn, P, height) {
  const C = (hex) => new THREE.Color(hex);
  const flame = gn.palette.flame || null;
  const emit = flame ? flame[1] : shade(P.second, 0.12, 0.1);
  return {
    uMain: { value: C(P.main) },
    uSecond: { value: C(P.second) },
    uBelly: { value: C(P.belly) },
    uAccent: { value: C(P.horn ?? P.accent) },
    uDark: { value: C(mixHex(0x3a0a1a, shade(P.main, -0.4), 0.25)) },
    uTooth: { value: C(0xfff6e2) },
    uTongue: { value: C(0xff6a8a) },
    uEmit: { value: C(emit) },
    uPatColor: { value: C(gn.pattern.color) },
    uPatScale: { value: gn.pattern.scale * 1.15 },
    uPatType: { value: PAT_IDS[gn.pattern.type] || 0 },
    uHeight: { value: height },
    uFlash: { value: 0 },
  };
}

function skinMaterial(uniforms, metal) {
  const m = new THREE.MeshPhysicalMaterial({
    roughness: metal ? 0.26 : 0.36, metalness: metal ? 0.25 : 0, clearcoat: 1, clearcoatRoughness: metal ? 0.06 : 0.12,
  });
  m.userData.uniforms = uniforms;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aMask;\nattribute vec4 aMask2;\nattribute vec3 aRest;\nvarying vec4 vM1;\nvarying vec4 vM2;\nvarying vec3 vRest;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvM1 = aMask;\nvM2 = aMask2;\nvRest = aRest;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vM1;\nvarying vec4 vM2;\nvarying vec3 vRest;\nuniform float uFlash;\n' + NOISE + ZONES)
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb = zoneColor(vM1, vM2, vRest);
        float ao = mix(1.0, vM2.w, 0.9);
        diffuseColor.rgb *= ao;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.97, 0.94), uFlash);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.16, clamp(vM1.z + vM2.x, 0.0, 1.0));
        roughnessFactor = mix(roughnessFactor, 0.6, vM1.w);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += uEmit * vM2.z * 0.5;`)
      .replace('#include <clearcoat_normal_fragment_begin>', `#include <clearcoat_normal_fragment_begin>`)
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
        reflectedLight.indirectSpecular *= ao;
        reflectedLight.directSpecular *= mix(1.0, ao, 0.7);`);
  };
  m.customProgramCacheKey = () => 'beast-glb-v1';
  return toonify(m, 'toon');
}

const outlineVert = /* glsl */`
uniform float uOutline;
uniform float uWidth;
attribute vec4 aMask;
attribute vec4 aMask2;
attribute vec3 aRest;
varying vec3 vCol;
#include <common>
#include <skinning_pars_vertex>
${NOISE}
${ZONES}
void main() {
  vCol = zoneColor(aMask, aMask2, aRest);
  #include <skinbase_vertex>
  #include <begin_vertex>
  #include <beginnormal_vertex>
  #include <skinnormal_vertex>
  #include <skinning_vertex>
  vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
  vec3 n = normalize(normalMatrix * objectNormal);
  mv.xyz += n * uOutline * uWidth;
  gl_Position = projectionMatrix * mv;
}`;
const outlineFrag = /* glsl */`
uniform vec3 uInk;
varying vec3 vCol;
void main() {
  float l = max(max(vCol.r, vCol.g), vCol.b);
  vec3 hue = vCol / max(l, 0.001);
  gl_FragColor = vec4(hue * 0.03 + uInk * 0.6, 1.0);
  #include <colorspace_fragment>
}`;

function outlineMaterial(uniforms, width) {
  return new THREE.ShaderMaterial({
    vertexShader: outlineVert,
    fragmentShader: outlineFrag,
    side: THREE.BackSide,
    uniforms: { ...uniforms, uOutline: TOON.outline, uWidth: { value: width }, uInk: { value: new THREE.Color(0x140e24) } },
  });
}

// ---------------------------------------------------------------- eyes (built in model space on the sockets)
let SH = null;
function sharedMats() {
  if (SH) return SH;
  const mk = (o) => { const m = new THREE.MeshPhysicalMaterial(o); m.userData.shared = true; return toonify(m); };
  SH = {
    gloss: mk({ vertexColors: true, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03 }),
    hi: Object.assign(new THREE.MeshBasicMaterial({ color: 0xffffff }), { userData: { shared: true } }),
    shadow: (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(10,6,30,0.4)');
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
  return SH;
}

function buildEye(E, re, side, lidColor) {
  const S = sharedMats();
  const gloss = [], hi = [], lid = [];
  const tilt = -side * E.tilt;
  const sclera = G.sphere(re, re * 1.08, re * 0.62, 26, 18);
  G.xf(sclera, { r: [0, 0, tilt], p: [0, 0, -re * 0.12] });
  gloss.push(G.paint(sclera, E.sclera));
  if (E.look === 'cute') {
    gloss.push(G.paint(G.xf(G.sphere(re * 0.66, re * 0.72, re * 0.3, 20, 14), { p: [0, -re * 0.05, re * 0.36] }), E.iris));
    gloss.push(G.paint(G.xf(G.sphere(re * 0.38, re * 0.42, re * 0.2, 16, 12), { p: [0, -re * 0.05, re * 0.46] }), 0x05050a));
    hi.push(G.xf(G.sphere(re * 0.2, re * 0.2, re * 0.1, 12, 8), { p: [-re * 0.24, re * 0.24, re * 0.54] }));
    hi.push(G.xf(G.sphere(re * 0.09, re * 0.09, re * 0.05, 10, 6), { p: [re * 0.22, -re * 0.26, re * 0.5] }));
  } else {
    const lx = side * -0.06 * re, ly = -0.03 * re;
    if (E.look === 'iris') gloss.push(G.paint(G.xf(G.sphere(re * 0.52, re * 0.56, re * 0.25, 20, 14), { p: [lx, ly, re * 0.38] }), E.iris));
    if (E.pupil === 'slit') gloss.push(G.paint(G.xf(G.sphere(re * 0.1, re * 0.5, re * 0.12, 12, 12), { p: [lx, ly, re * 0.45] }), 0x0a0508));
    else if (E.pupil === 'dot') gloss.push(G.paint(G.xf(G.sphere(re * 0.2, re * 0.22, re * 0.12, 14, 10), { p: [lx, ly, re * 0.46] }), 0x0a0508));
    else if (E.pupil === 'round') gloss.push(G.paint(G.xf(G.sphere(re * 0.27, re * 0.3, re * 0.14, 14, 10), { p: [lx, ly, re * 0.46] }), 0x0a0508));
    hi.push(G.xf(G.sphere(re * 0.14, re * 0.14, re * 0.08, 10, 8), { p: [-re * 0.28, re * 0.3, re * 0.5] }));
  }
  if (E.lid !== 'none') {
    const l = G.sphere(re * 1.14, re * 0.62, re * 0.76, 22, 12);
    const cfg = {
      smug: { y: 0.52, r: side * 0.06 }, sleepy: { y: 0.36, r: side * 0.04 },
      angry: { y: 0.6, r: side * 0.5, x: -side * 0.12 }, sad: { y: 0.62, r: -side * 0.42, x: side * 0.1 },
    }[E.lid] || { y: 0.55, r: 0 };
    G.xf(l, { r: [0, 0, cfg.r], p: [(cfg.x || 0) * re, cfg.y * re, -re * 0.04] });
    lid.push(G.paint(l, lidColor));
  }
  const grp = new THREE.Group();
  const add = (list, mat, outline) => {
    if (!list.length) return;
    const m = new THREE.Mesh(G.merge(list), mat);
    m.castShadow = false;
    if (outline) m.userData.outline = true;
    grp.add(m);
  };
  add(gloss, S.gloss, true);
  add(hi, S.hi, false);
  add(lid, S.gloss, true);
  return grp;
}

// ---------------------------------------------------------------- instances
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();

/** Returns a group immediately; the model attaches when its GLB has loaded (obj.userData.ready). */
export function makeBeast(spId, variant = false, opts = {}) {
  const sp = species(spId);
  const gn = sp.genome;
  const root = new THREE.Group();
  root.name = 'beast';
  const target = 0.8 * gn.scale;
  root.userData.height = target;
  root.userData.radius = target * 0.5;
  root.userData.spId = spId;
  root.userData.anim = null;
  root.userData.ready = loadBeast(spId).then((tpl) => { attach(root, tpl, sp, variant, opts); return root; }).catch(() => root);
  return root;
}

function attach(root, tpl, sp, variant, opts) {
  const gn = sp.genome;
  const meta = tpl.meta;
  const model = SkeletonUtils.clone(tpl.scene);
  let mesh = null;
  const bones = {};
  const sockets = {};
  model.traverse((o) => {
    if (o.isSkinnedMesh) mesh = o;
    if (o.isBone) bones[o.name] = o;
    else if (/^(eye_|tail_tip|wing_)/.test(o.name) && !o.isMesh) sockets[o.name] = o;
  });
  const P = paletteFor(gn, variant);
  const uniforms = zoneUniforms(gn, P, meta.height || 1);
  const mat = skinMaterial(uniforms, gn.metal || sp.types.includes('tech'));
  mesh.material = mat;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const ol = new THREE.SkinnedMesh(mesh.geometry, outlineMaterial(uniforms, opts.outlineWidth ?? 1.3));
  ol.bind(mesh.skeleton, mesh.bindMatrix);
  ol.frustumCulled = false;
  ol.castShadow = false;
  mesh.add(ol);
  // Eyes: oriented in model space, then re-expressed in each socket's frame
  model.updateMatrixWorld(true);
  const lidColor = shade(P.main, -0.08);
  const eyes = [];
  for (const [name, s] of Object.entries(sockets)) {
    if (!name.startsWith('eye_')) continue;
    const ex = s.userData;
    const n = _v.set(ex.nx, ex.ny, ex.nz).normalize();
    const side = Math.abs(n.x) < 0.15 ? 1 : Math.sign(n.x);
    const eye = buildEye(gn.eyes, ex.radius, side, lidColor);
    _q.copy(G.lookQuat(n));
    s.getWorldQuaternion(_q2);
    eye.quaternion.copy(_q2.invert().multiply(_q));
    const ws = s.getWorldScale(new THREE.Vector3()).x || 1;
    eye.scale.setScalar(1 / ws);
    s.add(eye);
    eyes.push(eye);
    eye.traverse((o) => {
      if (o.isMesh && o.userData.outline) {
        const h = new THREE.Mesh(o.geometry, eyeOutline());
        h.userData.isOutlineMesh = true;
        o.add(h);
      }
    });
  }
  for (const b of Object.values(bones)) b.userData.rest = b.quaternion.clone();
  // Normalise size: stage scale drives the final height of the body (ignoring tall ear tips)
  const size = Math.max(meta.height || 1, (meta.depth || 1) * 0.72);
  const s = (0.95 * gn.scale) / size;
  model.scale.setScalar(s);
  const kind = meta.kind || sp.body;
  const floats = gn.float || kind === 'floater' || kind === 'fish';
  const baseY = floats ? 0.16 * gn.scale : 0;
  model.position.y = baseY;
  root.add(model);
  const S = sharedMats();
  const shR = Math.max(meta.width || 0.6, (meta.depth || 1) * 0.7) * s * 0.75;
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(shR * 2, shR * 2), S.shadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  shadow.renderOrder = 1;
  shadow.name = 'shadow';
  root.add(shadow);
  root.userData.height = (meta.height || 1) * s + baseY;
  root.userData.radius = Math.max(meta.width || 0.6, (meta.depth || 1) * 0.8) * 0.5 * s;
  root.userData.skinMat = mat;
  root.userData.model = model;
  root.userData.anim = {
    kind, bones, eyes, model, baseY, floats, phase: Math.random() * 10, blinkT: 0, nextBlink: 1 + Math.random() * 3,
    flyer: gn.wings.type !== 'none' && (kind === 'avian' || sp.types.includes('flying')), jawOpen: meta.mouth_open || 0,
    legs: Object.keys(bones).filter((n) => /^leg_[LR]\d_0$/.test(n)).sort(),
    tail: [0, 1, 2, 3].map((i) => bones['tail' + i]).filter(Boolean),
    spine: Object.keys(bones).filter((n) => /^spine\d+$/.test(n)).sort((a, b) => +a.slice(5) - +b.slice(5)).map((n) => bones[n]),
  };
}

let EYE_OL = null;
function eyeOutline() {
  if (!EYE_OL) {
    EYE_OL = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { uOutline: TOON.outline },
      vertexShader: 'uniform float uOutline;\nvoid main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); mv.xyz += normalize(normalMatrix * normal) * uOutline * 1.1; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'void main(){ gl_FragColor = vec4(0.06, 0.04, 0.1, 1.0); }',
    });
  }
  return EYE_OL;
}

// ---------------------------------------------------------------- animation
function pose(b, x = 0, y = 0, z = 0) {
  if (!b) return;
  _e.set(x, y, z);
  b.quaternion.copy(b.userData.rest).multiply(_q.setFromEuler(_e));
}

/** mode: idle | walk | attack | hurt | cast. Safe to call before the model has loaded. */
export function animateBeast(obj, t, dt, mode = 'idle', speed = 1) {
  const a = obj.userData.anim;
  if (!a) return;
  const B = a.bones;
  const ph = a.phase;
  const walk = mode === 'walk' ? 1 : 0;
  const w = t * 9 * speed + ph;
  const sw = Math.sin(w);
  const breathe = Math.sin(t * 2.2 + ph);
  let y = a.baseY;
  if (a.floats) y += 0.05 * Math.sin(t * 1.7 + ph) + 0.03;
  else if (walk) y += Math.abs(Math.sin(w)) * 0.03;
  a.model.position.y = y;
  // Spine: breathing and a gentle sway
  a.spine.forEach((b, i) => pose(b, 0.025 * breathe * (i ? 1 : -0.5), 0, (walk ? 0.05 : 0.02) * Math.sin(w * 0.5 + i)));
  pose(B.neck, -0.03 * breathe, 0.12 * Math.sin(t * 0.7 + ph) * (1 - walk), 0);
  const look = mode === 'attack' ? -0.25 : mode === 'hurt' ? 0.3 : 0;
  pose(B.head, 0.04 * Math.sin(t * 1.3 + ph) + look, 0.18 * Math.sin(t * 0.5 + ph * 1.3) * (1 - walk), 0.05 * Math.sin(t * 0.9 + ph));
  const jaw = mode === 'attack' ? 0.55 : mode === 'cast' ? 0.3 : 0.06 + 0.05 * Math.max(0, breathe);
  pose(B.jaw, jaw, 0, 0);
  // Legs: diagonal pairs for quadrupeds, alternating for bipeds, tripod gait for bugs
  for (const name of a.legs) {
    const side = name[4] === 'L' ? 1 : -1;
    const idx = +name[5];
    let phase = side * (idx % 2 ? -1 : 1);
    if (a.kind === 'bug') phase = (idx % 2 ? -1 : 1) * side;
    const s = Math.sin(w + (phase > 0 ? 0 : Math.PI));
    pose(B[name], walk * 0.55 * s, 0, 0);
    const lower = B[name.slice(0, -1) + '1'];
    pose(lower, walk * Math.max(0, -s) * (idx === 0 && a.kind === 'quad' ? -0.6 : 0.6), 0, 0);
  }
  for (const side of ['L', 'R']) {
    const sgn = side === 'L' ? 1 : -1;
    const arm = B['arm_' + side + '_0'];
    if (arm) pose(arm, walk ? -0.5 * sw * sgn : 0.1 * Math.sin(t * 2 + ph + sgn), 0, mode === 'attack' ? -0.6 * sgn : 0);
    const fore = B['arm_' + side + '_1'];
    if (fore) pose(fore, -0.15 - 0.1 * breathe, 0, 0);
    pose(B['ear_' + side], 0.05 * Math.sin(t * 3 + ph + sgn), 0, (Math.sin(t * 0.8 + ph * 2 + sgn) > 0.96 ? 0.35 : 0) * sgn);
    const wing0 = B['wing_' + side + '0'];
    if (wing0) {
      const amp = a.flyer ? (walk ? 0.75 : 0.4) : 0.12;
      const f = a.flyer ? (walk ? 11 : 5) : 2;
      const flap = Math.sin(t * f + ph);
      pose(wing0, 0, 0, flap * amp * sgn);
      pose(B['wing_' + side + '1'], 0, 0, flap * amp * 0.6 * sgn);
    }
  }
  // Tail: travelling wave down the chain
  a.tail.forEach((b, i) => pose(b, 0.06 * Math.sin(t * 2 + ph - i * 0.7), 0, (walk ? 0.28 : 0.18) * Math.sin(t * (walk ? 6 : 2.4) + ph - i * 0.8)));
  // Blink
  a.nextBlink -= dt;
  if (a.nextBlink <= 0) { a.blinkT = 0.13; a.nextBlink = 2 + Math.random() * 3.5; }
  if (a.blinkT > 0) a.blinkT -= dt;
  const sy = a.blinkT > 0 ? 0.12 : 1;
  for (const e of a.eyes) e.scale.y = sy * e.scale.x;
}

export function setFlash(obj, v) {
  const m = obj.userData.skinMat;
  if (m && m.userData.uniforms) m.userData.uniforms.uFlash.value = v;
}
