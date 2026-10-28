// Renders beast and character portraits for the UI into an offscreen target (cached data URLs).
import { THREE, R, envFor, makeLights } from './renderer.js';
import { makeBeast, animateBeast } from './beastMesh.js';
import { makeCharacter } from './characters.js';
import { updateOutlineScale, TOON } from './toon.js';
import { BIOMES } from '../data/planets.js';

const SIZE = 256;
let scene, cam, rt, canvas, ctx2d, lights;
const cache = new Map();
const queue = [];
let pumping = false;

function setup() {
  if (scene) return;
  scene = new THREE.Scene();
  const biome = BIOMES.home;
  scene.environment = envFor('home', biome);
  lights = makeLights(scene, biome);
  lights.sun.castShadow = false;
  lights.sun.position.set(-4, 8, 7);
  cam = new THREE.PerspectiveCamera(26, 1, 0.05, 50);
  rt = new THREE.WebGLRenderTarget(SIZE, SIZE, { samples: 4, colorSpace: THREE.SRGBColorSpace });
  canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  ctx2d = canvas.getContext('2d');
}

function snap(obj, height, opts = {}) {
  setup();
  scene.add(obj);
  const h = Math.max(0.5, height);
  const dist = h * (opts.close ? 2.5 : 3.2) + 0.6;
  cam.position.set(dist * 0.55, h * 0.62 + dist * 0.18, dist);
  cam.lookAt(0, h * (opts.close ? 0.62 : 0.48), 0);
  const prevOutline = TOON.outline.value;
  TOON.outline.value = 0.012 * h;
  const r = R.renderer;
  const prevTarget = r.getRenderTarget();
  const prevClear = r.getClearAlpha();
  r.setRenderTarget(rt);
  r.setClearColor(0x000000, 0);
  r.clear();
  r.render(scene, cam);
  const px = new Uint8Array(SIZE * SIZE * 4);
  r.readRenderTargetPixels(rt, 0, 0, SIZE, SIZE, px);
  r.setRenderTarget(prevTarget);
  r.setClearAlpha(prevClear);
  TOON.outline.value = prevOutline;
  scene.remove(obj);
  const img = ctx2d.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) {
    const src = (SIZE - 1 - y) * SIZE * 4;
    img.data.set(px.subarray(src, src + SIZE * 4), y * SIZE * 4);
  }
  ctx2d.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

export function beastPortrait(spId, variant = false) {
  const key = 'b' + spId + (variant ? 'v' : '');
  if (cache.has(key)) return cache.get(key);
  const obj = makeBeast(spId, variant);
  obj.rotation.y = 0.35;
  obj.getObjectByName('shadow')?.removeFromParent();
  animateBeast(obj, 0.5, 0.016, 'idle');
  const url = snap(obj, obj.userData.height);
  cache.set(key, url);
  return url;
}

export function characterPortrait(look, key) {
  const k = 'c' + (key || JSON.stringify(look));
  if (cache.has(k)) return cache.get(k);
  const obj = makeCharacter(look, key);
  obj.rotation.y = 0.3;
  const url = snap(obj, 1.25, { close: true });
  cache.set(k, url);
  return url;
}

/** Returns an <img> that fills in asynchronously (portraits render a few per frame). */
export function portraitImg(spId, variant = false) {
  const img = document.createElement('img');
  img.alt = '';
  img.draggable = false;
  const key = 'b' + spId + (variant ? 'v' : '');
  if (cache.has(key)) { img.src = cache.get(key); return img; }
  queue.push({ img, spId, variant });
  if (!pumping) pump();
  return img;
}

function pump() {
  pumping = true;
  const t0 = performance.now();
  while (queue.length && performance.now() - t0 < 12) {
    const job = queue.shift();
    if (!job.img.isConnected && queue.length > 40) continue;
    try { job.img.src = beastPortrait(job.spId, job.variant); } catch (e) { console.warn('portrait failed', e); }
  }
  if (queue.length) requestAnimationFrame(pump);
  else pumping = false;
}
