# Person / character sheets

The anchor for any reusable person. Generate this before any scene image.

## Identity block template

Fill once, then freeze. This exact text opens every prompt that includes the character.

```
[NAME], a [age-range] [gender] with [skin tone], [hair: length/color/texture/style],
[eye color] eyes, [build/height impression], wearing [base outfit],
[1–2 distinguishing features: scar, freckles, glasses, jewelry]
```

Rules:

- Give the character a NAME token (e.g. `MAYA`) and always include it — a stable rare token helps the model bind the identity.
- Prefer specific over generic: "shoulder-length black curly hair with a middle part" beats "dark hair".
- Distinguishing features are the strongest consistency levers; pick ones that are visible at medium distance.
- Base outfit is part of identity. If a derivative needs different clothes, change *only* the outfit phrase and keep everything else.

## Anchor sheet prompt

Model: `soul_2` (photoreal) or `soul_cast` (text-only concept, no photo refs). Aspect ratio: 16:9 or 3:2 so the grid has room.

```
Character reference sheet of [IDENTITY BLOCK].

Full-body turnaround on a plain neutral grey studio background: front view,
3/4 view, side profile, and back view, same height and proportions, relaxed
standing pose. Below, a row of head-and-shoulders expression studies:
neutral, warm smile, laughing, surprised, serious.

Even diffused studio lighting, identical character across every view,
photorealistic, sharp focus, no text, no labels, no watermarks.
```

If the user provided photos: upload via `media_upload_widget`, pass as reference media, and drop physical descriptors the photo already carries (keep name, outfit, features).

## Derivative pattern

```
[IDENTITY BLOCK], [action] in [environment], [camera: angle + distance],
[STYLE BLOCK]
```

- `medias`: anchor sheet `job_id` (role per `models_explore` for the model in use).
- Camera vocabulary that stays consistent: "eye-level medium shot", "3/4 view slightly above eye level", "full-body wide shot", "close-up portrait, 85mm look".
- Change one of {action, environment, camera} per generation.

## Expression / outfit variants

- New expression: keep action + environment from an approved derivative, change only the expression phrase.
- New outfit: swap only the `wearing …` phrase inside the identity block; note the variant block in the manifest as `identity+outfit-b`.

## When to train a Soul

Offer (never silently start) Soul training when:

- The user says they'll reuse this person across sessions/projects, or
- They provide 5–20 photos of a real person, or
- Sheet-referenced derivatives still drift after two correction rounds.

Flow: pick the 5–20 best consistent outputs (or user photos) → `show_characters(action:'train')` → ~10 min → derivatives switch to `soul_2` + `soul_id`, and the identity block shrinks to name + outfit + features (the Soul carries the face).
