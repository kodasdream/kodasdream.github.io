// Biomes (visual palettes) and the 22 planets across 5 sectors.

// Palettes distilled from the original game's planets: peach sandy rock with bright painted grass
// patches, reddish rock-column cliffs, and deep-space backdrops (teal, indigo, ember) with planets.
// grass: [base, light, dark, flower]; dirt: [light, mid, dark, ink]; cliff: [A, B, ledge, ink]; rock: [A, B]
// space: backdrop painting; sky: env-map tones used for glossy reflections
const sp = (top, mid, bot, neb1, neb2, planets) => ({ top, mid, bot, neb1, neb2, planets });
export const BIOMES = {
  home:     { grass: [0x4cb43a, 0x8ad44a, 0x26762a, 0xff8ab8], dirt: [0xf0cfa0, 0xdcae7c, 0xb98458, 0x6a3a28], cliff: [0xb0664a, 0x93503c, 0xd08a62, 0x3a1a18], rock: [0x7a4a3e, 0x4e2e2a], grassAmt: 0.62, rootColor: 0x3a2a1e,
    space: sp(0x0b1e33, 0x14405a, 0x0a1628, 0x2a8a96, 0x4a5ab8, [{ x: 0.86, y: 0.22, r: 0.16, ring: true, a: 0xc8503a, b: 0x7a2a28 }]), sky: [0x2a6a8a, 0x5ab0c8, 0xb8f0f0, 0x3a5a7a], sun: 0xfff2dc, trees: ['puff', 'fern', 'bush'], ground: 'grass' },
  meadow:   { grass: [0x50b83c, 0x92d84c, 0x287a2c, 0xffd04a], dirt: [0xf2d2a2, 0xdeb07e, 0xbb865a, 0x6a3a28], cliff: [0xb46a4c, 0x965240, 0xd48e66, 0x3a1a18], rock: [0x7c4c40, 0x502e2a], grassAmt: 0.52, rootColor: 0x3a2a1e,
    space: sp(0x0c2034, 0x16485e, 0x0a1828, 0x2c9098, 0x5a4ab0, [{ x: 0.12, y: 0.78, r: 0.13, ring: false, a: 0x8a5ad8, b: 0x4a2a8a }]), sky: [0x2a6a8a, 0x5ab0c8, 0xb8f0f0, 0x3a5a7a], sun: 0xfff2dc, trees: ['puff', 'cactus', 'fern', 'bush'], ground: 'grass' },
  canyon:   { grass: [0x8ac83a, 0xb8e04a, 0x4a8a2a, 0xffe06a], dirt: [0xf0b880, 0xd8945e, 0xb06a40, 0x5a2a1a], cliff: [0xc8603a, 0xa84a30, 0xe8905a, 0x3a1410], rock: [0x8a3e2c, 0x5a2418], grassAmt: 0.28, rootColor: 0x4a2a1a,
    space: sp(0x1a1030, 0x4a2a5a, 0x10102a, 0xc85a6a, 0x5a3a9a, [{ x: 0.85, y: 0.75, r: 0.18, ring: true, a: 0xe8a050, b: 0x9a5a2a }]), sky: [0x6a3a7a, 0xc87a7a, 0xffd0a0, 0x5a3a5a], sun: 0xffe2c0, trees: ['cactus', 'deadtree', 'spire'], ground: 'sand' },
  lagoon:   { grass: [0x3ad09a, 0x7af0b8, 0x1a9078, 0xfff0a0], dirt: [0xfff0c8, 0xf0d8a0, 0xd8b478, 0x7a5a30], cliff: [0xe8c890, 0xd0aa70, 0xfff0c0, 0x5a4020], rock: [0xa88a60, 0x6a5038], grassAmt: 0.45, rootColor: 0x3a5a2a,
    space: sp(0x082640, 0x0e5a80, 0x061830, 0x2ac8d0, 0x2a7ad8, [{ x: 0.15, y: 0.25, r: 0.14, ring: true, a: 0x3ac8a0, b: 0x1a6a8a }]), sky: [0x1a7aa8, 0x4ac8e8, 0xc8fff8, 0x2a6a8a], sun: 0xfffbe8, trees: ['palm', 'coral', 'bush'], ground: 'sand' },
  mesa:     { grass: [0xb8c83a, 0xd8e05a, 0x7a8a2a, 0xff7a3a], dirt: [0xf8d890, 0xe8b868, 0xc89048, 0x6a4018], cliff: [0xd8904a, 0xb8703a, 0xf0b060, 0x4a2410], rock: [0x9a5a30, 0x603818], grassAmt: 0.3, rootColor: 0x4a3018,
    space: sp(0x101a3a, 0x2a3a7a, 0x0a1028, 0xd8a83a, 0x4a6ad8, [{ x: 0.82, y: 0.3, r: 0.12, ring: false, a: 0xffd23c, b: 0xc8802a }]), sky: [0x3a4a8a, 0x7a8ad8, 0xffe8a8, 0x3a3a6a], sun: 0xfff0c0, trees: ['cactus', 'spire', 'deadtree'], ground: 'sand' },
  volcanic: { grass: [0x5a5050, 0x7a6a66, 0x302628, 0xff6a2a], dirt: [0x5a5254, 0x463e42, 0x2e282c, 0x1a1214], cliff: [0x4a4044, 0x36303a, 0x5e5256, 0x120c10], rock: [0x3a3236, 0x1e181c], grassAmt: 0.0, rootColor: 0x1a1214,
    space: sp(0x2a0a0a, 0xa8321a, 0xff7a2a, 0x3a1210, 0xff9a3a, [{ x: 0.82, y: 0.78, r: 0.15, ring: false, a: 0x8a2a1a, b: 0x3a0a0a }]), sky: [0x5a1a1a, 0xc84a2a, 0xffa860, 0x3a1010], sun: 0xffc090, trees: ['deadtree', 'lava', 'spire'], ground: 'ash' },
  tundra:   { grass: [0xf4faff, 0xffffff, 0xc8dcf0, 0x9ad0ff], dirt: [0x5a6070, 0x464c5a, 0x30343e, 0x14161c], cliff: [0x4a5468, 0x3a4256, 0x6a7488, 0x101420], rock: [0x3a4256, 0x1e2230], grassAmt: 0.5, rootColor: 0x2a3040,
    space: sp(0x060c22, 0x142a5a, 0x0a1430, 0x3a7ad8, 0x6a4ab0, [{ x: 0.86, y: 0.7, r: 0.16, ring: true, a: 0xa8c8e8, b: 0x4a6aa8 }]), sky: [0x2a3a6a, 0x6a8ad8, 0xe0f0ff, 0x2a3a5a], sun: 0xf0f8ff, trees: ['snowpine', 'icecrystal', 'spire'], ground: 'snow' },
  fungal:   { grass: [0x8a5ad0, 0xb88af0, 0x5a3a9a, 0x6af0c0], dirt: [0x6a8a8a, 0x527070, 0x3a5458, 0x162428], cliff: [0x3a6a7a, 0x2a5262, 0x5a8a98, 0x0e1e26], rock: [0x2a4a56, 0x162a34], grassAmt: 0.55, rootColor: 0x2a1a3a,
    space: sp(0x0e0a2a, 0x2a1a5a, 0x080820, 0x7a3ac8, 0x2a8a9a, [{ x: 0.12, y: 0.72, r: 0.15, ring: true, a: 0x6af0c0, b: 0x2a6a8a }]), sky: [0x3a2a7a, 0x8a5ad8, 0xd8c8ff, 0x2a1a4a], sun: 0xe8d8ff, trees: ['mushroom', 'mushroom', 'fern'], ground: 'moss' },
  sky:      { grass: [0x9ae08a, 0xc8f8b0, 0x5aa85a, 0xffffff], dirt: [0xf8f0e8, 0xe8dcd0, 0xc8b8a8, 0x6a5a5a], cliff: [0xd8d4e8, 0xb8b4d0, 0xf0f0ff, 0x3a3a5a], rock: [0x9a98b8, 0x6a6888], grassAmt: 0.6, rootColor: 0x5a5a6a,
    space: sp(0x1a3a7a, 0x4a8ad8, 0xb8e0ff, 0xffffff, 0x8ab8ff, [{ x: 0.84, y: 0.8, r: 0.1, ring: false, a: 0xffe8a8, b: 0xffb86a }]), sky: [0x4a8ad8, 0x8ac8ff, 0xffffff, 0x8aa8d8], sun: 0xffffff, trees: ['puff', 'cloudtree', 'fern'], ground: 'grass' },
  crystal:  { grass: [0x4ac8b8, 0x7ae8d8, 0x2a9088, 0xd8a8ff], dirt: [0xe0d0f0, 0xc8b4e0, 0xa890c8, 0x4a3a6a], cliff: [0x9a80c8, 0x7a62a8, 0xc8b0f0, 0x2a1a4a], rock: [0x5a4a8a, 0x342a5a], grassAmt: 0.42, rootColor: 0x3a2a5a,
    space: sp(0x0a0a2a, 0x2a2a6a, 0x060820, 0x5a7aff, 0xd86ad8, [{ x: 0.16, y: 0.3, r: 0.14, ring: true, a: 0x9a7aff, b: 0x4a3aa8 }]), sky: [0x3a3a9a, 0x7a7aff, 0xe0d8ff, 0x2a2a5a], sun: 0xf4f0ff, trees: ['crystal', 'crystal', 'fern'], ground: 'sand' },
  ruins:    { grass: [0x72c84a, 0xa8e070, 0x3a8a2a, 0xffe08a], dirt: [0xf0dcb0, 0xdcc290, 0xb8a070, 0x5a4a28], cliff: [0xd0b080, 0xb09060, 0xf0d8a8, 0x4a3818], rock: [0x8a7048, 0x5a4828], grassAmt: 0.5, rootColor: 0x3a3018,
    space: sp(0x0e1a34, 0x2a3e6a, 0x0a1428, 0xd8a85a, 0x3a6aa8, [{ x: 0.85, y: 0.25, r: 0.17, ring: true, a: 0xd8b860, b: 0x8a6a2a }]), sky: [0x3a5a8a, 0x7aa8d8, 0xffe8c0, 0x3a4a6a], sun: 0xfff0d0, trees: ['pillar', 'puff', 'fern'], ground: 'tiles' },
  swamp:    { grass: [0x6a8a3a, 0x8aa84a, 0x405a22, 0xb05ae6], dirt: [0x7a6a50, 0x5e5038, 0x443a28, 0x1a140c], cliff: [0x5a4e3a, 0x443a2a, 0x76684e, 0x18120a], rock: [0x3a3226, 0x221c14], grassAmt: 0.6, rootColor: 0x2a2a14,
    space: sp(0x0a140e, 0x1e3a2a, 0x060c0a, 0x4a7a4a, 0x6a4a8a, [{ x: 0.82, y: 0.7, r: 0.14, ring: false, a: 0xb0d07a, b: 0x5a7a3a }]), sky: [0x2a4a3a, 0x5a8a6a, 0xc0d8a0, 0x1a2a1a], sun: 0xe8f0d0, trees: ['deadtree', 'mushroom', 'reeds'], ground: 'moss' },
  storm:    { grass: [0x5a8ab0, 0x7aa8c8, 0x3a6a8a, 0xffe04a], dirt: [0x8a94a8, 0x6e7890, 0x525a70, 0x1a1e2a], cliff: [0x5a6074, 0x444a5e, 0x7a8096, 0x12141e], rock: [0x3a4052, 0x1e2230], grassAmt: 0.45, rootColor: 0x2a2e3a,
    space: sp(0x080a1a, 0x1e2a4a, 0x0a0e1e, 0x4a5a8a, 0xffd23c, [{ x: 0.14, y: 0.78, r: 0.12, ring: true, a: 0x6a7aa8, b: 0x3a4a7a }]), sky: [0x2a3a6a, 0x5a6aa8, 0xb0b8e0, 0x1a2040], sun: 0xd8e0ff, trees: ['spire', 'coil', 'deadtree'], ground: 'grass' },
  forge:    { grass: [0x8a8a92, 0xa8a8b2, 0x5a5a66, 0xff8a3a], dirt: [0x8a8a92, 0xa8a8b2, 0x4a4a56, 0xff8a3a], cliff: [0x8a5a3a, 0x6a4028, 0xa8704a, 0x24140a], rock: [0x5a3a2a, 0x2e1e14], grassAmt: 0.0, rootColor: 0x2a2a2e,
    space: sp(0x1a0e14, 0x5a2a2a, 0x2a1010, 0xd8603a, 0x6a4a5a, [{ x: 0.86, y: 0.22, r: 0.16, ring: false, a: 0xa83a2a, b: 0x5a1a14 }]), sky: [0x4a2a2a, 0x8a5a4a, 0xf0b090, 0x2a1414], sun: 0xffd8b0, trees: ['pipe', 'tank', 'spire'], ground: 'metal' },
  toxic:    { grass: [0x9ae03a, 0xc8f05a, 0x5a9a22, 0xd05ad8], dirt: [0x8a7a9a, 0x6e5e80, 0x524462, 0x1e1428], cliff: [0x6a3a8a, 0x4e2a6a, 0x8a5aa8, 0x1a0c26], rock: [0x3a2a52, 0x1e142e], grassAmt: 0.5, rootColor: 0x3a1a4a,
    space: sp(0x0c1408, 0x2a4a14, 0x060a04, 0x8ad83a, 0x8a3ab0, [{ x: 0.18, y: 0.3, r: 0.15, ring: true, a: 0xc8f05a, b: 0x5a8a22 }]), sky: [0x3a5a1a, 0x7aa83a, 0xd8f0a0, 0x1a2a0a], sun: 0xf0ffd0, trees: ['mushroom', 'deadtree', 'barrel'], ground: 'moss' },
  jungle:   { grass: [0x2ab04a, 0x5ad06a, 0x187a32, 0xff5a7a], dirt: [0xc88a5a, 0xa86a40, 0x84502c, 0x3a1e10], cliff: [0xa8503a, 0x8a3a28, 0xc87050, 0x2e120a], rock: [0x6a2e20, 0x401a12], grassAmt: 0.72, rootColor: 0x2a3a1a,
    space: sp(0x08201a, 0x14503a, 0x061810, 0x3ac87a, 0x2a6ad8, [{ x: 0.84, y: 0.74, r: 0.16, ring: true, a: 0xff7a5a, b: 0x8a2a3a }]), sky: [0x1a5a4a, 0x4ab08a, 0xc8f0d8, 0x1a3a2a], sun: 0xfff8d8, trees: ['jungle', 'palm', 'fern'], ground: 'grass' },
  aurora:   { grass: [0xe8fbff, 0xffffff, 0xb8e0f0, 0x8af0d8], dirt: [0x4a6a98, 0x3a5480, 0x2a3e60, 0x0e1830], cliff: [0x3e5a98, 0x2e4680, 0x5e7ab8, 0x0a1430], rock: [0x2a3e70, 0x161e40], grassAmt: 0.55, rootColor: 0x1e2a4a,
    space: sp(0x040a1e, 0x0e2a4a, 0x08142a, 0x3af0b0, 0x7a5ae0, [{ x: 0.15, y: 0.8, r: 0.13, ring: false, a: 0xd8f8ff, b: 0x6aa8d8 }]), sky: [0x1a3a5a, 0x3a8aa8, 0xa8fff0, 0x1a2a4a], sun: 0xe8fff8, trees: ['snowpine', 'icecrystal', 'spire'], ground: 'snow' },
  prism:    { grass: [0xff8ad0, 0xffb8e8, 0xc858a0, 0x7af0ff], dirt: [0xfff0fa, 0xf0d8f0, 0xd8b8e0, 0x6a4a7a], cliff: [0xe8e0f8, 0xc8c0e8, 0xffffff, 0x4a3a6a], rock: [0x9a88c8, 0x6a5a98], grassAmt: 0.5, rootColor: 0x6a4a8a,
    space: sp(0x1a0a3a, 0x5a2a8a, 0x10082a, 0xff6ab8, 0x4ae0ff, [{ x: 0.85, y: 0.3, r: 0.17, ring: true, a: 0x7af0ff, b: 0xff7ac8 }, { x: 0.12, y: 0.82, r: 0.07, ring: false, a: 0xffe08a, b: 0xff8a5a }]), sky: [0x6a3ad8, 0xb07aff, 0xffd0f0, 0x3a1a6a], sun: 0xfff0ff, trees: ['crystal', 'prismtree', 'fern'], ground: 'sand' },
  starfall: { grass: [0x4a4ab8, 0x6a6ad8, 0x2a2a86, 0xffe08a], dirt: [0x4a4070, 0x3a325a, 0x2a2444, 0x0e0a1e], cliff: [0x3a3060, 0x2a2248, 0x5a4a88, 0x0a061a], rock: [0x262044, 0x14102a], grassAmt: 0.6, rootColor: 0x1a1430,
    space: sp(0x030312, 0x10104a, 0x05051a, 0x4a3ab0, 0xd85ab0, [{ x: 0.82, y: 0.78, r: 0.2, ring: true, a: 0xffe8a8, b: 0xc89a5a }]), sky: [0x1a1a5a, 0x4a4a9a, 0x8a7ac0, 0x0a0a2a], sun: 0xd8d8ff, trees: ['starpine', 'crystal', 'puff'], ground: 'grass' },
  reef:     { grass: [0xff8a8a, 0xffb0a0, 0xd8585a, 0x4ad0ff], dirt: [0xfff0d8, 0xf0d8b8, 0xd8b890, 0x6a5038], cliff: [0x3a8ac8, 0x2a6aa8, 0x5aa8e0, 0x0a2a58], rock: [0x1e5a8a, 0x0e3a62], grassAmt: 0.45, rootColor: 0x1a4a5a,
    space: sp(0x021430, 0x0a3a7a, 0x020a20, 0x2ab8e8, 0xff7aa8, [{ x: 0.16, y: 0.25, r: 0.15, ring: true, a: 0xff9a8a, b: 0xc84a5a }]), sky: [0x0a4a8a, 0x2a9ad8, 0x9ae8ff, 0x0a2a5a], sun: 0xe8fcff, trees: ['coral', 'coral', 'palm'], ground: 'sand' },
  obsidian: { grass: [0x2a2430, 0x443a4a, 0x16121a, 0xff4a2a], dirt: [0x34303a, 0x26222c, 0x18161e, 0x08060a], cliff: [0x7a2a2a, 0x5e1a1e, 0x983a30, 0x1a0608], rock: [0x2a2030, 0x120c16], grassAmt: 0.0, rootColor: 0x1a0a0a,
    space: sp(0x140408, 0x5a1020, 0xc04a2a, 0x2a0a10, 0xff7a3a, [{ x: 0.15, y: 0.78, r: 0.18, ring: false, a: 0x5a1a1a, b: 0x2a0808 }]), sky: [0x3a0a14, 0x8a2a2a, 0xff8a5a, 0x1a0408], sun: 0xffb8a0, trees: ['obsidian', 'deadtree', 'lava'], ground: 'ash' },
  core:     { grass: [0xd8b860, 0xf0d888, 0xa88a3a, 0x7af0ff], dirt: [0x6a6a7a, 0x52525e, 0x3a3a46, 0x14141a], cliff: [0x4a4a5a, 0x34343e, 0x6a6a7a, 0x0e0e14], rock: [0x2a2a36, 0x16161e], grassAmt: 0.3, rootColor: 0x1a1a24,
    space: sp(0x05051a, 0x1a1a5a, 0x0a0a24, 0x8a7ad8, 0xd8b860, [{ x: 0.84, y: 0.74, r: 0.22, ring: true, a: 0xd8b860, b: 0x6a5a2a }, { x: 0.18, y: 0.2, r: 0.08, ring: false, a: 0x7af0ff, b: 0x2a6a8a }]), sky: [0x2a2a6a, 0x5a5a9a, 0xc8b8ff, 0x1a1a3a], sun: 0xfff0d0, trees: ['pillar', 'crystal', 'obelisk'], ground: 'tiles' },
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
