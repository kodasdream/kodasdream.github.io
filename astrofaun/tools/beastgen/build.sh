#!/usr/bin/env bash
# Regenerates beast GLBs: Blender (bpy) sculpt + rig, then meshopt compression via gltf-transform.
#   PY=/path/to/python-with-bpy GT=/path/to/gltf-transform tools/beastgen/build.sh [--ids 1,2,3 | --all]
set -euo pipefail
cd "$(dirname "$0")/../.."
PY=${PY:-python3}
GT=${GT:-gltf-transform}
RAW=${RAW:-/tmp/beastgen-raw}
node tools/beastgen/export_genomes.mjs > tools/beastgen/genomes.json
"$PY" tools/beastgen/beastgen.py --out "$RAW" "$@"
mkdir -p assets/beasts
for f in "$RAW"/*.glb; do
  "$GT" meshopt "$f" "assets/beasts/$(basename "$f")" --quantize-generic 10 >/dev/null
done
cp "$RAW/index.json" assets/beasts/index.json
