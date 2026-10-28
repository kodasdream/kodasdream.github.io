// Turn-based 3v3 battle engine. Pure logic: the battle scene animates the events it returns.
import { species, RARITY_MAP } from '../data/beasts.js';
import { SKILLS, STATUS } from '../data/skills.js';
import { ITEMS } from '../data/items.js';
import { typeMultiplier, STAB } from '../data/elements.js';
import { statsOf, skillCost, displayName } from './beast.js';
import { clamp, randRange } from '../core/util.js';

const FIELD = 3;
// Level-normalized damage: stats are compared against a reference curve (3%/level) and compressed
// with a square root, so rarer/faster-growing beasts stay much stronger without one-shotting.
const HPREF = (l) => 60 * Math.pow(1.03, l - 1);
const AREF = (l) => 14 * Math.pow(1.03, l - 1);
const BAD = new Set(Object.keys(STATUS).filter((k) => STATUS[k].bad));

export class Battle {
  /**
   * opts: { kind, allies: [beast], foes: [beast], foeName, planet, ctx: { fx, useItem(id), count(id), capacityLeft() } }
   */
  constructor(opts) {
    this.kind = opts.kind;
    this.planet = opts.planet;
    this.foeName = opts.foeName || null;
    this.ctx = opts.ctx;
    this.canCapture = opts.kind === 'wild';
    this.canFlee = opts.kind === 'wild';
    this.units = [];
    this.round = 0;
    this.queue = [];
    this.ended = null;
    this.captured = [];
    this.defeated = [];
    this.log = [];
    let id = 0;
    const mk = (b, side, isAlly) => {
      const st = statsOf(b);
      const sp = species(b.sp);
      const u = {
        id: id++, side, b, ally: isAlly, sp: b.sp, name: displayName(b), lvl: b.lvl, types: sp.types,
        stats: st, maxHp: st.hp, maxSta: st.sta,
        hp: isAlly ? clamp(Math.round(b.hp), 0, st.hp) : st.hp,
        sta: isAlly ? clamp(Math.round(b.sta), 0, st.sta) : st.sta,
        st: {}, field: false, slot: -1, fainted: false, captured: false, joined: false,
      };
      if (u.hp <= 0) u.fainted = true;
      this.units.push(u);
      return u;
    };
    for (const b of opts.allies) mk(b, 0, true);
    for (const b of opts.foes) mk(b, 1, false);
    for (const side of [0, 1]) {
      let slot = 0;
      for (const u of this.sideUnits(side)) {
        if (slot >= FIELD) break;
        if (!u.fainted && !u.busy) { u.field = true; u.slot = slot++; u.joined = true; }
      }
    }
  }

  sideUnits(side) { return this.units.filter((u) => u.side === side); }
  fieldUnits(side) { return this.units.filter((u) => u.side === side && u.field && !u.fainted && !u.captured); }
  reserves(side) { return this.units.filter((u) => u.side === side && !u.field && !u.fainted && !u.captured); }
  alive(side) { return this.units.filter((u) => u.side === side && !u.fainted && !u.captured); }
  unit(id) { return this.units[id]; }

  effStat(u, s) {
    let v = u.stats[s];
    if (s === 'atk') { if (u.st.empower) v *= 1.4; if (u.st.weaken) v *= 0.7; }
    if (s === 'def') { if (u.st.fortify) v *= 1.4; if (u.st.expose) v *= 0.7; }
    if (s === 'spd') { if (u.st.haste) v *= 1.5; if (u.st.slow) v *= 0.6; }
    return v;
  }

  costOf(u, sk) { return skillCost(sk, u.lvl); }

  usableSkills(u) {
    const list = (u.b.skills || []).map((id) => SKILLS[id]).filter(Boolean);
    return list.map((sk) => ({ sk, cost: this.costOf(u, sk), ok: this.costOf(u, sk) <= u.sta }));
  }

  // -------------------------------------------------------------- flow
  beginRound(ev) {
    this.round++;
    const order = [...this.fieldUnits(0), ...this.fieldUnits(1)];
    order.sort((a, b) => this.effStat(b, 'spd') * (1 + Math.random() * 0.06) - this.effStat(a, 'spd') * (1 + Math.random() * 0.06));
    this.queue = order.map((u) => u.id);
    ev.push({ t: 'round', n: this.round });
  }

  /** Processes until the next actor. Returns { events, needInput, ended } */
  advance() {
    const ev = [];
    if (this.ended) return { events: ev, needInput: null, ended: this.ended };
    if (this.round === 0) this.beginRound(ev);
    for (let guard = 0; guard < 50; guard++) {
      if (!this.queue.length) {
        this.endRound(ev);
        if (this.checkEnd(ev)) return { events: ev, needInput: null, ended: this.ended };
        this.beginRound(ev);
      }
      const u = this.unit(this.queue.shift());
      if (!u || !u.field || u.fainted || u.captured) continue;
      // Status checks before acting
      if (u.st.freeze) { ev.push({ t: 'skip', u: u.id, why: 'freeze', text: `${u.name} is frozen solid.` }); continue; }
      if (u.st.sleep) { ev.push({ t: 'skip', u: u.id, why: 'sleep', text: `${u.name} is fast asleep.` }); continue; }
      if (u.st.stun && Math.random() < 0.5) { ev.push({ t: 'skip', u: u.id, why: 'stun', text: `${u.name} is stunned and can't move.` }); continue; }
      if (u.st.confuse && Math.random() < 0.33) {
        const dmg = Math.max(1, Math.round(u.maxHp * 0.08));
        this.hurt(u, dmg, ev, { self: true });
        ev.push({ t: 'log', text: `${u.name} hurt itself in confusion.` });
        if (this.checkEnd(ev)) return { events: ev, needInput: null, ended: this.ended };
        continue;
      }
      this.current = u;
      if (u.side === 0) return { events: ev, needInput: u, ended: null };
      this.act(u, this.aiChoose(u), ev);
      if (this.checkEnd(ev)) return { events: ev, needInput: null, ended: this.ended };
      return { events: ev, needInput: null, ended: null };
    }
    return { events: ev, needInput: null, ended: null };
  }

  submit(action) {
    const ev = [];
    const u = this.current;
    if (!u || u.side !== 0) return { events: ev, ended: this.ended };
    this.act(u, action, ev);
    this.checkEnd(ev);
    return { events: ev, ended: this.ended };
  }

  endRound(ev) {
    const fx = this.ctx.fx || {};
    for (const u of [...this.fieldUnits(0), ...this.fieldUnits(1)]) {
      if (u.st.burn) this.hurt(u, Math.max(1, Math.round(u.maxHp * 0.06)), ev, { dot: 'burn' });
      if (u.fainted) continue;
      if (u.st.poison) this.hurt(u, Math.max(1, Math.round(u.maxHp * 0.08)), ev, { dot: 'poison' });
      if (u.fainted) continue;
      if (u.st.regen) this.heal(u, Math.round(u.maxHp * 0.08), ev);
      const regen = u.side === 0 ? 0.1 * (1 + (fx.staminaRegen || 0)) : 0.1;
      u.sta = Math.min(u.maxSta, u.sta + Math.round(u.maxSta * regen));
      for (const k of Object.keys(u.st)) {
        u.st[k]--;
        if (u.st[k] <= 0) { delete u.st[k]; ev.push({ t: 'status', u: u.id, s: k, on: false }); }
      }
    }
    ev.push({ t: 'tick' });
  }

  checkEnd(ev) {
    if (this.ended) return true;
    if (this.alive(1).length === 0) {
      this.ended = this.captured.length && !this.defeated.length ? 'captured' : 'win';
      ev.push({ t: 'end', result: this.ended });
      return true;
    }
    if (this.alive(0).length === 0) {
      this.ended = 'lose';
      ev.push({ t: 'end', result: 'lose' });
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------- actions
  act(u, a, ev) {
    if (a.type === 'skill') this.useSkill(u, SKILLS[a.skill], a.target, ev);
    else if (a.type === 'rest') {
      const amt = Math.round(u.maxSta * 0.35);
      u.sta = Math.min(u.maxSta, u.sta + amt);
      ev.push({ t: 'rest', u: u.id, amount: amt, text: `${u.name} catches its breath.` });
    } else if (a.type === 'swap') this.swap(u, this.unit(a.target), ev);
    else if (a.type === 'item') this.useItem(u, a.item, this.unit(a.target), ev);
    else if (a.type === 'capture') this.capture(u, a.item, this.unit(a.target), ev);
    else if (a.type === 'flee') this.flee(u, ev, a.sure);
  }

  pickTargets(u, sk, targetId) {
    const foes = this.fieldUnits(1 - u.side);
    const allies = this.fieldUnits(u.side);
    switch (sk.tgt) {
      case 'self': return [u];
      case 'allies': return allies;
      case 'ally': { const t = this.unit(targetId); return [t && t.side === u.side && t.field && !t.fainted ? t : u]; }
      case 'foes': return foes;
      default: {
        const taunter = foes.find((f) => f.st.taunt);
        if (taunter) return [taunter];
        const t = this.unit(targetId);
        if (t && t.side !== u.side && t.field && !t.fainted && !t.captured) return [t];
        return foes.length ? [foes[Math.floor(Math.random() * foes.length)]] : [];
      }
    }
  }

  useSkill(u, sk, targetId, ev) {
    if (!sk) sk = SKILLS.struggle;
    let cost = this.costOf(u, sk);
    if (cost > u.sta) { sk = SKILLS.struggle; cost = 0; }
    u.sta -= cost;
    const targets = this.pickTargets(u, sk, targetId);
    ev.push({ t: 'skill', u: u.id, skill: sk.id, targets: targets.map((x) => x.id), text: `${u.name} used ${sk.name}!` });
    const fx = this.ctx.fx || {};
    for (const t of targets) {
      if (sk.kind === 'atk') {
        const hits = sk.multi || 1;
        let total = 0;
        let landed = 0;
        for (let h = 0; h < hits; h++) {
          if (t.fainted) break;
          const hitRoll = sk.sure || Math.random() < sk.acc;
          if (!hitRoll) { ev.push({ t: 'miss', u: u.id, target: t.id }); if (hits === 1) break; else continue; }
          const critChance = 0.06 + (sk.crit || 0) + (u.st.focus ? 0.25 : 0) + (u.side === 0 ? fx.critChance || 0 : 0);
          const crit = Math.random() < critChance;
          const mult = typeMultiplier(sk.el, t.types);
          let dmg = this.rawDamage(u, t, sk.pow) * mult;
          if (u.types.includes(sk.el)) dmg *= STAB;
          if (crit) dmg *= 1.5;
          dmg *= randRange(0.9, 1.05);
          if (t.st.shield) dmg *= 0.5;
          dmg = mult === 0 ? 0 : Math.max(1, Math.round(dmg));
          landed++;
          total += dmg;
          this.hurt(t, dmg, ev, { crit, mult, from: u.id, el: sk.el });
          if (t.st.sleep && dmg > 0) { delete t.st.sleep; ev.push({ t: 'status', u: t.id, s: 'sleep', on: false }); }
          if (t.st.freeze && sk.el === 'flame') { delete t.st.freeze; ev.push({ t: 'status', u: t.id, s: 'freeze', on: false }); }
        }
        if (landed && sk.fx && !t.fainted && Math.random() < (sk.p ?? 1)) this.addStatus(t, sk.fx, sk.t, ev);
        if (landed && sk.drain && total > 0) this.heal(u, Math.round(total * sk.drain), ev);
        if (landed && sk.recoil && total > 0) this.hurt(u, Math.max(1, Math.round(total * sk.recoil)), ev, { recoil: true });
      } else if (sk.kind === 'heal') {
        this.heal(t, Math.round(t.maxHp * sk.heal), ev);
      } else {
        // buff / debuff / status
        const hit = sk.kind === 'buff' || Math.random() < sk.acc;
        if (!hit) { ev.push({ t: 'miss', u: u.id, target: t.id }); continue; }
        if (Math.random() < (sk.p ?? 1)) this.addStatus(t, sk.fx, sk.t, ev);
        if (sk.fx2) this.addStatus(t, sk.fx2, sk.t, ev);
      }
    }
  }

  addStatus(t, s, turns, ev) {
    if (!s || t.fainted) return;
    // Freeze/sleep/stun do not stack with each other
    if ((s === 'freeze' || s === 'sleep' || s === 'stun') && (t.st.freeze || t.st.sleep || t.st.stun)) return;
    const had = !!t.st[s];
    t.st[s] = Math.max(t.st[s] || 0, turns || 2);
    if (!had) ev.push({ t: 'status', u: t.id, s, on: true, text: `${t.name} is ${STATUS[s].name.toLowerCase()}!` });
  }

  hurt(t, dmg, ev, info = {}) {
    t.hp = Math.max(0, t.hp - dmg);
    ev.push({ t: 'damage', target: t.id, amount: dmg, hp: t.hp, ...info });
    if (t.hp <= 0 && !t.fainted) this.faint(t, ev);
  }

  heal(t, amt, ev) {
    if (t.fainted) return;
    const before = t.hp;
    t.hp = Math.min(t.maxHp, t.hp + Math.max(1, amt));
    ev.push({ t: 'heal', target: t.id, amount: t.hp - before, hp: t.hp });
  }

  faint(t, ev) {
    t.fainted = true;
    t.st = {};
    const slot = t.slot;
    t.field = false;
    ev.push({ t: 'faint', u: t.id, text: `${t.name} fainted!` });
    if (t.side === 1) this.defeated.push(t);
    const res = this.reserves(t.side)[0];
    if (res) this.bringIn(res, slot, ev);
  }

  bringIn(u, slot, ev) {
    u.field = true;
    u.slot = slot;
    u.joined = true;
    ev.push({ t: 'enter', u: u.id, slot, text: `${u.name} joins the battle!` });
  }

  swap(u, target, ev) {
    if (!target || target.side !== u.side || target.field || target.fainted) return;
    const slot = u.slot;
    u.field = false;
    u.slot = -1;
    ev.push({ t: 'leave', u: u.id, text: `${u.name}, come back!` });
    this.bringIn(target, slot, ev);
  }

  useItem(u, itemId, target, ev) {
    const it = ITEMS[itemId];
    if (!it || !this.ctx.useItem(itemId)) return;
    const pow = 1 + (this.ctx.fx?.itemPower || 0);
    ev.push({ t: 'item', u: u.id, item: itemId, target: target?.id, text: `Used ${it.name}.` });
    if (it.heal && target && !target.fainted) this.heal(target, Math.round(target.maxHp * it.heal * pow), ev);
    else if (it.revive && target && target.fainted) {
      target.fainted = false;
      target.hp = Math.round(target.maxHp * it.revive);
      ev.push({ t: 'revive', target: target.id, hp: target.hp });
      if (this.fieldUnits(target.side).length < FIELD) {
        const used = new Set(this.fieldUnits(target.side).map((x) => x.slot));
        let s = 0; while (used.has(s)) s++;
        this.bringIn(target, s, ev);
      }
    } else if (it.stamina && target) {
      target.sta = Math.min(target.maxSta, target.sta + Math.round(target.maxSta * it.stamina * pow));
      ev.push({ t: 'rest', u: target.id, amount: 0 });
    } else if (it.cure && target) {
      for (const k of Object.keys(target.st)) if (BAD.has(k)) { delete target.st[k]; ev.push({ t: 'status', u: target.id, s: k, on: false }); }
    } else if (it.buff && target) this.addStatus(target, it.buff, 3, ev);
    else if (it.bomb && target) {
      const mult = typeMultiplier(it.bomb.el, target.types);
      const dmg = Math.max(1, Math.round(target.maxHp * it.bomb.pct * Math.max(0.5, mult)));
      this.hurt(target, dmg, ev, { mult, el: it.bomb.el, bomb: true });
      if (!target.fainted && it.bomb.fx && Math.random() < it.bomb.p) this.addStatus(target, it.bomb.fx, 1, ev);
    } else if (it.flee) this.flee(u, ev, true);
  }

  captureChance(target, orbId) {
    const orb = ITEMS[orbId];
    if (!orb) return 0;
    if (orb.power >= 999) return 1;
    const sp = species(target.sp);
    const r = RARITY_MAP[sp.rarity];
    const hpFrac = target.hp / target.maxHp;
    let c = r.catch * (1 - 0.82 * hpFrac);
    if (target.st.sleep || target.st.freeze || target.st.stun) c *= 1.3;
    else if (Object.keys(target.st).some((k) => BAD.has(k))) c *= 1.12;
    c *= orb.power * (1 + (this.ctx.fx?.captureBonus || 0));
    const lvlFactor = clamp(1 + ((this.ctx.playerLevel || 1) * 2 - target.lvl) * 0.006, 0.7, 1.15);
    c *= lvlFactor;
    return clamp(c, 0.02, 0.95);
  }

  capture(u, orbId, target, ev) {
    if (!this.canCapture || !target || target.side !== 1 || target.fainted) return;
    if (!this.ctx.useItem(orbId)) return;
    const chance = this.captureChance(target, orbId);
    const success = Math.random() < chance;
    const shakes = success ? 3 : Math.floor(Math.random() * 3);
    ev.push({ t: 'capture', u: u.id, target: target.id, item: orbId, success, shakes, chance });
    if (success) {
      target.captured = true;
      target.field = false;
      this.captured.push(target);
      ev.push({ t: 'log', text: `Gotcha! ${target.name} was captured!` });
    } else {
      ev.push({ t: 'log', text: `${target.name} broke free!` });
    }
  }

  flee(u, ev, sure = false) {
    if (!this.canFlee) { ev.push({ t: 'log', text: "You can't run from this battle!" }); return; }
    const a = this.fieldUnits(0).reduce((s, x) => s + this.effStat(x, 'spd'), 0) / Math.max(1, this.fieldUnits(0).length);
    const b = this.fieldUnits(1).reduce((s, x) => s + this.effStat(x, 'spd'), 0) / Math.max(1, this.fieldUnits(1).length);
    const chance = sure ? 1 : clamp(0.45 + 0.25 * (a / Math.max(1, b)), 0.3, 0.95);
    if (Math.random() < chance) {
      this.ended = 'fled';
      ev.push({ t: 'flee', success: true, text: 'Got away safely!' });
      ev.push({ t: 'end', result: 'fled' });
    } else {
      ev.push({ t: 'flee', success: false, text: "Couldn't escape!" });
    }
  }

  // -------------------------------------------------------------- AI
  aiChoose(u) {
    const foes = this.fieldUnits(1 - u.side);
    const allies = this.fieldUnits(u.side);
    const taunter = foes.find((f) => f.st.taunt);
    const candidates = taunter ? [taunter] : foes;
    let best = { score: -1, action: { type: 'rest' } };
    const hpFrac = u.hp / u.maxHp;
    for (const { sk, ok } of this.usableSkills(u)) {
      if (!ok) continue;
      const jitter = randRange(0.8, 1.2);
      if (sk.kind === 'atk') {
        for (const t of candidates) {
          const mult = typeMultiplier(sk.el, t.types);
          let s = sk.pow * (sk.multi || 1) * mult * (u.types.includes(sk.el) ? STAB : 1) * (sk.sure ? 1 : sk.acc);
          if (sk.tgt === 'foes') s *= 0.75 * foes.length;
          const est = this.estimate(u, t, sk);
          if (est >= t.hp) s *= 1.5;
          s *= jitter;
          if (s > best.score) best = { score: s, action: { type: 'skill', skill: sk.id, target: t.id } };
        }
      } else if (sk.kind === 'heal') {
        const low = sk.tgt === 'self' ? (hpFrac < 0.45 ? u : null) : allies.find((a) => a.hp / a.maxHp < 0.45);
        const s = low ? 110 * jitter : 2;
        if (s > best.score) best = { score: s, action: { type: 'skill', skill: sk.id, target: (low || u).id } };
      } else if (sk.kind === 'buff') {
        const tgts = sk.tgt === 'self' ? [u] : allies;
        const need = tgts.some((t) => !t.st[sk.fx]);
        const s = need ? 42 * jitter * (this.round <= 2 ? 1.4 : 1) : 0;
        if (s > best.score) best = { score: s, action: { type: 'skill', skill: sk.id, target: u.id } };
      } else {
        const t = candidates.find((f) => !f.st[sk.fx]) || candidates[0];
        if (!t) continue;
        const has = !!t.st[sk.fx];
        const s = has ? 0 : 38 * (sk.p ?? 1) * jitter;
        if (s > best.score) best = { score: s, action: { type: 'skill', skill: sk.id, target: t.id } };
      }
    }
    if (best.score <= 0 && u.sta < u.maxSta * 0.3) return { type: 'rest' };
    if (best.action.type === 'rest') {
      const free = this.usableSkills(u).find(({ sk }) => sk.cost === 0 && sk.kind === 'atk');
      if (free && candidates.length) return { type: 'skill', skill: free.sk.id, target: candidates[0].id };
    }
    return best.action;
  }

  rawDamage(u, t, pow) {
    const a = Math.pow(this.effStat(u, 'atk') / AREF(u.lvl), 0.45);
    const d = Math.pow(this.effStat(t, 'def') / AREF(t.lvl), 0.45);
    const h = Math.pow(t.maxHp / HPREF(t.lvl), 0.5);
    return pow * 0.0032 * HPREF(u.lvl) * h * a * ((2 * a) / (a + d));
  }

  estimate(u, t, sk) {
    return this.rawDamage(u, t, sk.pow) * (sk.multi || 1) * typeMultiplier(sk.el, t.types) * (u.types.includes(sk.el) ? STAB : 1);
  }

  /** Writes HP/stamina back into the real beast objects of the player. */
  commit() {
    for (const u of this.units) {
      if (!u.ally) continue;
      u.b.hp = Math.max(0, Math.round(u.hp));
      u.b.sta = Math.max(0, Math.round(u.sta));
    }
  }
}

export function effectivenessFor(sk, target) { return typeMultiplier(sk.el, target.types); }
