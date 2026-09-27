#!/usr/bin/env bash
# Builds runnable eval fixtures: copies fixture sources, downloads the sample
# models (Khronos glTF-Sample-Assets, three.js r186 examples), prepares the
# per-fixture models, and installs npm dependencies.
# Usage: evals/setup-fixtures.sh <out-dir>
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$(mkdir -p "${1:?usage: setup-fixtures.sh <out-dir>}" && cd "$1" && pwd)"
KHRONOS=https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models
THREE_EXAMPLES=https://raw.githubusercontent.com/mrdoob/three.js/r186/examples
CACHE="$OUT/.cache"
mkdir -p "$CACHE/tools"

fetch() { [[ -s "$CACHE/$2" ]] || curl -fsSL --retry 3 -o "$CACHE/$2" "$1"; }
fetch "$KHRONOS/DamagedHelmet/glTF-Binary/DamagedHelmet.glb" helmet.glb
fetch "$KHRONOS/Fox/glTF-Binary/Fox.glb" fox.glb
fetch "$KHRONOS/ToyCar/glTF-Binary/ToyCar.glb" toycar.glb
fetch "$THREE_EXAMPLES/models/gltf/coffeemat.glb" coffeemat.glb
fetch "$THREE_EXAMPLES/textures/equirectangular/venice_sunset_1k.hdr" studio.hdr

if [[ ! -d "$CACHE/tools/node_modules/@gltf-transform/cli" ]]; then
  (cd "$CACHE/tools" && npm init -y >/dev/null && npm install --silent @gltf-transform/cli@4 @gltf-transform/core@4 sharp)
fi
GLTF="$CACHE/tools/node_modules/.bin/gltf-transform"
web() { [[ -s "$CACHE/$2" ]] || NO_COLOR=1 "$GLTF" optimize "$CACHE/$1" "$CACHE/$2" --compress meshopt --texture-compress webp --texture-size 1024 >/dev/null; }
web helmet.glb helmet-web.glb
web fox.glb fox-web.glb
web toycar.glb toycar-web.glb
if [[ ! -s "$CACHE/chair.glb" ]]; then
  cp "$HERE/scripts/make-chair.mjs" "$CACHE/tools/"
  (cd "$CACHE/tools" && node make-chair.mjs "$CACHE/chair.glb" >/dev/null)
fi

for fixture in product-page react-gallery legacy-hero asset-pipeline; do
  rm -rf "${OUT:?}/$fixture"
  cp -R "$HERE/fixtures/$fixture" "$OUT/$fixture"
done

mkdir -p "$OUT/product-page/public/models"
cp "$CACHE/helmet.glb" "$OUT/product-page/public/models/helmet.glb"

mkdir -p "$OUT/react-gallery/public/models"
cp "$CACHE/helmet-web.glb" "$OUT/react-gallery/public/models/helmet.glb"
cp "$CACHE/fox-web.glb" "$OUT/react-gallery/public/models/fox.glb"
cp "$CACHE/toycar-web.glb" "$OUT/react-gallery/public/models/toycar.glb"
cp "$CACHE/coffeemat.glb" "$OUT/react-gallery/public/models/coffeemat.glb"

mkdir -p "$OUT/legacy-hero/public/models" "$OUT/legacy-hero/public/env"
cp "$CACHE/fox.glb" "$OUT/legacy-hero/public/models/fox.glb"
cp "$CACHE/studio.hdr" "$OUT/legacy-hero/public/env/studio.hdr"

mkdir -p "$OUT/asset-pipeline/models"
cp "$CACHE/chair.glb" "$CACHE/helmet.glb" "$CACHE/fox.glb" "$OUT/asset-pipeline/models/"

for fixture in product-page react-gallery legacy-hero asset-pipeline; do
  (cd "$OUT/$fixture" && npm install --silent --no-audit --no-fund)
  echo "ready: $OUT/$fixture"
done
