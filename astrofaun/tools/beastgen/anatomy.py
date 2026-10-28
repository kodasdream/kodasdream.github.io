"""Beast anatomy: turns a species genome into sculpt primitives, explicit hard-surface parts,
a bone hierarchy and attachment sockets.

Game space: x = right, y = up, z = forward (the beast faces +z), ground at y = 0.
Colour zones (vertex masks read by the game shader):
  second, belly, accent (horn / claw keratin), dark (mouth / nose), tooth, tongue, emit, plain (no pattern)
"""
import math
import random
import numpy as np
from sdf import Prim, Part, Slab, tube, crystal, norm, rot_axis, frame_from, catmull

X = np.array([1.0, 0, 0])
Y = np.array([0, 1.0, 0])
Z = np.array([0, 0, 1.0])
ZONES = ['second', 'belly', 'accent', 'dark', 'tooth', 'tongue', 'emit', 'plain']


def P(*a):
    return np.array(a, dtype=np.float64)


def mir(p):
    q = np.array(p, dtype=np.float64)
    q[0] = -q[0]
    return q


def lerp(a, b, t):
    return np.asarray(a) + (np.asarray(b) - np.asarray(a)) * t


def rotv(v, axis, ang):
    return rot_axis(axis, ang) @ np.asarray(v, dtype=np.float64)


class Beast:
    def __init__(self, sp, voxel=0.0105):
        self.sp = sp
        self.g = sp['genome']
        self.stage = sp['stage']
        self.el = sp['types'][0]
        self.el2 = sp['types'][1] if len(sp['types']) > 1 else None
        self.legend = sp['rarity'] == 'legendary'
        # Family-wide shape decisions stay consistent across evolutions; stage rng adds detail.
        self.rng = random.Random('shape-%d' % sp['family'])
        self.srng = random.Random('stage-%d' % sp['id'])
        self.body = Part('body', voxel)
        self.parts = [self.body]
        self.tubes = []
        self.bones = {}
        self.sockets = {}
        self.paints = []
        self.meta = {}
        self.k = 1 + 0.5 * (self.stage - 1)  # menace factor

    # ------------------------------------------------------------ primitive helpers
    def cone(self, a, b, r1, r2, bone, k=0.04, zone=None, mode='add', squash=None, up=Y, part=None):
        pr = Prim('cone', bone, mode=mode, k=k, zone=zone, a=np.asarray(a, float), b=np.asarray(b, float), r1=r1, r2=r2)
        if squash is not None:
            pr.rot = frame_from(np.asarray(b, float) - np.asarray(a, float), up)
            pr.squash = np.array([squash[0], 1.0, squash[1]])
        (part or self.body).add(pr)
        return pr

    def ell(self, c, r, bone, k=0.04, zone=None, mode='add', rot=None, part=None):
        pr = Prim('ell', bone, mode=mode, k=k, zone=zone, c=np.asarray(c, float), r=np.asarray(r, float), rot=rot)
        (part or self.body).add(pr)
        return pr

    def slab(self, o, ex, ey, poly, h, bone, rad=0.005, k=0.02, zone=None, mode='add', part=None, taper=None):
        pr = Slab(bone, o, ex, ey, poly, h, rad=rad, mode=mode, k=k, zone=zone, taper=taper)
        (part or self.body).add(pr)
        return pr

    def chain(self, pts, radii, bone_of, k=0.03, zone=None, squash=None, up=Y, part=None, samples=None):
        """Smoothly tapered tube of cones along a curve. bone_of(t) names the bone for each segment."""
        n = samples or max(len(pts) * 3, 6)
        C = catmull(pts, n)
        rr = np.interp(np.linspace(0, 1, n), np.linspace(0, 1, len(radii)), radii)
        out = []
        for i in range(n - 1):
            t = (i + 0.5) / (n - 1)
            out.append(self.cone(C[i], C[i + 1], rr[i], rr[i + 1], bone_of(t), k=k, zone=zone, squash=squash, up=up, part=part))
        return C, out

    def paint(self, zone, kind, strength=1.0, soft=0.03, **kw):
        if kind == 'ell':
            pr = Prim('ell', None, mode='paint', k=0, c=np.asarray(kw['c'], float), r=np.asarray(kw['r'], float), rot=kw.get('rot'))
        else:
            pr = Prim('cone', None, mode='paint', k=0, a=np.asarray(kw['a'], float), b=np.asarray(kw['b'], float), r1=kw['r1'], r2=kw['r2'])
        pr.zone = zone
        pr.paint = (strength, soft)
        self.paints.append(pr)
        return pr

    def hard(self, verts, faces, bone, zone='accent', emit=0.0):
        self.tubes.append(dict(verts=verts, faces=faces, bone=bone, zone=zone, emit=emit))

    def horn(self, pts, r0, r1, bone, zone='accent', radial=10, samples=14, flat=1.0, up=Y):
        v, f = tube(pts, r0, r1, radial=radial, samples=samples, flat=flat, up=up)
        self.hard(v, f, bone, zone)

    def bone(self, name, head, tail, parent=None):
        self.bones[name] = dict(head=np.asarray(head, float), tail=np.asarray(tail, float), parent=parent)

    def socket(self, name, pos, bone, **props):
        self.sockets[name] = dict(pos=np.asarray(pos, float), bone=bone, props=props)

    def snap(self, origin, direction, maxd=1.2, inside=True):
        """March from origin along direction until crossing the body surface."""
        d = norm(direction)
        ts = np.linspace(0, maxd, 240)
        pts = np.asarray(origin, float) + ts[:, None] * d
        f = self.body.eval(pts)
        cross = (f > 0) if inside else (f < 0)
        if not cross.any():
            return pts[-1]
        i = int(np.argmax(cross))
        if i == 0:
            return pts[0]
        f0, f1 = f[i - 1], f[i]
        t = ts[i - 1] + (ts[i] - ts[i - 1]) * (-f0) / (f1 - f0 + 1e-12)
        return np.asarray(origin, float) + d * t

    def normal_at(self, p, e=0.004):
        p = np.asarray(p, float)
        pts = np.array([p + X * e, p - X * e, p + Y * e, p - Y * e, p + Z * e, p - Z * e])
        f = self.body.eval(pts)
        return norm(P(f[0] - f[1], f[2] - f[3], f[4] - f[5]))

    def pick(self, opts):
        return self.rng.choice(opts)

    # ------------------------------------------------------------ head
    def head(self, Hc, R, parent, fwd=Z, face=True, body_head=False):
        """Cranium, face, mouth, teeth, eye sockets, ears, horns and head tufts."""
        g, hd = self.g, self.g['head']
        f = norm(fwd)
        u = norm(Y - f * np.dot(Y, f))
        s = np.cross(u, f)
        self.H = dict(c=np.asarray(Hc, float), R=R, f=f, u=u, s=s)
        shape = hd['shape']
        rx, ry, rz = {'round': (1, 0.96, 0.95), 'wide': (1.2, 0.88, 0.95), 'tall': (0.92, 1.14, 0.94), 'pear': (1.0, 0.98, 0.95),
                      'long': (0.9, 0.88, 1.15), 'bulb': (1.06, 1.08, 1.0), 'flat': (1.16, 0.78, 1.0)}[shape]
        rot = np.stack([s, u, f], axis=1)
        if not body_head:
            self.bone('head', Hc - u * R * 0.2 - f * R * 0.3, Hc + u * R * 0.8 - f * R * 0.3, parent)
            self.ell(Hc, (rx * R, ry * R, rz * R), 'head', k=0.07, rot=rot)
        hb = 'head'
        if shape == 'pear' or g.get('cheeks'):
            for sd in (-1, 1):
                self.ell(Hc + s * sd * R * 0.5 - u * R * 0.35 + f * R * 0.25, (R * 0.42, R * 0.36, R * 0.4), hb, k=0.08, rot=rot)
        # Brow mass gives the face its attitude
        menace = self.stage - 1 + (1 if g['eyes'].get('lid') == 'angry' else 0)
        if menace > 0 and not body_head:
            for sd in (-1, 1):
                self.ell(Hc + s * sd * R * 0.36 + u * R * 0.42 + f * R * 0.62, (R * 0.32, R * 0.14, R * 0.2), hb, k=0.06,
                         rot=np.stack([rotv(s, f, -sd * 0.35), rotv(u, f, -sd * 0.35), f], axis=1))
        if not face:
            return
        st = hd['snoutType']
        mt = g['mouth']['type']
        snout = hd['snout']
        Ls = 0.0
        tip = Hc + f * R * rz * 0.9
        if st in ('muzzle', 'snout') and not body_head:
            Ls = R * (0.22 + 0.62 * snout) if st == 'muzzle' else R * (0.3 + 0.45 * snout)
            base = Hc + f * R * 0.35 - u * R * 0.2
            tip = base + f * (R * 0.5 + Ls) - u * R * 0.1
            r1, r2 = R * 0.56, R * (0.42 if st == 'muzzle' else 0.47)
            self.cone(base, tip, r1, r2, hb, k=0.08, squash=(1.18, 0.82))
            nose_c = tip + f * r2 * 0.62 + u * r2 * 0.45
            if st == 'snout':
                self.ell(tip + f * r2 * 0.55, (r2 * 0.85, r2 * 0.7, r2 * 0.3), hb, k=0.03, zone='belly', rot=rot)
                for sd in (-1, 1):
                    self.ell(tip + f * r2 * 0.85 + s * sd * r2 * 0.32, (r2 * 0.14, r2 * 0.2, r2 * 0.2), hb, k=0.02, mode='sub', rot=rot)
            else:
                self.ell(nose_c, (R * 0.17, R * 0.11, R * 0.12), hb, k=0.04, zone='dark', rot=rot)
            self.meta['muzzle'] = float(Ls)
            tip = tip + f * r2
        if mt == 'beak':
            self.beak(Hc, R, f, u, s, hb)
            return
        if mt == 'mandible':
            self.mandibles(Hc, R, f, u, s, hb)
        else:
            self.mouth(Hc, R, f, u, s, hb, Ls, body_head)
        self.eyes(Hc, R, f, u, s, hb, body_head)

    def eyes(self, Hc, R, f, u, s, hb, body_head):
        E = self.g['eyes']
        rE = R * E['size'] * (1.45 if body_head else 1.62)
        az = E['spacing'] * (0.95 if body_head else 1.05)
        el = 0.2 if not body_head else 0.32
        dirs = []
        if E.get('count', 2) == 1:
            dirs = [(0.0, el + 0.06, rE * 1.3)]
        elif E.get('count', 2) == 3:
            dirs = [(-az * 1.08, el, rE * 0.8), (0.0, el + 0.34, rE * 0.82), (az * 1.08, el, rE * 0.8)]
        else:
            dirs = [(-az, el, rE), (az, el, rE)]
        for i, (a, e, r) in enumerate(dirs):
            d = norm(f * math.cos(a) * math.cos(e) + s * math.sin(a) * math.cos(e) + u * math.sin(e))
            surf = self.snap(Hc, d, maxd=R * 2.5)
            n = self.normal_at(surf)
            n = norm(n * 0.6 + d * 0.4)
            c = surf - n * r * 0.3
            # a shallow socket so the eyeball sits in the face rather than on it
            self.ell(c, (r * 1.0, r * 1.0, r * 1.0), hb, k=0.02, mode='sub')
            self.socket('eye_%d' % i, c, hb, radius=float(r), nx=float(n[0]), ny=float(n[1]), nz=float(n[2]))

    def mouth(self, Hc, R, f, u, s, hb, Ls, body_head):
        g = self.g
        M = g['mouth']
        mt = M['type']
        jaw = g['head']['jaw']
        openness = {'smile': 0.32, 'cat': 0.18, 'buck': 0.26, 'fang1': 0.38, 'grin': 0.55, 'maw': 0.9, 'tusks': 0.6}.get(mt, 0.3)
        openness *= 0.75 + 0.5 * jaw
        w = R * 0.42 * M['w'] * (1.25 if body_head else 1.0)
        if body_head:
            mc = Hc + f * R * 0.62 - u * R * 0.22
        else:
            mc = Hc + f * (R * 0.55 + Ls * 0.55) - u * R * (0.38 if Ls > 0 else 0.3)
        rot = np.stack([s, u, f], axis=1)
        self.meta['mouth_open'] = float(openness)
        if openness < 0.62 or body_head:
            openness = min(openness, 0.75)
            # Crescent mouth: carve an ellipsoid, then restore its upper half to leave a grin-shaped opening.
            h = R * (0.1 + 0.32 * openness)
            depth = R * 0.45
            front = self.snap(mc - f * R * 0.3, f, maxd=R * 2)
            cc = front - f * depth * 0.55
            self.ell(cc, (w, h, depth), hb, k=0.015, mode='sub', rot=rot)
            self.ell(cc + u * h * 0.62 + f * depth * 0.02, (w * 1.08, h * 0.75, depth * 1.05), hb, k=0.02, mode='add2', rot=rot)
            self.paint('dark', 'ell', c=cc, r=(w * 0.98, h * 1.2, depth * 0.95), rot=rot, soft=0.01)
            if mt in ('smile', 'grin', 'cat'):
                self.ell(cc - u * h * 0.55 + f * depth * 0.12, (w * 0.55, h * 0.45, depth * 0.55), hb, k=0.02, zone='tongue', mode='add2', rot=rot)
            rim_y = cc + u * (h * 0.62 - h * 0.75 * 0.9)  # bottom of the restored upper lip
            self.teeth_row(cc, w, h, depth, f, u, s, hb, upper=True, kind=mt)
            if mt in ('grin',):
                self.teeth_row(cc, w, h, depth, f, u, s, hb, upper=False, kind=mt)
        else:
            # Hinged jaw: a separate lower jaw dropped open, with the cavity carved between the jaws.
            hinge = Hc - u * R * 0.3 - f * R * 0.15
            L = R * 0.95 + Ls * 0.9
            ang = 0.28 + 0.45 * openness
            jd = norm(f * math.cos(ang) - u * math.sin(ang))
            jt = hinge + jd * L
            self.bone('jaw', hinge, hinge + jd * L * 0.6, hb)
            self.cone(hinge, jt, R * 0.48, R * 0.34, 'jaw', k=0.06, squash=(1.25, 0.62), up=u)
            self.ell(jt - jd * R * 0.12 - u * R * 0.05, (R * 0.36, R * 0.2, R * 0.28), 'jaw', k=0.05, rot=rot)
            upper_tip = Hc + f * (R * 0.75 + Ls) - u * R * 0.25
            cav_a = hinge + f * R * 0.25 + u * R * 0.02
            cav_b = (upper_tip + jt) * 0.5 + f * R * 0.15
            gap = np.linalg.norm(upper_tip - jt)
            self.cone(cav_a, cav_b, R * 0.18, gap * 0.42, hb, k=0.03, mode='sub', squash=(1.5, 1.0), up=u)
            cav = (cav_a, cav_b, R * 0.18, gap * 0.42, 1.5)
            self.paint('dark', 'cone', a=cav_a - f * R * 0.1, b=cav_b, r1=R * 0.3, r2=gap * 0.5, soft=0.012)
            mid = (cav_a + cav_b) * 0.5
            self.ell(mid - u * gap * 0.22 - f * R * 0.05, (R * 0.3, R * 0.1, R * 0.45), 'jaw', k=0.03, zone='tongue', mode='add2', rot=np.stack([s, norm(np.cross(jd, s)), jd], axis=1))
            self.jaw_teeth(cav, f, u, s, hb, mt)

    def teeth_row(self, cc, w, h, depth, f, u, s, hb, upper, kind):
        n = max(2, int(self.g['mouth']['teeth']))
        rng = self.srng
        xs = []
        if kind == 'fang1':
            xs = [(-0.55, 1.6), (0.55, 1.6)]
        elif kind == 'buck':
            xs = [(-0.13, -1), (0.13, -1)]
        elif kind == 'cat':
            xs = [(-0.42, 0.9), (0.42, 0.9)]
        elif kind == 'smile':
            xs = [(-0.5, 0.85), (0.5, 0.85)] if self.stage > 1 or rng.random() < 0.5 else []
        else:
            for i in range(n):
                t = -0.82 + 1.64 * (i + 0.5) / n
                xs.append((t, 1.0 + (0.6 if abs(abs(t) - 0.55) < 0.18 else 0) + rng.uniform(-0.15, 0.2)))
        for t, size in xs:
            x = w * t
            zf = depth * math.sqrt(max(0.0, 1 - t * t)) * 0.92
            if upper:
                inside = cc + s * x + f * (zf * 0.55) - u * h * 0.55
                root = self.snap(inside, u, maxd=h * 3, inside=False)
                root = root + u * h * 0.12
                if size < 0:  # flat buck teeth
                    v, fc = tube([root, root - u * h * 1.15], h * 0.32, h * 0.3, radial=8, samples=4, flat=0.4, up=f)
                    self.hard(v, fc, hb, 'tooth')
                    continue
                ln = h * (0.75 + 0.55 * size)
                tipp = root - u * ln + f * h * 0.08
                self.hard(*tube([root, tipp], h * 0.24 * size ** 0.5, h * 0.02, radial=8, samples=5), hb, 'tooth')
            else:
                inside = cc + s * x + f * (zf * 0.5) - u * h * 0.4
                root = self.snap(inside, -u, maxd=h * 3, inside=False)
                root = root - u * h * 0.1
                ln = h * (0.55 + 0.4 * size)
                self.hard(*tube([root, root + u * ln + f * h * 0.05], h * 0.22, h * 0.02, radial=8, samples=5), hb, 'tooth')

    def jaw_teeth(self, cav, f, u, s, hb, mt):
        """Teeth around the U-shaped rim of the carved mouth cavity: upper row hangs from the ceiling,
        lower row stands on the floor. cav = (a, b, r1, r2, squash_x) of the carving cone."""
        a, b, r1, r2, sq = cav
        ax = norm(b - a)
        up = norm(np.cross(ax, s))
        if np.dot(up, u) < 0:
            up = -up
        n = int(self.g['mouth']['teeth']) + 2
        rng = self.srng
        R = self.H['R']
        big = R * (0.17 + 0.04 * self.stage)
        for row in (1, -1):
            for i in range(n):
                phi = (i + 0.5) / n * math.pi - math.pi / 2
                t = 0.97 - 0.42 * (abs(phi) / (math.pi / 2)) ** 1.4
                r = r1 + (r2 - r1) * t
                c = a + (b - a) * t
                lat = math.sin(phi) * 0.8
                hgt = math.sqrt(max(0.0, 1 - lat * lat))
                root = c + s * lat * r * sq + up * row * r * hgt * 1.02
                d = -up * row
                fang = abs(abs(math.sin(phi)) - 0.55) < 0.2 and mt != 'grin'
                size = big * (0.6 + 0.4 * rng.random()) * (1.55 if fang else 1)
                bone = hb if row > 0 else 'jaw'
                if mt == 'tusks' and row < 0 and abs(abs(math.sin(phi)) - 0.8) < 0.2:
                    out = s * np.sign(phi)
                    tp = root + d * size * 3.0 + out * size * 0.9 - ax * size * 0.3
                    self.hard(*tube([root - d * size * 0.3, root + d * size * 1.4 + out * size * 0.2, tp], size * 0.45, size * 0.05, radial=10, samples=10), bone, 'tooth')
                    continue
                tipp = root + d * size * 1.3 + ax * size * 0.15
                self.hard(*tube([root - d * size * 0.35, tipp], size * 0.38, size * 0.03, radial=8, samples=5), bone, 'tooth')

    def beak(self, Hc, R, f, u, s, hb):
        L = R * (0.7 + 0.5 * self.g['head']['snout'])
        base = Hc + f * R * 0.7 - u * R * 0.05
        hook = self.rng.random() < 0.5
        mid = base + f * L * 0.6 - u * R * 0.02
        tipp = base + f * L - u * R * (0.28 if hook else 0.12)
        v, fc = tube([base, mid, tipp], R * 0.36, R * 0.02, radial=14, samples=12, flat=0.78, up=u)
        self.hard(v, fc, hb, 'accent')
        lb = base - u * R * 0.17
        v, fc = tube([lb, lb + f * L * 0.62 - u * R * 0.1], R * 0.27, R * 0.03, radial=12, samples=8, flat=0.6, up=u)
        self.hard(v, fc, hb, 'accent')
        self.meta['mouth_open'] = 0.15
        self.eyes(Hc, R, f, u, s, hb, False)

    def mandibles(self, Hc, R, f, u, s, hb):
        for sd in (-1, 1):
            b = Hc + f * R * 0.75 - u * R * 0.35 + s * sd * R * 0.32
            v, fc = tube([b, b + f * R * 0.4 + s * sd * R * 0.12, b + f * R * 0.62 - s * sd * R * 0.12], R * 0.12, R * 0.02, radial=10, samples=10, flat=0.6)
            self.hard(v, fc, hb, 'accent')
        self.meta['mouth_open'] = 0.0

    # ------------------------------------------------------------ head ornaments
    def ears(self, hb='head'):
        H = self.H
        Hc, R, f, u, s = H['c'], H['R'], H['f'], H['u'], H['s']
        E = self.g['ears']
        et, sz = E['type'], E['size'] * R
        if et == 'none':
            return
        for sd in (-1, 1):
            side = s * sd
            name = 'ear_' + ('L' if sd < 0 else 'R')
            if et in ('cat', 'horn', 'bolt'):
                d0 = norm(u * 0.85 + side * 0.5 - f * 0.12)
                base = self.snap(Hc, norm(u * 0.8 + side * 0.6 - f * 0.05), maxd=R * 2) - d0 * R * 0.12
                tipp = base + norm(u + side * 0.45 - f * 0.05) * sz * 0.95
                self.bone(name, base, tipp, hb)
                poly = [(-sz * 0.38, 0), (sz * 0.38, 0), (sz * 0.04, sz * 0.92), (-sz * 0.04, sz * 0.92)] if et != 'bolt' else \
                       [(-sz * 0.3, 0), (sz * 0.25, 0), (sz * 0.05, sz * 0.4), (sz * 0.32, sz * 0.36), (-sz * 0.02, sz * 1.1), (sz * 0.02, sz * 0.55), (-sz * 0.26, sz * 0.58)]
                ey = norm(tipp - base)
                ex = norm(np.cross(ey, f))
                self.slab(base, ex, ey, poly, sz * 0.07, name, rad=sz * 0.06, k=0.05, taper=(1, 0.5))
                if et == 'cat':
                    inner = [(-sz * 0.22, sz * 0.12), (sz * 0.22, sz * 0.12), (sz * 0.02, sz * 0.78), (-sz * 0.02, sz * 0.78)]
                    nn = np.cross(ex, ey)
                    self.slab(base + nn * sz * 0.08, ex, ey, inner, sz * 0.05, name, rad=sz * 0.04, k=0.015, mode='sub')
                    self.paint('second', 'cone', a=base + nn * sz * 0.07 + ey * sz * 0.1, b=base + nn * sz * 0.07 + ey * sz * 0.75, r1=sz * 0.2, r2=sz * 0.05, soft=0.012)
            elif et == 'bunny':
                base = self.snap(Hc, norm(u * 0.9 + side * 0.35), maxd=R * 2) - u * R * 0.1
                d = norm(u + side * 0.28 - f * 0.18)
                tipp = base + d * sz * 1.45
                self.bone(name, base, tipp, hb)
                self.cone(base, lerp(base, tipp, 0.55), sz * 0.16, sz * 0.22, name, k=0.04, squash=(1.0, 0.45), up=f)
                self.cone(lerp(base, tipp, 0.55), tipp, sz * 0.22, sz * 0.1, name, k=0.04, squash=(1.0, 0.45), up=f)
                self.paint('second', 'cone', a=base + f * sz * 0.08 + d * sz * 0.2, b=tipp + f * sz * 0.06 - d * sz * 0.15, r1=sz * 0.1, r2=sz * 0.08, soft=0.012)
            elif et == 'round':
                base = self.snap(Hc, norm(u * 0.7 + side * 0.7), maxd=R * 2)
                d = norm(u * 0.7 + side * 0.75)
                c = base + d * sz * 0.32
                self.bone(name, base, base + d * sz * 0.6, hb)
                rr = frame_from(d, f)
                self.ell(c, (sz * 0.4, sz * 0.38, sz * 0.12), name, k=0.04, rot=np.stack([np.cross(d, f), d, f], axis=1) if True else rr)
                self.ell(c + f * sz * 0.1, (sz * 0.26, sz * 0.24, sz * 0.06), name, k=0.015, mode='sub', rot=np.stack([np.cross(d, f), d, f], axis=1))
                self.paint('second', 'ell', c=c + f * sz * 0.08, r=(sz * 0.27, sz * 0.25, sz * 0.12), rot=np.stack([np.cross(d, f), d, f], axis=1), soft=0.01)
            elif et == 'droop':
                base = self.snap(Hc, norm(u * 0.55 + side * 0.85), maxd=R * 2)
                tipp = base + side * sz * 0.25 - u * sz * 1.0 - f * sz * 0.05
                self.bone(name, base, tipp, hb)
                self.chain([base, base + side * sz * 0.25 - u * sz * 0.2, tipp], [sz * 0.18, sz * 0.24, sz * 0.18], lambda t: name, k=0.04, squash=(0.42, 1.0), up=side)
            elif et == 'tuft':
                base = self.snap(Hc, norm(u * 0.8 + side * 0.55 - f * 0.1), maxd=R * 2) - u * R * 0.05
                self.bone(name, base, base + u * sz * 0.6, hb)
                for j, (a, l) in enumerate([(0.0, 0.85), (0.35, 0.6), (-0.3, 0.55)]):
                    d = norm(u + side * (0.45 + a * 0.6) - f * (0.25 + a * 0.4))
                    self.cone(base, base + d * sz * l, sz * 0.14, sz * 0.015, name, k=0.03)
            elif et == 'fin':
                base = self.snap(Hc, norm(side * 0.95 + u * 0.15 - f * 0.1), maxd=R * 2) - side * R * 0.05
                self.bone(name, base, base + side * sz * 0.7 - f * sz * 0.3, hb)
                ex = norm(-f * 0.85 + side * 0.15)
                ey = norm(side * 0.7 + u * 0.55)
                poly = [(0, -sz * 0.18), (sz * 0.3, -sz * 0.1), (sz * 0.85, sz * 0.15), (sz * 0.55, sz * 0.38), (sz * 0.7, sz * 0.62), (sz * 0.1, sz * 0.48), (-sz * 0.05, sz * 0.2)]
                self.slab(base, ey, -ex if sd > 0 else ex, [(y, x) for x, y in poly], sz * 0.035, name, rad=sz * 0.03, k=0.04, zone='second', taper=(0, 0.45))
            elif et == 'leaf':
                base = self.snap(Hc, norm(u * 0.75 + side * 0.65), maxd=R * 2) - u * R * 0.05
                d = norm(u * 0.6 + side * 0.8 - f * 0.1)
                self.bone(name, base, base + d * sz, hb)
                ex = norm(np.cross(d, f))
                poly = [(0, 0), (sz * 0.28, sz * 0.25), (sz * 0.3, sz * 0.6), (0, sz * 1.15), (-sz * 0.3, sz * 0.6), (-sz * 0.28, sz * 0.25)]
                self.slab(base, ex, d, poly, sz * 0.04, name, rad=sz * 0.03, k=0.04, zone='second', taper=(1, 0.4))
            elif et == 'dish':
                base = self.snap(Hc, norm(side + u * 0.3), maxd=R * 2)
                d = norm(side + u * 0.5)
                self.bone(name, base, base + d * sz * 0.5, hb)
                self.horn([base - d * R * 0.05, base + d * sz * 0.3], sz * 0.08, sz * 0.07, name, 'accent', samples=4)
                c = base + d * sz * 0.38
                self.ell(c, (sz * 0.38, sz * 0.06, sz * 0.38), name, k=0.01, zone='second', rot=frame_from(d, f))

    def horns(self, hb='head'):
        H = self.H
        Hc, R, f, u, s = H['c'], H['R'], H['f'], H['u'], H['s']
        Hn = self.g['horns']
        ht, sz = Hn['type'], Hn['size'] * R
        if ht == 'none':
            return
        if ht == 'unicorn':
            base = self.snap(Hc, norm(u * 0.75 + f * 0.65), maxd=R * 2) - norm(u + f) * R * 0.08
            d = norm(u * 0.7 + f * 0.7)
            v, fc = tube([base, base + d * sz * 0.6, base + d * sz * 1.25 + u * sz * 0.05], sz * 0.16, sz * 0.01, radial=12, samples=12)
            self.hard(v, fc, hb, 'accent')
            return
        if ht == 'crest':
            base = self.snap(Hc, norm(u + f * 0.2), maxd=R * 2)
            for j in range(5):
                a = -0.5 + j * 0.28
                d = norm(u * math.cos(a) - f * math.sin(a) * 1.4)
                self.cone(base - u * R * 0.05 - f * j * R * 0.06, base + d * sz * (0.7 + 0.25 * math.sin(j * 1.3)), sz * 0.1, sz * 0.03, hb, k=0.03, squash=(0.35, 1.0), up=s, zone='second')
            return
        for sd in (-1, 1):
            side = s * sd
            if ht == 'nub':
                base = self.snap(Hc, norm(u + side * 0.55 + f * 0.25), maxd=R * 2) - u * R * 0.04
                v, fc = tube([base, base + norm(u + side * 0.3) * sz * 0.35], sz * 0.15, sz * 0.05, radial=10, samples=5)
            elif ht == 'spike':
                base = self.snap(Hc, norm(u + side * 0.6), maxd=R * 2) - u * R * 0.04
                d = norm(u * 0.9 + side * 0.45 - f * 0.25)
                v, fc = tube([base, base + d * sz * 0.5, base + d * sz * 0.9 - f * sz * 0.15], sz * 0.15, sz * 0.01, radial=10, samples=10)
            elif ht == 'curl':
                base = self.snap(Hc, norm(u + side * 0.62 + f * 0.1), maxd=R * 2) - u * R * 0.04
                pts = [base, base + side * sz * 0.3 + u * sz * 0.3, base + side * sz * 0.5 + u * sz * 0.65 - f * sz * 0.1,
                       base + side * sz * 0.38 + u * sz * 0.95 - f * sz * 0.35, base + side * sz * 0.15 + u * sz * 1.05 - f * sz * 0.4]
                v, fc = tube(pts, sz * 0.16, sz * 0.01, radial=12, samples=16)
            elif ht == 'ram':
                base = self.snap(Hc, norm(u * 0.8 + side * 0.65 - f * 0.1), maxd=R * 2) - u * R * 0.03
                pts = [base]
                for j in range(1, 9):
                    a = j / 8 * math.pi * 1.6
                    rr = sz * (0.42 - 0.03 * j)
                    pts.append(base + side * (sz * 0.18 + 0.05 * sz * j) + u * (math.sin(a) * rr) - f * (rr - math.cos(a) * rr) * 0.9 + f * rr * 0.1 * j / 8)
                v, fc = tube(pts, sz * 0.2, sz * 0.04, radial=12, samples=24)
            elif ht == 'antler':
                base = self.snap(Hc, norm(u + side * 0.5), maxd=R * 2) - u * R * 0.03
                main = [base, base + u * sz * 0.4 + side * sz * 0.15, base + u * sz * 0.8 + side * sz * 0.45 - f * sz * 0.1, base + u * sz * 1.05 + side * sz * 0.85 - f * sz * 0.2]
                v, fc = tube(main, sz * 0.08, sz * 0.02, radial=8, samples=12)
                self.hard(v, fc, hb, 'accent')
                for j, t in enumerate((0.35, 0.65)):
                    C = catmull(main, 20)
                    b = C[int(t * 19)]
                    v, fc = tube([b, b + u * sz * 0.35 + f * sz * 0.12 + side * sz * 0.05 * j], sz * 0.05, sz * 0.015, radial=8, samples=5)
                    self.hard(v, fc, hb, 'accent')
                continue
            elif ht == 'crystal':
                base = self.snap(Hc, norm(u + side * 0.5), maxd=R * 2) - u * R * 0.06
                for j in range(2):
                    d = norm(u + side * (0.35 + 0.35 * j) - f * 0.15 * j)
                    v, fc = crystal(base + side * sz * 0.08 * j, d, sz * (0.75 - 0.25 * j), sz * (0.14 - 0.03 * j))
                    self.hard(v, fc, hb, 'second')
                continue
            elif ht == 'sprout':
                if sd > 0:
                    continue
                base = self.snap(Hc, norm(u - f * 0.1), maxd=R * 2) - u * R * 0.03
                top = base + u * sz * 0.45 + f * sz * 0.05
                self.horn([base, base + u * sz * 0.25 + f * sz * 0.08, top], sz * 0.05, sz * 0.04, hb, 'second', samples=8)
                for sd2 in (-1, 1):
                    ex = norm(s * sd2 + u * 0.35)
                    self.slab(top, ex, np.cross(ex, f) * sd2 * -1 if False else f, [(0, 0), (sz * 0.2, -sz * 0.1), (sz * 0.45, 0), (sz * 0.2, sz * 0.12)], sz * 0.025, hb, rad=sz * 0.02, k=0.01, zone='second')
                continue
            elif ht == 'antenna':
                base = self.snap(Hc, norm(u + side * 0.35 + f * 0.1), maxd=R * 2) - u * R * 0.03
                tipp = base + u * sz * 0.8 + side * sz * 0.3 + f * sz * 0.15
                v, fc = tube([base, base + u * sz * 0.5 + side * sz * 0.08, tipp], sz * 0.035, sz * 0.03, radial=8, samples=10, tip=False)
                self.hard(v, fc, hb, 'accent')
                self.ell(tipp, (sz * 0.12, sz * 0.12, sz * 0.12), hb, k=0.0, zone='second', part=self.ornament_part())
                continue
            else:
                continue
            self.hard(v, fc, hb, 'accent')

    def ornament_part(self):
        if not hasattr(self, '_orn'):
            self._orn = Part('ornament', 0.006)
            self.parts.append(self._orn)
        return self._orn

    def head_tufts(self, hb='head'):
        H = self.H
        Hc, R, f, u, s = H['c'], H['R'], H['f'], H['u'], H['s']
        T = self.g['tufts']
        t = T['head']
        rng = self.rng
        top = self.snap(Hc, norm(u - f * 0.12), maxd=R * 2)
        if t == 'spiky':
            n = 3 + self.stage
            for j in range(n):
                a = (j / (n - 1) - 0.5) * 1.6
                d = norm(u * 0.85 - f * 0.55 + s * a * 0.55)
                b = top - u * R * 0.12 - f * R * 0.12 * abs(a) + s * a * R * 0.3
                self.cone(b, b + d * R * (0.55 + 0.25 * (1 - abs(a))) * (1 + 0.15 * self.stage), R * 0.15, R * 0.012, hb, k=0.035)
        elif t == 'mohawk':
            for j in range(4 + self.stage):
                b = top + f * R * 0.2 - f * j * R * 0.2 - u * R * (0.08 + 0.04 * j)
                d = norm(u * 0.8 - f * 0.6)
                self.cone(b, b + d * R * (0.45 + 0.08 * math.sin(j)), R * 0.17, R * 0.015, hb, k=0.035, squash=(0.38, 1.0), up=s, zone='second')
        elif t in ('tuft', 'curl'):
            b = top + f * R * 0.15
            pts = [b - u * R * 0.05, b + u * R * 0.3 + f * R * 0.15, b + u * R * 0.45 - f * R * 0.05, b + u * R * 0.32 - f * R * 0.15] if t == 'curl' else \
                  [b - u * R * 0.05, b + u * R * 0.35 + f * R * 0.2, b + u * R * 0.42 + f * R * 0.35]
            self.chain(pts, [R * 0.15, R * 0.11, R * 0.03], lambda _: hb, k=0.03)
        if T.get('cheek'):
            for sd in (-1, 1):
                b = Hc + s * sd * R * 0.75 - u * R * 0.2 + f * R * 0.0
                for j in range(2 + (self.stage > 1)):
                    d = norm(s * sd - f * 0.5 - u * (0.25 - 0.3 * j))
                    self.cone(b - u * j * R * 0.12, b - u * j * R * 0.12 + d * R * 0.42, R * 0.12, R * 0.012, hb, k=0.03)

    # ------------------------------------------------------------ tails
    def tail(self, root, back, up, parent, scale=1.0, thick=0.1):
        """root: attachment point, back: direction away from the body."""
        T = self.g['tail']
        tt = T['type']
        sz = T['size'] * scale
        rng = self.rng
        if tt == 'none':
            return
        b = norm(back)
        up = norm(up)
        sd = np.cross(up, b)
        def bones_for(pts):
            C = catmull(pts, 4 + 1)
            names = []
            for i in range(4):
                nm = 'tail%d' % i
                self.bone(nm, C[i], C[i + 1], parent if i == 0 else 'tail%d' % (i - 1))
                names.append(nm)
            return lambda t: names[min(3, int(t * 4))]
        if tt == 'stub':
            pts = [root - b * thick, root + b * sz * 0.18 + up * sz * 0.08, root + b * sz * 0.28 + up * sz * 0.18]
            bo = bones_for(pts)
            self.chain(pts, [thick * 0.9, thick * 1.0, thick * 0.6], bo, k=0.05)
            return
        curl = 0.25 if tt != 'curly' else 1.0
        L = sz * (0.75 if tt != 'long' else 1.05)
        pts = [root - b * thick * 0.5, root + b * L * 0.35 + up * L * 0.12, root + b * L * 0.7 + up * L * 0.35 * curl + up * 0.05,
               root + b * L * 0.85 + up * L * (0.65 if tt == 'curly' else 0.5) - b * L * (0.25 if tt == 'curly' else 0)]
        if tt == 'curly':
            pts.append(root + b * L * 0.55 + up * L * 0.6)
        if tt in ('stinger',):
            pts = [root - b * thick * 0.5, root + b * L * 0.35 + up * L * 0.25, root + b * L * 0.45 + up * L * 0.8, root + b * L * 0.2 + up * L * 1.05]
        bo = bones_for(pts)
        r_end = {'fluffy': thick * 0.6, 'long': thick * 0.12, 'curly': thick * 0.25, 'club': thick * 0.5, 'flame': thick * 0.3,
                 'leaf': thick * 0.25, 'stinger': thick * 0.35, 'bolt': thick * 0.3, 'crystal': thick * 0.35, 'wisp': thick * 0.05,
                 'feather': thick * 0.4, 'fin': thick * 0.4, 'cable': thick * 0.22}.get(tt, thick * 0.3)
        C, _ = self.chain(pts, [thick * 0.95, thick * 0.7, r_end * 1.2, r_end], bo, k=0.05)
        end = C[-1]
        dend = norm(C[-1] - C[-3])
        self.tail_tip(tt, C, end, dend, up, sd, thick, bo)

    def tail_tip(self, tt, C, end, dend, up, sd, thick, bo, tip_bone='tail3'):
        rng = self.rng
        self.socket('tail_tip', end, tip_bone)
        if tt == 'fluffy':
            for j in range(3):
                c = lerp(C[len(C) // 2], end, 0.3 + 0.35 * j) + up * thick * 0.1
                rr = thick * (1.25 + 0.45 * math.sin(j + 1))
                self.ell(c, (rr, rr * 0.92, rr * 1.2), bo(0.6 + 0.13 * j), k=0.08, zone='second' if j == 2 else None, rot=frame_from(dend, up))
            for j in range(5):
                d = norm(dend + sd * rng.uniform(-0.8, 0.8) + up * rng.uniform(-0.3, 0.6))
                self.cone(end - dend * thick * 0.4, end + d * thick * 1.5, thick * 0.55, thick * 0.03, tip_bone, k=0.05, zone='second')
        elif tt == 'club':
            self.ell(end, (thick * 1.3, thick * 1.1, thick * 1.3), tip_bone, k=0.05)
            for j in range(4):
                a = j * math.pi / 2 + 0.4
                d = norm(np.cos(a) * sd + np.sin(a) * up)
                v, fc = tube([end + d * thick * 0.9, end + d * thick * 1.9], thick * 0.3, thick * 0.03, radial=8, samples=4)
                self.hard(v, fc, tip_bone, 'accent')
        elif tt == 'flame':
            for j in range(5):
                d = norm(dend * 0.7 + up * 0.8 + sd * rng.uniform(-0.6, 0.6))
                self.cone(end, end + d * thick * rng.uniform(1.6, 2.6), thick * 0.62, thick * 0.03, tip_bone, k=0.06, zone='emit')
            self.ell(end, (thick * 0.8, thick * 0.8, thick * 0.8), tip_bone, k=0.06, zone='emit')
        elif tt == 'leaf':
            ey = dend
            ex = norm(np.cross(dend, up))
            poly = [(0, -thick * 0.2), (thick * 1.1, thick * 0.8), (thick * 0.9, thick * 2.0), (0, thick * 2.9), (-thick * 0.9, thick * 2.0), (-thick * 1.1, thick * 0.8)]
            self.slab(end, ex, ey, poly, thick * 0.12, tip_bone, rad=thick * 0.08, k=0.05, zone='second', taper=(1, 0.35))
        elif tt == 'stinger':
            v, fc = tube([end, end + dend * thick * 1.8 + up * thick * 0.2, end + dend * thick * 2.6 - up * thick * 0.8], thick * 0.42, thick * 0.02, radial=10, samples=10)
            self.hard(v, fc, tip_bone, 'accent')
        elif tt == 'bolt':
            ey = dend
            ex = norm(np.cross(dend, sd))
            poly = [(-thick * 0.5, 0), (thick * 0.6, thick * 0.1), (thick * 0.1, thick * 1.0), (thick * 1.0, thick * 1.0), (-thick * 0.4, thick * 2.8),
                    (0, thick * 1.6), (-thick * 0.9, thick * 1.6)]
            self.slab(end - dend * thick * 0.3, sd, ey, poly, thick * 0.2, tip_bone, rad=thick * 0.1, k=0.05, zone='second')
        elif tt == 'crystal':
            for j in range(3):
                d = norm(dend + up * (0.3 * j - 0.2) + sd * (0.4 * (j - 1)))
                v, fc = crystal(end - dend * thick * 0.3, d, thick * (2.2 - 0.5 * abs(j - 1)), thick * 0.4)
                self.hard(v, fc, tip_bone, 'second', emit=0.35)
        elif tt == 'wisp':
            for j in range(3):
                d = norm(dend + up * (0.5 - 0.5 * j) + sd * rng.uniform(-0.5, 0.5))
                self.cone(end - dend * thick * 0.2, end + d * thick * (1.5 + 0.4 * j), thick * 0.35, thick * 0.02, tip_bone, k=0.04)
        elif tt == 'feather':
            for j in range(5):
                a = (j - 2) * 0.32
                d = norm(dend * math.cos(a) + sd * math.sin(a) + up * 0.15)
                self.cone(end - dend * thick * 0.5, end + d * thick * (3.2 - 0.35 * abs(j - 2)), thick * 0.45, thick * 0.12, tip_bone, k=0.03,
                          squash=(1.0, 0.25), up=up, zone='second' if j % 2 else None)
        elif tt == 'fin':
            ey = dend
            poly = [(0, 0), (thick * 1.6, thick * 1.8), (thick * 1.3, thick * 2.8), (thick * 0.4, thick * 1.7), (0, thick * 1.5),
                    (-thick * 0.4, thick * 1.7), (-thick * 1.3, thick * 2.8), (-thick * 1.6, thick * 1.8)]
            self.slab(end - dend * thick * 0.6, up, ey, poly, thick * 0.1, tip_bone, rad=thick * 0.06, k=0.06, zone='second', taper=(1, 0.4))
        elif tt == 'cable':
            self.ell(end, (thick * 0.6, thick * 0.6, thick * 0.9), tip_bone, k=0.03, zone='accent', rot=frame_from(dend, up))
            for sd2 in (-1, 1):
                v, fc = tube([end + dend * thick * 0.5 + sd * sd2 * thick * 0.25, end + dend * thick * 1.2 + sd * sd2 * thick * 0.25], thick * 0.12, thick * 0.1, radial=6, samples=3)
                self.hard(v, fc, tip_bone, 'accent')

    # ------------------------------------------------------------ back ornaments
    def back(self, spine, up_fn, bone_fn, girth_fn):
        """spine: list of points along the dorsal line; up_fn(t) gives outward normal; girth_fn(t) the body radius there."""
        Bk = self.g['back']
        bt = Bk['type']
        if bt == 'none' or bt == 'spots':
            return
        sz = Bk['size']
        n = int(Bk['count'])
        C = catmull(spine, 40)
        rng = self.rng
        def at(t):
            i = min(39, max(0, int(t * 39)))
            return C[i], norm(C[min(39, i + 1)] - C[max(0, i - 1)])
        for j in range(n):
            t = 0.12 + 0.76 * j / max(1, n - 1)
            p, tan = at(t)
            nrm = up_fn(t)
            g = girth_fn(t)
            p = self.snap(p - nrm * g * 0.5, nrm, maxd=g * 3) - nrm * g * 0.06
            bone = bone_fn(t)
            hgt = g * sz * (0.9 + 0.5 * math.sin(math.pi * (j + 0.5) / n))
            back = -tan
            if bt in ('spikes', 'flames'):
                d = norm(nrm + back * 0.45)
                self.cone(p - nrm * g * 0.05, p + d * hgt * 1.05, g * 0.2, g * 0.012, bone, k=0.04, zone='emit' if bt == 'flames' else 'second')
            elif bt == 'tufts':
                for q in range(2):
                    sd = np.cross(nrm, tan) * (0.25 if q else -0.25)
                    d = norm(nrm * 0.8 + back * 0.7 + sd)
                    self.cone(p, p + d * hgt * 0.8, g * 0.16, g * 0.012, bone, k=0.035)
            elif bt == 'plates':
                ex = norm(-back)
                self.slab(p - nrm * g * 0.05, ex, nrm, [(-hgt * 0.45, 0), (hgt * 0.45, 0), (hgt * 0.1, hgt * 0.75), (-hgt * 0.15, hgt * 0.7)], g * 0.05, bone,
                          rad=g * 0.04, k=0.04, zone='second', taper=(1, 0.5))
            elif bt == 'crystals':
                d = norm(nrm + back * 0.3 + np.cross(nrm, tan) * rng.uniform(-0.3, 0.3))
                v, fc = crystal(p - nrm * g * 0.08, d, hgt * 0.95, g * 0.16)
                self.hard(v, fc, bone, 'second', emit=0.25)
            elif bt == 'leaves':
                d = norm(nrm + back * 0.6)
                ex = norm(np.cross(d, tan))
                self.slab(p, ex, d, [(0, 0), (hgt * 0.25, hgt * 0.3), (0, hgt * 0.95), (-hgt * 0.25, hgt * 0.3)], g * 0.035, bone, rad=g * 0.03, k=0.03, zone='second', taper=(1, 0.4))
            elif bt == 'mushroom':
                if j % 2:
                    continue
                top = p + nrm * hgt * 0.55
                self.cone(p, top, g * 0.09, g * 0.07, bone, k=0.03, zone='belly')
                self.ell(top, (hgt * 0.38, hgt * 0.2, hgt * 0.38), bone, k=0.02, zone='second', rot=frame_from(nrm, tan) @ np.diag([1, 1, 1]) if False else np.stack([np.cross(nrm, tan), nrm, tan], axis=1))
            elif bt == 'flower':
                if j != n // 2:
                    continue
                c = p + nrm * g * 0.05
                for q in range(5):
                    a = q * 2 * math.pi / 5
                    d = norm(np.cross(nrm, tan) * math.cos(a) + tan * math.sin(a) + nrm * 0.35)
                    self.ell(c + d * hgt * 0.32, (hgt * 0.22, hgt * 0.06, hgt * 0.3), bone, k=0.02, zone='second', rot=np.stack([np.cross(nrm, d), nrm, d], axis=1))
                self.ell(c + nrm * hgt * 0.06, (hgt * 0.14, hgt * 0.1, hgt * 0.14), bone, k=0.02, zone='belly')
            elif bt == 'shell':
                if j != n // 2:
                    continue
                c = p - nrm * g * 0.35
                self.ell(c, (g * 1.12, g * 0.75, g * 1.25 * len(spine) / 3), bone, k=0.06, zone='second', rot=np.stack([np.cross(nrm, tan), nrm, tan], axis=1))
            elif bt == 'fins':
                if j != n // 2:
                    continue
                ex = norm(-back)
                L = g * 2.2
                self.slab(p - nrm * g * 0.1, ex, nrm, [(-L * 0.6, 0), (L * 0.45, 0), (L * 0.1, hgt * 0.7), (-L * 0.35, hgt * 1.05), (-L * 0.6, hgt * 0.4)], g * 0.05, bone,
                          rad=g * 0.04, k=0.05, zone='second', taper=(1, 0.4))
            elif bt == 'vents':
                d = norm(nrm + back * 0.2)
                v, fc = tube([p - d * g * 0.1, p + d * hgt * 0.45], g * 0.12, g * 0.11, radial=10, samples=3, tip=False)
                self.hard(v, fc, bone, 'accent')
                self.ell(p + d * hgt * 0.45, (g * 0.09, g * 0.02, g * 0.09), bone, k=0.0, zone='emit', part=self.ornament_part(), rot=np.stack([np.cross(d, tan), d, tan], axis=1))
            elif bt == 'wisps':
                d = norm(nrm + back * 0.9)
                self.chain([p, p + d * hgt * 0.4 + nrm * hgt * 0.1, p + d * hgt * 0.8 - nrm * hgt * 0.05], [g * 0.15, g * 0.08, g * 0.01], lambda _: bone, k=0.03, zone='second')

    # ------------------------------------------------------------ limbs
    def paw(self, P0, r, bone, fwd=Z, toes=3, claws=True, zone=None):
        f = norm(fwd)
        s = np.cross(Y, f)
        c = P0 + Y * r * 0.55 + f * r * 0.25
        self.ell(c, (r * 1.15, r * 0.62, r * 1.3), bone, k=0.04, zone=zone, rot=np.stack([s, Y, f], axis=1))
        for j in range(toes):
            a = (j - (toes - 1) / 2) * 0.55
            tc = c + f * r * 1.05 * math.cos(a) + s * r * 0.95 * math.sin(a) - Y * r * 0.12
            self.ell(tc, (r * 0.36, r * 0.34, r * 0.36), bone, k=0.035, zone=zone)
            if claws:
                cb = tc + f * r * 0.22 + Y * r * 0.05
                d = norm(f * math.cos(a) + s * math.sin(a) - Y * 0.6)
                v, fc = tube([cb, cb + d * r * 0.42 + f * r * 0.05], r * 0.13, r * 0.01, radial=8, samples=5)
                self.hard(v, fc, bone, 'accent')
        self.paint('belly', 'ell', c=P0 + Y * r * 0.1, r=(r * 1.4, r * 0.25, r * 1.6), soft=0.02, strength=0.6)

    def quad_leg(self, name, top, front, length, r, parent, fwd=Z, splay=0.0):
        """Digitigrade leg from shoulder/hip joint to the ground."""
        side = 1 if top[0] > 0 else -1
        if front:
            elbow = top + P(0, -length * 0.45, -length * 0.08)
            wrist = P(top[0] + side * splay, length * 0.2, top[2] + length * 0.04)
        else:
            elbow = top + P(0, -length * 0.38, length * 0.16)
            wrist = P(top[0] + side * splay, length * 0.24, top[2] - length * 0.16)
        foot = P(wrist[0], 0, wrist[2] + r * 0.15)
        self.bone(name + '_0', top, elbow, parent)
        self.bone(name + '_1', elbow, wrist, name + '_0')
        self.bone(name + '_2', wrist, foot + Z * r, name + '_1')
        if front:
            self.cone(top + P(0, r * 0.4, 0), elbow, r * 1.25, r * 0.78, name + '_0', k=0.07)
        else:
            self.ell(top + P(0, r * 0.1, -r * 0.1), (r * 1.25, r * 1.6, r * 1.55), name + '_0', k=0.09)
            self.cone(top, elbow, r * 1.2, r * 0.72, name + '_0', k=0.06)
        self.cone(elbow, wrist, r * 0.74, r * 0.55, name + '_1', k=0.05)
        self.cone(wrist, foot + Y * r * 0.5, r * 0.55, r * 0.6, name + '_2', k=0.04)
        self.paw(foot, r * 0.95, name + '_2', fwd=fwd)

    def biped_leg(self, name, hip, length, r, parent, plantigrade=True):
        side = 1 if hip[0] > 0 else -1
        knee = hip + P(side * r * 0.25, -length * 0.5, length * 0.12)
        ankle = P(hip[0] + side * r * 0.3, r * 0.75, hip[2] - (0 if plantigrade else length * 0.12))
        foot = P(ankle[0], 0, ankle[2] + r * 0.3)
        self.bone(name + '_0', hip, knee, parent)
        self.bone(name + '_1', knee, ankle, name + '_0')
        self.bone(name + '_2', ankle, foot + Z * r * 1.2, name + '_1')
        self.ell(hip + P(0, -length * 0.12, 0), (r * 1.35, r * 1.6, r * 1.35), name + '_0', k=0.08)
        self.cone(hip, knee, r * 1.15, r * 0.8, name + '_0', k=0.06)
        self.cone(knee, ankle, r * 0.8, r * 0.62, name + '_1', k=0.05)
        self.paw(foot, r * 1.05, name + '_2', fwd=Z)

    def arm(self, name, shoulder, length, r, parent, reach=0.4, claws=True):
        side = 1 if shoulder[0] > 0 else -1
        elbow = shoulder + P(side * length * 0.32, -length * 0.42, -length * 0.02)
        wrist = elbow + P(side * length * 0.08, -length * 0.2, length * reach)
        self.bone(name + '_0', shoulder, elbow, parent)
        self.bone(name + '_1', elbow, wrist, name + '_0')
        hand = wrist + norm(wrist - elbow) * r * 0.9
        self.bone(name + '_2', wrist, hand + norm(wrist - elbow) * r * 0.6, name + '_1')
        self.ell(shoulder, (r * 1.3, r * 1.25, r * 1.25), name + '_0', k=0.07)
        self.cone(shoulder, elbow, r * 1.08, r * 0.78, name + '_0', k=0.05)
        self.cone(elbow, wrist, r * 0.8, r * 0.68, name + '_1', k=0.04)
        d = norm(wrist - elbow)
        self.ell(hand, (r * 0.95, r * 0.8, r * 0.95), name + '_2', k=0.04)
        sd = norm(np.cross(d, Y)) if abs(np.dot(d, Y)) < 0.95 else X
        for j in range(3):
            a = (j - 1) * 0.5
            fd = norm(d * math.cos(a) + sd * math.sin(a) * side)
            tip = hand + fd * r * 0.95
            self.ell(tip, (r * 0.34, r * 0.34, r * 0.34), name + '_2', k=0.03)
            if claws:
                v, fc = tube([tip + fd * r * 0.12, tip + fd * r * 0.5 - Y * r * 0.15], r * 0.13, r * 0.01, radial=8, samples=5)
                self.hard(v, fc, name + '_2', 'accent')
        return hand

    def bug_leg(self, name, top, length, r, parent, ang):
        side = 1 if top[0] > 0 else -1
        out = norm(P(side * math.cos(ang), 0, math.sin(ang)))
        knee = top + out * length * 0.42 + Y * length * 0.22
        foot = top + out * length * 0.62
        foot[1] = 0
        self.bone(name + '_0', top, knee, parent)
        self.bone(name + '_1', knee, foot, name + '_0')
        self.cone(top, knee, r * 1.25, r * 0.95, name + '_0', k=0.035)
        self.ell(knee, (r * 1.05, r * 1.05, r * 1.05), name + '_0', k=0.03)
        self.cone(knee, foot + Y * r * 0.5, r * 0.95, r * 0.55, name + '_1', k=0.025, zone='accent')
        v, fc = tube([foot + Y * r * 0.9, foot + out * r * 0.6], r * 0.55, r * 0.05, radial=8, samples=4)
        self.hard(v, fc, name + '_1', 'accent')

    # ------------------------------------------------------------ wings
    def wings(self, shoulder_l, parent, span, kind, up=Y, back=-Z):
        for sd in (-1, 1):
            name = 'wing_' + ('L' if sd < 0 else 'R')
            part = Part(name, 0.0075)
            self.parts.append(part)
            sh = shoulder_l.copy()
            sh[0] = abs(sh[0]) * sd
            side = X * sd
            elbow = sh + side * span * 0.38 + Y * span * 0.22 + back * span * 0.06
            tipp = sh + side * span * 0.95 + Y * span * 0.42 - back * span * 0.0
            self.bone(name + '0', sh, elbow, parent)
            self.bone(name + '1', elbow, tipp, name + '0')
            th = span * 0.04
            if kind == 'feather':
                self.cone(sh, elbow, th * 1.6, th * 1.1, name + '0', k=0.02, part=part)
                self.cone(elbow, tipp, th * 1.1, th * 0.6, name + '1', k=0.02, part=part)
                nfe = 7
                for j in range(nfe):
                    t = j / (nfe - 1)
                    root = lerp(lerp(sh, elbow, min(1, t * 2)), tipp, max(0, t * 2 - 1) * 0.9)
                    a = 0.15 + 1.05 * (1 - t)
                    d = norm(side * math.cos(a) * (0.3 + 0.7 * t) - Y * (0.25 + 0.3 * (1 - t)) + back * math.sin(a) * 1.1)
                    ln = span * (0.32 + 0.28 * t)
                    bn = name + ('1' if t > 0.45 else '0')
                    self.cone(root, root + d * ln, th * 2.3, th * 1.5, bn, k=0.015, squash=(1.0, 0.2), up=norm(np.cross(d, side)) if abs(np.dot(d, side)) < 0.98 else Y,
                              part=part, zone='second' if t > 0.55 else None)
                for j in range(5):
                    t = j / 4
                    root = lerp(sh, elbow, t) + Y * th * 0.4
                    d = norm(back * 1.0 + side * 0.3 - Y * 0.2)
                    self.cone(root, root + d * span * 0.22, th * 1.4, th * 0.6, name + '0', k=0.02, squash=(1.0, 0.3), up=Y, part=part)
            elif kind in ('bat', 'insect'):
                if kind == 'bat':
                    self.cone(sh, elbow, th * 1.4, th * 0.9, name + '0', k=0.02, part=part)
                    self.cone(elbow, tipp, th * 0.9, th * 0.5, name + '1', k=0.02, part=part)
                    f1 = elbow + side * span * 0.35 - Y * span * 0.18 + back * span * 0.25
                    f2 = elbow + side * span * 0.12 - Y * span * 0.3 + back * span * 0.4
                    for fp in (f1, f2):
                        self.cone(elbow, fp, th * 0.6, th * 0.35, name + '1', k=0.01, part=part)
                    v, fc = tube([tipp, tipp + side * span * 0.06 + Y * span * 0.05], th * 0.5, th * 0.05, radial=8, samples=4)
                    self.hard(v, fc, name + '1', 'accent')
                    pts3 = [sh, elbow, tipp, f1, f2, sh + back * span * 0.25 - Y * span * 0.1]
                else:
                    pts3 = []
                    for q in range(14):
                        a = q / 14 * 2 * math.pi
                        pts3.append(sh + side * span * (0.48 + 0.46 * math.cos(a)) + Y * span * (0.12 + 0.1 * math.cos(a)) + back * span * (0.05 + 0.17 * math.sin(a)))
                # Membrane: a thin plate through the wing's points, scalloped between fingers
                o = sh
                ex = side
                n_ = norm(np.cross(norm(pts3[2] - sh), norm(pts3[-2] - sh)))
                ey = norm(np.cross(n_, ex))
                poly = [((p - o) @ ex, (p - o) @ ey) for p in pts3]
                self.slab(o, ex, ey, poly, th * (0.12 if kind == 'insect' else 0.18), name + '1', rad=th * 0.2, k=0.015,
                          zone='belly' if kind == 'insect' else 'second', part=part, taper=(0, 0.6))
                if kind == 'bat':
                    for a_, b_ in ((tipp, f1), (f1, f2)):
                        mid = (a_ + b_) * 0.5 - ey * span * 0.05 + back * span * 0.04
                        rr = np.linalg.norm(a_ - b_) * 0.3
                        self.ell(mid + norm(mid - sh) * rr * 0.7, (rr, rr, rr), name + '1', k=0.01, mode='sub', part=part)
                if kind == 'insect':
                    sh2 = sh + back * span * 0.2 - Y * span * 0.04
                    pts4 = [sh2 + side * span * (0.36 + 0.34 * math.cos(q / 12 * 2 * math.pi)) + back * span * (0.16 + 0.13 * math.sin(q / 12 * 2 * math.pi)) for q in range(12)]
                    poly2 = [((p - o) @ ex, (p - o) @ ey) for p in pts4]
                    self.slab(o, ex, ey, poly2, th * 0.12, name + '1', rad=th * 0.18, k=0.01, zone='belly', part=part)
            self.socket(name + '_tip', tipp, name + '1')
