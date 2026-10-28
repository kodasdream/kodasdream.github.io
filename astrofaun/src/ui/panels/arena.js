// Duel Arena: rival Rangers (AI teams) with a rating ladder.
import { h, I, btn, openPanel, toast, pill, fmt } from '../ui.js';
import { speciesPortrait } from '../widgets.js';
import { S, partyBeasts, energy, save } from '../../game/state.js';
import { makeRivals, rivalBeasts } from '../../game/encounters.js';
import { species } from '../../data/beasts.js';
import { startBattle } from '../../game/battleFlow.js';

export function openArena() {
  const avg = Math.max(1, Math.round(partyBeasts().reduce((s, b) => s + b.lvl, 0) / Math.max(1, partyBeasts().length)));
  if (!S.arena.rivals.length || Date.now() - S.arena.refreshedAt > 3600000) {
    S.arena.rivals = makeRivals(S.arena.rating, avg);
    S.arena.refreshedAt = Date.now();
  }
  const p = openPanel({
    title: 'Duel Arena', icon: 'trophy', cls: 'mid',
    render: (body) => {
      body.append(h('div', { class: 'row wrap', style: { marginBottom: '0.6rem' } }, pill([I('trophy', { size: 16 }), 'Rating ' + S.arena.rating]), pill(`${S.arena.wins}W / ${S.arena.losses}L`), h('span', { class: 'small dim' }, 'Rivals refresh every hour. Each duel costs 3 energy.')));
      for (const r of S.arena.rivals) {
        body.append(h('div', { class: 'card row wrap', style: { marginBottom: '0.5rem' } },
          h('div', { class: 'grow' }, h('div', { class: 'head' }, r.name), h('div', { class: 'tiny dim' }, `Rating ${r.rating}  ·  Reward ${r.reward} Lunites${r.gems ? ` + ${r.gems} Astrogems` : ''}`)),
          h('div', { class: 'row', style: { gap: '0.3rem' } }, r.team.map((t) => h('div', { style: { width: '3.4rem' }, title: `${species(t.sp).name} Lv ${t.lvl}` }, speciesPortrait(t.sp, t.variant)))),
          btn('Duel', () => {
            if (energy() < 3) return toast('Not enough energy.', 'warn');
            p.close();
            startBattle({ kind: 'arena', foes: rivalBeasts(r), foeName: r.name, rival: r });
          }, 'orange small', 'sword'),
        ));
      }
      body.append(btn('New rivals (5 gems)', () => { if (S.player.gems < 5) return toast('Not enough Astrogems.', 'warn'); S.player.gems -= 5; S.arena.rivals = makeRivals(S.arena.rating, avg); S.arena.refreshedAt = Date.now(); save(); p.render(); }, 'purple small', 'rotate'));
    },
  });
  return p;
}

export { fmt };
