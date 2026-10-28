// Home-island building models: rounded sci-fi pods, glass domes and element habitats.
// Models are centred on their footprint; y = 0 is the ground.
import { THREE } from './renderer.js';
import * as G from './geom.js';
import { toonify, addOutlines } from './toon.js';
import { BUILDINGS } from '../data/buildings.js';
import { ELEMENT_MAP } from '../data/elements.js';
import { RNG, shade, mixHex, clamp } from '../core/util.js';
import { makeProp } from './props.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const WHITE = 0xf0f4fa, LIGHT = 0xc8d0dc, METAL = 0x5a6474, DARK = 0x2e3644, TEAL = 0x2ab8c8, ORANGE = 0xff9a3a, RED = 0xe84a3a, WOOD = 0xb07a4a, WOODD = 0x7a4a2a, YELLOW = 0xffcf3a;

let MATS = null;
function mats() {
  if (MATS) return MATS;
  const mk = (o, phys) => { const m = phys ? new THREE.MeshPhysicalMaterial(o) : new THREE.MeshStandardMaterial(o); m.userData.shared = true; return toonify(m); };
  MATS = {
    matte: mk({ vertexColors: true, roughness: 0.7 }),
    gloss: mk({ vertexColors: true, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06 }, true),
    glass: (() => { const m = new THREE.MeshPhysicalMaterial({ color: 0x9ad8ff, roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.38, depthWrite: false }); m.userData.shared = true; return m; })(),
    window: mk({ color: 0x2a4a88, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02 }, true),
  };
  return MATS;
}

class Parts {
  constructor() { this.matte = []; this.gloss = []; this.glass = []; this.window = []; this.extra = []; }
  m(g, col) { this.matte.push(G.paint(g, col)); return this; }
  g(g, col) { this.gloss.push(G.paint(g, col)); return this; }
  w(g) { this.window.push(G.paint(g, 0xffffff)); return this; }
  gl(g) { this.glass.push(G.paint(g, 0xffffff)); return this; }
  build() {
    const grp = new THREE.Group();
    const M = mats();
    for (const k of ['matte', 'gloss', 'window', 'glass']) {
      if (!this[k].length) continue;
      const mesh = new THREE.Mesh(G.merge(this[k]), M[k]);
      mesh.castShadow = k !== 'glass';
      mesh.receiveShadow = k !== 'glass';
      if (k === 'glass') mesh.userData.noOutline = true;
      grp.add(mesh);
    }
    for (const e of this.extra) grp.add(e);
    addOutlines(grp, { width: 1.1 });
    return grp;
  }
}

const ringPaint = (c1, c2, n = 12) => (p) => (Math.floor(((Math.atan2(p.z, p.x) / Math.PI + 1) / 2) * n) % 2 ? c1 : c2);

// ---------------------------------------------------------------- starship
export function makeShip() {
  const P = new Parts();
  const prof = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    prof.push(new THREE.Vector2(Math.max(0.001, 0.45 * Math.sin(Math.PI * Math.min(1, 0.15 + t * 0.85)) * (1 - t * 0.35)), t * 2.1));
  }
  const hull = new THREE.LatheGeometry(prof, 24);
  P.g(hull, (p) => (p.y > 1.55 ? RED : Math.abs(p.y - 0.7) < 0.08 ? RED : WHITE));
  const cockpit = G.sphere(0.2, 0.26, 0.12, 16, 12);
  G.xf(cockpit, { p: [0, 1.35, 0.33] });
  P.w(cockpit);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(0.42, -0.25); s.lineTo(0.38, 0.3); s.lineTo(0, 0.75); s.lineTo(0, 0);
    const fin = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 });
    G.xf(fin, { p: [0.3, 0.15, -0.03] });
    G.xf(fin, { r: [0, a, 0] });
    P.g(fin, RED);
  }
  P.g(G.xf(G.cyl(0.18, 0.28, 0.25, 16), { p: [0, -0.12, 0] }), METAL);
  const grp = P.build();
  grp.userData.isShip = true;
  return grp;
}

// ---------------------------------------------------------------- builders
const B = {
  command_pod(P, lvl) {
    P.g(G.cyl(1.38, 1.45, 0.22, 28), ringPaint(LIGHT, 0xb0b8c8, 16));
    const dome = G.sphere(1.12, 1.0, 1.12, 32, 20);
    const pos = dome.attributes.position;
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0) pos.setY(i, 0);
    dome.computeVertexNormals();
    G.xf(dome, { p: [0, 0.22, 0] });
    P.g(dome, (p) => (p.y > 1.0 ? (lvl > 2 ? TEAL : 0xe8ecf4) : WHITE));
    // window band
    const band = new THREE.CylinderGeometry(1.09, 1.12, 0.22, 32, 1, true);
    band.translate(0, 0.62, 0);
    P.w(band);
    // door
    P.g(G.xf(G.rbox(0.56, 0.72, 0.3, 0.12, 3), { p: [0, 0.22, 1.0] }), 0x3a6ad8);
    P.g(G.xf(G.rbox(0.18, 0.06, 0.1, 0.02, 2), { p: [0.14, 0.55, 1.16] }), YELLOW);
    // antenna + dish
    P.g(G.xf(G.cyl(0.05, 0.07, 0.6, 10), { p: [0.35, 1.0, -0.2] }), METAL);
    const dish = G.cone(0.28, 0.12, 18, true);
    G.xf(dish, { r: [Math.PI + 0.5, 0, 0.3], p: [0.35, 1.68, -0.2] });
    P.g(dish, LIGHT);
    P.g(G.xf(G.sphere(0.06), { p: [0.35, 1.62, -0.2] }), RED);
    for (let i = 0; i < lvl; i++) P.g(G.xf(G.sphere(0.07), { p: [-0.6 + i * 0.3, 0.32, 0.95 - Math.abs(-0.6 + i * 0.3) * 0.3] }), [TEAL, ORANGE, YELLOW, RED, 0x9a6aff][i]);
  },
  launch_pad(P, lvl) {
    P.g(G.cyl(1.42, 1.48, 0.16, 32), (p) => (Math.hypot(p.x, p.z) > 1.15 ? ringPaint(YELLOW, DARK, 20)(p) : DARK));
    P.m(G.xf(new THREE.TorusGeometry(0.75, 0.05, 6, 32).rotateX(Math.PI / 2), { p: [0, 0.17, 0] }), YELLOW);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      P.g(G.xf(G.cyl(0.08, 0.1, 0.3, 10), { p: [Math.cos(a) * 1.25, 0.12, Math.sin(a) * 1.25] }), METAL);
      P.g(G.xf(G.sphere(0.08), { p: [Math.cos(a) * 1.25, 0.46, Math.sin(a) * 1.25] }), i % 2 ? RED : TEAL);
    }
    const ship = makeShip();
    ship.position.y = 0.32;
    ship.scale.setScalar(0.85);
    ship.name = 'ship';
    P.extra.push(ship);
    for (let i = 0; i < Math.max(0, lvl - 1); i++) P.g(G.xf(G.rbox(0.2, 0.08, 0.5, 0.03, 2), { p: [-1.1 + i * 0.25, 0.18, -1.0] }), TEAL);
  },
  fuel_pump(P, lvl) {
    P.g(G.xf(G.rbox(1.8, 0.12, 1.8, 0.06, 2), {}), LIGHT);
    P.g(G.xf(G.cyl(0.42, 0.42, 0.95, 20), { p: [-0.3, 0.12, -0.2] }), (p) => (Math.abs(p.y - 0.62) < 0.07 || Math.abs(p.y - 0.36) < 0.05 ? WHITE : ORANGE));
    const top = G.sphere(0.42, 0.22, 0.42, 20, 10);
    G.xf(top, { p: [-0.3, 1.07, -0.2] });
    P.g(top, ORANGE);
    P.g(G.taperTube([V(0.05, 0.7, -0.05), V(0.35, 0.75, 0.2), V(0.45, 0.5, 0.45)], 0.06, 0.06, 8, 10), METAL);
    P.g(G.xf(G.rbox(0.36, 0.7, 0.3, 0.06, 2), { p: [0.5, 0.12, 0.45] }), RED);
    P.g(G.xf(G.cyl(0.1, 0.1, 0.02, 16), { r: [Math.PI / 2, 0, 0], p: [0.5, 0.62, 0.61] }), WHITE);
    P.m(G.xf(G.box(0.02, 0.08, 0.01), { r: [0, 0, -0.6], p: [0.5, 0.6, 0.63] }), RED);
  },
  beast_feeder(P) {
    P.g(G.xf(G.rbox(0.8, 0.28, 0.5, 0.06, 2), { p: [0, 0.02, 0] }), WOOD);
    const rng = new RNG(4);
    for (let i = 0; i < 9; i++) P.g(G.xf(G.sphere(0.07), { p: [rng.range(-0.3, 0.3), 0.3 + rng.range(0, 0.06), rng.range(-0.15, 0.15)] }), rng.pick([ORANGE, YELLOW, 0xff6a5a, 0x7ad84a]));
    P.m(G.xf(G.cyl(0.03, 0.03, 0.6, 6), { p: [0.35, 0, -0.22] }), WOODD);
    P.g(G.xf(G.rbox(0.3, 0.18, 0.04, 0.03, 2), { p: [0.35, 0.55, -0.22] }), YELLOW);
  },
  training_dojo(P) {
    P.m(G.xf(G.rbox(1.8, 0.16, 1.8, 0.05, 2), {}), 0xe8c890);
    for (const [x, z] of [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]]) P.m(G.xf(G.cyl(0.06, 0.06, 1.2, 8), { p: [x, 0.1, z] }), WOODD);
    const roof = new THREE.ConeGeometry(1.35, 0.55, 4, 1);
    roof.rotateY(Math.PI / 4);
    roof.translate(0, 1.55, 0);
    P.g(roof, RED);
    P.g(G.xf(G.capsule(0.16, 0.45, 12), { p: [0.2, 0.16, 0.1] }), (p) => (Math.abs(p.y - 0.55) < 0.06 ? WHITE : RED));
    P.m(G.xf(G.cyl(0.04, 0.04, 0.35, 6), { p: [0.2, 0.9, 0.1] }), WOODD);
  },
  incubator(P, lvl, state) {
    P.g(G.xf(G.cyl(0.7, 0.8, 0.3, 24), {}), WHITE);
    P.g(G.xf(new THREE.TorusGeometry(0.62, 0.05, 6, 24).rotateX(Math.PI / 2), { p: [0, 0.32, 0] }), ORANGE);
    P.g(G.xf(G.cyl(0.25, 0.32, 0.12, 16), { p: [0, 0.3, 0] }), METAL);
    const dome = G.sphere(0.62, 0.6, 0.62, 24, 16);
    const pos = dome.attributes.position;
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0) pos.setY(i, 0);
    dome.computeVertexNormals();
    G.xf(dome, { p: [0, 0.3, 0] });
    P.gl(dome);
    if (state?.egg) {
      const egg = G.sphere(0.2, 0.27, 0.2, 18, 14);
      G.xf(egg, { p: [0, 0.68, 0] });
      P.g(egg, (p, n) => (Math.sin(p.x * 40) * Math.sin(p.y * 30) > 0.55 ? state.spot : state.egg));
    }
  },
  breeding_facility(P) {
    P.g(G.xf(G.rbox(2.7, 0.14, 2.0, 0.08, 2), {}), LIGHT);
    for (const sx of [-1, 1]) {
      P.g(G.xf(G.cyl(0.55, 0.62, 0.35, 20), { p: [sx * 0.8, 0.14, 0] }), WHITE);
      const dome = G.sphere(0.55, 0.62, 0.55, 22, 14);
      G.xf(dome, { p: [sx * 0.8, 0.49, 0] });
      P.g(dome, (p) => (p.y > 0.95 ? 0xff8ab8 : WHITE));
      P.w(G.xf(G.sphere(0.18, 0.18, 0.06), { p: [sx * 0.8, 0.75, 0.52] }));
    }
    P.g(G.xf(G.cyl(0.13, 0.13, 0.75, 12), { r: [0, 0, Math.PI / 2], p: [0.38, 0.7, 0] }), LIGHT);
    // heart sign
    const s = new THREE.Shape();
    s.moveTo(0, -0.25); s.bezierCurveTo(-0.32, -0.02, -0.28, 0.22, -0.13, 0.22); s.bezierCurveTo(-0.04, 0.22, 0, 0.14, 0, 0.1); s.bezierCurveTo(0, 0.14, 0.04, 0.22, 0.13, 0.22); s.bezierCurveTo(0.28, 0.22, 0.32, -0.02, 0, -0.25);
    const heart = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 });
    G.xf(heart, { s: 1.4, p: [0, 1.25, -0.04] });
    P.g(heart, 0xff5a8a);
    P.m(G.xf(G.cyl(0.035, 0.035, 0.5, 6), { p: [0, 0.75, 0] }), METAL);
  },
  laboratory(P) {
    P.g(G.xf(G.rbox(2.4, 1.1, 1.7, 0.18, 3), { p: [0, 0.05, 0] }), WHITE);
    const roof = new THREE.CylinderGeometry(0.86, 0.86, 2.42, 24, 1, false, 0, Math.PI);
    roof.rotateZ(Math.PI / 2);
    roof.rotateX(Math.PI / 2);
    roof.translate(0, 1.15, 0);
    P.g(roof, TEAL);
    P.w(G.xf(G.cyl(0.32, 0.32, 0.06, 20), { r: [Math.PI / 2, 0, 0], p: [-0.5, 0.65, 0.86] }));
    P.g(G.xf(G.rbox(0.5, 0.8, 0.1, 0.1, 2), { p: [0.55, 0.05, 0.85] }), 0x3a6ad8);
    P.g(G.xf(G.cyl(0.14, 0.18, 0.9, 12), { p: [0.75, 1.3, -0.4] }), LIGHT);
    P.g(G.xf(G.sphere(0.22, 0.2, 0.22), { p: [0.75, 2.25, -0.4] }), 0x7ae0c8);
    const cols = [0xff6aa8, 0x7ad84a, 0xffd23c, 0x6ab8ff];
    for (let i = 0; i < 4; i++) {
      P.g(G.xf(G.sphere(0.09, 0.11, 0.09), { p: [-1.3, 0.12 + i * 0.0, -0.6 + i * 0.35] }), cols[i]);
      P.m(G.xf(G.cyl(0.03, 0.03, 0.1, 6), { p: [-1.3, 0.2, -0.6 + i * 0.35] }), WHITE);
    }
  },
  workshop(P) {
    P.m(G.xf(G.rbox(1.8, 0.1, 1.8, 0.04, 2), {}), 0xc8a878);
    for (const [x, z] of [[-0.75, -0.7], [0.75, -0.7], [-0.75, 0.7], [0.75, 0.7]]) P.m(G.xf(G.cyl(0.05, 0.05, 1.3, 8), { p: [x, 0.1, z] }), WOODD);
    const roof = G.rbox(1.9, 0.12, 1.7, 0.05, 2);
    G.xf(roof, { r: [0.12, 0, 0], p: [0, 1.38, 0] });
    P.g(roof, (p) => (Math.floor((p.x + 1) * 4) % 2 ? ORANGE : WHITE));
    P.m(G.xf(G.rbox(1.2, 0.55, 0.55, 0.05, 2), { p: [0, 0.1, -0.2] }), WOOD);
    P.g(G.xf(G.rbox(0.3, 0.15, 0.2, 0.03, 2), { p: [-0.3, 0.65, -0.2] }), METAL);
    P.g(G.xf(new THREE.TorusGeometry(0.16, 0.05, 6, 12), { p: [0.35, 0.95, -0.47] }), YELLOW);
  },
  refinery(P) {
    P.m(G.xf(G.rbox(1.8, 0.12, 1.8, 0.05, 2), {}), 0x8a7a6a);
    P.m(G.xf(G.cyl(0.6, 0.7, 1.1, 16), { p: [-0.2, 0.1, -0.15] }), (p) => (Math.floor(p.y * 6) % 2 ? 0xa85a4a : 0x8a4a3a));
    P.m(G.xf(G.sphere(0.6, 0.35, 0.6, 16, 10), { p: [-0.2, 1.2, -0.15] }), 0x8a4a3a);
    P.g(G.xf(G.cyl(0.14, 0.16, 0.9, 12), { p: [-0.35, 1.3, -0.35] }), METAL);
    P.m(G.xf(G.rbox(0.5, 0.45, 0.3, 0.1, 2), { p: [-0.2, 0.18, 0.4] }), 0x2a1a1a);
    P.g(G.xf(G.sphere(0.18, 0.12, 0.1), { p: [-0.2, 0.32, 0.56] }), 0xffa030);
    P.g(G.xf(G.rbox(0.5, 0.3, 0.35, 0.05, 2), { p: [0.55, 0.25, 0.45] }), METAL);
    P.g(G.xf(G.rbox(0.42, 0.12, 0.3, 0.03, 2), { p: [0.55, 0.55, 0.45] }), 0xd8783a);
  },
  research_station(P, lvl) {
    P.g(G.xf(G.cyl(1.2, 1.3, 0.8, 28), {}), WHITE);
    P.w(G.xf(new THREE.CylinderGeometry(1.205, 1.205, 0.16, 28, 1, true), { p: [0, 0.45, 0] }));
    const dome = G.sphere(1.15, 0.95, 1.15, 28, 18);
    const pos = dome.attributes.position;
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0) pos.setY(i, 0);
    dome.computeVertexNormals();
    G.xf(dome, { p: [0, 0.8, 0] });
    P.g(dome, (p) => (Math.abs(p.x) < 0.15 && p.z > 0 ? DARK : 0xb8c4d4));
    P.g(G.xf(G.cyl(0.18, 0.24, 1.2, 14), { r: [0.8, 0, 0], p: [0, 1.25, 0.25] }), METAL);
    P.g(G.xf(G.cyl(0.03, 0.05, 0.8, 8), { p: [1.15, 0.2, -0.9] }), METAL);
    const dish = G.cone(0.42, 0.18, 20, true);
    G.xf(dish, { r: [Math.PI + 0.7, 0.4, 0], p: [1.15, 1.15, -0.9] });
    P.g(dish, LIGHT);
  },
  arena(P) {
    P.m(G.xf(G.cyl(1.4, 1.45, 0.12, 32), {}), 0xe8c890);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      if (i % 3 === 0) continue;
      P.g(G.xf(G.rbox(0.5, 0.35, 0.2, 0.06, 2), { r: [0, -a + Math.PI / 2, 0], p: [Math.cos(a) * 1.3, 0.1, Math.sin(a) * 1.3] }), i % 2 ? RED : 0x3a6ad8);
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      P.m(G.xf(G.cyl(0.03, 0.03, 1.2, 6), { p: [Math.cos(a) * 1.35, 0.1, Math.sin(a) * 1.35] }), METAL);
      const flag = new THREE.PlaneGeometry(0.4, 0.25);
      G.xf(flag, { r: [0, -a, 0], p: [Math.cos(a) * 1.35 + 0.2 * Math.sin(a), 1.15, Math.sin(a) * 1.35 - 0.2 * Math.cos(a)] });
      P.g(flag, [YELLOW, RED, TEAL, ORANGE][i]);
    }
    P.m(G.xf(new THREE.TorusGeometry(0.6, 0.04, 6, 24).rotateX(Math.PI / 2), { p: [0, 0.13, 0] }), WHITE);
  },
};

// Element habitats: fenced pens with themed interiors
function habitat(P, el, lvl) {
  const e = ELEMENT_MAP[el];
  const rng = new RNG('hab-' + el);
  const groundCol = { flame: 0x3a3236, aquatic: 0x3aa8e8, snow: 0xf0f8ff, terra: 0xb8885a, flora: 0x5cb84a, venom: 0x6a8a3a, primal: 0x9a7a4a, phantom: 0x4a4a6a, lightning: 0xd8c86a, flying: 0xa8d8f0, tech: 0x8a94a4, flux: 0xd88ad8, common: 0x8ad06a }[el];
  const base = new THREE.CylinderGeometry(1.35, 1.4, 0.06, 28);
  base.translate(0, 0.03, 0);
  P.m(base, groundCol);
  if (el === 'aquatic' || el === 'flame' || el === 'venom') {
    const pool = new THREE.CircleGeometry(0.75, 24);
    pool.rotateX(-Math.PI / 2);
    pool.translate(-0.2, 0.075, 0.1);
    P.g(pool, (p) => mixHex(el === 'flame' ? 0xffd23c : el === 'venom' ? 0x9ae03a : 0x8ae8ff, el === 'flame' ? 0xff4a1a : el === 'venom' ? 0x4a8a2a : 0x2a7ad8, clamp(Math.hypot(p.x + 0.2, p.z - 0.1) / 0.75, 0, 1)));
    P.m(G.xf(new THREE.TorusGeometry(0.75, 0.07, 6, 24).rotateX(Math.PI / 2), { p: [-0.2, 0.08, 0.1] }), el === 'flame' ? 0x2a2024 : 0x9a8a7a);
  }
  // fence
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    if (i === 4) continue; // gate
    P.m(G.xf(G.cyl(0.045, 0.05, 0.42, 6), { p: [Math.cos(a) * 1.32, 0.05, Math.sin(a) * 1.32] }), WOOD);
  }
  for (let k = 0; k < 2; k++) {
    const rail = new THREE.TorusGeometry(1.32, 0.025, 4, 48, Math.PI * 2 - 0.4);
    rail.rotateX(Math.PI / 2);
    rail.rotateY(-Math.PI / 2 - 0.2 + 0.4 + 0.0);
    rail.translate(0, 0.22 + k * 0.16, 0);
    P.m(rail, WOODD);
  }
  // sign with the type color
  P.m(G.xf(G.cyl(0.035, 0.035, 0.6, 6), { p: [0.35, 0.05, 1.42] }), WOODD);
  P.g(G.xf(G.rbox(0.42, 0.28, 0.05, 0.05, 2), { p: [0.35, 0.5, 1.44] }), e.color);
  // themed props
  const propsFor = {
    common: ['bush', 'flowers'], flame: ['lava', 'rock'], aquatic: ['coral', 'reeds'], snow: ['icecrystal', 'snowpine'], terra: ['boulder', 'rock'],
    flora: ['puff', 'flowers'], venom: ['mushroom', 'spore'], primal: ['deadtree', 'rock'], phantom: ['deadtree', 'obelisk'], lightning: ['coil', 'rock'],
    flying: ['puff', 'cloudtree'], tech: ['tank', 'pipe'], flux: ['crystal', 'prismtree'],
  }[el];
  const p1 = makeProp(propsFor[0], 1, { key: 'hab' });
  p1.position.set(0.55, 0.06, -0.55);
  p1.scale.setScalar(0.7);
  P.extra.push(p1);
  const p2 = makeProp(propsFor[1], 2, { key: 'hab' });
  p2.position.set(-0.7, 0.06, -0.45);
  p2.scale.setScalar(0.6);
  P.extra.push(p2);
  void rng; void lvl;
}

// Decorations
const D = {
  deco_lamp(P) { P.g(G.cyl(0.05, 0.07, 1.3, 8), METAL); P.gl(G.xf(G.sphere(0.16), { p: [0, 1.42, 0] })); P.g(G.xf(G.sphere(0.09), { p: [0, 1.42, 0] }), 0xffe08a); P.g(G.xf(G.cone(0.18, 0.12, 12), { p: [0, 1.55, 0] }), DARK); },
  deco_fence(P) { for (const x of [-0.4, 0, 0.4]) P.m(G.xf(G.cyl(0.04, 0.04, 0.5, 6), { p: [x, 0, 0] }), 0xf8f0e0); P.m(G.xf(G.box(0.95, 0.06, 0.04), { p: [0, 0.2, 0] }), 0xf8f0e0); P.m(G.xf(G.box(0.95, 0.06, 0.04), { p: [0, 0.38, 0] }), 0xf8f0e0); },
  deco_bench(P) { P.m(G.xf(G.rbox(0.9, 0.08, 0.35, 0.03, 2), { p: [0, 0.3, 0] }), WOOD); P.m(G.xf(G.rbox(0.9, 0.3, 0.06, 0.03, 2), { p: [0, 0.38, -0.16] }), WOOD); for (const x of [-0.35, 0.35]) P.g(G.xf(G.box(0.06, 0.3, 0.3), { p: [x, 0, 0] }), METAL); },
  deco_fountain(P) {
    P.m(G.xf(G.cyl(0.85, 0.9, 0.35, 24), {}), 0xd8d0c0);
    const water = new THREE.CircleGeometry(0.75, 24); water.rotateX(-Math.PI / 2); water.translate(0, 0.33, 0); P.g(water, 0x4ab8ff);
    P.m(G.xf(G.cyl(0.12, 0.16, 0.7, 12), { p: [0, 0.3, 0] }), 0xd8d0c0);
    P.m(G.xf(G.cyl(0.35, 0.3, 0.1, 16), { p: [0, 0.95, 0] }), 0xd8d0c0);
    P.g(G.xf(G.sphere(0.12, 0.2, 0.12), { p: [0, 1.15, 0] }), 0x8ad8ff);
  },
  deco_statue(P) { P.m(G.xf(G.rbox(0.6, 0.3, 0.6, 0.05, 2), {}), 0xb8b0a0); P.m(G.xf(G.sphere(0.25, 0.3, 0.22), { p: [0, 0.6, 0] }), 0xd8d0c0); P.m(G.xf(G.sphere(0.2), { p: [0, 0.98, 0.05] }), 0xd8d0c0); for (const sx of [-1, 1]) P.m(G.xf(G.cone(0.07, 0.18, 6), { r: [0, 0, -sx * 0.4], p: [sx * 0.12, 1.12, 0] }), 0xd8d0c0); },
  deco_path(P) { const rng = new RNG(3); for (let i = 0; i < 4; i++) P.m(G.xf(G.cyl(0.22, 0.24, 0.05, 7), { p: [rng.range(-0.25, 0.25), 0, rng.range(-0.25, 0.25)] }), rng.pick([0xd8d0c0, 0xc0b8a8, 0xe0d8c8])); },
  deco_pond(P) { const w = new THREE.CircleGeometry(0.85, 24); w.rotateX(-Math.PI / 2); w.translate(0, 0.04, 0); P.g(w, 0x3aa8e8); P.m(G.xf(new THREE.TorusGeometry(0.85, 0.08, 6, 24).rotateX(Math.PI / 2), { p: [0, 0.05, 0] }), 0xa8a090); for (const [x, z] of [[0.3, 0.2], [-0.25, -0.3], [-0.1, 0.4]]) P.g(G.xf(G.cyl(0.13, 0.13, 0.02, 12), { p: [x, 0.05, z] }), 0x5cc84a); },
  deco_flag(P) { P.m(G.cyl(0.03, 0.04, 1.6, 6), METAL); const f = new THREE.PlaneGeometry(0.55, 0.35, 4, 2); const pos = f.attributes.position; for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 6) * 0.04); f.computeVertexNormals(); G.xf(f, { p: [0.28, 1.4, 0] }); P.g(f, (p) => (p.y > 1.4 ? 0x3a6ad8 : YELLOW)); },
};
const DECO_PROPS = { deco_tree: 'puff', deco_pine: 'snowpine', deco_palm: 'palm', deco_bush: 'bush', deco_flowers: 'flowers', deco_mushroom: 'mushroom', deco_rock: 'boulder', deco_crystal: 'crystal' };

const cache = new Map();
export function makeBuilding(type, level = 1, state = null) {
  const key = type + ':' + level + ':' + (state ? JSON.stringify(state) : '');
  if (!cache.has(key)) {
    let grp;
    if (DECO_PROPS[type]) {
      grp = makeProp(DECO_PROPS[type], 1, { key: 'deco', leaf: [0x4cb43a, 0x8ad44a, 0x26762a] });
      if (type === 'deco_tree' || type === 'deco_palm' || type === 'deco_pine') grp.scale.setScalar(0.75);
    } else {
      const P = new Parts();
      if (B[type]) B[type](P, level, state);
      else if (type.startsWith('hab_')) habitat(P, type.slice(4), level);
      else if (D[type]) D[type](P);
      grp = P.build();
    }
    const def = BUILDINGS[type];
    grp.userData.size = def ? def.size : [1, 1];
    cache.set(key, grp);
  }
  return cache.get(key).clone(true);
}

export function clearBuildingCache() { cache.clear(); }
