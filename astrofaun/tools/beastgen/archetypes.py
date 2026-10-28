"""Body plans. Each builder lays out the skeleton for one genome body type and calls the shared
anatomy modules (head, limbs, tail, back ornaments, wings)."""
import math
import numpy as np
from anatomy import P, X, Y, Z, norm, lerp, mir
from sdf import catmull, tube


def _features(B, wings_at=None, wing_parent='spine1', span=0.9):
    B.ears()
    B.horns()
    B.head_tufts()
    w = B.g['wings']['type']
    if w != 'none' and wings_at is not None:
        B.wings(wings_at, wing_parent, span * B.g['wings']['size'], w)


def quad(B):
    g, rng = B.g, B.rng
    build = g['build']
    T, Lm = g['torso'], g['limbs']
    style = rng.choice(['canine', 'feline', 'ursine', 'saurian']) if build != 'low' else rng.choice(['saurian', 'mustelid'])
    legF = {'stocky': 0.82, 'low': 0.55, 'tall': 1.15}[build] * (0.85 if style == 'ursine' else 1.0)
    leg = 0.36 * Lm['len'] * legF
    rl = 0.068 * Lm['thick'] * (1.2 if build == 'stocky' or style == 'ursine' else 1.0)
    Lt = 0.5 * T['d'] * (1.35 if build == 'low' or style == 'mustelid' else 1.0)
    Rc = 0.25 * T['w'] * (1.12 if build == 'stocky' else 1.0)
    Rh = Rc * (0.8 if style in ('canine', 'feline') else 0.95)
    hipY = leg + Rh * 0.55
    chestY = hipY + Rc * 0.18 + (0.03 if style == 'canine' else 0)
    zc, zh = Lt / 2, -Lt / 2
    chest, hips = P(0, chestY, zc), P(0, hipY, zh)
    mid = (chest + hips) / 2 - P(0, Rc * 0.08, 0)
    B.bone('root', P(0, 0, 0), P(0, 0.15, 0))
    B.bone('spine0', hips, mid, 'root')
    B.bone('spine1', mid, chest, 'spine0')
    B.ell(chest + P(0, 0, Rc * 0.1), (Rc, Rc * 1.06 * T['h'], Rc * 1.18), 'spine1', k=0.12)
    B.ell(hips, (Rh, Rh * T['h'], Rh * 1.15), 'spine0', k=0.12)
    B.cone(mid, chest - P(0, Rc * 0.12, 0), Rc * 0.82, Rc * 0.88, 'spine1', k=0.1)
    B.cone(hips - P(0, Rh * 0.05, 0), mid, Rh * 0.88, Rc * 0.82, 'spine0', k=0.1)
    B.paint('belly', 'ell', c=P(0, mid[1] - Rc * 0.75, mid[2] + Rc * 0.2), r=(Rc * 0.72, Rc * 0.55, Lt * 0.62 + Rc * 0.4), soft=0.035)
    # Neck and head
    R = Rc * (1.02 * g['head']['size'] / 0.77) * (0.95 if style == 'ursine' else 1.0)
    neck0 = chest + P(0, Rc * 0.35, Rc * 0.55)
    up = 0.75 if style != 'saurian' else 0.35
    Hc = chest + P(0, Rc * up + R * 0.42, Rc * 0.95 + R * 0.55)
    B.bone('neck', neck0, Hc - P(0, R * 0.25, R * 0.3), 'spine1')
    B.cone(neck0, Hc - P(0, R * 0.25, R * 0.25), Rc * 0.68, R * 0.6, 'neck', k=0.09)
    B.paint('belly', 'cone', a=chest + P(0, -Rc * 0.2, Rc * 0.8), b=Hc + P(0, -R * 0.55, R * 0.35), r1=Rc * 0.45, r2=R * 0.4, soft=0.035)
    B.head(Hc, R, 'neck')
    # Legs
    splay = rl * 0.3
    for sd in (-1, 1):
        s = 'L' if sd < 0 else 'R'
        topF = chest + P(sd * Rc * 0.6, -Rc * 0.38, Rc * 0.05)
        topB = hips + P(sd * Rh * 0.62, -Rh * 0.2, -Rh * 0.12)
        B.quad_leg('leg_%s0' % s, topF, True, topF[1], rl, 'spine1')
        B.quad_leg('leg_%s1' % s, topB, False, topB[1], rl * 1.05, 'spine0')
    T_ = g['tufts']
    if T_.get('mane'):
        for j in range(9):
            a = (j / 8 - 0.5) * 2.8
            d = norm(P(math.sin(a), math.cos(a) * 0.9 + 0.2, -0.75))
            b = neck0 + P(math.sin(a) * Rc * 0.55, math.cos(a) * Rc * 0.45 + Rc * 0.2, Rc * 0.15)
            B.cone(b, b + d * Rc * 0.75, Rc * 0.24, Rc * 0.02, 'neck', k=0.05, zone='second')
    if T_.get('chest'):
        for j in range(3):
            b = chest + P((j - 1) * Rc * 0.28, -Rc * 0.1, Rc * 0.95)
            B.cone(b, b + P((j - 1) * Rc * 0.1, -Rc * 0.45, Rc * 0.25), Rc * 0.2, Rc * 0.02, 'spine1', k=0.05, zone='belly')
    B.tail(hips + P(0, Rh * 0.25, -Rh * 0.85), P(0, 0.35, -1), Y, 'spine0', scale=0.9, thick=Rh * 0.32)
    spine = [hips + P(0, Rh * 0.5, -Rh * 0.3), mid + P(0, Rc * 0.6, 0), chest + P(0, Rc * 0.75, Rc * 0.1)]
    B.back(spine, lambda t: norm(P(0, 1, 0.15 * (t - 0.5))), lambda t: 'spine0' if t < 0.5 else 'spine1', lambda t: Rh + (Rc - Rh) * t)
    _features(B, wings_at=chest + P(Rc * 0.5, Rc * 0.55, -Rc * 0.1), span=1.0)
    B.meta.update(kind='quad', style=style, length=float(Lt + Rc * 2 + R * 2))


def biped(B):
    g, rng = B.g, B.rng
    build = g['build']
    T, Lm = g['torso'], g['limbs']
    legF = {'chibi': 0.6, 'pear': 0.78, 'athletic': 1.1, 'hunch': 0.85}[build]
    leg = 0.32 * Lm['len'] * legF
    rl = 0.075 * Lm['thick'] * (1.15 if build in ('pear', 'hunch') else 1.0)
    Rp = 0.25 * T['w'] * (1.2 if build == 'pear' else 1.0)
    Rch = 0.24 * T['w'] * (1.15 if build in ('athletic', 'hunch') else 0.95)
    th = 0.36 * T['h'] * (0.7 if build == 'chibi' else 1.0)
    lean = {'chibi': 0.0, 'pear': 0.02, 'athletic': 0.06, 'hunch': 0.2}[build]
    pelvis = P(0, leg + Rp * 0.5, 0)
    chest = pelvis + P(0, th, lean)
    B.bone('root', P(0, 0, 0), P(0, 0.15, 0))
    B.bone('spine0', pelvis, (pelvis + chest) / 2, 'root')
    B.bone('spine1', (pelvis + chest) / 2, chest, 'spine0')
    B.ell(pelvis, (Rp * 1.05, Rp, Rp * 0.92), 'spine0', k=0.1)
    B.ell(chest, (Rch * 1.12, Rch * 0.95, Rch * 0.92), 'spine1', k=0.12)
    B.cone(pelvis, chest, Rp * 0.9, Rch * 0.85, 'spine0', k=0.1)
    B.paint('belly', 'ell', c=(pelvis + chest) / 2 + P(0, -Rp * 0.1, Rp * 0.65), r=(Rp * 0.68, th * 0.62 + Rp * 0.25, Rp * 0.5), soft=0.035)
    R = Rch * (1.18 if build == 'chibi' else 0.98) * g['head']['size'] / 0.77
    if build == 'hunch':
        Hc = chest + P(0, Rch * 0.35 + R * 0.35, Rch * 0.6 + R * 0.35)
    else:
        Hc = chest + P(0, Rch * 0.7 + R * 0.62 + (0.03 if build != 'chibi' else -0.03), Rch * 0.08)
    neck0 = chest + P(0, Rch * 0.6, 0)
    B.bone('neck', neck0, Hc - P(0, R * 0.3, 0), 'spine1')
    B.cone(neck0, Hc - P(0, R * 0.35, R * 0.1), Rch * 0.62, R * 0.55, 'neck', k=0.09)
    B.head(Hc, R, 'neck')
    for sd in (-1, 1):
        s = 'L' if sd < 0 else 'R'
        B.biped_leg('leg_%s0' % s, pelvis + P(sd * Rp * 0.55, -Rp * 0.35, 0), pelvis[1] - Rp * 0.35, rl * 1.1, 'spine0', plantigrade=build != 'athletic')
        sh = chest + P(sd * Rch * 0.95, Rch * 0.25, -Rch * 0.05)
        alen = (0.34 if build != 'hunch' else 0.5) * Lm['len']
        B.arm('arm_' + s, sh, alen, rl * 0.92, 'spine1', reach=0.35 if build != 'hunch' else 0.55)
    T_ = g['tufts']
    if T_.get('mane'):
        for j in range(9):
            a = (j / 8 - 0.5) * 3.2
            d = norm(P(math.sin(a), 0.6, -math.cos(a) * 0.6 - 0.2))
            b = neck0 + P(math.sin(a) * Rch * 0.6, Rch * 0.1, -math.cos(a) * Rch * 0.35)
            B.cone(b, b + d * Rch * 0.7, Rch * 0.25, Rch * 0.02, 'neck', k=0.05, zone='second')
    if T_.get('chest'):
        for j in range(3):
            b = chest + P((j - 1) * Rch * 0.3, Rch * 0.1, Rch * 0.75)
            B.cone(b, b + P((j - 1) * Rch * 0.1, -Rch * 0.4, Rch * 0.25), Rch * 0.2, Rch * 0.02, 'spine1', k=0.05, zone='belly')
    B.tail(pelvis + P(0, -Rp * 0.1, -Rp * 0.85), P(0, -0.1, -1), Y, 'spine0', scale=0.8, thick=Rp * 0.3)
    spine = [pelvis + P(0, Rp * 0.2, -Rp * 0.85), (pelvis + chest) / 2 + P(0, 0, -Rch * 0.85), chest + P(0, Rch * 0.35, -Rch * 0.8)]
    B.back(spine, lambda t: norm(P(0, 0.25, -1)), lambda t: 'spine0' if t < 0.5 else 'spine1', lambda t: Rp + (Rch - Rp) * t)
    _features(B, wings_at=chest + P(Rch * 0.55, Rch * 0.35, -Rch * 0.6), span=1.0)
    B.meta.update(kind='biped', style=build)


def blob(B):
    g, rng = B.g, B.rng
    T = g['torso']
    R = 0.4 * T['w'] * (0.95 + 0.1 * B.stage)
    Ry = R * T['h'] * 0.95
    c = P(0, Ry * 0.92 + 0.05, 0)
    B.bone('root', P(0, 0, 0), P(0, 0.15, 0))
    B.bone('spine0', c - P(0, Ry * 0.6, 0), c, 'root')
    B.bone('head', c, c + P(0, Ry * 0.9, 0), 'spine0')
    B.ell(c, (R * 1.04, Ry, R * 0.98), 'spine0', k=0.1)
    B.ell(c + P(0, Ry * 0.35, R * 0.05), (R * 0.9, Ry * 0.7, R * 0.88), 'head', k=0.15)
    B.paint('belly', 'ell', c=c + P(0, -Ry * 0.35, R * 0.55), r=(R * 0.7, Ry * 0.6, R * 0.55), soft=0.04)
    Hc = c + P(0, Ry * 0.12, 0)
    B.head(Hc, R, 'spine0', body_head=True)
    feet = 2 if rng.random() < 0.6 else 4
    rl = R * 0.2
    for sd in (-1, 1):
        s = 'L' if sd < 0 else 'R'
        zs = [R * 0.1] if feet == 2 else [R * 0.4, -R * 0.4]
        for i, z in enumerate(zs):
            name = 'leg_%s%d' % (s, i)
            top = P(sd * R * 0.5, rl * 1.8, z)
            foot = P(sd * R * 0.55, 0, z + rl * 0.3)
            B.bone(name + '_0', top + P(0, rl, 0), top, 'spine0')
            B.bone(name + '_1', top, foot, name + '_0')
            B.bone(name + '_2', foot, foot + P(0, 0, rl), name + '_1')
            B.cone(top + P(0, rl, 0), foot + P(0, rl * 0.6, 0), rl * 1.1, rl * 0.9, name + '_1', k=0.05)
            B.paw(foot, rl * 1.0, name + '_2', toes=3, claws=B.stage > 1)
        if rng.random() < 0.7 or B.stage > 1:
            sh = c + P(sd * R * 0.92, -Ry * 0.05, R * 0.25)
            B.bone('arm_%s_0' % s, sh - P(sd * R * 0.1, 0, 0), sh + P(sd * R * 0.2, -R * 0.15, 0), 'spine0')
            B.cone(sh - P(sd * R * 0.1, 0, 0), sh + P(sd * R * 0.22, -R * 0.2, R * 0.08), R * 0.16, R * 0.13, 'arm_%s_0' % s, k=0.05)
    B.tail(c + P(0, -Ry * 0.4, -R * 0.9), P(0, 0.2, -1), Y, 'spine0', scale=0.7, thick=R * 0.2)
    spine = [c + P(0, Ry * 0.2, -R * 0.85), c + P(0, Ry * 0.85, -R * 0.35), c + P(0, Ry * 1.0, R * 0.05)]
    B.back(spine, lambda t: norm(P(0, 0.4 + 0.6 * t, -1 + t)), lambda t: 'spine0' if t < 0.6 else 'head', lambda t: R * 0.5)
    _features(B, wings_at=c + P(R * 0.6, Ry * 0.3, -R * 0.45), wing_parent='spine0', span=1.0)
    B.meta.update(kind='blob')




def serpent(B):
    g, rng = B.g, B.rng
    T = g['torso']
    R = 0.15 * T['w'] * (1 + 0.08 * B.stage)
    L = 1.05 * T['d']
    wig = rng.uniform(0.18, 0.3)
    # Ground coil from the tail tip forward, then the neck rears up
    path = [P(wig * 0.6, R * 0.35, -L * 0.95), P(-wig, R * 0.7, -L * 0.6), P(wig, R * 0.95, -L * 0.25),
            P(-wig * 0.4, R, L * 0.08), P(0, R * 1.4 + 0.12, L * 0.28)]
    Rh = R * 1.55 * g['head']['size'] / 0.77
    Hc = P(0, R * 2.2 + 0.32 + Rh * 0.4, L * 0.38 + Rh * 0.3)
    neck_top = Hc - P(0, Rh * 0.55, Rh * 0.45)
    path.append(neck_top)
    C = catmull(path, 48)
    radii = np.interp(np.linspace(0, 1, 48), [0, 0.15, 0.45, 0.75, 1], [R * 0.12, R * 0.6, R, R * 0.92, Rh * 0.62])
    B.bone('root', P(0, 0, 0), P(0, 0.15, 0))
    nb = 6
    idx = np.linspace(8, 47, nb + 1).astype(int)
    for i in range(nb):
        B.bone('spine%d' % i, C[idx[i]], C[idx[i + 1]], 'root' if i == 0 else 'spine%d' % (i - 1))
    tidx = np.linspace(0, 8, 5).astype(int)
    for i in range(4):
        # tail bones run from the body toward the tip
        B.bone('tail%d' % i, C[tidx[4 - i]], C[tidx[3 - i]], 'spine0' if i == 0 else 'tail%d' % (i - 1))
    def bone_at(j):
        if j < 8:
            return 'tail%d' % min(3, 3 - int(j / 2))
        return 'spine%d' % min(nb - 1, int((j - 8) / (40 / nb)))
    for j in range(47):
        B.cone(C[j], C[j + 1], radii[j], radii[j + 1], bone_at(j), k=0.05, squash=(1.12, 0.92))
        if 6 < j < 44:
            B.paint('belly', 'cone', a=C[j] - P(0, radii[j] * 0.75, 0) + norm(np.cross(Y, C[j + 1] - C[j])) * 0, b=C[j + 1] - P(0, radii[j + 1] * 0.75, 0),
                    r1=radii[j] * 0.62, r2=radii[j + 1] * 0.62, soft=0.025)
    B.head(Hc, Rh, 'spine%d' % (nb - 1))
    if (B.el == 'venom' or B.el2 == 'venom') and rng.random() < 0.6:
        hc = neck_top - P(0, Rh * 0.2, Rh * 0.35)
        B.ell(hc, (Rh * 1.35, Rh * 1.15, Rh * 0.16), 'spine%d' % (nb - 1), k=0.05)
        B.paint('second', 'ell', c=hc + P(0, 0, Rh * 0.12), r=(Rh * 1.0, Rh * 0.85, Rh * 0.12), soft=0.02)
    end, dend = C[0], norm(C[0] - C[3])
    tt = g['tail']['type']
    if tt in ('fin', 'leaf', 'stinger', 'bolt', 'crystal', 'flame', 'feather', 'club', 'fluffy', 'wisp'):
        B.tail_tip(tt, C, end, dend, Y, norm(np.cross(Y, dend)), R * 0.45, lambda t: 'tail3')
    spine = [C[10] + P(0, radii[10], 0), C[24] + P(0, radii[24], 0), C[38] + P(0, radii[38], 0)]
    B.back(spine, lambda t: Y, lambda t: 'spine%d' % min(nb - 1, int(t * nb)), lambda t: R)
    _features(B, wings_at=C[40] + P(radii[40] * 0.6, radii[40] * 0.5, 0), wing_parent='spine%d' % (nb - 2), span=1.1)
    B.meta.update(kind='serpent')


def avian(B):
    g, rng = B.g, B.rng
    T, Lm = g['torso'], g['limbs']
    sleek = g['build'] == 'sleek'
    R = 0.3 * T['w'] * (0.88 if sleek else 1.0)
    leg = 0.24 * Lm['len'] * (1.15 if sleek else 0.9)
    c = P(0, leg + R * 0.75, 0)
    tilt = -0.45 if sleek else -0.3
    rot = np.stack([X, norm(P(0, math.cos(tilt), -math.sin(tilt))), norm(P(0, math.sin(tilt), math.cos(tilt)))], axis=1)
    B.bone('root', P(0, 0, 0), P(0, 0.15, 0))
    B.bone('spine0', c - P(0, 0, R * 0.6), c + P(0, R * 0.3, R * 0.4), 'root')
    B.ell(c, (R * 0.86, R * 0.92, R * (1.3 if sleek else 1.12)), 'spine0', k=0.1, rot=rot)
    B.ell(c + P(0, R * 0.25, R * 0.45), (R * 0.72, R * 0.72, R * 0.7), 'spine0', k=0.12)
    B.paint('belly', 'ell', c=c + P(0, -R * 0.2, R * 0.55), r=(R * 0.62, R * 0.8, R * 0.55), soft=0.04)
    Rh = R * 0.78 * g['head']['size'] / 0.77
    Hc = c + P(0, R * 0.8 + Rh * 0.55, R * 0.55)
    B.bone('neck', c + P(0, R * 0.5, R * 0.4), Hc - P(0, Rh * 0.4, 0), 'spine0')
    B.cone(c + P(0, R * 0.5, R * 0.4), Hc - P(0, Rh * 0.4, Rh * 0.1), R * 0.55, Rh * 0.6, 'neck', k=0.1)
    B.head(Hc, Rh, 'neck')
    for sd in (-1, 1):
        s = 'L' if sd < 0 else 'R'
        name = 'leg_%s0' % s
        hip = c + P(sd * R * 0.42, -R * 0.55, -R * 0.05)
        knee = P(sd * R * 0.45, leg * 0.62, -R * 0.02)
        ankle = P(sd * R * 0.45, leg * 0.08, R * 0.05)
        B.bone(name + '_0', hip, knee, 'spine0')
        B.bone(name + '_1', knee, ankle, name + '_0')
        B.bone(name + '_2', ankle, ankle + P(0, 0, R * 0.3), name + '_1')
        B.cone(hip, knee, R * 0.28, R * 0.12, name + '_0', k=0.06)
        B.cone(knee, ankle, R * 0.085, R * 0.07, name + '_1', k=0.02, zone='accent')
        for j, a in enumerate((-0.5, 0, 0.5, math.pi)):
            d = norm(P(math.sin(a), 0, math.cos(a)))
            ln = R * (0.38 if j < 3 else 0.22)
            v, f = tube([ankle, ankle + d * ln * 0.6 + P(0, -R * 0.03, 0), ankle + d * ln - P(0, leg * 0.06, 0)], R * 0.06, R * 0.03, radial=8, samples=6)
            B.hard(v, f, name + '_2', 'accent')
    B.tail(c + P(0, R * 0.05, -R * 1.0), P(0, 0.25, -1), Y, 'spine0', scale=0.75, thick=R * 0.28)
    spine = [c + P(0, R * 0.6, -R * 0.6), c + P(0, R * 0.85, 0), c + P(0, R * 0.95, R * 0.4)]
    B.back(spine, lambda t: Y, lambda t: 'spine0', lambda t: R * 0.6)
    if g['wings']['type'] == 'none':
        g['wings']['type'] = 'feather'
    _features(B, wings_at=c + P(R * 0.6, R * 0.45, R * 0.05), wing_parent='spine0', span=1.25)
    B.meta.update(kind='avian')


def bug(B):
    g, rng = B.g, B.rng
    T, Lm = g['torso'], g['limbs']
    S = 1.0 + 0.05 * B.stage
    leg = 0.24 * Lm['len']
    th = P(0, leg + 0.1, 0.05)
    ab = P(0, leg + 0.14, -0.36 * T['d'])
    B.bone('root', P(0, 0, 0), P(0, 0.15, 0))
    B.bone('spine1', th - P(0, 0, 0.1), th + P(0, 0, 0.12), 'root')
    B.bone('spine0', th - P(0, 0, 0.1), ab - P(0, 0, 0.25), 'spine1')
    rt = 0.17 * T['w'] * S
    ra = 0.26 * T['w'] * S
    B.ell(th, (rt, rt * 0.9, rt * 1.05), 'spine1', k=0.05)
    B.ell(ab, (ra, ra * 0.85 * T['h'], ra * 1.35 * T['d']), 'spine0', k=0.06,
          rot=np.stack([X, norm(P(0, 1, 0.25)), norm(P(0, -0.25, 1))], axis=1))
    B.cone(th, ab, rt * 0.6, ra * 0.5, 'spine0', k=0.04)
    for j in range(3):
        zc = ab[2] - ra * 0.6 + j * ra * 0.55
        B.paint('second', 'ell', c=P(0, ab[1] + ra * 0.55, zc), r=(ra * 1.1, ra * 0.4, ra * 0.16), soft=0.015)
    B.paint('belly', 'ell', c=ab - P(0, ra * 0.7, 0), r=(ra * 0.7, ra * 0.4, ra * 1.1), soft=0.03)
    Rh = 0.19 * g['head']['size'] / 0.77 * S
    Hc = th + P(0, rt * 0.55, rt + Rh * 0.6)
    B.head(Hc, Rh, 'spine1')
    for sd in (-1, 1):
        s = 'L' if sd < 0 else 'R'
        for i, ang in enumerate((0.55, 0.0, -0.6)):
            top = th + P(sd * rt * 0.75, -rt * 0.3, rt * (0.45 - 0.45 * i))
            B.bug_leg('leg_%s%d' % (s, i), top, leg * 1.5, 0.042 * Lm['thick'] * S, 'spine1', ang)
    if g['horns']['type'] == 'none' and rng.random() < 0.7:
        g['horns']['type'] = 'antenna'
    spine = [ab + P(0, ra * 0.7, -ra * 0.6), ab + P(0, ra * 0.85, 0), th + P(0, rt * 0.9, 0)]
    B.back(spine, lambda t: Y, lambda t: 'spine0' if t < 0.7 else 'spine1', lambda t: ra * 0.7)
    tt = g['tail']['type']
    if tt in ('stinger', 'crystal', 'flame', 'bolt', 'leaf'):
        end = ab - P(0, 0, ra * 1.3)
        B.bone('tail0', ab - P(0, 0, ra), end, 'spine0')
        for i in range(1, 4):
            B.bone('tail%d' % i, end, end - P(0, 0, 0.02 * i), 'tail%d' % (i - 1))
        B.tail_tip(tt, [end, end], end, norm(P(0, 0.3, -1)), Y, X, ra * 0.35, lambda t: 'tail3')
    _features(B, wings_at=th + P(rt * 0.5, rt * 0.7, -rt * 0.2), wing_parent='spine1', span=0.85)
    B.meta.update(kind='bug')


def floater(B):
    g, rng = B.g, B.rng
    T = g['torso']
    R = 0.33 * T['w'] * (0.95 + 0.06 * B.stage)
    c = P(0, R * 1.35 + 0.1, 0)
    style = 'jelly' if B.el in ('aquatic', 'flux') and rng.random() < 0.5 else 'drone' if B.el == 'tech' else 'ghost'
    B.bone('root', P(0, 0, 0), P(0, 0.15, 0))
    B.bone('spine0', c - P(0, R * 0.8, 0), c, 'root')
    B.bone('head', c, c + P(0, R, 0), 'spine0')
    B.ell(c, (R, R * 0.98 * T['h'], R * 0.95), 'head', k=0.1)
    B.paint('belly', 'ell', c=c + P(0, -R * 0.35, R * 0.55), r=(R * 0.65, R * 0.55, R * 0.5), soft=0.04)
    B.head(c + P(0, R * 0.05, 0), R, 'spine0', body_head=True)
    if style == 'ghost':
        pts = [c + P(0, -R * 0.35, -R * 0.2), c + P(0, -R * 0.9, -R * 0.55), c + P(0, -R * 1.1, -R * 1.15), c + P(0, -R * 0.85, -R * 1.65)]
        Cc = catmull(pts, 5)
        for i in range(4):
            B.bone('tail%d' % i, Cc[i], Cc[i + 1], 'spine0' if i == 0 else 'tail%d' % (i - 1))
        Ct, _ = B.chain(pts, [R * 0.8, R * 0.55, R * 0.3, R * 0.08], lambda t: 'tail%d' % min(3, int(t * 4)), k=0.08)
        end, dend = Ct[-1], norm(Ct[-1] - Ct[-3])
        B.tail_tip(g['tail']['type'] if g['tail']['type'] in ('wisp', 'flame', 'crystal', 'bolt') else 'wisp', Ct, end, dend, Y, X, R * 0.35, lambda t: 'tail3')
    elif style == 'jelly':
        for j in range(5):
            a = j / 5 * math.pi * 2 + 0.3
            o = P(math.cos(a) * R * 0.55, 0, math.sin(a) * R * 0.55)
            pts = [c + o * 1.1 - P(0, R * 0.5, 0), c + o * 1.2 - P(0, R * 1.05, 0) + P(0, 0, -R * 0.15), c + o * 0.9 - P(0, R * 1.5, 0)]
            name = 'tail%d' % min(j, 3)
            if j < 4:
                B.bone(name, pts[0], pts[-1], 'spine0')
            B.chain(pts, [R * 0.16, R * 0.11, R * 0.03], lambda t, n=name: n, k=0.04, zone='second')
    else:
        B.ell(c + P(0, -R * 0.1, 0), (R * 1.35, R * 0.12, R * 1.35), 'spine0', k=0.03, zone='accent')
        for j in range(4):
            a = j / 4 * math.pi * 2 + math.pi / 4
            B.ell(c + P(math.cos(a) * R * 1.35, -R * 0.1, math.sin(a) * R * 1.35), (R * 0.22, R * 0.08, R * 0.22), 'spine0', k=0.02, zone='emit')
    for sd in (-1, 1):
        s = 'L' if sd < 0 else 'R'
        sh = c + P(sd * R * 0.85, -R * 0.25, R * 0.2)
        B.arm('arm_' + s, sh, R * 0.75, R * 0.14, 'spine0', reach=0.5, claws=B.stage > 1)
    spine = [c + P(0, R * 0.3, -R * 0.9), c + P(0, R * 0.85, -R * 0.4), c + P(0, R * 1.0, R * 0.1)]
    B.back(spine, lambda t: norm(P(0, 0.4 + 0.6 * t, -1 + t)), lambda t: 'head', lambda t: R * 0.5)
    _features(B, wings_at=c + P(R * 0.55, R * 0.2, -R * 0.55), wing_parent='spine0', span=0.9)
    B.meta.update(kind='floater', style=style)


def fish(B):
    g, rng = B.g, B.rng
    T = g['torso']
    R = 0.22 * T['w'] * (1 + 0.06 * B.stage)
    L = 0.42 * T['d']
    c = P(0, R * 1.3 + 0.06, 0)
    B.bone('root', P(0, 0, 0), P(0, 0.15, 0))
    B.bone('spine0', c - P(0, 0, L * 0.6), c, 'root')
    B.bone('spine1', c, c + P(0, 0, L * 0.6), 'spine0')
    B.ell(c + P(0, 0, L * 0.1), (R * 0.95, R * 1.15 * T['h'], L), 'spine1', k=0.1)
    B.cone(c - P(0, 0, L * 0.3), c - P(0, -R * 0.1, L * 1.2), R * 0.85, R * 0.25, 'spine0', k=0.1, squash=(0.75, 1.0))
    B.paint('belly', 'ell', c=c + P(0, -R * 0.75, L * 0.1), r=(R * 0.8, R * 0.6, L * 0.9), soft=0.04)
    Rh = R * 1.0 * g['head']['size'] / 0.77
    Hc = c + P(0, R * 0.15, L * 0.62)
    B.head(Hc, Rh, 'spine1')
    end = c - P(0, -R * 0.1, L * 1.2)
    for i in range(4):
        B.bone('tail%d' % i, c - P(0, 0, L * (0.7 + 0.12 * i)), c - P(0, 0, L * (0.82 + 0.12 * i)), 'spine0' if i == 0 else 'tail%d' % (i - 1))
    B.tail_tip('fin', [end, end], end, norm(P(0, 0.05, -1)), Y, X, R * 0.7, lambda t: 'tail3')
    for sd in (-1, 1):
        s = 'L' if sd < 0 else 'R'
        o = c + P(sd * R * 0.85, -R * 0.35, L * 0.25)
        B.bone('fin_' + s, o, o + P(sd * R * 0.6, -R * 0.2, -R * 0.3), 'spine1')
        B.slab(o, norm(P(sd, -0.3, -0.2)), norm(P(0, 0, -1)), [(0, 0), (R * 0.75, -R * 0.15), (R * 0.95, -R * 0.65), (R * 0.2, -R * 0.4)], R * 0.04, 'fin_' + s, rad=R * 0.04, k=0.04, zone='second')
    if g['back']['type'] == 'none':
        g['back']['type'] = 'fins'
    spine = [c + P(0, R * 0.9, -L * 0.5), c + P(0, R * 1.1, 0), c + P(0, R, L * 0.4)]
    B.back(spine, lambda t: Y, lambda t: 'spine0' if t < 0.5 else 'spine1', lambda t: R * 0.8)
    _features(B, wings_at=None)
    B.meta.update(kind='fish')


BUILDERS = {'quad': quad, 'biped': biped, 'blob': blob, 'serpent': serpent, 'avian': avian, 'bug': bug, 'floater': floater, 'fish': fish}
