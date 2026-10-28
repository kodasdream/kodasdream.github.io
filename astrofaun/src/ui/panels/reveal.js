// Celebration popups: hatching, captures, evolutions, new species.
import { h, I, btn, openPanel } from '../ui.js';
import { speciesPortrait, typePills, rarityPill } from '../widgets.js';
import { species } from '../../data/beasts.js';
import { openBeastDetail } from './beasts.js';

function reveal(title, spId, variant, text, b) {
  const sp = species(spId);
  const p = openPanel({
    title, icon: 'star', cls: 'narrow',
    render: (body) => {
      body.append(h('div', { class: 'result-hero' }, h('div', { class: 'big' }, sp.name)));
      body.append(h('div', { style: { width: '60%', margin: '0 auto' } }, speciesPortrait(spId, variant)));
      body.append(h('div', { class: 'row wrap', style: { justifyContent: 'center', marginTop: '0.5rem' } }, typePills(sp.types), rarityPill(sp.rarity)));
      body.append(h('p', { class: 'center' }, text));
    },
    foot: (f) => { if (b) f.append(btn('View', () => { p.close(); openBeastDetail(b); }, 'gray')); f.append(btn('Great!', () => p.close(), 'green')); },
  });
  return p;
}

export function showHatch(b) { return reveal('It hatched!', b.sp, b.variant, b.variant ? 'A rare Variant! Its colors are one of a kind.' : 'A brand new beast joined your collection.', b); }
export function showEvolve(fromId, b) { return reveal('Evolution!', b.sp, b.variant, `${species(fromId).name} evolved into ${species(b.sp).name}!`, b); }
export function showCaught(b) { return reveal('Captured!', b.sp, b.variant, 'Added to your collection.', b); }

export { I };
