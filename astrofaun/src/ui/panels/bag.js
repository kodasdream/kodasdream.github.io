// Inventory: items by category with use actions.
import { h, I, II, btn, openPanel, toast, fmt } from '../ui.js';
import { itemTile, beastCard } from '../widgets.js';
import { ITEMS } from '../../data/items.js';
import { EGGS } from '../../data/beasts.js';
import { S, count, useUtilItem, useItemOnBeast, allBeasts, save, partyBeasts } from '../../game/state.js';
import { openBeastDetail } from './beasts.js';
import { formatTime } from '../../core/util.js';

const CATS = [
  { id: 'battle', label: 'Battle', icon: 'orb', cats: ['orb', 'heal', 'battle'] },
  { id: 'potions', label: 'Potions', icon: 'potion', cats: ['boost'] },
  { id: 'util', label: 'Utility', icon: 'can', cats: ['util'] },
  { id: 'mats', label: 'Materials', icon: 'fiber', cats: ['mat'] },
  { id: 'ores', label: 'Ores & Gems', icon: 'ore', cats: ['ore', 'gem', 'bar'] },
  { id: 'eggs', label: 'Eggs', icon: 'egg', cats: [] },
];

export function openBag(tab = 'battle') {
  const p = openPanel({
    title: 'Bag', icon: 'bag', tab,
    tabs: CATS.map((c) => ({ id: c.id, label: c.label, icon: c.icon, render: (body) => (c.id === 'eggs' ? eggsTab(body) : catTab(body, c, p)) })),
  });
  return p;
}

function catTab(body, c, p) {
  const ids = Object.keys(S.inventory).filter((id) => ITEMS[id] && c.cats.includes(ITEMS[id].cat) && S.inventory[id] > 0);
  if (!ids.length) { body.append(h('div', { class: 'empty' }, 'Nothing here yet.')); return; }
  const g = h('div', { class: 'grid tiny' });
  for (const id of ids) g.append(itemTile(id, S.inventory[id], { onClick: () => itemDetail(id, p) }));
  body.append(g);
}

function eggsTab(body) {
  if (!S.eggs.length) { body.append(h('div', { class: 'empty' }, 'No eggs. Breed two habitat beasts at a Breeding Facility.')); return; }
  const g = h('div', { class: 'grid small' });
  for (const e of S.eggs) {
    const egg = EGGS[e.type];
    g.append(h('div', { class: 'card col center' }, I('egg', { size: 56, tint: egg.color, spot: egg.spot }), h('div', { class: 'head small' }, egg.name), h('div', { class: 'tiny dim' }, `${egg.time} min base hatch time`)));
  }
  body.append(g);
}

function itemDetail(id, parent) {
  const it = ITEMS[id];
  const p = openPanel({
    title: it.name, cls: 'narrow',
    render: (body) => {
      body.append(h('div', { class: 'row' }, h('span', { style: { fontSize: '3.4rem', lineHeight: 1 } }, II(id)), h('div', {}, h('div', { class: 'head' }, `Owned: ${fmt(count(id))}`), h('div', { class: 'small dim' }, it.desc))));
      if (it.energy || it.fuel) {
        body.append(btn('Use', () => { if (useUtilItem(id)) { toast(`Used ${it.name}.`, 'good'); save(); p.render(); parent?.render(); } }, 'green', null, { disabled: count(id) < 1 }));
      } else if (it.heal || it.revive || it.stamina || it.xpPct) {
        body.append(h('h3', {}, 'Use on'));
        const g = h('div', { class: 'grid small' });
        for (const b of partyBeasts()) g.append(beastCard(b, { onClick: () => { const r = useItemOnBeast(b.uid, id); if (!r) toast('No effect.', 'warn'); else { save(); p.render(); parent?.render(); } } }));
        body.append(g);
      } else if (it.boostStat) {
        body.append(h('p', { class: 'small' }, 'Open a beast\'s Potions tab to feed this.'));
        const g = h('div', { class: 'grid small' });
        for (const b of allBeasts().slice(0, 30)) g.append(beastCard(b, { onClick: () => { p.close(); openBeastDetail(b).setTab('boost'); } }));
        body.append(g);
      } else if (it.cat === 'orb') body.append(h('p', { class: 'small dim' }, 'Use orbs in wild battles with the Capture button.'));
      else if (it.cat === 'battle') body.append(h('p', { class: 'small dim' }, 'Use from the Items button during battles.'));
    },
  });
}

export { formatTime };
