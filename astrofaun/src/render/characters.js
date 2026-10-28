// Chibi characters: Rangers in space suits (player and NPCs) and Grimeworks goons in hazmat gear.
import { THREE } from './renderer.js';
import * as G from './geom.js';
import { toonify, addOutlines } from './toon.js';
import { shade, mixHex } from '../core/util.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

let MATS = null;
function mats() {
  if (MATS) return MATS;
  const mk = (o, phys) => { const m = phys ? new THREE.MeshPhysicalMaterial(o) : new THREE.MeshStandardMaterial(o); m.userData.shared = true; return toonify(m); };
  MATS = {
    matte: mk({ vertexColors: true, roughness: 0.62 }),
    gloss: mk({ vertexColors: true, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.06 }, true),
    hi: (() => { const m = new THREE.MeshBasicMaterial({ color: 0xffffff }); m.userData.shared = true; return m; })(),
  };
  return MATS;
}

class Parts {
  constructor() { this.matte = []; this.gloss = []; this.hi = []; }
  build() {
    const g = new THREE.Group();
    const M = mats();
    for (const k of ['matte', 'gloss', 'hi']) {
      if (!this[k].length) continue;
      const mesh = new THREE.Mesh(G.merge(this[k]), M[k]);
      mesh.castShadow = k !== 'hi';
      if (k === 'hi') mesh.userData.noOutline = true;
      g.add(mesh);
    }
    return g;
  }
}

const cache = new Map();

/** look: { suit, accent, skin, hair, hairStyle?, goon?, boss? } */
export function makeCharacter(look, key = null) {
  const k = key || JSON.stringify(look);
  if (!cache.has(k)) cache.set(k, build(look));
  const tpl = cache.get(k);
  const obj = tpl.clone(true);
  obj.userData.anim = {
    rig: obj.getObjectByName('rig'),
    legs: [obj.getObjectByName('legL'), obj.getObjectByName('legR')],
    arms: [obj.getObjectByName('armL'), obj.getObjectByName('armR')],
    head: obj.getObjectByName('head'),
    phase: Math.random() * 10,
  };
  obj.userData.height = 1.25 * (look.boss ? 1.25 : 1);
  return obj;
}

function build(look) {
  const suit = look.suit ?? 0x3a7aff;
  const accent = look.accent ?? 0xffd23c;
  const skin = look.skin ?? 0xe0a878;
  const hair = look.hair ?? 0x5a3a2a;
  const goon = !!look.goon;
  const dark = goon ? 0x3a3a2a : shade(suit, -0.3, 0.05);
  const boot = goon ? 0x2a2a22 : 0xd83a3a;
  const root = new THREE.Group();
  const rig = new THREE.Group();
  rig.name = 'rig';
  root.add(rig);

  // ---- torso
  const body = new Parts();
  body.matte.push(G.paint(G.xf(G.sphere(0.2, 0.2, 0.16, 20, 14), { p: [0, 0.48, 0] }), suit));
  body.matte.push(G.paint(G.xf(G.sphere(0.17, 0.1, 0.14, 16, 10), { p: [0, 0.34, 0] }), dark));
  body.gloss.push(G.paint(G.xf(G.cyl(0.16, 0.175, 0.05, 18), { p: [0, 0.36, 0] }), goon ? 0x6a5a3a : 0x2a2a3a));
  body.gloss.push(G.paint(G.xf(G.sphere(0.045, 0.045, 0.02), { p: [0, 0.39, 0.16] }), accent));
  // chest plate + emblem
  body.gloss.push(G.paint(G.xf(G.sphere(0.13, 0.11, 0.06), { p: [0, 0.52, 0.11] }), goon ? 0x8a8a5a : 0xf0f4fa));
  body.gloss.push(G.paint(G.xf(G.sphere(0.04, 0.04, 0.02), { p: [0, 0.53, 0.17] }), goon ? 0x9ae03a : accent));
  // shoulder pads
  for (const sx of [-1, 1]) body.gloss.push(G.paint(G.xf(G.sphere(0.09, 0.07, 0.09), { p: [sx * 0.19, 0.6, 0] }), goon ? 0x6a6a4a : accent === 0xffffff ? suit : dark));
  // backpack
  body.gloss.push(G.paint(G.xf(G.rbox(0.24, 0.24, 0.12, 0.04, 2), { p: [0, 0.38, -0.17] }), goon ? 0x5a5a3a : 0xc8d0dc));
  if (goon) body.gloss.push(G.paint(G.xf(G.cyl(0.05, 0.05, 0.26, 10), { r: [0, 0, 0], p: [0.08, 0.36, -0.24] }), 0x9ae03a));
  rig.add(body.build());

  // ---- head
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 0.86, 0.01);
  const hp = new Parts();
  const hr = 0.25;
  hp.matte.push(G.paint(G.sphere(hr, hr * 0.96, hr * 0.92, 28, 22), goon ? 0x5a5a40 : skin));
  if (goon) {
    // gas mask hood
    hp.gloss.push(G.paint(G.xf(G.sphere(hr * 1.06, hr * 1.02, hr * 0.98, 24, 18), { p: [0, 0.01, -0.01] }), 0x7a7a50));
    for (const sx of [-1, 1]) {
      hp.gloss.push(G.paint(G.xf(G.cyl(0.065, 0.07, 0.04, 16), { r: [Math.PI / 2, 0, 0], p: [sx * 0.09, 0.03, hr * 0.84] }), 0x2a2a20));
      hp.gloss.push(G.paint(G.xf(G.sphere(0.055, 0.055, 0.02), { p: [sx * 0.09, 0.03, hr * 0.84 + 0.045] }), 0x9ae03a));
    }
    hp.gloss.push(G.paint(G.xf(G.cyl(0.06, 0.07, 0.09, 14), { r: [Math.PI / 2 + 0.3, 0, 0], p: [0, -0.1, hr * 0.84] }), 0x3a3a2a));
  } else {
    // face
    for (const sx of [-1, 1]) {
      hp.gloss.push(G.paint(G.xf(G.sphere(0.055, 0.07, 0.03, 16, 12), { p: [sx * 0.085, 0.02, hr * 0.88] }), 0xffffff));
      hp.gloss.push(G.paint(G.xf(G.sphere(0.032, 0.045, 0.02, 12, 10), { p: [sx * 0.08, 0.01, hr * 0.9 + 0.015] }), 0x2a1a14));
      hp.hi.push(G.paint(G.xf(G.sphere(0.012), { p: [sx * 0.08 - 0.012, 0.035, hr * 0.93 + 0.02] }), 0xffffff));
      const brow = G.sphere(0.06, 0.016, 0.02, 10, 6);
      G.xf(brow, { r: [0, 0, -sx * 0.18], p: [sx * 0.09, 0.105, hr * 0.86] });
      hp.matte.push(G.paint(brow, shade(hair, -0.1)));
    }
    const smile = G.torusArc(0.05, 0.011, Math.PI * 0.8, 12);
    G.xf(smile, { r: [0, 0, Math.PI + 0.3], p: [0.01, -0.085, hr * 0.9] });
    hp.matte.push(G.paint(smile, 0x5a2a20));
    hp.matte.push(G.paint(G.xf(G.sphere(0.025, 0.02, 0.025), { p: [0, -0.03, hr * 0.94] }), shade(skin, -0.06)));
    // hair
    const style = look.hairStyle || 'spiky';
    hp.matte.push(G.paint(G.xf(G.sphere(hr * 1.04, hr * 0.62, hr * 1.0, 24, 14), { p: [0, hr * 0.42, -0.02] }), hair));
    if (style === 'spiky') {
      const tufts = [[0, 0.95, 0.4, 0.15], [-0.4, 0.75, 0.3, 0.12], [0.4, 0.75, 0.3, 0.12], [0, 0.6, -0.7, 0.14], [-0.5, 0.45, -0.4, 0.11], [0.5, 0.45, -0.4, 0.11]];
      for (const [x, y, z, l] of tufts) {
        const base = V(x * hr * 0.7, y * hr, z * hr * 0.7);
        const dir = V(x, 0.8, z - 0.2).normalize();
        hp.matte.push(G.paint(G.taperTube([base, base.clone().addScaledVector(dir, l * 0.6), base.clone().addScaledVector(dir, l).add(V(0, 0, -0.05))], 0.075, 0.01, 7, 6, false), hair));
      }
      hp.matte.push(G.paint(G.taperTube([V(0.02, hr * 0.85, hr * 0.5), V(0.05, hr * 0.7, hr * 0.85), V(0.12, hr * 0.45, hr * 1.0)], 0.06, 0.01, 7, 6, false), hair));
    } else {
      // bob with fringe + ponytail
      hp.matte.push(G.paint(G.xf(G.sphere(hr * 1.1, hr * 0.85, hr * 1.06, 24, 16), { p: [0, hr * 0.12, -0.03] }), hair));
      hp.matte.push(G.paint(G.xf(G.sphere(hr * 0.8, hr * 0.28, hr * 0.4, 16, 10), { r: [0.2, 0, 0.15], p: [0.03, hr * 0.62, hr * 0.62] }), hair));
      hp.matte.push(G.paint(G.taperTube([V(0, hr * 0.5, -hr * 0.9), V(0, hr * 0.1, -hr * 1.25), V(0, -hr * 0.5, -hr * 1.1)], 0.08, 0.03, 8, 8), hair));
    }
  }
  head.add(hp.build());
  rig.add(head);

  // ---- limbs
  const limb = (name, pos, len, r, col, endCol, endR, isLeg) => {
    const piv = new THREE.Group();
    piv.name = name;
    piv.position.copy(pos);
    const p = new Parts();
    p.matte.push(G.paint(G.xf(G.capsule(r, len, 10), { p: [0, -len - r * 2 + r * 0.6, 0] }), col));
    if (isLeg) {
      const b = G.rbox(r * 2.6, r * 2.2, r * 3.6, r * 0.8, 2);
      G.xf(b, { p: [0, -len - r * 2.2, r * 0.6] });
      p.gloss.push(G.paint(b, endCol));
    } else p.gloss.push(G.paint(G.xf(G.sphere(endR, endR, endR), { p: [0, -len - r * 1.6, 0] }), endCol));
    piv.add(p.build());
    return piv;
  };
  rig.add(limb('legL', V(-0.09, 0.3, 0), 0.14, 0.07, dark, boot, 0, true));
  rig.add(limb('legR', V(0.09, 0.3, 0), 0.14, 0.07, dark, boot, 0, true));
  const armL = limb('armL', V(-0.24, 0.6, 0), 0.16, 0.055, suit, goon ? 0x3a3a2a : 0xf0f4fa, 0.07, false);
  const armR = limb('armR', V(0.24, 0.6, 0), 0.16, 0.055, suit, goon ? 0x3a3a2a : 0xf0f4fa, 0.07, false);
  armL.rotation.z = -0.18; armR.rotation.z = 0.18;
  rig.add(armL, armR);

  addOutlines(rig, { width: 1.2 });
  if (look.boss) root.scale.setScalar(1.28);

  // soft contact shadow
  const sh = new THREE.Mesh(new THREE.CircleGeometry(0.32, 20), new THREE.MeshBasicMaterial({ color: 0x0a0618, transparent: true, opacity: 0.25, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.012;
  root.add(sh);
  return root;
}

export function animateCharacter(obj, t, mode = 'idle') {
  const a = obj.userData.anim;
  if (!a) return;
  const walk = mode === 'walk' ? 1 : 0;
  const ph = a.phase;
  const s = Math.sin(t * 11 + ph);
  a.legs[0].rotation.x = walk * 0.7 * s;
  a.legs[1].rotation.x = -walk * 0.7 * s;
  a.arms[0].rotation.x = -walk * 0.6 * s + (walk ? 0 : 0.05 * Math.sin(t * 2 + ph));
  a.arms[1].rotation.x = walk * 0.6 * s + (walk ? 0 : -0.05 * Math.sin(t * 2 + ph));
  a.rig.position.y = walk ? Math.abs(Math.cos(t * 11 + ph)) * 0.05 : 0.01 * Math.sin(t * 2.2 + ph);
  a.head.rotation.z = walk ? 0.04 * s : 0.03 * Math.sin(t * 1.3 + ph);
  if (mode === 'swing') {
    a.arms[1].rotation.x = -1.6 + Math.sin(t * 14) * 1.2;
  }
}

export function lookForPlayer(look) { return { ...look }; }
export { mixHex };
