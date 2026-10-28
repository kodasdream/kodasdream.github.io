// Hand-drawn SVG glyphs (no emoji anywhere in the UI). Each glyph is a chunky shape with an ink
// outline, a base fill, a shade and a highlight, drawn on a 32x32 grid.
import { ELEMENT_MAP } from '../data/elements.js';
import { shade as shadeHex, hexStr } from '../core/util.js';

const INK = '#1b1430';
const SW = 1.8; // outline width

const c = (hex) => (typeof hex === 'number' ? hexStr(hex) : hex);
const dk = (hex, a = -0.16) => hexStr(shadeHex(typeof hex === 'number' ? hex : parseInt(hex.slice(1), 16), a));
const lt = (hex, a = 0.2) => hexStr(shadeHex(typeof hex === 'number' ? hex : parseInt(hex.slice(1), 16), a));

const P = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra.includes('stroke=') ? '' : `stroke="${INK}"`} ${extra.includes('stroke-width') ? '' : `stroke-width="${SW}"`} stroke-linejoin="round" stroke-linecap="round" ${extra}/>`;
const F = (d, fill, op = 1) => `<path d="${d}" fill="${fill}" opacity="${op}"/>`; // fill only (shade/highlight)
const L = (d, w = SW, col = INK) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const C = (cx, cy, r, fill, stroke = true) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${stroke ? `stroke="${INK}" stroke-width="${SW}"` : ''}/>`;
const E = (cx, cy, rx, ry, fill, stroke = true, rot = 0) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${stroke ? `stroke="${INK}" stroke-width="${SW}"` : ''} ${rot ? `transform="rotate(${rot} ${cx} ${cy})"` : ''}/>`;
const R = (x, y, w, h, r, fill, stroke = true) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${stroke ? `stroke="${INK}" stroke-width="${SW}"` : ''}/>`;
const HI = (d) => F(d, '#ffffff', 0.55);

// Generic shapes reused with tints
function gemShape(col) {
  return P('M9 6 L23 6 L29 13 L16 28 L3 13 Z', c(col)) + F('M9 6 L16 13 L3 13 Z', lt(col, 0.18)) + F('M16 13 L29 13 L16 28 Z', dk(col, -0.14)) + F('M23 6 L29 13 L16 13 Z', dk(col, -0.06)) + L('M3 13 L29 13 M9 6 L16 13 L23 6 M16 13 L16 28', 1) + HI('M10 8 L14 8 L11 11 Z');
}
function bottleShape(col) {
  return P('M13 3 L19 3 L19 9 C25 11 27 15 27 20 C27 26 22 29 16 29 C10 29 5 26 5 20 C5 15 7 11 13 9 Z', '#e8f4ff') + F('M7 19 C7 24 11 27 16 27 C21 27 25 24 25 19 C22 21 10 21 7 19 Z', c(col)) + L('M7 19 C10 21 22 21 25 19', 1.2) + R(12, 1, 8, 4, 1.5, '#b07a4a') + HI('M9 14 C10 12 12 11 13 11 L12 16 C11 16 10 15 9 14 Z');
}

const G = {
  // ---------------------------------------------------------------- currencies & resources
  lunite: () => C(16, 16, 12.5, '#ffcf3a') + C(16, 16, 9, '#ffb81a', false) + P('M19 9 C14 9 11 12.5 11 16 C11 19.5 14 23 19 23 C15.5 21.5 14 19 14 16 C14 13 15.5 10.5 19 9 Z', '#fff2a8') + HI('M8 11 C9 8 12 6 15 5.5 C12 7.5 10 9.5 9 12 Z'),
  gem: () => gemShape('#5aa8ff') + F('M3 13 L9 6 L9 13 Z', '#b88aff', 0.6),
  energy: () => P('M18 2 L7 18 L14 18 L12 30 L25 12 L17 12 L20 2 Z', '#7ae04a') + F('M17 4 L9 17 L14 17 L13 23 L21 13 L16 13 Z', '#b8ff7a', 0.7),
  fuel: () => R(8, 7, 16, 22, 3.5, '#ff9a2a') + R(11, 3, 7, 5, 1.5, '#5a6474') + P('M18 4 L24 4 L24 7', 'none') + R(11, 13, 10, 9, 2, '#ffd27a', false) + L('M13 15 L19 21 M19 15 L13 21', 1.6, '#c86a1a') + HI('M10 10 L12 10 L12 26 L10 26 Z'),
  rp: () => C(16, 16, 4, '#ff7ab0') + E(16, 16, 13, 5, 'none', true) + E(16, 16, 13, 5, 'none', true, 60) + E(16, 16, 13, 5, 'none', true, -60) + C(16, 16, 3, '#ffd0e4', false),
  xp: () => P('M16 2 L20 11 L30 12 L22.5 18.5 L25 28.5 L16 23 L7 28.5 L9.5 18.5 L2 12 L12 11 Z', '#ffd23c') + F('M16 5 L19 12 L26 13 L16 13 Z', '#fff2a0', 0.8),
  star: () => P('M16 3 L19.5 11.5 L28.5 12 L21.5 18 L23.8 27 L16 22 L8.2 27 L10.5 18 L3.5 12 L12.5 11.5 Z', '#ffd23c') + HI('M16 6 L18 12 L23 12.5 L16 13 Z'),

  // ---------------------------------------------------------------- navigation
  map: () => C(15, 16, 9, '#b07aff') + F('M8 12 C12 13 18 11 23 13 L23 16 C18 14 12 16 7 15 Z', '#d8b0ff', 0.9) + E(15, 16, 15, 4.5, 'none', true, -18) + C(15, 16, 9, 'none') + F('M9 11 C10 9 12 8 14 7.5 C12 9.5 11 10.5 10 12 Z', '#ffffff', 0.6) + C(27, 6, 2, '#ffd23c'),
  paw: () => E(16, 21, 7, 6, '#ff9ac8') + E(8, 13, 3.2, 4, '#ff9ac8', true, -20) + E(13, 8, 3.2, 4.2, '#ff9ac8') + E(19, 8, 3.2, 4.2, '#ff9ac8') + E(24, 13, 3.2, 4, '#ff9ac8', true, 20) + HI('M12 18 C13 16 15 16 17 16.5 C15 17 14 18 13 19.5 Z'),
  bag: () => P('M8 11 C8 7 11 5 16 5 C21 5 24 7 24 11 L26 26 C26 28 24.5 29 22.5 29 L9.5 29 C7.5 29 6 28 6 26 Z', '#c8844a') + P('M11 11 C11 6 13 3.5 16 3.5 C19 3.5 21 6 21 11', 'none') + R(10, 15, 12, 8, 2, '#e8a868') + L('M10 19 L22 19', 1.2) + C(16, 19, 1.6, '#ffd23c') + HI('M9 13 L10.5 13 L9.5 25 L8 25 Z'),
  hammer: () => P('M14 14 L26 28 L23 30 L11 17 Z', '#b07a4a') + P('M5 9 L13 3 L21 11 L17 14 L13 10 L9 13 Z', '#9aa8b8') + F('M6 9 L13 4 L15 6 L8 11 Z', '#d8e2ee', 0.9),
  flask: () => P('M12 3 L20 3 L20 11 L27 24 C28.5 27 26.5 29.5 23.5 29.5 L8.5 29.5 C5.5 29.5 3.5 27 5 24 L12 11 Z', '#e8f4ff') + F('M8.6 19 L23.4 19 L26 24 C27 26.4 25.5 28 23.4 28 L8.6 28 C6.5 28 5 26.4 6 24 Z', '#7ae0c8') + L('M8.6 19 L23.4 19', 1.2) + R(10.5, 1.5, 11, 3.5, 1.2, '#9aa8b8') + C(13, 24, 1.6, '#c8fff0', false) + C(19, 22, 1.1, '#c8fff0', false) + HI('M13 6 L14.5 6 L14.5 12 L10 20 L9 19 Z'),
  scroll: () => P('M8 5 L24 5 C26 5 27 6.5 27 8 L27 25 C27 27 25.5 28.5 24 28.5 L8 28.5 C6 28.5 5 27 5 25 L5 8 C5 6.5 6 5 8 5 Z', '#f8e8c0') + L('M10 11 L22 11 M10 16 L22 16 M10 21 L18 21', 1.6, '#b0905a') ,
  book: () => P('M4 7 C9 5 13 6 16 8 C19 6 23 5 28 7 L28 26 C23 24 19 25 16 27 C13 25 9 24 4 26 Z', '#4a8aff') + P('M16 8 L16 27', 'none') + F('M6 9 C9 8 12 8.5 14 10 L14 24 C12 23 9 22.5 6 23.5 Z', '#ffffff', 0.85) + F('M18 10 C20 8.5 23 8 26 9 L26 23.5 C23 22.5 20 23 18 24 Z', '#ffffff', 0.85) + C(10, 15, 2.5, '#ff7ab0'),
  gear: () => P('M14 2 L18 2 L19 6 L22 7.3 L25.5 5 L28 7.5 L26 11 L27 14 L30 15 L30 18 L27 19 L26 22 L28 25.5 L25.5 28 L22 26 L19 27 L18 30 L14 30 L13 27 L10 26 L6.5 28 L4 25.5 L6 22 L5 19 L2 18 L2 15 L5 14 L6 11 L4 7.5 L6.5 5 L10 7.3 L13 6 Z', '#9aa8b8') + C(16, 16, 5, '#5a6474') + HI('M8 9 L11 8 L9 12 Z'),
  home: () => P('M4 15 L16 4 L28 15 L25 15 L25 28 L7 28 L7 15 Z', '#f0f4fa') + P('M4 15 L16 4 L28 15', 'none') + R(13, 19, 6, 9, 1.5, '#4a8aff') + C(16, 12, 2.6, '#7ae0ff') + F('M8 16 L16 8.5 L16 11 L8 18 Z', '#ffffff', 0.7),
  trophy: () => P('M9 4 L23 4 L23 12 C23 17 20 20 16 20 C12 20 9 17 9 12 Z', '#ffcf3a') + P('M9 7 L5 7 C5 11 6.5 13 9.5 13.5 M23 7 L27 7 C27 11 25.5 13 22.5 13.5', 'none') + R(14, 20, 4, 4, 0.5, '#e0a82a') + R(9, 24, 14, 5, 1.5, '#8a5a3a') + HI('M11 6 L13 6 L13 13 L11.5 12 Z'),
  close: () => P('M7 10 L10 7 L16 13 L22 7 L25 10 L19 16 L25 22 L22 25 L16 19 L10 25 L7 22 L13 16 Z', '#ff6a5a'),
  back: () => P('M4 16 L14 6 L14 12 L28 12 L28 20 L14 20 L14 26 Z', '#7ad0ff'),
  next: () => P('M28 16 L18 6 L18 12 L4 12 L4 20 L18 20 L18 26 Z', '#7ad0ff'),
  check: () => P('M4 17 L8 13 L13 18 L25 6 L29 10 L13 26 Z', '#7ae04a'),
  plus: () => P('M13 4 L19 4 L19 13 L28 13 L28 19 L19 19 L19 28 L13 28 L13 19 L4 19 L4 13 L13 13 Z', '#7ae04a'),
  minus: () => R(4, 12.5, 24, 7, 2, '#ff9a5a'),
  info: () => C(16, 16, 13, '#4a8aff') + C(16, 9.5, 2.4, '#ffffff', false) + R(14, 13.5, 4, 11, 1.5, '#ffffff', false),
  lock: () => P('M10 14 L10 10 C10 6 12.5 3.5 16 3.5 C19.5 3.5 22 6 22 10 L22 14', 'none', 'stroke-width="3.2"') + R(6, 13, 20, 16, 3.5, '#ffcf3a') + C(16, 20, 2.5, INK, false) + R(15, 20, 2, 5, 1, INK, false),
  swap: () => P('M5 11 L20 11 L20 6 L28 13 L20 20 L20 15 L5 15 Z', '#7ad0ff') + P('M27 21 L12 21 L12 16 L4 23 L12 30 L12 25 L27 25 Z', '#ffb05a'),
  run: () => P('M18 4 C20 4 21.5 5.5 21.5 7.5 C21.5 9.5 20 11 18 11 C16 11 14.5 9.5 14.5 7.5 C14.5 5.5 16 4 18 4 Z', '#ffd0a0') + P('M14 12 L20 13 L24 18 L21 19 L18.5 16 L17 20 L21 24 L19 29 L16 28 L17.5 24.5 L13 21 L10 27 L6 26 L11 17 L9 18 L6 16 Z', '#4a8aff'),
  orb: () => C(16, 16, 12.5, '#4ab8ff') + F('M3.5 16 L28.5 16 C28.5 23 23 28.5 16 28.5 C9 28.5 3.5 23 3.5 16 Z', '#2a6ad8') + L('M3.5 16 L28.5 16', 1.8) + C(16, 16, 4, '#ffffff') + HI('M8 9 C10 6.5 13 5.5 16 5.5 C13 7.5 11 9 9.5 11.5 Z'),
  clock: () => C(16, 16, 12.5, '#f0f4fa') + L('M16 9 L16 16 L21 19', 2.2) + C(16, 16, 1.5, INK, false),
  pickaxe: () => P('M15 13 L27 27 L24.5 29.5 L12.5 15.5 Z', '#b07a4a') + P('M3 13 C8 5 18 2 27 5 C22 5 17 7 14 10 L17 13 L14 16 L11 13 C8 14 5 16 3 13 Z', '#9aa8b8') + F('M5 12 C9 7 16 4.5 22 5 C17 6 12 8.5 8 12.5 Z', '#e8f0f8', 0.8),
  compass: () => C(16, 16, 12.5, '#f0e0c0') + P('M16 5 L19.5 16 L16 27 L12.5 16 Z', '#ff5a4a') + F('M16 16 L19.5 16 L16 27 L12.5 16 Z', '#4a8aff') + C(16, 16, 2, '#ffffff'),
  sword: () => P('M23 3 L29 3 L29 9 L13 25 L7 19 Z', '#d8e2ee') + P('M6 17 L15 26 L13 28 L4 19 Z', '#ffcf3a') + P('M8 23 L4 27 L5 28 L9 24', '#8a5a3a') + F('M24 5 L27 5 L12 20 L10.5 18.5 Z', '#ffffff', 0.7),
  shield: () => P('M16 3 L27 7 C27 17 23 25 16 29 C9 25 5 17 5 7 Z', '#4a8aff') + F('M16 6 L24.5 9 C24.5 17 21.5 23 16 26.5 Z', '#2a5ad8') + HI('M8 9 L14 7 L13 9 L9.5 10.5 C9.5 14 10 17 11 19.5 C9 17 8 13.5 8 9 Z'),
  boot: () => P('M9 3 L18 3 L19 17 L27 20 C29 21 29.5 23 29 25 L28 28 L5 28 L5 24 C7 23 8 21 8 18 Z', '#4ac8ff') + R(5, 25, 24, 4, 1.5, '#2a6ad8') + F('M10 5 L13 5 L13 17 L10 17 Z', '#ffffff', 0.5),
  heart: () => P('M16 28 C9 22 3 18 3 11 C3 7 6 4 10 4 C13 4 15 6 16 8 C17 6 19 4 22 4 C26 4 29 7 29 11 C29 18 23 22 16 28 Z', '#ff5a7a') + HI('M7 9 C8 7 10 6.5 12 7 C10 8 9 9.5 8.5 11.5 Z'),
  stamina: () => P('M16 3 C16 3 6 14 6 20 C6 25.5 10.5 29 16 29 C21.5 29 26 25.5 26 20 C26 14 16 3 16 3 Z', '#ffb02e') + F('M16 9 C13 13 10 17 10 20 L16 20 Z', '#ffe08a', 0.7) + P('M15 14 L11 21 L15 21 L13.5 26 L20 18 L16 18 L18 14 Z', '#ffffff', 'stroke-width="1"'),
  chest: () => P('M4 13 C4 7 8 5 16 5 C24 5 28 7 28 13 Z', '#c8844a') + R(4, 13, 24, 15, 2, '#a86a34') + R(13.5, 11, 5, 7, 1.2, '#ffcf3a') + L('M4 13 L28 13', 1.6) + L('M9 6 L9 28 M23 6 L23 28', 1.4, '#7a4a24'),
  egg: (o = {}) => P('M16 3 C22 3 27 12 27 19 C27 25 22 29.5 16 29.5 C10 29.5 5 25 5 19 C5 12 10 3 16 3 Z', c(o.tint ?? '#f2dcb0')) + C(12, 15, 2.6, c(o.spot ?? '#c89a5a'), false) + C(20, 21, 3.2, c(o.spot ?? '#c89a5a'), false) + C(18, 11, 1.8, c(o.spot ?? '#c89a5a'), false) + HI('M10 9 C11 7 13 5.5 15 5 C13 7 12 9 11 11.5 Z'),
  upgrade: () => P('M16 3 L28 16 L21 16 L21 29 L11 29 L11 16 L4 16 Z', '#7ae04a') + F('M16 6 L24 14.5 L16 14.5 Z', '#c8ff9a', 0.7),
  move: () => P('M16 2 L21 8 L18 8 L18 14 L24 14 L24 11 L30 16 L24 21 L24 18 L18 18 L18 24 L21 24 L16 30 L11 24 L14 24 L14 18 L8 18 L8 21 L2 16 L8 11 L8 14 L14 14 L14 8 L11 8 Z', '#7ad0ff'),
  rotate: () => P('M16 5 C22 5 27 10 27 16 L30 16 L25 22 L20 16 L23 16 C23 12 20 9 16 9 C12 9 9 12 9 16 C9 20 12 23 16 23 L16 27 C10 27 5 22 5 16 C5 10 10 5 16 5 Z', '#7ad0ff'),
  trash: () => R(7, 8, 18, 21, 2.5, '#ff7a6a') + R(5, 5, 22, 4, 1.5, '#d84a3a') + R(13, 2.5, 6, 3, 1, '#d84a3a') + L('M12 13 L12 25 M16 13 L16 25 M20 13 L20 25', 1.6),
  sound: () => P('M4 12 L10 12 L17 5 L17 27 L10 20 L4 20 Z', '#7ad0ff') + L('M21 11 C23 13 23 19 21 21 M24.5 8 C28.5 12 28.5 20 24.5 24', 2),
  ship: () => P('M16 2 C21 7 23 13 23 20 L9 20 C9 13 11 7 16 2 Z', '#f0f4fa') + P('M9 15 L4 24 L9 23 Z M23 15 L28 24 L23 23 Z', '#ff5a4a') + C(16, 12, 3.2, '#4ab8ff') + P('M11 20 L21 20 L19 26 L13 26 Z', '#9aa8b8') + P('M13.5 26 L16 31 L18.5 26 Z', '#ffb02e', 'stroke-width="1.2"'),
  cave: () => P('M2 28 C3 18 8 8 16 6 C24 8 29 18 30 28 Z', '#a8705a') + P('M9 28 C9 21 12 15 16 15 C20 15 23 21 23 28 Z', '#2a1a24') + F('M5 24 C6 18 9 12 13 9.5 C10 14 8 19 7.5 25 Z', '#d8a080', 0.6),
  feeder: () => P('M4 18 L28 18 L25 28 L7 28 Z', '#c8844a') + C(11, 16, 3.2, '#ff9a3a') + C(17, 15, 3.5, '#ffd23c') + C(22.5, 16.5, 3, '#ff7a3a') + L('M4 18 L28 18', 1.6),
  dojo: () => R(5, 14, 22, 14, 1.5, '#e8d0a0') + P('M2 14 L16 5 L30 14 Z', '#d84a3a') + R(13, 19, 6, 9, 1, '#8a5a3a'),
  furnace: () => P('M7 29 L7 12 C7 8 11 5 16 5 C21 5 25 8 25 12 L25 29 Z', '#9a6a5a') + R(11, 17, 10, 9, 4.5, '#2a1a1a') + P('M13 26 C13 22 15 20 16 18 C17 20 19 22 19 26 Z', '#ffb02e', 'stroke-width="1"') + R(19, 2, 4, 6, 1, '#6a5a5a'),
  research: () => P('M5 22 C5 13 10 7 16 7 C22 7 27 13 27 22 Z', '#e8eef6') + R(3, 22, 26, 6, 2, '#9aa8b8') + P('M15 14 L27 6 L28.5 8.5 L17 16 Z', '#5a6474') + F('M8 20 C8.5 15 11 11 14.5 10 C12 12.5 10.5 16 10 20 Z', '#ffffff', 0.8),
  egghatch: () => P('M16 6 C21 6 25 13 25 19 C25 24 21 28 16 28 C11 28 7 24 7 19 C7 13 11 6 16 6 Z', '#f2dcb0') + L('M7.5 16 L11 13 L14 17 L17 13 L21 17 L24.5 14', 1.6),
  deco: () => P('M16 4 C22 4 26 8 26 13 C26 18 22 21 16 21 C10 21 6 18 6 13 C6 8 10 4 16 4 Z', '#5cc84a') + R(14, 19, 4, 10, 1, '#8a5a3a') + C(11, 11, 2, '#ff7ab0', false) + C(20, 9, 1.8, '#ffd23c', false) + C(19, 15, 1.6, '#ff7ab0', false),
  rocket: () => G.ship(),
  heartpair: () => P('M11 25 C6 21 2 18 2 13 C2 10 4 8 7 8 C9 8 10.5 9.5 11 11 C11.5 9.5 13 8 15 8 C18 8 20 10 20 13 C20 18 16 21 11 25 Z', '#ff7ab0') + P('M21 27 C16.5 23.5 13 21 13 16.5 C13 14 15 12 17.5 12 C19.5 12 20.7 13.2 21 14.5 C21.3 13.2 22.5 12 24.5 12 C27 12 29 14 29 16.5 C29 21 25.5 23.5 21 27 Z', '#ff5a7a'),
  zoomin: () => C(13, 13, 9, '#e8f4ff') + P('M19.5 19.5 L28 28', 'none', 'stroke-width="4.5"') + L('M9 13 L17 13 M13 9 L13 17', 2.2),
  zoomout: () => C(13, 13, 9, '#e8f4ff') + P('M19.5 19.5 L28 28', 'none', 'stroke-width="4.5"') + L('M9 13 L17 13', 2.2),
  fist: () => P('M8 14 C8 10 10 8 12 8 L22 8 C25 8 27 10 27 13 L27 21 C27 25 24 28 20 28 L14 28 C10 28 8 25 8 21 Z', '#ffc890') + L('M12 8 L12 15 M17 8 L17 15 M22 8 L22 15', 1.4) + P('M8 15 C5 15 4 17 4 19 C4 21 6 22 9 22', '#ffc890'),

  // ---------------------------------------------------------------- items (tinted)
  spray: (o) => R(10, 9, 12, 20, 3, c(o.tint ?? '#5cd65a')) + R(12, 4, 8, 5, 1.5, '#e8eef6') + P('M20 6 L25 4 L25 8 Z', '#9aa8b8') + R(12, 15, 8, 8, 1.5, '#ffffff', false) + P('M14.5 19 L17.5 19 M16 17.5 L16 20.5', 'none', 'stroke="#ff5a5a" stroke-width="1.8"'),
  bottle: (o) => bottleShape(o.tint ?? '#4ab8ff'),
  potion: (o) => P('M13 3 L19 3 L19 8 L26 18 C28 22 26 29 16 29 C6 29 4 22 6 18 L13 8 Z', '#eef6ff') + F('M8 18.5 L24 18.5 C26 22 24.5 27.5 16 27.5 C7.5 27.5 6 22 8 18.5 Z', c(o.tint ?? '#ff5a3a')) + L('M8 18.5 L24 18.5', 1.2) + R(12, 1, 8, 3.5, 1.2, '#ffcf3a') + P('M16 22 L17.5 25 L14.5 25 Z', '#ffffff', 'stroke-width="0"') + HI('M12.5 9 L14 9 L9.5 17 L8.5 16.5 Z'),
  bomb: (o) => C(15, 18, 10.5, c(o.tint ?? '#ffd23c')) + R(12.5, 5, 5, 4, 1, '#5a6474') + L('M17 5 C19 2 22 2 24 4', 1.6) + P('M24 1 L25.5 3.5 L28 3 L26 5 L27.5 7.5 L24.5 6.5 Z', '#ff9a2a', 'stroke-width="1"') + HI('M9 13 C10 11 12 10 14 9.5 C12 11.5 11 13 10.5 15 Z'),
  can: (o) => R(9, 5, 14, 23, 3, c(o.tint ?? '#5cd65a')) + R(9, 11, 14, 11, 0, '#ffffff', false) + P('M15 12 L12 17 L15 17 L14 21 L19 15 L16 15 L18 12 Z', c(o.tint ?? '#5cd65a'), 'stroke-width="0.8"') + L('M9 5 L23 5', 1.6) + F('M10.5 7 L12 7 L12 26 L10.5 26 Z', '#ffffff', 0.4),
  snack: (o) => P('M5 18 C5 11 10 7 16 7 C22 7 27 11 27 18 L27 20 C27 25 22 28 16 28 C10 28 5 25 5 20 Z', c(o.tint ?? '#ffc06a')) + C(11, 15, 1.4, '#a86a2a', false) + C(17, 13, 1.4, '#a86a2a', false) + C(21, 18, 1.4, '#a86a2a', false) + C(13, 21, 1.4, '#a86a2a', false) + HI('M9 11 C11 9 13 8.5 15 8.5 C13 10 11.5 11 10.5 13 Z'),
  ticket: (o) => P('M3 9 L29 9 L29 13 C27 13 26 14.5 26 16 C26 17.5 27 19 29 19 L29 23 L3 23 L3 19 C5 19 6 17.5 6 16 C6 14.5 5 13 3 13 Z', c(o.tint ?? '#ff7ab0')) + L('M21 10 L21 22', 1.2, '#ffffff') + P('M12 13 L13.2 15.4 L15.8 15.6 L13.8 17.3 L14.5 19.8 L12 18.4 L9.5 19.8 L10.2 17.3 L8.2 15.6 L10.8 15.4 Z', '#ffffff', 'stroke-width="0"'),
  charm: (o) => P('M16 4 C17 9 19 11 24 12 C19 13 17 15 16 20 C15 15 13 13 8 12 C13 11 15 9 16 4 Z', c(o.tint ?? '#5cd65a')) + C(16, 25, 4, '#ffcf3a') + L('M16 20 L16 21', 1.4),
  blanket: (o) => P('M4 9 C10 6 22 6 28 9 L27 24 C21 27 11 27 5 24 Z', c(o.tint ?? '#ff9a5a')) + L('M8 12 L25 12 M7 17 L26 17 M8 22 L25 22', 1.3, '#ffffff'),
  shard: (o) => P('M16 2 L24 12 L19 30 L10 18 Z', c(o.tint ?? '#ffd23c')) + F('M16 2 L24 12 L17 14 Z', '#ffffff', 0.55) + L('M10 18 L17 14 L19 30', 1),

  // ---------------------------------------------------------------- materials
  fiber: (o) => P('M8 29 C9 20 6 12 3 6 C9 11 12 19 12 29 Z', '#5cc84a') + P('M13 29 C14 18 15 10 16 3 C18 10 19 18 19 29 Z', '#7ad84a') + P('M20 29 C20 20 23 11 29 6 C26 12 24 20 24 29 Z', '#4ab83a') + R(7, 22, 18, 4, 1.5, '#d8a868'),
  drop: (o) => P('M16 3 C16 3 6 15 6 21 C6 26 10.5 29.5 16 29.5 C21.5 29.5 26 26 26 21 C26 15 16 3 16 3 Z', c(o.tint ?? '#ffb02e')) + HI('M11 18 C11 15 13 12 15 9.5 C14 13 13 16 13 19 Z'),
  pebble: (o) => E(11, 20, 8, 6, c(o.tint ?? '#b8a890')) + E(21, 15, 7, 5.5, lt(o.tint ?? 0xb8a890, 0.06)) + E(19, 25, 5, 3.5, dk(o.tint ?? 0xb8a890, -0.08)) + HI('M17 12 C19 11 21 10.5 23 11 C21 12 19.5 12.5 18 14 Z'),
  log: (o) => P('M5 12 L24 7 C27 6.5 29 9 29 13 C29 17 27 20 24 20.5 L5 25 Z', c(o.tint ?? '#b07a4a')) + E(5.5, 18.5, 4, 6.5, '#e8c890') + E(5.5, 18.5, 1.5, 2.5, '#b08050', false) + L('M11 15 L22 12', 1.2, '#7a4a24'),
  crystal: (o) => P('M10 29 L7 14 L12 4 L17 14 L15 29 Z', c(o.tint ?? '#7ae0ff')) + P('M16 29 L18 12 L23 6 L27 14 L22 29 Z', lt(o.tint ?? 0x7ae0ff, 0.1)) + F('M12 4 L17 14 L12 14 Z', '#ffffff', 0.55),
  fluff: (o) => C(11, 17, 7, c(o.tint ?? '#fff0d6')) + C(20, 14, 7.5, c(o.tint ?? '#fff0d6')) + C(17, 22, 6.5, c(o.tint ?? '#fff0d6')) + F('M15 9 C17 8 19 8 21 8.5 C19 9.5 17.5 10 16 11.5 Z', '#ffffff', 0.9),
  canister: (o) => R(9, 6, 14, 22, 4, '#9aa8b8') + R(11, 10, 10, 14, 2.5, c(o.tint ?? '#8ad83a'), false) + C(14, 15, 1.5, '#d8ff8a', false) + C(18, 19, 1.2, '#d8ff8a', false) + R(12, 3, 8, 4, 1, '#5a6474'),
  relic: (o) => P('M6 4 L26 4 L28 12 L23 28 L9 28 L4 12 Z', c(o.tint ?? '#e0c070')) + P('M16 9 L19 14 L16 23 L13 14 Z', '#7ae0ff', 'stroke-width="1.2"') + L('M7 12 L25 12', 1.2, '#a8884a'),
  dust: (o) => C(10, 20, 3.5, c(o.tint ?? '#ff9ad8')) + C(18, 12, 4, lt(o.tint ?? 0xff9ad8, 0.1)) + C(22, 22, 3, c(o.tint ?? '#ff9ad8')) + P('M8 8 L9 10.5 L11.5 11 L9 12 L8 14.5 L7 12 L4.5 11 L7 10 Z', '#ffffff', 'stroke-width="1"'),
  spore: (o) => P('M5 17 C5 9 10 5 16 5 C22 5 27 9 27 17 Z', c(o.tint ?? '#b05ae6')) + R(13, 17, 6, 11, 2, '#f8ecd8') + C(11, 11, 1.8, '#ffffff', false) + C(19, 9, 1.6, '#ffffff', false) + C(22, 14, 1.4, '#ffffff', false),
  scale: (o) => P('M16 3 C24 6 28 13 26 21 C24 26 20 29 16 29 C12 29 8 26 6 21 C4 13 8 6 16 3 Z', c(o.tint ?? '#4ac8ff')) + L('M10 12 C13 15 19 15 22 12 M8.5 19 C12 23 20 23 23.5 19', 1.3) + HI('M11 7 C13 5.5 15 5 17 5 C15 6.5 13.5 7.5 12 9.5 Z'),
  coal: (o) => P('M5 20 L9 9 L19 5 L27 12 L26 23 L16 28 Z', '#3a3036') + F('M10 18 L13 12 L19 10 L22 15 L19 21 L13 22 Z', c(o.tint ?? '#ff6a2c'), 0.95) + F('M14 16 L16 13.5 L19 14.5 L17.5 18 Z', '#ffd23c'),
  snowflake: (o) => L('M16 3 L16 29 M4.7 9.5 L27.3 22.5 M4.7 22.5 L27.3 9.5', 4.2) + L('M16 3 L16 29 M4.7 9.5 L27.3 22.5 M4.7 22.5 L27.3 9.5', 2.2, c(o.tint ?? '#9fe4ff')) + L('M12 6 L16 9 L20 6 M12 26 L16 23 L20 26', 1.6, c(o.tint ?? '#9fe4ff')) + C(16, 16, 3.5, '#ffffff'),
  gearitem: (o) => G.gear(o),
  ore: (o) => P('M4 21 L7 10 L16 5 L26 9 L29 20 L22 28 L10 28 Z', '#8a8090') + F('M7 11 L16 6 L19 10 L10 14 Z', '#b0a8b8', 0.8) + P('M10 18 L13 14 L16 17 L13 21 Z', c(o.tint ?? '#d8783a'), 'stroke-width="1.2"') + P('M18 21 L21 16 L24 20 L21 24 Z', c(o.tint ?? '#d8783a'), 'stroke-width="1.2"') + P('M16 11 L18 9 L20 11 L18 13 Z', c(o.tint ?? '#d8783a'), 'stroke-width="1.2"'),
  ingot: (o) => P('M3 21 L8 12 L27 12 L29 21 Z', c(o.tint ?? '#d8a868')) + P('M3 21 L29 21 L27 26 L5 26 Z', dk(o.tint ?? 0xd8a868, -0.15)) + F('M9 14 L25 14 L26 17 L8 17 Z', '#ffffff', 0.45),

  // ---------------------------------------------------------------- elements
  el_common: () => P('M16 3 L19 12 L28 13 L21 19 L23.5 28 L16 23 L8.5 28 L11 19 L4 13 L13 12 Z', '#f2d29b') + C(16, 16, 3.2, '#fff3d6', false),
  el_flame: () => P('M16 2 C18 8 25 11 25 19 C25 25 21 29.5 16 29.5 C11 29.5 7 25 7 19 C7 15 9 12 11 10 C11 13 12 15 14 16 C13 11 13 6 16 2 Z', '#ff6a2c') + P('M16 14 C17 18 21 19 21 23 C21 26 19 28 16 28 C13 28 11 26 11 23 C11 20 14 18 16 14 Z', '#ffd23c', 'stroke-width="1.2"'),
  el_aquatic: () => P('M16 2 C16 2 6 14 6 20.5 C6 26 10.5 30 16 30 C21.5 30 26 26 26 20.5 C26 14 16 2 16 2 Z', '#2ea7ff') + P('M10 21 C11.5 24 14 26 17 26', 'none', 'stroke="#ffffff" stroke-width="2"') + HI('M12 13 C13 11 14 9 15.5 7.5 C15 10.5 14 13 13.5 16 Z'),
  el_snow: () => G.snowflake({ tint: '#9fe4ff' }),
  el_terra: () => P('M2 27 L11 9 L16 16 L20 10 L30 27 Z', '#c78a45') + F('M11 9 L14 13.5 L11 17 L8 15 Z', '#f0c890') + F('M20 10 L24 17 L21 18 Z', '#f0c890') + L('M2 27 L30 27', 1.8),
  el_flora: () => P('M5 27 C5 14 13 5 28 4 C28 18 20 27 5 27 Z', '#5cd65a') + L('M6 26 C11 19 17 13 24 8', 1.6) + L('M12 19 L12 14 M17 14 L17 10 M15 17 L20 17', 1.2, '#2a8a3a'),
  el_venom: () => P('M16 3 C21 9 26 14 26 20 C26 25.5 21.5 29.5 16 29.5 C10.5 29.5 6 25.5 6 20 C6 14 11 9 16 3 Z', '#b05ae6') + C(12.5, 19, 2.6, '#1b1430', false) + C(19.5, 19, 2.6, '#1b1430', false) + R(13, 23.5, 6, 2.6, 1, '#1b1430', false) + C(22, 10, 2, '#7ae04a'),
  el_primal: () => P('M5 4 C9 10 10 18 7 28 L10 28 C14 19 13 10 9 4 Z', '#e0503a') + P('M13 3 C17 10 18 18 15 29 L18 29 C22 19 21 10 17 3 Z', '#e0503a') + P('M21 4 C25 10 26 18 23 28 L26 28 C30 19 29 10 25 4 Z', '#e0503a'),
  el_phantom: () => P('M5 28 L5 14 C5 7 10 3 16 3 C22 3 27 7 27 14 L27 28 L23 25 L20 28 L16 25 L12 28 L9 25 Z', '#6e5ee0') + E(12, 14, 2.4, 3.2, '#ffffff', false) + E(20, 14, 2.4, 3.2, '#ffffff', false) + C(12, 15, 1.2, '#1b1430', false) + C(20, 15, 1.2, '#1b1430', false),
  el_lightning: () => G.energy().replace(/#7ae04a/g, '#ffd23c').replace(/#b8ff7a/g, '#fff2a0'),
  el_flying: () => P('M3 21 C7 9 17 4 29 5 C26 8 24 9 21 10 C24 11 26 11 28 11 C25 15 22 16 19 16.5 C21 17.5 23 18 25 18 C20 22 13 23 3 21 Z', '#86c8ff') + L('M6 20 C12 17 18 13 24 9', 1.2, '#3f7fc0'),
  el_tech: () => G.gear().replace('#9aa8b8', '#98a8bc').replace('#5a6474', '#4ab8ff'),
  el_flux: () => P('M16 3 C24 3 29 9 29 16 C29 23 23 28 17 28 C12 28 8 24 8 19 C8 15 11 12 15 12 C18 12 20 14 20 17 C20 19 18.5 20.5 16.5 20.5 C17.5 19 17 17 15.5 17 C13 17 12 19 12 20.5 C12 23.5 15 25 17.5 25 C22 25 25.5 21 25.5 16 C25.5 10.5 21.5 6.5 16 6.5 C11 6.5 6.5 10 6.5 16 L3 16 C3 9 8.5 3 16 3 Z', '#ff5fb8'),

  // ---------------------------------------------------------------- statuses
  st_burn: () => G.el_flame(),
  st_poison: () => C(12, 19, 8, '#a654e0') + C(21, 12, 5.5, '#c88aff') + C(22, 23, 3.5, '#a654e0'),
  st_freeze: () => P('M6 9 L16 4 L26 9 L26 22 L16 28 L6 22 Z', '#8fdcff') + F('M6 9 L16 4 L26 9 L16 14 Z', '#e8faff') + L('M16 14 L16 28 M6 9 L16 14 L26 9', 1.2),
  st_stun: () => P('M16 4 L18.5 11 L26 11 L20 15.5 L22.5 23 L16 18.5 L9.5 23 L12 15.5 L6 11 L13.5 11 Z', '#ffd23c') + E(16, 26, 11, 3, 'none'),
  st_sleep: () => P('M5 5 L15 5 L15 8 L9.5 14 L15 14 L15 17 L5 17 L5 14 L10.5 8 L5 8 Z', '#8e8ad8') + P('M18 14 L27 14 L27 17 L22 22.5 L27 22.5 L27 25.5 L18 25.5 L18 22.5 L23 17 L18 17 Z', '#b8b4ff'),
  st_confuse: () => P('M16 4 C23 4 28 9 28 16 C28 23 23 28 16 28 C10 28 6 24 6 18.5 C6 14 9.5 11 13.5 11 C17 11 20 13.5 20 17 C20 20 17.5 22 15 22 C13 22 11.5 20.5 11.5 18.5 L15 18.5 C15 17 16 15 14 14.5 C11 14.5 9.5 16.5 9.5 18.5 C9.5 22 12.5 24.5 16 24.5 C21 24.5 24.5 20.5 24.5 16 C24.5 11 20.5 7.5 16 7.5 Z', '#ff76c0'),
  st_weaken: () => G.sword() + P('M20 18 L28 18 L24 27 Z', '#ff5a5a'),
  st_expose: () => G.shield().replace('#4a8aff', '#c49a4a').replace('#2a5ad8', '#8a6a2a') + L('M18 8 L14 15 L18 19 L14 27', 2.4),
  st_slow: () => P('M6 24 C6 16 11 11 17 11 C22 11 26 15 26 20 C26 24 23 26 20 26 L6 26 Z', '#6a9ad0') + P('M3 26 L29 26 L27 29 L5 29 Z', '#b0d0f0') + C(17, 19, 4, '#8ab8e8'),
  st_regen: () => G.heart() + P('M14 11 L18 11 L18 14 L21 14 L21 18 L18 18 L18 21 L14 21 L14 18 L11 18 L11 14 L14 14 Z', '#ffffff', 'stroke-width="1"'),
  st_shield: () => G.shield(),
  st_haste: () => G.boot(),
  st_empower: () => G.fist(),
  st_fortify: () => G.shield().replace('#4a8aff', '#c78a45').replace('#2a5ad8', '#8a5a2a'),
  st_taunt: () => P('M4 11 L13 11 L22 4 L22 28 L13 21 L4 21 Z', '#e0503a') + L('M25 11 L29 9 M25 16 L30 16 M25 21 L29 23', 1.8),
  st_focus: () => C(16, 16, 11, 'none') + C(16, 16, 5, '#ffe07a') + L('M16 2 L16 9 M16 23 L16 30 M2 16 L9 16 M23 16 L30 16', 2.2),
};

const ALIASES = { gems: 'gem', lunites: 'lunite', el_undefined: 'el_common', mat: 'fiber', gemitem: 'gem' };

export function icon(name, opts = {}) {
  const key = G[name] ? name : ALIASES[name] || 'info';
  const size = opts.size ? ` width="${opts.size}" height="${opts.size}"` : '';
  const tint = opts.tint !== undefined ? (typeof opts.tint === 'number' ? hexStr(opts.tint) : opts.tint) : undefined;
  const body = G[key]({ tint, spot: opts.spot !== undefined ? hexStr(opts.spot) : undefined });
  return `<svg class="ico ${opts.cls || ''}" viewBox="0 0 32 32"${size} aria-hidden="true" focusable="false">${body}</svg>`;
}

export function elIcon(el, opts = {}) { return icon('el_' + el, opts); }
export function stIcon(st, opts = {}) { return icon('st_' + st, opts); }

export function itemIcon(it, opts = {}) {
  if (!it) return icon('info', opts);
  return icon(it.icon, { ...opts, tint: it.tint });
}

export function elColor(el) { return hexStr(ELEMENT_MAP[el]?.color ?? 0xffffff); }

export const ICON_NAMES = Object.keys(G);
