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

## Variant Strategy

For exploration, create 2-3 prompt variants that differ in composition, style, or mood while preserving the user's core request. Label them briefly and ask the user which to generate only when generation cost or ambiguity is high.

## Common Negative Constraints

Add only when relevant:

```text
no watermark, no logo, no signature, no extra fingers, no distorted hands, no duplicate face, no unreadable text, no low-resolution artifacts
```
