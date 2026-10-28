// Central game state, persistence and the economy (energy, fuel, timers, buildings, quests, research).
import { bus, uid, clamp, now, RNG, randRange } from '../core/util.js';
import { ITEMS, RECIPES } from '../data/items.js';
import { species, SPECIES, RARITY_MAP, FAMILIES, EGGS, eggTypeFor } from '../data/beasts.js';
import { BUILDINGS, BUILD_UNLOCK, EXPANSIONS, homeRects } from '../data/buildings.js';
import { RESEARCH, researchEffects } from '../data/research.js';
import { PLANETS, PLANET_MAP } from '../data/planets.js';
import { QUESTS, FIRST_QUESTS, planetChainStart } from '../data/quests.js';
import { createBeast, statsOf, addXp, healFull, habitatIncome, xpToNext, applyBoost, sellValue } from './beast.js';

const SAVE_KEY = 'astrofaun.save.v1';
export const VERSION = 1;

export let S = null; // the live state

// ------------------------------------------------------------------ creation
export const STARTERS = (() => {
  // Five starters, one of each classic starter type, from the common families
  const want = ['aquatic', 'terra', 'lightning', 'flame', 'snow'];
  return want.map((el) => {
    const pref = (f) => f.el === el && f.body !== 'fish' && f.rarity === 'uncommon';
    const fam = FAMILIES.find((f) => pref(f) && (f.role === 'balanced' || f.role === 'striker')) || FAMILIES.find(pref) || FAMILIES.find((f) => f.el === el && f.rarity === 'common');
    return fam.members[0];
  });
})();

export function newGame(name, starterId, look) {
  S = {
    version: VERSION,
    created: now(),
    player: {
      name: name || 'Ranger', level: 1, xp: 0, energy: 30, energyAt: now(), fuel: 40,
      lunites: 600, gems: 15, rp: 0, look: look || { suit: 0x3a8aff, accent: 0xffd23c, skin: 0xe0a878, hair: 0x5a3a2a },
      partyBought: 0,
    },
    inventory: { grav_orb: 5, med_spray: 2 },
    beasts: {},
    party: [],
    buildings: [],
    expansions: [],
    homeGrass: [],
    eggs: [],
    research: { done: [], active: null },
    quests: { active: {}, done: [], tracked: null },
    planets: {},
    dex: { seen: {}, caught: {} },
    location: { scene: 'home', planet: null },
    stats: { battles: 0, wins: 0, captures: 0, ore: 0, grass: 0, steps: 0, hatched: 0, trainedLevels: 0 },
    arena: { rating: 1000, wins: 0, losses: 0, rivals: [], refreshedAt: 0 },
    settings: { quality: null, uiScale: 1, sfx: true, music: false, autosave: true },
    flags: {},
    lastSeen: now(),
  };
  for (const p of PLANETS) S.planets[p.id] = freshPlanetState(p.id === 'mossbloom');
  const starter = createBeast(starterId, 5, { origin: 'starter' });
  S.beasts[starter.uid] = starter;
  S.party.push(starter.uid);
  markCaught(starter.sp, true);
  // Starting buildings
  placeBuildingRaw('command_pod', -1, -4, 0);
  placeBuildingRaw('launch_pad', 2, 2, 0);
  // Thick grass patches on the home island
  const rng = new RNG('home-grass');
  const occupied = new Set();
  for (const b of S.buildings) for (const c of footprintCells(b)) occupied.add(c);
  let tries = 0;
  while (S.homeGrass.length < 14 && tries++ < 400) {
    const x = rng.int(-6, 5), z = rng.int(-6, 5);
    const k = x + ',' + z;
    if (occupied.has(k) || Math.abs(x) + Math.abs(z) < 2) continue;
    occupied.add(k);
    S.homeGrass.push(k);
  }
  for (const qid of FIRST_QUESTS) acceptQuest(qid, true);
  S.quests.tracked = FIRST_QUESTS[0];
  save();
  bus.emit('state:new');
  return S;
}

function freshPlanetState(unlocked) {
  return { unlocked, visited: false, grass: [], chests: {}, crates: {}, harvest: {}, spawns: {}, goons: {}, boss: false, duelAt: 0, caveFloor: 1, caveMined: {} };
}

// ------------------------------------------------------------------ persistence
export function save() {
  if (!S) return;
  try {
    S.lastSeen = now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
    bus.emit('saved');
  } catch (e) {
    console.warn('save failed', e);
  }
}

export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    S = migrate(JSON.parse(raw));
    return S;
  } catch (e) {
    console.warn('load failed', e);
    return null;
  }
}

function migrate(s) {
  for (const p of PLANETS) if (!s.planets[p.id]) s.planets[p.id] = freshPlanetState(false);
  s.flags ||= {};
  s.stats ||= {};
  s.arena ||= { rating: 1000, wins: 0, losses: 0, rivals: [], refreshedAt: 0 };
  return s;
}

export function exportSave() {
  return btoa(unescape(encodeURIComponent(JSON.stringify(S))));
}

export function importSave(str) {
  const obj = JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
  if (!obj || !obj.player || !obj.beasts) throw new Error('Not an Astrofaun save');
  S = migrate(obj);
  save();
  return S;
}

export function wipeSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  S = null;
}

// ------------------------------------------------------------------ research effects
let fxCache = null, fxKey = '';
export function fx() {
  const key = S.research.done.join(',');
  if (key !== fxKey) { fxCache = researchEffects(S.research.done); fxKey = key; }
  return fxCache;
}
export function hasRecipeUnlock(tag) { return !tag || (fx().recipes || []).includes(tag); }

// ------------------------------------------------------------------ currencies & items
export function count(id) {
  if (id === 'lunites') return S.player.lunites;
  if (id === 'gems') return S.player.gems;
  if (id === 'rp') return S.player.rp;
  if (id === 'fuel') return S.player.fuel;
  return S.inventory[id] || 0;
}

export function addItem(id, n = 1, silent = false) {
  if (!n) return;
  if (id === 'lunites') S.player.lunites = Math.max(0, S.player.lunites + n);
  else if (id === 'gems') S.player.gems = Math.max(0, S.player.gems + n);
  else if (id === 'rp') S.player.rp = Math.max(0, S.player.rp + n);
  else if (id === 'fuel') S.player.fuel = Math.max(0, S.player.fuel + n);
  else if (id === 'energy') S.player.energy = Math.max(0, energy() + n), S.player.energyAt = now();
  else {
    S.inventory[id] = Math.max(0, (S.inventory[id] || 0) + n);
    if (S.inventory[id] === 0) delete S.inventory[id];
  }
  if (!silent && n > 0) bus.emit('item:gain', id, n);
  bus.emit('inv');
}

export function canAfford(cost) {
  for (const [k, v] of Object.entries(cost || {})) if (v > 0 && count(k) < v) return false;
  return true;
}

export function missing(cost) {
  const out = {};
  for (const [k, v] of Object.entries(cost || {})) if (v > 0 && count(k) < v) out[k] = v - count(k);
  return out;
}

export function spend(cost) {
  if (!canAfford(cost)) return false;
  for (const [k, v] of Object.entries(cost || {})) if (v > 0) addItem(k, -v, true);
  return true;
}

// ------------------------------------------------------------------ player level, energy, fuel
export function playerXpToNext(l = S.player.level) { return Math.round(40 * Math.pow(1.22, l - 1)); }
export const MAX_PLAYER_LEVEL = 50;

export function givePlayerXp(n) {
  const p = S.player;
  if (p.level >= MAX_PLAYER_LEVEL) return;
  p.xp += Math.round(n);
  let ups = 0;
  while (p.level < MAX_PLAYER_LEVEL && p.xp >= playerXpToNext(p.level)) {
    p.xp -= playerXpToNext(p.level);
    p.level++;
    ups++;
    p.energy = energyMax();
    p.energyAt = now();
    addItem('gems', 2, true);
  }
  if (ups) bus.emit('player:levelup', p.level);
  bus.emit('player');
}

export function buildingLevel(type) {
  let l = 0;
  for (const b of S.buildings) if (b.type === type) l = Math.max(l, b.level);
  return l;
}

export function energyMax() {
  return 30 + 2 * (S.player.level - 1) + 10 * Math.max(0, buildingLevel('command_pod') - 1) + (fx().energyMax || 0);
}
export function energyInterval() { return 40000 / (1 + (fx().energyRegen || 0)); }

export function energy() {
  const p = S.player;
  const max = energyMax();
  if (p.energy >= max) { p.energyAt = now(); return p.energy; }
  const gained = Math.floor((now() - p.energyAt) / energyInterval());
  if (gained > 0) {
    p.energy = Math.min(max, p.energy + gained);
    p.energyAt += gained * energyInterval();
    if (p.energy >= max) p.energyAt = now();
  }
  return p.energy;
}

export function nextEnergyIn() {
  if (energy() >= energyMax()) return 0;
  return energyInterval() - (now() - S.player.energyAt);
}

export function useEnergy(n) {
  if (energy() < n) { bus.emit('toast', 'Not enough energy. It refills over time, or drink an Energy Drink.', 'warn'); return false; }
  if (S.player.energy >= energyMax()) S.player.energyAt = now();
  S.player.energy -= n;
  bus.emit('player');
  return true;
}

export function fuelMax() {
  return 60 + 40 * Math.max(0, buildingLevel('launch_pad') - 1) + (fx().fuelMax || 0);
}

export function travelCost(fromPid, toPid) {
  const a = fromPid ? PLANET_MAP[fromPid] : null;
  const b = PLANET_MAP[toPid];
  const base = a ? 6 + Math.abs(a.index - b.index) * 3 + Math.abs(a.sector - b.sector) * 6 : 6 + b.index * 2 + (b.sector - 1) * 6;
  return Math.max(2, Math.round(base * (1 - (fx().fuelEff || 0))));
}

export function warpLevel() {
  // Launch pad level gives sector access: level 1 -> sector 1, level 2 -> sector 2 ...
  return Math.max(1, buildingLevel('launch_pad'));
}

export function planetUnlocked(pid) {
  const p = PLANET_MAP[pid];
  return S.planets[pid]?.unlocked && warpLevel() >= p.sector;
}

// ------------------------------------------------------------------ beasts, party, capacity
export function beast(u) { return S.beasts[u]; }
export function allBeasts() { return Object.values(S.beasts); }

export function partySlots() { return 5 + (fx().partySlots || 0) + (S.player.partyBought || 0); }
export function activeSlots() { return 3; }
export function partyBeasts() { return S.party.map((u) => S.beasts[u]).filter(Boolean); }

export function capacity() {
  let cap = 12;
  for (const b of S.buildings) if (b.type === 'beast_feeder') cap += 3 * b.level;
  return cap;
}
export function beastCount() { return Object.keys(S.beasts).length; }

export function habitatOf(bu) {
  for (const b of S.buildings) if (b.residents && b.residents.includes(bu)) return b;
  return null;
}

export function busyReason(bu) {
  for (const b of S.buildings) {
    const j = b.job;
    if (!j) continue;
    if (j.kind === 'train' && j.beast === bu) return 'Training';
    if (j.kind === 'breed' && (j.a === bu || j.b === bu)) return 'Breeding';
  }
  return null;
}

export function locationOf(bu) {
  if (S.party.includes(bu)) return 'party';
  if (habitatOf(bu)) return 'habitat';
  return 'storage';
}

export function addBeast(b) {
  S.beasts[b.uid] = b;
  if (S.party.length < partySlots()) S.party.push(b.uid);
  markCaught(b.sp);
  bus.emit('beasts');
  return b;
}

export function removeFromParty(bu) {
  const i = S.party.indexOf(bu);
  if (i >= 0) S.party.splice(i, 1);
  bus.emit('beasts');
}

export function addToParty(bu, index = null) {
  if (S.party.includes(bu)) return true;
  if (S.party.length >= partySlots()) return false;
  const hab = habitatOf(bu);
  if (hab) hab.residents.splice(hab.residents.indexOf(bu), 1);
  if (index === null) S.party.push(bu); else S.party.splice(index, 0, bu);
  bus.emit('beasts');
  return true;
}

export function swapParty(i, j) {
  const p = S.party;
  if (!p[i] || !p[j]) return;
  [p[i], p[j]] = [p[j], p[i]];
  bus.emit('beasts');
}

export function releaseBeast(bu) {
  if (S.party.length <= 1 && S.party.includes(bu)) return { ok: false, err: 'You need at least one beast in your party.' };
  if (busyReason(bu)) return { ok: false, err: 'That beast is busy.' };
  const b = S.beasts[bu];
  const value = sellValue(b);
  removeFromParty(bu);
  const hab = habitatOf(bu);
  if (hab) hab.residents.splice(hab.residents.indexOf(bu), 1);
  delete S.beasts[bu];
  addItem('lunites', value);
  addItem('fluff', 1 + Math.floor(b.lvl / 10));
  bus.emit('beasts');
  return { ok: true, value };
}

export function healParty(frac = 1) {
  for (const b of partyBeasts()) {
    const st = statsOf(b);
    b.hp = Math.min(st.hp, Math.round(b.hp + st.hp * frac));
    b.sta = Math.min(st.sta, Math.round(b.sta + st.sta * frac));
  }
  bus.emit('beasts');
}

export function healAll() {
  for (const b of allBeasts()) healFull(b);
  bus.emit('beasts');
}

// Passive regeneration outside of battle (called from the main loop with elapsed ms)
export function passiveHeal(dtMs, atHome) {
  const rate = (atHome ? 0.06 : 0.015) * (dtMs / 1000); // fraction of max per second
  for (const b of allBeasts()) {
    const st = statsOf(b);
    if (b.hp < st.hp) b.hp = Math.min(st.hp, b.hp + Math.max(atHome ? 1 : 0.2, st.hp * rate));
    if (b.sta < st.sta) b.sta = Math.min(st.sta, b.sta + Math.max(0.2, st.sta * rate * 2));
  }
}

// ------------------------------------------------------------------ dex
export function markSeen(spId) {
  if (!S.dex.seen[spId]) { S.dex.seen[spId] = 1; addItem('rp', 2, true); bus.emit('dex', spId, 'seen'); }
}
export function markCaught(spId, silent = false) {
  markSeen(spId);
  if (!S.dex.caught[spId]) {
    S.dex.caught[spId] = 1;
    if (!silent) { addItem('rp', 5, true); givePlayerXp(8); bus.emit('dex', spId, 'caught'); }
  }
}

// ------------------------------------------------------------------ buildings
export function footprintCells(b) {
  const def = BUILDINGS[b.type];
  let [w, d] = def.size;
  if (b.rot % 2) [w, d] = [d, w];
  const out = [];
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) out.push(`${b.x + x},${b.z + z}`);
  return out;
}

export function homeCells() {
  const set = new Set();
  for (const r of homeRects(S.expansions)) for (let x = r.x; x < r.x + r.w; x++) for (let z = r.z; z < r.z + r.d; z++) set.add(`${x},${z}`);
  return set;
}

export function occupiedCells(exceptUid = null) {
  const set = new Set();
  for (const b of S.buildings) if (b.uid !== exceptUid) for (const c of footprintCells(b)) set.add(c);
  return set;
}

export function canPlace(type, x, z, rot, exceptUid = null) {
  const def = BUILDINGS[type];
  let [w, d] = def.size;
  if (rot % 2) [w, d] = [d, w];
  const land = homeCells();
  const occ = occupiedCells(exceptUid);
  const grass = new Set(S.homeGrass);
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) {
    const k = `${x + i},${z + j}`;
    if (!land.has(k) || occ.has(k) || grass.has(k)) return false;
  }
  return true;
}

export function buildCount(type) { return S.buildings.filter((b) => b.type === type).length; }

export function buildBlockReason(type) {
  const def = BUILDINGS[type];
  const need = BUILD_UNLOCK[type] || 1;
  if (S.player.level < need) return `Requires Ranger level ${need}`;
  if (buildCount(type) >= def.max) return `Limit reached (${def.max})`;
  if (!canAfford(def.cost)) return 'Not enough resources';
  return null;
}

function placeBuildingRaw(type, x, z, rot) {
  const def = BUILDINGS[type];
  const b = { uid: uid(), type, x, z, rot, level: 1, builtAt: now(), job: null, lastCollect: now() };
  if (def.cat === 'habitat') b.residents = [];
  S.buildings.push(b);
  return b;
}

export function placeBuilding(type, x, z, rot) {
  const def = BUILDINGS[type];
  if (buildBlockReason(type)) return null;
  if (!canPlace(type, x, z, rot)) return null;
  spend(def.cost);
  const b = placeBuildingRaw(type, x, z, rot);
  givePlayerXp(def.cat === 'deco' ? 1 : 15);
  questEvent('build', type);
  questEvent('build_cat', def.cat);
  bus.emit('buildings');
  return b;
}

export function moveBuilding(bu, x, z, rot) {
  const b = S.buildings.find((v) => v.uid === bu);
  if (!b || !canPlace(b.type, x, z, rot, bu)) return false;
  b.x = x; b.z = z; b.rot = rot;
  bus.emit('buildings');
  return true;
}

export function sellBuilding(bu) {
  const i = S.buildings.findIndex((v) => v.uid === bu);
  if (i < 0) return false;
  const b = S.buildings[i];
  const def = BUILDINGS[b.type];
  if (def.noSell || b.job || (b.residents && b.residents.length)) return false;
  S.buildings.splice(i, 1);
  addItem('lunites', Math.floor((def.cost.lunites || 0) * 0.4));
  bus.emit('buildings');
  return true;
}

export function upgradeCost(b) {
  const def = BUILDINGS[b.type];
  if (!def.upgrade || b.level >= def.maxLevel) return null;
  const c = def.upgrade(b.level);
  for (const k of Object.keys(c)) if (!c[k]) delete c[k];
  return c;
}

export function upgradeBlockReason(b) {
  const c = upgradeCost(b);
  if (!c) return 'Max level';
  if (b.type === 'launch_pad' && b.level >= 1) {
    const warp = fx().warp || 0;
    if (b.level >= warp + 1) return `Requires Warp Theory ${['I', 'II', 'III', 'IV'][b.level - 1] || ''} research`;
  }
  if (b.type === 'research_station' && b.level >= 1 && S.player.level < b.level * 6) return `Requires Ranger level ${b.level * 6}`;
  if (b.job && b.type !== 'command_pod') return 'Busy';
  if (!canAfford(c)) return 'Not enough resources';
  return null;
}

export function upgradeBuilding(bu) {
  const b = S.buildings.find((v) => v.uid === bu);
  if (!b || upgradeBlockReason(b)) return false;
  spend(upgradeCost(b));
  b.level++;
  givePlayerXp(20 * b.level);
  bus.emit('buildings');
  return true;
}

export function buildingByUid(bu) { return S.buildings.find((v) => v.uid === bu); }

// ------------------------------------------------------------------ expansions
export function expansionState(e) {
  if (S.expansions.includes(e.id)) return 'owned';
  if (e.need && !S.expansions.includes(e.need)) return 'locked';
  return 'available';
}

export function buyExpansion(id) {
  const e = EXPANSIONS.find((v) => v.id === id);
  if (!e || expansionState(e) !== 'available' || !spend(e.cost)) return false;
  S.expansions.push(id);
  // New land arrives with some thick grass to clear
  const rng = new RNG('exp-grass-' + id);
  const rect = homeRects(S.expansions).find((r) => r.id === id);
  for (let i = 0; i < 6; i++) S.homeGrass.push(`${rect.x + rng.int(0, rect.w - 1)},${rect.z + rng.int(0, rect.d - 1)}`);
  S.homeGrass = [...new Set(S.homeGrass)];
  givePlayerXp(60);
  questEvent('expand');
  bus.emit('buildings');
  return true;
}

// ------------------------------------------------------------------ timed jobs
const PUMP_OPTIONS = [
  { amount: 10, secs: 45, cost: 40 },
  { amount: 25, secs: 150, cost: 90 },
  { amount: 50, secs: 420, cost: 160 },
  { amount: 100, secs: 1200, cost: 280 },
];
export function pumpOptions(b) {
  const speed = (1 + 0.2 * (b.level - 1)) * (1 + (fx().pumpSpeed || 0));
  return PUMP_OPTIONS.map((o) => ({ ...o, amount: Math.round(o.amount * (1 + 0.15 * (b.level - 1))), secs: Math.round(o.secs / speed) }));
}

export function jobRemaining(b) { return b.job ? Math.max(0, b.job.endsAt - now()) : 0; }
export function jobDone(b) { return b.job && now() >= b.job.endsAt; }

export function startPump(b, opt) {
  if (b.job || !spend({ lunites: opt.cost })) return false;
  b.job = { kind: 'pump', amount: opt.amount, endsAt: now() + opt.secs * 1000, total: opt.secs * 1000 };
  bus.emit('buildings');
  return true;
}

export function trainOptions(b) {
  const speed = (1 + 0.2 * (b.level - 1)) * (1 + (fx().trainSpeed || 0));
  return [
    { id: 'short', label: 'Quick drill', frac: 0.6, secs: Math.round(90 / speed), cost: 100 },
    { id: 'mid', label: 'Full session', frac: 1.6, secs: Math.round(300 / speed), cost: 300 },
    { id: 'long', label: 'Intensive camp', frac: 4.2, secs: Math.round(900 / speed), cost: 800 },
  ];
}

export function startTraining(b, beastUid, opt, useTicket) {
  if (b.job || busyReason(beastUid)) return false;
  const bst = S.beasts[beastUid];
  if (!bst || bst.lvl >= 100) return false;
  const tickets = opt.id === 'short' ? 1 : opt.id === 'mid' ? 2 : 4;
  if (useTicket) { if (count('train_ticket') < tickets) return false; addItem('train_ticket', -tickets, true); }
  else if (!spend({ lunites: Math.round(opt.cost * (1 + bst.lvl / 20)) })) return false;
  const xp = Math.round(xpToNext(bst) * opt.frac * (1 + 0.15 * (b.level - 1)));
  b.job = { kind: 'train', beast: beastUid, xp, endsAt: now() + opt.secs * 1000, total: opt.secs * 1000 };
  bus.emit('buildings');
  return true;
}

export function trainCostFor(opt, bst) { return Math.round(opt.cost * (1 + bst.lvl / 20)); }

export function breedTime(b) {
  const speed = (1 + 0.25 * (b.level - 1)) * (1 + (fx().breedSpeed || 0));
  return Math.round(240 / speed) * 1000;
}

export function canBreed(a, c) {
  if (!a || !c || a.uid === c.uid) return 'Pick two different beasts.';
  if (species(a.sp).rarity === 'legendary' || species(c.sp).rarity === 'legendary') return 'Legendary beasts cannot breed.';
  if (!habitatOf(a.uid) || !habitatOf(c.uid)) return 'Only beasts living in habitats can breed.';
  if (busyReason(a.uid) || busyReason(c.uid)) return 'One of them is busy.';
  if (a.lvl < 10 || c.lvl < 10) return 'Both beasts must be at least level 10.';
  return null;
}

export function startBreeding(b, au, cu) {
  const a = S.beasts[au], c = S.beasts[cu];
  if (b.job || canBreed(a, c)) return false;
  let t = breedTime(b);
  if (count('love_nectar') > 0) { addItem('love_nectar', -1, true); t /= 2; }
  let variantMult = 1 + (fx().variantChance || 0);
  if (count('lucky_charm') > 0) { addItem('lucky_charm', -1, true); variantMult *= 3; }
  const egg = eggTypeFor(species(a.sp).types[0], species(c.sp).types[0]);
  b.job = { kind: 'breed', a: au, b: cu, egg, variantMult, rar: [species(a.sp).rarity, species(c.sp).rarity], endsAt: now() + t, total: t };
  bus.emit('buildings');
  return true;
}

export function hatchTime(b, egg) {
  const speed = (1 + 0.25 * (b.level - 1)) * (1 + (fx().hatchSpeed || 0));
  return Math.round((EGGS[egg.type].time * 60) / speed) * 1000;
}

export function startIncubation(b, eggUid) {
  const i = S.eggs.findIndex((e) => e.uid === eggUid);
  if (b.job || i < 0) return false;
  const egg = S.eggs[i];
  let t = hatchTime(b, egg);
  if (count('warm_blanket') > 0) { addItem('warm_blanket', -1, true); t /= 2; }
  S.eggs.splice(i, 1);
  b.job = { kind: 'hatch', egg, endsAt: now() + t, total: t };
  bus.emit('buildings');
  return true;
}

export function hatchEgg(egg) {
  // Rarity rolls are nudged by the parents
  const rr = new RNG(Math.floor(Math.random() * 1e9));
  const bonus = (egg.rar || []).reduce((s, r) => s + ['common', 'uncommon', 'rare', 'epic'].indexOf(r), 0);
  const weights = [['common', 50 - bonus * 4], ['uncommon', 30], ['rare', 14 + bonus * 2], ['epic', 6 + bonus * 2]];
  const rarity = rr.weighted(weights);
  const pool = FAMILIES.filter((f) => f.rarity === rarity && EGGS[egg.type].els.includes(f.el));
  const fam = pool.length ? rr.pick(pool) : rr.pick(FAMILIES.filter((f) => f.rarity !== 'legendary' && EGGS[egg.type].els.includes(f.el)));
  const variant = Math.random() < 0.02 * (egg.variantMult || 1);
  const b = createBeast(fam.members[0], 1, { variant, origin: 'bred' });
  return b;
}

export function speedUpCost(b) { return Math.max(1, Math.ceil(jobRemaining(b) / 60000 / 4)); }

export function speedUp(b) {
  const c = speedUpCost(b);
  if (!b.job || !spend({ gems: c })) return false;
  b.job.endsAt = now();
  bus.emit('buildings');
  return true;
}

/** Collects a finished job. Returns a description of what happened. */
export function collectJob(b) {
  if (!jobDone(b)) return null;
  const j = b.job;
  b.job = null;
  let out = null;
  if (j.kind === 'pump') {
    addItem('fuel', j.amount);
    out = { kind: 'pump', amount: j.amount };
  } else if (j.kind === 'train') {
    const bst = S.beasts[j.beast];
    if (bst) {
      const res = addXp(bst, j.xp * (1 + (fx().xpGain || 0)));
      S.stats.trainedLevels = (S.stats.trainedLevels || 0) + res.levels;
      if (res.levels) questEvent('train_levels', null, res.levels);
      if (res.evolvedTo) markCaught(res.evolvedTo);
      out = { kind: 'train', beast: bst, res };
    }
  } else if (j.kind === 'breed') {
    const egg = { uid: uid(), type: j.egg, rar: j.rar, variantMult: j.variantMult };
    S.eggs.push(egg);
    questEvent('breed');
    out = { kind: 'breed', egg };
  } else if (j.kind === 'hatch') {
    const nb = hatchEgg(j.egg);
    S.beasts[nb.uid] = nb;
    markCaught(nb.sp);
    S.stats.hatched = (S.stats.hatched || 0) + 1;
    questEvent('hatch');
    givePlayerXp(25);
    out = { kind: 'hatch', beast: nb };
  }
  bus.emit('buildings');
  bus.emit('beasts');
  return out;
}

// Habitat and feeder income
export function habitatCapacity(b) { return 2 + b.level; }

export function pendingIncome(b) {
  const def = BUILDINGS[b.type];
  const mins = Math.min(8 * 60, (now() - b.lastCollect) / 60000);
  if (def.cat === 'habitat') {
    let rate = 0;
    for (const u of b.residents) if (S.beasts[u] && !busyReason(u)) rate += habitatIncome(S.beasts[u]);
    rate *= (1 + 0.25 * (b.level - 1)) * (1 + (fx().habitatIncome || 0));
    return Math.floor(rate * mins);
  }
  if (b.type === 'beast_feeder') return Math.floor(Math.min(6, mins / 10) * 25 * b.level);
  return 0;
}

export function collectIncome(b) {
  const v = pendingIncome(b);
  if (v <= 0) return 0;
  b.lastCollect = now();
  addItem('lunites', v);
  return v;
}

export function houseBeast(bu, habUid) {
  const hab = buildingByUid(habUid);
  const bst = S.beasts[bu];
  if (!hab || !bst || !hab.residents) return 'No habitat.';
  const def = BUILDINGS[hab.type];
  if (!species(bst.sp).types.includes(def.el)) return `Only ${def.el} beasts can live here.`;
  if (hab.residents.length >= habitatCapacity(hab)) return 'Habitat is full.';
  if (S.party.includes(bu)) {
    if (S.party.length <= 1) return 'Keep at least one beast in your party.';
    removeFromParty(bu);
  }
  const old = habitatOf(bu);
  if (old) old.residents.splice(old.residents.indexOf(bu), 1);
  // settle income before the resident list changes
  collectIncome(hab);
  hab.residents.push(bu);
  questEvent('house');
  bus.emit('buildings');
  bus.emit('beasts');
  return null;
}

export function unhouseBeast(bu) {
  const hab = habitatOf(bu);
  if (!hab) return;
  collectIncome(hab);
  hab.residents.splice(hab.residents.indexOf(bu), 1);
  bus.emit('buildings');
  bus.emit('beasts');
}

// ------------------------------------------------------------------ crafting
export function craft(recipeId, times = 1) {
  const r = RECIPES.find((v) => v.id === recipeId);
  if (!r || !hasRecipeUnlock(r.unlock)) return 0;
  let made = 0;
  for (let i = 0; i < times; i++) {
    const cost = { ...r.inputs, lunites: r.lunites };
    if (!spend(cost)) break;
    addItem(r.out, r.qty, true);
    made++;
  }
  if (made) {
    questEvent('craft', r.out, made * r.qty);
    givePlayerXp(made * 2);
    bus.emit('item:gain', r.out, made * r.qty);
  }
  return made;
}

export function feedPotion(bu, potionId, doses = 1) {
  const bst = S.beasts[bu];
  const it = ITEMS[potionId];
  if (!bst || !it?.boostStat) return { ok: false, err: 'Invalid potion.' };
  const have = count(potionId);
  if (have < 1) return { ok: false, err: 'You have none of that potion.' };
  const res = applyBoost(bst, it.boostStat, Math.min(doses, have));
  if (res.ok) {
    addItem(potionId, -res.used, true);
    questEvent('boost');
    bus.emit('beasts');
  }
  return res;
}

export function useItemOnBeast(bu, itemId) {
  const bst = S.beasts[bu];
  const it = ITEMS[itemId];
  if (!bst || !it || count(itemId) < 1) return false;
  const st = statsOf(bst);
  const pow = 1 + (fx().itemPower || 0);
  if (it.heal) { if (bst.hp <= 0 || bst.hp >= st.hp) return false; bst.hp = Math.min(st.hp, bst.hp + st.hp * it.heal * pow); }
  else if (it.revive) { if (bst.hp > 0) return false; bst.hp = Math.round(st.hp * it.revive); }
  else if (it.stamina) { bst.sta = Math.min(st.sta, bst.sta + st.sta * it.stamina * pow); }
  else if (it.xpPct) {
    const res = addXp(bst, xpToNext(bst) * it.xpPct);
    if (res.evolvedTo) markCaught(res.evolvedTo);
    addItem(itemId, -1, true);
    bus.emit('beasts');
    return res;
  } else return false;
  bst.hp = Math.round(bst.hp);
  addItem(itemId, -1, true);
  bus.emit('beasts');
  return true;
}

export function useUtilItem(itemId) {
  const it = ITEMS[itemId];
  if (!it || count(itemId) < 1) return false;
  if (it.energy) { S.player.energy = energy() + it.energy; addItem(itemId, -1, true); bus.emit('player'); return true; }
  if (it.fuel) { addItem('fuel', it.fuel); addItem(itemId, -1, true); return true; }
  return false;
}

// ------------------------------------------------------------------ research
export function researchState(id) {
  if (S.research.done.includes(id)) return 'done';
  if (S.research.active?.id === id) return 'active';
  const r = RESEARCH[id];
  if (r.req.some((q) => !S.research.done.includes(q))) return 'locked';
  if (buildingLevel('research_station') < r.tier) return 'tier';
  return 'available';
}

export function startResearch(id) {
  const r = RESEARCH[id];
  if (S.research.active || researchState(id) !== 'available' || !spend(r.cost)) return false;
  S.research.active = { id, endsAt: now() + r.time * 1000, total: r.time * 1000 };
  bus.emit('research');
  return true;
}

export function researchSpeedUp() {
  const a = S.research.active;
  if (!a) return false;
  const c = Math.max(1, Math.ceil((a.endsAt - now()) / 60000 / 4));
  if (!spend({ gems: c })) return false;
  a.endsAt = now();
  return true;
}

function tickResearch() {
  const a = S.research.active;
  if (a && now() >= a.endsAt) {
    S.research.done.push(a.id);
    S.research.active = null;
    givePlayerXp(30 * RESEARCH[a.id].tier);
    questEvent('research');
    bus.emit('research');
    bus.emit('toast', `Research complete: ${RESEARCH[a.id].name}`, 'good');
  }
}

// ------------------------------------------------------------------ quests
export function acceptQuest(qid, silent = false) {
  const q = QUESTS[qid];
  if (!q || S.quests.done.includes(qid) || S.quests.active[qid]) return;
  S.quests.active[qid] = q.steps.map(() => 0);
  // Steps already satisfied by state
  q.steps.forEach((st, i) => {
    if (st.type === 'build' && buildCount(st.target) > 0) S.quests.active[qid][i] = st.count;
    if (st.type === 'build_cat' && S.buildings.some((b) => BUILDINGS[b.type].cat === st.target)) S.quests.active[qid][i] = st.count;
    if (st.type === 'house' && S.buildings.some((b) => b.residents && b.residents.length)) S.quests.active[qid][i] = st.count;
  });
  if (!S.quests.tracked) S.quests.tracked = qid;
  if (!silent) bus.emit('toast', `New quest: ${q.title}`, 'quest');
  bus.emit('quests');
}

export function questComplete(qid) {
  const q = QUESTS[qid];
  const p = S.quests.active[qid];
  return !!p && q.steps.every((st, i) => p[i] >= st.count);
}

export function questEvent(type, target = null, n = 1) {
  if (!S) return;
  let changed = false;
  for (const [qid, prog] of Object.entries(S.quests.active)) {
    const q = QUESTS[qid];
    q.steps.forEach((st, i) => {
      if (st.type !== type || prog[i] >= st.count) return;
      if (st.target && st.target !== target) return;
      // Ordered steps: a step only counts once all previous steps are complete
      for (let k = 0; k < i; k++) if (prog[k] < q.steps[k].count) return;
      prog[i] = Math.min(st.count, prog[i] + n);
      changed = true;
    });
  }
  if (changed) bus.emit('quests');
}

export function turnInQuest(qid) {
  if (!questComplete(qid)) return null;
  const q = QUESTS[qid];
  delete S.quests.active[qid];
  S.quests.done.push(qid);
  const r = q.rewards || {};
  if (r.lunites) addItem('lunites', Math.round(r.lunites));
  if (r.gems) addItem('gems', r.gems);
  if (r.rp) addItem('rp', r.rp);
  if (r.items) for (const [id, n] of Object.entries(r.items)) addItem(id, n);
  if (r.xp) givePlayerXp(r.xp);
  if (q.unlocks) {
    S.planets[q.unlocks].unlocked = true;
    bus.emit('toast', `New planet unlocked: ${PLANET_MAP[q.unlocks].name}`, 'good');
  }
  if (q.next) acceptQuest(q.next);
  if (S.quests.tracked === qid) S.quests.tracked = q.next || Object.keys(S.quests.active)[0] || null;
  bus.emit('quests');
  save();
  return q;
}

export function ensurePlanetChain(pid) {
  const start = planetChainStart(pid);
  if (!S.quests.done.includes(start) && !S.quests.active[start]) acceptQuest(start);
}

export function questsForNpc(npcId) {
  const out = [];
  for (const qid of Object.keys(S.quests.active)) if (QUESTS[qid].giver === npcId) out.push(qid);
  return out;
}

// ------------------------------------------------------------------ planet helpers
export function planetState(pid) { return S.planets[pid]; }

export const RESPAWN = { chest: 20 * 60000, crate: 10 * 60000, harvest: 4 * 60000, spawn: 90000, goon: 15 * 60000 };

export function isReady(map, id, kind) {
  const t = map[id];
  return !t || now() - t > RESPAWN[kind];
}

// ------------------------------------------------------------------ main tick
let lastTick = now();
export function tick() {
  if (!S) return;
  const t = now();
  const dt = t - lastTick;
  lastTick = t;
  energy();
  tickResearch();
  passiveHeal(dt, S.location.scene === 'home');
}

export { PUMP_OPTIONS, randRange, clamp, SPECIES, RARITY_MAP };
