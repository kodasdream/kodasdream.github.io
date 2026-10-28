"""Signed-distance sculpting kernel for the beast generator.

Shapes are described as primitives (tapered capsules, ellipsoids, rounded boxes) that are
smoothly unioned or carved, evaluated on a sparse voxel grid and meshed with marching cubes.
Paint primitives carry no geometry; they only tint vertices that fall inside them.
Tubes are explicit swept meshes for crisp horns, claws, teeth and antennae.
"""
import math
import numpy as np
from skimage.measure import marching_cubes

V3 = lambda *a: np.array(a if len(a) == 3 else a[0], dtype=np.float64)


def norm(v):
    v = np.asarray(v, dtype=np.float64)
    n = np.linalg.norm(v)
    return v / n if n > 1e-12 else v


def rot_axis(axis, ang):
    """Rotation matrix (columns = rotated basis) about an axis."""
    x, y, z = norm(axis)
    c, s = math.cos(ang), math.sin(ang)
    C = 1 - c
    return np.array([[c + x * x * C, x * y * C - z * s, x * z * C + y * s],
                     [y * x * C + z * s, c + y * y * C, y * z * C - x * s],
                     [z * x * C - y * s, z * y * C + x * s, c + z * z * C]])


def frame_from(fwd, up=(0, 1, 0)):
    """Orthonormal basis whose local +Y points along fwd. Returns 3x3 with columns x,y,z."""
    y = norm(fwd)
    u = np.array(up, dtype=np.float64)
    if abs(np.dot(u, y)) > 0.95:
        u = np.array([0, 0, 1.0]) if abs(y[2]) < 0.9 else np.array([1.0, 0, 0])
    x = norm(np.cross(y, u))
    z = np.cross(x, y)
    return np.stack([x, y, z], axis=1)


# ---------------------------------------------------------------- primitive distance functions
def sd_round_cone(p, a, b, r1, r2):
    """Exact distance to a capsule whose radius tapers from r1 at a to r2 at b (iq)."""
    ba = b - a
    l2 = float(np.dot(ba, ba))
    if l2 < 1e-12:
        return np.linalg.norm(p - a, axis=-1) - max(r1, r2)
    rr = r1 - r2
    a2 = l2 - rr * rr
    il2 = 1.0 / l2
    pa = p - a
    y = pa @ ba
    z = y - l2
    q = pa * l2 - y[..., None] * ba
    x2 = np.einsum('...i,...i->...', q, q)
    y2 = y * y * l2
    z2 = z * z * l2
    k = math.copysign(1.0, rr) * rr * rr * x2
    d3 = (np.sqrt(np.maximum(x2 * a2 * il2, 0)) + y * rr) * il2 - r1
    d1 = np.sqrt(x2 + z2) * il2 - r2
    d2 = np.sqrt(x2 + y2) * il2 - r1
    out = np.where(np.sign(y) * a2 * y2 < k, d2, d3)
    out = np.where(np.sign(z) * a2 * z2 > k, d1, out)
    return out


def sd_ellipsoid(p, r):
    k0 = np.linalg.norm(p / r, axis=-1)
    k1 = np.linalg.norm(p / (r * r), axis=-1)
    return k0 * (k0 - 1.0) / np.maximum(k1, 1e-9)


def sd_round_box(p, b, rad):
    q = np.abs(p) - (b - rad)
    return np.linalg.norm(np.maximum(q, 0), axis=-1) + np.minimum(np.max(q, axis=-1), 0) - rad


def sd_torus(p, R, r):
    q = np.stack([np.linalg.norm(p[..., [0, 2]], axis=-1) - R, p[..., 1]], axis=-1)
    return np.linalg.norm(q, axis=-1) - r


def smin(a, b, k):
    if k <= 1e-9:
        return np.minimum(a, b)
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b + (a - b) * h - k * h * (1 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


class Prim:
    """A shape in world space. kind: cone | ell | box | torus.
    mode: add (smooth union), sub (smooth carve), paint (colour volume only)."""

    def __init__(self, kind, bone, mode='add', k=0.05, zone=None, paint=None, **kw):
        self.kind, self.bone, self.mode, self.k, self.zone = kind, bone, mode, k, zone
        self.paint = paint  # (channel, strength) for paint prims
        self.kw = kw
        self.rot = kw.get('rot')  # 3x3, columns are the local axes in world space
        self.center = np.asarray(kw.get('c', (0, 0, 0)), dtype=np.float64)
        self.squash = kw.get('squash')  # anisotropic scaling of the local frame (flattened cones)
        if kind == 'cone':
            self.a = np.asarray(kw['a'], dtype=np.float64)
            self.b = np.asarray(kw['b'], dtype=np.float64)
            self.r1, self.r2 = kw['r1'], kw['r2']

    def aabb(self):
        if self.kind == 'cone':
            r = max(self.r1, self.r2)
            lo = np.minimum(self.a, self.b) - r
            hi = np.maximum(self.a, self.b) + r
            if self.squash is not None:
                pass  # flattening only shrinks the shape
        elif self.kind == 'ell':
            r = float(np.max(self.kw['r']))
            lo, hi = self.center - r, self.center + r
        elif self.kind == 'box':
            r = float(np.linalg.norm(self.kw['b']))
            lo, hi = self.center - r, self.center + r
        elif self.kind == 'torus':
            r = self.kw['R'] + self.kw['r']
            lo, hi = self.center - r, self.center + r
        pad = self.k + 0.01
        return lo - pad, hi + pad

    def dist(self, p):
        """Signed distance for points p (..., 3)."""
        if self.kind == 'cone':
            if self.squash is not None:
                # Flatten around the cone axis: work in a frame aligned to the cone.
                R = self.rot
                c = self.a
                lp = (p - c) @ R / self.squash
                la = np.zeros(3)
                lb = ((self.b - c) @ R) / self.squash
                return sd_round_cone(lp, la, lb, self.r1, self.r2) * float(np.min(self.squash))
            return sd_round_cone(p, self.a, self.b, self.r1, self.r2)
        lp = p - self.center
        if self.rot is not None:
            lp = lp @ self.rot
        if self.kind == 'ell':
            return sd_ellipsoid(lp, np.asarray(self.kw['r'], dtype=np.float64))
        if self.kind == 'box':
            return sd_round_box(lp, np.asarray(self.kw['b'], dtype=np.float64), self.kw.get('rad', 0.02))
        if self.kind == 'torus':
            return sd_torus(lp, self.kw['R'], self.kw['r'])
        raise ValueError(self.kind)


class Part:
    """A group of primitives meshed together into one watertight surface."""

    def __init__(self, name, voxel=0.012, bone=None):
        self.name, self.voxel, self.bone = name, voxel, bone
        self.prims = []

    def add(self, prim):
        self.prims.append(prim)
        return prim

    def geometry(self):
        return [p for p in self.prims if p.mode in ('add', 'sub', 'add2')]

    def field(self):
        geo = self.geometry()
        adds = [p for p in geo if p.mode == 'add']
        if not adds:
            return None
        lo = np.min([p.aabb()[0] for p in adds], axis=0) - self.voxel * 3
        hi = np.max([p.aabb()[1] for p in adds], axis=0) + self.voxel * 3
        h = self.voxel
        n = np.ceil((hi - lo) / h).astype(int) + 1
        xs = [lo[i] + np.arange(n[i]) * h for i in range(3)]
        F = np.full(n, 1e3, dtype=np.float32)

        def apply(p, op):
            plo, phi = p.aabb()
            i0 = np.clip(np.floor((plo - lo) / h).astype(int), 0, n - 1)
            i1 = np.clip(np.ceil((phi - lo) / h).astype(int) + 1, 1, n)
            if np.any(i1 <= i0):
                return
            gx, gy, gz = np.meshgrid(xs[0][i0[0]:i1[0]], xs[1][i0[1]:i1[1]], xs[2][i0[2]:i1[2]], indexing='ij')
            P = np.stack([gx, gy, gz], axis=-1)
            d = p.dist(P).astype(np.float32)
            sl = (slice(i0[0], i1[0]), slice(i0[1], i1[1]), slice(i0[2], i1[2]))
            F[sl] = op(F[sl], d, p.k)

        for p in geo:
            if p.mode == 'add':
                apply(p, smin)
        for p in geo:
            if p.mode == 'sub':
                apply(p, lambda f, d, k: smax(f, -d, k))
        for p in geo:
            if p.mode == 'add2':
                apply(p, smin)
        return F, lo, h

    def mesh(self):
        res = self.field()
        if res is None:
            return None
        F, lo, h = res
        if F.min() >= 0:
            return None
        verts, faces, normals, _ = marching_cubes(F, level=0.0, spacing=(h, h, h), allow_degenerate=False)
        verts = verts + lo
        return verts.astype(np.float64), faces.astype(np.int64)

    def eval(self, pts):
        """Full field value at arbitrary points (used to snap decimated vertices back onto the surface)."""
        geo = self.geometry()
        F = np.full(len(pts), 1e3)
        for p in geo:
            if p.mode == 'add':
                F = smin(F, p.dist(pts), p.k)
        for p in geo:
            if p.mode == 'sub':
                F = smax(F, -p.dist(pts), p.k)
        for p in geo:
            if p.mode == 'add2':
                F = smin(F, p.dist(pts), p.k)
        return F


# ---------------------------------------------------------------- explicit tubes (horns, claws, teeth)
def catmull(points, samples):
    P = [np.asarray(p, dtype=np.float64) for p in points]
    if len(P) == 2:
        return [P[0] + (P[1] - P[0]) * t for t in np.linspace(0, 1, samples)]
    ext = [P[0] * 2 - P[1]] + P + [P[-1] * 2 - P[-2]]
    segs = len(P) - 1
    out = []
    for s in range(samples):
        t = s / (samples - 1) * segs
        i = min(int(t), segs - 1)
        u = t - i
        p0, p1, p2, p3 = ext[i], ext[i + 1], ext[i + 2], ext[i + 3]
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3))
    return out


def tube(points, r0, r1, radial=10, samples=12, profile=None, flat=1.0, up=(0, 1, 0), tip=True, base_cap=True):
    """Swept tube along a Catmull-Rom curve. Radius tapers r0 -> r1 (or follows profile(t)).
    flat < 1 squashes the cross-section (blades, fins, flat claws). Returns verts, faces."""
    C = catmull(points, samples)
    n = len(C)
    T = [norm(C[min(i + 1, n - 1)] - C[max(i - 1, 0)]) for i in range(n)]
    u = np.array(up, dtype=np.float64)
    if abs(np.dot(u, T[0])) > 0.95:
        u = np.array([1.0, 0, 0])
    N = norm(np.cross(T[0], u))
    verts, faces = [], []
    for i in range(n):
        if i > 0:  # parallel transport
            v = np.cross(T[i - 1], T[i])
            s = np.linalg.norm(v)
            if s > 1e-8:
                ang = math.atan2(s, np.dot(T[i - 1], T[i]))
                N = rot_axis(v, ang) @ N
        B = np.cross(T[i], N)
        t = i / (n - 1)
        r = profile(t) if profile else r0 + (r1 - r0) * t
        if tip and i == n - 1:
            r = max(r1 * 0.15, 1e-4)
        for j in range(radial):
            a = 2 * math.pi * j / radial
            verts.append(C[i] + (N * math.cos(a) * flat + B * math.sin(a)) * r)
    for i in range(n - 1):
        for j in range(radial):
            a0 = i * radial + j
            a1 = i * radial + (j + 1) % radial
            b0 = a0 + radial
            b1 = a1 + radial
            faces.append((a0, a1, b1))
            faces.append((a0, b1, b0))
    if tip:
        ti = len(verts)
        verts.append(C[-1] + T[-1] * r1 * 0.3)
        base = (n - 1) * radial
        for j in range(radial):
            faces.append((base + j, base + (j + 1) % radial, ti))
    if base_cap:
        ci = len(verts)
        verts.append(C[0] - T[0] * r0 * 0.2)
        for j in range(radial):
            faces.append(((j + 1) % radial, j, ci))
    return np.array(verts), np.array(faces, dtype=np.int64)


def crystal(base, direction, length, radius, sides=6, tip_frac=0.3):
    """Faceted crystal prism with a pointed tip."""
    R = frame_from(direction)
    verts, faces = [], []
    for ring, (h, r) in enumerate([(0, radius * 0.85), (length * (1 - tip_frac), radius)]):
        for j in range(sides):
            a = 2 * math.pi * j / sides
            verts.append(np.asarray(base) + R @ np.array([math.cos(a) * r, h, math.sin(a) * r]))
    tipi = len(verts)
    verts.append(np.asarray(base) + R @ np.array([0, length, 0]))
    boti = len(verts)
    verts.append(np.asarray(base) + R @ np.array([0, -radius * 0.2, 0]))
    for j in range(sides):
        j2 = (j + 1) % sides
        faces += [(j, j2, sides + j2), (j, sides + j2, sides + j), (sides + j, sides + j2, tipi), (j2, j, boti)]
    return np.array(verts), np.array(faces, dtype=np.int64)[:, ::-1]


def sd_polygon(p2, verts):
    """Signed distance to a closed 2D polygon (iq). p2: (..., 2), verts: (N, 2)."""
    v = np.asarray(verts, dtype=np.float64)
    d = np.sum((p2 - v[0]) ** 2, axis=-1)
    s = np.ones(p2.shape[:-1])
    n = len(v)
    j = n - 1
    for i in range(n):
        e = v[j] - v[i]
        w = p2 - v[i]
        t = np.clip((w @ e) / float(e @ e), 0, 1)
        b = w - t[..., None] * e
        d = np.minimum(d, np.sum(b * b, axis=-1))
        c1 = p2[..., 1] >= v[i][1]
        c2 = p2[..., 1] < v[j][1]
        c3 = e[0] * w[..., 1] > e[1] * w[..., 0]
        flip = (c1 & c2 & c3) | (~c1 & ~c2 & ~c3)
        s = np.where(flip, -s, s)
        j = i
    return s * np.sqrt(d)


class Slab(Prim):
    """A rounded flat plate: a 2D polygon in the plane spanned by ex, ey around origin o,
    extruded to half-thickness h along n. Thickness can taper toward the polygon's far edge."""

    def __init__(self, bone, o, ex, ey, poly, h, rad=0.006, mode='add', k=0.02, zone=None, paint=None, taper=None):
        Prim.__init__(self, 'slab', bone, mode=mode, k=k, zone=zone, paint=paint)
        self.o = np.asarray(o, dtype=np.float64)
        self.ex = norm(ex)
        ey = np.asarray(ey, dtype=np.float64)
        ey = norm(ey - self.ex * np.dot(ey, self.ex))
        self.ey = ey
        self.n = np.cross(self.ex, self.ey)
        self.poly = np.asarray(poly, dtype=np.float64)
        self.h, self.rad = h, rad
        self.taper = taper  # (axis 0|1, min factor) thickness shrinks along that 2D axis

    def aabb(self):
        pts = [self.o + self.ex * x + self.ey * y for x, y in self.poly]
        pts = np.array(pts)
        pad = self.k + self.h + self.rad + 0.01
        return pts.min(axis=0) - pad, pts.max(axis=0) + pad

    def dist(self, p):
        q = p - self.o
        x, y, z = q @ self.ex, q @ self.ey, q @ self.n
        d2 = sd_polygon(np.stack([x, y], axis=-1), self.poly) + self.rad
        h = self.h
        if self.taper is not None:
            ax, mn = self.taper
            coord = x if ax == 0 else y
            lo, hi = self.poly[:, ax].min(), self.poly[:, ax].max()
            t = np.clip((coord - lo) / max(hi - lo, 1e-6), 0, 1)
            h = self.h * (1 - (1 - mn) * t)
        wx, wy = d2, np.abs(z) - h
        out = np.minimum(np.maximum(wx, wy), 0) + np.sqrt(np.maximum(wx, 0) ** 2 + np.maximum(wy, 0) ** 2)
        return out - self.rad
