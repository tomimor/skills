# Performance

*Measured* numbers come from Vite 8 production builds of three.js r186, and
from headless Chromium with software GL.

## Loading

- **Code-split three.js.** `WebGLRenderer` plus `GLTFLoader` is about
  161 KB gzip. The component's lazy chunk, which adds the Draco and KTX2
  loaders, the Meshopt decoder, OrbitControls, and RoomEnvironment, is
  198 KB gzip. The `<three-model>` element that ships up front is about
  2 KB. *(measured)*
- **Start early, not eagerly.** An IntersectionObserver with a
  `rootMargin` (300 px in the component) starts the import and download
  before the element scrolls in. In tests, models below the fold were not
  requested at all until scrolled near.
- **Above the fold**, preload the GLB so it downloads in parallel with the
  JS, and give the poster `fetchpriority="high"`:
  `<link rel="preload" href="/models/hero.glb" as="fetch" crossorigin>`.
  Verified: three.js's fetch reuses the preload, with one network request
  and no warning. Without `crossorigin`, Chrome skips the preload ("not used
  because the request credentials mode does not match") and three.js makes a
  second request.
- **One loader per page.** Draco and KTX2 decoder workers and WASM are
  created once and shared. The component's loader fetched no decoder on a
  Meshopt-only page, and fetched the Draco decoder exactly once when a Draco
  model appeared.
- **Large Meshopt models**: call `MeshoptDecoder.useWorkers(2)` once, and
  GLTFLoader's async decode then runs in workers. By default it decodes on
  the main thread, which is fast but can still be a long task for tens of
  MB.
- **Content Security Policy**: the Draco, KTX2, and Meshopt workers are all
  created from blob URLs, and the decoders are WASM. A strict CSP needs
  `worker-src blob:` and `script-src 'wasm-unsafe-eval'`.
- **The same model many times**: load once and clone. `SkeletonUtils.clone()`
  (from `three/addons/utils/SkeletonUtils.js`) handles skinned meshes; a
  plain `.clone()` breaks their skeleton binding. Clones share geometry and
  materials, so dispose the shared resources once, when the last clone goes.
  `THREE.Cache.enabled = true` only caches raw file bytes; it still parses
  each time.

## The render loop

```js
const timer = new Timer();
timer.connect(document); // Page Visibility: no giant delta after a hidden tab
let needsRender = true;

function tick(time) {
  timer.update(time);
  const delta = Math.min(timer.getDelta(), 0.1);
  let changed = controls ? controls.update(delta) : false; // true while damping or auto-rotate moves
  if (mixer) {
    mixer.update(delta);
    changed = true;
  }
  if (changed || needsRender) {
    renderer.render(scene, camera);
    needsRender = false;
  }
}

// Visible: renderer.setAnimationLoop(tick) and timer.reset(). Hidden: renderer.setAnimationLoop(null).
```

- **Use `setAnimationLoop`**, not a hand-rolled `requestAnimationFrame`. It
  is also what WebXR needs, and `setAnimationLoop(null)` stops it cleanly.
- **Render on demand.** Set `needsRender = true` after any change you make
  (the component exposes `viewer.requestRender()`). *Measured*: a static
  model re-rendered 0 frames while idle; an animated one rendered about
  60 fps.
- **Pause offscreen** with an IntersectionObserver per canvas. Browsers
  already pause rAF in background tabs; `Timer.connect(document)` zeroes
  the delta while the tab is hidden, and `timer.reset()` on resume prevents
  an animation jump after a pause.
- **Resize with a ResizeObserver** on the container, not `window.resize`:
  layout changes resize components without resizing the window. Call
  `renderer.setSize(w, h, false)`, which leaves CSS sizing alone. Render
  immediately, because resizing clears the canvas and the next rAF comes
  too late to avoid a blank frame.

## GPU cost

Read `renderer.info` in the console while the model is on screen:

```js
const { render, memory, programs } = el.viewer.renderer.info;
({ calls: render.calls, triangles: render.triangles, geometries: memory.geometries, textures: memory.textures, programs: programs.length });
```

| Symptom | Lever |
|---|---|
| Many draw calls | gltf-transform `join` and `instance` (on by default). GLTFLoader turns `EXT_mesh_gpu_instancing` into `InstancedMesh`. Use `BatchedMesh` for many distinct meshes sharing a material. |
| Fill-rate bound (slow at large sizes or high DPR) | DPR cap, a smaller canvas, less transparent overdraw, no transmission |
| Hitch on first display | Shader compile: `compileAsync()` where `KHR_parallel_shader_compile` exists, and fewer unique materials. Texture upload: KTX2, or smaller textures. |
| Jank while loading | GLB parsing runs on the main thread. Keep files small; move Meshopt decoding to workers (above). Draco and KTX2 already decode in workers. |

## Many viewers on one page

Every `WebGLRenderer` owns a WebGL context with its own copy of every
geometry, texture, and shader. Chromium keeps at most 16 live contexts per
page. Creating a 17th logs `Too many active WebGL contexts. Oldest context
will be lost.`, and the oldest canvas goes blank. *(measured with 20
contexts: the first 4 were lost)*

- **Up to about 4 models on a page**: use the component as-is. Each mounts
  lazily, pauses offscreen, and releases its context on removal.
- **Galleries and grids**: don't create a renderer per card. Show posters,
  and mount a live viewer only for the card the user engages with; dispose
  it when they leave. Alternatively, draw every item with one shared
  renderer on a fixed full-page canvas, using `setScissor` and
  `setViewport` per element rectangle (three.js's `webgl_multiple_elements`
  example).
- **SPAs**: unmounting without `dispose()` and `forceContextLoss()` leaks
  one context per navigation until the browser starts evicting.

## Memory and disposal

Removing a model means releasing everything it allocated. In the order the
component does it:

1. Stop the loop (`setAnimationLoop(null)`), disconnect the observers, and
   remove event listeners.
2. `controls.dispose()` removes its listeners and restores `touch-action`.
   Then call `timer.dispose()` and `mixer.stopAllAction()`.
3. Traverse the model. Dispose every `geometry`, every material, and every
   texture found on the material's properties. Call `texture.image.close()`
   first when it is an `ImageBitmap`: GLTFLoader decodes to ImageBitmaps,
   which its docs warn are not garbage-collected automatically. Dispose
   `skeleton` for skinned meshes.
4. Dispose the environment map, then call `renderer.dispose()` and
   `renderer.forceContextLoss()`. `dispose()` alone keeps the context alive
   until garbage collection.
5. Remove the canvas.

**Leak check**: mount and unmount 10 times, then take a heap snapshot in
DevTools (Memory panel) and search for `WebGLRenderer` and `ImageBitmap`;
the counts must not grow with each cycle. On a shared renderer,
`renderer.info.memory` should return to its baseline.

## Profiling tools

- `renderer.info` gives per-frame calls, triangles, and memory counts. Set
  `info.autoReset = false` to sum across multiple `render()` calls.
- The DevTools Performance panel shows long tasks during load (parse,
  upload, compile) and frame times during interaction.
- Spector.js captures one frame's WebGL calls, which finds redundant draws
  and oversized textures.
- `three/addons/libs/stats.module.js` gives an FPS overlay for development
  builds only.
