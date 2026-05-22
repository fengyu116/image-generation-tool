---
name: image-generation-tool
description: Generate images with an OpenAI-compatible image API using environment configuration. Use when the user asks Codex to create images from text prompts, choose one of nano-banana-2, gpt-image-2, gpt-image-2-vip, or nano-banana-pro, optimize prompts, apply style presets, or submit one or more reference images together with the request.
---

# Image Generation Tool

Use the bundled image generation CLI to turn a user prompt into an image through an OpenAI-compatible `/v1/images/generations` endpoint. Prefer this skill when the user wants model selection, prompt improvement, reusable style presets, `.env`-based configuration, or reference-image-guided generation.

## Workflow

1. Clarify only missing essentials: subject, target use, aspect ratio/size, model, and whether reference images should be included. If the user already supplied enough detail, proceed.
2. Improve the prompt before generation unless the user explicitly asks to use it verbatim. Keep user intent intact, add concrete visual details, composition, lighting, material, camera/lens, and negative constraints.
3. Choose a model. If unsure, run `--list-models` first to inspect the configured endpoint:
   - `nano-banana-pro`: default for highest detail and prompt fidelity.
   - `gpt-image-2`: use when the configured endpoint lists the standard GPT Image 2 model.
   - `gpt-image-2-vip`: use for polished general-purpose creative images.
   - `nano-banana-2`: use for faster drafts or lower-cost iterations.
4. Apply a style preset when requested or when a preset clearly fits. Read `references/style-presets.md` for available preset language.
5. Run `scripts/generate_image.py` from this skill. Pass reference image paths with `--reference-image` once per file.
6. Show the saved image path and, in Codex Desktop, render it with Markdown image syntax using an absolute path.

## Configuration

Configure credentials in a project `.env`, the current shell environment, or explicit CLI flags. `.env` values in the current working directory are loaded first, then inherited environment variables are used.

Supported environment variables:

```text
IMG_BASE_URL=https://tokenhub.host
IMG_API_KEY=sk-...
IMG_MODEL=nano-banana-pro
IMG_SIZE=1024x1024
IMG_QUALITY=auto
IMG_OUTPUT_DIR=dist
IMG_REFERENCE_FIELD=reference_images
IMG_ALLOWED_MODELS=nano-banana-2,gpt-image-2,gpt-image-2-vip,nano-banana-pro
IMG_OPTIMIZE_LEVEL=standard
IMG_NEGATIVE=no watermark, no signature, no malformed hands
IMG_SAVE_METADATA=1
```

`OPENAI_API_KEY` is accepted as a fallback for `IMG_API_KEY`.

## Quick Commands

Generate a default high-quality image:

```bash
python C:/Users/fengyu/.codex/skills/image-generation-tool/scripts/generate_image.py --prompt "cinematic product photo of a translucent smart speaker on a walnut desk"
```

List endpoint models:

```bash
python C:/Users/fengyu/.codex/skills/image-generation-tool/scripts/generate_image.py --list-models
```

Choose a model and style:

```bash
python C:/Users/fengyu/.codex/skills/image-generation-tool/scripts/generate_image.py --model gpt-image-2 --style cinematic --prompt "a futuristic city tram at sunrise"
```

Submit reference images:

```bash
python C:/Users/fengyu/.codex/skills/image-generation-tool/scripts/generate_image.py --prompt "redesign this character as a game hero" --reference-image C:/path/ref1.png --reference-image C:/path/ref2.jpg
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

When the user provides images, pass each local file with `--reference-image`. The script embeds files as data URLs in the payload field named by `IMG_REFERENCE_FIELD` or `--reference-field`. If the endpoint expects a different field name, set `IMG_REFERENCE_FIELD` in `.env` or pass `--reference-field`.

If the endpoint rejects reference images, rerun with `--dry-run` to inspect payload shape, then adjust `--reference-field` or `--extra-json` for that provider.
