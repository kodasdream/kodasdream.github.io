// Heads-up display: player card, quest tracker, resources, dock and camera tools.
import { h, I, btn, hudLayer, bar, fmt, toast, anyPanelOpen } from './ui.js';
import { S, energy, energyMax, nextEnergyIn, fuelMax, playerXpToNext, count, useUtilItem, questComplete, beastCount, capacity } from '../game/state.js';
import { QUESTS } from '../data/quests.js';
import { PLANET_MAP } from '../data/planets.js';
import { bus, formatTime } from '../core/util.js';
import { openBeasts } from './panels/beasts.js';
import { openBag } from './panels/bag.js';
import { openBuild } from './panels/build.js';
import { openResearch } from './panels/research.js';
import { openQuests } from './panels/quests.js';
import { openDex } from './panels/dex.js';
import { openSettings } from './panels/settings.js';
import { openProfile } from './panels/profile.js';

export class Hud {
  constructor(game) {
    this.game = game;
    const L = hudLayer();
    this.root = h('div', { class: 'pass', style: { position: 'absolute', inset: 0 } });
    L.append(this.root);
    // player card
    this.badge = h('span', { class: 'lvl' }, '1');
    this.pname = h('div', { class: 'player-name' });
    this.pxp = h('div', { class: 'bar' }, h('i'));
    const card = h('div', { class: 'player-card', onclick: () => openProfile() }, h('div', { class: 'player-badge' }, this.badge), h('div', { class: 'player-info' }, this.pname, this.pxp));
    // resources
    this.resEls = {};
    const res = (id, iconName, onClick) => {
      const v = h('span', {}, '0');
      const sub = h('small', {});
      const el = h('div', { class: 'res', onclick: onClick }, I(iconName), v, sub);
      this.resEls[id] = { v, sub, el };
      return el;
    };
    const resRow = h('div', { class: 'res-row' },
      res('lunites', 'lunite'),
      res('gems', 'gem'),
      res('energy', 'energy', () => this.energyClick()),
      res('fuel', 'fuel', () => toast(`Fuel ${fmt(S.player.fuel)} / ${fuelMax()}. Build and run Fuel Pumps on your island.`, '', 'fuel')),
    );
    this.root.append(h('div', { class: 'hud-top' }, card, resRow));
    // quest tracker
    this.tracker = h('div', { class: 'quest-tracker', onclick: () => openQuests() });
    this.root.append(this.tracker);
    // location tag
    this.loc = h('div', { class: 'location-tag' });
    this.root.append(this.loc);
    // dock
    this.dockBtns = {};
    const dbtn = (id, label, iconName, fn) => {
      const b = h('button', { class: 'dock-btn', onclick: (e) => { e.stopPropagation(); fn(); } }, I(iconName), label);
      this.dockBtns[id] = b;
      return b;
    };
    this.dock = h('div', { class: 'dock' },
      dbtn('map', 'Star Map', 'map', () => { if (this.game.currentName !== 'starmap') this.game.go('starmap'); }),
      dbtn('home', 'Home', 'home', () => this.goHome()),
      dbtn('beasts', 'Beasts', 'paw', () => openBeasts()),
      dbtn('bag', 'Bag', 'bag', () => openBag()),
      dbtn('build', 'Build', 'hammer', () => openBuild(this.game.current)),
      dbtn('research', 'Research', 'flask', () => openResearch()),
      dbtn('quests', 'Quests', 'scroll', () => openQuests()),
      dbtn('dex', 'Beastiary', 'book', () => openDex()),
      dbtn('settings', 'Settings', 'gear', () => openSettings(this.game)),
    );
    this.bottom = h('div', { class: 'hud-bottom' }, this.dock);
    this.root.append(this.bottom);
    // camera tools
    this.tools = h('div', { class: 'side-tools' },
      btn('', () => this.game.iso.zoomBy(1.25), 'gray icon', 'zoomin', { title: 'Zoom in' }),
      btn('', () => this.game.iso.zoomBy(0.8), 'gray icon', 'zoomout', { title: 'Zoom out' }),
      btn('', () => this.game.iso.rotateStep(1), 'gray icon', 'rotate', { title: 'Rotate view (Q / E)' }),
    );
    this.root.append(this.tools);
    for (const ev of ['inv', 'player', 'quests', 'beasts', 'research', 'saved', 'scene']) bus.on(ev, () => this.dirty = true);
    bus.on('frame', (dt) => { this.t = (this.t || 0) + dt; if (this.dirty || this.t > 1) { this.t = 0; this.dirty = false; this.refresh(); } });
    bus.on('player:levelup', (l) => toast(`Ranger level ${l}! Energy refilled.`, 'good', 'star'));
    bus.on('item:gain', (id, n) => this.gainFx(id, n));
    this.refresh();
  }

  goHome() {
    if (this.game.currentName === 'home') return;
    if (this.game.currentName === 'battle') return;
    this.game.go('home');
  }

  energyClick() {
    const n = count('energy_drink');
    if (n > 0 && energy() < energyMax()) { useUtilItem('energy_drink'); toast('+20 energy', 'good', 'energy'); }
    else toast(`Energy refills by 1 every ${Math.round(40 / (1 + 0))}s. Craft Energy Drinks at the Laboratory.`, '', 'energy');
  }

  gainFx() { /* gains are shown by scenes near the source */ }

  setBuildMode(on) {
    this.bottom.style.display = on ? 'none' : '';
    this.tracker.style.display = on ? 'none' : '';
  }

  setMode(mode) {
    // hide parts of the HUD in battle / star map
    this.mode = mode;
    const battle = mode === 'battle';
    this.bottom.style.display = battle ? 'none' : '';
    this.tracker.style.display = battle ? 'none' : '';
    this.tools.style.display = battle || mode === 'starmap' ? 'none' : '';
    this.root.querySelector('.hud-top').style.display = battle ? 'none' : '';
    this.dockBtns.build.style.display = mode === 'home' ? '' : 'none';
    this.dockBtns.home.style.display = mode === 'home' ? 'none' : '';
    this.dockBtns.map.style.display = mode === 'starmap' ? 'none' : '';
  }

  refresh() {
    if (!S) return;
    const p = S.player;
    this.badge.textContent = p.level;
    this.pname.textContent = p.name;
    this.pxp.firstChild.style.width = Math.min(100, (p.xp / playerXpToNext()) * 100) + '%';
    const r = this.resEls;
    r.lunites.v.textContent = fmt(p.lunites);
    r.gems.v.textContent = fmt(p.gems);
    const e = energy(), em = energyMax();
    r.energy.v.textContent = `${e}/${em}`;
    r.energy.sub.textContent = e < em ? formatTime(nextEnergyIn()) : '';
    r.fuel.v.textContent = `${fmt(p.fuel)}`;
    r.fuel.sub.textContent = `/${fuelMax()}`;
    // quest tracker
    const qid = S.quests.tracked && S.quests.active[S.quests.tracked] ? S.quests.tracked : Object.keys(S.quests.active)[0];
    this.tracker.innerHTML = '';
    if (qid) {
      const q = QUESTS[qid];
      const prog = S.quests.active[qid];
      const done = questComplete(qid);
      this.tracker.append(h('div', { class: 'qt-title' }, I(done ? 'check' : 'scroll'), q.title));
      if (done) this.tracker.append(h('div', { class: 'qt-step done' }, 'Complete! Claim it from ' + (q.giver ? 'the quest giver or the Quests menu' : 'the Quests menu')));
      else q.steps.forEach((st, i) => { this.tracker.append(h('div', { class: 'qt-step' + (prog[i] >= st.count ? ' done' : '') }, st.label, h('b', {}, `${Math.min(prog[i], st.count)}/${st.count}`))); });
      this.tracker.style.display = this.mode === 'battle' ? 'none' : '';
    } else this.tracker.style.display = 'none';
    // location
    const loc = S.location;
    if (this.game.currentName === 'home') this.loc.innerHTML = 'Home Island';
    else if (this.game.currentName === 'cave') this.loc.innerHTML = `${PLANET_MAP[loc.planet]?.name || ''} Caves <small>Floor ${this.game.current?.floor || 1}</small>`;
    else if (this.game.currentName === 'planet') this.loc.innerHTML = `${PLANET_MAP[loc.planet]?.name || ''} <small>Lv ${PLANET_MAP[loc.planet]?.lv.join('-')}</small>`;
    else if (this.game.currentName === 'starmap') this.loc.innerHTML = 'Star Map';
    else this.loc.innerHTML = '';
    this.loc.style.display = this.mode === 'battle' ? 'none' : '';
    // dock badges
    const claim = Object.keys(S.quests.active).filter((q) => questComplete(q)).length;
    this.pip(this.dockBtns.quests, claim);
    this.pip(this.dockBtns.beasts, beastCount() > capacity() ? '!' : 0);
  }

  pip(el, n) {
    let p = el.querySelector('.pip');
    if (!n) { p?.remove(); return; }
    if (!p) { p = h('span', { class: 'pip' }); el.append(p); }
    p.textContent = n;
  }
}

export { anyPanelOpen, bar };
