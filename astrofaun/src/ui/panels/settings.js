// Settings: graphics quality, UI scale, save management, controls help.
import { h, I, btn, openPanel, toast, confirmBox } from '../ui.js';
import { QUALITY, R, setQuality } from '../../render/renderer.js';
import { clearTextureCacheSoft } from '../../render/texcache.js';
import { S, save, exportSave, importSave, wipeSave } from '../../game/state.js';

export function openSettings(game) {
  const p = openPanel({
    title: 'Settings', icon: 'gear', cls: 'mid', tab: 'game',
    tabs: [
      { id: 'game', label: 'Game', icon: 'gear', render: (b) => gameTab(b, p, game) },
      { id: 'save', label: 'Save data', icon: 'scroll', render: (b) => saveTab(b, p) },
      { id: 'help', label: 'Controls', icon: 'info', render: (b) => helpTab(b) },
    ],
  });
  return p;
}

function gameTab(body, p, game) {
  body.append(h('h3', {}, 'Graphics quality'));
  body.append(h('div', { class: 'seg' }, Object.entries(QUALITY).map(([k, q]) => h('button', { class: R.quality === k ? 'on' : '', onclick: () => {
    S.settings.quality = k; save();
    setQuality(k);
    clearTextureCacheSoft();
    toast(`Quality set to ${q.name}. Reloading the area...`, 'good');
    game.go(game.currentName === 'battle' ? 'home' : game.currentName, game.current?.params || {});
    p.render();
  } }, q.name))));
  body.append(h('p', { class: 'small dim' }, `High bakes terrain textures at 4096 x 4096. Ultra uses 4K for every material and full display resolution. Current: ${R.q.terrain}px terrain, ${R.q.tex}px materials.`));
  body.append(h('h3', {}, 'Interface size'));
  const val = h('span', { class: 'num' }, Math.round((S.settings.uiScale || 1) * 100) + '%');
  const slider = h('input', { type: 'range', min: '0.75', max: '1.4', step: '0.05', value: String(S.settings.uiScale || 1), oninput: (e) => {
    S.settings.uiScale = +e.target.value;
    document.documentElement.style.setProperty('--ui-scale', S.settings.uiScale);
    val.textContent = Math.round(S.settings.uiScale * 100) + '%';
  }, onchange: () => save() });
  body.append(h('div', { class: 'row' }, slider, val));
  body.append(h('h3', {}, 'Autosave'));
  body.append(h('div', { class: 'seg' }, [[true, 'On'], [false, 'Off']].map(([v, l]) => h('button', { class: S.settings.autosave === v ? 'on' : '', onclick: () => { S.settings.autosave = v; save(); p.render(); } }, l))));
}

function saveTab(body, p) {
  body.append(h('p', { class: 'small dim' }, 'Progress saves automatically to this browser. Export a backup code to move your Ranger to another device.'));
  const out = h('textarea', { class: 'text', readonly: true });
  body.append(h('div', { class: 'row wrap' },
    btn('Save now', () => { save(); toast('Saved.', 'good'); }, 'green small', 'check'),
    btn('Export code', () => { out.value = exportSave(); out.select(); try { navigator.clipboard?.writeText(out.value); toast('Save code copied.', 'good'); } catch { /* ignore */ } }, 'blue small', 'scroll'),
  ));
  body.append(out);
  body.append(h('h3', {}, 'Import'));
  const inp = h('textarea', { class: 'text', placeholder: 'Paste a save code here' });
  body.append(inp, h('div', { class: 'row', style: { marginTop: '0.4rem' } }, btn('Import', () => {
    try { importSave(inp.value); toast('Save imported. Reloading...', 'good'); setTimeout(() => location.reload(), 600); } catch (e) { toast('That code is not a valid save.', 'warn'); }
  }, 'orange small')));
  body.append(h('h3', {}, 'Danger zone'));
  body.append(btn('Start over', () => confirmBox('Start over', 'Delete this Ranger and all progress? This cannot be undone.', 'Delete everything', () => { wipeSave(); location.reload(); }, 'red'), 'red small', 'trash'));
}

function helpTab(body) {
  const rows = [
    ['Tap / click', 'Walk there, or interact with what you tapped'],
    ['Drag', 'Pan the camera'],
    ['Pinch / mouse wheel', 'Zoom'],
    ['Two-finger twist / right-drag', 'Rotate the view'],
    ['WASD or arrows', 'Walk'],
    ['Q / E', 'Rotate 90 degrees'],
    ['1 - 4', 'Use skills in battle'],
    ['Esc', 'Close menus, cancel building'],
  ];
  body.append(h('div', { class: 'kv' }, rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])));
}

export { I };
