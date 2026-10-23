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
    "social-icons": "social links as icons",
    "social-links": "social links as text",
    "legal-row": "copyright/legal links on their own bottom line",
    "clock-or-status": "local time, weather, system status or similar live info",
    "back-to-top": "back-to-top control",
    "photo": "photograph or video still",
    "illustration": "illustration, drawing, pattern or ASCII art",
    "3d": "3D render or WebGL-looking visual",
    "cards": "content sits in rounded cards or tiles",
    "dividers": "visible rules between regions",
    "inset-panel": "footer is a rounded panel inset from the page edges",
    "map": "a map",
    "marquee": "a row of scrolling or repeated text",
    # content: what the footer holds, for matching a user's content needs
    "hours": "opening hours or days/times",
    "booking-cta": "book / reserve / schedule / tickets link or button",
    "address": "street or postal address",
    "email-or-phone": "email address or phone number written out",
    "payment-icons": "card or payment logos",
    "app-badges": "App Store / Google Play badges",
    "awards": "award badges, certifications, press or partner logos",
    "locale-switcher": "language, currency, country or region selector",
    "theme-toggle": "light/dark mode toggle",
    "perks": "store promises: free shipping, returns, warranty",
    "mobile-accordion": "mobile view collapses link groups into expandable rows",
}
THEMES = ["light", "dark", "colorful", "gradient", "image"]
PALETTES = ["bw", "mono-color", "multicolor"]  # measured: grays only / one hue + neutrals / several hues
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
    keys = ("styles", "types", "pattern", "features", "theme", "palette", "links", "typeface", "effort")
    counts = {k: {} for k in keys}
    for d in catalog.values():
        for k in ("styles", "types"):
            for v in d.get(k) or []:
                counts[k][v] = counts[k].get(v, 0) + 1
        lay = d.get("layout") or {}
        for k in ("pattern", "theme", "palette", "links", "typeface", "effort"):
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


def lay_of(d):
    return d.get("layout") or {}


def text_blob(d):
    lay = lay_of(d)
    return " ".join(str(x) for x in (d.get("name"), d.get("description"), lay.get("summary"),
                                     lay.get("mobile"), lay.get("labels"),
                                     " ".join(lay.get("features") or []))).lower()


# kind -> (allowed values or None for free text, how to read it from a record)
FIELDS = {
    "theme": (THEMES, lambda d: [lay_of(d).get("theme")]),
    "palette": (PALETTES, lambda d: [lay_of(d).get("palette")]),
    "links": (LINKS, lambda d: [lay_of(d).get("links")]),
    "typeface": (TYPEFACES, lambda d: [lay_of(d).get("typeface")]),
    "effort": (EFFORTS, lambda d: [lay_of(d).get("effort")]),
    "pattern": (PATTERNS, lambda d: [lay_of(d).get("pattern")]),
    "feature": (FEATURES, lambda d: lay_of(d).get("features") or []),
    "style": (None, lambda d: d.get("styles") or []),
    "type": (None, lambda d: d.get("types") or []),
}


def allowed_for(kind, counts):
    allowed = FIELDS[kind][0]
    return allowed if allowed is not None else counts["styles" if kind == "style" else "types"]


def hard_filters(a, counts):
    """(label, predicate) pairs for the filters every result must pass."""
    hard = []  # (label, predicate)
    for kind in ("theme", "palette", "links"):
        values = getattr(a, kind, [])
        for v in values:
            check_value(kind, v, allowed_for(kind, counts))
        if values:
            hard.append((f"{kind}:{'|'.join(values)}",
                         lambda d, k=kind, vs=set(values): bool(vs & set(FIELDS[k][1](d)))))
    if getattr(a, "max_effort", None):
        check_value("effort", a.max_effort, EFFORTS)
        ok = set(EFFORTS[: EFFORTS.index(a.max_effort) + 1])
        hard.append((f"effort<={a.max_effort}", lambda d: lay_of(d).get("effort") in ok))
    if getattr(a, "min_groups", None):
        hard.append((f"groups>={a.min_groups}", lambda d: (lay_of(d).get("groups") or 0) >= a.min_groups))
    if getattr(a, "max_height", None):
        hard.append((f"height<={a.max_height}",
                     lambda d: 0 < (lay_of(d).get("height_px") or 0) <= a.max_height))
    for spec in getattr(a, "need", []):
        kind, _, v = spec.partition(":")
        if kind == "text":
            hard.append((f"need text:{v}", lambda d, v=v.lower(): v in text_blob(d)))
            continue
        if kind not in FIELDS or not v:
            raise UserError(f"--need takes KIND:VALUE with KIND in {', '.join(list(FIELDS) + ['text'])}; got '{spec}'")
        check_value(kind, v, allowed_for(kind, counts))
        hard.append((f"need {spec}", lambda d, k=kind, v=v: v in FIELDS[k][1](d)))
    for spec in getattr(a, "exclude", []):
        kind, _, v = spec.partition(":")
        if kind == "text":
            hard.append((f"not text:{v}", lambda d, v=v.lower(): v not in text_blob(d)))
            continue
        if kind not in FIELDS or not v:
            raise UserError(f"--not takes KIND:VALUE with KIND in {', '.join(list(FIELDS) + ['text'])}; got '{spec}'")
        check_value(kind, v, allowed_for(kind, counts))
        hard.append((f"not {spec}", lambda d, k=kind, v=v: v not in FIELDS[k][1](d)))

    return hard


def search(catalog, a):
    """Hard filters (theme, palette, links, typeface, effort, height, groups, --not) must match;
    values given twice for the same hard filter are alternatives. Soft filters (pattern, feature,
    style, type, text) each add a point; results rank by points, then newest."""
    counts = vocab_counts(catalog)
    hard = hard_filters(a, counts)
    soft = []  # (label, predicate, weight): structure and content outweigh vibe tags
    for kind, weight in (("pattern", 2), ("feature", 2), ("type", 2), ("style", 1), ("typeface", 1)):
        for v in getattr(a, kind):
            check_value(kind, v, allowed_for(kind, counts))
            soft.append((f"{kind}:{v}", lambda d, k=kind, v=v: v in FIELDS[k][1](d), weight))
    for word in a.text:
        soft.append((f"text:{word}", lambda d, w=word.lower(): w in text_blob(d), 2))

    rows = []
    for d in catalog.values():  # catalog is newest first
        if not all(pred(d) for _, pred in hard):
            continue
        hits = [(label, w) for label, pred, w in soft if pred(d)]
        if soft and not hits:
            continue
        if a.all and len(hits) < len(soft):
            continue
        rows.append(dict(d, matched=[label for label, _ in hits], score=sum(w for _, w in hits)))
    rows.sort(key=lambda d: -d["score"])  # stable: ties stay newest first
    return rows, sum(w for _, _, w in soft), [label for label, _ in hard]


def similar(catalog, slug, limit, a=None):
    """Footers that share the most layout traits with one footer, among those passing hard filters."""
    hard = hard_filters(a, vocab_counts(catalog)) if a else []
    slug = normalize_slug(slug)
    if slug not in catalog:
        raise UserError(f"unknown footer '{slug}'")
    ref = lay_of(catalog[slug])
    rfeat = set(ref.get("features") or [])
    rstyle = set(catalog[slug].get("styles") or [])
    rows = []
    for s, d in catalog.items():
        lay = lay_of(d)
        if s == slug or not lay or not all(pred(d) for _, pred in hard):
            continue
        score = 3 * (lay.get("pattern") == ref.get("pattern"))
        score += 2 * (lay.get("theme") == ref.get("theme")) + 2 * (lay.get("palette") == ref.get("palette"))
        score += (lay.get("links") == ref.get("links")) + (lay.get("typeface") == ref.get("typeface"))
        score += abs((lay.get("groups") or 0) - (ref.get("groups") or 0)) <= 1
        feat = set(lay.get("features") or [])
        score += 4 * len(feat & rfeat) / max(1, len(feat | rfeat))
        score += 0.5 * len(set(d.get("styles") or []) & rstyle)
        rows.append(dict(d, score=round(score, 1), matched=[]))
    rows.sort(key=lambda d: -d["score"])
    return rows[:limit]


def fmt_row(d, total=None, compact=False):
    lay = lay_of(d)
    if compact and total:
        return f"{d['score']}/{total} " + fmt_row(d, None, True) + f" | matched: {', '.join(d['matched']) or '-'}"
    if compact:
        if not lay:
            return f"{d['slug']} | (no layout description) | {', '.join(d.get('styles') or [])}"
        return (f"{d['slug']} | {lay.get('pattern')} | {lay.get('theme')}/{lay.get('palette', '?')} | "
                f"{lay.get('links')} links, {lay.get('groups') or 0} groups | {lay.get('height_px')}px tall | "
                f"effort {lay.get('effort')} | {lay.get('summary')}")
    head = f"{d['slug']}  ({d.get('name')}, {d.get('date_added') or '?'})"
    if total:
        head += f"  [{d['score']}/{total}: {', '.join(d['matched'])}]"
    lines = [head]
    if lay:
        groups = f"{lay['groups']} link groups" if lay.get("groups") else None
        meta = ", ".join(x for x in (lay.get("pattern"), lay.get("theme"), lay.get("palette"),
                                     f"{lay.get('links')} links", groups,
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


def download(records, out, views=("desktop", "mobile"), warn=False):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    jobs = [(d, v) for d in records for v in views]
    with ThreadPoolExecutor(WORKERS) as pool:
        saved = list(pool.map(lambda j: download_one(j[0], out, j[1]), jobs))
    if warn:
        for (d, v), p in zip(jobs, saved):
            if not p:
                print(f"note: {d['slug']} has no {v} screenshot on footer.design", file=sys.stderr)
    return [str(p) for p in saved if p]


def compare(record, mine_dir, out, shot_dir):
    """Source footer (footer.design screenshots) next to the rebuild (inspect_footer.mjs output)."""
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        raise UserError("compare needs Pillow (pip install pillow)")
    mine_dir, shot_dir = Path(mine_dir), Path(shot_dir)
    download([record], shot_dir)
    made = []
    for view, width in (("desktop", 1200), ("mobile", 390)):
        src = next(iter(sorted(shot_dir.glob(f"{record['slug']}-{view}.*"))), None)
        mine = mine_dir / f"footer-{view}.png"
        if not src or not mine.exists():
            print(f"note: skipped {view}: {'no source screenshot' if not src else f'no {mine}'}", file=sys.stderr)
            continue
        ims = []
        for label, path in (("source: footer.design", src), ("rebuild", mine)):
            im = Image.open(path).convert("RGB")
            im = im.resize((width, round(im.height * width / im.width)))
            ims.append((label, im))
        gap, head = 24, 22
        if view == "desktop":  # stacked
            canvas = Image.new("RGB", (width, sum(i.height + head for _, i in ims) + gap), "#dddddd")
            y = 0
            for label, im in ims:
                ImageDraw.Draw(canvas).text((4, y + 5), label, fill="black")
                canvas.paste(im, (0, y + head))
                y += im.height + head + gap
        else:  # side by side
            canvas = Image.new("RGB", (width * 2 + gap, max(i.height for _, i in ims) + head), "#dddddd")
            for k, (label, im) in enumerate(ims):
                ImageDraw.Draw(canvas).text((k * (width + gap) + 4, 5), label, fill="black")
                canvas.paste(im, (k * (width + gap), head))
        dest = Path(f"{out}-{view}.png")
        canvas.save(dest)
        made.append(str(dest))
        # heights in CSS px at the layout width (source screenshots are ~1.46x at desktop, ~2x on mobile)
        css_w = 1440 if view == "desktop" else 390
        src_h = round(Image.open(src).height * css_w / Image.open(src).width)
        mine_h = round(Image.open(mine).height * css_w / Image.open(mine).width)
        diff = mine_h - src_h
        print(f"{view}: source ~{src_h}px tall, rebuild {mine_h}px ({'+' if diff >= 0 else ''}{diff}px, "
              f"{round(100 * diff / max(1, src_h))}%) at {css_w}px wide", file=sys.stderr)
    return made


def contact_sheet(records, shot_dir, out, per_sheet=5, width=1100):
    """Numbered sheets, one footer per row (desktop + mobile), so finalists can be compared in a
    few image reads. Needs Pillow; returns [] with a note when it's missing."""
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        print("note: --sheet needs Pillow (pip install pillow); view the screenshots one by one instead",
              file=sys.stderr)
        return []
    shot_dir = Path(shot_dir)
    rows = []
    for i, d in enumerate(records, 1):
        found = {v: next(iter(sorted(shot_dir.glob(f"{d['slug']}-{v}.*"))), None) for v in ("desktop", "mobile")}
        if not found["desktop"]:
            continue
        desk = Image.open(found["desktop"]).convert("RGB")
        mob = Image.open(found["mobile"]).convert("RGB") if found["mobile"] else None
        h = 420
        desk = desk.resize((round(desk.width * h / desk.height), h))
        parts = [desk] + ([mob.resize((round(mob.width * h / mob.height), h))] if mob else [])
        row_w = sum(p.width for p in parts) + 12 * (len(parts) - 1)
        scale = min(1, (width - 150) / row_w)
        parts = [p.resize((max(1, round(p.width * scale)), max(1, round(p.height * scale)))) for p in parts]
        row = Image.new("RGB", (width, parts[0].height + 16), "white")
        x = 150
        for p in parts:
            row.paste(p, (x, 8))
            x += p.width + 12
        draw = ImageDraw.Draw(row)
        try:
            big, small = ImageFont.load_default(size=30), ImageFont.load_default(size=15)
        except TypeError:  # Pillow < 10.1
            big = small = ImageFont.load_default()
        draw.rectangle((0, 0, 140, row.height), fill="#ff00ff")
        draw.text((12, 10), str(i), fill="white", font=big)
        slug, y = d["slug"], 52
        while slug and y < row.height - 20:  # wrap the slug inside the strip
            n = len(slug)
            while n > 1 and draw.textlength(slug[:n], font=small) > 120:
                n -= 1
            draw.text((12, y), slug[:n], fill="white", font=small)
            slug, y = slug[n:], y + 20
        rows.append(row)
    made = []
    out = Path(out)
    for k in range(0, len(rows), per_sheet):
        chunk = rows[k:k + per_sheet]
        sheet = Image.new("RGB", (width, sum(r.height for r in chunk) + 8 * len(chunk)), "#dddddd")
        y = 0
        for r in chunk:
            sheet.paste(r, (0, y))
            y += r.height + 8
        dest = out.with_name(f"{out.stem}-{k // per_sheet + 1}{out.suffix or '.png'}")
        sheet.save(dest)
        made.append(str(dest))
    return made


GALLERY_CSS = """
:root{--bg:#f6f6f4;--fg:#161616;--muted:#666;--card:#fff;--line:#e2e2e0;--accent:#1f6feb}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#101010;--fg:#f2f2f2;--muted:#9a9a9a;--card:#191919;--line:#2a2a2a;--accent:#6ea8ff}}
:root[data-theme="dark"]{--bg:#101010;--fg:#f2f2f2;--muted:#9a9a9a;--card:#191919;--line:#2a2a2a;--accent:#6ea8ff}
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


def gallery(records, out, notes=None, pick=None, title="Footer shortlist", brief=None, images=None):
    """notes: optional {slug: "why it fits"}; pick: slug to highlight as the recommendation."""
    e = html.escape
    notes = notes or {}
    cards = []
    for i, d in enumerate(records, 1):
        lay = d.get("layout") or {}
        pattern = "custom layout" if lay.get("pattern") == "other" else lay.get("pattern")
        meta = " · ".join(x for x in [pattern, lay.get("theme"),
                                      f"{lay['links']} links" if lay.get("links") else None,
                                      f"effort {lay['effort']}" if lay.get("effort") else None] if x)
        if not meta:
            meta = " · ".join((d.get("styles") or []) + (d.get("types") or []))
        why = notes.get(d["slug"]) or ""
        summary = lay.get("summary") or ""
        if not why:
            why, summary = summary, ""
        srcs = {}
        for v in ("desktop", "mobile"):
            local = next(iter(sorted(Path(images).glob(f"{d['slug']}-{v}.*"))), None) if images else None
            if local:
                srcs[v] = os.path.relpath(local, Path(out).resolve().parent)
            elif d.get(v):
                srcs[v] = d[v]
        imgs = "".join(
            f'<img src="{e(src)}" alt="{e(d.get("name") or "")} footer, {v} view" loading="lazy">'
            for v, src in srcs.items()
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
            + f'<div class="views{"" if "mobile" in srcs else " solo"}">{imgs}</div></article>'
        )
    doc = (
        '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        f"<title>{e(title)}</title><style>{GALLERY_CSS}</style></head><body><main>"
        f"<h1>{e(title)}</h1>"
        + (f"<p class=\"lede\"><b>Brief:</b> {e(brief)}</p>" if brief else "")
        + "<p class=\"lede\">From footer.design. Desktop left, mobile right. "
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
        made.append({"slug": d["slug"], "image": str(dest), "height_px": h_px,
                     "bg": dominant_color(views["desktop"]), "palette": measure_palette(views["desktop"])})
    return made


def dominant_color(path):
    """Most common color across the desktop screenshot, as hex: a proxy for the footer background."""
    from PIL import Image

    im = Image.open(path).convert("RGB")
    im.thumbnail((240, 240))
    raw = im.tobytes()
    buckets = {}
    for i in range(0, len(raw), 3):
        k = (raw[i] // 16 * 16 + 8, raw[i + 1] // 16 * 16 + 8, raw[i + 2] // 16 * 16 + 8)
        buckets[k] = buckets.get(k, 0) + 1
    r, g, b = max(buckets, key=buckets.get)
    return f"#{r:02x}{g:02x}{b:02x}"


def measure_palette(path):
    """bw: grays only; mono-color: one hue family plus neutrals; multicolor: several hues."""
    import colorsys

    from PIL import Image

    im = Image.open(path).convert("RGB")
    im.thumbnail((200, 200))
    raw = im.tobytes()
    hues, colored = {}, 0
    for i in range(0, len(raw), 3):
        h, light, sat = colorsys.rgb_to_hls(raw[i] / 255, raw[i + 1] / 255, raw[i + 2] / 255)
        if sat > 0.25 and 0.12 < light < 0.9:
            colored += 1
            k = int(h * 12) % 12
            hues[k] = hues.get(k, 0) + 1
    if colored < 0.03 * len(raw) / 3:
        return "bw"
    top = sorted(hues.values(), reverse=True)[:2]
    return "mono-color" if sum(top) / colored > 0.8 else "multicolor"


def validate_layout(slug, lay):
    errs = []
    if lay.get("pattern") not in PATTERNS:
        errs.append(f"pattern {lay.get('pattern')!r}")
    bad = [f for f in lay.get("features") or [] if f not in FEATURES]
    if bad:
        errs.append(f"features {bad}")
    for key, allowed in (("theme", THEMES), ("palette", PALETTES), ("links", LINKS), ("typeface", TYPEFACES),
                         ("effort", EFFORTS)):
        if lay.get(key) not in allowed:
            errs.append(f"{key} {lay.get(key)!r}")
    if not isinstance(lay.get("groups"), int):
        errs.append(f"groups {lay.get('groups')!r}")
    if not isinstance(lay.get("labels", ""), str):
        errs.append("labels must be a string")
    for key, limit in (("summary", 30), ("mobile", 15)):
        text = lay.get(key)
        if not isinstance(text, str) or not text.strip():
            errs.append(f"{key} missing")
        elif len(text.split()) > limit:
            errs.append(f"{key} is {len(text.split())} words (max {limit})")
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
            order = ["pattern", "features", "theme", "palette", "bg", "links", "groups", "typeface", "height_px",
                     "effort", "summary", "mobile", "labels"]
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

def add_hard_args(p):
    p.add_argument("--theme", action="append", default=[], help=" | ".join(THEMES))
    p.add_argument("--palette", action="append", default=[],
                   help="bw (black/white/grays only) | mono-color (one hue + neutrals) | multicolor")
    p.add_argument("--links", action="append", default=[], help="few (<=8) | some (9-20) | many (21+)")
    p.add_argument("--max-effort", help="low | medium | high")
    p.add_argument("--max-height", type=int, help="max footer height in px at 1440 wide")
    p.add_argument("--min-groups", type=int, help="at least N link groups/columns, whatever the pattern")
    p.add_argument("--need", action="append", default=[], metavar="KIND:VALUE",
                   help="require any soft value, e.g. --need pattern:giant-wordmark --need feature:hours")
    p.add_argument("--not", dest="exclude", action="append", default=[], metavar="KIND:VALUE",
                   help="exclude, e.g. --not feature:3d --not theme:colorful --not text:game")


def main():
    p = argparse.ArgumentParser(description="Search footer.design footers")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("vocab", help="every filter value with how many footers have it")
    s = sub.add_parser("search", help="filter the local index: hard filters must match, soft ones rank",
                       description="Hard filters must match (repeat one to allow alternatives): --theme "
                                   "--palette --links --max-effort --max-height --min-groups --not. "
                                   "Soft filters rank results (pattern, feature, type, text count 2; style, "
                                   "typeface 1): --pattern --feature --type --text --style --typeface. "
                                   "--all makes soft filters required too.")
    s.add_argument("--style", action="append", default=[], help="footer.design style tag, e.g. dark")
    s.add_argument("--type", action="append", default=[], help="footer.design site type, e.g. saas")
    s.add_argument("--pattern", action="append", default=[], help="layout pattern, e.g. giant-wordmark")
    s.add_argument("--feature", action="append", default=[], help="layout feature, e.g. newsletter")
    s.add_argument("--typeface", action="append", default=[], help=" | ".join(TYPEFACES))
    add_hard_args(s)
    s.add_argument("--text", action="append", default=[], help="word in the name, description or summary")
    s.add_argument("--all", action="store_true", help="require every soft filter to match too")
    s.add_argument("--limit", type=int, default=30)
    s.add_argument("--compact", action="store_true", help="one line per footer")
    s.add_argument("--json", action="store_true")
    sm = sub.add_parser("similar", help="footers that share the most layout traits with one footer")
    sm.add_argument("slug")
    sm.add_argument("--limit", type=int, default=12)
    sm.add_argument("--compact", action="store_true")
    add_hard_args(sm)
    d = sub.add_parser("site", help="everything known about one or more footers")
    d.add_argument("slugs", nargs="+")
    d.add_argument("--json", action="store_true")
    dl = sub.add_parser("download", help="save desktop + mobile screenshots as viewable images")
    dl.add_argument("slugs", nargs="+")
    dl.add_argument("--out", default="footer-design-shots")
    dl.add_argument("--sheet", metavar="FILE.png",
                    help="also write numbered contact sheets FILE-1.png, FILE-2.png… (5 footers each; needs Pillow)")
    g = sub.add_parser("gallery", help="write a numbered HTML contact sheet")
    g.add_argument("slugs", nargs="+")
    g.add_argument("--out", default="footer-shortlist.html")
    g.add_argument("--notes", help="JSON file {slug: why it fits}; replaces the stock summaries")
    g.add_argument("--pick", help="slug to mark as recommended")
    g.add_argument("--title", default="Footer shortlist")
    g.add_argument("--brief", help="one line restating the user's brief, shown under the title")
    g.add_argument("--images", metavar="DIR", help="use screenshots saved by `download` instead of hotlinking")
    cp = sub.add_parser("compare", help="source footer next to your rebuild, desktop and mobile (needs Pillow)")
    cp.add_argument("slug")
    cp.add_argument("--mine", required=True, metavar="DIR",
                    help="output dir of inspect_footer.mjs run on your own page (footer-desktop.png, footer-mobile.png)")
    cp.add_argument("--out", metavar="PREFIX",
                    help="writes PREFIX-desktop.png, PREFIX-mobile.png (default: <mine>/compare-*)")
    cp.add_argument("--shots", default="footer-design-shots", metavar="DIR", help="where source screenshots are saved")
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
        for key, flag in (("theme", "theme"), ("palette", "palette"), ("links", "links"),
                          ("typeface", "typeface"), ("effort", "max-effort")):
            print(f"--{flag}: " + ", ".join(f"{k} ({v})" for k, v in sorted(counts[key].items(), key=lambda x: -x[1])))
        for key, flag in (("styles", "style"), ("types", "type")):
            print(f"\n--{flag} (footer.design tags): "
                  + ", ".join(f"{k} ({v})" for k, v in sorted(counts[key].items(), key=lambda x: -x[1])))
    elif a.cmd == "search":
        rows, total, hard = search(load_catalog(), a)
        shown = rows[: a.limit]
        if a.json:
            print(json.dumps(shown, indent=1, ensure_ascii=False))
        else:
            req = f" (all match: {', '.join(hard)})" if hard else ""
            if rows:
                print(f"{len(rows)} footers{req}; showing {len(shown)}, best first (score = weighted soft matches)")
            elif hard:
                print(f"no matches for {', '.join(hard)}: drop one, or allow alternatives "
                      "(e.g. --links some --links many)")
            else:
                print("no matches: try fewer or broader soft filters")
            print("\n".join(fmt_row(d, total, a.compact) for d in shown))
    elif a.cmd == "similar":
        rows = similar(load_catalog(), a.slug, a.limit, a)
        print("\n".join(fmt_row(d, None, a.compact) + ("" if a.compact else f"\n    similarity {d['score']}")
                        for d in rows))
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
            for k in ("pattern", "features", "theme", "palette", "bg", "links", "groups", "typeface", "height_px",
                      "effort", "summary", "mobile", "labels"):
                if k in lay:
                    v = ", ".join(lay[k]) if isinstance(lay[k], list) else lay[k]
                    print(f"  layout.{k}: {v}")
            print()
        if not data:
            sys.exit(1)
    elif a.cmd == "download":
        recs = lookup(a.slugs)
        saved = download(recs, a.out, warn=True)
        print(f"saved {len(saved)} images for {len(recs)} footers in {a.out} (<slug>-desktop.png, <slug>-mobile.png)")
        if a.sheet:
            for sheet in contact_sheet(recs, a.out, a.sheet):
                print(f"sheet: {sheet}")
        if not saved:
            sys.exit(1)
    elif a.cmd == "gallery":
        recs = lookup(a.slugs)
        if not recs:
            sys.exit(1)
        notes = load_json(Path(a.notes), {}) if a.notes else None
        print(gallery(recs, a.out, notes=notes, pick=a.pick and normalize_slug(a.pick), title=a.title,
                      brief=a.brief, images=a.images))
    elif a.cmd == "compare":
        recs = lookup([a.slug])
        if not recs:
            sys.exit(1)
        made = compare(recs[0], a.mine, a.out or str(Path(a.mine) / "compare"), a.shots)
        print("\n".join(made))
        if not made:
            sys.exit(1)
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
