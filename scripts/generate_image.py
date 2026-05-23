#!/usr/bin/env python3
"""Generate images with an env-configured OpenAI-compatible image endpoint."""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime
from http.client import HTTPMessage
from pathlib import Path
from typing import Any, Mapping, Sequence


DEFAULT_ALLOWED_MODELS = ("nano-banana-2", "gpt-image-2", "gpt-image-2-vip", "nano-banana-pro")
DEFAULT_BASE_URL = "https://api.modeltoken.cc"
DEFAULT_MODEL = "gpt-image-2-vip"
DEFAULT_SIZE = "1024x1024"
DEFAULT_QUALITY = "auto"
DEFAULT_REFERENCE_FIELD = "reference_images"
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT; Windows NT 10.0; zh-CN) "
    "WindowsPowerShell/5.1.19041.6456"
)
HELP_TEXT = """
Image Generation Tool usage flow:

1. Configure .env in the working directory:
   IMG_BASE_URL=https://api.modeltoken.cc
   IMG_API_KEY=sk-your-key
   IMG_MODEL=gpt-image-2

2. Check configuration:
   python generate_image.py --check-config

3. Draft a prompt without calling the image API:
   python generate_image.py --draft-prompt --style product --prompt "Use the product photo as reference and create a premium e-commerce hero image"

4. After the user confirms the prompt, generate:
   python generate_image.py --model gpt-image-2 --style product --prompt "..." --reference-image C:/path/product.png
""".strip()

STYLE_PRESETS = {
    "cinematic": "Photoreal cinematic still, strong composition, natural depth of field, motivated lighting, subtle film grain, high dynamic range, realistic materials, 35mm lens, no watermark.",
    "product": "Premium commercial product photography, clean studio lighting, tactile materials, crisp edges, controlled reflections, realistic scale, elegant neutral environment, no logo unless requested.",
    "anime": "High-quality anime key visual, expressive character design, clean linework, detailed background, dynamic lighting, vivid but balanced colors, polished illustration finish.",
    "game-concept": "AAA game concept art, readable silhouette, detailed costume and props, strong pose, environment storytelling, dramatic lighting, production-ready character sheet quality.",
    "watercolor": "Hand-painted watercolor illustration, soft pigment blooms, textured paper, delicate edges, gentle lighting, organic color variation, calm composition.",
    "minimal": "Minimal editorial design, restrained color palette, clear subject hierarchy, generous negative space, refined geometry, sharp details, modern visual language.",
    "cyberpunk": "Neon cyberpunk scene, rain-slick surfaces, dense urban detail, holographic signage, high contrast lighting, cinematic atmosphere, realistic reflections.",
    "clay": "Stylized clay render, soft rounded forms, handmade texture, playful proportions, warm studio lighting, shallow depth of field, clean background.",
    "3d-animation": "High-end 3D animated feature character style, appealing rounded shapes, expressive eyes, sculpted hair, stylized proportions, polished materials, colorful cinematic lighting, family-friendly adventure tone.",
    "poster-tech": "Modern technology company promotional poster, luminous data streams, abstract API nodes, clean enterprise SaaS aesthetic, premium dark background, cyan and silver accents, subtle glassmorphism, confident brand presence.",
    "brand-mascot": "Friendly brand mascot design, memorable silhouette, expressive personality, simple readable shapes, polished 3D or vector-ready look, adaptable for app icons and marketing materials.",
    "wechat-cover": "Chinese social media cover image, clear headline-safe composition, mobile-first layout, strong focal subject, polished commercial design, restrained detail around text areas.",
    "xiaohongshu-cover": "Xiaohongshu-style cover image, eye-catching vertical composition, clean lifestyle-commercial polish, strong subject clarity, bright but tasteful colors, text-safe negative space.",
    "taobao-product": "Taobao product hero image, clean e-commerce composition, clear product readability, premium lighting, attractive selling-point space, high conversion commercial polish.",
}


@dataclass
class ImageResult:
    kind: str
    output_path: Path | None = None
    url: str | None = None
    revised_prompt: str | None = None


def load_dotenv(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            values[key] = value
    return values


def env_value(env_file: Mapping[str, str], key: str, default: str = "") -> str:
    return env_file.get(key) or os.environ.get(key, default)


def split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def allowed_models(env_file: Mapping[str, str]) -> list[str]:
    configured = env_value(env_file, "IMG_ALLOWED_MODELS")
    return split_csv(configured) or list(DEFAULT_ALLOWED_MODELS)


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    env_file = load_dotenv(Path.cwd() / ".env")
    models = allowed_models(env_file)
    parser = argparse.ArgumentParser(
        description="Generate images with an OpenAI-compatible /v1/images/generations endpoint.",
    )
    parser.add_argument("--base-url", default=env_value(env_file, "IMG_BASE_URL", DEFAULT_BASE_URL))
    parser.add_argument(
        "--api-key",
        default=env_value(env_file, "IMG_API_KEY") or env_value(env_file, "OPENAI_API_KEY"),
    )
    parser.add_argument("--model", choices=models, default=env_value(env_file, "IMG_MODEL", DEFAULT_MODEL))
    parser.add_argument("--prompt", default="")
    parser.add_argument("--size", default=env_value(env_file, "IMG_SIZE", DEFAULT_SIZE))
    parser.add_argument("--quality", default=env_value(env_file, "IMG_QUALITY", DEFAULT_QUALITY))
    parser.add_argument("--style", choices=sorted(STYLE_PRESETS), default="")
    parser.add_argument("--optimize-level", choices=("none", "light", "standard", "strong"), default=env_value(env_file, "IMG_OPTIMIZE_LEVEL", "standard"))
    parser.add_argument("--negative", default=env_value(env_file, "IMG_NEGATIVE", ""))
    parser.add_argument("--no-optimize", action="store_true", help="Use the prompt exactly as provided, aside from optional style text.")
    parser.add_argument("--reference-image", action="append", default=[], help="Local reference image path. Repeat for multiple images.")
    parser.add_argument("--reference-field", default=env_value(env_file, "IMG_REFERENCE_FIELD", DEFAULT_REFERENCE_FIELD))
    parser.add_argument("--exact-logo-image", default="", help="Overlay this logo file exactly after generation instead of letting the image model redraw it.")
    parser.add_argument("--exact-logo-position", choices=("top", "bottom", "both"), default=env_value(env_file, "IMG_EXACT_LOGO_POSITION", "top"))
    parser.add_argument("--extra-json", default="", help="JSON object merged into the request payload.")
    parser.add_argument("--output-path", default="")
    parser.add_argument("--output-dir", default=env_value(env_file, "IMG_OUTPUT_DIR", "dist"))
    parser.add_argument("--timeout", type=float, default=float(env_value(env_file, "IMG_TIMEOUT", "600")))
    parser.add_argument("--dry-run", action="store_true", help="Print final payload without sending a request.")
    parser.add_argument("--draft-prompt", action="store_true", help="Print the final optimized prompt only, without calling the API.")
    parser.add_argument("--check-config", action="store_true", help="Check required configuration and exit.")
    parser.add_argument("--usage-help", action="store_true", help="Print guided usage help and exit.")
    parser.add_argument("--list-models", action="store_true", help="List models from /v1/models and exit.")
    parser.add_argument("--save-metadata", dest="save_metadata", action="store_true", default=env_value(env_file, "IMG_SAVE_METADATA", "1").lower() not in ("0", "false", "no"))
    parser.add_argument("--no-save-metadata", dest="save_metadata", action="store_false")

    args = parser.parse_args(argv)
    args.base_url = (args.base_url or DEFAULT_BASE_URL).rstrip("/")
    return args


def default_output_path(output_dir: str) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    return Path(output_dir) / f"generated-image-{timestamp}.png"


def optimize_prompt(
    prompt: str,
    style: str,
    no_optimize: bool,
    has_refs: bool,
    optimize_level: str,
    negative: str,
) -> str:
    parts = [prompt.strip()]
    if style:
        parts.append(STYLE_PRESETS[style])
    if no_optimize or optimize_level == "none":
        if negative:
            parts.append(f"Negative constraints: {negative}")
        return "\n\n".join(part for part in parts if part)

    guidance = []
    if has_refs:
        guidance.append("Use the provided reference image(s) only for the visual traits requested by the user; preserve identity, shape, pose, or materials when implied.")
    if optimize_level in ("light", "standard", "strong"):
        guidance.append("Create a polished image with clear subject hierarchy, coherent composition, refined lighting, and professional finish.")
    if optimize_level in ("standard", "strong"):
        guidance.append("Add concrete visual detail for composition, mood, materials, environment, color palette, and camera or render style while preserving the user's intent.")
    if optimize_level == "strong":
        guidance.append("Make the image production-ready: specify foreground, midground, background, focal point, texture quality, lighting direction, and final-use readability.")
    guidance.append(
        f"Avoid {negative}."
        if negative
        else "Avoid watermark, signature, low-resolution artifacts, distorted anatomy, and unreadable text unless explicitly requested."
    )
    return "\n\n".join(part for part in parts + guidance if part)


def image_to_data_url(path_text: str) -> str:
    path = Path(path_text).expanduser().resolve()
    if not path.exists():
        raise FileNotFoundError(f"Reference image not found: {path}")
    mime_type, _ = mimetypes.guess_type(path.name)
    if not mime_type or not mime_type.startswith("image/"):
        mime_type = "image/png"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def build_payload(args: argparse.Namespace) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "model": args.model,
        "prompt": optimize_prompt(
            args.prompt,
            args.style,
            args.no_optimize,
            bool(args.reference_image),
            args.optimize_level,
            args.negative,
        ),
        "size": args.size,
        "quality": args.quality,
    }
    if args.reference_image:
        payload[args.reference_field] = [image_to_data_url(path) for path in args.reference_image]
    if args.extra_json:
        extra = json.loads(args.extra_json)
        if not isinstance(extra, dict):
            raise ValueError("--extra-json must be a JSON object.")
        payload.update(extra)
    return payload


def check_config(args: argparse.Namespace) -> int:
    errors = []
    warnings = []
    if not args.base_url.strip():
        errors.append("IMG_BASE_URL or --base-url is required.")
    if not args.api_key.strip():
        errors.append("IMG_API_KEY, OPENAI_API_KEY, or --api-key is required.")
    if not args.model.strip():
        errors.append("IMG_MODEL or --model is required.")
    if args.model not in allowed_models(load_dotenv(Path.cwd() / ".env")):
        warnings.append("Selected model is not in IMG_ALLOWED_MODELS/default allowlist.")

    print("Image Generation Tool configuration check")
    print(f"base_url={args.base_url or '<missing>'}")
    print(f"api_key={'set' if args.api_key.strip() else '<missing>'}")
    print(f"model={args.model or '<missing>'}")
    print(f"size={args.size}")
    print(f"quality={args.quality}")
    print(f"reference_field={args.reference_field}")

    for warning in warnings:
        print(f"WARNING: {warning}")
    if errors:
        print("")
        print("Missing required configuration:")
        for error in errors:
            print(f"- {error}")
        print("")
        print("Create a .env file in the working directory, for example:")
        print("IMG_BASE_URL=https://api.modeltoken.cc")
        print("IMG_API_KEY=sk-your-key")
        print("IMG_MODEL=gpt-image-2")
        return 2

    print("Configuration looks ready.")
    return 0


def get_json(url: str, api_key: str, timeout: float) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        method="GET",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "User-Agent": DEFAULT_USER_AGENT,
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def list_models(args: argparse.Namespace) -> None:
    payload = get_json(f"{args.base_url}/v1/models", args.api_key, args.timeout)
    data = payload.get("data", [])
    if not isinstance(data, list):
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        return
    for model in data:
        if isinstance(model, dict) and model.get("id"):
            display = model.get("display_name") or model.get("owned_by") or ""
            suffix = f" - {display}" if display else ""
            print(f"{model['id']}{suffix}")


def metadata_paths(output_path: Path) -> tuple[Path, Path]:
    return output_path.with_suffix(".prompt.txt"), output_path.with_suffix(".meta.json")


def redact_payload(payload: Mapping[str, Any]) -> dict[str, Any]:
    redacted = dict(payload)
    for key, value in list(redacted.items()):
        if isinstance(value, list) and any(isinstance(item, str) and item.startswith("data:image/") for item in value):
            redacted[key] = [f"<embedded image {index + 1}>" for index, _ in enumerate(value)]
    return redacted


def save_sidecar_files(
    *,
    output_path: Path,
    args: argparse.Namespace,
    payload: Mapping[str, Any],
    result: ImageResult | None,
) -> None:
    prompt_path, meta_path = metadata_paths(output_path)
    prompt_path.parent.mkdir(parents=True, exist_ok=True)
    prompt_path.write_text(str(payload.get("prompt", "")), encoding="utf-8")
    meta = {
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "base_url": args.base_url,
        "model": payload.get("model"),
        "size": payload.get("size"),
        "quality": payload.get("quality"),
        "style": args.style,
        "optimize_level": args.optimize_level,
        "reference_images": [str(Path(path).expanduser().resolve()) for path in args.reference_image],
        "reference_field": args.reference_field,
        "output_path": str(output_path.resolve()),
        "result_kind": result.kind if result else None,
        "result_url": result.url if result else None,
        "revised_prompt": result.revised_prompt if result else None,
        "payload": redact_payload(payload),
    }
    meta_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Saved prompt: {prompt_path.resolve()}")
    print(f"Saved metadata: {meta_path.resolve()}")


def apply_exact_logo_overlay(image_path: Path, logo_path_text: str, position: str) -> Path:
    try:
        from PIL import Image, ImageChops, ImageDraw
    except ImportError as error:
        raise RuntimeError("Pillow is required for --exact-logo-image. Install it with: python -m pip install Pillow") from error

    logo_path = Path(logo_path_text).expanduser().resolve()
    if not logo_path.exists():
        raise FileNotFoundError(f"Exact logo image not found: {logo_path}")

    base = Image.open(image_path).convert("RGBA")
    logo = Image.open(logo_path).convert("RGB")
    white = Image.new("RGB", logo.size, (255, 255, 255))
    diff = ImageChops.difference(logo, white).convert("L")
    bbox = diff.point(lambda p: 255 if p > 18 else 0).getbbox()
    logo_crop = logo.crop(bbox).convert("RGBA") if bbox else logo.convert("RGBA")

    def make_panel(max_w: int, max_h: int) -> Image.Image:
        ratio = min(max_w / logo_crop.width, max_h / logo_crop.height)
        size = (int(logo_crop.width * ratio), int(logo_crop.height * ratio))
        mark = logo_crop.resize(size, Image.Resampling.LANCZOS)
        pad_x, pad_y = 24, 18
        panel = Image.new("RGBA", (size[0] + pad_x * 2, size[1] + pad_y * 2), (0, 0, 0, 0))
        draw = ImageDraw.Draw(panel, "RGBA")
        draw.rounded_rectangle(
            [0, 0, panel.width - 1, panel.height - 1],
            radius=max(12, min(panel.width, panel.height) // 10),
            fill=(255, 255, 255, 255),
            outline=(211, 174, 85, 230),
            width=2,
        )
        panel.alpha_composite(mark, (pad_x, pad_y))
        return panel

    def paste_center(panel: Image.Image, center_x: int, center_y: int) -> None:
        base.alpha_composite(panel, (int(center_x - panel.width / 2), int(center_y - panel.height / 2)))

    width, height = base.size
    draw = ImageDraw.Draw(base, "RGBA")
    if position in ("top", "both"):
        top_panel = make_panel(int(width * 0.18), int(height * 0.08))
        cover = [
            int(width / 2 - top_panel.width * 0.9),
            int(height * 0.015),
            int(width / 2 + top_panel.width * 0.9),
            int(height * 0.015 + top_panel.height * 1.25),
        ]
        draw.rounded_rectangle(cover, radius=20, fill=(245, 239, 218, 245))
        paste_center(top_panel, width // 2, int(height * 0.067))
    if position in ("bottom", "both"):
        bottom_panel = make_panel(int(width * 0.22), int(height * 0.095))
        cover = [
            int(width / 2 - bottom_panel.width * 1.25),
            int(height * 0.87),
            int(width / 2 + bottom_panel.width * 1.25),
            int(height * 0.99),
        ]
        draw.rounded_rectangle(cover, radius=28, fill=(18, 82, 61, 245), outline=(218, 186, 106, 190), width=2)
        paste_center(bottom_panel, width // 2, int(height * 0.935))

    output_path = image_path.with_name(f"{image_path.stem}-exact-logo{image_path.suffix}")
    base.save(output_path)
    return output_path


def build_headers(api_key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": DEFAULT_USER_AGENT,
    }


def redact_secret(value: str) -> str:
    if len(value) <= 12:
        return "***"
    return f"{value[:5]}...{value[-4:]}"


def format_headers(headers: Mapping[str, str] | HTTPMessage) -> str:
    lines = []
    for key, value in headers.items():
        if key.lower() == "authorization":
            parts = value.split(" ", 1)
            value = f"{parts[0]} {redact_secret(parts[1])}" if len(parts) == 2 else redact_secret(value)
        lines.append(f"{key}: {value}")
    return "\n".join(lines)


def post_image_request(args: argparse.Namespace, payload: Mapping[str, Any]) -> bytes:
    url = f"{args.base_url}/v1/images/generations"
    body = json.dumps(payload).encode("utf-8")
    headers = build_headers(args.api_key)
    request = urllib.request.Request(url, data=body, method="POST", headers=headers)

    print(f"POST {url}")
    print(f"model={payload.get('model')} size={payload.get('size')} quality={payload.get('quality')}")
    print(f"prompt={payload.get('prompt')}")
    if args.reference_image:
        print(f"reference_images={len(args.reference_image)} field={args.reference_field}")

    try:
        with urllib.request.urlopen(request, timeout=args.timeout) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        error.request_url = url
        error.request_headers = headers
        error.request_body = body
        raise


def handle_image_response(response_body: bytes, output_path: Path) -> ImageResult:
    payload = json.loads(response_body.decode("utf-8"))
    data = payload.get("data") or []
    first = data[0] if data else None
    if not isinstance(first, dict):
        raise ValueError(f"No image data returned.\n{json.dumps(payload, indent=2)}")

    if first.get("b64_json"):
        output_path = output_path.resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(base64.b64decode(first["b64_json"]))
        return ImageResult(
            kind="file",
            output_path=output_path,
            revised_prompt=first.get("revised_prompt"),
        )

    if first.get("url"):
        return ImageResult(kind="url", url=first["url"], revised_prompt=first.get("revised_prompt"))

    raise ValueError("Response did not include b64_json or url.\n" + json.dumps(payload, indent=2))


def print_request_error(error: BaseException) -> None:
    print("\nRequest failed.", file=sys.stderr)
    if isinstance(error, urllib.error.HTTPError):
        error_body = error.read()
        request_url = getattr(error, "request_url", "<unknown>")
        request_headers = getattr(error, "request_headers", {})
        request_body = getattr(error, "request_body", b"")
        decoded_request = request_body.decode("utf-8", errors="replace")
        decoded_response = error_body.decode("utf-8", errors="replace")
        print(f"HTTP {error.code} {error.reason}", file=sys.stderr)
        print("\nRequest:", file=sys.stderr)
        print(f"POST {request_url}", file=sys.stderr)
        print(format_headers(request_headers), file=sys.stderr)
        print(decoded_request, file=sys.stderr)
        print("\nResponse headers:", file=sys.stderr)
        print(format_headers(error.headers), file=sys.stderr)
        print("\nResponse body:", file=sys.stderr)
        print(decoded_response, file=sys.stderr)
        return
    print(str(error), file=sys.stderr)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    if args.usage_help:
        print(HELP_TEXT)
        return 0

    if args.check_config:
        return check_config(args)

    if args.list_models:
        if not args.api_key.strip():
            print("Missing API key. Set IMG_API_KEY in .env or pass --api-key.", file=sys.stderr)
            return 2
        try:
            list_models(args)
        except Exception as error:
            print_request_error(error)
            return 1
        return 0

    if not args.prompt.strip():
        print("Missing prompt. Pass --prompt or use --list-models.", file=sys.stderr)
        return 2

    if not args.api_key.strip() and not args.dry_run and not args.draft_prompt:
        print("Missing API key. Set IMG_API_KEY in .env or pass --api-key.", file=sys.stderr)
        return 2

    try:
        payload = build_payload(args)
        output_path = Path(args.output_path) if args.output_path else default_output_path(args.output_dir)
        if args.draft_prompt:
            print(payload["prompt"])
            return 0
        if args.dry_run:
            print(json.dumps(payload, indent=2, ensure_ascii=False))
            if args.save_metadata:
                save_sidecar_files(output_path=output_path, args=args, payload=payload, result=None)
            return 0
        response_body = post_image_request(args, payload)
        result = handle_image_response(response_body, output_path)
        if result.kind == "file" and result.output_path and args.exact_logo_image:
            result.output_path = apply_exact_logo_overlay(
                result.output_path,
                args.exact_logo_image,
                args.exact_logo_position,
            )
        if args.save_metadata and result.kind == "file" and result.output_path:
            save_sidecar_files(output_path=result.output_path, args=args, payload=payload, result=result)
    except Exception as error:
        print_request_error(error)
        return 1

    if result.revised_prompt:
        print(f"revised_prompt={result.revised_prompt}")
    if result.kind == "file":
        print(f"\nSaved image: {result.output_path}")
        return 0
    if result.kind == "url":
        print("\nImage URL returned:")
        print(result.url)
        return 0
    print("Unexpected image result.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
