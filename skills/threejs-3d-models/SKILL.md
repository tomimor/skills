---
name: threejs-3d-models
description: >-
  Adds, optimizes, and reviews 3D models on web pages with three.js: glTF/GLB
  asset pipeline (gltf-transform with Meshopt, Draco, KTX2), a tested lazy
  <three-model> web component to reuse across pages, color and lighting setup,
  render-on-demand, disposal, accessibility, and fallbacks. Use when embedding
  a GLB/glTF model, product viewer, or three.js canvas in a page, when a 3D
  page is slow, heavy, janky, or leaking memory, when reviewing three.js code,
  or when the user mentions three.js, WebGL, GLTFLoader, GLB, or model-viewer.
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
lazily). Behavior and APIs are verified against three.js r186 in headless
Chromium with Vite dev and production builds.

## Workflow

Five phases, in order. On an existing page, run Phase 1 and the Phase 5
checklist first and show the findings before changing anything.

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
| Code finds parts by name (configurator, clickable parts, per-part materials) | `--join-named false --instance false --palette false`; add `--flatten false` if code relies on the node hierarchy |
| Large or many textures, or mobile memory limits | `--texture-compress ktx2` (needs the KTX-Software `ktx` CLI on `PATH`) |

The default `optimize` merged a test model's 12 named parts into 2 unnamed
nodes. The parts flags kept all 12. Textures dominate most files. In the
DamagedHelmet sample, compressing geometry saved 0.4 MB of 3.8 MB, and WebP
textures took the file to 1.4 MB. Compare the result visually against the
source, because simplification and texture compression are lossy.

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
| `autoplay` | Plays the first animation clip. Ignored under `prefers-reduced-motion`. |
| `exposure` | Tone-mapping exposure (default `1`) |

Events: `load` fires when the first frame is on screen. `error` fires when
WebGL or the model fails, with the Error in `event.detail`; the poster stays
visible. Scripting goes through `element.viewer`, which exposes `{ renderer,
scene, camera, model, gltf, controls, mixer, requestRender, dispose }`. After
you change the scene yourself, call `viewer.requestRender()`, because the
loop only draws when something changed.

What the component guarantees (each item is covered by a browser test):

- three.js (about 200 KB gzip with loaders and controls) downloads only when
  an element comes within 300 px of the viewport. The initial cost is the
  2 KB element.
- The poster stays until the first frame is drawn. It returns on WebGL
  context loss and stays permanently if WebGL or the model fails.
- One `GLTFLoader` per page. Draco and Basis decoders download only when a
  model needs them, and only once.
- It renders only while the model moves (damping, auto-rotate, animation)
  and stops completely when offscreen or idle.
- Vertical swipes over the model still scroll the page on touch devices;
  horizontal drags orbit.
- Framing fits the model's real vertices, skinned poses included, and
  resizing keeps the user's orbit angle.
- Removing the element disposes geometries, materials, textures (closing
  ImageBitmaps), and the renderer, and releases the WebGL context.

Framework wrappers (React, Vue, Svelte, Astro, Next.js) and R3F equivalents
are in [references/integration.md](references/integration.md).

### Phase 4 — Poster and loading priority

Every embed needs a poster. It is the LCP candidate, the loading
placeholder, the no-WebGL fallback, and what search engines index. Capture
it from the running page so it matches the first frame exactly:

```bash
node <this-skill-dir>/scripts/capture-poster.mjs http://localhost:5173/product public/models/chair-poster.webp
```

The capture is transparent WebP or PNG at 2× the element's CSS size. For a
model above the fold, start the GLB download in parallel with the JS and
prioritize the poster:

```html
<link rel="preload" href="/models/chair.glb" as="fetch" crossorigin>
<img src="/models/chair-poster.webp" alt="" fetchpriority="high" ...>
```

`as="fetch" crossorigin` matches the request three.js makes, so the GLB
downloads once; tested with network capture. Never preload below-the-fold
models, because that competes with the LCP.

### Phase 5 — Verify

- [ ] `inspect` shows the model within budget
  ([references/asset-pipeline.md](references/asset-pipeline.md)).
- [ ] The console is clean: no three.js deprecation warnings (see the table
  below) and no 404s for models or decoders.
- [ ] In the Network panel, the three.js chunk is absent until a model nears
  the viewport, the GLB is fetched once, and no decoder is fetched for
  formats the model doesn't use.
- [ ] Idle and scrolled-away models stop rendering. Check that
  `el.viewer.renderer.info.render.frame` stays constant.
- [ ] With `prefers-reduced-motion: reduce` emulated in DevTools, nothing
  moves by itself.
- [ ] Keyboard: Tab reaches the model, arrows orbit, and focus is visible.
- [ ] On a mobile device or emulator, a vertical swipe over the model scrolls
  the page.
- [ ] With WebGL disabled (`chrome --disable-webgl`), the poster remains and
  the layout doesn't shift.
- [ ] For SPAs, navigating away and back 10 times keeps GPU memory and
  context count flat (DevTools Memory panel, and no "Too many active WebGL
  contexts" warning).
- [ ] Lighthouse: the poster is the LCP element and CLS is 0 around the
  model.

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
6. **Dispose everything** on unmount, and call `renderer.forceContextLoss()`.
   `renderer.dispose()` alone keeps the WebGL context, and Chromium drops the
   oldest context beyond 16 per page.
7. **Don't hijack scrolling.** Wheel zoom is opt-in, and use
   `touch-action: pan-y` unless pinch zoom is on.
8. **Respect `prefers-reduced-motion`**: no auto-rotate or autoplay.
9. **Name it for assistive tech** (`role="img"` plus a meaningful
   `aria-label`) and make orbiting keyboard-operable.
10. **Cap the pixel ratio at 2.** Higher values multiply fill cost with no
    visible gain.

## Current APIs (outdated tutorials get these wrong)

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
| Changing one part's color recolors others | glTF meshes share material instances. Use `part.material = part.material.clone()` before editing. |
| `setKTX2Loader must be called before loading KTX2 textures`, `setMeshoptDecoder must be called before loading compressed files`, or `No DRACOLoader instance provided` | The model uses a compression the loader wasn't given. Use the component's shared loader, which registers all three. |
| `Too many active WebGL contexts. Oldest context will be lost.` and older viewers go blank | Chromium keeps 16 live contexts per page. Dispose renderers and call `forceContextLoss()`, or share one renderer. See [references/performance.md](references/performance.md). |
| Page won't scroll over the model on phones | OrbitControls sets `touch-action: none`. Use `pan-y` (the component does). |
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
