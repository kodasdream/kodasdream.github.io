// Beast instances: stats, XP curve, leveling, evolution, skills and permanent stat boosts.
import { species, STATS, RARITY_MAP } from '../data/beasts.js';
import { SKILLS } from '../data/skills.js';
import { clamp, uid, randRange } from '../core/util.js';

export const MAX_LEVEL = 100;
export const MAX_BOOST = 100;
export const BOOST_PER_DOSE = 0.02;

export function createBeast(spId, lvl = 1, opts = {}) {
  const sp = species(spId);
  const ivs = {};
  for (const s of STATS) ivs[s] = Math.round(randRange(-0.004, 0.004) * 10000) / 10000;
  const b = {
    uid: uid(),
    sp: spId,
    lvl: clamp(lvl, 1, MAX_LEVEL),
    xp: 0,
    nick: null,
    variant: !!opts.variant,
    ivs,
    boost: { stat: null, n: 0 },
    skills: [],
    learned: [],
    hp: 1,
    sta: 1,
    caughtAt: Date.now(),
    origin: opts.origin || 'wild',
  };
  // Learn everything up to the current level; equip the four most recent
  for (const [l, sid] of sp.learnset) if (l <= b.lvl && !b.learned.includes(sid)) b.learned.push(sid);
  b.skills = pickDefaultSkills(b);
  const st = statsOf(b);
  b.hp = st.hp;
  b.sta = st.sta;
  return b;
}

export function pickDefaultSkills(b) {
  // Free move, the two strongest attacks, then one utility move (or a third attack)
  const sp = species(b.sp);
  const learned = b.learned.map((id) => SKILLS[id]).filter(Boolean);
  const free = learned.find((s) => s.cost === 0);
  const score = (s) => s.pow * (s.multi || 1) * (sp.types.includes(s.el) ? 1.25 : 1) * (s.tgt === 'foes' ? 1.3 : 1);
  const attacks = learned.filter((s) => s !== free && s.kind === 'atk').sort((x, y) => score(y) - score(x));
  const utility = learned.filter((s) => s.kind !== 'atk').sort((x, y) => y.tier - x.tier);
  const out = [free, attacks[0], attacks[1], utility[0] || attacks[2], attacks[2], attacks[3]].filter(Boolean);
  return [...new Set(out.map((s) => s.id))].slice(0, 4);
}

export function growthOf(b, stat) {
  const sp = species(b.sp);
  return clamp(sp.growth[stat] + (b.ivs?.[stat] || 0), 0.01, 0.06);
}

export function boostMult(b, stat) {
  return b.boost && b.boost.stat === stat ? 1 + BOOST_PER_DOSE * b.boost.n : 1;
}

export function statsOf(b, lvl = b.lvl) {
  const sp = species(b.sp);
  const out = {};
  for (const s of STATS) {
    const g = growthOf(b, s);
    const v = sp.base[s] * Math.pow(1 + g, lvl - 1) * boostMult(b, s);
    out[s] = Math.max(1, Math.round(v));
  }
  return out;
}

export function xpToNext(b) {
  if (b.lvl >= MAX_LEVEL) return Infinity;
  const sp = species(b.sp);
  return Math.floor(sp.xpBase * Math.pow(sp.xpRate, b.lvl - 1) + 6 * b.lvl);
}

export function totalXpTo(spId, lvl) {
  const sp = species(spId);
  let t = 0;
  for (let l = 1; l < lvl; l++) t += Math.floor(sp.xpBase * Math.pow(sp.xpRate, l - 1) + 6 * l);
  return t;
}

// Reference stamina pool for a level; skill costs are a percentage of it
export function refStamina(lvl) { return 30 * Math.pow(1.03, lvl - 1); }
export function skillCost(sk, lvl) { return Math.round((sk.cost / 100) * refStamina(lvl) * 1.0); }

export function displayName(b) { return b.nick || species(b.sp).name; }

export function power(b) {
  // Single number to compare beasts: "beast value"
  const s = statsOf(b);
  return Math.round(s.hp * 0.35 + s.atk * 1.2 + s.def * 1.0 + s.spd * 0.9 + s.sta * 0.4);
}

/**
 * Adds XP and handles level ups, new skills and evolution.
 * Returns { levels, learned: [skillIds], pendingLearn: [skillIds], evolvedFrom, evolvedTo }
 */
export function addXp(b, amount) {
  const res = { levels: 0, learned: [], pendingLearn: [], evolvedFrom: null, evolvedTo: null, startLvl: b.lvl };
  if (b.lvl >= MAX_LEVEL) return res;
  const before = statsOf(b);
  const hpFrac = b.hp / before.hp;
  const staFrac = b.sta / before.sta;
  b.xp += Math.max(0, Math.round(amount));
  while (b.lvl < MAX_LEVEL && b.xp >= xpToNext(b)) {
    b.xp -= xpToNext(b);
    b.lvl++;
    res.levels++;
    learnAt(b, b.lvl, res);
    const sp = species(b.sp);
    if (sp.evolveLevel && b.lvl >= sp.evolveLevel && sp.evolvesTo) {
      if (!res.evolvedFrom) res.evolvedFrom = b.sp;
      b.sp = sp.evolvesTo;
      res.evolvedTo = b.sp;
    }
  }
  if (b.lvl >= MAX_LEVEL) b.xp = 0;
  const after = statsOf(b);
  b.hp = Math.max(1, Math.round(after.hp * clamp(hpFrac, 0, 1)));
  if (hpFrac <= 0) b.hp = 0;
  b.sta = Math.round(after.sta * clamp(staFrac, 0, 1));
  return res;
}

function learnAt(b, lvl, res) {
  const sp = species(b.sp);
  for (const [l, sid] of sp.learnset) {
    if (l === lvl && !b.learned.includes(sid)) {
      b.learned.push(sid);
      res.learned.push(sid);
      if (b.skills.length < 4) b.skills.push(sid);
      else res.pendingLearn.push(sid);
    }
  }
}

export function setLevel(b, lvl) {
  b.lvl = clamp(lvl, 1, MAX_LEVEL);
  b.xp = 0;
  const sp = species(b.sp);
  for (const [l, sid] of sp.learnset) if (l <= b.lvl && !b.learned.includes(sid)) b.learned.push(sid);
  b.skills = pickDefaultSkills(b);
  healFull(b);
}

export function healFull(b) {
  const s = statsOf(b);
  b.hp = s.hp;
  b.sta = s.sta;
}

export function isFainted(b) { return b.hp <= 0; }

/** Feed a permanent stat potion. Returns error string or null. */
export function canBoost(b, stat) {
  if (b.boost.stat && b.boost.stat !== stat) return `Already boosted in ${b.boost.stat.toUpperCase()}. Only one stat can be boosted.`;
  if (b.boost.n >= MAX_BOOST) return 'This stat is boosted to the maximum (100 doses).';
  return null;
}

export function applyBoost(b, stat, doses = 1) {
  const err = canBoost(b, stat);
  if (err) return { ok: false, err };
  const before = statsOf(b);
  const n = Math.min(doses, MAX_BOOST - b.boost.n);
  b.boost.stat = stat;
  b.boost.n += n;
  const after = statsOf(b);
  if (stat === 'hp') b.hp += after.hp - before.hp;
  if (stat === 'sta') b.sta += after.sta - before.sta;
  return { ok: true, used: n };
}

export function rarityOf(b) { return RARITY_MAP[species(b.sp).rarity]; }

// Lunite yield and XP yield for defeating this beast
export function xpYield(b) {
  const r = rarityOf(b);
  return Math.round((6 + 7 * Math.pow(1.082, b.lvl - 1)) * r.yieldMult * (1 + 0.15 * (species(b.sp).stage - 1)));
}

export function luniteYield(b) {
  const r = rarityOf(b);
  return Math.round((8 + 3 * b.lvl + 0.04 * b.lvl * b.lvl) * r.yieldMult);
}

// Lunite income per minute while living in a habitat
export function habitatIncome(b) {
  const r = rarityOf(b);
  return r.income * (1 + b.lvl / 15) * (b.variant ? 1.5 : 1);
}

export function sellValue(b) {
  return Math.round(25 * rarityOf(b).income * (1 + b.lvl / 5) * (b.variant ? 3 : 1));
}
