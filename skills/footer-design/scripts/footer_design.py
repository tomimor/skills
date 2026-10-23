#!/usr/bin/env python3
"""Search footer.design (Footr Design) footers from the command line.

Searches a local index (../data/index.json) joined with hand-written layout
descriptions (../data/layouts.json), so filtering is instant and works offline.
Screenshots and site pages are fetched on demand. Dependency-free (Python 3.9+
stdlib); honors HTTPS_PROXY; network responses are cached for a day in
~/.cache/footer-design.

Choosing:
  footer_design.py vocab
  footer_design.py search [filters...] [--text WORDS] [--all] [--limit N] [--json]
  footer_design.py site <slug>... [--json]
  footer_design.py download <slug>... [--out DIR]
  footer_design.py gallery <slug>... [--out FILE]

Maintaining the data (see references/maintaining.md):
  footer_design.py refresh-index [--full]
  footer_design.py layouts-todo
  footer_design.py composite <slug>... --out DIR
  footer_design.py merge-layouts FILE...

A slug is the last path segment of https://www.footer.design/sites/<slug>; full URLs work too.
"""

import argparse
import datetime
import difflib
import hashlib
import html
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

BASE = "https://www.footer.design"
UA = "footer-design-skill/1.1 (+https://github.com/tomimor/skills)"
CACHE = Path(os.environ.get("FOOTER_DESIGN_CACHE", Path.home() / ".cache" / "footer-design"))
CACHE_TTL = 24 * 3600
WORKERS = 4
DATA = Path(__file__).resolve().parent.parent / "data"
INDEX = DATA / "index.json"
LAYOUTS = DATA / "layouts.json"

# Controlled vocabulary for layouts.json. Keep in sync with references/maintaining.md.
PATTERNS = {
    "single-row": "everything on one or two thin lines",
    "centered-stack": "one centered column: logo, links, socials, legal stacked",
    "link-columns": "brand block plus 2-4 labelled link groups side by side",
    "sitemap": "5+ link groups, a dense mega footer",
    "giant-wordmark": "a brand name or word set huge, spanning most of the width, is the main element",
    "cta-first": "a big headline, button or newsletter leads; links are secondary",
    "big-links": "a few links set large (roughly 28px+) are the main element",
    "bento": "content split into separate tiles or cards in a grid",
    "split": "two distinct halves or panels side by side",
    "illustrated": "artwork, illustration, pattern or a 3D scene dominates",
    "image-led": "a photo or video fills most of the footer",
    "other": "none of the above; say what in the summary",
}
FEATURES = {
    "giant-type": "huge display type somewhere (wordmark or slogan)",
    "logo": "logo or logomark (not huge)",
    "newsletter": "email signup field",
    "cta-button": "prominent button or CTA headline",
    "contact-details": "email, phone or street address shown",
    "social-icons": "social links as icons",
    "social-links": "social links as text",
    "legal-row": "copyright/legal links on their own bottom line",
    "switcher": "language, currency or theme switcher",
    "clock-or-status": "local time, weather, system status or similar live info",
    "back-to-top": "back-to-top control",
    "photo": "photograph or video still",
    "illustration": "illustration, drawing, pattern or ASCII art",
    "3d": "3D render or WebGL-looking visual",
    "cards": "content sits in rounded cards or tiles",
    "dividers": "visible rules between regions",
    "inset-panel": "footer is a rounded panel inset from the page edges",
    "badges": "awards, certifications, partner or app-store badges",
    "map": "a map",
    "marquee": "a row of scrolling or repeated text",
}
THEMES = ["light", "dark", "colorful", "gradient", "image"]
LINKS = ["few", "some", "many"]  # <=8, 9-20, 21+
TYPEFACES = ["sans", "serif", "mono", "mixed", "display"]
EFFORTS = ["low", "medium", "high"]
# desktop screenshots are ~2106px wide for a 1440px layout
DESKTOP_SCALE = 1440 / 2106


class UserError(Exception):
    pass


# ---------------------------------------------------------------- network

def fetch(url, binary=False, ttl=CACHE_TTL):
    key = hashlib.sha1(url.encode()).hexdigest()
    path = CACHE / key
    if path.exists() and time.time() - path.stat().st_mtime < ttl:
        data = path.read_bytes()
    else:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=30) as r:
                    data = r.read()
                break
            except Exception as e:  # noqa: BLE001
                if getattr(e, "code", None) == 404 or attempt == 2:
                    raise
                time.sleep(2 ** attempt)
        CACHE.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(f".{os.getpid()}.tmp")
        tmp.write_bytes(data)
        os.replace(tmp, path)
    return data if binary else data.decode("utf-8", "replace")


def sitemap_slugs(ttl=CACHE_TTL):
    xml = fetch(f"{BASE}/sitemap.xml", ttl=ttl)
    return [u.rsplit("/", 1)[1] for u in re.findall(r"<loc>([^<]+/sites/[^<]+)</loc>", xml)]


def normalize_slug(s):
    return s.strip().rstrip("/").rsplit("/sites/", 1)[-1].split("?")[0].split("#")[0]


def fetch_site(slug, ttl=CACHE_TTL):
    """Scrape one /sites/<slug> page. Returns a record, or {"slug", "error"}."""
    slug = normalize_slug(slug)
    try:
        page = fetch(f"{BASE}/sites/{slug}", ttl=ttl)
    except Exception as e:  # noqa: BLE001
        reason = "not found on footer.design" if getattr(e, "code", None) == 404 else str(e)
        return {"slug": slug, "error": reason}
    data = {"slug": slug, "name": None, "description": None, "live": None, "designer": None,
            "date_added": None, "desktop": None, "mobile": None}
    for raw in re.findall(r'<script type="application/ld\+json">(.*?)</script>', page, re.S):
        try:
            ld = json.loads(raw)
        except json.JSONDecodeError:
            continue
        about = ld.get("about") or {}
        data["name"] = about.get("name") or ld.get("name")
        data["description"] = about.get("description") or ld.get("description")
        data["live"] = about.get("url")
        data["designer"] = (about.get("creator") or {}).get("name")
        data["date_added"] = about.get("datePublished") or ld.get("datePublished")
        for img in about.get("image") or []:
            cap = (img.get("caption") or "").lower()
            if "desktop" in cap:
                data["desktop"] = img["url"]
            elif "mobile" in cap:
                data["mobile"] = img["url"]
    start = page.find("site_hero-bottom")
    end = page.find("site_image-flex", start)
    hero = page[start:end] if start != -1 else ""
    data["styles"] = re.findall(r'href="/styles/([^"]+)"', hero)
    data["types"] = re.findall(r'href="/types/([^"]+)"', hero)
    for view in ("desktop", "mobile"):
        if not data[view]:
            img = re.search(rf'src="([^"]+-{view}\.[a-z]+)"', page)
            data[view] = img.group(1) if img else None
    # some pages ship malformed JSON-LD; fill gaps from the visible markup
    if not data["name"]:
        t = re.search(r"<title>Footer \| (.*?)</title>", page)
        data["name"] = t.group(1) if t else slug
    if not data["description"]:
        m = re.search(r'class="text-color-primary">[^<]*</h1><h2 class="text-paragraph text-color-secondary">(.*?)</h2>', page)
        data["description"] = m.group(1) if m else None
    if not data["live"]:
        m = re.search(r'<a href="(https?://[^"]+)"[^>]*class="button secondary w-inline-block"><div>View Website', page)
        data["live"] = m.group(1) if m else None
    if not data["date_added"]:
        m = re.search(r'Date Added</div><div[^>]*>([^<]+)</div>', page)
        if m:
            try:
                data["date_added"] = datetime.datetime.strptime(m.group(1).strip(), "%B %d, %Y").date().isoformat()
            except ValueError:
                pass
    if not data["designer"]:
        m = re.search(r'Designed By</div><a[^>]*>([^<]+)</a>', page)
        data["designer"] = m.group(1) if m else None
    for k in ("name", "description", "designer"):
        if data[k]:
            text = re.sub(r"<[^>]+>", "", data[k])
            while html.unescape(text) != text:  # some fields are double-escaped
                text = html.unescape(text)
            data[k] = re.sub(r"\s+", " ", text).strip() or None
    return data


# ---------------------------------------------------------------- local data

def load_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default


def save_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(obj, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(tmp, path)


def load_catalog():
    """slug -> index record merged with its layout description (if any), newest first."""
    index = load_json(INDEX, None)
    if index is None:
        raise UserError(f"no index at {INDEX}. Run `refresh-index` first.")
    layouts = load_json(LAYOUTS, {}).get("layouts", {})
    catalog = {}
    for rec in index["sites"]:
        catalog[rec["slug"]] = dict(rec, page=f"{BASE}/sites/{rec['slug']}", layout=layouts.get(rec["slug"]))
    return catalog


def lookup(slugs, warn=True):
    """Records for slugs: from the local index when present, else scraped live."""
    try:
        catalog = load_catalog()
    except UserError:
        catalog = {}
    wanted = [normalize_slug(s) for s in slugs]
    missing = [s for s in wanted if s not in catalog]
    with ThreadPoolExecutor(WORKERS) as pool:
        live = {d["slug"]: d for d in pool.map(fetch_site, missing)}
    out = []
    for s in wanted:
        d = catalog.get(s) or dict(live[s], page=f"{BASE}/sites/{s}")
        if "error" in d:
            if warn:
                print(f"warning: skipped '{s}': {d['error']}", file=sys.stderr)
            continue
        d.setdefault("layout", None)
        out.append(d)
    return out


# ---------------------------------------------------------------- choosing

def vocab_counts(catalog):
    counts = {k: {} for k in ("styles", "types", "pattern", "features", "theme", "links", "typeface")}
    for d in catalog.values():
        for k in ("styles", "types"):
            for v in d.get(k) or []:
                counts[k][v] = counts[k].get(v, 0) + 1
        lay = d.get("layout") or {}
        for k in ("pattern", "theme", "links", "typeface"):
            if lay.get(k):
                counts[k][lay[k]] = counts[k].get(lay[k], 0) + 1
        for v in lay.get("features") or []:
            counts["features"][v] = counts["features"].get(v, 0) + 1
    return counts


def check_value(kind, value, allowed):
    if value not in allowed:
        close = difflib.get_close_matches(value, list(allowed), n=3)
        hint = f" Did you mean: {', '.join(close)}?" if close else " Run `vocab` for the list."
        raise UserError(f"unknown {kind} '{value}'.{hint}")


def search(catalog, a):
    counts = vocab_counts(catalog)
    criteria = []  # (label, predicate)
    for v in a.style:
        check_value("style", v, counts["styles"])
        criteria.append((f"style:{v}", lambda d, v=v: v in (d.get("styles") or [])))
    for v in a.type:
        check_value("type", v, counts["types"])
        criteria.append((f"type:{v}", lambda d, v=v: v in (d.get("types") or [])))
    for v in a.pattern:
        check_value("pattern", v, PATTERNS)
        criteria.append((f"pattern:{v}", lambda d, v=v: (d["layout"] or {}).get("pattern") == v))
    for v in a.feature:
        check_value("feature", v, FEATURES)
        criteria.append((f"feature:{v}", lambda d, v=v: v in ((d["layout"] or {}).get("features") or [])))
    for v in a.theme:
        check_value("theme", v, THEMES)
        criteria.append((f"theme:{v}", lambda d, v=v: (d["layout"] or {}).get("theme") == v))
    for v in a.links:
        check_value("links", v, LINKS)
        criteria.append((f"links:{v}", lambda d, v=v: (d["layout"] or {}).get("links") == v))
    for v in a.typeface:
        check_value("typeface", v, TYPEFACES)
        criteria.append((f"typeface:{v}", lambda d, v=v: (d["layout"] or {}).get("typeface") == v))
    if a.max_effort:
        check_value("effort", a.max_effort, EFFORTS)
        cap = EFFORTS.index(a.max_effort)
        criteria.append((f"effort<={a.max_effort}",
                         lambda d: (d["layout"] or {}).get("effort") in EFFORTS[:cap + 1]))
    if a.max_height:
        criteria.append((f"height<={a.max_height}",
                         lambda d: 0 < ((d["layout"] or {}).get("height_px") or 0) <= a.max_height))
    for word in a.text:
        w = word.lower()

        def has(d, w=w):
            lay = d["layout"] or {}
            blob = " ".join(str(x) for x in (d.get("name"), d.get("description"), lay.get("summary"),
                                             lay.get("mobile"), " ".join(lay.get("features") or [])))
            return w in blob.lower()
        criteria.append((f"text:{word}", has))

    rows = []
    for d in catalog.values():  # catalog is newest first
        hit = [label for label, pred in criteria if pred(d)]
        if criteria and not hit:
            continue
        if a.all and len(hit) < len(criteria):
            continue
        rows.append(dict(d, matched=hit, score=len(hit)))
    rows.sort(key=lambda d: -d["score"])  # stable: ties stay newest first
    return rows[: a.limit], len(criteria)


def fmt_row(d, total=None):
    lay = d.get("layout") or {}
    head = f"{d['slug']}  ({d.get('name')}, {d.get('date_added') or '?'})"
    if total:
        head += f"  [{d['score']}/{total}: {', '.join(d['matched'])}]"
    lines = [head]
    if lay:
        meta = ", ".join(x for x in (lay.get("pattern"), lay.get("theme"), f"{lay.get('links')} links",
                                     f"{lay.get('height_px')}px tall" if lay.get("height_px") else None,
                                     f"effort {lay.get('effort')}") if x)
        lines.append(f"    {meta}")
        lines.append(f"    {lay.get('summary')}")
    else:
        lines.append(f"    (no layout description yet) tags: {', '.join((d.get('styles') or []) + (d.get('types') or []))}")
    return "\n".join(lines)


def to_png(src):
    """Newer screenshots are AVIF, which most agents can't view. Convert with whatever exists."""
    dst = src.with_suffix(".png")
    tools = [
        ["sips", "-s", "format", "png", str(src), "--out", str(dst)],
        ["magick", str(src), str(dst)],
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), str(dst)],
    ]
    if os.name != "nt":  # on Windows, convert.exe is the FAT-to-NTFS disk tool
        tools.insert(2, ["convert", str(src), str(dst)])
    for cmd in tools:
        if shutil.which(cmd[0]):
            if subprocess.run(cmd, capture_output=True).returncode == 0 and dst.exists():
                src.unlink()
                return dst
    try:
        from PIL import Image

        Image.open(src).save(dst)
        src.unlink()
        return dst
    except Exception:  # noqa: BLE001
        print(f"warning: no AVIF converter found, kept {src} (open the gallery in a browser instead)",
              file=sys.stderr)
        return src


def download_one(d, out, view):
    url = d.get(view)
    if not url:
        return None
    ext = os.path.splitext(url.split("?")[0])[1] or ".jpg"
    dest = out / f"{d['slug']}-{view}{ext}"
    if ext.lower() in (".avif", ".webp") and dest.with_suffix(".png").exists():
        return dest.with_suffix(".png")
    dest.write_bytes(fetch(url, binary=True, ttl=30 * 24 * 3600))
    return to_png(dest) if ext.lower() in (".avif", ".webp") else dest


def download(records, out, views=("desktop", "mobile")):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    jobs = [(d, v) for d in records for v in views]
    with ThreadPoolExecutor(WORKERS) as pool:
        saved = list(pool.map(lambda j: download_one(j[0], out, j[1]), jobs))
    return [str(p) for p in saved if p]


GALLERY_CSS = """
:root{--bg:#f6f6f4;--fg:#161616;--muted:#666;--card:#fff;--line:#e2e2e0;--accent:#1f6feb}
@media (prefers-color-scheme:dark){:root{--bg:#101010;--fg:#f2f2f2;--muted:#9a9a9a;--card:#191919;--line:#2a2a2a;--accent:#6ea8ff}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}
main{max-width:1240px;margin:0 auto;padding:32px 16px 64px}h1{font-size:1.5rem;margin:0 0 4px}
.lede{color:var(--muted);margin:0 0 28px}
article{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;margin-bottom:24px}
article.pick{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
header{display:flex;gap:10px 14px;align-items:baseline;flex-wrap:wrap;margin-bottom:6px}
.n{font-weight:700;font-size:1.5rem;font-variant-numeric:tabular-nums}.name{font-weight:600;font-size:1.1rem}
.badge{font-size:.75rem;font-weight:600;color:var(--accent);border:1px solid currentColor;border-radius:99px;padding:1px 8px}
.meta{color:var(--muted);font-size:.85rem}.links{margin-left:auto;display:flex;gap:12px;font-size:.9rem}
.why{margin:0 0 12px}.why b{font-weight:600}
.views{display:grid;grid-template-columns:3fr 1fr;gap:12px;align-items:start}.views.solo{grid-template-columns:1fr}
.summary{color:var(--muted);font-size:.9rem;margin:-8px 0 12px}
img{width:100%;height:auto;border-radius:8px;border:1px solid var(--line);display:block;background:var(--line)}
a{color:inherit;text-underline-offset:2px}a:hover{color:var(--accent)}
@media (max-width:640px){.views{grid-template-columns:1fr}.links{margin-left:0}}
"""


def gallery(records, out, notes=None, pick=None, title="Footer shortlist"):
    """notes: optional {slug: "why it fits"}; pick: slug to highlight as the recommendation."""
    e = html.escape
    notes = notes or {}
    cards = []
    for i, d in enumerate(records, 1):
        lay = d.get("layout") or {}
        meta = " · ".join(x for x in [lay.get("pattern"), lay.get("theme"),
                                      f"{lay['links']} links" if lay.get("links") else None,
                                      f"effort {lay['effort']}" if lay.get("effort") else None] if x)
        if not meta:
            meta = " · ".join((d.get("styles") or []) + (d.get("types") or []))
        why = notes.get(d["slug"]) or ""
        summary = lay.get("summary") or ""
        if not why:
            why, summary = summary, ""
        imgs = "".join(
            f'<img src="{e(d[v])}" alt="{e(d.get("name") or "")} footer, {v} view" loading="lazy">'
            for v in ("desktop", "mobile") if d.get(v)
        )
        cards.append(
            f'<article id="{e(d["slug"])}" class="{"pick" if d["slug"] == pick else ""}"><header>'
            f'<span class="n">{i}</span><span class="name">{e(d.get("name") or d["slug"])}</span>'
            + ('<span class="badge">Recommended</span>' if d["slug"] == pick else "")
            + f'<span class="meta">{e(meta)}</span><span class="links">'
            f'<a href="{e(d["page"])}">footer.design</a>'
            + (f'<a href="{e(d["live"])}">live site</a>' if d.get("live") else "")
            + f'</span></header><p class="why">{e(why)}</p>'
            + (f'<p class="summary">{e(summary)}</p>' if summary else "")
            + f'<div class="views{"" if d.get("mobile") else " solo"}">{imgs}</div></article>'
        )
    doc = (
        '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        f"<title>{e(title)}</title><style>{GALLERY_CSS}</style></head><body><main>"
        f"<h1>{e(title)}</h1><p class=\"lede\">From footer.design. Desktop left, mobile right. "
        "Reply with a number, or mix them (\"2's layout, 4's type\").</p>"
        + "".join(cards) + "</main></body></html>"
    )
    Path(out).write_text(doc, encoding="utf-8")
    return out


# ---------------------------------------------------------------- maintaining

def refresh_index(full):
    old = load_json(INDEX, {"sites": []})
    known = {r["slug"]: r for r in old["sites"]}
    slugs = sitemap_slugs(ttl=0)
    todo = slugs if full else [s for s in slugs if s not in known]
    print(f"{len(slugs)} sites in sitemap, fetching {len(todo)}", file=sys.stderr)
    fresh, failed = {}, []
    with ThreadPoolExecutor(WORKERS) as pool:
        for i, d in enumerate(pool.map(lambda s: fetch_site(s, ttl=0 if full else CACHE_TTL), todo), 1):
            if "error" in d:
                failed.append(d["slug"])
            else:
                fresh[d["slug"]] = d
            if i % 100 == 0:
                print(f"  {i}/{len(todo)}", file=sys.stderr)
    merged = [fresh.get(s) or known.get(s) for s in slugs]
    merged = [r for r in merged if r]
    merged.sort(key=lambda r: (r.get("date_added") or "", r["slug"]), reverse=True)
    removed = sorted(set(known) - set(slugs))
    save_json(INDEX, {"source": BASE, "generated": datetime.date.today().isoformat(),
                      "count": len(merged), "sites": merged})
    added = [s for s in fresh if s not in known]
    print(f"index: {len(merged)} sites ({len(added)} new, {len(removed)} removed, {len(failed)} failed)")
    for s in failed:
        print(f"  failed: {s}")
    for s in removed:
        print(f"  removed: {s}")


def layouts_todo():
    catalog = load_catalog()
    return [s for s, d in catalog.items() if not d.get("layout")]


def composite(records, out, max_w=1400):
    """One image per site, desktop and mobile side by side, sized for a vision model."""
    from PIL import Image  # maintainer-only; pip install pillow

    out = Path(out)
    raw = out / "raw"
    paths = {}
    for p in download(records, raw):
        slug, view = Path(p).stem.rsplit("-", 1)
        paths.setdefault(slug, {})[view] = p
    made = []
    for d in records:
        views = paths.get(d["slug"], {})
        if "desktop" not in views:
            continue
        desk = Image.open(views["desktop"]).convert("RGB")
        h_px = round(desk.height * 1440 / desk.width)
        scale = max_w / desk.width
        desk = desk.resize((max_w, round(desk.height * scale)))
        if desk.height > 1600:
            desk = desk.crop((0, 0, desk.width, 1600))
        parts = [desk]
        if "mobile" in views:
            mob = Image.open(views["mobile"]).convert("RGB")
            target = min(max(desk.height, 700), 1600)  # keep short footers' mobile view readable
            mob = mob.resize((round(mob.width * target / mob.height), target))
            parts.append(mob)
        height = max(p.height for p in parts)
        canvas = Image.new("RGB", (sum(p.width for p in parts) + 24 * (len(parts) - 1), height), "#ff00ff")
        x = 0
        for p in parts:
            canvas.paste(p, (x, 0))
            x += p.width + 24
        dest = out / f"{d['slug']}.png"
        canvas.save(dest, optimize=True)
        made.append({"slug": d["slug"], "image": str(dest), "height_px": h_px, "bg": edge_color(views["desktop"])})
    return made


def edge_color(path):
    """Most common color along the image border, as hex: a good proxy for the footer background."""
    from PIL import Image

    im = Image.open(path).convert("RGB")
    im.thumbnail((200, 200))
    w, h = im.size
    px = [im.getpixel((x, y)) for x in range(w) for y in (0, h - 1)] + \
         [im.getpixel((x, y)) for y in range(h) for x in (0, w - 1)]
    buckets = {}
    for r, g, b in px:
        k = (r // 8 * 8, g // 8 * 8, b // 8 * 8)
        buckets[k] = buckets.get(k, 0) + 1
    r, g, b = max(buckets, key=buckets.get)
    return f"#{r:02x}{g:02x}{b:02x}"


def validate_layout(slug, lay):
    errs = []
    if lay.get("pattern") not in PATTERNS:
        errs.append(f"pattern {lay.get('pattern')!r}")
    bad = [f for f in lay.get("features") or [] if f not in FEATURES]
    if bad:
        errs.append(f"features {bad}")
    for key, allowed in (("theme", THEMES), ("links", LINKS), ("typeface", TYPEFACES), ("effort", EFFORTS)):
        if lay.get(key) not in allowed:
            errs.append(f"{key} {lay.get(key)!r}")
    if not isinstance(lay.get("groups"), int):
        errs.append(f"groups {lay.get('groups')!r}")
    for key in ("summary", "mobile"):
        if not isinstance(lay.get(key), str) or not lay[key].strip():
            errs.append(f"{key} missing")
    return [f"{slug}: {e}" for e in errs]


def merge_layouts(files, check_only=False):
    data = load_json(LAYOUTS, {"layouts": {}})
    layouts = data["layouts"]
    known = {r["slug"] for r in load_json(INDEX, {"sites": []})["sites"]}
    added, errors = 0, []
    for f in files:
        for n, line in enumerate(Path(f).read_text(encoding="utf-8").splitlines(), 1):
            if not line.strip():
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError as e:
                errors.append(f"{f}:{n}: bad JSON ({e})")
                continue
            slug = rec.pop("slug", None)
            if slug not in known:
                errors.append(f"{f}:{n}: unknown slug {slug!r}")
                continue
            rec["features"] = sorted(set(rec.get("features") or []))
            errs = validate_layout(slug, rec)
            if errs:
                errors.extend(f"{f}:{n}: {e}" for e in errs)
                continue
            order = ["pattern", "features", "theme", "bg", "links", "groups", "typeface", "height_px",
                     "effort", "summary", "mobile"]
            layouts[slug] = {k: rec[k] for k in order if k in rec}
            added += 1
    if check_only:
        print(f"{added} valid, {len(errors)} errors")
        for e in errors:
            print(f"  error: {e}")
        return not errors
    data = {"note": "Layout descriptions written from footer.design screenshots. "
                    "Vocabulary: scripts/footer_design.py (PATTERNS, FEATURES).",
            "layouts": dict(sorted(layouts.items()))}
    save_json(LAYOUTS, data)
    print(f"merged {added} layouts; {len(layouts)} total")
    for e in errors:
        print(f"  error: {e}")
    return not errors


# ---------------------------------------------------------------- cli

def main():
    p = argparse.ArgumentParser(description="Search footer.design footers")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("vocab", help="every filter value with how many footers have it")
    s = sub.add_parser("search", help="filter the local index; best match first, then newest")
    s.add_argument("--style", action="append", default=[], help="footer.design style tag, e.g. dark")
    s.add_argument("--type", action="append", default=[], help="footer.design site type, e.g. saas")
    s.add_argument("--pattern", action="append", default=[], help="layout pattern, e.g. giant-wordmark")
    s.add_argument("--feature", action="append", default=[], help="layout feature, e.g. newsletter")
    s.add_argument("--theme", action="append", default=[], help=" | ".join(THEMES))
    s.add_argument("--links", action="append", default=[], help="few (<=8) | some (9-20) | many (21+)")
    s.add_argument("--typeface", action="append", default=[], help=" | ".join(TYPEFACES))
    s.add_argument("--max-effort", help="low | medium | high")
    s.add_argument("--max-height", type=int, help="max footer height in px at 1440 wide")
    s.add_argument("--text", action="append", default=[], help="word in the name, description or summary")
    s.add_argument("--all", action="store_true", help="require every filter to match")
    s.add_argument("--limit", type=int, default=30)
    s.add_argument("--json", action="store_true")
    d = sub.add_parser("site", help="everything known about one or more footers")
    d.add_argument("slugs", nargs="+")
    d.add_argument("--json", action="store_true")
    dl = sub.add_parser("download", help="save desktop + mobile screenshots as viewable images")
    dl.add_argument("slugs", nargs="+")
    dl.add_argument("--out", default="footer-design-shots")
    g = sub.add_parser("gallery", help="write a numbered HTML contact sheet")
    g.add_argument("slugs", nargs="+")
    g.add_argument("--out", default="footer-shortlist.html")
    g.add_argument("--notes", help="JSON file {slug: why it fits}; replaces the stock summaries")
    g.add_argument("--pick", help="slug to mark as recommended")
    g.add_argument("--title", default="Footer shortlist")
    r = sub.add_parser("refresh-index", help="[maintainer] sync data/index.json with the live sitemap")
    r.add_argument("--full", action="store_true", help="re-fetch every site, not just new ones")
    sub.add_parser("layouts-todo", help="[maintainer] slugs in the index without a layout description")
    c = sub.add_parser("composite", help="[maintainer] desktop+mobile images for describing layouts")
    c.add_argument("slugs", nargs="+")
    c.add_argument("--out", required=True)
    m = sub.add_parser("merge-layouts", help="[maintainer] validate JSONL descriptions into data/layouts.json")
    m.add_argument("files", nargs="+")
    m.add_argument("--check", action="store_true", help="validate only, don't write")
    a = p.parse_args()

    if a.cmd == "vocab":
        counts = vocab_counts(load_catalog())
        described = sum(counts["pattern"].values())
        print(f"{len(load_catalog())} footers, {described} with layout descriptions\n")
        for key, desc in (("pattern", PATTERNS), ("features", FEATURES)):
            print(f"{key} (--{'feature' if key == 'features' else key}):")
            for k, v in desc.items():
                print(f"  {k:16} {counts[key].get(k, 0):4}  {v}")
            print()
        for key, flag in (("theme", "theme"), ("links", "links"), ("typeface", "typeface")):
            print(f"--{flag}: " + ", ".join(f"{k} ({v})" for k, v in sorted(counts[key].items(), key=lambda x: -x[1])))
        for key, flag in (("styles", "style"), ("types", "type")):
            print(f"\n--{flag} (footer.design tags): "
                  + ", ".join(f"{k} ({v})" for k, v in sorted(counts[key].items(), key=lambda x: -x[1])))
    elif a.cmd == "search":
        rows, total = search(load_catalog(), a)
        if a.json:
            print(json.dumps(rows, indent=1, ensure_ascii=False))
        else:
            print("\n".join(fmt_row(d, total) for d in rows) or "no matches; loosen the filters")
    elif a.cmd == "site":
        data = lookup(a.slugs)
        if a.json:
            print(json.dumps(data, indent=1, ensure_ascii=False))
        for x in [] if a.json else data:
            lay = x.get("layout") or {}
            print(f"{x.get('name')} ({x['slug']})")
            for k in ("page", "live", "designer", "date_added", "desktop", "mobile"):
                print(f"  {k}: {x.get(k)}")
            print(f"  styles: {', '.join(x.get('styles') or [])}\n  types: {', '.join(x.get('types') or [])}")
            print(f"  about: {x.get('description')}")
            for k in ("pattern", "features", "theme", "bg", "links", "groups", "typeface", "height_px",
                      "effort", "summary", "mobile"):
                if k in lay:
                    v = ", ".join(lay[k]) if isinstance(lay[k], list) else lay[k]
                    print(f"  layout.{k}: {v}")
            print()
        if not data:
            sys.exit(1)
    elif a.cmd == "download":
        saved = download(lookup(a.slugs), a.out)
        print("\n".join(saved))
        if not saved:
            sys.exit(1)
    elif a.cmd == "gallery":
        recs = lookup(a.slugs)
        if not recs:
            sys.exit(1)
        notes = load_json(Path(a.notes), {}) if a.notes else None
        print(gallery(recs, a.out, notes=notes, pick=a.pick and normalize_slug(a.pick), title=a.title))
    elif a.cmd == "refresh-index":
        refresh_index(a.full)
    elif a.cmd == "layouts-todo":
        print("\n".join(layouts_todo()))
    elif a.cmd == "composite":
        for m in composite(lookup(a.slugs), a.out):
            print(json.dumps(m))
    elif a.cmd == "merge-layouts":
        if not merge_layouts(a.files, check_only=a.check):
            sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except UserError as e:
        print(f"error: {e}", file=sys.stderr)
        sys.exit(2)
    except KeyboardInterrupt:
        sys.exit(130)
