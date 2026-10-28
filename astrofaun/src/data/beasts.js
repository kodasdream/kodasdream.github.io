// Species catalogue. 104 evolution families of three stages plus 13 legendaries = 325 beasts.
// Everything is generated deterministically from fixed seeds so saves stay valid.
import { RNG, clamp, shade, mixHex } from '../core/util.js';
import { ELEMENT_IDS } from './elements.js';
import { SKILLS_BY_EL } from './skills.js';

export const STATS = ['hp', 'atk', 'def', 'spd', 'sta'];
export const STAT_NAMES = { hp: 'Health', atk: 'Attack', def: 'Defense', spd: 'Speed', sta: 'Stamina' };
export const STAT_SHORT = { hp: 'HP', atk: 'ATK', def: 'DEF', spd: 'SPD', sta: 'STA' };

export const RARITIES = [
  { id: 'common',    name: 'Common',    color: 0xaab8c8, statMult: 1.0,  growth: 0.022, xpBase: 18, xpRate: 1.078, catch: 0.9,  yieldMult: 1.0, evo: [14, 32], income: 1.0 },
  { id: 'uncommon',  name: 'Uncommon',  color: 0x5ccf63, statMult: 1.07, growth: 0.028, xpBase: 20, xpRate: 1.082, catch: 0.7,  yieldMult: 1.15, evo: [16, 35], income: 1.4 },
  { id: 'rare',      name: 'Rare',      color: 0x3f9cff, statMult: 1.15, growth: 0.034, xpBase: 22, xpRate: 1.086, catch: 0.48, yieldMult: 1.3, evo: [18, 38], income: 2.0 },
  { id: 'epic',      name: 'Epic',      color: 0xa863ff, statMult: 1.24, growth: 0.040, xpBase: 25, xpRate: 1.090, catch: 0.28, yieldMult: 1.55, evo: [22, 42], income: 3.0 },
  { id: 'legendary', name: 'Legendary', color: 0xffa726, statMult: 1.4,  growth: 0.047, xpBase: 30, xpRate: 1.095, catch: 0.07, yieldMult: 2.2, evo: null, income: 5.0 },
];
export const RARITY_MAP = Object.fromEntries(RARITIES.map((r) => [r.id, r]));

const ROLES = {
  balanced:  { hp: 1.0,  atk: 1.0,  def: 1.0,  spd: 1.0,  sta: 1.0,  g: { hp: 0, atk: 0, def: 0, spd: 0, sta: 0 } },
  tank:      { hp: 1.3,  atk: 0.85, def: 1.3,  spd: 0.7,  sta: 1.0,  g: { hp: 0.006, atk: -0.003, def: 0.006, spd: -0.006, sta: 0 } },
  brute:     { hp: 1.1,  atk: 1.3,  def: 1.1,  spd: 0.75, sta: 0.9,  g: { hp: 0.002, atk: 0.006, def: 0.003, spd: -0.006, sta: -0.002 } },
  striker:   { hp: 0.9,  atk: 1.3,  def: 0.85, spd: 1.2,  sta: 0.9,  g: { hp: -0.002, atk: 0.006, def: -0.004, spd: 0.004, sta: -0.002 } },
  speedster: { hp: 0.85, atk: 1.05, def: 0.85, spd: 1.45, sta: 1.0,  g: { hp: -0.004, atk: 0.001, def: -0.004, spd: 0.008, sta: 0 } },
  mystic:    { hp: 1.0,  atk: 1.1,  def: 0.9,  spd: 1.0,  sta: 1.4,  g: { hp: 0, atk: 0.002, def: -0.003, spd: 0, sta: 0.007 } },
};
export const ROLE_NAMES = { balanced: 'Balanced', tank: 'Guardian', brute: 'Bruiser', striker: 'Striker', speedster: 'Speedster', mystic: 'Mystic' };

const EL_GROWTH = {
  common:    { hp: 0.002 },
  flame:     { atk: 0.004 },
  aquatic:   { hp: 0.003, sta: 0.002 },
  snow:      { def: 0.003, sta: 0.002 },
  terra:     { def: 0.005, spd: -0.003 },
  flora:     { hp: 0.004 },
  venom:     { sta: 0.003, spd: 0.002 },
  primal:    { atk: 0.005, sta: -0.002 },
  phantom:   { spd: 0.003, sta: 0.002 },
  lightning: { spd: 0.005, def: -0.002 },
  flying:    { spd: 0.004, hp: -0.002 },
  tech:      { def: 0.003, atk: 0.002 },
  flux:      { sta: 0.004, atk: 0.002 },
};
const EL_XP = { common: 0.92, flame: 1, aquatic: 1, snow: 1.02, terra: 1.04, flora: 0.98, venom: 1, primal: 0.96, phantom: 1.05, lightning: 1.01, flying: 0.99, tech: 1.06, flux: 1.1 };

const BASE = { hp: 60, atk: 14, def: 14, spd: 14, sta: 30 };
const STAGE_MULT = [1, 1, 1.24, 1.5];

// ---------------------------------------------------------------- palettes
const PALETTES = {
  common: [[0xf4c27a, 0xe08a4a, 0xfff0d0, 0x8a5a3a], [0xf7a8c4, 0xd96aa0, 0xffe8f2, 0x7a3a5a], [0xc9a27a, 0x8e6a4a, 0xf5e6cc, 0x4a3020], [0xa8d8f0, 0x6aa0d0, 0xf0faff, 0x2a5080], [0xf0e0a0, 0xd0a040, 0xfffbe8, 0x806020], [0xd8b0f0, 0xa070d0, 0xf8eeff, 0x503080]],
  flame: [[0xff5a2a, 0xffb02e, 0xffe0a0, 0x7a1a10], [0xff3d4a, 0xff8a2a, 0xffd0a0, 0x5a0a20], [0xff7a1a, 0xffd23c, 0xfff0c0, 0x6a2a00], [0xd8342a, 0x3a2a2a, 0xffb070, 0xffd040], [0xff8f5a, 0xff3a6a, 0xffe0d0, 0x7a1030], [0xffa020, 0xe03a20, 0xfff2b0, 0x502010]],
  aquatic: [[0x2aa8ff, 0x1a6ad8, 0xc8f0ff, 0xffd23c], [0x2ad0c8, 0x1a88a8, 0xd0fff8, 0xff7a5a], [0x4a7aff, 0x2a3ab8, 0xd8e4ff, 0xffe07a], [0x38c8f0, 0xff8ab0, 0xe8faff, 0x1a5a80], [0x1ab8a0, 0x0a6a6a, 0xc8fff0, 0xffb04a], [0x5aa0e8, 0xf0f4ff, 0xffffff, 0x1a3a7a]],
  snow: [[0xd8f4ff, 0x8ad0f0, 0xffffff, 0x3a7ab8], [0xf4fbff, 0xa8c8ff, 0xffffff, 0x5a5ad0], [0xb8e8ff, 0xffffff, 0xeaf8ff, 0x2a6aa8], [0xe0f0ff, 0x9ab0e0, 0xffffff, 0xff7a9a], [0xc0f0f0, 0x6ac8d8, 0xf4ffff, 0x2a8a9a], [0xffffff, 0x7ab8f0, 0xeef6ff, 0x1a4a9a]],
  terra: [[0xc78a45, 0x8a5a2a, 0xf0d0a0, 0x4a7a3a], [0xa87a5a, 0x6a4a3a, 0xe8c8a8, 0xd8a040], [0xd8a050, 0x9a6a3a, 0xf8e0b0, 0x5a3a20], [0x9a8a7a, 0x5a5048, 0xd8d0c0, 0xc86a3a], [0xb86a3a, 0xe8b070, 0xf8d8b0, 0x3a2a1a], [0x8a9a6a, 0x5a6a4a, 0xd8e0c0, 0xb07a4a]],
  flora: [[0x5cd65a, 0x2a9a4a, 0xd8ffc0, 0xff7ab0], [0x8ae04a, 0x4aa03a, 0xeaffd0, 0xffd23c], [0x3ac88a, 0x1a7a5a, 0xc8ffe8, 0xff8a5a], [0xa8e070, 0xff9ac8, 0xf4ffe0, 0x3a8a3a], [0x6ad8a0, 0xffd06a, 0xe8fff0, 0x2a7a4a], [0x4ab84a, 0xb85ae0, 0xd8f8c8, 0x1a5a2a]],
  venom: [[0xb05ae6, 0x7ae04a, 0xead0ff, 0x3a1a5a], [0x8a3ad0, 0xe04ab0, 0xe0c0ff, 0x2a0a3a], [0x9ae03a, 0x6a2ab0, 0xeaffc0, 0x2a3a0a], [0xd05ad8, 0x5a2a8a, 0xf8d0f8, 0xc0ff4a], [0x6a4ac8, 0x4ad8a0, 0xd8d0ff, 0x1a1a4a], [0xc84ae0, 0xffd23c, 0xf0d0ff, 0x4a1a5a]],
  primal: [[0xe0503a, 0x8a2a1a, 0xffc0a0, 0xf8e0b0], [0xd8783a, 0x5a3020, 0xffd8b0, 0xfff0d8], [0xb8402a, 0xe8a050, 0xf8d0a8, 0x3a1a10], [0xa86a4a, 0x4a2a1a, 0xe8c8a8, 0xe0503a], [0xe86a5a, 0x7a2a3a, 0xffd0c0, 0xffe08a], [0xc8582a, 0x2a2a2a, 0xf8c890, 0xf0f0f0]],
  phantom: [[0x6e5ee0, 0x382d8f, 0xd0c8ff, 0x6af0e0], [0x4a3aa8, 0x9a6ae8, 0xc8c0f8, 0xffd23c], [0x8a7af0, 0x2a2060, 0xe0d8ff, 0xff6aa8], [0x5a4ad0, 0x3ad0c0, 0xd8d0ff, 0x1a1040], [0x9a8ae0, 0x4a3a8a, 0xf0eaff, 0xb0ff7a], [0x3a3070, 0x8a6af0, 0xa8a0e0, 0xe0e0ff]],
  lightning: [[0xffd23c, 0x3a3040, 0xfff0b0, 0x4ab8ff], [0xffe04a, 0xff8a2a, 0xfff8d0, 0x2a2a3a], [0xf8c020, 0x5a5ae0, 0xfff0b8, 0x1a1a4a], [0xffea6a, 0x40c8ff, 0xfffbe0, 0x2a3a6a], [0xffb820, 0xffffff, 0xfff4d0, 0x3a2a1a], [0xe8e04a, 0x8a5ad8, 0xfaffd0, 0x2a1a4a]],
  flying: [[0x86c8ff, 0xffffff, 0xeaf6ff, 0xffb03a], [0xffffff, 0x6aa8e8, 0xf4f8ff, 0xff8a3a], [0xa8d8ff, 0xff9ab8, 0xf0faff, 0x3a6ab8], [0x6ab0f0, 0xffd23c, 0xe0f0ff, 0x1a3a7a], [0xc8e8ff, 0x5ad0b8, 0xffffff, 0x2a5a8a], [0x8ab8e8, 0xe8e0ff, 0xf8faff, 0xe0503a]],
  tech: [[0x98a8bc, 0x4ab8ff, 0xdde6f0, 0xff7a2a], [0xb8c0c8, 0xffd23c, 0xeef2f6, 0x3a4a5a], [0x7a8a9a, 0xff5a5a, 0xd0d8e0, 0x2a3040], [0xa0b8c8, 0x5ae0a0, 0xe0eaf0, 0x2a3a4a], [0xc8ccd8, 0xb05ae6, 0xf0f2f8, 0x3a3a4a], [0x8a98a8, 0xffa03a, 0xdde0e8, 0x1a2a3a]],
  flux: [[0xff5fb8, 0x4ae0ff, 0xffd0ec, 0x5a1a5a], [0xb85aff, 0xff8ad8, 0xf0d0ff, 0x2a1a5a], [0x4af0d8, 0xff6ab8, 0xd0fff8, 0x1a3a5a], [0xff7a9a, 0x9a7aff, 0xffe0ea, 0x3a1a4a], [0xe05ae0, 0xffd23c, 0xffd8f8, 0x3a0a3a], [0x6a8aff, 0xff9a5a, 0xe0e8ff, 0x1a1a5a]],
};

// ---------------------------------------------------------------- anatomy tables
const BODY_W = {
  common: [['biped', 3], ['quad', 3.5], ['blob', 2], ['avian', 1], ['floater', 0.5]],
  flame: [['quad', 3.5], ['biped', 3], ['serpent', 1], ['blob', 1.5], ['avian', 1]],
  aquatic: [['fish', 2.5], ['quad', 2], ['blob', 2], ['serpent', 2], ['biped', 1.5]],
  snow: [['quad', 3.5], ['biped', 2.5], ['blob', 2], ['avian', 1], ['floater', 1]],
  terra: [['quad', 4.5], ['biped', 3], ['blob', 1.5], ['bug', 1]],
  flora: [['biped', 2.5], ['quad', 2.5], ['blob', 2.5], ['bug', 1.5], ['floater', 1]],
  venom: [['bug', 3.5], ['serpent', 2], ['blob', 2], ['quad', 1.5], ['biped', 1]],
  primal: [['quad', 5], ['biped', 4], ['serpent', 1]],
  phantom: [['floater', 4.5], ['biped', 2], ['blob', 1.5], ['serpent', 1], ['avian', 1]],
  lightning: [['quad', 3.5], ['biped', 3], ['bug', 1.5], ['avian', 1], ['floater', 1]],
  flying: [['avian', 7], ['bug', 1], ['floater', 1], ['quad', 1]],
  tech: [['biped', 3.5], ['quad', 2.5], ['floater', 2], ['bug', 1], ['blob', 1]],
  flux: [['floater', 4], ['blob', 2], ['serpent', 1.5], ['biped', 1.5], ['avian', 1]],
};

const EARS = {
  common: [['cat', 2], ['bunny', 2], ['round', 3], ['droop', 2]],
  flame: [['cat', 3], ['none', 2], ['fin', 1], ['horn', 1]],
  aquatic: [['fin', 4], ['none', 2], ['round', 1]],
  snow: [['round', 3], ['bunny', 2], ['cat', 2], ['tuft', 1]],
  terra: [['round', 3], ['none', 2], ['droop', 2]],
  flora: [['leaf', 4], ['bunny', 1], ['round', 1]],
  venom: [['none', 3], ['fin', 1], ['cat', 1]],
  primal: [['cat', 3], ['round', 2], ['droop', 1], ['tuft', 2]],
  phantom: [['cat', 2], ['none', 3], ['bunny', 1]],
  lightning: [['cat', 3], ['bolt', 3], ['bunny', 1]],
  flying: [['none', 3], ['tuft', 3]],
  tech: [['none', 2], ['bolt', 2], ['round', 1], ['dish', 2]],
  flux: [['none', 3], ['fin', 2], ['cat', 1]],
};

const HORNS = {
  common: [['none', 6], ['nub', 2]],
  flame: [['curl', 3], ['nub', 2], ['none', 2], ['spike', 2]],
  aquatic: [['none', 5], ['nub', 1], ['unicorn', 1]],
  snow: [['none', 3], ['crystal', 2], ['antler', 2]],
  terra: [['ram', 3], ['nub', 2], ['crystal', 1], ['none', 2]],
  flora: [['none', 3], ['antler', 3], ['sprout', 3]],
  venom: [['none', 3], ['spike', 2], ['antenna', 2]],
  primal: [['curl', 2], ['ram', 2], ['nub', 2], ['none', 2]],
  phantom: [['spike', 2], ['curl', 2], ['none', 3]],
  lightning: [['spike', 2], ['none', 3], ['antenna', 2]],
  flying: [['none', 5], ['crest', 4]],
  tech: [['antenna', 4], ['none', 2], ['spike', 1]],
  flux: [['crystal', 3], ['unicorn', 2], ['none', 2]],
};

const TAILS = {
  common: [['fluffy', 3], ['stub', 2], ['long', 2], ['curly', 2]],
  flame: [['flame', 5], ['long', 2]],
  aquatic: [['fin', 5], ['long', 1]],
  snow: [['fluffy', 4], ['stub', 2], ['crystal', 1]],
  terra: [['club', 3], ['stub', 3], ['long', 1]],
  flora: [['leaf', 4], ['curly', 2], ['stub', 1]],
  venom: [['stinger', 4], ['long', 2], ['stub', 1]],
  primal: [['fluffy', 3], ['long', 3], ['club', 1]],
  phantom: [['wisp', 4], ['long', 2], ['none', 1]],
  lightning: [['bolt', 5], ['long', 1]],
  flying: [['feather', 6]],
  tech: [['cable', 4], ['stub', 2], ['none', 1]],
  flux: [['crystal', 3], ['wisp', 3], ['long', 1]],
};

const BACKS = {
  common: [['none', 5], ['tufts', 2], ['spots', 0]],
  flame: [['flames', 5], ['spikes', 2], ['none', 1]],
  aquatic: [['fins', 4], ['shell', 3], ['none', 1]],
  snow: [['crystals', 3], ['tufts', 3], ['none', 2]],
  terra: [['plates', 3], ['shell', 2], ['crystals', 2], ['none', 1]],
  flora: [['leaves', 4], ['mushroom', 2], ['flower', 3]],
  venom: [['spikes', 3], ['mushroom', 3], ['none', 1]],
  primal: [['tufts', 4], ['spikes', 2], ['none', 2]],
  phantom: [['none', 3], ['wisps', 3], ['spikes', 1]],
  lightning: [['spikes', 4], ['none', 2], ['tufts', 1]],
  flying: [['none', 4], ['tufts', 2]],
  tech: [['plates', 3], ['vents', 3], ['none', 1]],
  flux: [['crystals', 5], ['none', 2]],
};

const PATTERNS = [['none', 3], ['spots', 2], ['stripes', 2], ['patches', 1.5], ['gradient', 1.5], ['rings', 0.7]];

const SECONDARY = {
  common: ['flying', 'flora', 'terra', 'primal'],
  flame: ['primal', 'terra', 'lightning', 'flying', 'tech'],
  aquatic: ['snow', 'venom', 'phantom', 'terra', 'flora'],
  snow: ['aquatic', 'flying', 'phantom', 'terra'],
  terra: ['primal', 'flame', 'tech', 'flora'],
  flora: ['venom', 'flying', 'common', 'aquatic'],
  venom: ['flora', 'phantom', 'aquatic', 'flux'],
  primal: ['terra', 'flame', 'common', 'venom'],
  phantom: ['flux', 'venom', 'lightning', 'snow'],
  lightning: ['tech', 'flying', 'flux', 'primal'],
  flying: ['lightning', 'snow', 'flora', 'phantom'],
  tech: ['lightning', 'flame', 'terra', 'flux'],
  flux: ['phantom', 'tech', 'flying', 'lightning'],
};

// ---------------------------------------------------------------- names
const ROOTS = {
  common: ['Pun', 'Mob', 'Bim', 'Tup', 'Lum', 'Wob', 'Fen', 'Nib', 'Pip', 'Mur', 'Tob', 'Kip', 'Dun', 'Bun', 'Hob', 'Snib', 'Gub', 'Lom'],
  flame: ['Pyr', 'Sul', 'Cind', 'Emb', 'Scor', 'Blaz', 'Flar', 'Ign', 'Ash', 'Volc', 'Kin', 'Mag', 'Char', 'Fyr', 'Bur', 'Sear', 'Tor', 'Heth'],
  aquatic: ['Aq', 'Tort', 'Mar', 'Rip', 'Bub', 'Kel', 'Tid', 'Shol', 'Cor', 'Slosh', 'Finn', 'Gil', 'Wav', 'Pud', 'Naut', 'Lag', 'Squib', 'Dew'],
  snow: ['Frost', 'Glac', 'Snow', 'Chill', 'Brr', 'Ic', 'Hail', 'Pol', 'Sleet', 'Yet', 'Frim', 'Nev', 'Bor', 'Skel', 'Rim', 'Fluf', 'Wint', 'Cryo'],
  terra: ['Grom', 'Ped', 'Boul', 'Crag', 'Tusk', 'Dust', 'Mol', 'Orr', 'Grav', 'Burr', 'Knol', 'Rubb', 'Clod', 'Ston', 'Pebb', 'Mes', 'Dun', 'Rok'],
  flora: ['Cact', 'Fung', 'Bolb', 'Pet', 'Moss', 'Fern', 'Bram', 'Vin', 'Sap', 'Bud', 'Bloom', 'Leaf', 'Thorn', 'Clov', 'Poll', 'Saff', 'Jun', 'Orch'],
  venom: ['Tox', 'Snog', 'Skrun', 'Ven', 'Gloo', 'Myc', 'Blig', 'Nox', 'Mir', 'Ooz', 'Spik', 'Hex', 'Bog', 'Vex', 'Scum', 'Mal', 'Grub', 'Ich'],
  primal: ['Grom', 'Fang', 'Rax', 'Tusk', 'Maw', 'Gnar', 'Roar', 'Brut', 'Krag', 'Hun', 'Fer', 'Snar', 'Brak', 'Mam', 'Bor', 'Garr', 'Tal', 'Ug'],
  phantom: ['Mys', 'Ghos', 'Shad', 'Wraith', 'Spec', 'Haun', 'Gloom', 'Nyx', 'Umbr', 'Phan', 'Wisp', 'Boo', 'Dread', 'Mor', 'Grim', 'Shay', 'Vel', 'Noc'],
  lightning: ['Jir', 'Volt', 'Zap', 'Spark', 'Amp', 'Thun', 'Bolt', 'Flick', 'Stat', 'Kil', 'Ion', 'Zep', 'Jolt', 'Ohm', 'Blitz', 'Crack', 'Tes', 'Fizz'],
  flying: ['Pet', 'Feath', 'Skai', 'Plum', 'Swoo', 'Gust', 'Kes', 'Wren', 'Tal', 'Aer', 'Cloud', 'Swif', 'Flap', 'Roo', 'Finch', 'Hoo', 'Cir', 'Zeph'],
  tech: ['Gear', 'Bolt', 'Mech', 'Robo', 'Cog', 'Widg', 'Tin', 'Chrom', 'Pix', 'Byt', 'Circ', 'Dyn', 'Serv', 'Volt', 'Tek', 'Glim', 'Riv', 'Nan'],
  flux: ['Flux', 'Pris', 'Warp', 'Rift', 'Quas', 'Phas', 'Lum', 'Nov', 'Astr', 'Puls', 'Sing', 'Hal', 'Cel', 'Vor', 'Prism', 'Ech', 'Qui', 'Zel'],
};
const END1 = ['i', 'o', 'oo', 'ee', 'y', 'ie', 'ling', 'kin', 'bit', 'let', 'pup', 'a', 'u', 'ini', 'opo', 'ub'];
const MID2 = ['var', 'dle', 'bo', 'ra', 'zel', 'mo', 'tusk', 'gor', 'vex', 'ron', 'dax', 'lin', 'ber', 'tor', 'kan', 'sa', 'vo', 'zu', 'flutter', 'nark', 'gle', 'pax', 'rus', 'wick'];
const END3 = ['oth', 'ax', 'agon', 'or', 'aur', 'orax', 'ador', 'otaur', 'urion', 'eon', 'ark', 'ugar', 'zor', 'anth', 'ious', 'erus', 'astor', 'umbra'];

function capital(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function joinName(a, b) {
  // Avoid ugly triple consonants or doubled vowels at the seam
  const last = a[a.length - 1].toLowerCase();
  const first = b[0].toLowerCase();
  const vowels = 'aeiouy';
  if (vowels.includes(last) && vowels.includes(first)) return a + b.slice(1);
  if (last === first) return a + b.slice(1);
  return a + b;
}

// ---------------------------------------------------------------- flavor
const EL_FLAVOR = {
  common: ['friendly and endlessly curious', 'happiest when napping in warm grass', 'known to follow travellers for snacks', 'adaptable to nearly any island'],
  flame: ['feisty and temperamental', 'always warm to the touch', 'naps inside cooling lava vents', 'sneezes little puffs of cinders when excited'],
  aquatic: ['a calm swimmer of floating lagoons', 'stores water in its cheeks for long trips', 'drifts between islands on rain clouds', 'loves splashing anyone nearby'],
  snow: ['fluffy and unbothered by any cold', 'leaves little frost prints wherever it walks', 'hibernates inside glacier caves', 'can sculpt ice with its breath'],
  terra: ['sturdy and stubborn as a boulder', 'digs burrows deep into island roots', 'polishes pebbles to impress its friends', 'has skin tougher than iron ore'],
  flora: ['soaks up sunlight to stay energetic', 'grows new leaves after every meal', 'plants seeds wherever it naps', 'smells faintly of fresh blossoms'],
  venom: ['mischievous and a little smelly', 'thrives in the bogs that others avoid', 'warns rivals with bright colors', 'brews toxins in its glands'],
  primal: ['fierce, loyal and very loud', 'hunts in packs across the plains', 'marks its territory with deep claw scratches', 'never backs down from a challenge'],
  phantom: ['rarely seen in daylight', 'whispers in a language nobody knows', 'can drift through thin walls', 'feeds on lingering echoes'],
  lightning: ['crackling with restless energy', 'charges itself during storms', 'its fur stands up when it gets excited', 'is faster than the eye can follow'],
  flying: ['rides warm currents between islands', 'sings at sunrise from the highest perches', 'builds nests on drifting rocks', 'never seems to touch the ground'],
  tech: ['built by the Ancients, or so it seems', 'hums softly while it thinks', 'collects scrap to upgrade itself', 'communicates in clicks and beeps'],
  flux: ['shifts between moments in time', 'leaves a trail of prismatic dust', 'appears where space is thinnest', 'its shape is never quite the same twice'],
};
const STAGE_FLAVOR = [
  '',
  ['Small and playful,', 'Cute but clumsy,', 'Tiny and curious,', 'Still a little shy,'],
  ['Growing bolder,', 'Now a seasoned rover,', 'Larger and more confident,', 'Fully grown in spirit,'],
  ['Massive and proud,', 'A towering champion,', 'Feared across the islands,', 'An apex of its kind,'],
];

// ---------------------------------------------------------------- genome
function pickW(rng, table) { return rng.weighted(table); }

function makeGenome(rng, el, el2, body) {
  const pal = rng.pick(PALETTES[el]);
  const [main, second, belly, accent] = pal;
  let sec = second;
  if (el2 && rng.chance(0.6)) sec = rng.pick(PALETTES[el2])[0];
  const g = {
    body,
    torso: { w: rng.range(0.85, 1.15), h: rng.range(0.85, 1.15), d: rng.range(0.85, 1.25) },
    head: {
      size: rng.range(0.62, 0.82),
      shape: rng.pick(['round', 'round', 'wide', 'tall', 'pear']),
      snout: rng.range(0, 1),
      snoutType: 'none',
    },
    ears: { type: pickW(rng, EARS[el]), size: rng.range(0.8, 1.25) },
    horns: { type: pickW(rng, HORNS[el]), size: rng.range(0.7, 1.1) },
    tail: { type: pickW(rng, TAILS[el]), size: rng.range(0.8, 1.2) },
    wings: { type: 'none', size: rng.range(0.8, 1.2) },
    back: { type: pickW(rng, BACKS[el]), size: rng.range(0.7, 1.0), count: rng.int(3, 5) },
    eyes: {
      size: rng.range(0.24, 0.32),
      spacing: rng.range(0.34, 0.5),
      style: rng.pick(['big', 'big', 'big', 'happy', 'sleepy']),
      count: 2,
      iris: rng.pick([0x1a1a2a, 0x1a1a2a, shade(pal[3], -0.1), 0x2a1a0a]),
    },
    mouth: { type: rng.pick(['smile', 'smile', 'open', 'fangs', 'cat']) },
    limbs: { len: rng.range(0.8, 1.2), thick: rng.range(0.85, 1.2) },
    cheeks: rng.chance(0.45),
    antenna: false,
    palette: { main, second: sec, belly, accent, horn: rng.chance(0.5) ? accent : shade(belly, -0.05) },
    pattern: { type: pickW(rng, PATTERNS), scale: rng.range(2.4, 4.2), color: rng.chance(0.5) ? sec : shade(main, -0.18, 0.05) },
    float: false,
    scale: 1,
  };
  if (el === 'flame') g.palette.flame = [0xff4a1a, 0xffb02e, 0xffe46a];
  if (el === 'phantom' || el2 === 'phantom') g.palette.wisp = shade(main, 0.15);
  // Body specific tweaks
  if (body === 'avian') {
    g.wings.type = 'feather';
    g.head.snoutType = 'beak';
    g.mouth.type = 'beak';
    g.ears.type = rng.chance(0.6) ? 'tuft' : 'none';
    if (g.tail.type !== 'flame' && g.tail.type !== 'bolt') g.tail.type = 'feather';
  } else if (body === 'bug') {
    g.wings.type = rng.chance(0.6) ? 'insect' : 'none';
    g.horns.type = rng.chance(0.6) ? 'antenna' : g.horns.type;
    g.limbs.count = 6;
    g.mouth.type = rng.pick(['fangs', 'smile', 'mandible']);
  } else if (body === 'fish') {
    g.tail.type = 'fin';
    g.ears.type = 'fin';
    g.float = true;
    g.back.type = rng.chance(0.7) ? 'fins' : g.back.type;
  } else if (body === 'floater') {
    g.float = true;
    if (g.tail.type !== 'flame' && g.tail.type !== 'crystal') g.tail.type = 'wisp';
  } else if (body === 'serpent') {
    g.wings.type = el === 'flying' || el2 === 'flying' ? 'feather' : 'none';
  } else if (body === 'quad') {
    g.head.snoutType = rng.pick(['muzzle', 'muzzle', 'none', 'snout']);
  } else if (body === 'biped') {
    g.head.snoutType = rng.pick(['none', 'none', 'muzzle']);
  } else if (body === 'blob') {
    g.head.size = rng.range(0.9, 1.0);
  }
  if (el === 'flying' || el2 === 'flying') {
    if (g.wings.type === 'none' && body !== 'fish') g.wings.type = rng.chance(0.7) ? 'feather' : 'bat';
  }
  if ((el === 'phantom' || el2 === 'phantom') && g.wings.type === 'none' && rng.chance(0.25)) g.wings.type = 'bat';
  if ((el === 'venom' || el === 'flora') && body === 'bug' && g.wings.type === 'none' && rng.chance(0.5)) g.wings.type = 'insect';
  if (el === 'aquatic' && g.head.snoutType === 'muzzle' && rng.chance(0.4)) g.head.snoutType = 'beak';
  if (el === 'terra' && body === 'quad' && rng.chance(0.3)) g.head.snoutType = 'trunk';
  if (el === 'tech') { g.metal = true; g.eyes.style = rng.pick(['visor', 'big', 'big']); }
  if (el === 'phantom' || el === 'flux') {
    const r = rng.next();
    if (r < 0.25) g.eyes.count = 1;
    else if (r < 0.4) g.eyes.count = 3;
  }
  if (el === 'venom' && body === 'bug' && rng.chance(0.3)) g.eyes.count = 3;
  if (el2 && rng.chance(0.5)) {
    // borrow a trait from the secondary type
    const slot = rng.pick(['back', 'tail', 'horns', 'ears']);
    const table = { back: BACKS, tail: TAILS, horns: HORNS, ears: EARS }[slot][el2];
    g[slot].type = pickW(rng, table);
  }
  return g;
}

function evolveGenome(base, stage, rng) {
  const g = JSON.parse(JSON.stringify(base));
  if (stage === 1) return g;
  const k = stage - 1; // 1 or 2
  g.scale = 1 + 0.32 * k + rng.range(-0.04, 0.06);
  g.head.size *= 1 - 0.08 * k;
  g.eyes.size *= 1 - 0.1 * k;
  if (stage === 3 && g.eyes.style !== 'visor') g.eyes.style = rng.chance(0.75) ? 'fierce' : 'big';
  else if (stage === 2 && g.eyes.style === 'sleepy') g.eyes.style = 'big';
  g.limbs.len *= 1 + 0.12 * k;
  g.torso.h *= 1 + 0.05 * k;
  g.torso.d *= 1 + 0.06 * k;
  g.ears.size *= 1 + 0.12 * k;
  g.tail.size *= 1 + 0.15 * k;
  g.wings.size *= 1 + 0.12 * k;
  g.back.size *= 1 + 0.22 * k;
  g.back.count = Math.min(7, g.back.count + k);
  g.horns.size *= 1 + 0.25 * k;
  if (g.horns.type === 'none' && rng.chance(0.35 * k)) g.horns.type = rng.pick(['nub', 'spike', 'curl']);
  if (g.horns.type === 'nub' && stage === 3) g.horns.type = rng.pick(['curl', 'ram', 'spike']);
  if (g.back.type === 'none' && stage === 3 && rng.chance(0.6)) g.back.type = rng.pick(['spikes', 'tufts', 'plates']);
  if (g.mouth.type === 'smile' && stage === 3 && rng.chance(0.6)) g.mouth.type = rng.pick(['fangs', 'tusks']);
  if (stage >= 2 && g.cheeks && rng.chance(0.5)) g.cheeks = false;
  // Colors get slightly deeper and richer with age
  const p = g.palette;
  p.main = shade(p.main, -0.03 * k, 0.04 * k);
  p.second = shade(p.second, -0.03 * k, 0.04 * k);
  if (stage === 3 && g.pattern.type === 'none' && rng.chance(0.5)) g.pattern.type = rng.pick(['stripes', 'patches', 'gradient']);
  return g;
}

// ---------------------------------------------------------------- learnsets
const TIER_LEVELS = [null, [1, 9], [10, 26], [24, 46], [44, 70], [66, 96]];

function makeLearnset(rng, el, el2) {
  const set = [];
  const primary = SKILLS_BY_EL[el];
  // Primary type: all 12 skills
  for (const sk of primary) set.push(sk);
  if (el2) {
    // Secondary type: one skill from each of tiers 1..5 (plus one extra)
    for (let t = 1; t <= 5; t++) {
      const opts = SKILLS_BY_EL[el2].filter((s) => s.tier === t && s.cost > 0);
      if (opts.length) set.push(rng.pick(opts));
    }
  } else if (el !== 'common') {
    const opts = SKILLS_BY_EL.common.filter((s) => s.cost > 0 && s.tier <= 4);
    rng.shuffle(opts);
    set.push(...opts.slice(0, 3));
  }
  const out = [];
  const used = new Set();
  for (const sk of set) {
    if (used.has(sk.id)) continue;
    used.add(sk.id);
    const [a, b] = TIER_LEVELS[sk.tier];
    let lvl = sk.cost === 0 ? 1 : rng.int(a, b);
    if (sk.el !== el && sk.tier > 1) lvl = Math.min(100, lvl + rng.int(2, 6));
    out.push([lvl, sk.id]);
  }
  out.sort((x, y) => x[0] - y[0]);
  // Guarantee two moves at level 1: the free primary move and the first cheap one
  const free = primary.find((s) => s.cost === 0);
  const second = primary.find((s) => s.tier === 1 && s.cost > 0);
  for (const e of out) {
    if (e[1] === free.id || e[1] === second.id) e[0] = 1;
  }
  out.sort((x, y) => x[0] - y[0]);
  return out;
}

// ---------------------------------------------------------------- build catalogue
export const SPECIES = [];        // index = id - 1
export const FAMILIES = [];

const LEGENDARIES = [
  ['common', 'Aurelion', 'flying'], ['flame', 'Pyraxis', 'primal'], ['aquatic', 'Leviathra', 'phantom'],
  ['snow', 'Glaciem', 'flying'], ['terra', 'Terragon', 'primal'], ['flora', 'Sylvarra', 'flux'],
  ['venom', 'Toxaroth', 'phantom'], ['primal', 'Behemaul', 'terra'], ['phantom', 'Nocturnis', 'flux'],
  ['lightning', 'Voltaryx', 'flying'], ['flying', 'Zephyra', 'flux'], ['tech', 'Mechanox', 'lightning'],
  ['flux', 'Chronova', 'phantom'],
];

const ELEMENT_NAMES_FOR_DESC = { common: 'meadow', flame: 'volcanic', aquatic: 'tidal', snow: 'glacial', terra: 'stone', flora: 'verdant', venom: 'bog', primal: 'wild', phantom: 'shadow', lightning: 'storm', flying: 'sky', tech: 'machine', flux: 'rift' };

const FAMILY_RARITY = ['common', 'common', 'common', 'uncommon', 'uncommon', 'rare', 'rare', 'epic'];

function computeBase(role, rarity, stage, body) {
  const r = ROLES[role];
  const rm = RARITY_MAP[rarity].statMult * STAGE_MULT[stage];
  const out = {};
  for (const s of STATS) out[s] = Math.round(BASE[s] * r[s] * rm * 10) / 10;
  if (body === 'blob') out.hp = Math.round(out.hp * 1.08 * 10) / 10;
  return out;
}

function computeGrowth(role, rarity, el, el2) {
  const out = {};
  const base = RARITY_MAP[rarity].growth;
  for (const s of STATS) {
    let g = base + (ROLES[role].g[s] || 0) + (EL_GROWTH[el][s] || 0) + (el2 ? (EL_GROWTH[el2][s] || 0) * 0.5 : 0);
    out[s] = clamp(Math.round(g * 10000) / 10000, 0.01, 0.06);
  }
  return out;
}

function roleFor(rng, body) {
  const t = {
    biped: [['balanced', 3], ['striker', 2], ['brute', 2], ['mystic', 1]],
    quad: [['brute', 3], ['balanced', 2], ['striker', 2], ['tank', 1]],
    blob: [['tank', 3], ['mystic', 2], ['balanced', 1]],
    serpent: [['striker', 2], ['mystic', 2], ['speedster', 1]],
    avian: [['speedster', 3], ['striker', 2], ['balanced', 1]],
    bug: [['speedster', 2], ['brute', 2], ['tank', 1]],
    floater: [['mystic', 3], ['speedster', 2], ['balanced', 1]],
    fish: [['speedster', 2], ['balanced', 2], ['mystic', 1]],
  }[body];
  return rng.weighted(t);
}

(function build() {
  const usedNames = new Set();
  const usedRoots = new Set();
  let id = 1;
  for (const el of ELEMENT_IDS) {
    const rng = new RNG('astrofaun-families-' + el);
    const roots = rng.shuffle([...ROOTS[el]]);
    let rootIdx = 0;
    for (let f = 0; f < 8; f++) {
      const rarity = FAMILY_RARITY[f];
      const frng = new RNG(`fam-${el}-${f}`);
      const el2 = frng.chance(0.45) ? frng.pick(SECONDARY[el]) : null;
      const body = pickW(frng, BODY_W[el]);
      const role = roleFor(frng, body);
      const baseGenome = makeGenome(frng, el, el2, body);
      const learnset = makeLearnset(frng, el, el2);
      // Unique root
      let root;
      do { root = roots[rootIdx++ % roots.length]; if (rootIdx > 40) root = root + frng.pick(['a', 'o', 'e']); } while (usedRoots.has(root));
      usedRoots.add(root);
      const names = [];
      const mkName = (fn) => {
        for (let tries = 0; tries < 30; tries++) {
          const n = capital(fn());
          if (!usedNames.has(n) && n.length <= 12) { usedNames.add(n); return n; }
        }
        const n = capital(fn()) + (id % 10);
        usedNames.add(n);
        return n;
      };
      names.push(mkName(() => joinName(root, frng.pick(END1))));
      const mid = frng.pick(MID2);
      names.push(mkName(() => joinName(root, frng.chance(0.85) ? mid : frng.pick(MID2))));
      names.push(mkName(() => joinName(root, frng.pick(END3))));
      const family = { id: FAMILIES.length, el, el2, rarity, body, role, members: [] };
      FAMILIES.push(family);
      const evo = RARITY_MAP[rarity].evo;
      const flavorEl = frng.pick(EL_FLAVOR[el]);
      for (let stage = 1; stage <= 3; stage++) {
        const genome = evolveGenome(baseGenome, stage, new RNG(`evo-${el}-${f}-${stage}`));
        const sp = {
          id,
          name: names[stage - 1],
          family: family.id,
          stage,
          maxStage: 3,
          types: el2 ? [el, el2] : [el],
          rarity,
          role,
          body,
          base: computeBase(role, rarity, stage, body),
          growth: computeGrowth(role, rarity, el, el2),
          xpBase: RARITY_MAP[rarity].xpBase * EL_XP[el],
          xpRate: RARITY_MAP[rarity].xpRate,
          evolveLevel: stage < 3 ? evo[stage - 1] : null,
          evolvesTo: stage < 3 ? id + 1 : null,
          evolvesFrom: stage > 1 ? id - 1 : null,
          learnset,
          genome,
          desc: `${frng.pick(STAGE_FLAVOR[stage])} ${names[stage - 1]} is ${flavorEl}.`,
          height: Math.round((0.35 + 0.3 * genome.scale * genome.scale + frng.range(-0.05, 0.1)) * 100) / 100,
          weight: Math.round((4 + 22 * Math.pow(genome.scale, 3) * frng.range(0.7, 1.4)) * 10) / 10,
        };
        SPECIES.push(sp);
        family.members.push(id);
        id++;
      }
    }
  }
  // Legendaries
  for (const [el, name, el2] of LEGENDARIES) {
    const rng = new RNG('legend-' + name);
    const body = el === 'aquatic' ? 'serpent' : el === 'flying' || el === 'common' ? 'avian' : rng.pick(['quad', 'quad', 'biped', 'serpent']);
    const role = rng.pick(['balanced', 'striker', 'mystic', 'brute']);
    const g = evolveGenome(makeGenome(rng, el, el2, body), 3, rng);
    g.scale = 2.0;
    g.legendary = true;
    if (g.wings.type === 'none' && body !== 'serpent') g.wings.type = rng.pick(['feather', 'bat']);
    if (g.horns.type === 'none') g.horns.type = rng.pick(['curl', 'crystal', 'antler', 'unicorn']);
    g.eyes.style = 'fierce';
    const family = { id: FAMILIES.length, el, el2, rarity: 'legendary', body, role, members: [id] };
    FAMILIES.push(family);
    SPECIES.push({
      id, name, family: family.id, stage: 3, maxStage: 1, types: [el, el2], rarity: 'legendary', role, body,
      base: computeBase(role, 'legendary', 3, body),
      growth: computeGrowth(role, 'legendary', el, el2),
      xpBase: RARITY_MAP.legendary.xpBase * EL_XP[el], xpRate: RARITY_MAP.legendary.xpRate,
      evolveLevel: null, evolvesTo: null, evolvesFrom: null,
      learnset: makeLearnset(rng, el, el2),
      genome: g,
      desc: `A legendary guardian of the ${ELEMENT_NAMES_FOR_DESC[el]} realms. Few Rangers have ever seen ${name} and returned with the same story twice.`,
      height: Math.round(rng.range(2.4, 4.2) * 100) / 100,
      weight: Math.round(rng.range(180, 900) * 10) / 10,
    });
    usedNames.add(name);
    id++;
  }
})();

export function species(id) { return SPECIES[id - 1]; }

export function speciesByEl(el) { return SPECIES.filter((s) => s.types[0] === el || s.types[1] === el); }

export function familyBaseIds() { return FAMILIES.map((f) => f.members[0]); }

// Element-themed egg types used by breeding/incubation
export const EGGS = {
  plain:    { name: 'Plain Egg',    els: ['common', 'primal'],          color: 0xf2dcb0, spot: 0xc89a5a, time: 4 },
  fiery:    { name: 'Fiery Egg',    els: ['flame', 'lightning'],        color: 0xff8a3a, spot: 0xffd23c, time: 6 },
  mossy:    { name: 'Mossy Egg',    els: ['flora', 'aquatic'],          color: 0x7ad86a, spot: 0x2aa8c8, time: 6 },
  frosted:  { name: 'Frosted Egg',  els: ['snow', 'flying'],            color: 0xd8f4ff, spot: 0x86c8ff, time: 6 },
  rocky:    { name: 'Rocky Egg',    els: ['terra', 'tech'],             color: 0xc8a070, spot: 0x8a98a8, time: 7 },
  murky:    { name: 'Murky Egg',    els: ['venom', 'phantom'],          color: 0x8a5ac8, spot: 0x4a3a8a, time: 8 },
  prismatic:{ name: 'Prismatic Egg',els: ['flux', 'phantom', 'lightning'], color: 0xff7ac8, spot: 0x7ae0ff, time: 10 },
};

export function eggTypeFor(elA, elB) {
  // Pick the egg whose element pool covers the most of the two parents' primary types
  let best = 'plain', score = -1;
  for (const [k, e] of Object.entries(EGGS)) {
    const s = (e.els.includes(elA) ? 1 : 0) + (e.els.includes(elB) ? 1 : 0);
    if (s > score) { score = s; best = k; }
  }
  return best;
}
