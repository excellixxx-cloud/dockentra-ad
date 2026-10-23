"""Vectorise the official Dockentra "D" (from the brand logo raster) into SVG paths:
silhouette (outer contour + counter) and the light fold, via marching squares + Douglas-Peucker.
    python3 onefold/trace_d.py  ->  remotion/src/onefold/dmark.json  {w, h, d: silhouette path, fold: fold path}"""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
ROOT = Path(__file__).resolve().parents[1]

def contours(field, level=0.5):
    """marching squares on a float field -> list of closed polylines (x, y) in pixel units"""
    H, W = field.shape
    f = np.pad(field, 1, constant_values=0.0)
    segs = {}
    def interp(p1, p2, v1, v2):
        t = (level - v1) / (v2 - v1) if v2 != v1 else 0.5
        return (p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1]))
    edges = []
    for y in range(H + 1):
        for x in range(W + 1):
            a, b, c, d = f[y, x], f[y, x + 1], f[y + 1, x + 1], f[y + 1, x]
            idx = (a > level) * 8 + (b > level) * 4 + (c > level) * 2 + (d > level)
            if idx in (0, 15): continue
            P = {"t": interp((x, y), (x + 1, y), a, b), "r": interp((x + 1, y), (x + 1, y + 1), b, c),
                 "b": interp((x, y + 1), (x + 1, y + 1), d, c), "l": interp((x, y), (x, y + 1), a, d)}
            K = {"t": ("t", x, y), "r": ("v", x + 1, y), "b": ("t", x, y + 1), "l": ("v", x, y)}
            table = {1: [("l", "b")], 2: [("b", "r")], 3: [("l", "r")], 4: [("t", "r")], 5: [("l", "t"), ("b", "r")], 6: [("t", "b")],
                     7: [("l", "t")], 8: [("t", "l")], 9: [("t", "b")], 10: [("t", "r"), ("l", "b")], 11: [("t", "r")], 12: [("l", "r")],
                     13: [("b", "r")], 14: [("l", "b")]}
            for e1, e2 in table[idx]:
                edges.append((K[e1], K[e2], P[e1], P[e2]))
    # chain
    adj = {}
    for k1, k2, p1, p2 in edges:
        adj.setdefault(k1, []).append((k2, p1, p2)); adj.setdefault(k2, []).append((k1, p2, p1))
    used = set(); loops = []
    for start in list(adj):
        if start in used: continue
        loop = []; cur = start; prev = None
        while True:
            used.add(cur)
            nxt = [n for n in adj[cur] if n[0] != prev and n[0] not in used] or [n for n in adj[cur] if n[0] == start and len(loop) > 2]
            if not nxt: break
            k, p1, p2 = nxt[0]
            loop.append(p1); prev, cur = cur, k
            if cur == start: break
        if len(loop) > 20: loops.append(np.array(loop) - 1.0)        # undo the pad
    return loops

def rdp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; ab = b - a; n = np.hypot(*ab) or 1e-9
    v = pts - a
    d = np.abs(ab[0] * v[:, 1] - ab[1] * v[:, 0]) / n
    i = int(np.argmax(d))
    if d[i] > eps: return np.vstack([rdp(pts[: i + 1], eps)[:-1], rdp(pts[i:], eps)])
    return np.vstack([a, b])

def path(loops, eps=0.6):
    out = []
    for L in loops:
        k = int(np.argmax(np.hypot(*(L - L[0]).T)))               # split the closed loop at its farthest point
        s = np.vstack([rdp(L[: k + 1], eps)[:-1], rdp(np.vstack([L[k:], L[:1]]), eps)[:-1]])
        out.append("M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in s) + " Z")
    return " ".join(out)

im = np.asarray(Image.open(ROOT / "remotion/public/apple/d-color.png").convert("RGBA")).astype(np.float32) / 255
alpha = np.asarray(Image.fromarray((im[..., 3] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32) / 255
lum = im[..., :3].mean(-1) * (im[..., 3] > 0.5)
fold = np.asarray(Image.fromarray((np.clip((lum - 0.42) * 6, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(7))).astype(np.float32) / 255
sil = contours(alpha)
fl = sorted(contours(fold), key=len)[-1:]          # the light fold wedge only (drops the gradient highlight top-right)
fl = [L for L in fl]
# clip the fold to the silhouette by intersecting in the renderer (clipPath)
H, W = alpha.shape
out = {"w": W, "h": H, "d": path(sil), "fold": path(fl, 1.2), "counter": [153, 147, 436, 382], "axisRow": 264.5}
dst = ROOT / "remotion/src/onefold"; dst.mkdir(parents=True, exist_ok=True)
(dst / "dmark.json").write_text(json.dumps(out))
print("silhouette loops", len(sil), [len(l) for l in sil], "fold loops", len(fl), [len(l) for l in fl], "path chars", len(out["d"]), len(out["fold"]))
