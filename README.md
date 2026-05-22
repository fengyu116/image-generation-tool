# Image Generation Tool Skill

Codex skill for generating images through an OpenAI-compatible image API.

## Features

- Env-based configuration with `.env`
- Model selection for `nano-banana-2`, `gpt-image-2`, `gpt-image-2-vip`, and `nano-banana-pro`
- Dynamic model allowlist through `IMG_ALLOWED_MODELS`
- Prompt optimization levels: `none`, `light`, `standard`, `strong`
- Style presets for posters, 3D animation, product images, mascots, social covers, and more
- Reference image submission through local file paths
- Sidecar `.prompt.txt` and `.meta.json` output files

## Install

Copy this folder into your Codex skills directory:

```powershell
Copy-Item -Recurse . "$env:USERPROFILE\.codex\skills\image-generation-tool"
```

Or ask Codex to install this skill from the GitHub repo URL.

## Configure

Copy `.env.example` to your project `.env` and fill in your API key:

```text
IMG_BASE_URL=https://api.modeltoken.cc
IMG_API_KEY=sk-...
IMG_MODEL=gpt-image-2
IMG_SIZE=1024x1024
IMG_QUALITY=auto
IMG_OUTPUT_DIR=dist
IMG_REFERENCE_FIELD=reference_images
IMG_ALLOWED_MODELS=nano-banana-2,gpt-image-2,gpt-image-2-vip,nano-banana-pro
IMG_OPTIMIZE_LEVEL=standard
IMG_SAVE_METADATA=1
```

## Usage

```powershell
python scripts/generate_image.py --list-models
python scripts/generate_image.py --model gpt-image-2 --style poster-tech --prompt "淘心API 科技公司宣传海报"
python scripts/generate_image.py --model gpt-image-2 --style 3d-animation --optimize-level strong --prompt "一个自信的科技公司工程师吉祥物角色"
```
