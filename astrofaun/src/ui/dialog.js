// NPC speech dialog and the quest hand-in flow.
import { h, I, btn, costPills, toast, pill } from './ui.js';
import { NPCS, QUESTS } from '../data/quests.js';
import { S, questEvent, questComplete, turnInQuest, acceptQuest, save } from '../game/state.js';
import { characterPortrait } from '../render/portraits.js';
import { bus, formatNum } from '../core/util.js';

let current = null;

export function closeDialog() { current?.remove(); current = null; }

/** opts: { npc: id, text, options: [{ label, cls, icon, action }] } */
export function showDialog({ npc, text, options = [], title }) {
  closeDialog();
  const n = NPCS[npc] || { name: title || 'Ranger', role: '', look: {} };
  const av = h('div', { class: 'avatar' });
  try { av.append(h('img', { src: characterPortrait(n.look, npc), alt: '' })); } catch { av.append(I('paw')); }
  const opts = h('div', { class: 'opts' });
  const close = () => closeDialog();
  for (const o of options) opts.append(btn(o.label, () => { if (!o.keep) close(); o.action?.(); }, o.cls || '', o.icon));
  if (!options.some((o) => o.isClose)) opts.append(btn('Bye', close, 'gray small'));
  const el = h('div', { class: 'dialog', onpointerdown: (e) => e.stopPropagation() }, av, h('div', { class: 'grow' },
    h('div', {}, h('span', { class: 'who' }, n.name), h('span', { class: 'role' }, n.role)),
    h('div', { class: 'line' }, text),
    opts,
  ));
  document.getElementById('ui').append(el);
  current = el;
  return el;
}

export function questsFor(npcId) {
  return Object.keys(S.quests.active).filter((qid) => {
    const q = QUESTS[qid];
    return q.giver === npcId || q.steps.some((st) => st.type === 'talk' && st.target === npcId);
  });
}

export function npcStatus(npcId) {
  const qs = questsFor(npcId);
  if (qs.some((q) => questComplete(q) && QUESTS[q].giver === npcId)) return 'claim';
  if (qs.length) return 'quest';
  return null;
}

function rewardLine(r) {
  const parts = [];
  if (r.lunites) parts.push(pill([I('lunite'), formatNum(r.lunites)]));
  if (r.gems) parts.push(pill([I('gem'), r.gems]));
  if (r.xp) parts.push(pill([I('xp'), r.xp + ' XP']));
  if (r.rp) parts.push(pill([I('rp'), r.rp + ' RP']));
  return h('span', { class: 'cost' }, parts, r.items ? costPills(r.items) : null);
}

const FLAVOR = {
  oko: ['Every beast you capture teaches us something new about the Drift.', 'Habitats keep your beasts happy, and happy beasts earn Lunites.', 'Have you tried the Laboratory? Stat potions are my specialty.'],
  pip: ['Fuel pumps take a while. Bigger batches, longer waits.', 'Upgrade the Launch Pad to reach farther sectors. You need Warp Theory first.', 'Caves are full of ore. Smelt it at the Refinery.'],
};

/** Talk to an NPC: advances talk steps, offers quest hand-in, or flavor text. */
export function talkTo(npcId, scene) {
  questEvent('talk', npcId);
  const qs = questsFor(npcId);
  const done = qs.find((q) => questComplete(q) && QUESTS[q].giver === npcId);
  if (done) {
    const q = QUESTS[done];
    showDialog({
      npc: npcId,
      text: h('span', {}, `Great work on "${q.title}"! Here is your reward. `, rewardLine(q.rewards || {})),
      options: [{ label: 'Claim', cls: 'green', icon: 'check', action: () => { turnInQuest(done); save(); toast(`Quest complete: ${q.title}`, 'good', 'scroll'); bus.emit('quests'); setTimeout(() => talkTo(npcId, scene), 50); } }],
    });
    return;
  }
  const active = qs[0];
  if (active) {
    const q = QUESTS[active];
    const prog = S.quests.active[active];
    const steps = h('div', { class: 'col', style: { gap: '0.15rem', marginTop: '0.4rem' } }, q.steps.map((st, i) => h('div', { class: 'small', style: { color: prog[i] >= st.count ? '#2a8a2a' : '#4a5a7a' } }, (prog[i] >= st.count ? 'Done: ' : '') + `${st.label} (${Math.min(prog[i], st.count)}/${st.count})`)));
    showDialog({ npc: npcId, text: h('span', {}, h('b', {}, q.title + ': '), q.text, steps), options: [] });
    return;
  }
  const npc = NPCS[npcId];
  if (npc?.duel || npc?.boss) { scene?.offerDuel?.(npcId); return; }
  const lines = FLAVOR[npcId] || ['The islands are beautiful today, Ranger.', 'Watch out for Grimeworks grunts out there.', 'Beasts get tougher the farther you fly.'];
  showDialog({ npc: npcId, text: lines[Math.floor(Math.random() * lines.length)] });
}

export { acceptQuest };
