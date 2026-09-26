# Integration, accessibility, and SEO

## Using `<three-model>` in frameworks

The element file extends `HTMLElement` at module scope, so **import it only
in the browser**. Render the tag anywhere: server-rendered HTML shows the
poster immediately, and the element upgrades once the module loads.

| Stack | Register | Notes |
|---|---|---|
| Plain HTML, Eleventy, CMS templates | `<script type="module" src="/js/three-model.js"></script>` | Bare `three` imports need a bundler or an import map. |
| Astro | `<script>import '../components/three-model/three-model.js';</script>` in the `.astro` component | Astro bundles `<script>` tags and runs them only on the client. |
| React 19, Next.js App Router | `useEffect(() => { import('./three-model.js'); }, [])` in a `'use client'` component | `'use client'` components still render on the server, so a top-level import would throw `HTMLElement is not defined`. |
| React 18 | Same as React 19 | Booleans are stringified, so `auto-rotate={false}` becomes `auto-rotate="false"`, which reads as on. Pass `''` to enable and `undefined` to disable. |
| Vue 3 | Import in `onMounted` or a client-only plugin | In `vite.config`, use `vue({ template: { compilerOptions: { isCustomElement: (tag) => tag === 'three-model' } } })`. |
| Svelte, SvelteKit | Import in `onMount` | Custom elements work natively. |

Verified with React 19.3 in StrictMode: `camera-controls={true}` sets the
attribute and `={false}` omits it; the `onLoad` prop receives the
element's `load` event; the double-invoked effects create one canvas and
one GLB request; unmounting removes the canvas and releases the context.
For code that must run on both React 18 and 19, pass `attr ? '' : undefined`.

```jsx
'use client';
import { useEffect } from 'react';

export function ProductModel({ src, poster, alt, rotate = false }) {
  useEffect(() => {
    import('./three-model.js');
  }, []);
  return (
    <three-model src={src} alt={alt} camera-controls="" auto-rotate={rotate ? '' : undefined}>
      <img src={poster} alt={alt} width={800} height={800} />
    </three-model>
  );
}
```

TypeScript needs the tag declared once:

```ts
// three-model.d.ts
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
type ThreeModelProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  src: string; alt?: string; exposure?: number | string;
  'camera-controls'?: '' | boolean; zoom?: '' | boolean; 'auto-rotate'?: '' | boolean; autoplay?: '' | boolean;
};
declare module 'react' {
  namespace JSX { interface IntrinsicElements { 'three-model': ThreeModelProps } }
}
```

**Driving it imperatively**, for example swapping a part's color from a UI
control:

```js
const { model, requestRender } = el.viewer; // after the element's load event
const part = model.getObjectByName('Seat'); // requires the "parts" optimize flags
part.material = part.material.clone(); // glTF materials are shared
part.material.color.set('#2e5e4e');
requestRender();
```

To swap models, replace the element or set up a new one; `src` isn't
observed after mount.

## React Three Fiber projects

If the app already renders with R3F, apply the same rules through its
idioms instead of mixing in the custom element:

| Rule | R3F / drei |
|---|---|
| Render on demand | `<Canvas frameloop="demand">` (the default is `'always'`), and call `invalidate()` after changes |
| Cap the pixel ratio | `<Canvas dpr={[1, 2]}>` (the default in fiber 9) |
| Optimized asset plus typed component | `npx gltfjsx model.glb --transform` (Draco, prune, 1024 px WebP by default); use `--keepnames`, `--keepmeshes`, `--keepmaterials` for addressable parts |
| Decoders | drei's `useGLTF` loads Draco from Google's gstatic CDN by default. For self-hosting or CSP, call `useGLTF.setDecoderPath('/decoders/draco/')`. KTX2 needs `extendLoader`. |
| Environment | drei's `<Environment preset="…">` downloads 1k HDRs from raw.githack.com. For production, pass `files` pointing at self-hosted HDRs, or use `RoomEnvironment`. |
| Lazy code | `React.lazy(() => import('./Scene'))` so three.js and R3F stay out of the initial chunk |
| Disposal | R3F disposes what it created on unmount. Objects you create imperatively (loaders, cloned materials, render targets) are still yours to dispose. |

## Accessibility

- **Name**: the element gets `role="img"` and `aria-label` from `alt`.
  Describe the object and what's notable ("Oak lounge chair with walnut
  legs"), not the technology ("3D model"). A `role="img"` host makes its
  children presentational, so the poster `<img>` can carry the same alt
  text for SEO without a double announcement.
- **Don't hide information in 3D.** Dimensions, materials, and colors
  belong in the page text as well; the model is an enhancement.
- **Keyboard**: with `camera-controls`, the element is focusable and the
  arrow keys orbit. Style `:focus-visible`, and say how it works nearby
  ("Drag or use arrow keys to rotate") via `aria-describedby`.
- **Motion**: under `prefers-reduced-motion: reduce`, auto-rotate and
  autoplay are off. WCAG 2.2.2 (Level A) requires a way to pause motion
  that starts automatically and lasts more than 5 seconds. With
  `auto-rotate`, add a visible pause toggle that sets
  `el.viewer.controls.autoRotate = false` and calls `requestRender()`.
- **Scrolling**: zoom is opt-in because OrbitControls' wheel handler calls
  `preventDefault()` and captures page scroll. Touch keeps
  `touch-action: pan-y`, so a model filling a phone screen doesn't trap
  the page.

## SEO and sharing

- Search engines and link previews read HTML, not canvas pixels. The
  server-rendered poster `<img>` with descriptive `alt`, plus the text
  around it, is what gets indexed. Keep both in the initial HTML.
- Reuse the poster as the page's `og:image` when the model is the subject
  of the page.

## When `<model-viewer>` is the better tool

[`<model-viewer>`](https://modelviewer.dev) is Google's web component for
displaying models, built on three.js. Prefer it when requirements are
standard: orbit and zoom, poster and lazy reveal, hotspots, material
variants, and AR (WebXR on Android, Scene Viewer, or Quick Look on iOS)
with a single attribute.

*Measured* (4.3.1): `model-viewer.min.js` bundles three.js and is 289 KB
gzip. `model-viewer-module.min.js` (143 KB gzip) imports `three` as a peer
dependency (`^0.183`), so it shares a copy only with a compatible
three.js.

Prefer three.js with this skill's component when you need custom
rendering, several models composed in one scene, scroll-driven or scripted
animation, or configurator logic. Also prefer it when the page already
ships a three.js version outside model-viewer's peer range. Don't load two
copies of three.js on one page.
