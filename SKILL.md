---
name: image-generation-tool
description: Generate images with an OpenAI-compatible image API using environment configuration. Use when the user asks Codex to create images from text prompts, choose one of nano-banana-2, gpt-image-2, gpt-image-2-vip, or nano-banana-pro, optimize prompts, apply style presets, submit reference images, check API configuration, or guide them from a product/reference image plus requirements into a confirmed prompt and final generated image.
---

# Image Generation Tool

Use the bundled Node.js image generation CLI to turn a user prompt into an image through OpenAI-compatible image endpoints. Text-only generation uses `/v1/images/generations`; reference-image generation defaults to `/v1/images/edits` multipart img2img. Prefer this skill when the user wants model selection, prompt improvement, reusable style presets, `.env`-based configuration, guided prompt drafting, or reference-image-guided generation.

## Workflow

1. Run `--check-config` before the first generation in a project/session. If key fields are missing, tell the user to create/update `.env` with `IMG_BASE_URL`, `IMG_API_KEY`, and `IMG_MODEL` before generating.
2. Clarify only missing essentials: subject, target use, aspect ratio/size, model, and whether reference images should be included. If the user already supplied enough detail, proceed.
3. For guided use, draft the final prompt first and ask for confirmation before spending a generation call. This is especially important when the user uploads a product/reference image and asks for an ad, poster, e-commerce image, character, or style transformation.
4. Improve the prompt before generation unless the user explicitly asks to use it verbatim. Keep user intent intact, add concrete visual details, composition, lighting, material, camera/lens, and negative constraints.
5. Choose a model. If unsure, run `--list-models` first to inspect the configured endpoint:
   - `nano-banana-pro`: default for highest detail and prompt fidelity.
   - `gpt-image-2`: use when the configured endpoint lists the standard GPT Image 2 model.
   - `gpt-image-2-vip`: use for polished general-purpose creative images.
   - `nano-banana-2`: use for faster drafts or lower-cost iterations.
6. Apply a style preset when requested or when a preset clearly fits. Read `references/style-presets.md` for available preset language.
7. Run `scripts/generate_image.mjs` with Node.js from this skill. Pass reference image paths with `--reference-image` once per file. By default, reference images use `/v1/images/edits` with `image[]=@file`; text-only prompts use `/v1/images/generations`.
8. When a logo must remain pixel-perfect, do not rely on image generation alone. Use this Node.js CLI to create the poster/background, then composite the original logo with a deterministic image tool.
9. Show the saved image path and, in Codex Desktop, render it with Markdown image syntax using an absolute path.

## Guided Prompt Flow

Use this flow when the user asks for help, uploads a product/reference image, or gives a broad goal such as "make an ad image from this product photo":

1. Identify the intended output: product hero image, poster, social cover, e-commerce main image, character concept, brand mascot, etc.
2. Inspect or ask for the reference image path. If the uploaded image is not available as a local path, ask the user to save/provide the image path before using `--reference-image`.
3. Draft a prompt using `--draft-prompt`, choosing style and optimization level from the user's use case.
4. Present the drafted prompt to the user in Chinese, with a short note about model, size, style, and reference image handling.
5. Generate only after the user confirms or edits the prompt.

For a product image, preserve the product shape, color, material, logo/label if requested, and key selling point. Change only the scene, lighting, background, props, or marketing composition requested by the user.

## Configuration

Configure credentials in a project `.env`, the current shell environment, or explicit CLI flags. `.env` values in the current working directory are loaded first, then inherited environment variables are used.

Supported environment variables:

```text
IMG_BASE_URL=https://tokenhub.host
IMG_API_KEY=sk-...
IMG_MODEL=nano-banana-pro
IMG_SIZE=1024x1024
IMG_QUALITY=auto
IMG_TIMEOUT=350
IMG_OUTPUT_DIR=dist
IMG_REFERENCE_FIELD=reference_images
IMG_API_MODE=auto
IMG_ALLOWED_MODELS=nano-banana-2,gpt-image-2,gpt-image-2-vip,nano-banana-pro
IMG_OPTIMIZE_LEVEL=standard
IMG_NEGATIVE=no watermark, no signature, no malformed hands
IMG_SAVE_METADATA=1
```

`OPENAI_API_KEY` is accepted as a fallback for `IMG_API_KEY`.

For proxy networks with Node 24+, set proxy environment variables before running the CLI:

```powershell
$env:NODE_USE_ENV_PROXY="1"
$env:HTTPS_PROXY="http://127.0.0.1:7897"
$env:HTTP_PROXY="http://127.0.0.1:7897"
```

## Quick Commands

Show guided usage help:

```bash
node C:/Users/fengyu/.codex/skills/image-generation-tool/scripts/generate_image.mjs --usage-help
```

Check required configuration:

```bash
node C:/Users/fengyu/.codex/skills/image-generation-tool/scripts/generate_image.mjs --check-config
```

Generate a default high-quality image:

```bash
node C:/Users/fengyu/.codex/skills/image-generation-tool/scripts/generate_image.mjs --prompt "cinematic product photo of a translucent smart speaker on a walnut desk"
```

List endpoint models:

```bash
node C:/Users/fengyu/.codex/skills/image-generation-tool/scripts/generate_image.mjs --list-models
```

Choose a model and style:

```bash
node C:/Users/fengyu/.codex/skills/image-generation-tool/scripts/generate_image.mjs --model gpt-image-2 --style cinematic --prompt "a futuristic city tram at sunrise"
```

Submit reference images:

```bash
node C:/Users/fengyu/.codex/skills/image-generation-tool/scripts/generate_image.mjs --prompt "redesign this character as a game hero" --reference-image C:/path/ref1.png --reference-image C:/path/ref2.jpg
```

Reference-image calls default to `/v1/images/edits`. Use `--api-mode generations` only when testing a provider-specific `reference_images` JSON field. Use `--api-mode edits` to force multipart img2img.

For pixel-perfect logos, generate the poster/background first and then composite the original logo with a deterministic image tool. Do not expect the image model to preserve a logo exactly.

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

Read `references/prompting.md` when improving prompts, creating variants, or explaining why a prompt was changed. Keep optimized prompts concise enough to be steerable, usually 80-180 English words for image APIs. Prefer `--optimize-level standard`; use `strong` for posters, detailed scenes, character concepts, and reference-image transformations.

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

When the user provides images, pass each local file with `--reference-image`. In `auto` mode the script sends them to `/v1/images/edits` as multipart `image[]` files. This usually preserves reference-image structure better than the old JSON `reference_images` path.

If the endpoint rejects edits, rerun with `--dry-run` to inspect mode selection. Then try `--api-mode generations` with `--reference-field` or `--extra-json` for provider-specific compatibility.
