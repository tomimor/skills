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

Starting points for one model that must work on mid-range phones. Tighten
them when several models share a page, and relax them for desktop-only
tools.

| Metric | Target | Hard ceiling | Notes |
|---|---|---|---|
| GLB transfer size | ≤ 1 MB (hero ≤ 2 MB) | 5 MB | Measured after gzip/brotli. A 2 MB model is a full LCP-sized payload on 4G. |
| Texture resolution | 1024–2048 px | 2048 px (4096 only as KTX2) | 2048² RGBA with mipmaps is 22 MB of VRAM; 4096² is 89 MB |
| Textures per model | ≤ 5–8 | — | One set: baseColor, normal, ORM, and optionally emissive |
| Draw calls (primitives) | ≤ 50 | ~200 | Check `renderer.info.render.calls` in the page |
| Triangles | ≤ 100k | ~500k | Mobile vertex cost; use `--simplify` or retopology |
| Materials | ≤ 10 | — | Each unique material means another shader compile |

## gltf-transform recipes

```bash
# Static product or hero: Meshopt geometry, WebP textures, max 2048 px
npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt --texture-compress webp

# Parts addressed by name in code (configurators, clickable parts, per-part materials)
npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt --texture-compress webp \
  --join-named false --instance false --palette false          # + --flatten false to keep hierarchy

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

## Meshopt vs Draco

| | Meshopt (`--compress meshopt`) | Draco (`--compress draco`) |
|---|---|---|
| Compresses | Geometry, animation keyframes, morph targets | Geometry only |
| Decoder cost | 29 KB JS module (WASM inlined), no extra requests | 192 KB WASM + 58 KB wrapper (glTF build), fetched on first use |
| *Measured*, static DamagedHelmet (geometry only) | 3.77 → 3.40 MB | 3.77 → 3.29 MB |
| *Measured*, animated Fox (raw → gzip) | 163 → 73 → 50 KB | 163 → 88 → 66 KB |
| three.js setup | `loader.setMeshoptDecoder(MeshoptDecoder)` | `loader.setDRACOLoader(new DRACOLoader().setDecoderPath(DRACO_GLTF_CONFIG))` |

Default to Meshopt, and serve the GLB with gzip or brotli: it is designed to
be followed by HTTP compression, and on animated models it wins outright.
Draco can be slightly smaller for static, geometry-heavy meshes on a host
that can't compress responses, but the 250 KB decoder usually costs more
than it saves. The component registers both, so either format loads.

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
mobile pages, and when upload stutter matters. For normal maps, prefer
UASTC or high-quality WebP, because aggressive lossy compression shows as
lighting artifacts.

## Serving

| File | `Content-Type` | Compress with gzip/brotli? |
|---|---|---|
| `.glb` | `model/gltf-binary` | Yes, especially Meshopt. Check that your CDN's compressible-type list includes it; defaults often cover only text types. |
| `.gltf` | `model/gltf+json` | Yes |
| `.ktx2` | `image/ktx2` | Marginal gain |
| `.wasm` | `application/wasm` | Yes |

- **Caching**: fingerprinted file names (`chair.3f9a1c.glb`) with
  `Cache-Control: public, max-age=31536000, immutable`. Bundler-emitted
  decoders are already hashed.
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
