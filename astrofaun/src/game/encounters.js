// Builds wild groups, trainer/goon/boss teams and arena rivals.
import { FAMILIES, species, RARITY_MAP, SPECIES } from '../data/beasts.js';
import { PLANET_MAP } from '../data/planets.js';
import { NPCS } from '../data/quests.js';
import { createBeast, setLevel, power } from './beast.js';
import { RNG, randInt, clamp } from '../core/util.js';

const RARITY_W = { common: 52, uncommon: 28, rare: 13, epic: 5 };

export function stageForLevel(fam, lvl) {
  const sp1 = species(fam.members[0]);
  if (fam.members.length === 1) return fam.members[0];
  const sp2 = species(fam.members[1]);
  if (sp2.evolveLevel && lvl >= sp2.evolveLevel) return fam.members[2];
  if (sp1.evolveLevel && lvl >= sp1.evolveLevel) return fam.members[1];
  return fam.members[0];
}

export function planetFamilies(pid) {
  const p = PLANET_MAP[pid];
  const out = [];
  for (const f of FAMILIES) {
    if (f.rarity === 'legendary') continue;
    const w1 = p.els[f.el] || 0;
    const w2 = f.el2 ? (p.els[f.el2] || 0) * 0.5 : 0;
    const w = Math.max(w1, w2);
    if (w > 0) out.push([f, w * RARITY_W[f.rarity]]);
  }
  return out;
}

export function legendaryFor(pid) {
  const p = PLANET_MAP[pid];
  const top = Object.entries(p.els).sort((a, b) => b[1] - a[1])[0][0];
  return FAMILIES.find((f) => f.rarity === 'legendary' && f.el === top);
}

export function rollWildSpecies(pid, lvl, rng = new RNG(Math.random() * 1e9 | 0), allowLegend = false) {
  if (allowLegend && rng.chance(0.012)) {
    const lf = legendaryFor(pid);
    if (lf) return lf.members[0];
  }
  const fam = rng.weighted(planetFamilies(pid));
  return stageForLevel(fam, lvl);
}

export function wildGroup(pid, allowLegend = false) {
  const p = PLANET_MAP[pid];
  const rng = new RNG(Math.random() * 1e9 | 0);
  const r = rng.next();
  const size = p.index < 2 ? 1 : r < 0.62 ? 1 : r < 0.92 ? 2 : 3;
  const out = [];
  for (let i = 0; i < size; i++) {
    const lvl = rng.int(p.lv[0], p.lv[1]);
    const sp = rollWildSpecies(pid, lvl, rng, allowLegend && i === 0);
    const lv = species(sp).rarity === 'legendary' ? Math.min(100, p.lv[1] + 6) : lvl;
    out.push(createBeast(sp, lv, { variant: rng.chance(1 / 64) }));
  }
  return out;
}

// Leader of a wild group: the species shown roaming on the island
export function wildLeaderSpecies(pid, seed) {
  const p = PLANET_MAP[pid];
  const rng = new RNG(seed);
  const lvl = Math.round((p.lv[0] + p.lv[1]) / 2);
  return rollWildSpecies(pid, lvl, rng);
}

function teamFrom(pid, n, lvl, rarityBoost, seed) {
  const rng = new RNG(seed);
  const fams = planetFamilies(pid).map(([f, w]) => [f, w * (f.rarity === 'common' ? 1 : 1 + rarityBoost)]);
  const team = [];
  for (let i = 0; i < n; i++) {
    const f = rng.weighted(fams);
    const l = clamp(lvl + rng.int(-1, 1), 1, 100);
    const b = createBeast(stageForLevel(f, l), l);
    team.push(b);
  }
  return team;
}

export function duelistTeam(pid) {
  const npc = NPCS[pid + '_duelist'];
  return teamFrom(pid, npc.teamSize, npc.lvl, 1.5, 'duel-' + pid + Math.floor(Date.now() / 86400000));
}

export function goonTeam(pid, idx) {
  const p = PLANET_MAP[pid];
  const n = p.index < 3 ? 2 : 3;
  return teamFrom(pid, n, Math.round(p.lv[1] - 1), 0.6, `goon-${pid}-${idx}-${randInt(0, 9999)}`);
}

export function bossTeam(pid) {
  const p = PLANET_MAP[pid];
  const team = teamFrom(pid, p.index < 2 ? 2 : 3, p.boss.lvl, 1.2, 'boss-' + pid);
  if (p.boss.sector) team.push(...teamFrom(pid, 1, p.boss.lvl - 2, 1.2, 'boss2-' + pid));
  if (p.boss.final) {
    const lf = FAMILIES.filter((f) => f.rarity === 'legendary');
    team[0] = createBeast(lf[lf.length - 1].members[0], 92);
  }
  return team;
}

// ---------------------------------------------------------------- arena rivals
const RIVAL_NAMES = ['Kaia Storm', 'Bodhi Vance', 'Mira Quill', 'Tobias Ren', 'Nova Pike', 'Jett Lumen', 'Sora Drift', 'Ezra Holt', 'Zuri Fen', 'Cass Morrow', 'Ilo Brandt', 'Rhea Sol', 'Dex Arlo', 'Yuna Bell', 'Ari Kestrel'];

export function makeRivals(rating, avgLevel) {
  const rng = new RNG(Math.random() * 1e9 | 0);
  const out = [];
  for (let i = 0; i < 4; i++) {
    const diff = [-1, 0, 1, 2][i];
    const lvl = clamp(Math.round(avgLevel + diff * 2 + rng.int(-1, 1)), 1, 100);
    const team = [];
    for (let k = 0; k < 3; k++) {
      const pool = SPECIES.filter((s) => s.rarity !== 'legendary');
      let sp = rng.pick(pool);
      // match stage to level
      const fam = FAMILIES[sp.family];
      sp = species(stageForLevel(fam, lvl));
      const b = createBeast(sp.id, lvl);
      team.push({ sp: b.sp, lvl: b.lvl, ivs: b.ivs, variant: b.variant });
    }
    out.push({ id: i, name: rng.pick(RIVAL_NAMES), rating: Math.round(rating + diff * 40 + rng.int(-20, 20)), team, reward: 40 + 30 * (diff + 1), gems: diff >= 1 ? diff : 0 });
  }
  return out;
}

export function rivalBeasts(rival) {
  return rival.team.map((t) => {
    const b = createBeast(t.sp, t.lvl, { variant: t.variant });
    b.ivs = t.ivs;
    setLevel(b, t.lvl);
    return b;
  });
}

export function teamPower(team) { return team.reduce((s, b) => s + power(b), 0); }
export { RARITY_MAP };
