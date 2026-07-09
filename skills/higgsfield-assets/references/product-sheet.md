# Product sheets

The anchor for e-commerce / marketing product assets. Model: `marketing_studio_image` (default) or `nano_banana_pro` when labels/packaging text must stay legible.

## Product block template

Freeze once approved; opens every product prompt.

```
[PRODUCT NAME], a [category] made of [materials], [colors/finish],
[shape/silhouette], [key detail: logo placement, texture, stitching, cap, label]
```

If the user has a real product photo, that photo IS the identity — import it (`media_upload_widget` / `media_import_url`), pass it as reference on every call, and keep the block short (name + material + finish).

## Anchor sheet prompt

```
Product reference sheet of [PRODUCT BLOCK] on a pure white seamless background.

Same product shown in a clean grid: straight-on front view at eye level,
3/4 hero angle slightly above, side profile, top-down flat lay, and a macro
detail crop of [key detail]. Identical lighting, scale, and color across all views.

Studio product photography, large softbox lighting, soft natural contact shadow,
true-to-life color, sharp focus, commercial catalog style, no text, no labels
except the product's own, no watermarks.
```

Aspect ratio 1:1 or 4:3 for the grid.

## Angle-line library

For standalone angle shots, keep the prompt identical except this one line:

- `straight-on front view, eye level`
- `three-quarter hero angle, slightly above eye level`
- `side profile, eye level`
- `back view, eye level`
- `top-down flat lay`
- `low angle, slightly below, dramatic hero shot`
- `macro detail of [feature], extreme close-up`

## Lifestyle variants

Keep product block + lighting descriptors fixed; swap only surface/environment:

```
[PRODUCT BLOCK], placed on [surface] in [environment], [supporting props kept
minimal and out of focus], [same lighting suffix as the sheet]
```

Good defaults: marble counter / linen cloth / raw oak table / concrete pedestal; environment softly blurred behind. One environment per generation.

## Cutout pipeline (PNGs for stores/ads)

1. Generate the angle shot on the white sheet background.
2. `remove_background` on the winning result → transparent PNG.
3. `upscale_image` to 2K/4K last.

Don't prompt for "transparent background" — models fake it with checkerboards; the tool does it properly.

## Packaging & label text

AI-rendered text drifts. If the label must read correctly:

- Use `nano_banana_pro` and quote the exact text in the prompt: `the label reads "ACME No. 5" in clean sans-serif`.
- Verify every derivative's label; regenerate only failures.
- For heavy text (nutrition panels, UI on device screens) prefer compositing the real artwork over the generated image downstream.
