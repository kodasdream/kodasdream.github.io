// Cel-shaded + glossy look: banded diffuse lighting with crisp specular/clearcoat highlights,
// and inverted-hull ink outlines tinted from each part's own color (like colored line art).
import { THREE } from './renderer.js';

// Shared uniforms: outline thickness is kept constant in screen pixels
export const TOON = {
  outline: { value: 0.03 },
  outlinePx: 2.2,
};

const BAND = /* glsl */`
float toonBand(float x) {
  return 0.22 * smoothstep(0.0, 0.05, x) + 0.78 * smoothstep(0.26, 0.34, x);
}
`;

let patchedChunk = null;
function physicalChunk() {
  if (!patchedChunk) {
    patchedChunk = BAND + THREE.ShaderChunk.lights_physical_pars_fragment.replace(
      'vec3 irradiance = dotNL * directLight.color;',
      'vec3 irradiance = toonBand( dotNL ) * directLight.color;',
    );
  }
  return patchedChunk;
}

/** Call inside onBeforeCompile of a MeshStandard/MeshPhysical material. */
export function patchToon(shader) {
  shader.fragmentShader = shader.fragmentShader.replace('#include <lights_physical_pars_fragment>', physicalChunk());
}

/** Makes a standard/physical material cel-shaded (composes with an existing onBeforeCompile). */
export function toonify(mat, key = 'toon') {
  const prev = mat.onBeforeCompile;
  const prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey.call(mat) : '';
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev.call(mat, sh, r);
    patchToon(sh);
  };
  mat.customProgramCacheKey = () => prevKey + '|' + key;
  return mat;
}

export function toonStandard(opts) { return toonify(new THREE.MeshStandardMaterial(opts)); }
export function toonPhysical(opts) { return toonify(new THREE.MeshPhysicalMaterial(opts)); }

// ---------------------------------------------------------------- outlines
const outlineVert = /* glsl */`
uniform float uOutline;
uniform float uWidth;
#ifdef USE_COLOR
varying vec3 vCol;
#endif
#include <common>
void main() {
  #ifdef USE_COLOR
  vCol = color;
  #endif
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 n = normalize(normalMatrix * normal);
  mv.xyz += n * uOutline * uWidth;
  gl_Position = projectionMatrix * mv;
}`;
const outlineFrag = /* glsl */`
uniform vec3 uColor;
uniform float uTint;
#ifdef USE_COLOR
varying vec3 vCol;
#endif
void main() {
  vec3 c = uColor;
  #ifdef USE_COLOR
  // dark, slightly saturated version of the surface color
  vec3 v = vCol;
  float l = max(max(v.r, v.g), v.b);
  vec3 hue = v / max(l, 0.001);
  c = mix(uColor, hue * 0.028 + uColor * 0.6, uTint);
  #endif
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

const outlineCache = new Map();
export function outlineMaterial(color = 0x1a1230, { vertexColors = false, width = 1, tint = 1 } = {}) {
  const key = color + '|' + vertexColors + '|' + width + '|' + tint;
  if (outlineCache.has(key)) return outlineCache.get(key);
  const m = new THREE.ShaderMaterial({
    vertexShader: outlineVert,
    fragmentShader: outlineFrag,
    side: THREE.BackSide,
    vertexColors,
    uniforms: {
      uOutline: TOON.outline,
      uWidth: { value: width },
      uColor: { value: new THREE.Color(color) },
      uTint: { value: tint },
    },
  });
  m.userData.shared = true;
  m.userData.isOutline = true;
  outlineCache.set(key, m);
  return m;
}

/** Adds outline hull meshes to every mesh under obj (skips meshes flagged noOutline). */
export function addOutlines(obj, opts = {}) {
  const list = [];
  obj.traverse((o) => {
    if (!o.isMesh || o.userData.isOutlineMesh || o.userData.noOutline) return;
    if (o.material && (o.material.transparent || o.material.userData?.isOutline)) return;
    if (!o.geometry.attributes.normal) return;
    list.push(o);
  });
  for (const o of list) {
    const hasCol = !!o.geometry.attributes.color && opts.vertexColors !== false;
    const m = outlineMaterial(opts.color ?? 0x140e24, { vertexColors: hasCol, width: o.userData.outlineWidth ?? opts.width ?? 1, tint: opts.tint ?? 1 });
    const hull = new THREE.Mesh(o.geometry, m);
    hull.userData.isOutlineMesh = true;
    hull.castShadow = false;
    hull.receiveShadow = false;
    hull.renderOrder = o.renderOrder;
    hull.frustumCulled = o.frustumCulled;
    o.add(hull);
  }
  return obj;
}

/** Keep outlines at a fixed pixel width for an orthographic camera. */
export function updateOutlineScale(camera, viewportHeightPx) {
  let worldPerPx;
  if (camera.isOrthographicCamera) worldPerPx = (camera.top - camera.bottom) / camera.zoom / viewportHeightPx;
  else worldPerPx = (2 * Math.tan((camera.fov * Math.PI) / 360) * 6) / viewportHeightPx;
  TOON.outline.value = TOON.outlinePx * worldPerPx;
}
