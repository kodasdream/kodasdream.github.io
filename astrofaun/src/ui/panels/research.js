// Research tree: four branches, five tiers. Tier access depends on the Research Station level.
import { h, I, btn, openPanel, toast, costPills, fmt } from '../ui.js';
import { timer } from '../widgets.js';
import { RESEARCH, BRANCHES } from '../../data/research.js';
import { S, count, researchState, startResearch, researchSpeedUp, buildingLevel, save } from '../../game/state.js';
import { formatTime, bus } from '../../core/util.js';

export function openResearch() {
  const p = openPanel({
    title: 'Research', icon: 'flask',
    render: (body) => render(body, p),
  });
  const off = bus.on('research', () => { if (p.panel.isConnected) p.render(); else off(); });
  return p;
}

function render(body, p) {
  const lvl = buildingLevel('research_station');
  if (!lvl) body.append(h('div', { class: 'card deep', style: { marginBottom: '0.6rem' } }, I('info'), ' Build a Research Station on your island to start researching.'));
  const a = S.research.active;
  if (a) {
    const r = RESEARCH[a.id];
    const box = h('div', { class: 'card', style: { marginBottom: '0.7rem' } }, h('div', { class: 'row between' }, h('span', { class: 'head' }, 'Researching: ' + r.name),
      btn(['Finish ', I('gem'), Math.max(1, Math.ceil((a.endsAt - Date.now()) / 60000 / 4))], () => { if (researchSpeedUp()) p.render(); else toast('Not enough Astrogems.', 'warn'); }, 'purple small')),
    timer(a.endsAt, a.total, () => setTimeout(() => p.panel.isConnected && p.render(), 1200)));
    body.append(box);
  }
  body.append(h('div', { class: 'row small dim', style: { marginBottom: '0.6rem' } }, I('rp'), `Research Points: ${fmt(S.player.rp)}  ·  Station level ${lvl} unlocks tier ${lvl}. Earn RP by discovering beasts, battling and finishing quests.`));
  for (const br of BRANCHES) {
    body.append(h('h3', { class: 'row' }, I(br.icon), br.name));
    const grid = h('div', { class: 'rtree' });
    for (let t = 1; t <= 5; t++) {
      const col = h('div', { class: 'col', style: { gap: '0.4rem' } }, h('div', { class: 'tier-label' }, 'Tier ' + t));
      for (const r of Object.values(RESEARCH).filter((x) => x.branch === br.id && x.tier === t)) {
        const st = researchState(r.id);
        col.append(h('div', { class: 'rnode ' + st, onclick: () => detail(r, p) },
          h('div', { class: 'rn-name' }, r.name),
          h('div', { class: 'rn-desc' }, r.desc),
          h('div', { class: 'tiny', style: { marginTop: 'auto' } }, st === 'done' ? 'Done' : st === 'active' ? 'In progress' : st === 'locked' ? 'Needs: ' + r.req.map((q) => RESEARCH[q].name).join(', ') : st === 'tier' ? `Station Lv ${r.tier}` : formatTime(r.time * 1000))));
      }
      grid.append(col);
    }
    body.append(grid);
  }
}

function detail(r, parent) {
  const st = researchState(r.id);
  const p = openPanel({
    title: r.name, icon: 'flask', cls: 'narrow',
    render: (body) => {
      body.append(h('p', {}, r.desc));
      body.append(h('div', { class: 'kv' }, h('dt', {}, 'Tier'), h('dd', {}, r.tier), h('dt', {}, 'Time'), h('dd', {}, formatTime(r.time * 1000)), h('dt', {}, 'Requires'), h('dd', {}, r.req.length ? r.req.map((q) => RESEARCH[q].name).join(', ') : 'Nothing')));
      body.append(h('h3', {}, 'Cost'), costPills(r.cost, count));
    },
    foot: (f) => {
      if (st === 'available') f.append(btn('Start research', () => {
        if (S.research.active) return toast('Another project is already running.', 'warn');
        if (startResearch(r.id)) { save(); toast('Research started.', 'good', 'flask'); p.close(); parent.render(); } else toast('Not enough resources.', 'warn');
      }, 'green', 'flask'));
      else f.append(h('span', { class: 'dim' }, { done: 'Already researched.', active: 'In progress.', locked: 'Research the prerequisites first.', tier: `Upgrade the Research Station to level ${r.tier}.` }[st]));
    },
  });
}
