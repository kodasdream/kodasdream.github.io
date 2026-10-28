"""Astrofaun beast generator (headless Blender).

Builds every species from its genome: an SDF-sculpted body meshed with marching cubes, smoothed and
decimated in Blender, crisp swept horns/teeth/claws, colour-zone masks and baked ambient occlusion as
vertex attributes, an armature with smooth skin weights, and sockets for eyes and effects.
Exports one Draco-compressed GLB per species to assets/beasts/.

  python tools/beastgen/beastgen.py --ids 1,2,3      (bpy installed as a Python module)
  python tools/beastgen/beastgen.py --all
"""
import argparse
import json
import math
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import numpy as np
import bpy
from mathutils import Matrix, Vector

from anatomy import Beast, ZONES
import archetypes

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'assets', 'beasts')


def to_bl(v):
    v = np.asarray(v, dtype=np.float64)
    return np.stack([v[..., 0], -v[..., 2], v[..., 1]], axis=-1)


def from_bl(v):
    v = np.asarray(v, dtype=np.float64)
    return np.stack([v[..., 0], v[..., 2], -v[..., 1]], axis=-1)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def mesh_object(name, verts, faces):
    me = bpy.data.meshes.new(name)
    me.from_pydata(to_bl(verts).tolist(), [], np.asarray(faces).tolist())
    me.validate(clean_customdata=False)
    me.update()
    return link(bpy.data.objects.new(name, me))


def bake_modifiers(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev)
    old = ob.data
    ob.modifiers.clear()
    ob.data = me
    bpy.data.meshes.remove(old)


def tri_count(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


def clean_part(ob, target_tris, smooth=0.5, iters=4):
    if smooth > 0:
        m = ob.modifiers.new('smooth', 'SMOOTH')
        m.factor = smooth
        m.iterations = iters
    bake_modifiers(ob)
    n = tri_count(ob)
    if n > target_tris:
        m = ob.modifiers.new('dec', 'DECIMATE')
        m.decimate_type = 'COLLAPSE'
        m.ratio = target_tris / n
        m.use_collapse_triangulate = True
        bake_modifiers(ob)


def verts_of(ob):
    co = np.zeros(len(ob.data.vertices) * 3)
    ob.data.vertices.foreach_get('co', co)
    return from_bl(co.reshape(-1, 3))


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def part_data(B, part, V):
    """Zone masks and bone weights for vertices V of an SDF part."""
    prims = [p for p in part.prims if p.mode in ('add', 'add2')]
    D = np.stack([p.dist(V) for p in prims], axis=1)  # V x P
    dmin = D.min(axis=1, keepdims=True)
    wz = np.exp(-(D - dmin) / 0.006)
    wz /= wz.sum(axis=1, keepdims=True)
    zones = np.zeros((len(V), len(ZONES)))
    for i, p in enumerate(prims):
        if p.zone in ZONES:
            zones[:, ZONES.index(p.zone)] += wz[:, i]
    wb = np.exp(-(D - dmin) / 0.028)
    bones = {}
    for i, p in enumerate(prims):
        bones.setdefault(p.bone, np.zeros(len(V)))
        bones[p.bone] += wb[:, i]
    return zones, bones


def apply_paints(B, V, zones):
    for pr in B.paints:
        strength, soft = pr.paint
        d = pr.dist(V)
        w = (1 - smoothstep(-soft, soft, d)) * strength
        zi = ZONES.index(pr.zone)
        zones[:, zi] = np.maximum(zones[:, zi], w)
    return zones


def ambient_occlusion(B, V, N):
    """Classic SDF occlusion: compare the field a few steps along the normal with the step length."""
    occ = np.zeros(len(V))
    w = 1.0
    for i in range(1, 6):
        h = 0.012 * i * i * 0.6 + 0.01
        f = B.body.eval(V + N * h)
        occ += w * np.maximum(0, h - f)
        w *= 0.62
    return np.clip(1 - occ * 4.2, 0.25, 1)


def build_armature(B):
    arm_data = bpy.data.armatures.new('rig')
    arm = link(bpy.data.objects.new('rig', arm_data))
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm_data.edit_bones
    order = list(B.bones.keys())
    created = {}
    def make(name):
        if name in created:
            return created[name]
        d = B.bones[name]
        if d['parent'] and d['parent'] not in created:
            make(d['parent'])
        b = eb.new(name)
        h, t = to_bl(d['head']), to_bl(d['tail'])
        if np.linalg.norm(t - h) < 1e-4:
            t = h + np.array([0, 0, 0.02])
        b.head = Vector(h.tolist())
        b.tail = Vector(t.tolist())
        yax = (t - h) / np.linalg.norm(t - h)
        xd = np.array([1.0, 0, 0]) if abs(yax[0]) < 0.8 else np.array([0, 0, 1.0])
        zax = np.cross(xd, yax)
        b.align_roll(Vector(zax.tolist()))
        if d['parent']:
            b.parent = created[d['parent']]
        created[name] = b
        return b
    for n in order:
        make(n)
    bpy.ops.object.mode_set(mode='OBJECT')
    return arm


def generate(sp, out_dir, target=7200, verbose=True):
    t0 = time.time()
    reset()
    B = Beast(sp)
    builder = archetypes.BUILDERS.get(sp['body'])
    if builder is None:
        raise ValueError('no archetype for ' + sp['body'])
    builder(B)
    pieces = []  # (object, zones[V,8], weights dict, ao)
    for part in B.parts:
        res = part.mesh()
        if res is None:
            continue
        v, f = res
        ob = mesh_object(part.name, v, f)
        tgt = target if part is B.body else (900 if part.name.startswith('wing') else 500)
        clean_part(ob, tgt, smooth=0.5 if part is B.body else 0.3, iters=4 if part is B.body else 2)
        V = verts_of(ob)
        zones, bones = part_data(B, part, V)
        pieces.append((ob, zones, bones))
    n_soft = sum(len(p[0].data.vertices) for p in pieces)
    for i, tb in enumerate(B.tubes):
        ob = mesh_object('hard%d' % i, tb['verts'], tb['faces'])
        n = len(ob.data.vertices)
        zones = np.zeros((n, len(ZONES)))
        zones[:, ZONES.index(tb['zone'])] = 1
        if tb.get('emit'):
            zones[:, ZONES.index('emit')] = tb['emit']
        pieces.append((ob, zones, {tb['bone']: np.ones(n)}))
    # Concatenate every piece into one skinned mesh (explicitly, so vertex order matches the data)
    allV, allF, all_zones, all_bones, offset = [], [], [], {}, 0
    total = sum(len(p[0].data.vertices) for p in pieces)
    for ob, zones, bones in pieces:
        Vp = verts_of(ob)
        tri = []
        for poly in ob.data.polygons:
            vs = list(poly.vertices)
            for k in range(1, len(vs) - 1):
                tri.append((vs[0] + offset, vs[k] + offset, vs[k + 1] + offset))
        allV.append(Vp)
        allF.extend(tri)
        all_zones.append(zones)
        for bn, w in bones.items():
            all_bones.setdefault(bn, np.zeros(total))[offset:offset + len(Vp)] += w
        offset += len(Vp)
    zones = np.concatenate(all_zones, axis=0)
    for ob, _, _ in pieces:
        bpy.data.objects.remove(ob)
    mesh_ob = mesh_object('beast', np.concatenate(allV, axis=0), np.array(allF))
    me = mesh_ob.data
    for p in me.polygons:
        p.use_smooth = True
    V = verts_of(mesh_ob)
    zones = apply_paints(B, V, zones)
    # Tongue and teeth win over the mouth's dark paint
    zones[:, ZONES.index('dark')] *= 1 - np.clip(zones[:, ZONES.index('tongue')] + zones[:, ZONES.index('tooth')], 0, 1)
    me.update()
    nrm = np.zeros(len(V) * 3)
    me.vertices.foreach_get('normal', nrm)
    N = from_bl(nrm.reshape(-1, 3))
    ao = ambient_occlusion(B, V, N)
    ao[n_soft:] = np.maximum(ao[n_soft:], 0.85)
    # Mask attributes (custom glTF attributes must start with an underscore)
    m1 = np.stack([zones[:, 0], zones[:, 1], zones[:, 2], zones[:, 3]], axis=1)
    m2 = np.stack([zones[:, 4], zones[:, 5], zones[:, 6], ao], axis=1)
    for nm, arr in (('_mask', m1), ('_mask2', m2)):
        at = me.attributes.new(nm, 'FLOAT_COLOR', 'POINT')
        at.data.foreach_set('color', np.clip(arr, 0, 1).astype(np.float32).ravel())
    # Skin weights: keep the four strongest bones per vertex
    names = list(all_bones.keys())
    W = np.stack([all_bones[n] for n in names], axis=1)
    top = np.argsort(-W, axis=1)[:, :4]
    Wt = np.take_along_axis(W, top, axis=1)
    Wt = Wt / np.maximum(Wt.sum(axis=1, keepdims=True), 1e-9)
    groups = {n: mesh_ob.vertex_groups.new(name=n) for n in B.bones.keys()}
    for vi in range(len(V)):
        for j in range(4):
            w = float(Wt[vi, j])
            if w > 0.01:
                bn = names[top[vi, j]]
                if bn in groups:
                    groups[bn].add([vi], w, 'REPLACE')
    arm = build_armature(B)
    mesh_ob.parent = arm
    mod = mesh_ob.modifiers.new('rig', 'ARMATURE')
    mod.object = arm
    bpy.context.view_layer.update()
    # Sockets: empties parented to bones, carrying their properties as glTF extras
    for name, sk in B.sockets.items():
        e = link(bpy.data.objects.new(name, None))
        e.empty_display_size = 0.02
        e.parent = arm
        e.parent_type = 'BONE'
        e.parent_bone = sk['bone']
        bpy.context.view_layer.update()
        e.matrix_world = Matrix.Translation(Vector(to_bl(sk['pos']).tolist()))
        for k, v in sk['props'].items():
            e[k] = v
    # Meta for the game: bounds and body plan
    lo, hi = V.min(axis=0), V.max(axis=0)
    meta = dict(B.meta, id=sp['id'], height=float(hi[1]), width=float(hi[0] - lo[0]), depth=float(hi[2] - lo[2]),
                minz=float(lo[2]), maxz=float(hi[2]), tris=int(sum(len(p.vertices) - 2 for p in me.polygons)))
    for k, v in meta.items():
        arm[k] = v
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, '%d.glb' % sp['id'])
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', export_yup=True, export_apply=False,
        export_skins=True, export_animations=False, export_morph=False,
        export_attributes=True, export_extras=True, export_normals=True, export_texcoords=False,
        export_materials='NONE', export_vertex_color='NONE',
    )
    if verbose:
        print('%3d %-12s %-7s tris=%5d bones=%2d  %.1fs  %dkB' % (sp['id'], sp['name'], sp['body'], meta['tris'], len(B.bones), time.time() - t0, os.path.getsize(path) // 1024))
    return meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ids', default='')
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--out', default=OUT)
    ap.add_argument('--target', type=int, default=7200)
    a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
    data = json.load(open(os.path.join(HERE, 'genomes.json')))
    sps = data['species']
    if a.ids:
        want = set(int(x) for x in a.ids.split(','))
        sps = [s for s in sps if s['id'] in want]
    elif not a.all:
        sps = sps[:3]
    metas = {}
    for sp in sps:
        try:
            metas[sp['id']] = generate(sp, a.out, a.target)
        except Exception as e:  # keep going; report at the end
            import traceback
            traceback.print_exc()
            print('FAILED', sp['id'], sp['body'], e)
    idx = os.path.join(a.out, 'index.json')
    old = json.load(open(idx)) if os.path.exists(idx) else {}
    old.update({str(k): v for k, v in metas.items()})
    json.dump(old, open(idx, 'w'), indent=0)


if __name__ == '__main__':
    main()
