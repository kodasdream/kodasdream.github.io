// Build menu: pick a building, then place it on the island.
import { h, I, btn, openPanel, toast, costPills, fmt, pill } from '../ui.js';
import { BUILDINGS, BUILD_CATEGORIES, BUILD_UNLOCK } from '../../data/buildings.js';
import { count, buildCount, buildBlockReason } from '../../game/state.js';

export function openBuild(scene) {
  if (!scene?.startBuild) { toast('You can only build on your home island.', 'warn'); return; }
  const p = openPanel({
    title: 'Build', icon: 'hammer',
    tabs: BUILD_CATEGORIES.map((c) => ({ id: c.id, label: c.name, icon: c.id === 'habitat' ? 'paw' : c.id === 'deco' ? 'deco' : 'hammer', render: (body) => list(body, c.id, scene, p) })),
  });
  return p;
}

function list(body, cat, scene, p) {
  const g = h('div', { class: 'grid two' });
  for (const def of Object.values(BUILDINGS)) {
    if (def.cat !== cat) continue;
    const reason = buildBlockReason(def.id);
    const n = buildCount(def.id);
    const lockedLevel = reason && reason.startsWith('Requires');
    g.append(h('div', { class: 'card row ' + (lockedLevel ? 'locked' : '') },
      h('div', { style: { fontSize: '2.6rem', lineHeight: 1 } }, I(def.icon || 'home')),
      h('div', { class: 'grow col', style: { gap: '0.2rem' } },
        h('div', { class: 'row between' }, h('span', { class: 'head' }, def.name), h('span', { class: 'tiny dim' }, `${def.size[0]}x${def.size[1]}  ·  ${n}/${def.max}`)),
        h('div', { class: 'tiny dim' }, def.desc),
        costPills(def.cost, count),
        reason && reason !== 'Not enough resources' ? h('span', { class: 'tiny', style: { color: '#ffb05a' } }, reason) : null,
      ),
      btn('Build', () => { p.close(); scene.startBuild(def.id); }, 'green small', null, { disabled: !!reason }),
    ));
  }
  body.append(g);
  if (cat === 'habitat') body.append(h('p', { class: 'small dim', style: { marginTop: '0.7rem' } }, 'Each habitat houses beasts of its type. Residents earn Lunites over time and can be paired at a Breeding Facility.'));
}

export { BUILD_UNLOCK, fmt, pill };
