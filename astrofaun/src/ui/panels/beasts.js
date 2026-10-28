// Beasts: party management, collection, and the beast detail sheet (stats, potions, skills).
import { h, I, IE, II, btn, openPanel, toast, pill, confirmBox, fmt, bar, elPill } from '../ui.js';
import { beastCard, portraitBox, statRows, xpBar, typePills, rarityPill } from '../widgets.js';
import { species, STAT_NAMES, RARITY_MAP, ROLE_NAMES } from '../../data/beasts.js';
import { SKILLS, describeSkill } from '../../data/skills.js';
import { ITEMS, BOOST_POTIONS } from '../../data/items.js';
import { BUILDINGS } from '../../data/buildings.js';
import {
  S, allBeasts, partyBeasts, partySlots, activeSlots, addToParty, removeFromParty, swapParty, releaseBeast, capacity, beastCount,
  busyReason, locationOf, habitatOf, houseBeast, unhouseBeast, feedPotion, useItemOnBeast, count, save, habitatCapacity, spend, markCaught,
} from '../../game/state.js';
import { statsOf, displayName, skillCost, MAX_BOOST, sellValue, power } from '../../game/beast.js';
import { formatNum } from '../../core/util.js';

export function openBeasts(tab = 'party') {
  const p = openPanel({
    title: 'Beasts', icon: 'paw', tab,
    tabs: [
      { id: 'party', label: 'Party', icon: 'star', render: (b) => partyTab(b, p) },
      { id: 'all', label: `Collection (${beastCount()}/${capacity()})`, icon: 'paw', render: (b) => allTab(b, p) },
    ],
  });
  return p;
}

function partyTab(body, p) {
  const party = partyBeasts();
  body.append(h('p', { class: 'small dim' }, `The first ${activeSlots()} fight on the field; the rest are reserves that swap in. Living party members all earn XP after battles. Slots: ${party.length}/${partySlots()}.`));
  const g = h('div', { class: 'grid' });
  party.forEach((b, i) => {
    const card = beastCard(b, { onClick: () => openBeastDetail(b, () => p.render()), note: i < activeSlots() ? 'Active ' + (i + 1) : 'Reserve' });
    const row = h('div', { class: 'row', style: { gap: '0.3rem' } },
      btn('', () => { if (i > 0) { swapParty(i, i - 1); p.render(); } }, 'gray tiny icon', 'back', { title: 'Move up', disabled: i === 0 }),
      btn('', () => { if (i < party.length - 1) { swapParty(i, i + 1); p.render(); } }, 'gray tiny icon', 'next', { title: 'Move down', disabled: i === party.length - 1 }),
      btn('Out', () => { if (S.party.length <= 1) return toast('Keep at least one beast in your party.', 'warn'); removeFromParty(b.uid); p.render(); }, 'gray tiny'),
    );
    card.append(row);
    g.append(card);
  });
  for (let i = party.length; i < partySlots(); i++) g.append(h('div', { class: 'card center dim', style: { display: 'grid', placeItems: 'center', minHeight: '9rem' } }, h('div', {}, I('plus', { size: 32 }), h('div', { class: 'small' }, 'Empty slot'))));
  body.append(g);
  if (S.player.partyBought < 2) {
    body.append(h('div', { class: 'card deep row between', style: { marginTop: '0.8rem' } }, h('span', { class: 'small' }, 'Buy an extra reserve slot'), btn(['Buy ', I('gem'), 20], () => { if (spend({ gems: 20 })) { S.player.partyBought++; save(); p.render(); } else toast('Not enough Astrogems.', 'warn'); }, 'purple small')));
  }
}

function allTab(body, p) {
  const st = p.filter ||= { sort: 'level', loc: 'all', el: 'all' };
  const seg = (key, opts) => h('div', { class: 'seg' }, opts.map(([v, label]) => h('button', { class: st[key] === v ? 'on' : '', onclick: () => { st[key] = v; p.render(); } }, label)));
  body.append(h('div', { class: 'row wrap', style: { marginBottom: '0.6rem' } },
    seg('sort', [['level', 'Level'], ['power', 'Power'], ['rarity', 'Rarity'], ['new', 'Newest']]),
    seg('loc', [['all', 'All'], ['party', 'Party'], ['habitat', 'Habitats'], ['storage', 'Storage']]),
  ));
  let list = allBeasts();
  if (st.loc !== 'all') list = list.filter((b) => locationOf(b.uid) === st.loc);
  const rv = (b) => ['common', 'uncommon', 'rare', 'epic', 'legendary'].indexOf(species(b.sp).rarity);
  list.sort((a, b) => st.sort === 'power' ? power(b) - power(a) : st.sort === 'rarity' ? rv(b) - rv(a) || b.lvl - a.lvl : st.sort === 'new' ? b.caughtAt - a.caughtAt : b.lvl - a.lvl);
  const g = h('div', { class: 'grid small' });
  for (const b of list) g.append(beastCard(b, { onClick: () => openBeastDetail(b, () => p.render()) }));
  body.append(g);
  body.append(h('p', { class: 'small dim', style: { marginTop: '0.8rem' } }, `Capacity ${beastCount()}/${capacity()}. Beast Feeders on your island raise it by 3 per level.`));
}

// ---------------------------------------------------------------- detail
export function openBeastDetail(b, onChange) {
  const p = openPanel({
    title: displayName(b), icon: 'paw', cls: 'mid', tab: 'info',
    tabs: [
      { id: 'info', label: 'Overview', icon: 'info', render: (body) => infoTab(body, b, p) },
      { id: 'skills', label: 'Skills', icon: 'sword', render: (body) => skillsTab(body, b, p) },
      { id: 'boost', label: 'Potions', icon: 'potion', iconOpts: { tint: 0xff5a3a }, render: (body) => boostTab(body, b, p) },
    ],
    onClose: () => onChange?.(),
  });
  return p;
}

function infoTab(body, b, p) {
  const sp = species(b.sp);
  const R = RARITY_MAP[sp.rarity];
  const st = statsOf(b);
  const busy = busyReason(b.uid);
  const left = h('div', { style: { width: 'min(14rem, 40%)', flex: 'none' } }, portraitBox(b));
  const right = h('div', { class: 'grow col' },
    h('div', { class: 'row wrap' }, typePills(sp.types), rarityPill(sp.rarity), pill(ROLE_NAMES[sp.role])),
    h('div', { class: 'small dim' }, `#${String(sp.id).padStart(3, '0')} ${sp.name}${b.nick ? ` (${b.nick})` : ''} · Stage ${sp.stage}${b.variant ? ' · Variant' : ''}`),
    h('div', { class: 'row' }, h('span', { class: 'head', style: { fontSize: '1.4rem' } }, 'Level ' + b.lvl), h('span', { class: 'dim small' }, `Power ${fmt(power(b))}`)),
    xpBar(b),
    h('div', {}, h('div', { class: 'tiny dim row between' }, h('span', {}, 'Health'), h('span', { class: 'num' }, `${Math.round(b.hp)} / ${st.hp}`)), bar(b.hp / st.hp, 'hp')),
    h('div', {}, h('div', { class: 'tiny dim row between' }, h('span', {}, 'Stamina'), h('span', { class: 'num' }, `${Math.round(b.sta)} / ${st.sta}`)), bar(b.sta / st.sta, 'sta')),
    busy ? h('div', { class: 'pill' }, I('clock'), busy) : null,
  );
  body.append(h('div', { class: 'row', style: { alignItems: 'flex-start', gap: '1rem' } }, left, right));
  body.append(h('h3', {}, 'Stats'), statRows(b));
  body.append(h('p', { class: 'tiny dim' }, `${R.name} beasts grow about ${(R.growth * 100).toFixed(1)}% per level, adjusted by role and type. XP needed rises ${((sp.xpRate - 1) * 100).toFixed(1)}% each level.`));
  if (sp.evolvesTo) body.append(h('p', { class: 'small' }, I('upgrade'), ` Evolves into ${species(sp.evolvesTo).name} at level ${sp.evolveLevel}.`));
  body.append(h('p', { class: 'small dim' }, sp.desc));
  // actions
  const loc = locationOf(b.uid);
  const acts = h('div', { class: 'row wrap', style: { marginTop: '0.6rem' } });
  if (loc !== 'party') acts.append(btn('Add to party', () => { if (addToParty(b.uid)) { save(); p.render(); } else toast('Party is full.', 'warn'); }, 'green small', 'plus'));
  else acts.append(btn('Remove from party', () => { if (S.party.length <= 1) return toast('Keep at least one beast in your party.', 'warn'); removeFromParty(b.uid); save(); p.render(); }, 'gray small', 'minus'));
  const habs = S.buildings.filter((x) => x.residents && sp.types.includes(BUILDINGS[x.type].el) && x.residents.length < habitatCapacity(x) && !x.residents.includes(b.uid));
  for (const hb of habs.slice(0, 2)) acts.append(btn('Move to ' + BUILDINGS[hb.type].name, () => { const e = houseBeast(b.uid, hb.uid); if (e) toast(e, 'warn'); else { save(); p.render(); } }, 'gray small', 'home'));
  if (habitatOf(b.uid)) acts.append(btn('Leave habitat', () => { unhouseBeast(b.uid); save(); p.render(); }, 'gray small'));
  acts.append(btn('Rename', () => { const n = prompt('Nickname (empty to clear):', b.nick || ''); if (n !== null) { b.nick = n.trim().slice(0, 16) || null; save(); p.setTitle(displayName(b)); p.render(); } }, 'gray small'));
  acts.append(btn(['Release ', I('lunite'), fmt(sellValue(b))], () => confirmBox('Release beast', `Release ${displayName(b)}? You'll get ${fmt(sellValue(b))} Lunites and some Beast Fluff.`, 'Release', () => { const r = releaseBeast(b.uid); if (r.ok) { save(); p.close(); } else toast(r.err, 'warn'); }, 'red'), 'red small'));
  body.append(acts);
  // items
  const usable = Object.keys(S.inventory).filter((id) => ITEMS[id] && (ITEMS[id].heal || ITEMS[id].revive || ITEMS[id].stamina || ITEMS[id].xpPct));
  if (usable.length) {
    body.append(h('h3', {}, 'Use an item'));
    body.append(h('div', { class: 'row wrap' }, usable.map((id) => btn([II(id), ' ', ITEMS[id].name, ` x${count(id)}`], () => {
      const r = useItemOnBeast(b.uid, id);
      if (!r) toast('That would have no effect right now.', 'warn');
      else { if (r.evolvedTo) { toast(`${species(r.evolvedFrom).name} evolved into ${species(r.evolvedTo).name}!`, 'good', 'upgrade'); markCaught(r.evolvedTo); } save(); p.render(); }
    }, 'gray small'))));
  }
}

function skillsTab(body, b, p) {
  const sel = p.skillSel ?? null;
  body.append(h('p', { class: 'small dim' }, 'A beast can equip four skills. Tap an equipped skill, then a learned one to swap them. Replaced skills can always be re-equipped.'));
  body.append(h('h3', {}, 'Equipped'));
  const eq = h('div', { class: 'col' });
  b.skills.forEach((id, i) => {
    const sk = SKILLS[id];
    eq.append(skillRow(sk, b, { cls: 'eq' + (sel === i ? ' sel' : ''), onClick: () => { p.skillSel = sel === i ? null : i; p.render(); } }));
  });
  body.append(eq);
  const other = b.learned.filter((id) => !b.skills.includes(id));
  body.append(h('h3', {}, 'Learned'));
  const ol = h('div', { class: 'col' });
  for (const id of other) ol.append(skillRow(SKILLS[id], b, { onClick: () => {
    if (b.skills.length < 4) b.skills.push(id);
    else if (sel !== null) b.skills[sel] = id;
    else return toast('Tap an equipped skill first to choose which one to replace.', 'warn');
    p.skillSel = null; save(); p.render();
  } }));
  if (!other.length) ol.append(h('div', { class: 'dim small' }, 'No other skills learned yet.'));
  body.append(ol);
  const sp = species(b.sp);
  const upcoming = sp.learnset.filter(([lvl, id]) => lvl > b.lvl && !b.learned.includes(id)).slice(0, 6);
  if (upcoming.length) {
    body.append(h('h3', {}, 'Coming up'));
    body.append(h('div', { class: 'col' }, upcoming.map(([lvl, id]) => skillRow(SKILLS[id], b, { cls: '', note: 'Lv ' + lvl, dim: true }))));
  }
}

export function skillRow(sk, b, opts = {}) {
  return h('div', { class: 'skill ' + (opts.cls || ''), onclick: opts.onClick, style: { cursor: opts.onClick ? 'pointer' : 'default', opacity: opts.dim ? 0.6 : 1 } },
    IE(sk.el, { size: 30 }),
    h('div', { class: 'grow' }, h('div', { class: 'sk-name' }, sk.name, opts.note ? h('span', { class: 'tiny dim' }, '  ' + opts.note) : null), h('div', { class: 'sk-desc' }, describeSkill(sk))),
    h('span', { class: 'pill' }, I('stamina', { size: 14 }), skillCost(sk, b.lvl)),
  );
}

function boostTab(body, b, p) {
  body.append(h('p', { class: 'small dim' }, `Feed one kind of stat potion to permanently raise that stat by 2% per dose, up to ${MAX_BOOST} doses (+200%). Only one stat per beast can be boosted.`));
  const cur = b.boost;
  body.append(h('div', { class: 'card deep row between' },
    h('div', {}, h('div', { class: 'head' }, cur.stat ? `${STAT_NAMES[cur.stat]} boosted` : 'No boost yet'), h('div', { class: 'small dim' }, cur.stat ? `${cur.n} / ${MAX_BOOST} doses · +${cur.n * 2}%` : 'Choose any potion below to lock in a stat.')),
    cur.stat ? h('div', { style: { width: '40%' } }, bar(cur.n / MAX_BOOST, 'gold')) : null,
  ));
  const g = h('div', { class: 'grid', style: { marginTop: '0.6rem' } });
  for (const [id, info] of Object.entries(BOOST_POTIONS)) {
    const have = count(id);
    const locked = cur.stat && cur.stat !== info.stat;
    const full = cur.stat === info.stat && cur.n >= MAX_BOOST;
    g.append(h('div', { class: 'card col ' + (locked ? 'locked' : '') },
      h('div', { class: 'row' }, h('span', { style: { fontSize: '2.2rem', lineHeight: 1 } }, II(id)), h('div', {}, h('div', { class: 'head small' }, info.name), h('div', { class: 'tiny dim' }, `${STAT_NAMES[info.stat]} +2% · owned ${have}`))),
      locked ? h('span', { class: 'tiny dim' }, 'Another stat is boosted') : full ? h('span', { class: 'tiny dim' }, 'Maxed') : h('div', { class: 'row wrap' },
        btn('Feed 1', () => feed(b, id, 1, p), 'green small', null, { disabled: have < 1 }),
        btn('x10', () => feed(b, id, 10, p), 'gray small', null, { disabled: have < 1 }),
        btn('Max', () => feed(b, id, MAX_BOOST, p), 'gray small', null, { disabled: have < 1 })),
    ));
  }
  body.append(g);
  body.append(h('p', { class: 'tiny dim', style: { marginTop: '0.6rem' } }, 'Brew potions at the Laboratory from gems found in caves.'));
}

function feed(b, id, n, p) {
  const r = feedPotion(b.uid, id, n);
  if (!r.ok) toast(r.err, 'warn');
  else { toast(`Fed ${r.used} ${ITEMS[id].name}${r.used > 1 ? 's' : ''}.`, 'good', 'potion'); save(); }
  p.render();
}

export { formatNum, elPill };
