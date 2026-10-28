// Base class for walkable island scenes (home island, planets, caves).
import { THREE, envFor, makeLights } from '../render/renderer.js';
import { bakeSpace } from '../render/textures.js';
import { makeCharacter, animateCharacter } from '../render/characters.js';
import { makeBeast, animateBeast } from '../render/beastMesh.js';
import { findPath, adjacentCell } from '../engine/pathfind.js';
import { S, partyBeasts, busyReason } from '../game/state.js';
import { clamp, damp, randRange } from '../core/util.js';
import { anchor, h, I } from '../ui/ui.js';

export class WorldScene {
  constructor(game) {
    this.game = game;
    this.scene = new THREE.Scene();
    this.pickRoot = new THREE.Group();
    this.scene.add(this.pickRoot);
    this.ground = [];
    this.walkSet = new Set();
    this.blocked = new Set();
    this.heights = new Map();
    this.pickables = [];
    this.wanderers = [];
    this.characters = [];
    this.markers = [];
    this.time = 0;
    this.path = null;
    this.pending = null;
    this.avatar = null;
    this.follower = null;
    this.trail = [];
    this.speed = 3.4;
  }

  // ---------------------------------------------------------------- setup helpers
  setupSky(biomeKey, biome) {
    this.biome = biome;
    this.biomeKey = biomeKey;
    this.scene.environment = envFor(biomeKey, biome);
    this.lights = makeLights(this.scene, biome);
    this.paintBackground();
  }

  paintBackground() {
    const w = Math.min(2560, Math.round(this.game.width * Math.min(2, devicePixelRatio || 1)));
    const h = Math.min(1600, Math.round(this.game.height * Math.min(2, devicePixelRatio || 1)));
    this.scene.background = bakeSpace(this.biome.space, w, h, (this.biomeKey.length * 7) % 13);
  }

  onResize() { if (this.biome) this.paintBackground(); }

  key(x, z) { return x + ',' + z; }
  walkable(x, z) { const k = x + ',' + z; return this.walkSet.has(k) && !this.blocked.has(k); }
  heightAt(x, z) {
    const k = Math.floor(x) + ',' + Math.floor(z);
    const fn = this.heights.get(k);
    return fn ? fn(x, z) : 0;
  }
  addWalk(cells, heightFn) { for (const c of cells) { this.walkSet.add(c); this.heights.set(c, heightFn); } }

  spawnAvatar(x, z) {
    this.avatar = makeCharacter(S.player.look, 'player');
    this.avatar.position.set(x + 0.5, this.heightAt(x + 0.5, z + 0.5), z + 0.5);
    this.scene.add(this.avatar);
    this.cell = [x, z];
    this.refreshFollower();
    this.game.iso.follow = this.avatar;
    this.game.iso.snapTo(this.avatar.position);
  }

  refreshFollower() {
    const lead = partyBeasts().find((b) => b.hp > 0 && !busyReason(b.uid));
    const sp = lead?.sp;
    if (this.follower && this.follower.userData.spId === sp && this.follower.userData.variant === lead?.variant) return;
    if (this.follower) { this.scene.remove(this.follower); this.follower = null; }
    if (!lead || !this.avatar) return;
    this.follower = makeBeast(lead.sp, lead.variant);
    this.follower.userData.variant = lead.variant;
    this.follower.scale.multiplyScalar(0.85);
    this.follower.position.copy(this.avatar.position).add(new THREE.Vector3(-0.8, 0, -0.8));
    this.scene.add(this.follower);
  }

  // ---------------------------------------------------------------- pickables
  /** rec: { obj, cell:[x,z], kind, label, interact(), radius, blocks, bubble } */
  addPickable(rec) {
    rec.obj.traverse((o) => { o.userData.pickRec = rec; });
    this.pickRoot.add(rec.obj);
    this.pickables.push(rec);
    if (rec.blocks !== false && rec.cells) for (const c of rec.cells) this.blocked.add(c);
    else if (rec.blocks !== false && rec.cell) this.blocked.add(this.key(rec.cell[0], rec.cell[1]));
    return rec;
  }

  removePickable(rec) {
    const i = this.pickables.indexOf(rec);
    if (i >= 0) this.pickables.splice(i, 1);
    rec.obj.removeFromParent();
    if (rec.cells) for (const c of rec.cells) this.blocked.delete(c);
    else if (rec.cell) this.blocked.delete(this.key(rec.cell[0], rec.cell[1]));
    rec.marker?.();
    rec.removed = true;
  }

  pick(x, y) {
    const ray = this.game.iso.raycaster(x, y);
    const hits = ray.intersectObjects(this.pickRoot.children, true);
    for (const hit of hits) {
      if (hit.object.userData.isOutlineMesh) continue;
      const rec = hit.object.userData.pickRec;
      if (rec && !rec.removed) return { rec, point: hit.point };
    }
    // wanderers (wild beasts) are picked by proximity of the projected position
    let best = null, bd = 48;
    for (const w of this.wanderers) {
      if (!w.rec || w.rec.removed) continue;
      const s = this.game.iso.project(w.obj.position.clone().add(new THREE.Vector3(0, 0.4, 0)));
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < bd) { bd = d; best = w.rec; }
    }
    if (best) return { rec: best };
    const gh = ray.intersectObjects(this.ground, false);
    if (gh.length) return { ground: gh[0].point };
    return null;
  }

  onTap(x, y) {
    const hit = this.pick(x, y);
    if (!hit) return;
    if (hit.rec) return this.goInteract(hit.rec);
    if (hit.ground) this.walkTo(Math.floor(hit.ground.x), Math.floor(hit.ground.z));
  }

  walkTo(tx, tz, then = null) {
    if (!this.avatar) return false;
    const [sx, sz] = this.cell;
    if (!this.walkable(tx, tz)) {
      const adj = adjacentCell(tx, tz, sx, sz, (x, z) => this.walkable(x, z), 1);
      if (!adj) return false;
      [tx, tz] = adj;
    }
    const path = findPath(sx, sz, tx, tz, (x, z) => this.walkable(x, z) || (x === sx && z === sz));
    if (!path) return false;
    this.path = path.slice(1);
    this.pending = then;
    if (!this.path.length && then) { this.pending = null; then(); }
    return true;
  }

  goInteract(rec) {
    const [sx, sz] = this.cell;
    const [tx, tz] = rec.cell || [Math.floor(rec.obj.position.x), Math.floor(rec.obj.position.z)];
    const reach = rec.reach ?? 1.6;
    const near = () => Math.hypot(this.avatar.position.x - (tx + 0.5), this.avatar.position.z - (tz + 0.5)) <= reach;
    const act = () => { this.face(rec.obj.position); rec.interact?.(); };
    if (near()) return act();
    // stand on the closest reachable cell around the target
    let goal = null, bd = Infinity;
    const r = Math.ceil(reach);
    const cells = rec.cells ? rec.cells.map((c) => c.split(',').map(Number)) : [[tx, tz]];
    for (const [cx, cz] of cells) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx, z = cz + dz;
      if (!this.walkable(x, z) && !(x === sx && z === sz)) continue;
      if (Math.hypot(dx, dz) > reach) continue;
      const d = Math.hypot(x - sx, z - sz);
      if (d < bd) { bd = d; goal = [x, z]; }
    }
    if (!goal) { this.game.toast('Can\'t reach that from here.', 'warn'); return; }
    this.walkTo(goal[0], goal[1], act);
  }

  face(p) {
    if (!this.avatar) return;
    const dx = p.x - this.avatar.position.x, dz = p.z - this.avatar.position.z;
    if (Math.abs(dx) + Math.abs(dz) > 0.01) this.avatar.rotation.y = Math.atan2(dx, dz);
  }

  // ---------------------------------------------------------------- markers
  addMarker(getPos, iconName, offset = 0, opts = {}) {
    const el = h('div', { class: 'marker' }, I(iconName, opts));
    const off = anchor(el, getPos, offset);
    this.markers.push(off);
    return off;
  }

  addBubble(getPos, content, onClick, cls = '', offset = 0) {
    const el = h('div', { class: 'bubble ' + cls, onpointerdown: (e) => e.stopPropagation(), onclick: (e) => { e.stopPropagation(); onClick?.(); } }, content);
    const off = anchor(el, getPos, offset);
    this.markers.push(off);
    return off;
  }

  clearMarkers() { for (const m of this.markers) m(); this.markers = []; }

  // ---------------------------------------------------------------- wanderers
  /** w: { obj, cells:Set|array of keys, speed, rec?, onTouch? } */
  addWanderer(w) {
    w.cells = w.cells instanceof Set ? [...w.cells] : w.cells;
    w.wait = randRange(0.5, 3);
    w.goal = null;
    w.speed = w.speed ?? 1.1;
    this.scene.add(w.obj);
    this.wanderers.push(w);
    return w;
  }

  removeWanderer(w) {
    const i = this.wanderers.indexOf(w);
    if (i >= 0) this.wanderers.splice(i, 1);
    w.obj.removeFromParent();
    w.marker?.();
  }

  updateWanderers(dt) {
    for (const w of this.wanderers) {
      const o = w.obj;
      let mode = 'idle';
      if (w.frozen) { animateBeast(o, this.time, dt, 'idle'); continue; }
      if (!w.goal) {
        w.wait -= dt;
        if (w.wait <= 0 && w.cells.length) {
          const c = w.cells[Math.floor(Math.random() * w.cells.length)].split(',').map(Number);
          w.goal = new THREE.Vector3(c[0] + 0.2 + Math.random() * 0.6, 0, c[1] + 0.2 + Math.random() * 0.6);
        }
      } else {
        const dx = w.goal.x - o.position.x, dz = w.goal.z - o.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.08) { w.goal = null; w.wait = randRange(1.5, 4.5); }
        else {
          const step = Math.min(d, w.speed * dt);
          o.position.x += (dx / d) * step;
          o.position.z += (dz / d) * step;
          const ang = Math.atan2(dx, dz);
          o.rotation.y = lerpAngle(o.rotation.y, ang, 1 - Math.exp(-8 * dt));
          mode = 'walk';
        }
      }
      o.position.y = this.heightAt(o.position.x, o.position.z);
      if (o.userData.anim?.rig) animateBeast(o, this.time, dt, mode);
      else animateCharacter(o, this.time, mode);
      if (w.onNear && this.avatar && !this.game.busy) {
        const d = Math.hypot(o.position.x - this.avatar.position.x, o.position.z - this.avatar.position.z);
        if (d < (w.nearDist ?? 0.95)) w.onNear(w);
      }
    }
  }

  // ---------------------------------------------------------------- update
  updateAvatar(dt) {
    if (!this.avatar) return;
    const a = this.avatar;
    let moving = false;
    // keyboard movement
    const ax = this.game.input.axis();
    if (ax.x || ax.y) {
      this.path = null; this.pending = null;
      const { right, fwd } = this.game.iso.axes();
      const dir = right.multiplyScalar(ax.x).add(fwd.multiplyScalar(ax.y)).normalize();
      const nx = a.position.x + dir.x * this.speed * dt, nz = a.position.z + dir.z * this.speed * dt;
      const tryMove = (x, z) => { if (this.walkable(Math.floor(x), Math.floor(z))) { a.position.x = x; a.position.z = z; return true; } return false; };
      if (!tryMove(nx, nz)) { if (!tryMove(nx, a.position.z)) tryMove(a.position.x, nz); }
      a.rotation.y = lerpAngle(a.rotation.y, Math.atan2(dir.x, dir.z), 1 - Math.exp(-12 * dt));
      moving = true;
      this.cell = [Math.floor(a.position.x), Math.floor(a.position.z)];
      this.game.iso.follow = a;
    } else if (this.path && this.path.length) {
      const [cx, cz] = this.path[0];
      const tx = cx + 0.5, tz = cz + 0.5;
      const dx = tx - a.position.x, dz = tz - a.position.z;
      const d = Math.hypot(dx, dz);
      const step = this.speed * dt;
      if (d <= step) {
        a.position.x = tx; a.position.z = tz;
        this.cell = [cx, cz];
        this.path.shift();
        if (!this.path.length) {
          this.path = null;
          const p = this.pending; this.pending = null;
          p?.();
        }
      } else {
        a.position.x += (dx / d) * step;
        a.position.z += (dz / d) * step;
        a.rotation.y = lerpAngle(a.rotation.y, Math.atan2(dx, dz), 1 - Math.exp(-14 * dt));
      }
      moving = true;
      this.game.iso.follow = a;
    }
    const gy = this.heightAt(a.position.x, a.position.z);
    a.position.y = damp(a.position.y, gy, 18, dt);
    animateCharacter(a, this.time, moving ? 'walk' : (this.swingT > 0 ? 'swing' : 'idle'));
    if (this.swingT > 0) this.swingT -= dt;
    if (moving) {
      const last = this.trail[this.trail.length - 1];
      if (!last || last.distanceTo(a.position) > 0.12) { this.trail.push(a.position.clone()); if (this.trail.length > 40) this.trail.shift(); }
      if (!this._steps) this._steps = 0;
      this._steps += dt;
    }
    // follower
    if (this.follower) {
      const f = this.follower;
      const tgt = this.trail.length > 8 ? this.trail[this.trail.length - 8] : null;
      let fm = 'idle';
      if (tgt) {
        const dx = tgt.x - f.position.x, dz = tgt.z - f.position.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.15) {
          const step = Math.min(d, (this.speed + (d > 1.5 ? 2 : 0)) * dt);
          f.position.x += (dx / d) * step; f.position.z += (dz / d) * step;
          f.rotation.y = lerpAngle(f.rotation.y, Math.atan2(dx, dz), 1 - Math.exp(-8 * dt));
          fm = 'walk';
        }
      }
      f.position.y = this.heightAt(f.position.x, f.position.z);
      animateBeast(f, this.time, dt, fm);
    }
  }

  update(dt) {
    this.time += dt;
    this.updateAvatar(dt);
    this.updateWanderers(dt);
    for (const c of this.characters) animateCharacter(c, this.time, 'idle');
    if (this.avatar) this.lights.follow(this.game.iso.target);
  }

  exit() {
    this.clearMarkers();
    for (const p of this.pickables) p.marker?.();
    for (const w of this.wanderers) w.marker?.();
  }
}

export function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * clamp(t, 0, 1);
}
