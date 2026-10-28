// Ranger profile: stats overview and suit colors.
import { h, I, btn, openPanel, fmt, bar } from '../ui.js';
import { S, playerXpToNext, energyMax, fuelMax, capacity, beastCount, save } from '../../game/state.js';
import { characterPortrait } from '../../render/portraits.js';
import { SPECIES } from '../../data/beasts.js';
import { hexStr } from '../../core/util.js';

const SUITS = [0x3a7aff, 0xff5a4a, 0x5cc84a, 0xb05ae6, 0xffa02a, 0x2ab8c8, 0x3a3a4a, 0xff7ab0];
const HAIR = [0x2a2a3a, 0x5a3a2a, 0xd8502a, 0xffe08a, 0xffffff, 0x5a7aff, 0xff5aa8];

export function openProfile() {
  const p = openPanel({
    title: 'Ranger ' + S.player.name, icon: 'star', cls: 'mid',
    render: (body) => {
      const look = S.player.look;
      body.append(h('div', { class: 'row', style: { alignItems: 'flex-start', gap: '1rem' } },
        h('div', { class: 'portrait', style: { width: '9rem', flex: 'none' } }, h('img', { src: characterPortrait(look, 'player-' + look.suit + '-' + look.hair) })),
        h('div', { class: 'grow col' },
          h('div', { class: 'head', style: { fontSize: '1.4rem' } }, `Level ${S.player.level}`),
          bar(S.player.xp / playerXpToNext()), h('div', { class: 'tiny dim' }, `${fmt(S.player.xp)} / ${fmt(playerXpToNext())} XP`),
          h('div', { class: 'kv' },
            h('dt', {}, 'Battles won'), h('dd', {}, fmt(S.stats.wins || 0)),
            h('dt', {}, 'Beasts captured'), h('dd', {}, fmt(S.stats.captures || 0)),
            h('dt', {}, 'Species caught'), h('dd', {}, `${Object.keys(S.dex.caught).length} / ${SPECIES.length}`),
            h('dt', {}, 'Ore mined'), h('dd', {}, fmt(S.stats.ore || 0)),
            h('dt', {}, 'Energy cap'), h('dd', {}, energyMax()),
            h('dt', {}, 'Fuel tank'), h('dd', {}, fuelMax()),
            h('dt', {}, 'Beasts'), h('dd', {}, `${beastCount()} / ${capacity()}`),
          ))));
      body.append(h('h3', {}, 'Suit color'));
      body.append(h('div', { class: 'row wrap' }, SUITS.map((c) => h('button', { class: 'btn icon', style: { background: hexStr(c), outline: look.suit === c ? '3px solid #fff' : 'none' }, onclick: () => { look.suit = c; save(); p.render(); } }, ''))));
      body.append(h('h3', {}, 'Hair color'));
      body.append(h('div', { class: 'row wrap' }, HAIR.map((c) => h('button', { class: 'btn icon', style: { background: hexStr(c), outline: look.hair === c ? '3px solid #fff' : 'none' }, onclick: () => { look.hair = c; save(); p.render(); } }, ''))));
      body.append(h('p', { class: 'tiny dim' }, 'Appearance changes show up the next time you travel.'));
    },
  });
  return p;
}

export { I, btn };
