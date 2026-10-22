#!/usr/bin/env python3
"""Browse footer.design (Footr Design) from the command line.

Dependency-free (Python 3.9+ stdlib). Honors HTTPS_PROXY. Responses are cached
for a day in ~/.cache/footer-design so repeated searches stay polite and fast.

Usage:
  footer_design.py taxonomy
  footer_design.py search [--style S]... [--type T]... [--all] [--limit N] [--pages N] [--json]
  footer_design.py site <slug>... [--json]
  footer_design.py download <slug>... [--out DIR]
  footer_design.py gallery <slug>... [--out FILE]

A slug is the last path segment of https://www.footer.design/sites/<slug>; full URLs work too.
"""

import argparse
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
UA = "footer-design-skill/1.0 (+https://github.com/tomimor/skills)"
CACHE = Path(os.environ.get("FOOTER_DESIGN_CACHE", Path.home() / ".cache" / "footer-design"))
CACHE_TTL = 24 * 3600
WORKERS = 4


def fetch(url, binary=False):
    key = hashlib.sha1(url.encode()).hexdigest()
    path = CACHE / key
    if path.exists() and time.time() - path.stat().st_mtime < CACHE_TTL:
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


def taxonomy():
    xml = fetch(f"{BASE}/sitemap.xml")
    locs = re.findall(r"<loc>([^<]+)</loc>", xml)
    out = {"styles": [], "types": [], "sites": 0}
    for loc in locs:
        parts = loc.replace(BASE, "").strip("/").split("/")
        if len(parts) == 2 and parts[0] in ("styles", "types"):
            out[parts[0]].append(parts[1])
        elif len(parts) == 2 and parts[0] == "sites":
            out["sites"] += 1
    return out


def parse_listing(page_html):
    items = []
    for block in page_html.split('class="gallery_item w-dyn-item"')[1:]:
        m = re.search(r'aria-label="([^"]*)" href="/sites/([^"]+)"', block)
        if not m:
            continue
        live = re.search(r'href="(https?://[^"]+)"[^>]*class="button tertiary', block)
        thumb = re.search(r'<img[^>]+src="([^"]+)"', block)
        items.append({
            "slug": m.group(2),
            "name": html.unescape(m.group(1)),
            "live": live.group(1) if live else None,
            "thumbnail": thumb.group(1) if thumb else None,
        })
    return items


def listing(path, max_pages=None):
    """All items of a listing (home, /styles/x, /types/x), newest first."""
    first = fetch(f"{BASE}{path}")
    items = parse_listing(first)
    total = re.search(r"\d+ / (\d+)", first)
    param = re.search(r'href="\?([a-z0-9]+_page)=', first)
    if not (total and param):
        return items
    last = int(total.group(1))
    if max_pages:
        last = min(last, max_pages)
    urls = [f"{BASE}{path}?{param.group(1)}={n}" for n in range(2, last + 1)]
    with ThreadPoolExecutor(WORKERS) as pool:
        for page in pool.map(fetch, urls):
            items.extend(parse_listing(page))
    seen, unique = set(), []
    for it in items:
        if it["slug"] not in seen:
            seen.add(it["slug"])
            unique.append(it)
    return unique


class UserError(Exception):
    pass


def check_filters(styles, types):
    t = taxonomy()
    for kind, given in (("styles", styles), ("types", types)):
        for name in given:
            if name not in t[kind]:
                close = difflib.get_close_matches(name, t[kind], n=3)
                hint = f" Did you mean: {', '.join(close)}?" if close else " Run `taxonomy` for the list."
                raise UserError(f"unknown {kind[:-1]} '{name}'.{hint}")


def search(styles, types, require_all, limit, max_pages):
    check_filters(styles, types)
    filters = [f"/styles/{s}" for s in styles] + [f"/types/{t}" for t in types]
    if not filters:
        return listing("/", max_pages=max_pages or 2)[:limit]
    order, scores, matched = {}, {}, {}
    for f in filters:
        for i, it in enumerate(listing(f, max_pages=max_pages)):
            order.setdefault(it["slug"], (i, it))
            scores[it["slug"]] = scores.get(it["slug"], 0) + 1
            matched.setdefault(it["slug"], []).append(f.strip("/"))
    slugs = [s for s in scores if not require_all or scores[s] == len(filters)]
    slugs.sort(key=lambda s: (-scores[s], order[s][0]))
    return [dict(order[s][1], matched=matched[s], score=f"{scores[s]}/{len(filters)}") for s in slugs[:limit]]


def normalize_slug(s):
    return s.strip().rstrip("/").rsplit("/sites/", 1)[-1].split("?")[0].split("#")[0]


def site(slug):
    slug = normalize_slug(slug)
    try:
        page = fetch(f"{BASE}/sites/{slug}")
    except Exception as e:  # noqa: BLE001
        reason = "not found on footer.design" if getattr(e, "code", None) == 404 else str(e)
        return {"slug": slug, "error": reason}
    data = {"slug": slug, "page": f"{BASE}/sites/{slug}"}
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
    if "desktop" not in data:
        img = re.search(r'src="([^"]+-desktop\.[a-z]+)"', page)
        data["desktop"] = img.group(1) if img else None
    if "mobile" not in data:
        img = re.search(r'src="([^"]+-mobile\.[a-z]+)"', page)
        data["mobile"] = img.group(1) if img else None
    return data


def sites(slugs, warn=True):
    with ThreadPoolExecutor(WORKERS) as pool:
        found = list(pool.map(site, slugs))
    if warn:
        for d in found:
            if "error" in d:
                print(f"warning: skipped '{d['slug']}': {d['error']}", file=sys.stderr)
    return [d for d in found if "error" not in d]


def download(slugs, out):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    saved = []
    for d in sites(slugs):
        for view in ("desktop", "mobile"):
            url = d.get(view)
            if not url:
                continue
            ext = os.path.splitext(url.split("?")[0])[1] or ".jpg"
            dest = out / f"{d['slug']}-{view}{ext}"
            dest.write_bytes(fetch(url, binary=True))
            if ext.lower() in (".avif", ".webp"):
                dest = to_png(dest)
            saved.append(str(dest))
    return saved


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


GALLERY_CSS = """
:root{--bg:#fafafa;--fg:#161616;--muted:#6b6b6b;--card:#fff;--line:#e4e4e4}
@media (prefers-color-scheme:dark){:root{--bg:#111;--fg:#f2f2f2;--muted:#9a9a9a;--card:#1a1a1a;--line:#2a2a2a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}
main{max-width:1200px;margin:0 auto;padding:32px 16px}h1{font-size:1.4rem;margin:0 0 24px}
article{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:24px}
header{display:flex;gap:12px;align-items:baseline;flex-wrap:wrap;margin-bottom:12px}
.n{font-weight:700;font-size:1.4rem}.name{font-weight:600;font-size:1.1rem}.tags{color:var(--muted);font-size:.85rem}
.views{display:grid;grid-template-columns:3fr 1fr;gap:12px;align-items:start}
img{width:100%;height:auto;border-radius:8px;border:1px solid var(--line);display:block}
a{color:inherit}@media (max-width:640px){.views{grid-template-columns:1fr}}
"""


def gallery(slugs, out):
    cards = []
    for i, d in enumerate(sites(slugs), 1):
        e = html.escape
        tags = " · ".join(d.get("styles", []) + d.get("types", []))
        imgs = "".join(
            f'<img src="{e(d[v])}" alt="{e(d.get("name") or "")} {v} footer" loading="lazy">'
            for v in ("desktop", "mobile") if d.get(v)
        )
        cards.append(
            f'<article><header><span class="n">{i}</span><span class="name">{e(d.get("name") or d["slug"])}</span>'
            f'<span class="tags">{e(tags)}</span>'
            f'<a href="{e(d["page"])}">footer.design</a>'
            + (f' <a href="{e(d["live"])}">live site</a>' if d.get("live") else "")
            + f'</header><div class="views">{imgs}</div></article>'
        )
    doc = (
        '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        f"<title>Footer shortlist</title><style>{GALLERY_CSS}</style></head><body><main>"
        "<h1>Footer shortlist (from footer.design)</h1>" + "".join(cards) + "</main></body></html>"
    )
    Path(out).write_text(doc, encoding="utf-8")
    return out


def print_items(items, as_json):
    if as_json:
        print(json.dumps(items, indent=2, ensure_ascii=False))
        return
    for it in items:
        extra = f"  [{it['score']}: {', '.join(it['matched'])}]" if "score" in it else ""
        print(f"{it['slug']}\t{it['name']}\t{it.get('live') or ''}{extra}")


def main():
    p = argparse.ArgumentParser(description="Browse footer.design")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("taxonomy", help="list style and type filters")
    s = sub.add_parser("search", help="find footers by style/type (newest first, best match first)")
    s.add_argument("--style", action="append", default=[])
    s.add_argument("--type", action="append", default=[])
    s.add_argument("--all", action="store_true", help="require every filter to match")
    s.add_argument("--limit", type=int, default=24)
    s.add_argument("--pages", type=int, default=None, help="max listing pages per filter (12 per page)")
    s.add_argument("--json", action="store_true")
    d = sub.add_parser("site", help="details for one or more sites")
    d.add_argument("slugs", nargs="+")
    d.add_argument("--json", action="store_true")
    dl = sub.add_parser("download", help="save desktop + mobile screenshots")
    dl.add_argument("slugs", nargs="+")
    dl.add_argument("--out", default="footer-design-shots")
    g = sub.add_parser("gallery", help="write a numbered HTML contact sheet")
    g.add_argument("slugs", nargs="+")
    g.add_argument("--out", default="footer-shortlist.html")
    a = p.parse_args()

    if a.cmd == "taxonomy":
        t = taxonomy()
        print(f"{t['sites']} sites")
        print("styles: " + ", ".join(t["styles"]))
        print("types:  " + ", ".join(t["types"]))
    elif a.cmd == "search":
        print_items(search(a.style, a.type, a.all, a.limit, a.pages), a.json)
    elif a.cmd == "site":
        data = sites(a.slugs)
        if a.json:
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            for x in data:
                print(f"{x.get('name')} ({x['slug']})")
                for k in ("live", "designer", "date_added", "desktop", "mobile"):
                    print(f"  {k}: {x.get(k)}")
                print(f"  styles: {', '.join(x['styles'])}\n  types: {', '.join(x['types'])}")
                print(f"  about: {x.get('description')}\n")
    elif a.cmd == "download":
        print("\n".join(download(a.slugs, a.out)))
    elif a.cmd == "gallery":
        print(gallery(a.slugs, a.out))
    if a.cmd in ("site", "download", "gallery") and not sites(a.slugs, warn=False):
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except UserError as e:
        print(f"error: {e}", file=sys.stderr)
        sys.exit(2)
    except KeyboardInterrupt:
        sys.exit(130)
