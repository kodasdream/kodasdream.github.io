// Items, materials, ores, gems, ingots and crafting recipes.
// Icon ids refer to glyphs in ui/icons.js; "tint" recolors generic glyphs.

export const ITEMS = {};

function add(id, def) { ITEMS[id] = { id, stack: 9999, ...def }; }

// ---- Capture orbs
add('grav_orb',   { name: 'Gravity Orb', cat: 'orb', icon: 'orb', tint: 0x4ab8ff, power: 1.0, price: 60, desc: 'Captures a weakened wild beast. Lower HP means better odds.' });
add('great_orb',  { name: 'Great Orb',   cat: 'orb', icon: 'orb', tint: 0xb05ae6, power: 1.6, price: 220, desc: 'A reinforced orb with 60% stronger pull.' });
add('super_orb',  { name: 'Super Orb',   cat: 'orb', icon: 'orb', tint: 0xffb02e, power: 999, gems: 6, desc: 'Guaranteed capture, regardless of HP.' });

// ---- Battle consumables
add('med_spray',     { name: 'Med Spray',     cat: 'heal', icon: 'spray', tint: 0x5cd65a, heal: 0.4, price: 40, desc: 'Restores 40% HP to one beast.' });
add('mega_spray',    { name: 'Mega Spray',    cat: 'heal', icon: 'spray', tint: 0x2ab8a0, heal: 1.0, price: 160, desc: 'Fully restores HP to one beast.' });
add('revive_shard',  { name: 'Revive Shard',  cat: 'heal', icon: 'shard', tint: 0xffd23c, revive: 0.5, price: 200, desc: 'Revives a fainted beast with 50% HP.' });
add('stamina_tonic', { name: 'Stamina Tonic', cat: 'heal', icon: 'bottle', tint: 0x4ab8ff, stamina: 0.6, price: 60, desc: 'Restores 60% stamina to one beast.' });
add('cure_all',      { name: 'Cure-All',      cat: 'heal', icon: 'bottle', tint: 0xff7ab0, cure: true, price: 70, desc: 'Removes every harmful status effect.' });
add('shock_bomb',    { name: 'Shock Bomb',    cat: 'battle', icon: 'bomb', tint: 0xffd23c, bomb: { el: 'lightning', pct: 0.22, fx: 'stun', p: 0.35 }, price: 90, desc: 'Deals 22% max HP lightning damage. May stun.' });
add('frost_bomb',    { name: 'Frost Bomb',    cat: 'battle', icon: 'bomb', tint: 0x8fdcff, bomb: { el: 'snow', pct: 0.18, fx: 'freeze', p: 0.4 }, price: 90, desc: 'Deals 18% max HP snow damage. May freeze.' });
add('smoke_bomb',    { name: 'Smoke Bomb',    cat: 'battle', icon: 'bomb', tint: 0x9a9aa8, flee: true, price: 50, desc: 'Guarantees escape from a wild battle.' });
add('power_tonic',   { name: 'Power Tonic',   cat: 'battle', icon: 'bottle', tint: 0xff6a2c, buff: 'empower', price: 80, desc: 'Empowers one beast for 3 turns.' });
add('guard_tonic',   { name: 'Guard Tonic',   cat: 'battle', icon: 'bottle', tint: 0xc78a45, buff: 'fortify', price: 80, desc: 'Fortifies one beast for 3 turns.' });
add('swift_tonic',   { name: 'Swift Tonic',   cat: 'battle', icon: 'bottle', tint: 0x86e0ff, buff: 'haste', price: 80, desc: 'Hastes one beast for 3 turns.' });

// ---- Permanent stat potions (only one stat per beast, up to 100 doses, +2% each)
export const BOOST_POTIONS = {
  potion_hp:  { stat: 'hp',  name: 'Vitality Potion',  tint: 0x5cd65a },
  potion_atk: { stat: 'atk', name: 'Strength Potion',  tint: 0xff5a3a },
  potion_def: { stat: 'def', name: 'Guard Potion',     tint: 0xc78a45 },
  potion_spd: { stat: 'spd', name: 'Swiftness Potion', tint: 0x4ac8ff },
  potion_sta: { stat: 'sta', name: 'Endurance Potion', tint: 0xb05ae6 },
};
for (const [id, p] of Object.entries(BOOST_POTIONS)) {
  add(id, { name: p.name, cat: 'boost', icon: 'potion', tint: p.tint, boostStat: p.stat, price: 600, desc: `Permanently raises one beast's ${p.stat.toUpperCase()} by 2%. A beast can be boosted in one stat only, up to 100 doses.` });
}

// ---- Utility
add('energy_drink', { name: 'Energy Drink', cat: 'util', icon: 'can', tint: 0x5cd65a, energy: 20, price: 120, desc: 'Restores 20 energy.' });
add('fuel_cell',    { name: 'Fuel Cell',    cat: 'util', icon: 'fuel', tint: 0xffb02e, fuel: 25, price: 150, desc: 'Adds 25 fuel to your starship.' });
add('xp_snack',     { name: 'XP Snack',     cat: 'util', icon: 'snack', tint: 0xffc06a, xpPct: 0.5, price: 250, desc: 'Gives a beast half a level worth of XP.' });
add('train_ticket', { name: 'Training Ticket', cat: 'util', icon: 'ticket', tint: 0xff7ab0, price: 100, desc: 'Pays for one Training Dojo session instead of Lunites.' });
add('love_nectar',  { name: 'Love Nectar',  cat: 'util', icon: 'bottle', tint: 0xff6a9a, price: 180, desc: 'Halves the time of the next breeding.' });
add('lucky_charm',  { name: 'Lucky Charm',  cat: 'util', icon: 'charm', tint: 0x5cd65a, price: 400, desc: 'Triples the Variant chance of the next breeding.' });
add('warm_blanket', { name: 'Warm Blanket', cat: 'util', icon: 'blanket', tint: 0xff9a5a, price: 150, desc: 'Halves the time of the next incubation.' });

// ---- Materials (from clearing thick grass, chests, crates, harvesting, battles)
add('fiber',        { name: 'Grass Fiber',     cat: 'mat', icon: 'fiber', tint: 0x7ad84a, value: 2, desc: 'Tough fibers from thick grass.' });
add('sap',          { name: 'Amber Sap',       cat: 'mat', icon: 'drop', tint: 0xffb02e, value: 3, desc: 'Sticky sap from island trees.' });
add('pebble',       { name: 'Pebbles',         cat: 'mat', icon: 'pebble', tint: 0xb8a890, value: 2, desc: 'Smooth stones.' });
add('wood',         { name: 'Driftwood',       cat: 'mat', icon: 'log', tint: 0xb07a4a, value: 3, desc: 'Light, sturdy wood from floating groves.' });
add('crystal',      { name: 'Crystal Shard',   cat: 'mat', icon: 'crystal', tint: 0x7ae0ff, value: 8, desc: 'A shard of resonant crystal.' });
add('fluff',        { name: 'Beast Fluff',     cat: 'mat', icon: 'fluff', tint: 0xfff0d6, value: 5, desc: 'Shed by beasts after a good battle.' });
add('canister',     { name: 'Sludge Canister', cat: 'mat', icon: 'canister', tint: 0x8ad83a, value: 12, desc: 'Grimeworks distills beast essence into this ooze. Found in their crates.' });
add('relic',        { name: 'Ancient Relic',   cat: 'mat', icon: 'relic', tint: 0xe0c070, value: 40, desc: 'A carved fragment left by the Ancients.' });
add('stardust',     { name: 'Stardust',        cat: 'mat', icon: 'dust', tint: 0xff9ad8, value: 15, desc: 'Prismatic dust from rift worlds.' });
add('spore',        { name: 'Puff Spore', cat: 'mat', icon: 'spore', tint: 0xb05ae6, value: 4, desc: 'Puffy spores from bog mushrooms.' });
add('scale',        { name: 'Shimmer Scale',   cat: 'mat', icon: 'scale', tint: 0x4ac8ff, value: 6, desc: 'A glossy scale shed by aquatic beasts.' });
add('ember',        { name: 'Ember Coal',      cat: 'mat', icon: 'coal', tint: 0xff6a2c, value: 6, desc: 'A coal that stays warm for weeks.' });
add('frost',        { name: 'Frost Bloom',     cat: 'mat', icon: 'snowflake', tint: 0x9fe4ff, value: 6, desc: 'A flower made of ice.' });
add('gear',         { name: 'Scrap Gear',      cat: 'mat', icon: 'gearitem', tint: 0x98a8bc, value: 6, desc: 'Salvaged machine parts.' });

// ---- Ores (mined in caves). hard = drill power needed
export const ORES = [
  { id: 'copper',    name: 'Copper Ore',    hard: 1, tint: 0xd8783a, value: 4,   depth: 0 },
  { id: 'tin',       name: 'Tin Ore',       hard: 1, tint: 0xc8d0d8, value: 4,   depth: 0 },
  { id: 'iron',      name: 'Iron Ore',      hard: 2, tint: 0xa8806a, value: 8,   depth: 1 },
  { id: 'silver',    name: 'Silver Ore',    hard: 3, tint: 0xe0e8f0, value: 14,  depth: 2 },
  { id: 'gold',      name: 'Gold Ore',      hard: 4, tint: 0xffc83a, value: 22,  depth: 3 },
  { id: 'cobalt',    name: 'Cobalt Ore',    hard: 5, tint: 0x3a6aff, value: 34,  depth: 4 },
  { id: 'mythril',   name: 'Mythril Ore',   hard: 6, tint: 0x6af0d0, value: 50,  depth: 5 },
  { id: 'lunarite',  name: 'Lunarite Ore',  hard: 7, tint: 0xd8d0ff, value: 72,  depth: 6 },
  { id: 'starsteel', name: 'Starsteel Ore', hard: 8, tint: 0x8ab8ff, value: 100, depth: 7 },
  { id: 'prismite',  name: 'Prismite Ore',  hard: 9, tint: 0xff7ad8, value: 140, depth: 8 },
  { id: 'voidstone', name: 'Voidstone',     hard: 10, tint: 0x5a3a9a, value: 200, depth: 9 },
];
for (const o of ORES) add(o.id, { name: o.name, cat: 'ore', icon: 'ore', tint: o.tint, value: o.value, hard: o.hard, desc: `Raw ore. Needs drill power ${o.hard}. Smelt it at the Refinery.` });

export const GEMS = [
  { id: 'quartz',   name: 'Quartz',   tint: 0xf0f0ff, value: 20, depth: 0 },
  { id: 'amethyst', name: 'Amethyst', tint: 0xb05ae6, value: 30, depth: 1 },
  { id: 'emerald',  name: 'Emerald',  tint: 0x3ad06a, value: 45, depth: 2 },
  { id: 'ruby',     name: 'Ruby',     tint: 0xff3a5a, value: 45, depth: 2 },
  { id: 'sapphire', name: 'Sapphire', tint: 0x3a7aff, value: 45, depth: 2 },
  { id: 'topaz',    name: 'Topaz',    tint: 0xffb83a, value: 60, depth: 3 },
  { id: 'diamond',  name: 'Diamond',  tint: 0xe8f8ff, value: 150, depth: 5 },
];
for (const g of GEMS) add(g.id, { name: g.name, cat: 'gem', icon: 'gem', tint: g.tint, value: g.value, desc: 'A precious gemstone used in potions and research.' });

export const INGOTS = [
  { id: 'bronze_bar',    name: 'Bronze Bar',    from: { copper: 2, tin: 1 },  tint: 0xd89a4a, cost: 10 },
  { id: 'iron_bar',      name: 'Iron Bar',      from: { iron: 3 },            tint: 0xa0a8b0, cost: 20 },
  { id: 'silver_bar',    name: 'Silver Bar',    from: { silver: 3 },          tint: 0xe8eef4, cost: 35 },
  { id: 'gold_bar',      name: 'Gold Bar',      from: { gold: 3 },            tint: 0xffcc3a, cost: 55 },
  { id: 'cobalt_bar',    name: 'Cobalt Bar',    from: { cobalt: 3 },          tint: 0x4a7aff, cost: 80 },
  { id: 'mythril_bar',   name: 'Mythril Bar',   from: { mythril: 3 },         tint: 0x6af0d0, cost: 120 },
  { id: 'lunarite_bar',  name: 'Lunarite Bar',  from: { lunarite: 3 },        tint: 0xd8d0ff, cost: 170 },
  { id: 'starsteel_bar', name: 'Starsteel Bar', from: { starsteel: 3 },       tint: 0x8ab8ff, cost: 240 },
  { id: 'prismite_bar',  name: 'Prismite Bar',  from: { prismite: 3 },        tint: 0xff8ad8, cost: 330 },
  { id: 'void_bar',      name: 'Void Bar',      from: { voidstone: 3 },       tint: 0x6a4ab0, cost: 450 },
];
for (const b of INGOTS) add(b.id, { name: b.name, cat: 'bar', icon: 'ingot', tint: b.tint, value: b.cost * 2, desc: 'A refined metal bar for buildings, gear and upgrades.' });

// ---- Recipes. station: workshop | lab | refinery. out: [itemId, qty]
export const RECIPES = [];
function recipe(station, out, qty, inputs, lunites = 0, unlock = null) {
  RECIPES.push({ id: `${station}_${out}`, station, out, qty, inputs, lunites, unlock });
}

// Workshop
recipe('workshop', 'grav_orb', 2, { fiber: 2, pebble: 1 }, 10);
recipe('workshop', 'great_orb', 1, { grav_orb: 1, crystal: 1, iron_bar: 1 }, 40, 'adv_orbs');
recipe('workshop', 'med_spray', 1, { sap: 2, fiber: 1 }, 5);
recipe('workshop', 'mega_spray', 1, { med_spray: 2, silver_bar: 1 }, 30, 'adv_medicine');
recipe('workshop', 'revive_shard', 1, { crystal: 2, sap: 1, bronze_bar: 1 }, 30);
recipe('workshop', 'stamina_tonic', 1, { sap: 1, crystal: 1 }, 10);
recipe('workshop', 'cure_all', 1, { sap: 1, fiber: 2, spore: 1 }, 10);
recipe('workshop', 'shock_bomb', 2, { bronze_bar: 1, crystal: 1 }, 20, 'bombs');
recipe('workshop', 'frost_bomb', 2, { frost: 1, iron_bar: 1 }, 20, 'bombs');
recipe('workshop', 'smoke_bomb', 2, { fiber: 3, ember: 1 }, 10);
recipe('workshop', 'fuel_cell', 1, { canister: 1, bronze_bar: 1 }, 40);
recipe('workshop', 'train_ticket', 2, { fluff: 3, wood: 1 }, 20);

// Laboratory
recipe('lab', 'potion_atk', 1, { ruby: 1, sap: 2, fluff: 2 }, 150);
recipe('lab', 'potion_def', 1, { topaz: 1, pebble: 4, fluff: 2 }, 150);
recipe('lab', 'potion_hp', 1, { emerald: 1, sap: 3, fluff: 2 }, 150);
recipe('lab', 'potion_spd', 1, { sapphire: 1, scale: 2, fluff: 2 }, 150);
recipe('lab', 'potion_sta', 1, { amethyst: 1, spore: 2, fluff: 2 }, 150);
recipe('lab', 'power_tonic', 1, { ember: 1, sap: 1 }, 25);
recipe('lab', 'guard_tonic', 1, { pebble: 3, sap: 1 }, 25);
recipe('lab', 'swift_tonic', 1, { scale: 1, sap: 1 }, 25);
recipe('lab', 'energy_drink', 1, { sap: 2, crystal: 1, quartz: 1 }, 40);
recipe('lab', 'xp_snack', 1, { fluff: 3, sap: 2, quartz: 1 }, 60);
recipe('lab', 'love_nectar', 1, { sap: 3, ruby: 1 }, 60, 'breeding_lab');
recipe('lab', 'lucky_charm', 1, { emerald: 1, stardust: 1, relic: 1 }, 120, 'breeding_lab');
recipe('lab', 'warm_blanket', 1, { fluff: 4, ember: 1 }, 40, 'breeding_lab');

// Refinery
for (const b of INGOTS) recipe('refinery', b.id, 1, b.from, b.cost);

export function itemName(id) { return ITEMS[id]?.name ?? id; }
