// GPU texture baker. Surface textures are painted procedurally on the GPU into render targets at up
// to 4096x4096 (quality dependent), with matching normal maps. Recipes aim for a hand-painted look:
// soft color blotches, brushy strokes and inked cracks rather than photographic noise.
import { THREE, R } from './renderer.js';

const LIB = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform vec3 c0, c1, c2, c3, c4, c5;
uniform float uSeed, uMode, uAspect;

vec2 hash22(vec2 p) {
  p = mod(p, 289.0) + uSeed * 0.137;
  vec3 a = fract(p.xyx * vec3(0.1031, 0.1030, 0.0973));
  a += dot(a, a.yzx + 33.33);
  return fract((a.xx + a.yz) * a.zy);
}
float hash12(vec2 p) {
  p = mod(p, 289.0) + uSeed * 0.071;
  vec3 a = fract(vec3(p.xyx) * 0.1031);
  a += dot(a, a.yzx + 33.33);
  return fract((a.x + a.y) * a.z);
}
float pnoise(vec2 p, vec2 per) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 g00 = hash22(mod(i, per)) * 2.0 - 1.0;
  vec2 g10 = hash22(mod(i + vec2(1.0, 0.0), per)) * 2.0 - 1.0;
  vec2 g01 = hash22(mod(i + vec2(0.0, 1.0), per)) * 2.0 - 1.0;
  vec2 g11 = hash22(mod(i + vec2(1.0, 1.0), per)) * 2.0 - 1.0;
  float a = dot(g00, f), b = dot(g10, f - vec2(1.0, 0.0));
  float c = dot(g01, f - vec2(0.0, 1.0)), d = dot(g11, f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 1.4;
}
float fbm(vec2 uv, float freq, int oct) {
  float s = 0.0, a = 0.5, n = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= oct) break;
    s += a * pnoise(uv * freq, vec2(freq));
    n += a; a *= 0.5; freq *= 2.0;
  }
  return s / n;
}
// anisotropic fbm (stretched strokes); fx, fy integer frequencies keep it tileable
float sfbm(vec2 uv, float fx, float fy, int oct) {
  float s = 0.0, a = 0.5, n = 0.0;
  for (int i = 0; i < 6; i++) {
    if (i >= oct) break;
    s += a * pnoise(vec2(uv.x * fx, uv.y * fy), vec2(fx, fy));
    n += a; a *= 0.5; fx *= 2.0; fy *= 2.0;
  }
  return s / n;
}
vec3 voronoi(vec2 uv, float freq, float jitter) {
  vec2 p = uv * freq;
  vec2 i = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0; float id = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 c = mod(i + g, freq);
    vec2 o = hash22(c) * jitter + (1.0 - jitter) * 0.5;
    vec2 r = g + o - f;
    float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; id = hash12(c); }
    else if (d < d2) d2 = d;
  }
  return vec3(sqrt(d1), sqrt(d2), id);
}
// posterize a 0..1 value into soft painted steps
float paint(float x, float steps) { float s = x * steps; return (floor(s) + smoothstep(0.35, 0.65, fract(s))) / steps; }
vec3 toLin(vec3 c) { return pow(c, vec3(2.2)); }
`;

const RECIPES = {
  // Bare island ground. uMode: 0 sand-rock, 1 sand, 2 snow, 3 moss-dirt, 4 ash, 5 metal deck, 6 ancient tiles
  ground: /* glsl */`
  void surf(vec2 uv, out vec3 col, out float h) {
    float big = paint(fbm(uv, 3.0, 4) * 0.5 + 0.5, 4.0);
    float mid = fbm(uv + 0.3, 8.0, 4) * 0.5 + 0.5;
    if (uMode < 1.5 || (uMode > 2.5 && uMode < 3.5)) {
      // painted sandy rock: big soft blotches, pebbles with inked rims, hairline cracks
      col = mix(c2, c0, smoothstep(0.2, 0.8, big));
      col = mix(col, c1, smoothstep(0.55, 0.85, mid) * 0.6);
      float stroke = sfbm(uv + 0.17, 24.0, 6.0, 3) * 0.5 + 0.5;
      col *= 0.92 + 0.12 * stroke;
      vec3 v = voronoi(uv, 9.0, 0.9);
      float crack = 1.0 - smoothstep(0.0, 0.025, v.y - v.x);
      crack *= smoothstep(0.45, 0.6, fbm(uv + 1.7, 5.0, 3) * 0.5 + 0.5);
      col = mix(col, c3 * 0.55, crack * 0.75);
      vec3 pv = voronoi(uv + 0.4, 26.0, 1.0);
      float pebble = (pv.z > 0.82 ? 1.0 : 0.0);
      float pr = 0.16 + 0.08 * fract(pv.z * 17.0);
      float pin = 1.0 - smoothstep(pr - 0.03, pr, pv.x);
      float prim = (1.0 - smoothstep(pr, pr + 0.035, pv.x)) - pin;
      col = mix(col, mix(c0, c1, 0.5) * 1.12, pin * pebble);
      col = mix(col, c3 * 0.6, prim * pebble);
      h = big * 0.4 + stroke * 0.2 + pin * pebble * 0.5 - crack * 0.4;
      if (uMode > 0.5 && uMode < 1.5) { float rip = sin((uv.y + fbm(uv, 4.0, 3) * 0.08) * 6.2831 * 14.0) * 0.5 + 0.5; col *= 0.95 + 0.08 * rip; h += rip * 0.2; }
    } else if (uMode < 2.5) {
      float drift = paint(fbm(uv, 4.0, 5) * 0.5 + 0.5, 4.0);
      col = mix(c2, c0, smoothstep(0.2, 0.8, drift));
      col = mix(col, c1, smoothstep(0.6, 0.9, mid) * 0.5);
      float stroke = sfbm(uv, 18.0, 5.0, 3) * 0.5 + 0.5;
      col *= 0.95 + 0.07 * stroke;
      h = drift * 0.8 + stroke * 0.1;
    } else if (uMode < 4.5) {
      vec3 v = voronoi(uv, 8.0, 0.8);
      float crack = 1.0 - smoothstep(0.0, 0.045, v.y - v.x);
      col = mix(c2, c0, big * 0.7 + v.z * 0.3);
      col = mix(col, c1, smoothstep(0.6, 0.9, mid) * 0.4);
      col = mix(col, c3, crack * 0.85);
      h = (1.0 - crack) * 0.7 + big * 0.3;
    } else if (uMode < 5.5) {
      vec2 g = fract(uv * 6.0);
      float seam = 1.0 - smoothstep(0.0, 0.022, min(min(g.x, 1.0 - g.x), min(g.y, 1.0 - g.y)));
      vec2 rv = fract(uv * 6.0 * 5.0) - 0.5;
      float edgeZone = step(0.38, max(abs(g.x - 0.5), abs(g.y - 0.5)));
      float rivet = (1.0 - smoothstep(0.1, 0.16, length(rv))) * edgeZone;
      float cell = hash12(floor(uv * 6.0));
      col = mix(c0, c1, cell * 0.5);
      col *= 0.94 + 0.08 * (sfbm(uv, 64.0, 4.0, 2) * 0.5 + 0.5);
      col = mix(col, c2, seam * 0.85);
      col = mix(col, c3, smoothstep(0.7, 0.95, mid) * 0.3);
      col = mix(col, c0 * 1.2, rivet);
      h = 0.6 - seam * 0.5 + rivet * 0.4;
    } else {
      vec2 g = uv * 5.0;
      vec2 cell = floor(g); vec2 f = fract(g);
      float edge = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
      float grout = 1.0 - smoothstep(0.025, 0.055, edge);
      float tone = hash12(mod(cell, 5.0));
      col = mix(c0, c1, tone * 0.6 + fbm(uv, 10.0, 3) * 0.2);
      col *= 0.9 + 0.15 * paint(fbm(uv, 20.0, 3) * 0.5 + 0.5, 3.0);
      col = mix(col, c3, grout * 0.85);
      vec3 cv = voronoi(uv, 16.0, 1.0);
      col = mix(col, c3, (1.0 - smoothstep(0.0, 0.04, cv.y - cv.x)) * 0.3);
      h = (1.0 - grout) * 0.7;
    }
  }`,

  // Painted grass: soft tonal patches covered by layers of hand-drawn blade strokes
  grass: /* glsl */`
  float blade(vec2 uv, float density, float layer, out float shade) {
    vec2 g = uv * density;
    vec2 id = floor(g);
    float best = 0.0; shade = 0.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 cid = id + vec2(float(x), float(y));
      vec2 wid = mod(cid, density);
      vec2 o = hash22(wid + layer * 13.1);
      vec2 base = cid + o;
      float ang = (hash12(wid + layer * 3.7) - 0.5) * 0.9;
      vec2 dir = vec2(sin(ang), cos(ang));
      float len = 0.9 + 0.7 * hash12(wid * 1.3 + layer);
      vec2 d = g - base;
      float t = clamp(dot(d, dir) / len, 0.0, 1.0);
      vec2 closest = dir * t * len;
      float w = 0.13 * (1.0 - t);
      float dist = length(d - closest);
      float m = 1.0 - smoothstep(w * 0.6, w, dist);
      if (m > best) { best = m; shade = t; }
    }
    return best;
  }
  void surf(vec2 uv, out vec3 col, out float h) {
    float big = fbm(uv, 3.0, 4) * 0.5 + 0.5;
    float mid = fbm(uv + 0.4, 9.0, 3) * 0.5 + 0.5;
    col = mix(c2, c0, paint(smoothstep(0.25, 0.75, big * 0.7 + mid * 0.4), 3.0));
    h = big * 0.3;
    float sh;
    float b1 = blade(uv, 36.0, 1.0, sh);
    col = mix(col, mix(c2, c0, 0.4 + 0.6 * sh), b1 * 0.85);
    h += b1 * 0.3 * sh;
    float b2 = blade(uv + 0.37, 52.0, 2.0, sh);
    col = mix(col, mix(c0, c1, sh), b2 * 0.9);
    h += b2 * 0.4 * sh;
    vec3 fv = voronoi(uv, 20.0, 1.0);
    float isF = fv.z > 0.955 ? 1.0 : 0.0;
    float petals = isF * (1.0 - smoothstep(0.1, 0.13, fv.x));
    float rim = isF * (1.0 - smoothstep(0.13, 0.16, fv.x)) - petals;
    float fcenter = isF * (1.0 - smoothstep(0.0, 0.045, fv.x));
    col = mix(col, c2 * 0.45, rim);
    col = mix(col, c3, petals);
    col = mix(col, vec3(1.0, 0.94, 0.55), fcenter);
    h += petals * 0.3;
  }`,

  // Tileable mask: R = large patch field, G = fine edge breakup, B = mid noise
  mask: /* glsl */`
  void surf(vec2 uv, out vec3 col, out float h) {
    float a = fbm(uv, 2.0, 5) * 0.5 + 0.5;
    float b = fbm(uv + 0.31, 16.0, 3) * 0.5 + 0.5;
    float c = fbm(uv + 0.77, 6.0, 4) * 0.5 + 0.5;
    col = vec3(a, b, c);
    h = a;
  }`,

  // Cliff faces: vertical painted rock columns with a dirt/grass lip at the top (v=0)
  cliff: /* glsl */`
  void surf(vec2 uv, out vec3 col, out float h) {
    float cols = 10.0;
    float warpX = sfbm(uv, 3.0, 2.0, 3) * 0.06;
    float x = uv.x + warpX;
    float ci = floor(x * cols);
    float cf = fract(x * cols);
    float tone = hash12(vec2(mod(ci, cols), 5.0));
    // each column: lit left facet, shaded right facet
    float facet = smoothstep(0.45, 0.55, cf + (tone - 0.5) * 0.4);
    col = mix(c0, c1, tone * 0.7);
    col = mix(col * 1.08, col * 0.78, facet);
    float streak = sfbm(uv + tone, 40.0, 4.0, 3) * 0.5 + 0.5;
    col *= 0.9 + 0.16 * streak;
    // horizontal ledges here and there
    float ledge = smoothstep(0.92, 1.0, sin((uv.y + tone * 0.3) * 6.2831 * 3.0) * 0.5 + 0.5) * step(0.5, tone);
    col = mix(col, c2, ledge * 0.6);
    // inked crack between columns
    float crack = 1.0 - smoothstep(0.0, 0.04, min(cf, 1.0 - cf));
    col = mix(col, c3, crack * 0.85);
    h = (1.0 - facet) * 0.4 + streak * 0.3 + ledge * 0.2 - crack * 0.5;
    // soil and grass lip
    float lip = 0.09 + 0.05 * (pnoise(vec2(uv.x * 20.0, 0.5), vec2(20.0, 1.0)) * 0.5 + 0.5) + 0.04 * step(0.75, hash12(vec2(floor(uv.x * 40.0), 2.0)));
    float soil = 1.0 - smoothstep(lip + 0.05, lip + 0.08, uv.y);
    col = mix(col, mix(c2, c3, 0.35), soil * 0.7);
    float g = 1.0 - smoothstep(lip - 0.01, lip, uv.y);
    vec3 grassCol = mix(c4, c5, sfbm(uv, 30.0, 8.0, 2) * 0.5 + 0.5);
    col = mix(col, grassCol, g * uMode);
    h = mix(h, 0.9, g * uMode);
  }`,

  // Underside rock: darker vertical strata
  rock: /* glsl */`
  void surf(vec2 uv, out vec3 col, out float h) {
    float cols = 7.0;
    float x = uv.x + sfbm(uv, 2.0, 3.0, 3) * 0.08;
    float ci = floor(x * cols);
    float cf = fract(x * cols);
    float tone = hash12(vec2(mod(ci, cols), 9.0));
    col = mix(c0, c1, tone);
    float facet = smoothstep(0.4, 0.6, cf + (tone - 0.5) * 0.5);
    col = mix(col, col * 0.75, facet);
    col *= 0.88 + 0.18 * (sfbm(uv + tone, 30.0, 3.0, 3) * 0.5 + 0.5);
    float crack = 1.0 - smoothstep(0.0, 0.05, min(cf, 1.0 - cf));
    col = mix(col, c3, crack * 0.8);
    h = (1.0 - facet) * 0.5 - crack * 0.5 + 0.3;
  }`,

  wood: /* glsl */`
  void surf(vec2 uv, out vec3 col, out float h) {
    float rows = 4.0;
    float row = floor(uv.y * rows);
    float ry = fract(uv.y * rows);
    float off = hash12(vec2(row, 7.0));
    float px = fract(uv.x * 2.0 + off);
    float pid = floor(uv.x * 2.0 + off);
    float seamY = 1.0 - smoothstep(0.0, 0.06, min(ry, 1.0 - ry));
    float seamX = 1.0 - smoothstep(0.0, 0.015, min(px, 1.0 - px));
    float grain = sfbm(vec2(uv.x, uv.y + pid * 0.37), 4.0, 64.0, 3) * 0.5 + 0.5;
    float tone = hash12(vec2(row, pid));
    col = mix(c0, c1, tone * 0.6 + grain * 0.3);
    col = mix(col, c2, smoothstep(0.6, 0.8, grain) * 0.25);
    col = mix(col, c3, max(seamX, seamY) * 0.85);
    h = 0.7 - max(seamX, seamY) * 0.6 + grain * 0.2;
  }`,

  cobble: /* glsl */`
  void surf(vec2 uv, out vec3 col, out float h) {
    vec3 v = voronoi(uv, 9.0, 0.85);
    float stone = smoothstep(0.03, 0.12, v.y - v.x);
    col = mix(c0, c1, v.z);
    col *= 0.9 + 0.15 * paint(fbm(uv, 18.0, 3) * 0.5 + 0.5, 3.0);
    col = mix(c2, col, stone);
    h = stone * (0.6 + 0.3 * v.z);
  }`,

  panel: /* glsl */`
  void surf(vec2 uv, out vec3 col, out float h) {
    vec2 g = fract(uv * vec2(4.0, 4.0));
    float seam = 1.0 - smoothstep(0.0, 0.014, min(min(g.x, 1.0 - g.x), min(g.y, 1.0 - g.y)));
    float tone = hash12(floor(uv * 4.0));
    col = mix(c0, c1, tone * 0.25);
    col = mix(col, c2, seam * 0.7);
    h = 1.0 - seam * 0.6;
  }`,

  caverock: /* glsl */`
  void surf(vec2 uv, out vec3 col, out float h) {
    vec3 v = voronoi(uv, 5.0, 0.9);
    vec3 v2 = voronoi(uv + 0.5, 14.0, 0.9);
    float e = smoothstep(0.0, 0.16, v.y - v.x);
    float e2 = smoothstep(0.0, 0.06, v2.y - v2.x);
    col = mix(c1, c0, paint(v.z * 0.5 + 0.3 * (fbm(uv, 8.0, 4) * 0.5 + 0.5), 3.0));
    col = mix(col, c2, (1.0 - e2) * 0.35);
    col = mix(c3, col, e * 0.85 + 0.15);
    h = e * 0.6 + e2 * 0.3;
  }`,
};

// Painted deep-space backdrop: gradient, domain-warped nebula swirls, stars and planets
const SPACE_FRAG = LIB + /* glsl */`
uniform vec3 cTop, cMid, cBot, cNeb1, cNeb2, cStar;
uniform vec4 uPlanet1; // x, y, r, ring
uniform vec4 uPlanet2;
uniform vec3 cP1a, cP1b, cP2a, cP2b;
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  float a = hash12(i), b = hash12(i+vec2(1,0)), c = hash12(i+vec2(0,1)), d = hash12(i+vec2(1,1));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }
float nfbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { s += a * vn(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
vec3 planet(vec2 p, vec4 P, vec3 ca, vec3 cb, inout float cover) {
  vec2 d = (p - P.xy) / P.z;
  float r = length(d);
  vec3 col = vec3(0.0);
  // ring behind/front (simple tilted ellipse band)
  if (P.w > 0.5) {
    vec2 rd = vec2(d.x * 0.92 + d.y * 0.38, (d.y - d.x * 0.38) * 3.2);
    float rr = length(rd);
    float ring = smoothstep(1.35, 1.38, rr) * (1.0 - smoothstep(1.8, 1.83, rr));
    float front = step(0.0, -rd.y) + step(1.0, r);
    float ra = ring * front;
    col = mix(col, mix(cb, vec3(1.0), 0.25) * (0.8 + 0.2 * sin(rr * 40.0)), ra);
    cover = max(cover, ra * 0.95);
  }
  if (r < 1.0) {
    vec3 n = vec3(d, sqrt(1.0 - r * r));
    float lit = clamp(dot(n, normalize(vec3(-0.6, 0.5, 0.6))), 0.0, 1.0);
    float bands = nfbm(vec2(d.x * 2.0, d.y * 7.0) + P.xy * 10.0);
    vec3 base = mix(ca, cb, smoothstep(0.35, 0.7, bands));
    float shadeStep = 0.35 + 0.65 * smoothstep(0.08, 0.16, lit);
    vec3 pc = base * shadeStep;
    pc = mix(pc, pc * 0.45, smoothstep(0.93, 1.0, r));
    float inPlanet = 1.0 - smoothstep(0.985, 1.0, r);
    col = mix(col, pc, inPlanet);
    cover = max(cover, inPlanet);
  }
  return col;
}
void main() {
  vec2 uv = vUv;
  vec2 p = vec2(uv.x * uAspect, uv.y);
  vec3 col = mix(cBot, cMid, smoothstep(0.0, 0.55, uv.y));
  col = mix(col, cTop, smoothstep(0.55, 1.0, uv.y));
  vec2 q = vec2(nfbm(p * 2.2 + uSeed), nfbm(p * 2.2 + vec2(5.2, 1.3)));
  vec2 r = vec2(nfbm(p * 2.2 + 3.5 * q + vec2(1.7, 9.2)), nfbm(p * 2.2 + 3.5 * q + vec2(8.3, 2.8)));
  float f = nfbm(p * 2.0 + 2.8 * r);
  float neb = smoothstep(0.45, 0.85, f);
  float swirl = smoothstep(0.52, 0.56, f) * (1.0 - smoothstep(0.6, 0.66, f));
  col = mix(col, cNeb1, neb * 0.5);
  col = mix(col, cNeb2, smoothstep(0.55, 0.9, length(q)) * neb * 0.45);
  col = mix(col, mix(cNeb1, vec3(1.0), 0.2), swirl * 0.12);
  // stars: three layers of crisp dots
  for (int k = 0; k < 3; k++) {
    float scale = 90.0 + float(k) * 140.0;
    vec2 g = p * scale;
    vec2 id = floor(g);
    vec2 o = hash22(id + float(k) * 17.0);
    float hv = hash12(id * 1.7 + float(k));
    if (hv > 0.9 - float(k) * 0.02) {
      float d = length(fract(g) - o);
      float sz = 0.06 + 0.1 * hash12(id + 3.3) * (1.0 - float(k) * 0.3);
      float s = 1.0 - smoothstep(sz * 0.6, sz, d);
      col = mix(col, cStar, s * (0.6 + 0.4 * hv));
    }
  }
  float cover = 0.0;
  vec3 pc1 = planet(p, uPlanet1, cP1a, cP1b, cover);
  col = mix(col, pc1, cover);
  if (uPlanet2.z > 0.0) { float c2c = 0.0; vec3 pc2 = planet(p, uPlanet2, cP2a, cP2b, c2c); col = mix(col, pc2, c2c); }
  gl_FragColor = vec4(toLin(col), 1.0);
}`;

const vert = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

function makeFrag(recipe, mode) {
  const body = RECIPES[recipe];
  if (mode === 'albedo') return LIB + body + `\nvoid main(){ vec3 col; float h; surf(vUv, col, h); gl_FragColor = vec4(toLin(col), 1.0); }`;
  if (mode === 'raw') return LIB + body + `\nvoid main(){ vec3 col; float h; surf(vUv, col, h); gl_FragColor = vec4(col, h); }`;
  return LIB + body + `
  uniform float uTexel, uStrength;
  void main(){
    vec3 c; float h0, hx, hy, hx2, hy2;
    surf(vUv + vec2(uTexel, 0.0), c, hx);
    surf(vUv + vec2(0.0, uTexel), c, hy);
    surf(vUv - vec2(uTexel, 0.0), c, hx2);
    surf(vUv - vec2(0.0, uTexel), c, hy2);
    vec3 n = normalize(vec3((hx2 - hx) * uStrength, (hy2 - hy) * uStrength, 1.0));
    gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
  }`;
}

const bakeScene = new THREE.Scene();
const bakeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
quad.frustumCulled = false;
bakeScene.add(quad);
const matCache = new Map();
const texCache = new Map();

function baseUniforms() {
  return {
    c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
    c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, c5: { value: new THREE.Color() },
    uSeed: { value: 0 }, uMode: { value: 0 }, uAspect: { value: 1 }, uTexel: { value: 1 / 1024 }, uStrength: { value: 2 },
  };
}

function material(recipe, mode) {
  const key = recipe + ':' + mode;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: makeFrag(recipe, mode), uniforms: baseUniforms(), depthTest: false, depthWrite: false }));
  }
  return matCache.get(key);
}

function setUniforms(mat, colors, opts) {
  const u = mat.uniforms;
  const cols = [...colors];
  while (cols.length < 6) cols.push(cols[cols.length - 1] ?? 0xffffff);
  // colors are given in sRGB hex and converted to linear inside the shader via toLin, so pass raw sRGB here
  for (let i = 0; i < 6; i++) u['c' + i].value.setHex(cols[i], THREE.LinearSRGBColorSpace);
  u.uSeed.value = opts.seed ?? 1;
  u.uMode.value = opts.mode ?? 0;
}

function bakeTarget(mat, w, h, srgb, mips = true) {
  const renderer = R.renderer;
  const rt = new THREE.WebGLRenderTarget(w, h, {
    generateMipmaps: mips,
    minFilter: mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping,
    colorSpace: srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace,
    depthBuffer: false,
  });
  rt.texture.anisotropy = R.q.aniso;
  quad.material = mat;
  const prevTarget = renderer.getRenderTarget();
  const prevTone = renderer.toneMapping;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setRenderTarget(rt);
  renderer.render(bakeScene, bakeCam);
  renderer.setRenderTarget(prevTarget);
  renderer.toneMapping = prevTone;
  rt.texture.userData.rt = rt;
  return rt.texture;
}

const maskData = new Map();
/** CPU sampler matching the island splat shader's grass mask (reads the baked mask back once). */
export function grassSampler(maskTex, grassAmt) {
  let data = maskData.get(maskTex);
  if (!data) {
    const rt = maskTex.userData.rt;
    data = { w: rt.width, h: rt.height, px: new Uint8Array(rt.width * rt.height * 4) };
    R.renderer.readRenderTargetPixels(rt, 0, 0, rt.width, rt.height, data.px);
    maskData.set(maskTex, data);
  }
  const samp = (u, v, ch) => {
    const x = ((Math.floor(u * data.w) % data.w) + data.w) % data.w;
    const y = ((Math.floor(v * data.h) % data.h) + data.h) % data.h;
    return data.px[(y * data.w + x) * 4 + ch] / 255;
  };
  // returns m - 0.5 (positive = grass), same formula as the shader
  return (x, z, bias = 0) => {
    const r = samp(x / 28, z / 28, 0), b = samp(x / 28, z / 28, 2), g2 = samp(x / 4.5, z / 4.5, 1);
    return (r - 0.5) * 2.2 + (g2 - 0.5) * 0.22 + (b - 0.5) * 0.35 + grassAmt + bias - 0.5;
  };
}

/** Bakes albedo + normal for a recipe. colors: array of sRGB hex. opts: { size, mode, seed, strength, key, noNormal, raw } */
export function bake(recipe, colors, opts = {}) {
  const key = opts.key || `${recipe}|${colors.join(',')}|${opts.mode || 0}|${opts.seed || 1}|${opts.size}`;
  if (texCache.has(key)) return texCache.get(key);
  const size = opts.size || R.q.tex;
  const am = material(recipe, opts.raw ? 'raw' : 'albedo');
  setUniforms(am, colors, opts);
  const map = bakeTarget(am, size, size, !opts.raw);
  let normalMap = null;
  if (!opts.noNormal) {
    const nsize = Math.min(size, 2048);
    const nm = material(recipe, 'normal');
    setUniforms(nm, colors, opts);
    nm.uniforms.uTexel.value = 1 / nsize;
    nm.uniforms.uStrength.value = (opts.strength ?? 2.5) * (nsize / 1024);
    normalMap = bakeTarget(nm, nsize, nsize, false);
  }
  const out = { map, normalMap };
  texCache.set(key, out);
  return out;
}

const GROUND_MODES = { grass: 0, sand: 1, snow: 2, moss: 3, ash: 4, metal: 5, tiles: 6 };

/** All the island textures for a biome. */
export function biomeTextures(biome, key) {
  const g = biome.grass, cl = biome.cliff, rk = biome.rock, gr = biome.dirt || [cl[2], rk[0], cl[0], cl[3]];
  const mode = GROUND_MODES[biome.ground] ?? 0;
  let groundCols;
  if (biome.ground === 'tiles') groundCols = [rk[0], cl[2], g[2], cl[3]];
  else if (biome.ground === 'metal') groundCols = [g[0], g[1], g[2], g[3]];
  else if (biome.ground === 'snow' || biome.ground === 'ash') groundCols = g;
  else groundCols = gr;
  const lip = biome.cliffGrass ? 1 : 0;
  return {
    ground: bake('ground', groundCols, { size: R.q.terrain, mode: biome.ground === 'grass' ? 0 : mode, seed: 3, strength: 2.0, key: key + ':ground' }),
    grass: bake('grass', [g[0], g[1], g[2], g[3]], { size: Math.min(R.q.terrain, 2048), seed: 4, strength: 2.2, key: key + ':grass' }),
    mask: bake('mask', [0], { size: 512, seed: 9, raw: true, noNormal: true, key: key + ':mask' }),
    cliff: bake('cliff', [cl[0], cl[1], cl[2], cl[3], g[0], g[2]], { size: Math.min(R.q.terrain, 2048), seed: 5, strength: 3, mode: lip, key: key + ':cliff' }),
    rock: bake('rock', [rk[0], rk[1], cl[1], cl[3]], { size: Math.min(R.q.tex, 2048), seed: 7, strength: 3, key: key + ':rock' }),
  };
}

export function commonTextures() {
  return {
    wood: bake('wood', [0xc8894a, 0xa86a34, 0x8a5428, 0x3a2010], { seed: 11, strength: 2, key: 'wood', size: Math.min(R.q.tex, 2048) }),
    darkwood: bake('wood', [0x8a5a3a, 0x6a4028, 0x5a3420, 0x22120a], { seed: 12, strength: 2, key: 'darkwood', size: Math.min(R.q.tex, 2048) }),
    cobble: bake('cobble', [0xd8d0c0, 0xa8a090, 0x5a5248], { seed: 13, strength: 3, key: 'cobble', size: Math.min(R.q.tex, 2048) }),
    panel: bake('panel', [0xf4f6fa, 0xe0e6ee, 0x8a94a4], { seed: 14, strength: 1.5, size: Math.min(R.q.tex, 1024), key: 'panel' }),
    metal: bake('ground', [0x6a7484, 0x7a8494, 0x2a3240, 0x9aa4b4], { seed: 15, strength: 1.5, mode: 5, size: Math.min(R.q.tex, 1024), key: 'metal-deck' }),
  };
}

export function caveTextures(colors, key) {
  return bake('caverock', colors, { size: Math.min(R.q.tex, 2048), seed: 31, strength: 3.5, key: 'cave:' + key });
}

const spaceMat = new THREE.ShaderMaterial({
  vertexShader: vert, fragmentShader: SPACE_FRAG, depthTest: false, depthWrite: false,
  uniforms: {
    ...baseUniforms(),
    cTop: { value: new THREE.Color() }, cMid: { value: new THREE.Color() }, cBot: { value: new THREE.Color() },
    cNeb1: { value: new THREE.Color() }, cNeb2: { value: new THREE.Color() }, cStar: { value: new THREE.Color() },
    uPlanet1: { value: new THREE.Vector4() }, uPlanet2: { value: new THREE.Vector4() },
    cP1a: { value: new THREE.Color() }, cP1b: { value: new THREE.Color() }, cP2a: { value: new THREE.Color() }, cP2b: { value: new THREE.Color() },
  },
});
let spaceTex = null;
/** Paints the space backdrop at screen resolution. space: { top, mid, bot, neb1, neb2, star, planets: [{x,y,r,ring,a,b}] } */
export function bakeSpace(space, w, h, seed = 1) {
  const u = spaceMat.uniforms;
  const set = (k, hex) => u[k].value.setHex(hex, THREE.LinearSRGBColorSpace);
  set('cTop', space.top); set('cMid', space.mid); set('cBot', space.bot);
  set('cNeb1', space.neb1); set('cNeb2', space.neb2); set('cStar', space.star ?? 0xffffff);
  u.uSeed.value = seed;
  u.uAspect.value = w / h;
  const P = space.planets || [];
  const pl = (i, k) => {
    const p = P[i];
    if (!p) { u[k].value.set(0, 0, 0, 0); return; }
    u[k].value.set(p.x * (w / h), p.y, p.r, p.ring ? 1 : 0);
    set(i === 0 ? 'cP1a' : 'cP2a', p.a);
    set(i === 0 ? 'cP1b' : 'cP2b', p.b);
  };
  pl(0, 'uPlanet1');
  pl(1, 'uPlanet2');
  if (spaceTex) spaceTex.dispose();
  spaceTex = bakeTarget(spaceMat, w, h, true, false);
  spaceTex.wrapS = spaceTex.wrapT = THREE.ClampToEdgeWrapping;
  return spaceTex;
}
