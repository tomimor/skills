# Rendering

## Renderer setup

```js
const renderer = new WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = NeutralToneMapping; // default is NoToneMapping
renderer.toneMappingExposure = 1;
// outputColorSpace already defaults to SRGBColorSpace; leave it alone.
```

- **`alpha: true`**: the page shows through the canvas. Style the background
  with CSS on the container instead of `scene.background`, so the model
  follows the site theme, including dark mode.
- **`antialias: true`** applies MSAA to the default framebuffer only. With
  `EffectComposer` post-processing, the passes render into render targets:
  give the composer's target `samples: 4`, or add an FXAA/SMAA pass.
- **Pixel ratio**: capping at 2 is the standard trade-off. On a 3× phone,
  uncapped rendering fills 2.25× the pixels of 2× for no visible gain. Drop
  to 1.5 when frame times are high.

## Color management

three.js manages color by default: it works in linear sRGB and outputs sRGB.

- **GLTFLoader already tags textures correctly**: base color and emissive
  textures get `SRGBColorSpace`, and data maps (normal, ORM) stay linear.
  Don't touch them.
- **Textures you load yourself**: set `texture.colorSpace = SRGBColorSpace`
  for color images (labels, decals, swatches), and leave data maps alone.
  When the texture goes onto a glTF material, also set
  `texture.flipY = false`: glTF UVs start top-left, and GLTFLoader loads its
  own textures with `flipY = false`.
- **Colors set in code** (`material.color.set('#c0392b')`) are read as sRGB
  and converted for you.
- **Per-part edits**: glTF meshes that reference the same material share
  one `Material` instance. Clone it first
  (`part.material = part.material.clone()`), then dispose the clone when
  done.

## Tone mapping

| Mapping | Use when |
|---|---|
| `NeutralToneMapping` (Khronos PBR Neutral) | Products and e-commerce. It keeps base colors' hue and saturation under ordinary lighting, so the swatch on screen matches the product. The component's default. |
| `AgXToneMapping` | Dramatic or high-contrast lighting with bright highlights; desaturates gracefully (Blender's default view transform since 4.0) |
| `ACESFilmicToneMapping` | A filmic look. Shifts hues and adds contrast; common in older code, so be deliberate about keeping it. |
| `NoToneMapping` | Unlit or stylized content; values above 1 clip |

Adjust overall brightness with `renderer.toneMappingExposure` (the
component's `exposure` attribute), not by adding lights.

## Environment lighting

PBR materials (`MeshStandardMaterial` / `MeshPhysicalMaterial`, which is what
glTF produces) are lit mostly by their environment. Without
`scene.environment`, metals render black and everything looks flat.

**Studio lighting with zero download** (what the component uses):

```js
const pmrem = new PMREMGenerator(renderer);
const room = new RoomEnvironment();
scene.environment = pmrem.fromScene(room, 0.04).texture;
room.dispose();
pmrem.dispose();
```

**A brand-specific HDR environment**:

```js
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'; // was RGBELoader
const hdr = await new HDRLoader().loadAsync('/env/studio-1k.hdr');
hdr.mapping = EquirectangularReflectionMapping;
scene.environment = hdr; // three.js builds the PMREM internally
```

- Keep HDRs at 1k–2k. The environment only needs low frequencies, and 4k
  `.hdr` files run to tens of MB. `UltraHDRLoader` loads gain-map JPEG HDRs,
  which are far smaller downloads.
- Tune with `scene.environmentIntensity` and `scene.environmentRotation`
  before adding lights. Per material, use `material.envMapIntensity`.
- Add one `DirectionalLight` only for a key highlight or a shadow. Lights
  exported from DCC tools (`KHR_lights_punctual`) use physical units, and
  often arrive far too bright or dark; prefer environment lighting for
  product viewers.

## Shadows

A shadow map re-renders the scene from the light each frame. For a single
object:

1. **Best**: bake a soft contact shadow into a transparent PNG on a plane
   under the model. It's free at runtime and usually looks better.
2. **Dynamic**: a ground plane with `ShadowMaterial({ opacity: 0.25 })`,
   one `DirectionalLight` with `castShadow`, `shadow.mapSize` at 1024, and
   the light's `shadow.camera` bounds fitted tightly around the model.
   `PCFShadowMap` is the default; `PCFSoftShadowMap` is deprecated in r186.
3. **Static scene**: set `renderer.shadowMap.autoUpdate = false` and
   `renderer.shadowMap.needsUpdate = true` after changes, so the shadow map
   renders once.

## Material costs

- **Transmission** (`KHR_materials_transmission`, glass) adds a pass that
  renders the opaque scene into a texture. Use it sparingly, and never on
  large surfaces on mobile.
- **`alphaMode: BLEND`** meshes need sorting and can flicker where they
  intersect. Prefer `MASK` (alpha test) for foliage, decals, and cut-outs.
- **Each unique material** compiles its own shader. Many near-identical
  materials usually come from the export; merge them, or use
  gltf-transform's `--palette`.

## WebGPURenderer

```js
import { WebGPURenderer } from 'three/webgpu';
const renderer = new WebGPURenderer({ antialias: true, alpha: true });
await renderer.init(); // once, before the first render(); renderAsync() is deprecated since r181
```

- It falls back to a WebGL 2 backend automatically when WebGPU is
  unavailable. Use `forceWebGL: true` to test that path.
- Built-in materials (Standard, Physical, Basic, Lambert, Phong, and
  others) convert to node materials automatically. GLSL `ShaderMaterial`
  and `RawShaderMaterial` fail with
  `Material "ShaderMaterial" is not compatible`, and `onBeforeCompile`
  patches don't apply. Rewrite custom shading in TSL.
- Post-processing uses `RenderPipeline` (renamed from `PostProcessing` in
  r183) with TSL passes, not `EffectComposer`.
- `KTX2Loader.detectSupport(renderer)` works after `await renderer.init()`.
- *Measured* bundle cost with GLTFLoader, minified: 248 KB gzip, against
  161 KB for `WebGLRenderer`.

For a model viewer with standard glTF materials, `WebGLRenderer` is
smaller, synchronous to set up, and works everywhere WebGL 2 does. Choose
WebGPU for compute, very large instance counts, or TSL effects you need
anyway, and test the fallback path.
