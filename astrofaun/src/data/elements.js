// The thirteen beast types and the attack chart between them.
// Attack chart follows the classic layout: Strong, Weak or No Effect per attacking type.

export const ELEMENTS = [
  { id: 'common',    name: 'Common',    color: 0xf2d29b, dark: 0x9c7b4a, light: 0xfff1d6 },
  { id: 'flame',     name: 'Flame',     color: 0xff6a2c, dark: 0xb3311a, light: 0xffc06a },
  { id: 'aquatic',   name: 'Aquatic',   color: 0x2ea7ff, dark: 0x1559b8, light: 0x9fe0ff },
  { id: 'snow',      name: 'Snow',      color: 0x9fe4ff, dark: 0x4f97c9, light: 0xf2fbff },
  { id: 'terra',     name: 'Terra',     color: 0xc78a45, dark: 0x7a4d22, light: 0xf0c890 },
  { id: 'flora',     name: 'Flora',     color: 0x5cd65a, dark: 0x2a8a3a, light: 0xb9f59a },
  { id: 'venom',     name: 'Venom',     color: 0xb05ae6, dark: 0x6a2a9a, light: 0xe2b0ff },
  { id: 'primal',    name: 'Primal',    color: 0xe0503a, dark: 0x8e2a1f, light: 0xffa98f },
  { id: 'phantom',   name: 'Phantom',   color: 0x6e5ee0, dark: 0x382d8f, light: 0xbcb2ff },
  { id: 'lightning', name: 'Lightning', color: 0xffd23c, dark: 0xc08a00, light: 0xfff0a0 },
  { id: 'flying',    name: 'Flying',    color: 0x86c8ff, dark: 0x3f7fc0, light: 0xdff0ff },
  { id: 'tech',      name: 'Tech',      color: 0x98a8bc, dark: 0x4f5d70, light: 0xdde6f0 },
  { id: 'flux',      name: 'Flux',      color: 0xff5fb8, dark: 0xb02478, light: 0xffc0e4 },
];

export const ELEMENT_MAP = Object.fromEntries(ELEMENTS.map((e) => [e.id, e]));
export const ELEMENT_IDS = ELEMENTS.map((e) => e.id);

// attacker -> { strong: [defenders], weak: [...], none: [...] }
const CHART = {
  common:    { strong: [], weak: ['terra', 'tech'], none: ['phantom'] },
  flame:     { strong: ['snow', 'flora', 'tech'], weak: ['flame', 'aquatic', 'phantom', 'terra'], none: [] },
  aquatic:   { strong: ['flame', 'terra'], weak: ['aquatic', 'snow'], none: ['flora'] },
  snow:      { strong: ['flora', 'lightning', 'flying'], weak: ['flame', 'snow', 'tech'], none: [] },
  terra:     { strong: ['flame', 'snow', 'primal', 'lightning', 'tech'], weak: ['phantom', 'flora'], none: ['flying'] },
  flora:     { strong: ['aquatic', 'terra', 'lightning'], weak: ['flame', 'venom', 'flying', 'flora'], none: [] },
  venom:     { strong: ['flora', 'primal', 'flying'], weak: ['terra', 'venom', 'tech'], none: [] },
  primal:    { strong: ['terra', 'common', 'tech'], weak: ['venom', 'flying'], none: ['phantom'] },
  phantom:   { strong: ['phantom', 'flying', 'flux'], weak: ['snow', 'tech'], none: ['primal', 'common'] },
  lightning: { strong: ['aquatic', 'venom', 'flying', 'tech'], weak: ['flora', 'phantom', 'lightning'], none: ['terra'] },
  flying:    { strong: ['flora', 'primal', 'venom'], weak: ['lightning', 'snow', 'tech'], none: [] },
  tech:      { strong: ['snow', 'venom', 'phantom', 'flux'], weak: ['flame', 'lightning', 'tech'], none: [] },
  flux:      { strong: ['venom', 'phantom', 'tech'], weak: ['primal', 'flux'], none: [] },
};

export const STRONG = 1.6;
export const WEAK = 0.6;
export const STAB = 1.25;

export function typeMultiplier(attackEl, defenderTypes) {
  const c = CHART[attackEl];
  if (!c) return 1;
  let m = 1;
  for (const t of defenderTypes) {
    if (!t) continue;
    if (c.none.includes(t)) return 0;
    if (c.strong.includes(t)) m *= STRONG;
    else if (c.weak.includes(t)) m *= WEAK;
  }
  return m;
}

export function effectivenessLabel(mult) {
  if (mult === 0) return { id: 'none', text: 'No effect' };
  if (mult > 1.01) return { id: 'strong', text: mult > 2 ? 'Super strong' : 'Strong' };
  if (mult < 0.99) return { id: 'weak', text: mult < 0.5 ? 'Very weak' : 'Weak' };
  return { id: 'normal', text: 'Normal' };
}

export function chartFor(attackEl) { return CHART[attackEl]; }

// Defensive view: what hits this type hard
export function weaknessesOf(types) {
  const out = [];
  for (const atk of ELEMENT_IDS) {
    const m = typeMultiplier(atk, types);
    if (m > 1.01) out.push(atk);
  }
  return out;
}

export function resistancesOf(types) {
  const out = [];
  for (const atk of ELEMENT_IDS) {
    const m = typeMultiplier(atk, types);
    if (m < 0.99) out.push(atk);
  }
  return out;
}
