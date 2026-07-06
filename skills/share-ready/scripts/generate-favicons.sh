#!/usr/bin/env bash
# Generate the full favicon/app-icon set from one square source image.
# Usage: generate-favicons.sh <source-image> <output-dir> [--pad-maskable]
#
# Produces:
#   favicon.ico          multi-size 16/32/48 (legacy browsers, old crawlers)
#   apple-touch-icon.png 180x180, opaque (iOS composites black behind alpha)
#   icon-192.png         PWA manifest
#   icon-512.png         PWA manifest
#   icon-maskable-512.png  512x512 with ~20% safe-zone padding (--pad-maskable)
#
# Prefers ImageMagick (magick/convert); falls back to npx sharp-cli + png-to-ico.
# Source should be square and >=512px. SVG favicon: just copy the source .svg
# alongside — no rasterization needed for <link rel="icon" type="image/svg+xml">.

set -euo pipefail

SRC="${1:?source image required}"
OUT="${2:?output dir required}"
PAD_MASKABLE="${3:-}"
mkdir -p "$OUT"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if command -v magick >/dev/null 2>&1; then IM="magick"
elif command -v convert >/dev/null 2>&1; then IM="convert"
else IM=""
fi

sharp() { npx --yes sharp-cli "$@" >/dev/null; }

resize() { # resize <size> <dest> [opaque [bgcolor]]
  local size="$1" dest="$2" opaque="${3:-}" bg="${4:-white}"
  if [ -n "$IM" ]; then
    if [ -n "$opaque" ]; then
      $IM "$SRC" -resize "${size}x${size}" -background "$bg" -alpha remove -alpha off "$dest"
    else
      $IM "$SRC" -resize "${size}x${size}" "$dest"
    fi
  else
    if [ -n "$opaque" ]; then
      sharp -i "$SRC" -o "$TMP/resize-$size.png" resize "$size" "$size" --fit contain --background "$bg"
      sharp -i "$TMP/resize-$size.png" -o "$dest" flatten "$bg"
    else
      sharp -i "$SRC" -o "$dest" resize "$size" "$size" --fit contain --background "rgba(0,0,0,0)"
    fi
  fi
}

resize 180 "$OUT/apple-touch-icon.png" opaque
resize 192 "$OUT/icon-192.png"
resize 512 "$OUT/icon-512.png"

# maskable: icon content shrunk to ~80% inside a 512 canvas so Android's
# circle/squircle crop (safe zone = centered circle, radius 40% of width)
# doesn't clip it
if [ "$PAD_MASKABLE" = "--pad-maskable" ]; then
  if [ -n "$IM" ]; then
    $IM "$SRC" -resize 410x410 -background none -gravity center -extent 512x512 "$OUT/icon-maskable-512.png"
  else
    sharp -i "$SRC" -o "$TMP/mask-410.png" resize 410 410 --fit contain --background "rgba(0,0,0,0)"
    sharp -i "$TMP/mask-410.png" -o "$OUT/icon-maskable-512.png" extend 51 51 51 51 --background "rgba(0,0,0,0)"
  fi
fi

# favicon.ico with 16/32/48 embedded
if [ -n "$IM" ]; then
  $IM "$SRC" -resize 48x48 -define icon:auto-resize=48,32,16 "$OUT/favicon.ico"
else
  npx --yes png-to-ico "$SRC" > "$TMP/favicon-full.ico"
  # png-to-ico always appends a 256x256 PNG entry (~270KB uncompressed source);
  # drop it — favicon.ico exists for legacy consumers that can't read it anyway
  python3 - "$TMP/favicon-full.ico" "$OUT/favicon.ico" <<'PY'
import struct, sys
d = open(sys.argv[1], 'rb').read()
n = struct.unpack('<H', d[4:6])[0]
entries = [d[6+i*16:6+(i+1)*16] for i in range(n)]
keep = [e for e in entries if 0 < (e[0] or 256) <= 48]
out, blobs, off = [], [], 6 + 16 * len(keep)
for e in keep:
    size, src = struct.unpack('<II', e[8:16])
    blobs.append(d[src:src+size])
    out.append(e[:8] + struct.pack('<II', size, off))
    off += size
open(sys.argv[2], 'wb').write(d[:4] + struct.pack('<H', len(keep)) + b''.join(out) + b''.join(blobs))
PY
fi

echo "Generated in $OUT:"
ls -la "$OUT" | grep -E 'ico|png'
