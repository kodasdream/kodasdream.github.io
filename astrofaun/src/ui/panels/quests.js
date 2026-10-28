// Quest log: active quests with progress, claiming and tracking.
import { h, I, btn, openPanel, toast, costPills, pill, fmt } from '../ui.js';
import { QUESTS, NPCS } from '../../data/quests.js';
import { PLANET_MAP } from '../../data/planets.js';
import { S, questComplete, turnInQuest, save } from '../../game/state.js';
import { bar } from '../ui.js';

export function openQuests() {
  const p = openPanel({ title: 'Quests', icon: 'scroll', cls: 'mid', render: (body) => render(body, p) });
  return p;
}

function render(body, p) {
  const ids = Object.keys(S.quests.active);
  if (!ids.length) body.append(h('div', { class: 'empty' }, 'No active quests. Visit planets to meet new Rangers.'));
  ids.sort((a, b) => (questComplete(b) ? 1 : 0) - (questComplete(a) ? 1 : 0));
  for (const qid of ids) {
    const q = QUESTS[qid];
    const prog = S.quests.active[qid];
    const done = questComplete(qid);
    const where = q.planet ? PLANET_MAP[q.planet].name : 'Home Island';
    const card = h('div', { class: 'card', style: { marginBottom: '0.6rem' } },
      h('div', { class: 'row between wrap' },
        h('div', {}, h('div', { class: 'head', style: { fontSize: '1.1rem' } }, q.title), h('div', { class: 'tiny dim' }, `${where}  ·  ${NPCS[q.giver]?.name || ''}`)),
        h('div', { class: 'row' },
          S.quests.tracked === qid ? pill([I('star', { size: 14 }), 'Tracked']) : btn('Track', () => { S.quests.tracked = qid; p.render(); }, 'gray tiny'),
          done ? btn('Claim', () => { turnInQuest(qid); save(); toast(`Quest complete: ${q.title}`, 'good', 'scroll'); p.render(); }, 'green small', 'check') : null)),
      h('p', { class: 'small dim' }, q.text),
      h('div', { class: 'col', style: { gap: '0.3rem' } }, q.steps.map((st, i) => h('div', { class: 'row' },
        I(prog[i] >= st.count ? 'check' : 'scroll', { size: 18 }), h('span', { class: 'small grow' }, st.label), h('div', { style: { width: '6rem' } }, bar(prog[i] / st.count)), h('span', { class: 'num small' }, `${Math.min(prog[i], st.count)}/${st.count}`)))),
      h('div', { class: 'row wrap', style: { marginTop: '0.4rem' } }, h('span', { class: 'tiny dim' }, 'Rewards:'), rewardPills(q.rewards || {})),
    );
    body.append(card);
  }
  body.append(h('p', { class: 'small dim center' }, `${S.quests.done.length} quests completed.`));
}

export function rewardPills(r) {
  const parts = h('span', { class: 'cost' });
  if (r.lunites) parts.append(pill([I('lunite'), fmt(r.lunites)]));
  if (r.gems) parts.append(pill([I('gem'), r.gems]));
  if (r.xp) parts.append(pill([I('xp'), Math.round(r.xp) + ' XP']));
  if (r.rp) parts.append(pill([I('rp'), r.rp + ' RP']));
  if (r.items) parts.append(costPills(r.items));
  return parts;
}
