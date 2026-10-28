// Research tree. Each node: branch, tier (needs Research Station level >= tier), prerequisites, effects.
// Costs scale with tier; time is in seconds.

export const BRANCHES = [
  { id: 'explore', name: 'Exploration', icon: 'compass', color: 0x4ab8ff },
  { id: 'beast',   name: 'Beastcraft',  icon: 'paw',     color: 0xff7ab0 },
  { id: 'industry',name: 'Industry',    icon: 'pickaxe', color: 0xffb02e },
  { id: 'combat',  name: 'Combat',      icon: 'sword',   color: 0xff5a3a },
];

const N = [
  // id, name, branch, tier, req[], effects, desc
  ['explore_1', 'Field Rations', 'explore', 1, [], { energyMax: 10 }, '+10 max energy.'],
  ['fuel_1', 'Efficient Thrusters', 'explore', 1, [], { fuelEff: 0.1 }, 'Travel uses 10% less fuel.'],
  ['explore_2', 'Ranger Stamina', 'explore', 2, ['explore_1'], { energyRegen: 0.25 }, 'Energy refills 25% faster.'],
  ['warp_1', 'Warp Theory I', 'explore', 2, ['fuel_1'], { warp: 1 }, 'Allows Launch Pad level 2: the Warp Drive can reach Sector 2.'],
  ['scanner', 'Beast Scanner', 'explore', 3, ['explore_2'], { scanner: 1, captureBonus: 0.05 }, 'Shows wild beast details before battle. +5% capture chance.'],
  ['warp_2', 'Warp Theory II', 'explore', 3, ['warp_1'], { warp: 1 }, 'Allows Launch Pad level 3 (Sector 3).'],
  ['fuel_2', 'Fuel Injectors', 'explore', 3, ['fuel_1'], { pumpSpeed: 0.3, fuelMax: 50 }, 'Pumps work 30% faster. +50 fuel tank.'],
  ['explore_3', 'Long Expeditions', 'explore', 4, ['explore_2'], { energyMax: 20 }, '+20 max energy.'],
  ['warp_3', 'Warp Theory III', 'explore', 4, ['warp_2'], { warp: 1 }, 'Allows Launch Pad level 4 (Sector 4).'],
  ['warp_4', 'Warp Theory IV', 'explore', 5, ['warp_3'], { warp: 1 }, 'Allows Launch Pad level 5 (Sector 5).'],
  ['fuel_3', 'Antimatter Tanks', 'explore', 5, ['fuel_2'], { fuelEff: 0.25, fuelMax: 100 }, 'Travel uses 25% less fuel. +100 fuel tank.'],

  ['xp_1', 'Training Methods', 'beast', 1, [], { xpGain: 0.1 }, 'Beasts earn 10% more XP.'],
  ['capture_1', 'Orb Calibration', 'beast', 1, [], { captureBonus: 0.1 }, '+10% capture chance.'],
  ['party_1', 'Field Kennel', 'beast', 2, ['xp_1'], { partySlots: 1 }, '+1 reserve party slot.'],
  ['adv_orbs', 'Great Orbs', 'beast', 2, ['capture_1'], { recipe: 'adv_orbs' }, 'Unlocks Great Orb crafting.'],
  ['breeding_lab', 'Breeding Science', 'beast', 2, ['xp_1'], { recipe: 'breeding_lab', breedSpeed: 0.15 }, 'Unlocks breeding potions. Breeding 15% faster.'],
  ['xp_2', 'Sparring Drills', 'beast', 3, ['xp_1'], { xpGain: 0.15, trainSpeed: 0.25 }, '+15% XP. Dojo training 25% faster.'],
  ['capture_2', 'Gravity Lensing', 'beast', 3, ['adv_orbs'], { captureBonus: 0.15 }, '+15% capture chance.'],
  ['hatch_1', 'Thermal Nests', 'beast', 3, ['breeding_lab'], { hatchSpeed: 0.3 }, 'Eggs hatch 30% faster.'],
  ['party_2', 'Expedition Kennel', 'beast', 4, ['party_1'], { partySlots: 1 }, '+1 reserve party slot.'],
  ['variant_1', 'Gene Mapping', 'beast', 4, ['hatch_1'], { variantChance: 1 }, 'Doubles the Variant chance when breeding.'],
  ['xp_3', 'Master Trainer', 'beast', 5, ['xp_2'], { xpGain: 0.25 }, '+25% XP.'],
  ['capture_3', 'Singularity Orbs', 'beast', 5, ['capture_2'], { captureBonus: 0.25 }, '+25% capture chance.'],

  ['mine_1', 'Sharper Picks', 'industry', 1, [], { mineYield: 0.15 }, '+15% ore from mining.'],
  ['habitat_1', 'Comfy Habitats', 'industry', 1, [], { habitatIncome: 0.15 }, 'Habitats earn 15% more.'],
  ['drill_1', 'Tempered Drill', 'industry', 2, ['mine_1'], { drillPower: 1 }, 'Drill power +1 (iron).'],
  ['bombs', 'Demolitions', 'industry', 2, ['mine_1'], { recipe: 'bombs', mineSpeed: 0.2 }, 'Unlocks battle bombs. Mining 20% cheaper.'],
  ['drill_2', 'Diamond Bit', 'industry', 3, ['drill_1'], { drillPower: 2 }, 'Drill power +2 (silver, gold).'],
  ['deep_1', 'Deep Shafts', 'industry', 3, ['drill_1'], { caveDepth: 1 }, 'Caves gain one deeper floor.'],
  ['habitat_2', 'Habitat Luxuries', 'industry', 3, ['habitat_1'], { habitatIncome: 0.25 }, 'Habitats earn 25% more.'],
  ['drill_3', 'Plasma Drill', 'industry', 4, ['drill_2'], { drillPower: 2 }, 'Drill power +2 (cobalt, mythril).'],
  ['ore_luck', 'Geo Scanner', 'industry', 4, ['deep_1'], { oreLuck: 0.25 }, 'Rare ore and gem veins are 25% more common.'],
  ['drill_4', 'Quantum Drill', 'industry', 5, ['drill_3'], { drillPower: 2 }, 'Drill power +2 (lunarite, starsteel).'],
  ['drill_5', 'Void Drill', 'industry', 5, ['drill_4'], { drillPower: 2 }, 'Drill power +2 (prismite, voidstone).'],
  ['deep_2', 'Abyssal Shafts', 'industry', 5, ['deep_1'], { caveDepth: 2 }, 'Caves gain two more floors.'],

  ['combat_1', 'Stamina Conditioning', 'combat', 1, [], { staminaRegen: 0.25 }, 'Stamina regenerates 25% faster in battle.'],
  ['adv_medicine', 'Advanced Medicine', 'combat', 2, ['combat_1'], { recipe: 'adv_medicine', itemPower: 0.2 }, 'Unlocks Mega Spray. Healing items 20% stronger.'],
  ['crit_1', 'Weak Point Analysis', 'combat', 2, ['combat_1'], { critChance: 0.05 }, '+5% critical chance.'],
  ['field_medic', 'Field Medic', 'combat', 3, ['adv_medicine'], { fieldMedic: 0.25 }, 'Party heals 25% after every battle.'],
  ['lunites_1', 'Bounty Contracts', 'combat', 3, ['crit_1'], { lunitesGain: 0.25 }, 'Battles pay 25% more Lunites.'],
  ['crit_2', 'Precision Training', 'combat', 4, ['crit_1'], { critChance: 0.05 }, '+5% critical chance.'],
  ['combat_2', 'Second Wind', 'combat', 4, ['combat_1'], { staminaRegen: 0.5 }, 'Stamina regenerates 50% faster in battle.'],
  ['lunites_2', 'Grimeworks Heists', 'combat', 5, ['lunites_1'], { lunitesGain: 0.5 }, 'Battles pay 50% more Lunites.'],
];

const TIER_MATS = [null, { fiber: 8, pebble: 6 }, { crystal: 4, bronze_bar: 2 }, { crystal: 8, iron_bar: 4, relic: 1 }, { silver_bar: 6, gold_bar: 3, relic: 2 }, { cobalt_bar: 5, mythril_bar: 3, relic: 4, stardust: 4 }];

export const RESEARCH = {};
for (const [id, name, branch, tier, req, effects, desc] of N) {
  RESEARCH[id] = {
    id, name, branch, tier, req, effects, desc,
    cost: { rp: 8 * tier * tier, lunites: Math.round(400 * Math.pow(tier, 2.2) / 50) * 50, ...TIER_MATS[tier] },
    time: [0, 60, 180, 480, 900, 1500][tier],
  };
}

export function researchEffects(done) {
  const out = {};
  for (const id of done) {
    const r = RESEARCH[id];
    if (!r) continue;
    for (const [k, v] of Object.entries(r.effects)) {
      if (k === 'recipe') { (out.recipes ||= []).push(v); continue; }
      out[k] = (out[k] || 0) + v;
    }
  }
  return out;
}
