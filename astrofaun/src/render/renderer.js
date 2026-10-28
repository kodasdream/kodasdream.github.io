// Renderer setup, quality presets, image-based lighting and the shared light rig.
// No post-processing: there is deliberately no bloom or glow anywhere in the game.
import * as THREE from '../../vendor/three.module.min.js';

export { THREE };

export const QUALITY = {
  low:    { name: 'Low',    dpr: 1,   tex: 512,  terrain: 1024, shadow: 1024, shadows: true,  aniso: 2 },
  medium: { name: 'Medium', dpr: 1.5, tex: 1024, terrain: 2048, shadow: 2048, shadows: true,  aniso: 4 },
  high:   { name: 'High',   dpr: 2,   tex: 2048, terrain: 4096, shadow: 2048, shadows: true,  aniso: 8 },
  ultra:  { name: 'Ultra',  dpr: 3,   tex: 4096, terrain: 4096, shadow: 4096, shadows: true,  aniso: 16 },
};

export const R = {
  renderer: null,
  quality: 'high',
  q: QUALITY.high,
  pmrem: null,
  envCache: new Map(),
  maxAniso: 1,
  isMobile: false,
};

export function detectQuality() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(screen.width, screen.height) < 820;
  R.isMobile = coarse && small;
  if (R.isMobile) return 'medium';
  const mem = navigator.deviceMemory || 8;
  if (mem <= 4) return 'medium';
  return 'high';
}

export function initRenderer(canvas, quality) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false, stencil: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  R.renderer = renderer;
  R.maxAniso = renderer.capabilities.getMaxAnisotropy();
  R.pmrem = new THREE.PMREMGenerator(renderer);
  setQuality(quality || detectQuality());
  return renderer;
}

export function setQuality(q) {
  if (!QUALITY[q]) q = 'high';
  const maxTex = R.renderer.capabilities.maxTextureSize;
  R.quality = q;
  R.q = { ...QUALITY[q] };
  R.q.tex = Math.min(R.q.tex, maxTex);
  R.q.terrain = Math.min(R.q.terrain, maxTex);
  R.q.aniso = Math.min(R.q.aniso, R.maxAniso);
  R.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, R.q.dpr));
  R.renderer.shadowMap.enabled = R.q.shadows;
}

// ---------------------------------------------------------------- environment (IBL)
const envVert = `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const envFrag = `
varying vec3 vDir;
uniform vec3 cTop, cMid, cHor, cLow, cGround;
void main(){
  float y = vDir.y;
  vec3 c;
  if (y > 0.0) {
    c = mix(cHor, cMid, smoothstep(0.0, 0.35, y));
    c = mix(c, cTop, smoothstep(0.35, 1.0, y));
  } else {
    c = mix(cHor, cLow, smoothstep(0.0, 0.25, -y));
    c = mix(c, cGround, smoothstep(0.25, 1.0, -y));
  }
  gl_FragColor = vec4(c, 1.0);
}`;

function lin(hex) { return new THREE.Color(hex); }

export function envFor(key, biome) {
  if (R.envCache.has(key)) return R.envCache.get(key);
  const scene = new THREE.Scene();
  const [top, mid, hor, low] = biome.sky;
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(50, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, vertexShader: envVert, fragmentShader: envFrag, depthWrite: false,
      uniforms: {
        cTop: { value: lin(top).multiplyScalar(0.9) }, cMid: { value: lin(mid) }, cHor: { value: lin(hor).multiplyScalar(1.15) },
        cLow: { value: lin(low).multiplyScalar(0.8) }, cGround: { value: lin(biome.grass[2]).multiplyScalar(0.35) },
      },
    }),
  );
  scene.add(sphere);
  // Soft boxes: these give glossy surfaces their crisp highlight shapes
  const box = (w, h, pos, intensity, color = 0xffffff) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.copy(pos);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  box(26, 14, new THREE.Vector3(-18, 30, 22), 3.2, biome.sun);
  box(10, 30, new THREE.Vector3(38, 10, -8), 1.4);
  box(30, 6, new THREE.Vector3(5, 18, -40), 1.1, biome.sky[2]);
  box(8, 8, new THREE.Vector3(25, 35, 25), 5.0, biome.sun);
  const tex = R.pmrem.fromScene(scene, 0.03).texture;
  sphere.geometry.dispose();
  sphere.material.dispose();
  R.envCache.set(key, tex);
  return tex;
}

// ---------------------------------------------------------------- sky background
export function skyTexture(biome) {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  const hex = (h) => '#' + h.toString(16).padStart(6, '0');
  grad.addColorStop(0, hex(biome.sky[0]));
  grad.addColorStop(0.45, hex(biome.sky[1]));
  grad.addColorStop(0.8, hex(biome.sky[2]));
  grad.addColorStop(1, hex(biome.sky[3]));
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------- light rig
export function makeLights(scene, biome) {
  const hemi = new THREE.HemisphereLight(lin(biome.sky[1]).lerp(new THREE.Color(0xffffff), 0.5), lin(biome.grass[2]).multiplyScalar(0.6), 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(biome.sun, 2.6);
  sun.position.set(-14, 26, 12);
  sun.castShadow = R.q.shadows;
  const s = R.q.shadow;
  sun.shadow.mapSize.set(s, s);
  const cam = sun.shadow.camera;
  cam.left = -26; cam.right = 26; cam.top = 26; cam.bottom = -26; cam.near = 1; cam.far = 90;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 3;
  scene.add(sun);
  scene.add(sun.target);
  // Soft fill from the opposite side keeps shadow sides colorful
  const fill = new THREE.DirectionalLight(lin(biome.sky[2]), 0.55);
  fill.position.set(12, 8, -10);
  scene.add(fill);
  return { hemi, sun, fill, follow(target) {
    sun.position.set(target.x - 14, target.y + 26, target.z + 12);
    sun.target.position.copy(target);
  } };
}

export function disposeObject(obj) {
  obj.traverse((o) => {
    if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) if (!m.userData.shared) m.dispose();
    }
  });
}
