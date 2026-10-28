// Dumps every species' genome and the data the Blender generator needs to JSON.
// Usage: node tools/beastgen/export_genomes.mjs > tools/beastgen/genomes.json
import { SPECIES, FAMILIES } from '../../src/data/beasts.js';

const out = SPECIES.map((sp) => ({
  id: sp.id, name: sp.name, family: sp.family, stage: sp.stage, maxStage: sp.maxStage,
  types: sp.types, rarity: sp.rarity, role: sp.role, body: sp.body, genome: sp.genome,
}));
process.stdout.write(JSON.stringify({ count: out.length, families: FAMILIES.length, species: out }));
