// Biomes (visual palettes) and the 22 planets across 5 sectors.

// grass: [base, light, dark, speck]; cliff: [band A, band B, band C, deep]; rock: [light, dark]
// sky: [zenith, upper, horizon, below]; trees: style ids used by render/props.js
export const BIOMES = {
  home:     { grass: [0x5fc83a, 0x8fe04a, 0x3a9a2e, 0xffe46a], cliff: [0xc9875a, 0xa86a44, 0xe0a070, 0x6a4030], rock: [0xb8a898, 0x6a5a50], sky: [0x3a5ad8, 0x6aa0ff, 0xbfe4ff, 0xe6d8ff], fog: 0xbfdcff, sun: 0xfff2d8, trees: ['puff', 'pine', 'bush'], ground: 'grass' },
  meadow:   { grass: [0x6ad03e, 0x9ae852, 0x3f9e30, 0xff8ab8], cliff: [0xc98a5c, 0xa66c48, 0xe2a874, 0x6a4232], rock: [0xbaa898, 0x6a5a50], sky: [0x3f64e0, 0x78acff, 0xc8e8ff, 0xf0e0ff], fog: 0xc4e0ff, sun: 0xfff4dc, trees: ['puff', 'bush', 'flowers'], ground: 'grass' },
  canyon:   { grass: [0xd8984a, 0xf0b864, 0xb0703a, 0x7ac84a], cliff: [0xd06a3a, 0xb8502e, 0xf09a5a, 0x6a2a1a], rock: [0xd8905a, 0x7a3a24], sky: [0x5a4ad8, 0xff9a7a, 0xffd8a8, 0xffe8d0], fog: 0xffd0a8, sun: 0xffe0b8, trees: ['cactus', 'deadtree', 'rock'], ground: 'sand' },
  lagoon:   { grass: [0x3ad0a0, 0x6af0c0, 0x22a080, 0xfff0b0], cliff: [0xf0dcb0, 0xd8bc8a, 0xfff0d0, 0x8a7050], rock: [0xf0e4d0, 0x9a8a70], sky: [0x1a8ae0, 0x4ac8ff, 0xb0f0ff, 0xd8fff8], fog: 0xb8f0ff, sun: 0xfffbe8, trees: ['palm', 'bush', 'coral'], ground: 'grass' },
  mesa:     { grass: [0xd8c04a, 0xf0dc6a, 0xa8902a, 0xff8a3a], cliff: [0xd89a4a, 0xc07a3a, 0xf0c070, 0x7a4a20], rock: [0xe0b070, 0x8a5a2a], sky: [0x3a6ae0, 0x7ab0ff, 0xffe8a8, 0xfff0d0], fog: 0xfff0c8, sun: 0xfff0c0, trees: ['cactus', 'rock', 'deadtree'], ground: 'grass' },
  volcanic: { grass: [0x5a4a4a, 0x7a6460, 0x3a2e30, 0xff6a2a], cliff: [0x4a3a3a, 0x2e2428, 0x6a4a40, 0x1a1214], rock: [0x5a4848, 0x241a1c], sky: [0x2a1030, 0x8a2a3a, 0xff8a4a, 0xffb07a], fog: 0x8a4a4a, sun: 0xffc090, trees: ['deadtree', 'rock', 'lava'], ground: 'ash' },
  tundra:   { grass: [0xeef8ff, 0xffffff, 0xc0d8f0, 0x9ad0ff], cliff: [0x8aa8c8, 0x6a88a8, 0xb0c8e0, 0x3a5070], rock: [0xc8d8e8, 0x5a6a80], sky: [0x3a5ab8, 0x8ab8ff, 0xe0f0ff, 0xf4faff], fog: 0xe0f0ff, sun: 0xf0f8ff, trees: ['snowpine', 'icecrystal', 'rock'], ground: 'snow' },
  fungal:   { grass: [0x8a5ac8, 0xb07ae8, 0x5a3a9a, 0x6af0c0], cliff: [0x3a6a7a, 0x2a4a5a, 0x5a8a9a, 0x142a34], rock: [0x6a7a8a, 0x2a3440], sky: [0x1a1a4a, 0x4a3a9a, 0xb08ae0, 0xe0c8ff], fog: 0x9a7ad0, sun: 0xe8d8ff, trees: ['mushroom', 'mushroom', 'spore'], ground: 'moss' },
  sky:      { grass: [0xa8e8a0, 0xd0f8c0, 0x7ac078, 0xffffff], cliff: [0xe8e8f4, 0xd0d4e8, 0xffffff, 0x8a90b0], rock: [0xf0f0f8, 0x9a9ab8], sky: [0x4a8aff, 0x8ac8ff, 0xffffff, 0xffffff], fog: 0xf0f8ff, sun: 0xffffff, trees: ['puff', 'cloudtree', 'flowers'], ground: 'grass' },
  crystal:  { grass: [0x4ac8b8, 0x7ae8d8, 0x2a9a8a, 0xd8a8ff], cliff: [0xb8a0e0, 0x9a80c8, 0xd8c8f8, 0x4a3a7a], rock: [0xc8b8f0, 0x5a4a8a], sky: [0x2a3a9a, 0x6a7aff, 0xd0d8ff, 0xf0e8ff], fog: 0xd0d0ff, sun: 0xf4f0ff, trees: ['crystal', 'crystal', 'bush'], ground: 'grass' },
  ruins:    { grass: [0x7ac84a, 0xa8e070, 0x4a9a3a, 0xffe08a], cliff: [0xe0c890, 0xc8aa70, 0xf8e4b0, 0x7a6438], rock: [0xe8d8b0, 0x8a7a58], sky: [0x3a5ad8, 0x7aa8ff, 0xffe8c0, 0xfff0e0], fog: 0xf0e0c8, sun: 0xfff0d0, trees: ['puff', 'pillar', 'bush'], ground: 'tiles' },
  swamp:    { grass: [0x6a8a3a, 0x8aa84a, 0x4a6a2a, 0xb05ae6], cliff: [0x5a5040, 0x403828, 0x7a6a50, 0x201810], rock: [0x7a7060, 0x30281e], sky: [0x2a3a3a, 0x5a7a6a, 0xb0c8a0, 0xd8e0c0], fog: 0x9ab09a, sun: 0xe8f0d0, trees: ['deadtree', 'mushroom', 'reeds'], ground: 'moss' },
  storm:    { grass: [0x5a8aa8, 0x7aa8c8, 0x3a6a88, 0xffe04a], cliff: [0x5a6070, 0x40465a, 0x7a8090, 0x1a1e2a], rock: [0x7a8090, 0x2a3040], sky: [0x1a2040, 0x3a4a7a, 0x8a9ac0, 0xb0b8d8], fog: 0x8a98b8, sun: 0xd8e0ff, trees: ['spire', 'rock', 'coil'], ground: 'grass' },
  forge:    { grass: [0x8a8a90, 0xa8a8b0, 0x5a5a64, 0xff8a3a], cliff: [0x8a5a3a, 0x6a4028, 0xa8704a, 0x2a1a10], rock: [0x8a7a70, 0x3a2e28], sky: [0x2a2030, 0x6a4a50, 0xd89a7a, 0xf0c0a0], fog: 0xb08a80, sun: 0xffd8b0, trees: ['pipe', 'tank', 'rock'], ground: 'metal' },
  toxic:    { grass: [0x9ae03a, 0xc0f05a, 0x6aa02a, 0xd05ad8], cliff: [0x6a3a8a, 0x4a2a6a, 0x8a5aa8, 0x1e1030], rock: [0x7a5a9a, 0x2a1a3a], sky: [0x1a2a1a, 0x4a6a2a, 0xc0e07a, 0xe0f0b0], fog: 0xb0d08a, sun: 0xf0ffd0, trees: ['mushroom', 'deadtree', 'barrel'], ground: 'moss' },
  jungle:   { grass: [0x2ab04a, 0x4ad06a, 0x1a7a3a, 0xff5a7a], cliff: [0xa8503a, 0x8a3a28, 0xc87050, 0x3a1810], rock: [0xa87a60, 0x4a2a20], sky: [0x2a6ac8, 0x5aa8f0, 0xc8f0d8, 0xe8fff0], fog: 0xb8e8c8, sun: 0xfff8d8, trees: ['jungle', 'palm', 'bush'], ground: 'grass' },
  aurora:   { grass: [0x8ae0d8, 0xb8f8f0, 0x5ab0b0, 0xffffff], cliff: [0x5a7ab8, 0x3a5a98, 0x7a9ad8, 0x1a2a58], rock: [0xa8c8e8, 0x3a4a78], sky: [0x0a1a40, 0x2a6a8a, 0x8af0c8, 0xd8f8ff], fog: 0xa8d8e8, sun: 0xe8fff8, trees: ['snowpine', 'icecrystal', 'snowpine'], ground: 'snow' },
  prism:    { grass: [0xff8ad0, 0xffb8e8, 0xd05aa8, 0x7af0ff], cliff: [0xf0f0ff, 0xd8d8f0, 0xffffff, 0x8a8ab0], rock: [0xf8f0ff, 0x9a90c0], sky: [0x6a3ad8, 0xb07aff, 0xffd0f0, 0xfff0fa], fog: 0xf0d0ff, sun: 0xfff0ff, trees: ['crystal', 'prismtree', 'crystal'], ground: 'grass' },
  starfall: { grass: [0x4a4ab8, 0x6a6ad8, 0x2a2a8a, 0xffe08a], cliff: [0x3a3060, 0x2a2048, 0x5a4a88, 0x100a20], rock: [0x5a5080, 0x1a1430], sky: [0x05051a, 0x1a1a5a, 0x5a4a9a, 0x8a7ac0], fog: 0x4a4a8a, sun: 0xd8d8ff, trees: ['starpine', 'crystal', 'puff'], ground: 'grass' },
  reef:     { grass: [0xff8a8a, 0xffb0a0, 0xd8605a, 0x4ad0ff], cliff: [0x3a8ac8, 0x2a6aa8, 0x5aa8e0, 0x0a2a58], rock: [0x7ab8e0, 0x2a4a78], sky: [0x0a4a8a, 0x2a9ad8, 0x9ae8ff, 0xd0f8ff], fog: 0x9ad8f0, sun: 0xe8fcff, trees: ['coral', 'coral', 'palm'], ground: 'sand' },
  obsidian: { grass: [0x2a2430, 0x443a4a, 0x16121a, 0xff4a2a], cliff: [0x8a2a2a, 0x6a1a1e, 0xa83a30, 0x2a0a0c], rock: [0x3a3040, 0x100c14], sky: [0x100510, 0x4a1020, 0xc04a3a, 0xff8a5a], fog: 0x6a2a2a, sun: 0xffb8a0, trees: ['obsidian', 'deadtree', 'lava'], ground: 'ash' },
  core:     { grass: [0xd8b860, 0xf0d888, 0xa88a3a, 0x7af0ff], cliff: [0x4a4a5a, 0x34343e, 0x6a6a7a, 0x14141a], rock: [0x6a6a7a, 0x22222a], sky: [0x0a0a20, 0x2a2a6a, 0x8a7ac0, 0xd0b8ff], fog: 0x5a5a8a, sun: 0xfff0d0, trees: ['pillar', 'crystal', 'obelisk'], ground: 'tiles' },
};

export const SECTORS = [
  { id: 1, name: 'Cradle Drift', color: 0x5fc83a, warp: 1 },
  { id: 2, name: 'Frostline Belt', color: 0x9fe4ff, warp: 2 },
  { id: 3, name: "Ancients' Reach", color: 0xe0c070, warp: 3 },
  { id: 4, name: 'Grimeworks Expanse', color: 0x9ae03a, warp: 4 },
  { id: 5, name: 'The Rift', color: 0xff5fb8, warp: 5 },
];

// lv: [min, max] wild level range. els: native types with weights.
// boss: Grimeworks officer guarding the last island. sectorBoss marks sector finales.
export const PLANETS = [
  { id: 'mossbloom', name: 'Mossbloom', sector: 1, biome: 'meadow', lv: [2, 5], els: { common: 4, flora: 3, flying: 2, primal: 1 }, mats: ['fiber', 'sap', 'wood'], boss: { name: 'Crew Chief Dorr', lvl: 7 }, ring: false, planetColor: 0x6ad03e,
    blurb: 'Gentle meadow islands drifting in warm air. A perfect first expedition.' },
  { id: 'pebblerun', name: 'Pebblerun', sector: 1, biome: 'canyon', lv: [4, 10], els: { terra: 4, primal: 2, common: 2, flame: 1 }, mats: ['pebble', 'fiber', 'wood'], boss: { name: 'Digger Molt', lvl: 11 }, ring: true, planetColor: 0xd8984a,
    blurb: 'Red canyon chunks connected by rickety bridges. Rock-loving beasts burrow everywhere.' },
  { id: 'tidewhisk', name: 'Tidewhisk', sector: 1, biome: 'lagoon', lv: [8, 14], els: { aquatic: 4, flora: 2, flying: 2, common: 1 }, mats: ['scale', 'sap', 'wood'], boss: { name: 'Pumpmaster Vell', lvl: 15 }, ring: false, planetColor: 0x3ad0c8,
    blurb: 'Lagoon atolls hovering over a sea of clouds. Grimeworks pumps are draining the pools.' },
  { id: 'sparkhollow', name: 'Sparkhollow', sector: 1, biome: 'mesa', lv: [11, 17], els: { lightning: 4, terra: 2, flying: 1, tech: 1 }, mats: ['crystal', 'pebble', 'fiber'], boss: { name: 'Coilwright Zazz', lvl: 18 }, ring: true, planetColor: 0xe8c84a,
    blurb: 'Dry golden mesas that crackle during every storm.' },
  { id: 'emberlee', name: 'Emberlee', sector: 1, biome: 'volcanic', lv: [14, 20], els: { flame: 4, terra: 2, primal: 2 }, mats: ['ember', 'pebble', 'crystal'], boss: { name: 'Foreman Grubb', lvl: 22, sector: true }, ring: false, planetColor: 0xd8503a,
    blurb: 'Volcanic islands where Foreman Grubb runs the first Grimeworks refinery.' },

  { id: 'glacia', name: 'Glacia Minor', sector: 2, biome: 'tundra', lv: [19, 25], els: { snow: 4, aquatic: 2, flying: 2 }, mats: ['frost', 'crystal', 'pebble'], boss: { name: 'Frostbite Kell', lvl: 26 }, ring: true, planetColor: 0xd8f0ff,
    blurb: 'Snow-capped islands drifting through a crystal-clear frozen sky.' },
  { id: 'fungalfen', name: 'Fungal Fen', sector: 2, biome: 'fungal', lv: [22, 28], els: { venom: 3, flora: 3, phantom: 1, common: 1 }, mats: ['spore', 'sap', 'fiber'], boss: { name: 'Sporelord Mugg', lvl: 29 }, ring: false, planetColor: 0x9a6ad8,
    blurb: 'Giant mushrooms tower over violet moss. Mind the spores.' },
  { id: 'windspire', name: 'Windspire', sector: 2, biome: 'sky', lv: [25, 31], els: { flying: 4, lightning: 2, common: 1, snow: 1 }, mats: ['fluff', 'crystal', 'wood'], boss: { name: 'Skyhook Bram', lvl: 32 }, ring: true, planetColor: 0xb8e0ff,
    blurb: 'Pale islands so high the clouds are below your boots.' },
  { id: 'crystalshoals', name: 'Crystal Shoals', sector: 2, biome: 'crystal', lv: [28, 34], els: { aquatic: 2, terra: 2, flux: 1, snow: 2 }, mats: ['crystal', 'scale', 'pebble'], boss: { name: 'Sprocket', lvl: 36, sector: true }, ring: false, planetColor: 0x6ae0d0,
    blurb: 'Glittering shoals of crystal. Sprocket of the Rustbucket Trio is strip-mining them.' },

  { id: 'ruinspan', name: 'Ruinspan', sector: 3, biome: 'ruins', lv: [33, 39], els: { common: 2, phantom: 2, terra: 2, tech: 1 }, mats: ['relic', 'pebble', 'wood'], boss: { name: 'Curator Slake', lvl: 40 }, ring: true, planetColor: 0xe0c890,
    blurb: 'Bridges and arches built by the Ancients. Their riddles are carved everywhere.' },
  { id: 'duskmire', name: 'Duskmire', sector: 3, biome: 'swamp', lv: [36, 42], els: { phantom: 3, venom: 3, aquatic: 1 }, mats: ['spore', 'relic', 'sap'], boss: { name: 'Mirewitch Ogg', lvl: 43 }, ring: false, planetColor: 0x6a7a4a,
    blurb: 'A murky marsh where shadows move on their own.' },
  { id: 'thunderhead', name: 'Thunderhead', sector: 3, biome: 'storm', lv: [39, 45], els: { lightning: 4, flying: 2, tech: 1 }, mats: ['crystal', 'gear', 'fiber'], boss: { name: 'Voltwarden Rusk', lvl: 46 }, ring: true, planetColor: 0x5a8ab0,
    blurb: 'Islands trapped in a permanent storm front.' },
  { id: 'cinderforge', name: 'Cinderforge', sector: 3, biome: 'forge', lv: [42, 48], els: { flame: 3, tech: 3, terra: 1 }, mats: ['gear', 'ember', 'canister'], boss: { name: 'Gristle', lvl: 50, sector: true }, ring: false, planetColor: 0xb0705a,
    blurb: 'A Grimeworks factory world. Gristle of the Rustbucket Trio oversees the smelters.' },

  { id: 'ironmoor', name: 'Ironmoor', sector: 4, biome: 'forge', lv: [48, 54], els: { tech: 4, terra: 2, lightning: 1 }, mats: ['gear', 'canister', 'pebble'], boss: { name: 'Overseer Clank', lvl: 55 }, ring: true, planetColor: 0x8a8a98,
    blurb: 'Abandoned rigs and rusted pipelines. Beasts have made nests in the machinery.' },
  { id: 'toxictarn', name: 'Toxic Tarn', sector: 4, biome: 'toxic', lv: [52, 58], els: { venom: 4, aquatic: 1, phantom: 1, tech: 1 }, mats: ['canister', 'spore', 'scale'], boss: { name: 'Sludgemaster Pox', lvl: 59 }, ring: false, planetColor: 0x9ae03a,
    blurb: 'Grimeworks dumps its sludge here. The beasts need your help.' },
  { id: 'wildheart', name: 'Wildheart', sector: 4, biome: 'jungle', lv: [56, 62], els: { primal: 4, flora: 2, flying: 1, common: 1 }, mats: ['wood', 'fluff', 'sap'], boss: { name: 'Huntmaster Kroll', lvl: 63 }, ring: true, planetColor: 0x2ab04a,
    blurb: 'Dense jungle islands ruled by enormous primal beasts.' },
  { id: 'auroral', name: 'Auroral Steppe', sector: 4, biome: 'aurora', lv: [60, 66], els: { snow: 3, flying: 2, flux: 1, phantom: 1 }, mats: ['frost', 'crystal', 'stardust'], boss: { name: 'Madame Murk', lvl: 68, sector: true }, ring: false, planetColor: 0x8ae0d8,
    blurb: 'Frozen steppes under shimmering skies. Madame Murk hunts the rare beasts here.' },

  { id: 'prismrift', name: 'Prism Rift', sector: 5, biome: 'prism', lv: [66, 72], els: { flux: 4, phantom: 1, lightning: 1, flora: 1 }, mats: ['stardust', 'crystal', 'relic'], boss: { name: 'Riftbreaker Nox', lvl: 73 }, ring: true, planetColor: 0xff8ad0,
    blurb: 'Space is thin here. Islands flicker between colors.' },
  { id: 'starfall', name: 'Starfall Grove', sector: 5, biome: 'starfall', lv: [71, 77], els: { flora: 2, flux: 2, phantom: 2, common: 1 }, mats: ['stardust', 'sap', 'wood'], boss: { name: 'Gravekeeper Sol', lvl: 78 }, ring: false, planetColor: 0x5a5ad8,
    blurb: 'An eternal night grove lit only by the stars above.' },
  { id: 'abyssalreef', name: 'Abyssal Reef', sector: 5, biome: 'reef', lv: [76, 82], els: { aquatic: 4, phantom: 1, venom: 1, flux: 1 }, mats: ['scale', 'stardust', 'crystal'], boss: { name: 'Admiral Drench', lvl: 83 }, ring: true, planetColor: 0x3a8ac8,
    blurb: 'Coral islands floating above an endless blue abyss.' },
  { id: 'obsidiancrown', name: 'Obsidian Crown', sector: 5, biome: 'obsidian', lv: [81, 88], els: { flame: 3, primal: 2, terra: 1, phantom: 1 }, mats: ['ember', 'relic', 'stardust'], boss: { name: 'Warlord Ashka', lvl: 89 }, ring: false, planetColor: 0x8a2a3a,
    blurb: 'Black glass spires around a burning core.' },
  { id: 'ancientcore', name: 'Ancient Core', sector: 5, biome: 'core', lv: [87, 96], els: { flux: 2, tech: 2, phantom: 1, common: 1, flame: 1, aquatic: 1, flora: 1 }, mats: ['relic', 'stardust', 'gear'], boss: { name: 'Baron Vex Grimeworth', lvl: 100, sector: true, final: true }, ring: true, planetColor: 0xd8b860,
    blurb: 'The heart of the Drift, where the Ancients sealed their greatest secret.' },
];

export const PLANET_MAP = Object.fromEntries(PLANETS.map((p, i) => [p.id, { ...p, index: i }]));
PLANETS.forEach((p, i) => { p.index = i; });

export function planetsInSector(s) { return PLANETS.filter((p) => p.sector === s); }

// Positions on the star map (x, y in 0..100 space, sectors laid out left to right)
export function starmapPos(p) {
  const inSector = planetsInSector(p.sector);
  const k = inSector.indexOf(p);
  const sx = 10 + (p.sector - 1) * 20;
  const ang = (k / inSector.length) * Math.PI * 2 + p.sector;
  return { x: sx + Math.cos(ang) * 6, y: 50 + Math.sin(ang) * 22 + (k % 2 ? 6 : -6) };
}
