// Small DOM toolkit for the game UI: element builder, panels, toasts, dialogs and world anchors.
import { icon, itemIcon, elIcon } from './icons.js';
import { ITEMS } from '../data/items.js';
import { ELEMENT_MAP } from '../data/elements.js';
import { formatNum, hexStr, shade } from '../core/util.js';

export const root = document.getElementById('ui');

export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'data') for (const [dk, dv] of Object.entries(v)) el.dataset[dk] = dv;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const I = (name, opts) => h('span', { html: icon(name, opts), style: { display: 'contents' } });
export const IE = (el, opts) => h('span', { html: elIcon(el, opts), style: { display: 'contents' } });
export const II = (id, opts) => h('span', { html: itemIcon(ITEMS[id] || resourceItem(id), opts), style: { display: 'contents' } });

export function resourceItem(id) {
  return { lunites: { icon: 'lunite' }, gems: { icon: 'gem' }, rp: { icon: 'rp' }, fuel: { icon: 'fuel' }, energy: { icon: 'energy' }, xp: { icon: 'xp' } }[id] || { icon: 'info' };
}

export function resName(id) {
  return { lunites: 'Lunites', gems: 'Astrogems', rp: 'Research Points', fuel: 'Fuel', energy: 'Energy', xp: 'XP' }[id] || ITEMS[id]?.name || id;
}

export function btn(label, onClick, cls = '', iconName = null, opts = {}) {
  const b = h('button', { class: 'btn ' + cls, onclick: (e) => { if (b.disabled) return; e.stopPropagation(); onClick?.(e); }, title: opts.title }, iconName ? I(iconName, opts.iconOpts) : null, label);
  if (opts.disabled) b.disabled = true;
  return b;
}

export function bar(frac, cls = '') {
  const pct = Math.max(0, Math.min(1, frac || 0)) * 100;
  return h('div', { class: 'bar ' + cls }, h('i', { style: { width: pct + '%' } }));
}

export function pill(content, cls = '', style) { return h('span', { class: 'pill ' + cls, style }, content); }

export function elPill(el) {
  const e = ELEMENT_MAP[el];
  if (!e) return null;
  return pill([IE(el), e.name], 'el', { background: hexStr(shade(e.color, -0.12, -0.05)) });
}

/** Cost display: { lunites: 100, wood: 3 } with shortages highlighted via have(id) */
export function costPills(cost, have = null) {
  const wrap = h('span', { class: 'cost' });
  for (const [id, n] of Object.entries(cost || {})) {
    if (!n) continue;
    const short = have && have(id) < n;
    wrap.append(pill([II(id), formatNum(n)], short ? 'short' : '', null));
    if (short) wrap.lastChild.title = `Need ${n}, have ${have(id)}`;
  }
  return wrap;
}

// ---------------------------------------------------------------- layers
const layers = {};
function layer(name, z) {
  if (!layers[name]) {
    layers[name] = h('div', { class: 'pass', style: { position: 'absolute', inset: '0', zIndex: z } });
    root.append(layers[name]);
  }
  return layers[name];
}
export const hudLayer = () => layer('hud', 5);
export const worldLayer = () => layer('world', 4);
export const modalLayer = () => layer('modal', 20);
export const toastLayer = () => {
  const l = layer('toast', 30);
  if (!l.firstChild) l.append(h('div', { class: 'toasts' }));
  return l.firstChild;
};

// ---------------------------------------------------------------- toasts
export function toast(content, kind = '', iconName = null, ms = 2600) {
  const host = toastLayer();
  const iconFor = { good: 'check', warn: 'info', quest: 'scroll' };
  const t = h('div', { class: 'toast ' + kind }, I(iconName || iconFor[kind] || 'info'), h('span', {}, content));
  host.append(t);
  while (host.children.length > 4) host.firstChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, ms);
}

// ---------------------------------------------------------------- panels
const openPanels = [];

/**
 * opts: { title, icon, tabs: [{ id, label, icon, render(body, ctx) }], render(body, ctx), foot(footEl, ctx), cls, onClose, tab }
 */
export function openPanel(opts) {
  const back = h('div', { class: 'modal-back' });
  const panel = h('div', { class: 'panel ' + (opts.cls || '') });
  const body = h('div', { class: 'panel-body ' + (opts.flush ? 'flush' : '') });
  const titleEl = h('h2', {}, opts.icon ? I(opts.icon) : null, h('span', {}, opts.title));
  const head = h('div', { class: 'panel-head' }, titleEl, btn('', () => ctx.close(), 'gray icon', 'close', { title: 'Close' }));
  panel.append(head);
  let tabsEl = null;
  const ctx = {
    panel, body, tab: opts.tab || opts.tabs?.[0]?.id,
    close() {
      back.remove();
      const i = openPanels.indexOf(ctx);
      if (i >= 0) openPanels.splice(i, 1);
      opts.onClose?.();
    },
    render() {
      const scroll = body.scrollTop;
      body.innerHTML = '';
      if (opts.tabs) {
        tabsEl.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.id === ctx.tab));
        const tab = opts.tabs.find((t) => t.id === ctx.tab) || opts.tabs[0];
        tab.render(body, ctx);
      } else opts.render?.(body, ctx);
      if (foot) { foot.innerHTML = ''; opts.foot(foot, ctx); if (!foot.children.length) foot.style.display = 'none'; else foot.style.display = ''; }
      body.scrollTop = scroll;
    },
    setTitle(t) { titleEl.lastChild.textContent = t; },
    setTab(id) { ctx.tab = id; body.scrollTop = 0; ctx.render(); },
  };
  if (opts.tabs) {
    tabsEl = h('div', { class: 'panel-tabs' }, opts.tabs.map((t) => h('button', { class: 'tab', data: { id: t.id }, onclick: () => ctx.setTab(t.id) }, t.icon ? I(t.icon, t.iconOpts) : null, t.label)));
    panel.append(tabsEl);
  }
  panel.append(body);
  const foot = opts.foot ? h('div', { class: 'panel-foot' }) : null;
  if (foot) panel.append(foot);
  back.append(panel);
  back.addEventListener('pointerdown', (e) => { if (e.target === back && !opts.modal) ctx.close(); });
  modalLayer().append(back);
  openPanels.push(ctx);
  ctx.render();
  return ctx;
}

export function closeAllPanels() { while (openPanels.length) openPanels[openPanels.length - 1].close(); }
export function topPanel() { return openPanels[openPanels.length - 1]; }
export function anyPanelOpen() { return openPanels.length > 0; }
export function refreshPanels() { for (const p of openPanels) p.render(); }

export function confirmBox(title, text, okLabel, onOk, cls = 'green') {
  const p = openPanel({
    title, icon: 'info', cls: 'narrow', modal: true,
    render: (b) => b.append(h('p', {}, text)),
    foot: (f) => f.append(btn('Cancel', () => p.close(), 'gray'), btn(okLabel, () => { p.close(); onOk(); }, cls)),
  });
  return p;
}

// ---------------------------------------------------------------- world anchors (bubbles / markers / floaters)
const anchors = new Set();
/** el is positioned at the projection of getPos() (THREE.Vector3) each frame. */
export function anchor(el, getPos, offsetPx = 0) {
  worldLayer().append(el);
  const a = { el, getPos, offsetPx };
  anchors.add(a);
  return () => { anchors.delete(a); el.remove(); };
}
export function clearAnchors() { for (const a of anchors) a.el.remove(); anchors.clear(); }

const _v = { x: 0, y: 0, z: 0 };
export function updateAnchors(project) {
  for (const a of anchors) {
    const p = a.getPos();
    if (!p) { a.el.style.display = 'none'; continue; }
    const s = project(p, _v);
    if (!s.visible) { a.el.style.display = 'none'; continue; }
    a.el.style.display = '';
    a.el.style.left = s.x + 'px';
    a.el.style.top = (s.y - a.offsetPx) + 'px';
  }
}

export function floatText(x, y, content, cls = '') {
  const el = h('div', { class: 'floater ' + cls, style: { left: x + 'px', top: y + 'px' } }, content);
  worldLayer().append(el);
  setTimeout(() => el.remove(), 1150);
  return el;
}

export function fmt(n) { return formatNum(n); }
