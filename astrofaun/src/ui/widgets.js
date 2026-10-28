// Reusable UI pieces: beast cards, stat rows, timers, item tiles.
import { h, I, IE, II, bar, pill, elPill, btn, fmt } from './ui.js';
import { species, STATS, STAT_NAMES, STAT_SHORT, RARITY_MAP } from '../data/beasts.js';
import { ITEMS } from '../data/items.js';
import { statsOf, xpToNext, displayName, growthOf, power } from '../game/beast.js';
import { busyReason, locationOf } from '../game/state.js';
import { portraitImg } from '../render/portraits.js';
import { formatTime } from '../core/util.js';

export function portraitBox(b, opts = {}) {
  const sp = species(b.sp);
  const box = h('div', { class: 'portrait' }, portraitImg(b.sp, b.variant));
  if (opts.level !== false) box.append(h('span', { class: 'lvlb' }, 'Lv ' + b.lvl));
  const tags = h('span', { class: 'tag' });
  for (const t of sp.types) tags.append(h('span', { html: '', style: { display: 'contents' } }, IE(t, { size: 18 })));
  box.append(tags);
  return box;
}

export function speciesPortrait(spId, variant = false) {
  return h('div', { class: 'portrait' }, portraitImg(spId, variant));
}

export function hpBar(b) {
  const st = statsOf(b);
  const f = b.hp / st.hp;
  return bar(f, 'hp' + (f < 0.3 ? ' low' : ''));
}

/** Compact card for grids. opts: { onClick, selected, note, showBars } */
export function beastCard(b, opts = {}) {
  const sp = species(b.sp);
  const busy = busyReason(b.uid);
  const card = h('div', { class: 'card beast-card ' + (opts.onClick ? 'click ' : '') + (opts.selected ? 'sel ' : ''), onclick: opts.onClick ? () => opts.onClick(b) : null },
    portraitBox(b),
    h('div', { class: 'name rarity-' + sp.rarity }, displayName(b) + (b.variant ? ' *' : '')),
    opts.showBars !== false ? hpBar(b) : null,
    h('div', { class: 'row between tiny dim' }, h('span', {}, opts.note ?? (busy || locLabel(b))), h('span', { class: 'num' }, 'PWR ' + fmt(power(b)))),
  );
  return card;
}

function locLabel(b) { return { party: 'Party', habitat: 'Habitat', storage: 'Storage' }[locationOf(b.uid)]; }

export function typePills(types) { return h('span', { class: 'row wrap', style: { gap: '0.3rem' } }, types.map((t) => elPill(t))); }

export function rarityPill(r) {
  const R = RARITY_MAP[r];
  return pill([I('star', { size: 14 }), R.name], 'rarity-' + r);
}

const STAT_ICONS = { hp: 'heart', atk: 'sword', def: 'shield', spd: 'boot', sta: 'stamina' };

export function statRows(b) {
  const st = statsOf(b);
  const maxRef = Math.max(...STATS.map((s) => st[s])) * 1.05;
  return h('div', { class: 'col', style: { gap: '0.3rem' } }, STATS.map((s) => {
    const g = growthOf(b, s);
    const boosted = b.boost?.stat === s && b.boost.n > 0;
    return h('div', { class: 'stat-row', title: `${STAT_NAMES[s]}: grows ${(g * 100).toFixed(2)}% per level` },
      I(STAT_ICONS[s]),
      h('span', {}, STAT_SHORT[s], h('span', { class: 'tiny mute' }, ' +' + (g * 100).toFixed(1) + '%')),
      bar(st[s] / maxRef, s === 'hp' ? 'hp' : s === 'sta' ? 'sta' : ''),
      h('span', { class: 'val' }, fmt(st[s]), boosted ? h('span', { class: 'tiny', style: { color: '#ffe27a' } }, ' +' + b.boost.n * 2 + '%') : null),
    );
  }));
}

export function xpBar(b) {
  const need = xpToNext(b);
  return h('div', {}, bar(isFinite(need) ? b.xp / need : 1), h('div', { class: 'tiny dim row between' }, h('span', {}, 'XP'), h('span', { class: 'num' }, isFinite(need) ? `${fmt(b.xp)} / ${fmt(need)}` : 'MAX')));
}

/** Live timer element that re-renders every second */
export function timer(endsAt, total, onDone) {
  const t = h('div', {});
  const tick = () => {
    if (!t.isConnected && t._started) return;
    t._started = true;
    const left = Math.max(0, endsAt - Date.now());
    t.innerHTML = '';
    t.append(bar(total ? 1 - left / total : 1, 'gold'), h('div', { class: 'tiny dim row between' }, h('span', {}, left > 0 ? 'Working' : 'Done'), h('span', { class: 'num' }, left > 0 ? formatTime(left) : 'Ready')));
    if (left <= 0) { onDone?.(); return; }
    setTimeout(tick, 1000);
  };
  tick();
  return t;
}

export function itemTile(id, n, opts = {}) {
  const it = ITEMS[id];
  return h('div', { class: 'card click center', onclick: opts.onClick ? () => opts.onClick(id) : null, title: it?.desc || '' },
    h('div', { style: { fontSize: '2.2rem', lineHeight: 1 } }, II(id)),
    h('div', { class: 'tiny head', style: { marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, it?.name || id),
    n !== undefined ? h('div', { class: 'num small' }, 'x' + fmt(n)) : null,
  );
}

export { btn, fmt, I, II, IE };
