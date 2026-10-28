// Home island buildings. size is [w, d] in tiles. cost/upgrade costs use item ids plus 'lunites'.
import { ELEMENTS } from './elements.js';

export const BUILDINGS = {};

function def(id, d) { BUILDINGS[id] = { id, maxLevel: 1, max: 1, cat: 'facility', ...d }; }

def('command_pod', {
  name: 'Command Pod', size: [3, 3], max: 1, cat: 'core', maxLevel: 5, icon: 'home',
  desc: 'Your home base. Upgrading it raises your energy cap and unlocks more building slots.',
  cost: {}, upgrade: (l) => ({ lunites: 1500 * l * l, wood: 10 * l, bronze_bar: l > 1 ? 4 * l : 0, iron_bar: l > 2 ? 4 * l : 0 }),
  noSell: true,
});
def('launch_pad', {
  name: 'Launch Pad', size: [3, 3], max: 1, cat: 'core', maxLevel: 6, icon: 'rocket',
  desc: 'Your starship docks here. Upgrade the Warp Drive to reach new sectors and enlarge the fuel tank.',
  cost: {}, upgrade: (l) => ({ lunites: 2500 * l * l, bronze_bar: 6 * l, iron_bar: l >= 2 ? 6 * l : 0, silver_bar: l >= 3 ? 5 * l : 0, gold_bar: l >= 4 ? 5 * l : 0, cobalt_bar: l >= 5 ? 5 * l : 0 }),
  noSell: true,
});
def('fuel_pump', {
  name: 'Fuel Pump', size: [2, 2], max: 4, maxLevel: 5, icon: 'fuel',
  desc: 'Pumps starship fuel. Choose an amount; bigger batches take longer and cost Lunites.',
  cost: { lunites: 300, wood: 4, pebble: 4 }, upgrade: (l) => ({ lunites: 600 * l, bronze_bar: 2 * l, iron_bar: l > 2 ? 2 * l : 0 }),
});
def('beast_feeder', {
  name: 'Beast Feeder', size: [1, 1], max: 12, maxLevel: 3, icon: 'feeder',
  desc: 'Raises your beast capacity by 3 per level and drops a few Lunites when collected.',
  cost: { lunites: 1000, wood: 3 }, upgrade: (l) => ({ lunites: 1200 * l, fiber: 10 * l }),
});
def('training_dojo', {
  name: 'Training Dojo', size: [2, 2], max: 4, maxLevel: 5, icon: 'dojo',
  desc: 'Trains a beast over time for a Lunite fee or a Training Ticket.',
  cost: { lunites: 2000, wood: 8, pebble: 6 }, upgrade: (l) => ({ lunites: 2000 * l, bronze_bar: 2 * l, silver_bar: l > 2 ? l : 0 }),
});
def('incubator', {
  name: 'Incubator', size: [2, 2], max: 6, maxLevel: 5, icon: 'egg',
  desc: 'Keeps an egg warm until it hatches. Higher levels hatch faster.',
  cost: { lunites: 1500, fiber: 6, crystal: 2 }, upgrade: (l) => ({ lunites: 1500 * l, crystal: 3 * l, bronze_bar: l }),
});
def('breeding_facility', {
  name: 'Breeding Facility', size: [3, 3], max: 3, maxLevel: 5, icon: 'heart',
  desc: 'Pairs two habitat beasts to produce an egg. Upgrades shorten breeding and raise the Variant chance.',
  cost: { lunites: 5000, wood: 12, crystal: 6, bronze_bar: 2 }, upgrade: (l) => ({ lunites: 4000 * l, crystal: 6 * l, silver_bar: l, gold_bar: l > 2 ? l : 0 }),
});
def('laboratory', {
  name: 'Laboratory', size: [3, 3], max: 1, maxLevel: 3, icon: 'flask',
  desc: 'Brews potions: permanent stat boosts, tonics and breeding helpers.',
  cost: { lunites: 2500, wood: 6, crystal: 4 }, upgrade: (l) => ({ lunites: 3000 * l, silver_bar: 2 * l }),
});
def('workshop', {
  name: 'Workshop', size: [2, 2], max: 1, maxLevel: 3, icon: 'hammer',
  desc: 'Crafts orbs, sprays, bombs and fuel cells from materials.',
  cost: { lunites: 600, wood: 6, pebble: 4 }, upgrade: (l) => ({ lunites: 1500 * l, bronze_bar: 3 * l }),
});
def('refinery', {
  name: 'Refinery', size: [2, 2], max: 1, maxLevel: 3, icon: 'furnace',
  desc: 'Smelts raw ore into metal bars.',
  cost: { lunites: 1200, pebble: 10, copper: 6 }, upgrade: (l) => ({ lunites: 2500 * l, iron_bar: 3 * l }),
});
def('research_station', {
  name: 'Research Station', size: [3, 3], max: 1, maxLevel: 5, icon: 'research',
  desc: 'Runs research projects. Higher levels unlock deeper tiers of the research tree.',
  cost: { lunites: 3000, wood: 10, crystal: 6, bronze_bar: 2 }, upgrade: (l) => ({ lunites: 4000 * l * l, crystal: 8 * l, silver_bar: l > 1 ? 2 * l : 0, gold_bar: l > 2 ? 2 * l : 0, mythril_bar: l > 3 ? 2 * l : 0 }),
});
def('arena', {
  name: 'Duel Arena', size: [3, 3], max: 1, maxLevel: 1, icon: 'trophy',
  desc: 'Challenge rival Rangers in ranked duels for Lunites and Astrogems.',
  cost: { lunites: 4000, pebble: 20, bronze_bar: 4 },
});

// Element habitats: each houses beasts of its type (primary or secondary) and earns Lunites
const HAB_NAMES = {
  common: 'Meadow Pen', flame: 'Lava Pit', aquatic: 'Tide Pool', snow: 'Glacier Den', terra: 'Rock Garden',
  flora: 'Greenhouse', venom: 'Bog Hollow', primal: 'Wild Den', phantom: 'Shadow Crypt', lightning: 'Storm Coil',
  flying: 'Sky Aerie', tech: 'Robo Bay', flux: 'Rift Garden',
};
for (const el of ELEMENTS) {
  def('hab_' + el.id, {
    name: HAB_NAMES[el.id], size: [3, 3], max: 3, maxLevel: 4, cat: 'habitat', icon: 'el_' + el.id, el: el.id,
    desc: `Houses ${el.name} beasts (up to 2 + level). Residents earn Lunites over time.`,
    cost: { lunites: 800, wood: 6, pebble: 6 }, upgrade: (l) => ({ lunites: 1500 * l, crystal: 2 * l, bronze_bar: l }),
  });
}

// Decorations: purely cosmetic
const DECOS = [
  ['deco_tree', 'Puff Tree', [1, 1], 80], ['deco_pine', 'Spire Pine', [1, 1], 90], ['deco_palm', 'Curl Palm', [1, 1], 100],
  ['deco_bush', 'Berry Bush', [1, 1], 40], ['deco_flowers', 'Flower Bed', [1, 1], 30], ['deco_mushroom', 'Giant Mushroom', [1, 1], 120],
  ['deco_rock', 'Boulder', [1, 1], 30], ['deco_crystal', 'Crystal Cluster', [1, 1], 250], ['deco_lamp', 'Lamp Post', [1, 1], 60],
  ['deco_fence', 'Picket Fence', [1, 1], 15], ['deco_bench', 'Bench', [1, 1], 50], ['deco_fountain', 'Fountain', [2, 2], 600],
  ['deco_statue', 'Beast Statue', [1, 1], 900], ['deco_path', 'Stone Path', [1, 1], 10], ['deco_pond', 'Lily Pond', [2, 2], 400],
  ['deco_flag', 'Ranger Flag', [1, 1], 150],
];
for (const [id, name, size, price] of DECOS) {
  def(id, { name, size, max: 200, cat: 'deco', cost: { lunites: price }, desc: 'Decoration.', icon: 'deco' });
}

export const BUILD_CATEGORIES = [
  { id: 'facility', name: 'Facilities' },
  { id: 'habitat', name: 'Habitats' },
  { id: 'deco', name: 'Decorations' },
];

// Unlock gates: building -> required player level
export const BUILD_UNLOCK = {
  fuel_pump: 1, workshop: 1, beast_feeder: 2, hab_common: 2, refinery: 3, training_dojo: 4, incubator: 5,
  laboratory: 6, research_station: 5, breeding_facility: 8, arena: 10,
};
for (const el of ELEMENTS) if (!(('hab_' + el.id) in BUILD_UNLOCK)) BUILD_UNLOCK['hab_' + el.id] = 3;

// Expansion plots (each a 6x6 block) around the 12x12 starting island
export const HOME = { size: 12, block: 6 };
export const EXPANSIONS = [
  { id: 'e1', dir: [1, 0],   need: null, cost: { lunites: 1500, fiber: 15, wood: 10, pebble: 10 } },
  { id: 'e2', dir: [-1, 0],  need: null, cost: { lunites: 3000, fiber: 25, wood: 15, pebble: 15, crystal: 4 } },
  { id: 'e3', dir: [0, 1],   need: null, cost: { lunites: 6000, fiber: 35, wood: 25, crystal: 8, bronze_bar: 4 } },
  { id: 'e4', dir: [0, -1],  need: null, cost: { lunites: 10000, fiber: 50, wood: 35, crystal: 12, iron_bar: 6, relic: 1 } },
  { id: 'e5', dir: [2, 0],   need: 'e1', cost: { lunites: 16000, wood: 50, crystal: 16, iron_bar: 10, relic: 2 } },
  { id: 'e6', dir: [-2, 0],  need: 'e2', cost: { lunites: 24000, wood: 60, crystal: 20, silver_bar: 8, relic: 3 } },
  { id: 'e7', dir: [0, 2],   need: 'e3', cost: { lunites: 36000, wood: 80, crystal: 25, gold_bar: 8, relic: 4 } },
  { id: 'e8', dir: [0, -2],  need: 'e4', cost: { lunites: 50000, wood: 100, crystal: 30, cobalt_bar: 8, relic: 5 } },
];

// Cell rectangles for each owned area, in tile coords (x, z, w, d)
export function homeRects(owned) {
  const rects = [{ id: 'main', x: -6, z: -6, w: 12, d: 12 }];
  for (const e of EXPANSIONS) {
    if (!owned.includes(e.id)) continue;
    const [dx, dz] = e.dir;
    // Expansions are 12 wide along the island edge and 6 deep outward
    if (dx !== 0) rects.push({ id: e.id, x: dx > 0 ? 6 + (dx - 1) * 6 : -6 - (-dx) * 6, z: -6, w: 6, d: 12 });
    else rects.push({ id: e.id, x: -6, z: dz > 0 ? 6 + (dz - 1) * 6 : -6 - (-dz) * 6, w: 12, d: 6 });
  }
  return rects;
}
