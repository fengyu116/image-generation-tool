---
name: image-generation-tool
description: Use when the user asks to 生图, 生成图片, 做图, 改图, generate or edit an image, optimize an image prompt, apply a style preset, or use product/reference images with an OpenAI-compatible image API.
---

# Image Generation Tool

Use the bundled Node.js image generation CLI to turn a user prompt into an image through OpenAI-compatible image endpoints. Text-only generation uses `/v1/images/generations`; reference-image generation defaults to `/v1/images/edits` multipart img2img. Prefer this skill when the user wants model selection, prompt improvement, reusable style presets, `.env`-based configuration, guided prompt drafting, or reference-image-guided generation.

## Workflow

1. Before generating, require `IMG_API_KEY` in the current working directory `.env`. The CLI reads credentials only from `.env`; do not pass a key in chat, shell environment, or command flags. Check this silently and notify the user only if configuration is missing or blocks generation.
2. Clarify only missing essentials: subject, target use, aspect ratio/size, model, and whether reference images should be included. If the user already supplied enough detail, proceed.
3. Always draft or present the final prompt and ask for user confirmation before spending a generation call, including reference-image/img2img tasks.
4. Improve the prompt before generation unless the user explicitly asks to use it verbatim. Keep user intent intact, add concrete visual details, composition, lighting, material, camera/lens, and negative constraints.
5. Use `gpt-image-2-vip` by default. Do not select or pass another model unless the user explicitly asks for it. Explicit alternatives are `nano-banana-2`, `gpt-image-2`, and `nano-banana-pro`.
6. Apply a style preset when requested or when a preset clearly fits. Read `references/style-presets.md` for available preset language.
7. Run `scripts/generate_image.mjs` with Node.js from this skill. Pass uploaded/local reference images with `--reference-image` once per file. If the user uploads or supplies any image, the request must use `/v1/images/edits` with `image[]=@file`; text-only prompts use `/v1/images/generations`.
8. This skill is responsible only for prompt optimization, parameter selection, submitting the generation request, and saving the returned files. Do not add extra image-editing steps after the API response as part of this skill.
9. Show the saved image path and, in Codex Desktop, render it with Markdown image syntax using an absolute path. Do not automatically inspect, compare, or validate the generated image after it is returned unless the user explicitly asks.

## Guided Prompt Flow

Use this flow whenever the user asks for an image, uploads a product/reference image, or gives a broad goal such as "make an ad image from this product photo":

1. Identify the intended output: product hero image, poster, social cover, e-commerce main image, character concept, brand mascot, etc.
2. Inspect or ask for the reference image path. If the uploaded image is not available as a local path, ask the user to save/provide the image path before using `--reference-image`.
3. Draft a prompt using `--draft-prompt`, choosing style and optimization level from the user's use case.
4. Present the drafted prompt to the user in Chinese, with a short note about model, size, style, and reference image handling.
5. Generate only after the user confirms or edits the prompt. After generation, return the result without running automatic visual correctness checks.

For a product image, preserve the product shape, color, material, logo/label if requested, and key selling point. Change only the scene, lighting, background, props, or marketing composition requested by the user.

## Configuration

Configure credentials in the current working directory `.env`. `IMG_API_KEY` is intentionally loaded only from `.env`, never from inherited environment variables or CLI flags.

Supported environment variables:

```text
IMG_BASE_URL=https://tokenhub.host
IMG_API_KEY=sk-...
IMG_SIZE=auto
IMG_QUALITY=auto
IMG_TIMEOUT=150
IMG_OUTPUT_DIR=dist
IMG_API_MODE=auto
IMG_ALLOWED_MODELS=nano-banana-2,gpt-image-2,gpt-image-2-vip,nano-banana-pro
IMG_OPTIMIZE_LEVEL=light
IMG_NEGATIVE=no watermark, no signature, no malformed hands
IMG_SAVE_METADATA=1
```

The default model is always `gpt-image-2-vip`. Pass `--model` only after the user explicitly requests another allowed model.

## Quick Commands

Show guided usage help:

```bash
node C:/Users/fengyu/.codex/skills/image-generation-tool/scripts/generate_image.mjs --usage-help
```

Check required configuration:

```bash
node C:/Users/fengyu/.codex/skills/image-generation-tool/scripts/generate_image.mjs --check-config
```

Generate a default lightweight image:

```bash
node C:/Users/fengyu/.codex/skills/image-generation-tool/scripts/generate_image.mjs --prompt "cinematic product photo of a translucent smart speaker on a walnut desk"
```

List endpoint models:

```bash
node C:/Users/fengyu/.codex/skills/image-generation-tool/scripts/generate_image.mjs --list-models
```

Choose a non-default model only when explicitly requested:

```bash
node C:/Users/fengyu/.codex/skills/image-generation-tool/scripts/generate_image.mjs --style cinematic --prompt "a futuristic city tram at sunrise"
```

Submit reference images:

```bash
node C:/Users/fengyu/.codex/skills/image-generation-tool/scripts/generate_image.mjs --prompt "redesign this character as a game hero" --reference-image C:/path/ref1.png --reference-image C:/path/ref2.jpg
```

Reference-image calls must use `/v1/images/edits`. Do not send uploaded/reference images through `/v1/images/generations`.

Use `--size` only when the user explicitly asks for a supported size; otherwise keep the default `size=auto`.

Draft a prompt for user confirmation without calling the image API:

```bash
node C:/Users/fengyu/.codex/skills/image-generation-tool/scripts/generate_image.mjs --draft-prompt --style taobao-product --optimize-level strong --prompt "Use the product photo as reference and create a premium e-commerce hero image" --reference-image C:/path/product.png
```

Use `--no-optimize` when the user asks for an exact prompt. Use `--optimize-level light|standard|strong|none` to control prompt expansion. Use `--negative "..."` for explicit negative constraints. Use `--dry-run` to inspect the final payload without calling the API.

By default the script saves sidecar files next to generated files:

- `.prompt.txt`: final prompt sent to the API.
- `.meta.json`: model, size, style, references, revised prompt, and redacted payload.

Pass `--no-save-metadata` to skip these files.

## Prompt Optimization

Read `references/prompting.md` when improving prompts, creating variants, or explaining why a prompt was changed. Keep optimized prompts concise enough to be steerable, usually 80-180 English words for image APIs. The CLI defaults to `--optimize-level light` for faster, lighter calls; use `standard` or `strong` for posters, detailed scenes, character concepts, and reference-image transformations.

Preserve:

- The subject and requested action.
- Any required text, brand, character, or reference image relationship.
- Any explicit style, camera, medium, color, or constraint.

Add only useful missing detail:

- Composition and framing.
- Lighting and mood.
- Materials, environment, and texture.
- Render/photography/illustration quality markers.
- Negative constraints such as no watermark, no extra limbs, no unreadable text, when relevant.

## Reference Images

When the user provides images, pass each local file with `--reference-image`. In `auto` mode the script sends them to `/v1/images/edits` as multipart `image[]` files.

If the endpoint rejects edits, report the provider error and do not fall back to a text-only or generations request with uploaded images.
