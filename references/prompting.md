# Prompting Guide

## Optimization Pattern

Rewrite the user's idea in English unless the user requests another language. A strong image prompt usually follows this order:

1. Subject and action.
2. Scene/environment.
3. Composition and camera/framing.
4. Lighting, color, and mood.
5. Medium/style details.
6. Quality and negative constraints.

Keep the result specific but not overstuffed. Prefer concrete nouns and visual adjectives over abstract praise.

## Optimization Levels

Use `none` or `--no-optimize` when exact text must be preserved.

Use `light` for small cleanup: composition and quality only.

Use `standard` for most generations: add composition, lighting, materials, mood, and negative constraints.

Use `strong` for posters, character concepts, reference-image transformations, product ads, and other cases where production polish matters.

## Reference Image Wording

When reference images are included, explicitly state how to use them:

- "Use the reference image for character identity and facial features."
- "Use the reference image for pose and clothing only; change the environment."
- "Preserve the product shape and materials from the reference, but render it in a new setting."

Avoid vague phrases like "make it better" without saying what should change.

## Product Image Workflow

When a user uploads or provides a product image:

1. Preserve product identity: shape, color, material, packaging, label, and visible logo when requested.
2. Ask or infer the target channel: e-commerce hero, social cover, poster, banner, detail-page scene, lifestyle image.
3. Convert the user's business need into a visual direction: premium, affordable, technical, eco-friendly, cute, luxury, daily-use, gifting, etc.
4. Add scene and lighting details without changing the product itself.
5. Draft the prompt and ask the user to confirm before generation when the request is broad or generation cost matters.

Prompt pattern:

```text
Use the reference image to preserve the product's exact shape, color, material, packaging, and visible brand details. Create [target output] for [audience/channel]. Place the product in [scene/background] with [lighting], [props], [composition], and [selling-point mood]. Keep the product realistic and clearly readable. Avoid watermark, extra text, distorted packaging, changed logo, and low-resolution artifacts.
```

## Variant Strategy

For exploration, create 2-3 prompt variants that differ in composition, style, or mood while preserving the user's core request. Label them briefly and ask the user which to generate only when generation cost or ambiguity is high.

## Common Negative Constraints

Add only when relevant:

```text
no watermark, no logo, no signature, no extra fingers, no distorted hands, no duplicate face, no unreadable text, no low-resolution artifacts
```
