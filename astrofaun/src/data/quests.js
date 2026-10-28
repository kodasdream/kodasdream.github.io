// Quest chains: a home tutorial chain and a story chain on each planet.
// Step types are matched against game events in game/quests.js.
import { PLANETS } from './planets.js';
import { RNG } from '../core/util.js';

export const QUESTS = {};
export const NPCS = {};

function q(def) { QUESTS[def.id] = def; return def; }

// ---------------------------------------------------------------- characters
NPCS.oko = { id: 'oko', name: 'Dr. Oko', role: 'Beast Researcher', look: { suit: 0xffffff, accent: 0x4ab8ff, skin: 0xc8875a, hair: 0x2a2a3a } };
NPCS.pip = { id: 'pip', name: 'Pip', role: 'Ship Mechanic', look: { suit: 0xffb02e, accent: 0x3a4a5a, skin: 0xf0c8a0, hair: 0xd8502a } };
NPCS.lyra = { id: 'lyra', name: 'Commander Lyra', role: 'Astrofaun Corps', look: { suit: 0x3a5ad8, accent: 0xffd23c, skin: 0x8a5a3a, hair: 0x1a1a1a } };

const FIRST = ['Tilly', 'Bram', 'Juno', 'Okko', 'Mara', 'Fitz', 'Wren', 'Dax', 'Nell', 'Rory', 'Suki', 'Teo', 'Vana', 'Quill', 'Holly', 'Ivy', 'Zed', 'Pella', 'Corin', 'Lumi', 'Brix', 'Sable', 'Tamsin', 'Odo', 'Kestrel', 'Mabel', 'Yori', 'Edda', 'Fen', 'Rook', 'Ansel', 'Moss', 'Haru', 'Lark'];
const DUEL_TITLES = ['Ace', 'Tamer', 'Rookie', 'Veteran', 'Wrangler', 'Champion'];

PLANETS.forEach((p, i) => {
  const rng = new RNG('npc-' + p.id);
  const look = () => ({ suit: rng.pick([0x4ab8ff, 0x5cd65a, 0xff7ab0, 0xffb02e, 0xb05ae6, 0xff5a3a, 0x2ad0c8]), accent: rng.pick([0xffffff, 0x3a4a5a, 0xffd23c]), skin: rng.pick([0xf0c8a0, 0xc8875a, 0x8a5a3a, 0xe0a878, 0x5a3a2a]), hair: rng.pick([0x2a2a3a, 0xd8502a, 0xffe08a, 0x6a3a1a, 0xffffff, 0x5a7aff]) });
  NPCS[p.id + '_contact'] = { id: p.id + '_contact', name: 'Ranger ' + rng.pick(FIRST), role: 'Outpost Ranger', planet: p.id, look: look() };
  NPCS[p.id + '_duelist'] = { id: p.id + '_duelist', name: rng.pick(DUEL_TITLES) + ' ' + rng.pick(FIRST), role: 'Beast Tamer', planet: p.id, duel: true, look: look(), teamSize: Math.min(3, 1 + Math.floor(i / 4)), lvl: Math.round((p.lv[0] + p.lv[1]) / 2 + 1) };
  NPCS[p.id + '_boss'] = { id: p.id + '_boss', name: p.boss.name, role: p.boss.sector ? 'Grimeworks Lieutenant' : 'Grimeworks Officer', planet: p.id, boss: true, look: { suit: 0x5a6a3a, accent: 0x9ae03a, skin: 0xd8a878, hair: 0x2a2a2a }, teamSize: 3, lvl: p.boss.lvl };
});

// ---------------------------------------------------------------- home chain
const HOME_CHAIN = [
  { id: 'h_welcome', giver: 'oko', title: 'Welcome, Ranger', text: "Welcome to your very own island! I'm Dr. Oko. This rock is all yours: build on it, expand it, and fill it with beasts. Let's get you started with a few Gravity Orbs.",
    steps: [{ type: 'talk', target: 'oko', count: 1, label: 'Talk to Dr. Oko' }], rewards: { lunites: 200, items: { grav_orb: 5, med_spray: 3 }, xp: 10 } },
  { id: 'h_grass', giver: 'oko', title: 'Clear the Overgrowth', text: 'Thick grass has taken over half the island. Tap a patch to clear it. It costs a little energy, but the fibers are useful.',
    steps: [{ type: 'clear', target: 'home', count: 3, label: 'Clear thick grass on your island' }], rewards: { lunites: 150, xp: 15, items: { fiber: 4 } } },
  { id: 'h_pump', giver: 'pip', title: 'Fuel for Adventure', text: "Hey! Pip here, I keep your ship flying. No fuel, no flying. Build a Fuel Pump from the Build menu and I'll top you up.",
    steps: [{ type: 'build', target: 'fuel_pump', count: 1, label: 'Build a Fuel Pump' }], rewards: { lunites: 200, xp: 20, items: { fuel_cell: 1 } } },
  { id: 'h_fly', giver: 'pip', title: 'First Flight', text: "Fuel's in. Hop on the Launch Pad, open the Star Map and set course for Mossbloom. Commander Lyra's outpost is waiting.",
    steps: [{ type: 'travel', target: 'mossbloom', count: 1, label: 'Travel to Mossbloom' }], rewards: { lunites: 250, xp: 25 } },
  { id: 'h_workshop', giver: 'oko', title: 'Tools of the Trade', text: 'Orbs run out fast. Build a Workshop and craft some Gravity Orbs of your own.',
    steps: [{ type: 'build', target: 'workshop', count: 1, label: 'Build a Workshop' }, { type: 'craft', target: 'grav_orb', count: 2, label: 'Craft Gravity Orbs' }], rewards: { lunites: 300, xp: 30 } },
  { id: 'h_habitat', giver: 'oko', title: 'A Place to Stay', text: 'Beasts in habitats earn Lunites while you explore. Build any habitat and move a beast in.',
    steps: [{ type: 'build_cat', target: 'habitat', count: 1, label: 'Build a habitat' }, { type: 'house', count: 1, label: 'Move a beast into a habitat' }], rewards: { lunites: 400, xp: 35, items: { xp_snack: 1 } } },
  { id: 'h_refinery', giver: 'pip', title: 'Heavy Metal', text: 'Every cave out there is full of ore. Build a Refinery and smelt a Bronze Bar. Copper and tin are all over Pebblerun.',
    steps: [{ type: 'build', target: 'refinery', count: 1, label: 'Build a Refinery' }, { type: 'craft', target: 'bronze_bar', count: 1, label: 'Smelt a Bronze Bar' }], rewards: { lunites: 500, xp: 40, items: { copper: 4, tin: 2 } } },
  { id: 'h_research', giver: 'oko', title: 'Science!', text: 'The Research Station lets us study everything you find. Build one and complete any research project.',
    steps: [{ type: 'build', target: 'research_station', count: 1, label: 'Build a Research Station' }, { type: 'research', count: 1, label: 'Complete a research project' }], rewards: { lunites: 800, xp: 60, gems: 5 } },
  { id: 'h_train', giver: 'oko', title: 'Forest of Champions', text: 'A good Ranger trains at home too. Build a Training Dojo and train a beast up by 3 levels.',
    steps: [{ type: 'build', target: 'training_dojo', count: 1, label: 'Build a Training Dojo' }, { type: 'train_levels', count: 3, label: 'Gain 3 levels from training' }], rewards: { lunites: 1000, xp: 80, items: { train_ticket: 3 } } },
  { id: 'h_breed', giver: 'oko', title: 'New Life', text: 'Two beasts in habitats can be paired at a Breeding Facility. The egg goes into an Incubator. Try it!',
    steps: [{ type: 'build', target: 'breeding_facility', count: 1, label: 'Build a Breeding Facility' }, { type: 'hatch', count: 1, label: 'Hatch an egg' }], rewards: { lunites: 2000, xp: 120, gems: 10 } },
  { id: 'h_potion', giver: 'oko', title: 'Secret Formula', text: 'The Laboratory can brew permanent stat potions. Each dose adds 2% to one stat, up to 100 doses. Brew one and give it to a beast.',
    steps: [{ type: 'build', target: 'laboratory', count: 1, label: 'Build a Laboratory' }, { type: 'boost', count: 1, label: 'Feed a stat potion to a beast' }], rewards: { lunites: 1500, xp: 100, items: { ruby: 1 } } },
  { id: 'h_expand', giver: 'pip', title: 'Room to Grow', text: 'See those floating plots around your island? Gather materials and buy one to expand your land.',
    steps: [{ type: 'expand', count: 1, label: 'Buy a land expansion' }], rewards: { lunites: 2000, xp: 120, gems: 5 } },
];
HOME_CHAIN.forEach((d, i) => q({ ...d, chain: 'home', next: HOME_CHAIN[i + 1]?.id ?? null }));

// ---------------------------------------------------------------- planet chains
const GRASS_LINES = ['The path to the outer islands is choked with thick grass.', 'Overgrowth blocks the bridges here.', 'Clear the thickets so the beasts can roam again.'];
const SURVEY_LINES = ['We need data on the local beasts. Battle a few and bring one back.', 'Help me survey the wildlife: defeat some beasts and capture one for study.', 'The beasts here are restless. Prove yourself against them.'];
const CRATE_LINES = ['Grimeworks crates have been dumped all over. Smash them and collect the Sludge Canisters inside.', 'Those green crates? Grimeworks. They are bottling beast essence. Collect the canisters as evidence.'];
const CAVE_LINES = ['There is a cave on one of the islands. The ore inside could fund the outpost.', 'Grimeworks is after the ore in the caves. Get there first!'];

PLANETS.forEach((p, i) => {
  const rng = new RNG('quest-' + p.id);
  const contact = p.id + '_contact';
  const boss = p.id + '_boss';
  const tier = i;
  const lunScale = Math.round(100 * Math.pow(1.22, tier));
  const xpScale = Math.round(20 * Math.pow(1.18, tier));
  const mineOre = ['copper', 'tin', 'iron', 'iron', 'silver', 'silver', 'gold', 'gold', 'cobalt', 'cobalt', 'mythril', 'mythril', 'lunarite', 'lunarite', 'starsteel', 'starsteel', 'prismite', 'prismite', 'voidstone', 'voidstone', 'voidstone', 'voidstone'];
  const chain = [];
  const intro = i === 0
    ? "Ranger! Commander Lyra sent word you'd be coming. Welcome to Mossbloom. Grimeworks has been sniffing around these islands, so keep your eyes open."
    : `Good to see a Ranger out here on ${p.name}. ${p.blurb}`;
  chain.push({ id: `${p.id}_1`, giver: contact, title: `Arrival on ${p.name}`, text: intro + ' ' + rng.pick(GRASS_LINES),
    steps: [{ type: 'talk', target: contact, count: 1, label: `Talk to ${NPCS[contact].name}` }, { type: 'clear', target: p.id, count: 3, label: 'Clear thick grass' }],
    rewards: { lunites: lunScale, xp: xpScale, items: { grav_orb: 3 } } });
  chain.push({ id: `${p.id}_2`, giver: contact, title: 'Field Survey', text: rng.pick(SURVEY_LINES),
    steps: [{ type: 'defeat', target: p.id, count: 3 + Math.min(4, Math.floor(i / 3)), label: 'Defeat wild beasts' }, { type: 'capture', target: p.id, count: 1, label: 'Capture a beast' }],
    rewards: { lunites: lunScale * 1.5, xp: xpScale * 1.5, rp: 4 + i, items: { med_spray: 2 } } });
  chain.push({ id: `${p.id}_3`, giver: contact, title: 'Supply Run', text: 'The outpost is low on supplies. Open the treasure chests and harvest what grows here.',
    steps: [{ type: 'chest', target: p.id, count: 2, label: 'Open treasure chests' }, { type: 'harvest', target: p.id, count: 3, label: 'Harvest resources' }],
    rewards: { lunites: lunScale * 1.5, xp: xpScale * 1.5, items: { [p.mats[0]]: 4 } } });
  chain.push({ id: `${p.id}_4`, giver: contact, title: 'Grimeworks Trouble', text: rng.pick(CRATE_LINES) + ' Their grunts will not be happy about it.',
    steps: [{ type: 'crate', target: p.id, count: 2, label: 'Smash Grimeworks crates' }, { type: 'duel_goon', target: p.id, count: 1, label: 'Defeat a Grimeworks grunt' }],
    rewards: { lunites: lunScale * 2, xp: xpScale * 2, rp: 6 + i } });
  if (i >= 1) {
    chain.push({ id: `${p.id}_5`, giver: contact, title: 'Into the Depths', text: rng.pick(CAVE_LINES),
      steps: [{ type: 'mine', target: p.id, count: 5 + Math.min(10, i), label: `Mine ore in the ${p.name} cave` }],
      rewards: { lunites: lunScale * 2, xp: xpScale * 2, items: { [mineOre[i]]: 4 } } });
  }
  chain.push({ id: `${p.id}_boss`, giver: contact, title: p.boss.sector ? `Showdown: ${p.boss.name}` : `Confront ${p.boss.name}`, text: `${p.boss.name} is holding the far island. Beat their team and Grimeworks loses its grip on ${p.name}.` + (p.boss.final ? ' This is it, Ranger. The Baron himself.' : ''),
    steps: [{ type: 'boss', target: p.id, count: 1, label: `Defeat ${p.boss.name}` }],
    rewards: { lunites: lunScale * 4, xp: xpScale * 4, gems: p.boss.sector ? 15 : 5, rp: 10 + 2 * i, items: p.boss.sector ? { relic: 2, super_orb: 1 } : { relic: 1 } }, unlocks: PLANETS[i + 1]?.id ?? null });
  chain.forEach((d, k) => q({ ...d, chain: p.id, planet: p.id, next: chain[k + 1]?.id ?? null }));
});

export const FIRST_QUESTS = ['h_welcome'];

export function planetChainStart(pid) { return `${pid}_1`; }
