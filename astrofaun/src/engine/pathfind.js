// A* pathfinding on a tile grid. walkable(x, z) -> boolean. 8-directional without corner cutting.
const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];

class Heap {
  constructor() { this.a = []; }
  push(n) { const a = this.a; a.push(n); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() {
    const a = this.a; const top = a[0]; const last = a.pop();
    if (a.length) { a[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < a.length && a[l].f < a[m].f) m = l; if (r < a.length && a[r].f < a[m].f) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } }
    return top;
  }
  get size() { return this.a.length; }
}

export function findPath(sx, sz, tx, tz, walkable, maxNodes = 6000) {
  if (sx === tx && sz === tz) return [[tx, tz]];
  const key = (x, z) => x + ',' + z;
  const h = (x, z) => { const dx = Math.abs(x - tx), dz = Math.abs(z - tz); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  const open = new Heap();
  const g = new Map();
  const came = new Map();
  open.push({ x: sx, z: sz, f: h(sx, sz) });
  g.set(key(sx, sz), 0);
  let n = 0;
  let best = { x: sx, z: sz, h: h(sx, sz) };
  while (open.size && n++ < maxNodes) {
    const cur = open.pop();
    if (cur.x === tx && cur.z === tz) return rebuild(came, key, tx, tz);
    const cg = g.get(key(cur.x, cur.z));
    for (const [dx, dz, c] of DIRS) {
      const nx = cur.x + dx, nz = cur.z + dz;
      if (!walkable(nx, nz)) continue;
      if (dx && dz && (!walkable(cur.x + dx, cur.z) || !walkable(cur.x, cur.z + dz))) continue;
      const k = key(nx, nz);
      const ng = cg + c;
      if (ng < (g.get(k) ?? Infinity)) {
        g.set(k, ng);
        came.set(k, [cur.x, cur.z]);
        const hh = h(nx, nz);
        if (hh < best.h) best = { x: nx, z: nz, h: hh };
        open.push({ x: nx, z: nz, f: ng + hh });
      }
    }
  }
  // unreachable: go as close as possible
  if (best.x === sx && best.z === sz) return null;
  return rebuild(came, key, best.x, best.z);
}

function rebuild(came, key, x, z) {
  const path = [[x, z]];
  let k = key(x, z);
  while (came.has(k)) {
    const [px, pz] = came.get(k);
    path.push([px, pz]);
    k = key(px, pz);
  }
  return path.reverse();
}

/** Nearest walkable cell next to (x, z) (for interacting with blocked objects). */
export function adjacentCell(x, z, fromX, fromZ, walkable, radius = 1) {
  let best = null, bd = Infinity;
  for (let dz = -radius; dz <= radius; dz++) for (let dx = -radius; dx <= radius; dx++) {
    if (!dx && !dz) continue;
    const nx = x + dx, nz = z + dz;
    if (!walkable(nx, nz)) continue;
    const d = Math.hypot(nx - fromX, nz - fromZ) + Math.hypot(dx, dz) * 0.3;
    if (d < bd) { bd = d; best = [nx, nz]; }
  }
  return best;
}
