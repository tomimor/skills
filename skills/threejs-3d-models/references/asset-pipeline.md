# Asset pipeline

Numbers marked *measured* come from running `@gltf-transform/cli` 4.5 and
three.js r186 on Khronos sample models; they show proportions, not
guarantees for your model.

## Formats

- **Deliver GLB**: one request, binary buffers, no base64 bloat. Keep
  `.gltf` plus external files for debugging only.
- **Convert everything else offline.** Export from Blender with File, Export,
  glTF 2.0 (.glb). Don't ship FBXLoader or OBJLoader to users: those formats
  are larger, slower to parse, and carry no PBR material standard.
- **Enable compression in gltf-transform, not in the DCC exporter**, so every
  model on the site goes through the same settings.

## Inspect before and after

```bash
npx @gltf-transform/cli inspect model.glb --format md
```

Read these columns:

| Section | Look at | Why |
|---|---|---|
| SCENES | `renderVertexCount` | Vertex-shader cost per frame |
| MESHES | row count × `glPrimitives`, `size` | Each primitive is roughly one draw call; `size` is geometry memory |
| MATERIALS | count | Shader variants to compile |
| TEXTURES | `resolution`, `mimeType`, `size`, `gpuSize` | Download size vs VRAM. `gpuSize` is what the GPU pays |
| ANIMATIONS | channels, duration | Keyframe data can outweigh geometry |

## Budgets

Targets for one model that must work on mid-range phones; the ceilings are
Khronos's 3D Commerce publishing targets (below). Tighten them when several
models share a page, and relax them for desktop-only tools.

| Metric | Target | Ceiling | Notes |
|---|---|---|---|
| GLB transfer size | ≤ 1 MB (hero ≤ 2 MB) | 3 MB | Measured after gzip/brotli. 3 MB takes about 15 s on Lighthouse's Slow 4G (1.6 Mbps). |
| Texture resolution | 1024–2048 px | 2048 px (4096 only as KTX2) | 2048² RGBA with mipmaps is 22 MB of VRAM; 4096² is 89 MB |
| Textures per model | ≤ 5–8 | — | One set: baseColor, normal, ORM, and optionally emissive |
| Draw calls (primitives) | < 20 on mobile, < 100 on desktop | 500 mobile, 800 desktop | Check `renderer.info.render.calls` in the page |
| Triangles | ≤ 100k | 150k mobile, 250k desktop | Mobile vertex cost; use `--simplify` or retopology |
| Materials | ≤ 10 | — | Each unique material means another shader compile |

Khronos's [3D Commerce publishing targets](https://github.com/KhronosGroup/3DC-Asset-Creation/blob/main/asset-creation-guidelines-1.0/full-version/sec99_PublishingTargets/PublishingTargets.md)
(v1.0, 2020, still current) are upper limits, sized for loading in 3 s on a
10 Mb/s connection:

| Publishing target | File | Triangles | Draw calls: target (max) | Textures |
|---|---|---|---|---|
| Single item, mobile AR or 3D web view | 3 MB | 150,000 | < 20 (500) | 2K |
| Single item, desktop 3D web view | 3 MB | 250,000 | < 100 (800) | 2K |
| One of several items (a web-based planning tool) | 1 MB | 40,000 | < 5 (50) | 1K |
| Banner ad | 500 KB | 30,000 | < 5 (100) | 512 |

Pages that show many models at once, such as galleries, are closest to the
"one of several items" row, so budget each model from it. For a tiny preview,
drop texture maps in reverse order of importance: emissive, then normal,
then ORM, and keep base color.

## gltf-transform recipes

```bash
# Static product or hero: Meshopt geometry, WebP textures, max 2048 px
npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt --texture-compress webp

# Parts addressed by name in code (configurators, clickable parts, per-part materials)
npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt --texture-compress webp \
  --join-named false --instance false --palette false          # + --flatten false to keep hierarchy
                                                               # + --prune-attributes false to keep UVs on untextured parts

# Skinned or animated characters: keep every deforming vertex
npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt --texture-compress webp --simplify false

# Lossless normal map first, then everything else without re-encoding textures
npx @gltf-transform/cli webp in.glb tmp.glb --slots "normalTexture" --lossless true
npx @gltf-transform/cli optimize tmp.glb out.glb --compress meshopt --texture-compress false

# GPU-compressed textures (requires KTX-Software 4.4+ `ktx` CLI on PATH)
npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt --texture-compress ktx2

# Mobile-first or small embeds
npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt --texture-compress webp --texture-size 1024
```

What `optimize` does by default (4.5): it prunes, dedups, and welds; it
flattens the scene graph; it joins meshes, including named ones; it
instances repeated meshes (5 or more); it palettes solid-color materials
into one texture; it simplifies with error 0.0001, resamples animations,
and resizes textures to 2048. That is ideal for static display and
destructive for code that looks up nodes by name. *Measured*: 12 named
parts sharing one material came out as 2 unnamed nodes with the defaults,
6 nodes with only `--join-named false` (instancing still merged look-alike
parts), and all 12 with `--join-named false --instance false`.

With `--texture-compress ktx2`, `optimize` encodes normal, occlusion, and
metallic-roughness maps as UASTC (higher quality) and the rest as ETC1S
(smaller). Without the `ktx` binary installed, it fails with
`Command "ktx" not found`.

**Order of passes.** Make `optimize` the last command. Any CLI pass that
rewrites a Meshopt-compressed file re-encodes it with the default, weaker
settings. *Measured* on the Fox: `optimize` then a lossless-WebP pass gave
84 KB, while the WebP pass first and then `optimize --texture-compress false`
gave 57 KB.

**Simplification on skinned meshes.** The default simplify step also runs on
skinned meshes, where removed vertices change how the mesh deforms. On the
Fox sample it removed 16% of the triangles and visibly shifted poses. Pass
`--simplify false` for characters.

## Meshopt vs Draco

| | Meshopt (`--compress meshopt`) | Draco (`--compress draco`) |
|---|---|---|
| Compresses | Geometry, animation keyframes, morph targets | Geometry only |
| Decoder cost | 29 KB JS module, 8 KB gzip (WASM inlined), no extra requests | 192 KB WASM + 58 KB wrapper (glTF build), 75 KB gzip, fetched on first use |
| *Measured*, static DamagedHelmet (geometry only) | 3.77 → 3.40 MB | 3.77 → 3.29 MB |
| *Measured*, animated Fox (raw → gzip) | 163 → 73 → 50 KB | 163 → 88 → 66 KB |
| three.js setup | `loader.setMeshoptDecoder(MeshoptDecoder)` | `loader.setDRACOLoader(new DRACOLoader().setDecoderPath(DRACO_GLTF_CONFIG))` |

Default to Meshopt, and serve the GLB with gzip or brotli: it is designed to
be followed by HTTP compression, and on animated models it wins outright.
Draco can be slightly smaller for static, geometry-heavy meshes on a host
that can't compress responses, but the 250 KB decoder usually costs more
than it saves. The component registers both, so either format loads.

Compression shrinks the download, not the rendering cost. Both codecs decode
on the CPU before upload, so the GPU draws exactly the same mesh. For frame
rate, cut triangles and draw calls (`simplify`, `join`, `instance`).

**gltfpack** (from meshoptimizer) is a fast alternative for geometry:
`npx gltfpack@1.3 -i in.glb -o out.glb -cc` quantizes, merges meshes on
non-animated nodes, resamples animation to 30 Hz, and applies Meshopt.
*Measured*: the Fox went from 163 to 59 KB and kept all 576 triangles and 3
clips. `-si 0.5` targets half the triangles, within the `-se` error limit
(1% by default). `-kn` and `-km` keep named nodes and materials for
configurators. The npm build can't encode textures: `-tw` (WebP) and `-tc`
(KTX2) need a native release, so keep gltf-transform for textures.
`-cz` and `-ce khr` write the newer `KHR_meshopt_compression`, which r186's
GLTFLoader reads alongside `EXT_meshopt_compression`.

## Textures: WebP/AVIF vs KTX2

| | WebP / AVIF | KTX2 (Basis Universal) |
|---|---|---|
| Download | Smallest | ETC1S is compact; UASTC is noticeably larger |
| GPU memory | Decoded to RGBA8: 4 bytes/px plus 33% for mipmaps | Stays block-compressed: 4–8× less VRAM |
| Upload cost | Uncompressed upload plus mipmap generation at first render | Transcoded in a worker; uploads compressed, with prebuilt mipmaps (gltf-transform generates them by default) |
| Fixed cost per page | None | Transcoder: 527 KB WASM (249 KB gzip) + 58 KB JS |

*Measured*: the `coffeemat` sample's 4096² KTX2 (ETC1S) textures are
0.2–1.7 MB each on disk, and inspect estimates 11 MB of VRAM each. The same
textures as RGBA8 with mipmaps would need 89 MB each.

Use WebP for a single modest model: no transcoder download, smallest files.
Use KTX2 when textures are large (≥ 2048), numerous, or on memory-constrained
mobile pages, and when upload stutter matters.

- **Normal maps**: lossy WebP always subsamples chroma (4:2:0), and the
  normal's X/Y live in color channels. Raising the quality doesn't remove the
  lighting artifacts. Use lossless WebP (`--slots "normalTexture" --lossless
  true`), KTX2 UASTC, or keep the original.
- **Small or flat textures**: lossless WebP can beat lossy. The Fox's 27 KB
  PNG became 18 KB lossless, but 34 KB with the default lossy setting.

## Serving

| File | `Content-Type` | Compress with gzip/brotli? |
|---|---|---|
| `.glb` | `model/gltf-binary` | Yes, especially Meshopt. Check that your CDN's compressible-type list includes it; defaults often cover only text types. |
| `.gltf` | `model/gltf+json` | Yes |
| `.ktx2` | `image/ktx2` | Marginal gain |
| `.wasm` | `application/wasm` | Yes |

- **Caching**: fingerprinted file names (`chair.3f9a1c.glb`) with
  `Cache-Control: public, max-age=31536000, immutable`. Bundler-emitted
  decoders are already hashed. Vite copies `public/` as is, so
  `public/models/chair.glb` keeps its name. Either version the file names
  yourself or use revalidation (ETag), or import the model so the bundler
  hashes it: `import chairUrl from './models/chair.glb?url'` (verified with
  Vite 8, which emits `assets/chair-<hash>.glb`).
- **Progress bars**: with `Content-Encoding`, `Content-Length` is the
  compressed size but three.js counts decompressed bytes, so progress passes
  100%. Clamp it, or send the uncompressed size in an `X-File-Size` header;
  three.js reads that header first.
- **Cross-origin models** (CDN) need `Access-Control-Allow-Origin`, and the
  preload tag needs `crossorigin` either way.
- **SPA hosts and dev servers** answer missing files with `index.html` and a
  200 status. GLTFLoader then fails with `Unexpected token '<'`, which means
  the path is wrong, not the model.

## Decoders on three.js < r185, or bundlers without `new URL(..., import.meta.url)`

Since r185, `DRACOLoader` and `KTX2Loader` resolve their decoder files
relative to their own module with `new URL(..., import.meta.url)`. Vite
emits them as hashed assets (tested in dev and build), and webpack 5
documents the same URL-asset syntax. If the Network panel shows 404s for
`draco_decoder.wasm` or `basis_transcoder.wasm`, or you're on an older
three.js, self-host the files:

```bash
mkdir -p public/decoders
cp -r node_modules/three/examples/jsm/libs/draco/gltf public/decoders/draco
cp -r node_modules/three/examples/jsm/libs/basis public/decoders/basis
```

```js
new DRACOLoader().setDecoderPath('/decoders/draco/');
new KTX2Loader().setTranscoderPath('/decoders/basis/');
```

Copy them in a `postinstall` script, so decoders always match the installed
three.js version; a stale transcoder is a classic source of KTX2 errors. The
Meshopt decoder is a plain module import and needs no copying.
