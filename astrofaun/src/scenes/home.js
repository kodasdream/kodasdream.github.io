// The player's home island: buildings, habitats, expansions, thick grass, helpers and build mode.
import { THREE } from '../render/renderer.js';
import { WorldScene } from './world.js';
import { BIOMES } from '../data/planets.js';
import { BUILDINGS, EXPANSIONS, homeRects } from '../data/buildings.js';
import { NPCS } from '../data/quests.js';
import { biomeTextures, grassSampler } from '../render/textures.js';
import { buildIsland, islandMaterials, blobCells } from '../render/island.js';
import { PropBatch, biomePropOpts, makeProp } from '../render/props.js';
import { makeBuilding } from '../render/buildingMesh.js';
import { makeCharacter } from '../render/characters.js';
import { makeBeast } from '../render/beastMesh.js';
import {
  S, homeCells, footprintCells, canPlace, placeBuilding, moveBuilding, jobDone, pendingIncome, collectIncome,
  useEnergy, addItem, questEvent, expansionState, buyExpansion, beast, givePlayerXp, save, missing,
} from '../game/state.js';
import { EGGS } from '../data/beasts.js';
import { RNG, bus, randInt } from '../core/util.js';
import { h, I, btn, costPills, toast, confirmBox, floatText, fmt } from '../ui/ui.js';
import { openBuildingPanel } from '../ui/buildingPanels.js';
import { talkTo, npcStatus } from '../ui/dialog.js';
import { count } from '../game/state.js';

export class HomeScene extends WorldScene {
  async enter(params = {}) {
    S.location = { scene: 'home', planet: null };
    const biome = BIOMES.home;
    this.setupSky('home', biome);
    const tex = biomeTextures(biome, 'home');
    this.mats = islandMaterials(tex, biome);
    this.gs = grassSampler(tex.mask.map, biome.grassAmt);
    this.buildIslandMesh();
    this.buildExpansionPlots();
    this.buildDecor();
    this.buildingObjs = new Map();
    for (const b of S.buildings) this.addBuildingObj(b);
    this.buildGrass();
    this.buildNpcs();
    const pad = S.buildings.find((b) => b.type === 'launch_pad');
    const spawn = params.spawn || (pad ? [pad.x + 1, pad.z + 3] : [0, 3]);
    let [sx, sz] = spawn;
    if (!this.walkable(sx, sz)) { const c = [...this.walkSet].find((k) => !this.blocked.has(k)).split(',').map(Number); [sx, sz] = c; }
    this.spawnAvatar(sx, sz);
    this.game.iso.setBounds(-14, 14, -14, 14);
    this.refreshResidents();
    this.offs = [
      bus.on('buildings', () => this.syncBuildings()),
      bus.on('beasts', () => { this.refreshResidents(); this.refreshFollower(); }),
    ];
    this.indicatorT = 0;
    this.updateIndicators();
  }

  exit() {
    super.exit();
    this.offs?.forEach((o) => o());
    this.cancelBuild();
  }

  buildIslandMesh() {
    if (this.island) { this.scene.remove(this.island.group); this.ground = this.ground.filter((g) => g !== this.island.top); }
    const set = homeCells();
    this.homeSet = set;
    const cells = [...set].map((k) => k.split(',').map(Number));
    this.island = buildIsland(cells, { mats: this.mats, seed: 11, depth: 6, thickness: 2.4, extend: 0.42, rough: 0.12, topAmp: 0.04,
      grassBias: (x, z) => 0.0 });
    this.scene.add(this.island.group);
    this.ground.push(this.island.top);
    this.walkSet = new Set();
    for (const k of set) { this.walkSet.add(k); this.heights.set(k, this.island.heightAt); }
  }

  buildExpansionPlots() {
    this.plots?.forEach((p) => this.removePickable(p));
    this.plots = [];
    const owned = new Set(S.expansions);
    for (const e of EXPANSIONS) {
      if (owned.has(e.id)) continue;
      const st = expansionState(e);
      if (st === 'locked') continue;
      const rect = homeRects([...S.expansions, e.id]).find((r) => r.id === e.id);
      const cells = [];
      for (let x = rect.x; x < rect.x + rect.w; x++) for (let z = rect.z; z < rect.z + rect.d; z++) cells.push([x, z]);
      const isl = buildIsland(cells, { mats: this.mats, seed: 30 + EXPANSIONS.indexOf(e), depth: 3, thickness: 1.6, extend: 0.2, rough: 0.3, topAmp: 0.05 });
      const off = new THREE.Vector3(e.dir[0] * 2.4, -1.6, e.dir[1] * 2.4);
      isl.group.position.copy(off);
      const cx = rect.x + rect.w / 2 + off.x, cz = rect.z + rect.d / 2 + off.z;
      const rec = this.addPickable({
        obj: isl.group, blocks: false, cell: [Math.floor(cx), Math.floor(cz)], reach: 99, kind: 'plot',
        interact: () => this.offerExpansion(e),
      });
      rec.anchor = new THREE.Vector3(cx, off.y + 0.6, cz);
      rec.marker = this.addBubble(() => rec.anchor, [I('plus'), 'Expand'], () => this.offerExpansion(e), 'green');
      rec.bob = Math.random() * 6;
      this.plots.push(rec);
    }
  }

  offerExpansion(e) {
    const p = confirmBox('Expand your island', h('div', {},
      h('p', {}, 'Dock this floating plot to your island for more building space.'),
      costPills(e.cost, count)), 'Buy plot', () => {
      if (buyExpansion(e.id)) {
        toast('Your island grew!', 'good');
        save();
        this.game.go('home', { spawn: this.cell });
      } else {
        const m = missing(e.cost);
        toast('Missing: ' + Object.entries(m).map(([k, v]) => `${v} ${k}`).join(', '), 'warn');
      }
    });
    return p;
  }

  buildDecor() {
    // a few distant floating rocks for depth
    const rng = new RNG(5);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      const d = rng.range(19, 26);
      const cells = blobCells(rng, rng.int(3, 6), rng.int(3, 5), 0.9);
      const isl = buildIsland(cells, { mats: this.mats, seed: 50 + i, depth: 2.5, thickness: 1.2, roots: false });
      isl.group.position.set(Math.cos(a) * d, rng.range(-7, -3), Math.sin(a) * d);
      this.scene.add(isl.group);
    }
    // trees and rocks around the rim where nothing is built
    const pb = new PropBatch({ ...biomePropOpts(BIOMES.home, 'home') });
    const occ = new Set();
    for (const b of S.buildings) for (const c of footprintCells(b)) occ.add(c);
    const r2 = new RNG(9);
    for (const k of this.homeSet) {
      const [x, z] = k.split(',').map(Number);
      const edge = ['-1,0', '1,0', '0,-1', '0,1'].some((d) => { const [dx, dz] = d.split(',').map(Number); return !this.homeSet.has((x + dx) + ',' + (z + dz)); });
      if (occ.has(k) || S.homeGrass.includes(k)) continue;
      const px = x + r2.range(0.2, 0.8), pz = z + r2.range(0.2, 0.8);
      const y = this.island.heightAt(px, pz);
      const g = this.gs(px, pz);
      const r = r2.next();
      if (edge && r < 0.18) pb.add(r2.pick(['fern', 'bush', 'rock']), r2.int(0, 5), px, y, pz, r2.range(0, 6), 0.8);
      else if (g > 0.05 && r < 0.12) pb.add('grasstuft', r2.int(0, 5), px, y, pz, r2.range(0, 6));
      else if (g > 0.05 && r < 0.16) pb.add('flowers', r2.int(0, 5), px, y, pz, r2.range(0, 6), 0.8);
    }
    this.decor = pb.build();
    this.scene.add(this.decor);
  }

  // ---------------------------------------------------------------- buildings
  buildingState(b) {
    if (b.type === 'incubator' && b.job?.kind === 'hatch') { const egg = EGGS[b.job.egg.type]; return { egg: egg.color, spot: egg.spot }; }
    return null;
  }

  addBuildingObj(b) {
    const def = BUILDINGS[b.type];
    const obj = makeBuilding(b.type, b.level, this.buildingState(b));
    let [w, d] = def.size;
    if (b.rot % 2) [w, d] = [d, w];
    const cx = b.x + w / 2, cz = b.z + d / 2;
    obj.position.set(cx, this.island.heightAt(cx, cz), cz);
    obj.rotation.y = -b.rot * Math.PI / 2;
    const cells = footprintCells(b);
    const rec = this.addPickable({ obj, cells, cell: [Math.floor(cx), Math.floor(cz)], reach: Math.max(w, d) / 2 + 1.1, kind: 'building', b, interact: () => this.onBuildingTap(b) });
    rec.top = new THREE.Vector3(cx, obj.position.y + (def.cat === 'deco' ? 1.2 : 2.3), cz);
    this.buildingObjs.set(b.uid, { rec, level: b.level, stateKey: JSON.stringify(this.buildingState(b)), x: b.x, z: b.z, rot: b.rot });
  }

  syncBuildings() {
    const seen = new Set();
    for (const b of S.buildings) {
      seen.add(b.uid);
      const o = this.buildingObjs.get(b.uid);
      const sk = JSON.stringify(this.buildingState(b));
      if (o && o.level === b.level && o.stateKey === sk && o.x === b.x && o.z === b.z && o.rot === b.rot) continue;
      if (o) { this.removePickable(o.rec); this.buildingObjs.delete(b.uid); }
      this.addBuildingObj(b);
    }
    for (const [uid, o] of this.buildingObjs) if (!seen.has(uid)) { this.removePickable(o.rec); this.buildingObjs.delete(uid); }
    this.refreshResidents();
    this.updateIndicators();
  }

  onBuildingTap(b) {
    if (this.build) return;
    // quick collect for income buildings
    const inc = pendingIncome(b);
    if (inc > 0 && !jobDone(b)) {
      const v = collectIncome(b);
      if (v) { this.floatAt(this.buildingObjs.get(b.uid).rec.top, [I('lunite'), '+' + fmt(v)]); }
    }
    openBuildingPanel(b, this);
  }

  floatAt(pos, content) {
    const s = this.game.iso.project(pos);
    floatText(s.x, s.y, content, 'gain');
  }

  updateIndicators() {
    for (const [uid, o] of this.buildingObjs) {
      const b = S.buildings.find((v) => v.uid === uid);
      if (!b) continue;
      let want = null;
      if (jobDone(b)) want = 'check';
      else if (pendingIncome(b) >= 15) want = 'lunite';
      else if (b.job) want = 'clock';
      if (o.markerIcon === want) continue;
      o.rec.marker?.();
      o.markerIcon = want;
      if (want === 'clock') o.rec.marker = this.addMarker(() => o.rec.top, 'clock', 0, { tint: 0xffffff });
      else if (want) o.rec.marker = this.addBubble(() => o.rec.top, [I(want), want === 'check' ? 'Ready' : fmt(pendingIncome(b))], () => this.onBuildingTap(b), want === 'check' ? 'green' : '');
      else o.rec.marker = null;
    }
  }

  // ---------------------------------------------------------------- habitat residents
  refreshResidents() {
    for (const w of [...this.wanderers]) if (w.resident) this.removeWanderer(w);
    for (const b of S.buildings) {
      if (!b.residents) continue;
      const cells = footprintCells(b);
      for (const u of b.residents) {
        const bst = beast(u);
        if (!bst) continue;
        const obj = makeBeast(bst.sp, bst.variant);
        obj.scale.multiplyScalar(0.7);
        const [cx, cz] = cells[4].split(',').map(Number);
        obj.position.set(cx + 0.5, this.island.heightAt(cx, cz), cz + 0.5);
        this.addWanderer({ obj, cells, speed: 0.6, resident: true });
      }
    }
  }

  // ---------------------------------------------------------------- thick grass
  buildGrass() {
    this.grassRecs = [];
    for (const k of S.homeGrass) {
      const [x, z] = k.split(',').map(Number);
      if (!this.homeSet.has(k)) continue;
      const obj = makeProp('thickgrass', (x * 7 + z * 13) & 7, {});
      obj.position.set(x + 0.5, this.island.heightAt(x + 0.5, z + 0.5), z + 0.5);
      obj.rotation.y = (x * 3 + z) * 0.7;
      const rec = this.addPickable({ obj, cell: [x, z], kind: 'grass', interact: () => this.clearGrass(rec, k) });
      this.grassRecs.push(rec);
    }
  }

  clearGrass(rec, k) {
    if (!useEnergy(1)) return;
    this.swingT = 0.5;
    this.removePickable(rec);
    S.homeGrass = S.homeGrass.filter((v) => v !== k);
    const fiber = randInt(1, 3);
    addItem('fiber', fiber, true);
    const extra = Math.random() < 0.35 ? (Math.random() < 0.5 ? 'pebble' : 'wood') : null;
    if (extra) addItem(extra, 1, true);
    S.stats.grass++;
    givePlayerXp(2);
    questEvent('clear', 'home');
    this.floatAt(rec.obj.position.clone().add(new THREE.Vector3(0, 1, 0)), [I('fiber'), '+' + fiber]);
  }

  // ---------------------------------------------------------------- NPCs
  buildNpcs() {
    const pod = S.buildings.find((b) => b.type === 'command_pod');
    const pad = S.buildings.find((b) => b.type === 'launch_pad');
    const place = (npcId, near, dx, dz) => {
      const npc = NPCS[npcId];
      const obj = makeCharacter(npc.look, npcId);
      let x = near ? near.x + dx : dx, z = near ? near.z + dz : dz;
      if (!this.walkable(x, z)) { const alt = [...this.walkSet].find((k) => !this.blocked.has(k)); [x, z] = alt.split(',').map(Number); }
      obj.position.set(x + 0.5, this.island.heightAt(x + 0.5, z + 0.5), z + 0.5);
      obj.rotation.y = 0.6;
      this.characters.push(obj);
      const rec = this.addPickable({ obj, cell: [x, z], kind: 'npc', npc: npcId, interact: () => talkTo(npcId, this) });
      rec.top = obj.position.clone().add(new THREE.Vector3(0, 1.6, 0));
      this.npcRecs ||= [];
      this.npcRecs.push(rec);
    };
    place('oko', pod, 3, 1);
    place('pip', pad, -1, 1);
    this.refreshNpcMarkers();
    this.offs ||= [];
    this.offs.push(bus.on('quests', () => this.refreshNpcMarkers()));
  }

  refreshNpcMarkers() {
    for (const r of this.npcRecs || []) {
      r.marker?.();
      const st = npcStatus(r.npc);
      r.marker = st ? this.addMarker(() => r.top, st === 'claim' ? 'check' : 'scroll') : null;
    }
  }

  // ---------------------------------------------------------------- build mode
  startBuild(type, moving = null) {
    this.cancelBuild();
    const def = BUILDINGS[type];
    const ghost = makeBuilding(type, moving?.level || 1);
    ghost.traverse((o) => { if (o.isMesh && !o.userData.isOutlineMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.7; o.material.userData = {}; } });
    this.scene.add(ghost);
    const tile = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x5cd65a, transparent: true, opacity: 0.45, depthWrite: false }));
    tile.rotation.x = -Math.PI / 2;
    this.scene.add(tile);
    this.build = { type, def, ghost, tile, rot: moving ? moving.rot : 0, x: this.cell[0], z: this.cell[1] + 2, moving };
    if (moving) { this.build.x = moving.x; this.build.z = moving.z; const o = this.buildingObjs.get(moving.uid); if (o) o.rec.obj.visible = false; }
    this.updateGhost();
    const bar = h('div', { class: 'build-bar' },
      h('span', { class: 'label' }, (moving ? 'Move ' : 'Place ') + def.name),
      btn('', () => { this.build.rot = (this.build.rot + 1) % 4; this.updateGhost(); }, 'gray icon', 'rotate', { title: 'Rotate' }),
      btn('Cancel', () => this.cancelBuild(), 'red small', 'close'),
      btn(moving ? 'Move here' : 'Build here', () => this.confirmBuild(), 'green small', 'check'),
    );
    document.getElementById('ui').append(bar);
    this.build.bar = bar;
    this.game.hud?.setBuildMode(true);
  }

  updateGhost() {
    const B = this.build;
    if (!B) return;
    let [w, d] = B.def.size;
    if (B.rot % 2) [w, d] = [d, w];
    const cx = B.x + w / 2, cz = B.z + d / 2;
    B.ghost.position.set(cx, this.island.heightAt(cx, cz) + 0.02, cz);
    B.ghost.rotation.y = -B.rot * Math.PI / 2;
    B.tile.scale.set(w, d, 1);
    B.tile.position.set(cx, this.island.heightAt(cx, cz) + 0.05, cz);
    B.ok = canPlace(B.type, B.x, B.z, B.rot, B.moving?.uid);
    B.tile.material.color.set(B.ok ? 0x5cd65a : 0xff5a4a);
  }

  onHover(x, y) {
    if (!this.build) return;
    const p = this.game.iso.groundPoint(x, y, 0);
    if (!p) return;
    let [w, d] = this.build.def.size;
    if (this.build.rot % 2) [w, d] = [d, w];
    const nx = Math.round(p.x - w / 2), nz = Math.round(p.z - d / 2);
    if (nx !== this.build.x || nz !== this.build.z) { this.build.x = nx; this.build.z = nz; this.updateGhost(); }
  }

  onTap(x, y) {
    if (this.build) { this.onHover(x, y); return; }
    super.onTap(x, y);
  }

  confirmBuild() {
    const B = this.build;
    if (!B || !B.ok) { toast('Can\'t build there. Pick a clear spot on your island.', 'warn'); return; }
    if (B.moving) {
      moveBuilding(B.moving.uid, B.x, B.z, B.rot);
      const o = this.buildingObjs.get(B.moving.uid);
      if (o) o.rec.obj.visible = true;
      this.cancelBuild(true);
      this.syncBuildings();
      return;
    }
    const b = placeBuilding(B.type, B.x, B.z, B.rot);
    if (!b) { toast('Not enough resources.', 'warn'); return; }
    toast(`${B.def.name} built!`, 'good', 'hammer');
    this.cancelBuild(true);
    save();
  }

  cancelBuild(done = false) {
    const B = this.build;
    if (!B) return;
    this.scene.remove(B.ghost, B.tile);
    B.bar?.remove();
    if (B.moving && !done) { const o = this.buildingObjs.get(B.moving.uid); if (o) o.rec.obj.visible = true; }
    this.build = null;
    this.game.hud?.setBuildMode(false);
  }

  onEscape() { this.cancelBuild(); }

  update(dt) {
    super.update(dt);
    for (const p of this.plots || []) {
      p.bob += dt;
      p.obj.position.y = -1.6 + Math.sin(p.bob * 0.8) * 0.15;
    }
    this.indicatorT += dt;
    if (this.indicatorT > 1) { this.indicatorT = 0; this.updateIndicators(); }
  }
}
