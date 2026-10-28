// Interaction panels for every home building.
import { h, I, II, btn, openPanel, costPills, toast, pill, confirmBox, fmt, elPill } from './ui.js';
import { beastCard, timer, portraitBox, typePills } from './widgets.js';
import { BUILDINGS } from '../data/buildings.js';
import { RECIPES, ITEMS } from '../data/items.js';
import { EGGS, species } from '../data/beasts.js';
import { ELEMENT_MAP } from '../data/elements.js';
import {
  S, count, upgradeCost, upgradeBlockReason, upgradeBuilding, sellBuilding, jobDone, jobRemaining, collectJob, speedUp, speedUpCost,
  pumpOptions, startPump, trainOptions, startTraining, trainCostFor, startIncubation, hatchTime, startBreeding, canBreed, breedTime,
  pendingIncome, collectIncome, habitatCapacity, houseBeast, unhouseBeast, allBeasts, busyReason, habitatOf, craft, hasRecipeUnlock,
  fuelMax, energyMax, warpLevel, fx, save, capacity, beastCount, partyBeasts, beast,
} from '../game/state.js';
import { formatTime, bus } from '../core/util.js';
import { eggTypeFor } from '../data/beasts.js';
import { openResearch } from './panels/research.js';
import { openArena } from './panels/arena.js';
import { openBeastDetail } from './panels/beasts.js';
import { showHatch } from './panels/reveal.js';

export function openBuildingPanel(b, scene) {
  const def = BUILDINGS[b.type];
  const p = openPanel({
    title: def.name + (def.maxLevel > 1 ? `  Lv ${b.level}` : ''),
    icon: def.icon || 'home',
    cls: 'mid',
    render: (body) => {
      p?.setTitle?.(def.name + (def.maxLevel > 1 ? `  Lv ${b.level}` : ''));
      body.append(h('p', { class: 'dim' }, def.desc));
      const fn = BODIES[b.type] || (def.cat === 'habitat' ? habitatBody : null);
      if (fn) fn(body, b, p, scene);
      upgradeSection(body, b, p);
    },
    foot: (f) => {
      if (def.cat !== 'core') f.append(btn('Move', () => { p.close(); scene.startBuild(b.type, b); }, 'gray small', 'move'));
      if (!def.noSell) f.append(btn('Sell', () => confirmBox('Sell building', `Sell ${def.name} for ${fmt(Math.floor((def.cost.lunites || 0) * 0.4))} Lunites?`, 'Sell', () => { if (sellBuilding(b.uid)) { p.close(); save(); } else toast('Empty it first (no residents or running jobs).', 'warn'); }, 'red'), 'red small', 'trash'));
    },
  });
  const off = bus.on('buildings', () => { if (p.panel.isConnected) p.render(); else off(); });
  return p;
}

function upgradeSection(body, b, p) {
  const def = BUILDINGS[b.type];
  if (!def.upgrade || def.maxLevel <= 1) return;
  const c = upgradeCost(b);
  const box = h('div', { class: 'card deep', style: { marginTop: '0.8rem' } });
  if (!c) { box.append(h('div', { class: 'row' }, I('star'), h('span', { class: 'head' }, 'Maximum level reached'))); body.append(box); return; }
  const reason = upgradeBlockReason(b);
  box.append(h('div', { class: 'row between wrap' },
    h('div', { class: 'col', style: { gap: '0.3rem' } }, h('span', { class: 'head' }, `Upgrade to level ${b.level + 1}`), costPills(c, count), reason && reason !== 'Not enough resources' ? h('span', { class: 'small', style: { color: '#ffb05a' } }, reason) : null),
    btn('Upgrade', () => { if (upgradeBuilding(b.uid)) { toast(`${def.name} upgraded to level ${b.level}!`, 'good', 'upgrade'); save(); p.render(); } else toast(upgradeBlockReason(b) || 'Cannot upgrade', 'warn'); }, 'green', 'upgrade', { disabled: !!reason }),
  ));
  body.append(box);
}

function jobBox(body, b, p, label, onCollect) {
  const box = h('div', { class: 'card' });
  if (jobDone(b)) {
    box.append(h('div', { class: 'row between' }, h('span', { class: 'head' }, label + ' complete!'), btn('Collect', () => { const r = collectJob(b); onCollect?.(r); save(); p.render(); }, 'green', 'check')));
  } else {
    box.append(h('div', { class: 'head', style: { marginBottom: '0.4rem' } }, label + '...'), timer(b.job.endsAt, b.job.total, () => p.panel.isConnected && p.render()));
    box.append(h('div', { class: 'row', style: { marginTop: '0.5rem', justifyContent: 'flex-end' } }, btn(['Finish now ', I('gem'), speedUpCost(b)], () => { if (speedUp(b)) { p.render(); } else toast('Not enough Astrogems.', 'warn'); }, 'purple small')));
  }
  body.append(box);
}

// ---------------------------------------------------------------- bodies
const BODIES = {
  command_pod(body, b) {
    body.append(h('div', { class: 'kv card deep' },
      h('dt', {}, 'Ranger level'), h('dd', {}, S.player.level),
      h('dt', {}, 'Energy cap'), h('dd', {}, energyMax()),
      h('dt', {}, 'Beasts owned'), h('dd', {}, `${beastCount()} / ${capacity()}`),
      h('dt', {}, 'Buildings'), h('dd', {}, S.buildings.length),
      h('dt', {}, 'Planets visited'), h('dd', {}, Object.values(S.planets).filter((p) => p.visited).length + ' / 22'),
    ));
  },
  launch_pad(body, b, p, scene) {
    body.append(h('div', { class: 'card row between wrap' },
      h('div', { class: 'col', style: { gap: '0.2rem' } }, h('span', { class: 'head' }, 'Starship'), h('span', { class: 'small dim' }, `Fuel ${fmt(S.player.fuel)} / ${fuelMax()}  ·  Warp Drive reaches Sector ${warpLevel()}`)),
      btn('Open Star Map', () => { p.close(); scene.game.go('starmap'); }, 'big orange', 'map'),
    ));
    const warp = fx().warp || 0;
    body.append(h('p', { class: 'small dim' }, `Each Launch Pad level unlocks the next sector. Research Warp Theory to allow upgrades (researched: ${warp}).`));
  },
  fuel_pump(body, b, p) {
    body.append(h('p', { class: 'small' }, `Tank: ${fmt(S.player.fuel)} / ${fuelMax()} fuel. Pumps can overfill the tank.`));
    if (b.job) return jobBox(body, b, p, 'Pumping fuel', (r) => r && toast(`+${r.amount} fuel`, 'good', 'fuel'));
    const g = h('div', { class: 'grid' });
    for (const o of pumpOptions(b)) {
      g.append(h('div', { class: 'card col' }, h('div', { class: 'row' }, I('fuel', { size: 34 }), h('span', { class: 'head', style: { fontSize: '1.3rem' } }, '+' + o.amount)),
        h('div', { class: 'small dim row' }, I('clock'), formatTime(o.secs * 1000)),
        btn(['Pump ', I('lunite'), o.cost], () => { if (startPump(b, o)) { save(); p.render(); } else toast('Not enough Lunites.', 'warn'); }, 'green small'),
      ));
    }
    body.append(g);
  },
  beast_feeder(body, b, p) {
    const inc = pendingIncome(b);
    body.append(h('div', { class: 'card row between' }, h('span', {}, `Adds ${3 * b.level} beast capacity. Snacks dropped: `, h('b', {}, fmt(inc))), btn(['Collect ', I('lunite')], () => { const v = collectIncome(b); if (v) toast(`+${fmt(v)} Lunites`, 'good', 'lunite'); p.render(); }, 'green small', null, { disabled: inc <= 0 })));
  },
  training_dojo(body, b, p) {
    if (b.job) {
      const bst = beast(b.job.beast);
      if (bst) body.append(h('div', { class: 'row', style: { marginBottom: '0.6rem' } }, h('div', { style: { width: '5rem' } }, portraitBox(bst)), h('div', {}, h('div', { class: 'head' }, species(bst.sp).name), h('div', { class: 'small dim' }, `Training for ${fmt(b.job.xp)} XP`))));
      return jobBox(body, b, p, 'Training', (r) => { if (r?.res) toast(`${species(r.beast.sp).name} gained ${r.res.levels} level(s)!`, 'good', 'upgrade'); });
    }
    const sel = p.sel ||= { beast: null, opt: 'mid' };
    const opts = trainOptions(b);
    body.append(h('h3', {}, 'Choose a beast'));
    const g = h('div', { class: 'grid small' });
    for (const bst of allBeasts().filter((x) => !busyReason(x.uid) && x.lvl < 100).sort((a, c) => c.lvl - a.lvl)) g.append(beastCard(bst, { selected: sel.beast === bst.uid, onClick: () => { sel.beast = bst.uid; p.render(); } }));
    body.append(g);
    body.append(h('h3', {}, 'Session'));
    const og = h('div', { class: 'grid' });
    const bst = sel.beast && beast(sel.beast);
    for (const o of opts) {
      const tickets = o.id === 'short' ? 1 : o.id === 'mid' ? 2 : 4;
      og.append(h('div', { class: 'card col ' + (sel.opt === o.id ? 'sel' : ''), onclick: () => { sel.opt = o.id; p.render(); } },
        h('span', { class: 'head' }, o.label), h('span', { class: 'small dim row' }, I('clock'), formatTime(o.secs * 1000), `  ·  ${o.frac}x level of XP`),
        h('div', { class: 'row wrap' },
          btn([I('lunite'), bst ? fmt(trainCostFor(o, bst)) : fmt(o.cost)], () => { if (!bst) return toast('Pick a beast first.', 'warn'); if (startTraining(b, bst.uid, o, false)) { save(); p.render(); } else toast('Not enough Lunites.', 'warn'); }, 'green small'),
          btn([I('ticket', { tint: 0xff7ab0 }), tickets], () => { if (!bst) return toast('Pick a beast first.', 'warn'); if (startTraining(b, bst.uid, o, true)) { save(); p.render(); } else toast('Not enough Training Tickets.', 'warn'); }, 'purple small'),
        )));
    }
    body.append(og);
  },
  incubator(body, b, p) {
    if (b.job) {
      const egg = EGGS[b.job.egg.type];
      body.append(h('div', { class: 'row', style: { marginBottom: '0.5rem' } }, I('egg', { size: 48, tint: egg.color, spot: egg.spot }), h('span', { class: 'head' }, egg.name)));
      return jobBox(body, b, p, 'Incubating', (r) => { if (r?.beast) showHatch(r.beast); });
    }
    if (!S.eggs.length) { body.append(h('div', { class: 'empty' }, 'No eggs yet. Pair two habitat beasts at a Breeding Facility.')); return; }
    const g = h('div', { class: 'grid small' });
    for (const e of S.eggs) {
      const egg = EGGS[e.type];
      g.append(h('div', { class: 'card col center' }, I('egg', { size: 56, tint: egg.color, spot: egg.spot }), h('span', { class: 'head small' }, egg.name), h('span', { class: 'tiny dim' }, formatTime(hatchTime(b, e))),
        btn('Incubate', () => { if (startIncubation(b, e.uid)) { save(); p.render(); } }, 'green small')));
    }
    body.append(g);
  },
  breeding_facility(body, b, p) {
    if (b.job) return jobBox(body, b, p, 'Breeding', (r) => { if (r?.egg) toast(`You got a ${EGGS[r.egg.type].name}! Put it in an Incubator.`, 'good', 'egg'); });
    const sel = p.sel ||= { a: null, b: null };
    const cands = allBeasts().filter((x) => habitatOf(x.uid) && !busyReason(x.uid) && species(x.sp).rarity !== 'legendary');
    if (cands.length < 2) { body.append(h('div', { class: 'empty' }, 'Only beasts living in habitats can breed (level 10+). Move at least two into habitats.')); return; }
    const A = sel.a && beast(sel.a), B2 = sel.b && beast(sel.b);
    const preview = h('div', { class: 'card deep row between wrap', style: { marginBottom: '0.6rem' } });
    if (A && B2) {
      const err = canBreed(A, B2);
      const egg = EGGS[eggTypeFor(species(A.sp).types[0], species(B2.sp).types[0])];
      preview.append(h('div', { class: 'row' }, I('egg', { size: 40, tint: egg.color, spot: egg.spot }), h('div', {}, h('div', { class: 'head' }, egg.name), h('div', { class: 'tiny dim' }, 'Hatches: ' + egg.els.map((e) => ELEMENT_MAP[e].name).join(', ')), h('div', { class: 'tiny dim' }, formatTime(breedTime(b)) + (count('love_nectar') ? ' (Love Nectar will halve it)' : '')))),
        err ? h('span', { class: 'small', style: { color: '#ffb05a' } }, err) : btn('Start breeding', () => { if (startBreeding(b, A.uid, B2.uid)) { p.sel = null; save(); p.render(); } }, 'green', 'heartpair'));
    } else preview.append(h('span', { class: 'dim' }, 'Pick two beasts.'));
    body.append(preview);
    const g = h('div', { class: 'grid small' });
    for (const x of cands) g.append(beastCard(x, { selected: sel.a === x.uid || sel.b === x.uid, note: x.lvl < 10 ? 'Needs Lv 10' : null, onClick: () => {
      if (sel.a === x.uid) sel.a = null; else if (sel.b === x.uid) sel.b = null; else if (!sel.a) sel.a = x.uid; else sel.b = x.uid;
      p.render();
    } }));
    body.append(g);
  },
  laboratory(body, b, p) { recipeList(body, 'lab', p); },
  workshop(body, b, p) { recipeList(body, 'workshop', p); },
  refinery(body, b, p) { recipeList(body, 'refinery', p); },
  research_station(body, b, p) {
    body.append(h('div', { class: 'card row between' }, h('span', {}, `Research tier unlocked: ${b.level}`), btn('Open research', () => { p.close(); openResearch(); }, 'purple', 'flask')));
  },
  arena(body, b, p) {
    body.append(h('div', { class: 'card row between' }, h('span', {}, `Rating ${S.arena.rating}  ·  ${S.arena.wins} wins`), btn('Find rivals', () => { p.close(); openArena(); }, 'orange', 'trophy')));
  },
};

function habitatBody(body, b, p) {
  const def = BUILDINGS[b.type];
  const el = def.el;
  const inc = pendingIncome(b);
  body.append(h('div', { class: 'card row between wrap' },
    h('span', {}, elPill(el), `  ${b.residents.length} / ${habitatCapacity(b)} residents`),
    btn(['Collect ', I('lunite'), fmt(inc)], () => { const v = collectIncome(b); if (v) toast(`+${fmt(v)} Lunites`, 'good', 'lunite'); p.render(); }, 'green small', null, { disabled: inc <= 0 }),
  ));
  body.append(h('h3', {}, 'Residents'));
  const g = h('div', { class: 'grid small' });
  for (const u of b.residents) {
    const x = beast(u);
    if (!x) continue;
    const card = beastCard(x, { onClick: () => openBeastDetail(x) });
    card.append(btn('Move out', () => { unhouseBeast(u); save(); p.render(); }, 'gray tiny'));
    g.append(card);
  }
  if (!b.residents.length) g.append(h('div', { class: 'empty' }, 'Empty habitat.'));
  body.append(g);
  if (b.residents.length < habitatCapacity(b)) {
    body.append(h('h3', {}, `Move in a ${ELEMENT_MAP[el].name} beast`));
    const cands = allBeasts().filter((x) => species(x.sp).types.includes(el) && !b.residents.includes(x.uid) && !busyReason(x.uid));
    const g2 = h('div', { class: 'grid small' });
    for (const x of cands) g2.append(beastCard(x, { onClick: () => { const err = houseBeast(x.uid, b.uid); if (err) toast(err, 'warn'); else { save(); p.render(); } } }));
    if (!cands.length) g2.append(h('div', { class: 'empty' }, `You have no other ${ELEMENT_MAP[el].name} beasts.`));
    body.append(g2);
  }
}

function recipeList(body, station, p) {
  const list = RECIPES.filter((r) => r.station === station);
  const g = h('div', { class: 'col' });
  for (const r of list) {
    const it = ITEMS[r.out];
    const locked = !hasRecipeUnlock(r.unlock);
    const cost = { ...r.inputs, lunites: r.lunites };
    const canOne = Object.entries(cost).every(([k, v]) => !v || count(k) >= v);
    g.append(h('div', { class: 'card row wrap ' + (locked ? 'locked' : '') },
      h('div', { style: { fontSize: '2.4rem', lineHeight: 1 } }, II(r.out)),
      h('div', { class: 'grow col', style: { gap: '0.2rem' } },
        h('div', { class: 'row' }, h('span', { class: 'head' }, it.name + (r.qty > 1 ? ` x${r.qty}` : '')), h('span', { class: 'tiny dim' }, `owned ${fmt(count(r.out))}`)),
        h('div', { class: 'tiny dim' }, it.desc),
        locked ? h('span', { class: 'small', style: { color: '#ffb05a' } }, 'Unlock through research') : costPills(cost, count)),
      locked ? null : h('div', { class: 'row' },
        btn('Make', () => { const n = craft(r.id, 1); if (n) { toast(`Made ${it.name}${r.qty > 1 ? ' x' + r.qty : ''}`, 'good'); save(); p.render(); } else toast('Missing ingredients.', 'warn'); }, 'green small', null, { disabled: !canOne }),
        btn('x5', () => { const n = craft(r.id, 5); if (n) { toast(`Made ${n * r.qty} ${it.name}`, 'good'); save(); p.render(); } else toast('Missing ingredients.', 'warn'); }, 'gray small', null, { disabled: !canOne })),
    ));
  }
  body.append(g);
}
