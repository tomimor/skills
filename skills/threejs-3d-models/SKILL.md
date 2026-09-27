---
name: threejs-3d-models
description: >-
  Adds, optimizes, and reviews 3D models on web pages with three.js: glTF/GLB
  asset pipeline (gltf-transform with Meshopt, Draco, KTX2), a browser-tested
  lazy <three-model> web component that shares one WebGL context across every
  viewer on a page, color and lighting setup, render-on-demand, disposal,
  accessibility, fallbacks, and an automated page checker. Use when embedding
  a GLB/glTF model, product viewer, configurator, 3D hero, or gallery of 3D
  cards; when optimizing a Blender/GLB export for the web; when a 3D page is
  slow, heavy, janky, drains phone batteries, or blocks scrolling; when
  reviewing three.js code; or whenever the user mentions three.js, WebGL,
  GLTFLoader, GLB, React Three Fiber, or model-viewer.
---

# three.js 3D Models

A 3D model is usually the heaviest element on its page: megabytes of
geometry and textures, a large JS library, a GPU context, and a render loop
that can drain batteries. Treat it like a hero video. Optimize the asset,
keep three.js out of the initial bundle, reserve the space, show a poster,
render only when something changes, and clean up completely on unmount.

This skill ships a component that does all of that:
[assets/three-model.js](assets/three-model.js) (a 2 KB custom element) and
[assets/mount-model.js](assets/mount-model.js) (the three.js core, loaded
lazily). It also ships a checker that measures any 3D page:
[scripts/verify-3d-page.mjs](scripts/verify-3d-page.mjs). Behavior and APIs
are verified against three.js r186 in headless Chromium with Vite dev and
production builds.

## Workflow

Five phases, in order. When fixing an existing page, start with Phase 5:
run the checker, list what it and a read of the code found, then fix and
re-run it, so the reply shows before and after.

### Phase 1 — Choose the approach

| Need | Use |
|---|---|
| Show a product: orbit, zoom, AR, hotspots, nothing custom | [`<model-viewer>`](https://modelviewer.dev) (Google's web component, built on three.js) |
| Custom look, several models composed, scroll-driven or scripted animation, configurators, shaders | three.js with this skill's component |
| Decorative motion nobody interacts with | A muted looping video or image sequence (no GPU context, no 200 KB library) |

If the project already uses React Three Fiber, stay in R3F and apply the
same rules through its idioms; see
[references/integration.md](references/integration.md).

### Phase 2 — Audit and optimize the asset

Runtime formats are GLB (binary glTF) only. Convert FBX, OBJ, and USDZ
sources with Blender's glTF exporter; never load them in the browser.

```bash
npx @gltf-transform/cli inspect model.glb --format md    # sizes, textures, VRAM, draw calls
npx @gltf-transform/cli optimize model.glb model.opt.glb \
  --compress meshopt --texture-compress webp --texture-size 2048
```

The package is `@gltf-transform/cli`; `npx gltf-transform` fails because no
package has that name. `optimize` defaults: Meshopt, 2048 px max textures,
and flatten, join, instance, palette, simplify, and dedup all enabled.

| Model | Add these flags |
|---|---|
| Static product or hero | none beyond the command above |
| Code finds parts by name (configurator, clickable parts, per-part materials) | `--join-named false --instance false --palette false`; add `--flatten false` if code relies on the node hierarchy, and `--prune-attributes false` to keep UVs on untextured parts that may get textured finishes later |
| Skinned or animated characters | `--simplify false`: simplification shifts deforming vertices (on the Fox sample it removed 16% of triangles and tripled the pose error) |
| Large or many textures, or mobile memory limits | `--texture-compress ktx2` (needs the KTX-Software `ktx` CLI on `PATH`) |

The default `optimize` merged a test model's 12 named parts into 2 unnamed
nodes. The parts flags kept all 12. Textures dominate most files. In the
DamagedHelmet sample, compressing geometry saved 0.4 MB of 3.8 MB, and WebP
textures took the file to 1.4 MB. Compare the result visually against the
source, because simplification and texture compression are lossy.

Run per-texture passes, such as `gltf-transform webp --slots "normalTexture"
--lossless true`, before `optimize`, then give `optimize`
`--texture-compress false`. Any CLI pass after `optimize` re-encodes Meshopt
with weaker defaults: the Fox came out at 84 KB instead of 57 KB. Lossy WebP
always subsamples chroma, so raising its quality doesn't fix normal-map
artifacts. Use lossless or KTX2 UASTC for normals.

Choose compression with
[references/asset-pipeline.md](references/asset-pipeline.md). In short:
Meshopt by default (29 KB decoder, compresses animation, and gzips further).
Use Draco only when geometry dominates and the server can't compress. Use
KTX2 when texture memory matters: textures stay compressed on the GPU, using
4–8× less VRAM than PNG or WebP.

### Phase 3 — Embed with the component

Copy both files from `assets/` into the project (for example
`src/components/three-model/`). They need `three` r185 or newer. For older
versions, see the decoder note in
[references/asset-pipeline.md](references/asset-pipeline.md).

```html
<three-model src="/models/chair.glb" alt="Oak lounge chair with walnut legs" camera-controls auto-rotate>
  <img src="/models/chair-poster.webp" alt="Oak lounge chair with walnut legs" width="800" height="800">
</three-model>
```

```css
three-model { display: block; aspect-ratio: 1; }
three-model > img { display: block; width: 100%; height: 100%; object-fit: contain; }
three-model:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; }
```

Register the element once, in client-side code: `import './three-model.js'`.
It touches `HTMLElement`, so never import it during SSR.

| Attribute | Effect |
|---|---|
| `src` | GLB URL (required) |
| `alt` | Accessible name. Becomes `aria-label` on a `role="img"` host. Describe the object, not "3D model". Repeat it on the poster `<img>` for SEO; children of `role="img"` aren't announced twice. |
| `camera-controls` | Drag to orbit, arrow keys when focused. Makes the element focusable. |
| `zoom` | Wheel and pinch zoom. Off by default because it captures page scroll. |
| `auto-rotate` | Slow turntable. Ignored under `prefers-reduced-motion`. |
| `autoplay` | Plays an animation clip. Ignored under `prefers-reduced-motion`. |
| `animation` | Clip name for `autoplay` (default: the first clip) |
| `exposure` | Tone-mapping exposure (default `1`) |

Events: `load` fires when the first frame is on screen. `error` fires when
WebGL or the model fails, with the Error in `event.detail`; the poster stays
visible. Scripting goes through `element.viewer`, which exposes `{ renderer,
scene, camera, model, gltf, canvas, controls, mixer, renderCount,
requestRender, snapshot, dispose }`. After you change the scene yourself,
call `viewer.requestRender()`, because the loop only draws when something
changed. `viewer.snapshot('image/webp', 0.9)` returns the current frame as a
data URL.

Every viewer on the page shares one `WebGLRenderer` and therefore one WebGL
context: the architecture Google's `<model-viewer>` uses. Views take turns
rendering and copy their frame into their own 2D canvas. When only one is
visible, the shared canvas moves into it and renders directly. Two
consequences for scripting:

- `viewer.renderer` is shared, so don't change its settings for one view;
  use the `exposure` attribute instead.
- Viewers of the same URL share geometry, materials, and textures. Clone a
  material before recoloring one view's part:
  `part.material = part.material.clone()`.

What the component guarantees (each item is covered by a browser test):

- three.js (about 200 KB gzip with loaders and controls) downloads only when
  an element comes within 300 px of the viewport and its poster has loaded.
  The initial cost is the 2 KB element.
- One WebGL context for every viewer: a 24-card gallery ran on one context,
  and each model URL was fetched, parsed, and uploaded once. The context is
  released about 1 s after the last viewer unmounts, so route changes reuse
  it.
- The poster stays until the first frame is drawn, and stays permanently if
  WebGL or the model fails.
- Draco and Basis decoders download only when a model needs them, and only
  once.
- It renders only while a model moves (damping, auto-rotate, animation), and
  offscreen or idle viewers cost nothing.
- On touch devices, vertical swipes over the model still scroll the page
  and pinches zoom it; horizontal drags orbit, and a second finger doesn't
  make the model jump.
- Framing fits the model's real vertices, skinned poses included, and
  resizing keeps the user's orbit angle.
- Removing an element releases its model, closing ImageBitmaps once no
  viewer uses the URL.

Framework wrappers (React, Vue, Svelte, Astro, Next.js) and R3F equivalents
are in [references/integration.md](references/integration.md).

### Phase 4 — Poster and loading priority

Every embed needs a poster. It is the LCP candidate, the loading
placeholder, the no-WebGL fallback, and what search engines index. Capture
it from the running page so it matches the first frame exactly:

```bash
node <this-skill-dir>/scripts/capture-poster.mjs http://localhost:5173/product public/models/chair-poster.webp
```

The capture is transparent WebP or PNG at 2× the element's CSS size. Above
the fold, give the poster `fetchpriority="high"` and let it load first: the
component starts downloading three.js and the model only once the poster
has loaded.

Don't preload the GLB when a poster is the LCP element. *Measured* on a
throttled phone (1.6 Mbps, 150 ms RTT): preloading a 545 KB model moved a
53 KB poster's LCP from 612 ms to 864 ms, and `fetchpriority="low"` on the
preload didn't help. If a page has no poster and the 3D view is its main
content, `<link rel="preload" href="/models/chair.glb" as="fetch" crossorigin>`
matches the request three.js makes, so the GLB downloads once.

### Phase 5 — Verify

Serve a production build (`vite build && vite preview`, or the framework's
equivalent), then run the checker on every page with 3D content:

```bash
node <this-skill-dir>/scripts/verify-3d-page.mjs http://localhost:4173/product
```

It drives headless Chromium with WebGL instrumentation and reports PASS,
WARN, or FAIL for:

- rendering, console errors, three.js deprecations, and HTTP errors;
- GLB weight, layout shift, and the canvas's accessible name;
- wheel scrolling, touch scrolling, and pinch-zoom over the canvas;
- live WebGL contexts and evictions while scrolling the whole page;
- idling when offscreen and under `prefers-reduced-motion`;
- the pixel-ratio cap on a 3× phone, and the no-WebGL fallback;
- LCP, and when the 3D view appears, on a throttled phone (Slow 4G, 4×
  CPU).

It exits with code 1 on any FAIL, and needs Playwright, like the poster
script. Run it before and after your changes instead of writing your own
harness for the same checks, and add scripts only for behavior specific to
the task (a configurator's part lookup, a route change). Headless Chromium
renders WebGL in software, so its frame rates mean nothing: judge
rendering cost by frames drawn and canvas pixels, which the checker reports.
Then check by hand what it can't see:

- [ ] `inspect` shows each model within budget
  ([references/asset-pipeline.md](references/asset-pipeline.md)), and the
  optimized model looks like the source export.
- [ ] Keyboard: Tab reaches the model, arrows orbit, and focus is visible.
- [ ] Network: the three.js chunk is absent until a model nears the
  viewport, and no decoder is fetched for formats the models don't use.
- [ ] SPAs: navigate away and back 10 times with no "Too many active WebGL
  contexts" warning and flat memory (DevTools Memory panel).
- [ ] On a real phone, the page scrolls past the model and doesn't heat up.

## Rules

1. **Optimize before embedding.** No unoptimized exports in production.
   Textures above 2048 px ship only as KTX2.
2. **Lazy-load three.js** with dynamic `import()` behind an
   IntersectionObserver. Never put it in the initial bundle of a page where
   the model sits below the fold.
3. **Reserve the box** (`aspect-ratio` or height) and show a poster `<img>`,
   so there is no layout shift and there is a fallback.
4. **Render on demand** and pause offscreen. A static model should cost zero
   frames while idle.
5. **Share one `GLTFLoader`** (with its Draco, KTX2, and Meshopt decoders)
   per page.
6. **One WebGL context per page, released on unmount.** Chromium drops the
   oldest context beyond 16 per page, so share a renderer across viewers (the
   component does). Dispose everything on unmount and call
   `renderer.forceContextLoss()`: `renderer.dispose()` alone keeps the
   context until garbage collection.
7. **Don't hijack scrolling or page zoom.** Wheel zoom is opt-in. Without
   model zoom, use `touch-action: pan-y pinch-zoom` and set
   `controls.touches.TWO = TOUCH.DOLLY_ROTATE`. Otherwise a second finger
   mid-drag makes the model jump.
8. **Respect `prefers-reduced-motion`**: no auto-rotate or autoplay.
9. **Name it for assistive tech** (`role="img"` plus a meaningful
   `aria-label`) and make orbiting keyboard-operable.
10. **Cap the pixel ratio at 2.** Higher values multiply fill cost with no
    visible gain.

## Current APIs (outdated tutorials get these wrong)

Checked against r186. For other versions, read the three.js
[Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide).

| Outdated | Current three.js |
|---|---|
| `renderer.outputEncoding = sRGBEncoding`, `texture.encoding` | Removed. `outputColorSpace` defaults to `SRGBColorSpace`; set `texture.colorSpace = SRGBColorSpace` only on color textures you load yourself. |
| `new THREE.Clock()` | `new THREE.Timer()`, then `timer.update(timestamp)` each frame and `timer.connect(document)` (Clock is deprecated since r183) |
| `RGBELoader` | `HDRLoader` (renamed in r180) |
| `PCFSoftShadowMap` | `PCFShadowMap` (r186 warns and falls back) |
| Copying decoders to `public/` and calling `setDecoderPath('/draco/')` | Since r185, `new DRACOLoader().setDecoderPath(DRACO_GLTF_CONFIG)` and a plain `new KTX2Loader()`; the bundler resolves the decoders |
| WebGL 1 fallback code | WebGL 1 is unsupported since r163; `new WebGLRenderer()` throws without WebGL 2 |
| `await renderer.renderAsync()` (WebGPU) | `await renderer.init()` once, then `render()` (async variants deprecated in r181) |
| `new PostProcessing(renderer)` (WebGPU) | `new RenderPipeline(renderer)` (renamed in r183) |
| `renderer.compileAsync()` unconditionally | Guard with `renderer.extensions.has('KHR_parallel_shader_compile')`, which avoids a console warning and gains nothing without the extension |

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `Unexpected token '<', "<!doctype "... is not valid JSON` | The model URL returned HTML: a 404 page or an SPA fallback (Vite's dev server does this). Fix the path; files in `public/` are served from `/`. |
| Model loads but is black or flat | PBR materials without an environment map. Set `scene.environment` (the component uses a `RoomEnvironment` studio). |
| Colors washed out or too dark | A color texture loaded manually without `colorSpace = SRGBColorSpace`, or no tone mapping. See [references/rendering.md](references/rendering.md). |
| Model off-center, tiny, or partly out of frame | Frame from vertex bounds and call `camera.lookAt`. For skinned models, call `updateMatrixWorld(true)` before measuring. Both are handled by the component. |
| Changing one part's color recolors others, or recolors the same model in another viewer | glTF meshes share material instances, and the component's viewers of one URL share them too. Use `part.material = part.material.clone()` before editing. |
| `setKTX2Loader must be called before loading KTX2 textures`, `setMeshoptDecoder must be called before loading compressed files`, or `No DRACOLoader instance provided` | The model uses a compression the loader wasn't given. Use the component's shared loader, which registers all three. |
| `Too many active WebGL contexts. Oldest context will be lost.` and older viewers go blank | One renderer per viewer: Chromium keeps 16 live contexts per page. Share one renderer (the component does), and dispose with `forceContextLoss()`. See [references/performance.md](references/performance.md). |
| Page won't scroll or pinch-zoom over the model on phones | OrbitControls sets `touch-action: none`. Use `pan-y pinch-zoom` (the component does). |
| Frame stutter on first display | Shader compilation or texture upload. Use `compileAsync`, KTX2, and smaller textures. |

## References

- [references/asset-pipeline.md](references/asset-pipeline.md) covers
  formats, gltf-transform recipes, Meshopt vs Draco vs KTX2 with measured
  numbers, budgets, serving (MIME types, compression, caching), and decoder
  setup for older three.js.
- [references/rendering.md](references/rendering.md) covers color
  management, tone mapping, environment and HDR lighting, shadows,
  materials, and WebGPURenderer.
- [references/performance.md](references/performance.md) covers loading
  strategy, the render loop, many viewers per page, memory and disposal,
  and profiling.
- [references/integration.md](references/integration.md) covers React/R3F,
  Vue, Svelte, Astro, and Next.js; SSR; accessibility; SEO; and when
  `<model-viewer>` is the better tool.
