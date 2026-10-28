// Skill pool. Each type has twelve skills spread over five learning tiers.
// Tuple layout: [name, kind, power, accuracy, cost, target, tier, anim, extra]
// kind: atk | heal | buff | debuff | status
// target: foe | foes | self | ally | allies
// cost is stamina relative to a level-scaled reference pool (see game/beast.js)

export const STATUS = {
  burn:    { name: 'Burn',      bad: true,  color: 0xff7a30, desc: 'Takes 6% max HP each turn.' },
  poison:  { name: 'Poison',    bad: true,  color: 0xa654e0, desc: 'Takes 8% max HP each turn.' },
  freeze:  { name: 'Frozen',    bad: true,  color: 0x8fdcff, desc: 'Cannot act. Fire hits thaw it.' },
  stun:    { name: 'Stunned',   bad: true,  color: 0xffd23c, desc: 'Half the time it cannot act.' },
  sleep:   { name: 'Asleep',    bad: true,  color: 0x8e8ad8, desc: 'Cannot act. Wakes when hit.' },
  confuse: { name: 'Confused',  bad: true,  color: 0xff76c0, desc: 'May hit itself instead.' },
  weaken:  { name: 'Weakened',  bad: true,  color: 0xd06a4a, desc: 'Attack down 30%.' },
  expose:  { name: 'Exposed',   bad: true,  color: 0xc49a4a, desc: 'Defense down 30%.' },
  slow:    { name: 'Slowed',    bad: true,  color: 0x6a9ad0, desc: 'Speed down 40%.' },
  regen:   { name: 'Regen',     bad: false, color: 0x5cd65a, desc: 'Heals 8% max HP each turn.' },
  shield:  { name: 'Shielded',  bad: false, color: 0x7fc8ff, desc: 'Takes half damage.' },
  haste:   { name: 'Hasted',    bad: false, color: 0x86e0ff, desc: 'Speed up 50%.' },
  empower: { name: 'Empowered', bad: false, color: 0xff9a4a, desc: 'Attack up 40%.' },
  fortify: { name: 'Fortified', bad: false, color: 0xc78a45, desc: 'Defense up 40%.' },
  taunt:   { name: 'Taunting',  bad: false, color: 0xe0503a, desc: 'Foes must target it.' },
  focus:   { name: 'Focused',   bad: false, color: 0xffe07a, desc: 'Critical chance up.' },
};

const T = {
  common: [
    ['Scratch', 'atk', 35, 0.98, 0, 'foe', 1, 'strike'],
    ['Tackle Roll', 'atk', 50, 0.95, 8, 'foe', 1, 'strike'],
    ['Tail Whip', 'debuff', 0, 0.95, 10, 'foe', 1, 'burst', { fx: 'expose', p: 1, t: 3 }],
    ['Snack Break', 'heal', 0, 1, 14, 'self', 2, 'aura', { heal: 0.3 }],
    ['Headbutt', 'atk', 70, 0.9, 14, 'foe', 2, 'strike', { fx: 'stun', p: 0.2, t: 1 }],
    ['Rally Cry', 'buff', 0, 1, 18, 'allies', 2, 'aura', { fx: 'empower', p: 1, t: 3 }],
    ['Pounce', 'atk', 80, 0.92, 18, 'foe', 3, 'strike'],
    ['Big Hug', 'atk', 60, 0.95, 16, 'foe', 3, 'strike', { drain: 0.5 }],
    ['Stampede', 'atk', 62, 0.9, 26, 'foes', 4, 'burst'],
    ['Lucky Strike', 'atk', 95, 0.9, 24, 'foe', 4, 'strike', { crit: 0.35 }],
    ['Second Wind', 'heal', 0, 1, 30, 'allies', 5, 'aura', { heal: 0.25 }],
    ['Mega Slam', 'atk', 140, 0.85, 38, 'foe', 5, 'strike'],
  ],
  flame: [
    ['Ember Spit', 'atk', 40, 0.97, 0, 'foe', 1, 'shot', { fx: 'burn', p: 0.1, t: 3 }],
    ['Cinder Bite', 'atk', 55, 0.95, 9, 'foe', 1, 'strike', { fx: 'burn', p: 0.2, t: 3 }],
    ['Smokescreen', 'debuff', 0, 0.95, 10, 'foe', 2, 'burst', { fx: 'weaken', p: 1, t: 3 }],
    ['Kindle', 'buff', 0, 1, 14, 'self', 2, 'aura', { fx: 'empower', p: 1, t: 3 }],
    ['Flame Wheel', 'atk', 75, 0.94, 15, 'foe', 2, 'strike', { fx: 'burn', p: 0.25, t: 3 }],
    ['Heat Wave', 'atk', 55, 0.9, 22, 'foes', 3, 'burst', { fx: 'burn', p: 0.15, t: 3 }],
    ['Magma Slam', 'atk', 95, 0.88, 24, 'foe', 3, 'strike', { fx: 'stun', p: 0.15, t: 1 }],
    ['Scorch Ring', 'atk', 65, 0.95, 20, 'foe', 3, 'burst', { fx: 'burn', p: 0.6, t: 3 }],
    ['Ember Shell', 'buff', 0, 1, 16, 'self', 4, 'aura', { fx: 'fortify', p: 1, t: 3 }],
    ['Inferno', 'atk', 120, 0.9, 34, 'foe', 4, 'burst', { fx: 'burn', p: 0.3, t: 3 }],
    ['Solar Flare', 'atk', 85, 0.88, 36, 'foes', 5, 'rain', { fx: 'burn', p: 0.25, t: 3 }],
    ['Phoenix Rush', 'atk', 150, 0.85, 44, 'foe', 5, 'strike', { recoil: 0.2 }],
  ],
  aquatic: [
    ['Bubble Pop', 'atk', 40, 0.98, 0, 'foe', 1, 'shot'],
    ['Splash Jab', 'atk', 55, 0.95, 9, 'foe', 1, 'strike'],
    ['Soak', 'debuff', 0, 0.95, 10, 'foe', 1, 'shot', { fx: 'slow', p: 1, t: 3 }],
    ['Shell Up', 'buff', 0, 1, 14, 'self', 2, 'aura', { fx: 'fortify', p: 1, t: 3 }],
    ['Tidal Bite', 'atk', 75, 0.94, 15, 'foe', 2, 'strike'],
    ['Healing Mist', 'heal', 0, 1, 18, 'ally', 2, 'aura', { heal: 0.35 }],
    ['Whirlpool', 'atk', 65, 0.92, 18, 'foe', 3, 'burst', { fx: 'slow', p: 0.4, t: 3 }],
    ['Rain Dance', 'buff', 0, 1, 24, 'allies', 3, 'rain', { fx: 'regen', p: 1, t: 3 }],
    ['Hydro Lance', 'atk', 100, 0.9, 26, 'foe', 3, 'beam'],
    ['Riptide', 'atk', 70, 0.9, 30, 'foes', 4, 'burst'],
    ['Tsunami', 'atk', 110, 0.85, 42, 'foes', 5, 'rain'],
    ['Abyss Crush', 'atk', 140, 0.88, 40, 'foe', 5, 'strike', { fx: 'expose', p: 0.3, t: 3 }],
  ],
  snow: [
    ['Frost Nip', 'atk', 40, 0.98, 0, 'foe', 1, 'shot', { fx: 'freeze', p: 0.05, t: 1 }],
    ['Snowball', 'atk', 55, 0.95, 9, 'foe', 1, 'shot', { fx: 'slow', p: 0.2, t: 2 }],
    ['Frost Armor', 'buff', 0, 1, 14, 'self', 2, 'aura', { fx: 'fortify', p: 1, t: 3 }],
    ['Chill Breath', 'atk', 45, 0.92, 16, 'foes', 2, 'burst', { fx: 'slow', p: 0.3, t: 2 }],
    ['Ice Fang', 'atk', 75, 0.94, 15, 'foe', 2, 'strike', { fx: 'freeze', p: 0.15, t: 1 }],
    ['Deep Freeze', 'status', 0, 0.8, 22, 'foe', 3, 'burst', { fx: 'freeze', p: 0.7, t: 2 }],
    ['Hailstorm', 'atk', 60, 0.9, 26, 'foes', 3, 'rain', { fx: 'freeze', p: 0.1, t: 1 }],
    ['Glacier Ram', 'atk', 95, 0.9, 24, 'foe', 3, 'strike'],
    ['Blizzard Veil', 'buff', 0, 1, 28, 'allies', 4, 'aura', { fx: 'shield', p: 1, t: 2 }],
    ['Icicle Spear', 'atk', 105, 0.9, 28, 'foe', 4, 'shot', { crit: 0.3 }],
    ['Avalanche', 'atk', 120, 0.82, 44, 'foes', 5, 'rain'],
    ['Absolute Zero', 'atk', 150, 0.8, 46, 'foe', 5, 'beam', { fx: 'freeze', p: 0.25, t: 1 }],
  ],
  terra: [
    ['Pebble Toss', 'atk', 40, 0.97, 0, 'foe', 1, 'shot'],
    ['Rock Butt', 'atk', 55, 0.95, 9, 'foe', 1, 'strike'],
    ['Sand Kick', 'debuff', 0, 0.95, 10, 'foe', 1, 'burst', { fx: 'weaken', p: 1, t: 3 }],
    ['Stone Skin', 'buff', 0, 1, 14, 'self', 2, 'aura', { fx: 'fortify', p: 1, t: 3 }],
    ['Boulder Roll', 'atk', 75, 0.93, 16, 'foe', 2, 'strike', { fx: 'stun', p: 0.1, t: 1 }],
    ['Quake', 'atk', 60, 0.92, 24, 'foes', 3, 'burst'],
    ['Crag Smash', 'atk', 95, 0.9, 24, 'foe', 3, 'strike', { fx: 'expose', p: 0.25, t: 3 }],
    ['Mud Bath', 'heal', 0, 1, 18, 'self', 3, 'aura', { heal: 0.35 }],
    ['Bulwark', 'buff', 0, 1, 20, 'self', 4, 'aura', { fx: 'taunt', p: 1, t: 2, fx2: 'fortify' }],
    ['Geode Burst', 'atk', 100, 0.92, 30, 'foe', 4, 'burst', { crit: 0.3 }],
    ['Landslide', 'atk', 110, 0.85, 40, 'foes', 5, 'rain'],
    ['Tectonic Crush', 'atk', 145, 0.85, 44, 'foe', 5, 'strike', { fx: 'stun', p: 0.25, t: 1 }],
  ],
  flora: [
    ['Leaf Flick', 'atk', 40, 0.98, 0, 'foe', 1, 'shot'],
    ['Vine Whip', 'atk', 55, 0.95, 9, 'foe', 1, 'strike'],
    ['Photosynth', 'heal', 0, 1, 16, 'self', 2, 'aura', { heal: 0.4 }],
    ['Spore Puff', 'status', 0, 0.85, 14, 'foe', 2, 'burst', { fx: 'sleep', p: 0.55, t: 2 }],
    ['Petal Storm', 'atk', 50, 0.92, 18, 'foes', 2, 'rain'],
    ['Thorn Lash', 'atk', 80, 0.93, 16, 'foe', 2, 'strike', { fx: 'expose', p: 0.2, t: 3 }],
    ['Root Drain', 'atk', 70, 0.95, 20, 'foe', 3, 'beam', { drain: 0.6 }],
    ['Blossom Aura', 'buff', 0, 1, 24, 'allies', 3, 'aura', { fx: 'regen', p: 1, t: 3 }],
    ['Bramble Guard', 'buff', 0, 1, 26, 'allies', 4, 'aura', { fx: 'fortify', p: 1, t: 3 }],
    ['Seed Barrage', 'atk', 32, 0.9, 26, 'foe', 4, 'shot', { multi: 4 }],
    ['Solar Beam', 'atk', 140, 0.9, 42, 'foe', 5, 'beam'],
    ['Verdant Wrath', 'atk', 110, 0.85, 44, 'foes', 5, 'rain'],
  ],
  venom: [
    ['Toxic Spit', 'atk', 40, 0.97, 0, 'foe', 1, 'shot', { fx: 'poison', p: 0.15, t: 4 }],
    ['Sting', 'atk', 55, 0.95, 9, 'foe', 1, 'strike', { fx: 'poison', p: 0.25, t: 4 }],
    ['Mire Grip', 'atk', 65, 0.94, 15, 'foe', 2, 'strike', { fx: 'slow', p: 0.4, t: 3 }],
    ['Acid Splash', 'atk', 70, 0.94, 15, 'foe', 2, 'shot', { fx: 'expose', p: 0.3, t: 3 }],
    ['Noxious Cloud', 'status', 0, 0.85, 20, 'foes', 2, 'burst', { fx: 'poison', p: 0.5, t: 4 }],
    ['Venom Fang', 'atk', 85, 0.93, 20, 'foe', 3, 'strike', { fx: 'poison', p: 0.35, t: 4 }],
    ['Caustic Coat', 'buff', 0, 1, 14, 'self', 3, 'aura', { fx: 'fortify', p: 1, t: 3 }],
    ['Corrode', 'debuff', 0, 0.9, 22, 'foes', 3, 'burst', { fx: 'expose', p: 1, t: 3 }],
    ['Plague Bloom', 'atk', 70, 0.9, 32, 'foes', 4, 'rain', { fx: 'poison', p: 0.3, t: 4 }],
    ['Leech Bite', 'atk', 80, 0.95, 22, 'foe', 4, 'strike', { drain: 0.5 }],
    ['Hex Stinger', 'atk', 125, 0.88, 38, 'foe', 5, 'strike', { fx: 'poison', p: 0.5, t: 4 }],
    ['Pestilence', 'atk', 100, 0.85, 44, 'foes', 5, 'burst', { fx: 'poison', p: 0.4, t: 4 }],
  ],
  primal: [
    ['Claw', 'atk', 42, 0.97, 0, 'foe', 1, 'strike'],
    ['Gnash', 'atk', 58, 0.95, 9, 'foe', 1, 'strike'],
    ['Roar', 'debuff', 0, 0.95, 16, 'foes', 2, 'burst', { fx: 'weaken', p: 1, t: 3 }],
    ['Feral Rage', 'buff', 0, 1, 14, 'self', 2, 'aura', { fx: 'empower', p: 1, t: 3 }],
    ['Maul', 'atk', 80, 0.92, 16, 'foe', 2, 'strike', { crit: 0.25 }],
    ['Rending Fangs', 'atk', 90, 0.92, 20, 'foe', 3, 'strike', { fx: 'expose', p: 0.25, t: 3 }],
    ['Tusk Charge', 'atk', 105, 0.88, 26, 'foe', 3, 'strike', { fx: 'stun', p: 0.15, t: 1 }],
    ['Lick Wounds', 'heal', 0, 1, 16, 'self', 3, 'aura', { heal: 0.4 }],
    ['Pack Howl', 'buff', 0, 1, 28, 'allies', 4, 'aura', { fx: 'empower', p: 1, t: 3 }],
    ['Frenzy', 'atk', 38, 0.92, 26, 'foe', 4, 'strike', { multi: 3 }],
    ['Rampage', 'atk', 115, 0.85, 42, 'foes', 5, 'burst'],
    ['Alpha Strike', 'atk', 155, 0.85, 46, 'foe', 5, 'strike', { recoil: 0.15 }],
  ],
  phantom: [
    ['Spook', 'atk', 40, 0.98, 0, 'foe', 1, 'shot'],
    ['Shadow Claw', 'atk', 55, 0.95, 9, 'foe', 1, 'strike'],
    ['Fade Out', 'buff', 0, 1, 16, 'self', 2, 'aura', { fx: 'shield', p: 1, t: 2 }],
    ['Haunt', 'status', 0, 0.85, 14, 'foe', 2, 'burst', { fx: 'confuse', p: 0.6, t: 3 }],
    ['Night Shade', 'atk', 75, 0.94, 16, 'foe', 2, 'beam'],
    ['Soul Siphon', 'atk', 70, 0.95, 20, 'foe', 3, 'beam', { drain: 0.6 }],
    ['Dread Lull', 'status', 0, 0.82, 18, 'foe', 3, 'burst', { fx: 'sleep', p: 0.6, t: 2 }],
    ['Wither', 'debuff', 0, 0.92, 14, 'foe', 3, 'burst', { fx: 'weaken', p: 1, t: 3, fx2: 'expose' }],
    ['Wraith Wail', 'atk', 65, 0.9, 30, 'foes', 4, 'burst', { fx: 'confuse', p: 0.2, t: 2 }],
    ['Phantom Rush', 'atk', 110, 0.9, 30, 'foe', 4, 'strike'],
    ['Eclipse', 'atk', 120, 0.82, 44, 'foes', 5, 'rain'],
    ['Oblivion Gaze', 'atk', 150, 0.82, 46, 'foe', 5, 'beam'],
  ],
  lightning: [
    ['Zap', 'atk', 40, 0.97, 0, 'foe', 1, 'shot', { fx: 'stun', p: 0.1, t: 1 }],
    ['Spark Jab', 'atk', 55, 0.95, 9, 'foe', 1, 'strike', { fx: 'stun', p: 0.15, t: 1 }],
    ['Charge Up', 'buff', 0, 1, 12, 'self', 2, 'aura', { fx: 'empower', p: 1, t: 3 }],
    ['Magnet Pulse', 'debuff', 0, 0.92, 18, 'foes', 2, 'burst', { fx: 'slow', p: 1, t: 3 }],
    ['Volt Tackle', 'atk', 80, 0.94, 16, 'foe', 2, 'strike', { recoil: 0.1 }],
    ['Static Field', 'status', 0, 0.85, 20, 'foes', 3, 'burst', { fx: 'stun', p: 0.35, t: 1 }],
    ['Arc Bolt', 'atk', 85, 0.93, 20, 'foe', 3, 'beam', { fx: 'stun', p: 0.2, t: 1 }],
    ['Thunder Fang', 'atk', 95, 0.92, 24, 'foe', 3, 'strike', { fx: 'stun', p: 0.25, t: 1 }],
    ['Overclock', 'buff', 0, 1, 24, 'allies', 4, 'aura', { fx: 'haste', p: 1, t: 3 }],
    ['Chain Lightning', 'atk', 70, 0.9, 30, 'foes', 4, 'beam', { fx: 'stun', p: 0.15, t: 1 }],
    ['Ion Storm', 'atk', 110, 0.85, 42, 'foes', 5, 'rain'],
    ['Railgun', 'atk', 145, 0.88, 42, 'foe', 5, 'beam', { crit: 0.3 }],
  ],
  flying: [
    ['Peck', 'atk', 40, 0.98, 0, 'foe', 1, 'strike'],
    ['Wing Slap', 'atk', 55, 0.95, 9, 'foe', 1, 'strike'],
    ['Gust', 'atk', 45, 0.92, 14, 'foes', 2, 'burst'],
    ['Feather Dart', 'atk', 30, 0.92, 16, 'foe', 2, 'shot', { multi: 3 }],
    ['Aerial Ace', 'atk', 70, 1, 14, 'foe', 2, 'strike', { sure: true }],
    ['Tailwind', 'buff', 0, 1, 22, 'allies', 3, 'aura', { fx: 'haste', p: 1, t: 3 }],
    ['Dive Bomb', 'atk', 95, 0.9, 22, 'foe', 3, 'strike'],
    ['Roost', 'heal', 0, 1, 16, 'self', 3, 'aura', { heal: 0.4 }],
    ['Cyclone', 'atk', 75, 0.9, 30, 'foes', 4, 'burst', { fx: 'confuse', p: 0.15, t: 2 }],
    ['Talon Rake', 'atk', 100, 0.92, 26, 'foe', 4, 'strike', { fx: 'expose', p: 0.3, t: 3 }],
    ['Sky Lance', 'atk', 110, 0.9, 30, 'foe', 4, 'strike', { crit: 0.3 }],
    ['Hurricane', 'atk', 120, 0.82, 44, 'foes', 5, 'rain'],
  ],
  tech: [
    ['Laser Ping', 'atk', 40, 0.98, 0, 'foe', 1, 'beam'],
    ['Gear Grind', 'atk', 55, 0.95, 9, 'foe', 1, 'strike'],
    ['Target Lock', 'buff', 0, 1, 10, 'self', 1, 'aura', { fx: 'focus', p: 1, t: 3 }],
    ['Bolt Shot', 'atk', 75, 0.94, 16, 'foe', 2, 'shot'],
    ['Repair Kit', 'heal', 0, 1, 18, 'ally', 2, 'aura', { heal: 0.35 }],
    ['Shock Mine', 'atk', 70, 0.92, 18, 'foe', 3, 'burst', { fx: 'stun', p: 0.3, t: 1 }],
    ['Hack', 'status', 0, 0.85, 16, 'foe', 3, 'beam', { fx: 'confuse', p: 0.55, t: 3 }],
    ['Force Field', 'buff', 0, 1, 26, 'allies', 3, 'aura', { fx: 'shield', p: 1, t: 2 }],
    ['Missile Volley', 'atk', 70, 0.9, 32, 'foes', 4, 'rain'],
    ['Plasma Cutter', 'atk', 105, 0.92, 28, 'foe', 4, 'beam', { fx: 'expose', p: 0.25, t: 3 }],
    ['System Overload', 'atk', 110, 0.85, 42, 'foes', 5, 'burst', { fx: 'stun', p: 0.2, t: 1 }],
    ['Orbital Strike', 'atk', 150, 0.85, 46, 'foe', 5, 'rain'],
  ],
  flux: [
    ['Warp Ping', 'atk', 40, 0.98, 0, 'foe', 1, 'shot'],
    ['Rift Swipe', 'atk', 55, 0.95, 9, 'foe', 1, 'strike'],
    ['Blink', 'buff', 0, 1, 10, 'self', 1, 'aura', { fx: 'haste', p: 1, t: 3 }],
    ['Prism Ray', 'atk', 75, 0.94, 16, 'foe', 2, 'beam', { fx: 'confuse', p: 0.15, t: 2 }],
    ['Mirror Veil', 'buff', 0, 1, 16, 'self', 2, 'aura', { fx: 'shield', p: 1, t: 2 }],
    ['Gravity Well', 'atk', 60, 0.92, 24, 'foes', 3, 'burst', { fx: 'slow', p: 0.4, t: 3 }],
    ['Rewind', 'heal', 0, 1, 20, 'self', 3, 'aura', { heal: 0.45 }],
    ['Phase Strike', 'atk', 95, 1, 24, 'foe', 3, 'strike', { sure: true }],
    ['Entropy', 'debuff', 0, 0.9, 22, 'foes', 4, 'burst', { fx: 'expose', p: 1, t: 3 }],
    ['Warp Storm', 'atk', 80, 0.88, 32, 'foes', 4, 'rain', { fx: 'confuse', p: 0.2, t: 2 }],
    ['Singularity', 'atk', 125, 0.82, 46, 'foes', 5, 'burst'],
    ['Star Collapse', 'atk', 155, 0.85, 48, 'foe', 5, 'beam'],
  ],
};

export const SKILLS = {};
export const SKILLS_BY_EL = {};

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_');

for (const [el, list] of Object.entries(T)) {
  SKILLS_BY_EL[el] = [];
  for (const row of list) {
    const [name, kind, pow, acc, cost, tgt, tier, anim, extra = {}] = row;
    const id = slug(name);
    const sk = { id, name, el, kind, pow, acc, cost, tgt, tier, anim, ...extra };
    SKILLS[id] = sk;
    SKILLS_BY_EL[el].push(sk);
  }
}

// Struggle is used when a beast has no stamina for anything and no free move
SKILLS.struggle = { id: 'struggle', name: 'Struggle', el: 'common', kind: 'atk', pow: 30, acc: 1, cost: 0, tgt: 'foe', tier: 0, anim: 'strike', recoil: 0.1, sure: true };

export function describeSkill(sk) {
  const parts = [];
  if (sk.kind === 'atk') parts.push(`Power ${sk.pow}${sk.multi ? ` x${sk.multi}` : ''}`);
  if (sk.heal) parts.push(`Heals ${Math.round(sk.heal * 100)}% HP`);
  if (sk.fx) {
    const st = STATUS[sk.fx];
    const p = Math.round((sk.p ?? 1) * 100);
    parts.push(`${p < 100 ? p + '% ' : ''}${st.name}${sk.fx2 ? ' + ' + STATUS[sk.fx2].name : ''} (${sk.t}t)`);
  }
  if (sk.drain) parts.push(`Drains ${Math.round(sk.drain * 100)}%`);
  if (sk.recoil) parts.push(`Recoil ${Math.round(sk.recoil * 100)}%`);
  if (sk.crit) parts.push('High crit');
  if (sk.sure) parts.push('Never misses');
  const tg = { foe: 'One foe', foes: 'All foes', self: 'Self', ally: 'One ally', allies: 'All allies' }[sk.tgt];
  parts.push(tg);
  if (sk.acc < 1 && !sk.sure) parts.push(`Acc ${Math.round(sk.acc * 100)}%`);
  return parts.join(' · ');
}
