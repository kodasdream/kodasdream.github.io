// Beastiary: all 325 species, seen/caught tracking and species details.
import { h, I, IE, btn, openPanel, pill, fmt, elPill } from '../ui.js';
import { speciesPortrait, typePills, rarityPill } from '../widgets.js';
import { SPECIES, species, STATS, STAT_SHORT, ROLE_NAMES, RARITY_MAP } from '../../data/beasts.js';
import { ELEMENTS } from '../../data/elements.js';
import { SKILLS, describeSkill } from '../../data/skills.js';
import { PLANETS } from '../../data/planets.js';
import { S } from '../../game/state.js';
import { planetFamilies } from '../../game/encounters.js';

export function openDex() {
  const p = openPanel({ title: 'Beastiary', icon: 'book', render: (body) => render(body, p) });
  return p;
}

function render(body, p) {
  const seen = Object.keys(S.dex.seen).length, caught = Object.keys(S.dex.caught).length;
  const f = p.f ||= { el: 'all', show: 'all' };
  body.append(h('div', { class: 'row wrap', style: { marginBottom: '0.6rem' } },
    pill([I('book', { size: 16 }), `Seen ${seen}/${SPECIES.length}`]), pill([I('orb', { size: 16 }), `Caught ${caught}/${SPECIES.length}`]),
    h('div', { class: 'seg' }, [['all', 'All'], ['caught', 'Caught'], ['missing', 'Missing']].map(([v, l]) => h('button', { class: f.show === v ? 'on' : '', onclick: () => { f.show = v; p.render(); } }, l)))));
  body.append(h('div', { class: 'row wrap', style: { gap: '0.25rem', marginBottom: '0.7rem' } },
    h('button', { class: 'btn tiny ' + (f.el === 'all' ? 'blue' : 'gray'), onclick: () => { f.el = 'all'; p.render(); } }, 'All'),
    ELEMENTS.map((e) => h('button', { class: 'btn tiny icon ' + (f.el === e.id ? 'blue' : 'gray'), title: e.name, onclick: () => { f.el = e.id; p.render(); } }, IE(e.id)))));
  const g = h('div', { class: 'grid tiny' });
  for (const sp of SPECIES) {
    if (f.el !== 'all' && !sp.types.includes(f.el)) continue;
    const isSeen = S.dex.seen[sp.id], isCaught = S.dex.caught[sp.id];
    if (f.show === 'caught' && !isCaught) continue;
    if (f.show === 'missing' && isCaught) continue;
    const card = h('div', { class: 'card click center', style: { padding: '0.35rem' }, onclick: () => isSeen && detail(sp) },
      isSeen ? speciesPortrait(sp.id) : h('div', { class: 'portrait', style: { color: '#4a5a80', fontFamily: 'var(--font-head)', fontSize: '2rem' } }, '?'),
      h('div', { class: 'tiny head', style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: isSeen ? 1 : 0.5 } }, `${String(sp.id).padStart(3, '0')} ${isSeen ? sp.name : '???'}`),
      isCaught ? I('orb', { size: 14 }) : null);
    g.append(card);
  }
  body.append(g);
}

function detail(sp) {
  const caught = S.dex.caught[sp.id];
  openPanel({
    title: `#${String(sp.id).padStart(3, '0')} ${sp.name}`, icon: 'book', cls: 'mid',
    render: (body) => {
      body.append(h('div', { class: 'row', style: { alignItems: 'flex-start', gap: '1rem' } },
        h('div', { style: { width: 'min(13rem, 40%)', flex: 'none' } }, speciesPortrait(sp.id)),
        h('div', { class: 'grow col' },
          h('div', { class: 'row wrap' }, typePills(sp.types), rarityPill(sp.rarity), pill(ROLE_NAMES[sp.role])),
          h('p', {}, sp.desc),
          h('div', { class: 'kv' }, h('dt', {}, 'Height'), h('dd', {}, sp.height + ' m'), h('dt', {}, 'Weight'), h('dd', {}, sp.weight + ' kg'), h('dt', {}, 'Stage'), h('dd', {}, sp.stage + (sp.maxStage > 1 ? ' of 3' : '')), h('dt', {}, 'Status'), h('dd', {}, caught ? 'Caught' : 'Seen')),
        )));
      if (caught) {
        body.append(h('h3', {}, 'Base stats and growth per level'));
        body.append(h('div', { class: 'grid small' }, STATS.map((s) => h('div', { class: 'card deep center' }, h('div', { class: 'tiny dim' }, STAT_SHORT[s]), h('div', { class: 'head' }, fmt(sp.base[s])), h('div', { class: 'tiny', style: { color: '#9af06a' } }, '+' + (sp.growth[s] * 100).toFixed(2) + '%/lv')))));
      }
      const chain = [];
      let first = sp; while (first.evolvesFrom) first = species(first.evolvesFrom);
      for (let s = first; s; s = s.evolvesTo ? species(s.evolvesTo) : null) chain.push(s);
      if (chain.length > 1) body.append(h('h3', {}, 'Evolution'), h('div', { class: 'row wrap' }, chain.map((s, i) => h('span', { class: 'pill' }, (i ? `Lv ${chain[i - 1].evolveLevel} → ` : '') + (S.dex.seen[s.id] ? s.name : '???')))));
      const where = PLANETS.filter((pl) => planetFamilies(pl.id).some(([fam]) => fam.id === sp.family));
      body.append(h('h3', {}, 'Found on'), h('div', { class: 'row wrap' }, where.length ? where.map((pl) => pill(pl.name)) : h('span', { class: 'dim small' }, sp.rarity === 'legendary' ? 'Legendary: rarely sighted after a planet is liberated.' : 'Only from eggs.')));
      if (caught) {
        body.append(h('h3', {}, 'Skills learned'));
        body.append(h('div', { class: 'col' }, sp.learnset.map(([lvl, id]) => h('div', { class: 'skill' }, IE(SKILLS[id].el, { size: 26 }), h('div', { class: 'grow' }, h('div', { class: 'sk-name' }, SKILLS[id].name, h('span', { class: 'tiny dim' }, '  Lv ' + lvl)), h('div', { class: 'sk-desc' }, describeSkill(SKILLS[id])))))));
      }
    },
  });
}

export { RARITY_MAP, elPill, btn };
