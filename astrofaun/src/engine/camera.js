// Isometric orthographic camera with smooth follow, pan, zoom and yaw rotation.
import { THREE } from '../render/renderer.js';
import { clamp, damp } from '../core/util.js';

export class IsoCamera {
  constructor() {
    this.cam = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 400);
    this.target = new THREE.Vector3();
    this.goal = new THREE.Vector3();
    this.yaw = Math.PI / 4;
    this.yawGoal = this.yaw;
    this.pitch = 0.6;
    this.half = 7.5; // half frustum height at zoom 1
    this.zoom = 1;
    this.zoomGoal = 1;
    this.minZoom = 0.45;
    this.maxZoom = 2.6;
    this.bounds = null;
    this.follow = null;
    this.followLag = 6;
    this.w = 1; this.h = 1;
    this._ray = new THREE.Raycaster();
    this._v = new THREE.Vector3();
  }

  resize(w, h) {
    this.w = w; this.h = h;
    this.apply();
  }

  setBounds(minX, maxX, minZ, maxZ) { this.bounds = { minX, maxX, minZ, maxZ }; }

  snapTo(p) { this.goal.copy(p); this.target.copy(p); this.apply(); }

  rotateBy(d) { this.yawGoal += d; }
  rotateStep(dir) { this.yawGoal = Math.round((this.yawGoal - Math.PI / 4) / (Math.PI / 2)) * (Math.PI / 2) + Math.PI / 4 + dir * Math.PI / 2; }
  zoomBy(f) { this.zoomGoal = clamp(this.zoomGoal * f, this.minZoom, this.maxZoom); }

  worldPerPx() { return (2 * this.half) / this.zoom / this.h; }

  /** Pan by a screen-space delta in pixels (drag). */
  pan(dx, dy) {
    const k = this.worldPerPx();
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    // vertical screen movement covers more ground because of the pitch
    const fk = 1 / Math.sin(this.pitch);
    this.goal.addScaledVector(right, -dx * k).addScaledVector(fwd, dy * k * fk);
    this.follow = null;
    this.clampGoal();
  }

  clampGoal() {
    if (!this.bounds) return;
    const b = this.bounds;
    this.goal.x = clamp(this.goal.x, b.minX, b.maxX);
    this.goal.z = clamp(this.goal.z, b.minZ, b.maxZ);
  }

  update(dt) {
    if (this.follow) {
      this.goal.set(this.follow.position.x, this.follow.position.y, this.follow.position.z);
      this.clampGoal();
    }
    const lam = this.follow ? this.followLag : 14;
    this.target.x = damp(this.target.x, this.goal.x, lam, dt);
    this.target.y = damp(this.target.y, this.goal.y, lam, dt);
    this.target.z = damp(this.target.z, this.goal.z, lam, dt);
    this.yaw = damp(this.yaw, this.yawGoal, 10, dt);
    this.zoom = damp(this.zoom, this.zoomGoal, 12, dt);
    this.apply();
  }

  apply() {
    const a = this.w / this.h;
    const hh = this.half / this.zoom;
    this.cam.left = -hh * a; this.cam.right = hh * a; this.cam.top = hh; this.cam.bottom = -hh;
    this.cam.updateProjectionMatrix();
    const d = 80;
    this.cam.position.set(
      this.target.x + Math.sin(this.yaw) * Math.cos(this.pitch) * d,
      this.target.y + Math.sin(this.pitch) * d,
      this.target.z + Math.cos(this.yaw) * Math.cos(this.pitch) * d,
    );
    this.cam.lookAt(this.target);
    this.cam.updateMatrixWorld();
  }

  /** Screen projection: returns { x, y, visible } in CSS pixels */
  project(p, out = {}) {
    this._v.set(p.x, p.y, p.z).project(this.cam);
    out.x = (this._v.x * 0.5 + 0.5) * this.w;
    out.y = (-this._v.y * 0.5 + 0.5) * this.h;
    out.visible = this._v.z < 1 && out.x > -100 && out.x < this.w + 100 && out.y > -100 && out.y < this.h + 100;
    return out;
  }

  raycaster(x, y) {
    const ndc = new THREE.Vector2((x / this.w) * 2 - 1, -(y / this.h) * 2 + 1);
    this._ray.setFromCamera(ndc, this.cam);
    return this._ray;
  }

  /** Intersect the screen point with a horizontal plane at height y. */
  groundPoint(x, y, planeY = 0) {
    const ray = this.raycaster(x, y).ray;
    const t = (planeY - ray.origin.y) / ray.direction.y;
    if (!isFinite(t)) return null;
    return ray.origin.clone().addScaledVector(ray.direction, t);
  }

  /** Camera-relative movement directions on the ground plane (for keyboard movement) */
  axes() {
    return {
      right: new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)),
      fwd: new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)),
    };
  }
}
