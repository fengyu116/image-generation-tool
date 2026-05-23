#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ALLOWED_MODELS = ["nano-banana-2", "gpt-image-2", "gpt-image-2-vip", "nano-banana-pro"];
const DEFAULT_BASE_URL = "https://api.modeltoken.cc";
const DEFAULT_MODEL = "gpt-image-2";
const DEFAULT_SIZE = "auto";
const DEFAULT_QUALITY = "auto";
const DEFAULT_TIMEOUT_SECONDS = 150;
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT; Windows NT 10.0; zh-CN) WindowsPowerShell/5.1.19041.6456";

const STYLE_PRESETS = {
  cinematic:
    "Photoreal cinematic still, strong composition, natural depth of field, motivated lighting, subtle film grain, high dynamic range, realistic materials, 35mm lens, no watermark.",
  product:
    "Premium commercial product photography, clean studio lighting, tactile materials, crisp edges, controlled reflections, realistic scale, elegant neutral environment, no logo unless requested.",
  anime:
    "High-quality anime key visual, expressive character design, clean linework, detailed background, dynamic lighting, vivid but balanced colors, polished illustration finish.",
  "game-concept":
    "AAA game concept art, readable silhouette, detailed costume and props, strong pose, environment storytelling, dramatic lighting, production-ready character sheet quality.",
  watercolor:
    "Hand-painted watercolor illustration, soft pigment blooms, textured paper, delicate edges, gentle lighting, organic color variation, calm composition.",
  minimal:
    "Minimal editorial design, restrained color palette, clear subject hierarchy, generous negative space, refined geometry, sharp details, modern visual language.",
  cyberpunk:
    "Neon cyberpunk scene, rain-slick surfaces, dense urban detail, holographic signage, high contrast lighting, cinematic atmosphere, realistic reflections.",
  clay:
    "Stylized clay render, soft rounded forms, handmade texture, playful proportions, warm studio lighting, shallow depth of field, clean background.",
  "3d-animation":
    "High-end 3D animated feature character style, appealing rounded shapes, expressive eyes, sculpted hair, stylized proportions, polished materials, colorful cinematic lighting, family-friendly adventure tone.",
  "poster-tech":
    "Modern technology company promotional poster, luminous data streams, abstract API nodes, clean enterprise SaaS aesthetic, premium dark background, cyan and silver accents, subtle glassmorphism, confident brand presence.",
  "brand-mascot":
    "Friendly brand mascot design, memorable silhouette, expressive personality, simple readable shapes, polished 3D or vector-ready look, adaptable for app icons and marketing materials.",
  "wechat-cover":
    "Chinese social media cover image, clear headline-safe composition, mobile-first layout, strong focal subject, polished commercial design, restrained detail around text areas.",
  "xiaohongshu-cover":
    "Xiaohongshu-style cover image, eye-catching vertical composition, clean lifestyle-commercial polish, strong subject clarity, bright but tasteful colors, text-safe negative space.",
  "taobao-product":
    "Taobao product hero image, clean e-commerce composition, clear product readability, premium lighting, attractive selling-point space, high conversion commercial polish.",
};

const HELP_TEXT = `
Image Generation Tool usage flow:

1. Configure .env in the working directory:
   IMG_BASE_URL=https://api.modeltoken.cc
   IMG_API_KEY=sk-your-key
   IMG_MODEL=gpt-image-2
   IMG_TIMEOUT=150

2. Check configuration:
   node generate_image.mjs --check-config

3. Draft a prompt without calling the image API:
   node generate_image.mjs --draft-prompt --style product --prompt "Use the product photo as reference and create a premium e-commerce hero image"

4. Generate text-to-image:
   node generate_image.mjs --model gpt-image-2 --prompt "..."

5. Generate with reference image through /v1/images/edits:
   node generate_image.mjs --model gpt-image-2 --prompt "..." --reference-image C:/path/product.png
`.trim();

function loadDotenv(filePath = path.join(process.cwd(), ".env")) {
  const values = {};
  if (!fs.existsSync(filePath)) return values;
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (key) values[key] = value;
  }
  return values;
}

function envValue(envFile, key, fallback = "") {
  return envFile[key] || process.env[key] || fallback;
}

function splitCsv(value) {
  return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

function parseArgs(argv, envFile) {
  const args = {
    baseUrl: envValue(envFile, "IMG_BASE_URL", DEFAULT_BASE_URL),
    apiKey: envValue(envFile, "IMG_API_KEY") || envValue(envFile, "OPENAI_API_KEY"),
    model: envValue(envFile, "IMG_MODEL", DEFAULT_MODEL),
    prompt: "",
    size: envValue(envFile, "IMG_SIZE", DEFAULT_SIZE),
    quality: envValue(envFile, "IMG_QUALITY", DEFAULT_QUALITY),
    outputFormat: envValue(envFile, "IMG_OUTPUT_FORMAT", "png"),
    style: "",
    optimizeLevel: envValue(envFile, "IMG_OPTIMIZE_LEVEL", "light"),
    negative: envValue(envFile, "IMG_NEGATIVE", ""),
    noOptimize: false,
    referenceImages: [],
    apiMode: envValue(envFile, "IMG_API_MODE", "auto"),
    outputPath: "",
    outputDir: envValue(envFile, "IMG_OUTPUT_DIR", "dist"),
    timeout: Number(envValue(envFile, "IMG_TIMEOUT", String(DEFAULT_TIMEOUT_SECONDS))),
    dryRun: false,
    draftPrompt: false,
    checkConfig: false,
    usageHelp: false,
    listModels: false,
    saveMetadata: !["0", "false", "no"].includes(envValue(envFile, "IMG_SAVE_METADATA", "1").toLowerCase()),
    extraJson: "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`Missing value for ${flag}`);
      i += 1;
      return argv[i];
    };
    switch (flag) {
      case "--base-url": args.baseUrl = next(); break;
      case "--api-key": args.apiKey = next(); break;
      case "--model": args.model = next(); break;
      case "--prompt": args.prompt = next(); break;
      case "--size": args.size = next(); break;
      case "--quality": args.quality = next(); break;
      case "--output-format": args.outputFormat = next(); break;
      case "--style": args.style = next(); break;
      case "--optimize-level": args.optimizeLevel = next(); break;
      case "--negative": args.negative = next(); break;
      case "--no-optimize": args.noOptimize = true; break;
      case "--reference-image": args.referenceImages.push(next()); break;
      case "--api-mode": args.apiMode = next(); break;
      case "--extra-json": args.extraJson = next(); break;
      case "--output-path": args.outputPath = next(); break;
      case "--output-dir": args.outputDir = next(); break;
      case "--timeout": args.timeout = Number(next()); break;
      case "--dry-run": args.dryRun = true; break;
      case "--draft-prompt": args.draftPrompt = true; break;
      case "--check-config": args.checkConfig = true; break;
      case "--usage-help": args.usageHelp = true; break;
      case "--list-models": args.listModels = true; break;
      case "--save-metadata": args.saveMetadata = true; break;
      case "--no-save-metadata": args.saveMetadata = false; break;
      default:
        throw new Error(`Unknown argument: ${flag}`);
    }
  }

  args.baseUrl = (args.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
  return args;
}

function validateArgs(args, allowedModels) {
  if (!["auto", "generations", "edits"].includes(args.apiMode)) {
    throw new Error("--api-mode must be auto, generations, or edits");
  }
  if (!["none", "light", "standard", "strong"].includes(args.optimizeLevel)) {
    throw new Error("--optimize-level must be none, light, standard, or strong");
  }
  if (args.style && !STYLE_PRESETS[args.style]) {
    throw new Error(`Unknown style: ${args.style}`);
  }
  if (!allowedModels.includes(args.model)) {
    throw new Error(`Model "${args.model}" is not in allowed models: ${allowedModels.join(", ")}`);
  }
  if (!Number.isFinite(args.timeout) || args.timeout <= 0) {
    throw new Error("--timeout must be a positive number of seconds");
  }
}

function resolveApiMode(args) {
  if (args.apiMode !== "auto") return args.apiMode;
  return args.referenceImages.length ? "edits" : "generations";
}

function optimizePrompt(args) {
  const parts = [args.prompt.trim()];
  if (args.style) parts.push(STYLE_PRESETS[args.style]);

  if (args.noOptimize || args.optimizeLevel === "none") {
    if (args.negative) parts.push(`Negative constraints: ${args.negative}`);
    return parts.filter(Boolean).join("\n\n");
  }

  const guidance = [];
  if (args.referenceImages.length) {
    guidance.push("Use the provided reference image(s) only for the visual traits requested by the user; preserve identity, shape, pose, materials, or brand details when implied.");
  }
  if (["light", "standard", "strong"].includes(args.optimizeLevel)) {
    guidance.push("Create a polished image with clear subject hierarchy, coherent composition, refined lighting, and professional finish.");
  }
  if (["standard", "strong"].includes(args.optimizeLevel)) {
    guidance.push("Add concrete visual detail for composition, mood, materials, environment, color palette, and camera or render style while preserving the user's intent.");
  }
  if (args.optimizeLevel === "strong") {
    guidance.push("Make the image production-ready: specify foreground, midground, background, focal point, texture quality, lighting direction, and final-use readability.");
  }
  guidance.push(
    args.negative
      ? `Avoid ${args.negative}.`
      : "Avoid watermark, signature, low-resolution artifacts, distorted anatomy, and unreadable text unless explicitly requested."
  );
  return parts.concat(guidance).filter(Boolean).join("\n\n");
}

function buildPayload(args) {
  const payload = {
    model: args.model,
    prompt: optimizePrompt(args),
    size: args.size,
    quality: args.quality,
    output_format: args.outputFormat,
    n: 1,
  };
  if (args.extraJson) Object.assign(payload, JSON.parse(args.extraJson));
  return payload;
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function defaultOutputPath(args) {
  const ext = (args.outputFormat || "png").replace("jpeg", "jpg");
  return path.join(args.outputDir, `generated-image-${timestamp()}.${ext}`);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

async function requestJson(url, options, timeoutSeconds) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutSeconds * 1000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status} ${response.statusText}\n${text}`);
      error.status = response.status;
      throw error;
    }
    return JSON.parse(text);
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutSeconds} seconds`);
    }
    if (String(error.message || error).includes("fetch failed")) {
      throw new Error(`fetch failed. Check network access to ${url} and verify IMG_BASE_URL is reachable.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function authHeaders(args, contentType = "application/json") {
  const headers = {
    Authorization: `Bearer ${args.apiKey}`,
    Accept: "application/json",
    "User-Agent": DEFAULT_USER_AGENT,
  };
  if (contentType) headers["Content-Type"] = contentType;
  return headers;
}

async function listModels(args) {
  const data = await requestJson(`${args.baseUrl}/v1/models`, {
    method: "GET",
    headers: authHeaders(args, null),
  }, args.timeout);
  for (const model of data.data || []) {
    if (model?.id) console.log(`${model.id}${model.display_name ? ` - ${model.display_name}` : ""}`);
  }
}

function checkConfig(args, allowedModels) {
  const errors = [];
  if (!args.baseUrl) errors.push("IMG_BASE_URL or --base-url is required.");
  if (!args.apiKey) errors.push("IMG_API_KEY, OPENAI_API_KEY, or --api-key is required.");
  if (!args.model) errors.push("IMG_MODEL or --model is required.");
  console.log("Image Generation Tool configuration check");
  console.log(`runtime=node ${process.version}`);
  console.log(`base_url=${args.baseUrl || "<missing>"}`);
  console.log(`api_key=${args.apiKey ? "set" : "<missing>"}`);
  console.log(`model=${args.model || "<missing>"}`);
  console.log(`api_mode=${args.apiMode}`);
  console.log(`size=${args.size}`);
  console.log(`quality=${args.quality}`);
  console.log(`timeout=${args.timeout}s`);
  if (args.model && !allowedModels.includes(args.model)) {
    console.log("WARNING: Selected model is not in IMG_ALLOWED_MODELS/default allowlist.");
  }
  if (errors.length) {
    console.log("\nMissing required configuration:");
    for (const error of errors) console.log(`- ${error}`);
    console.log("\nCreate a .env file in the working directory, for example:");
    console.log("IMG_BASE_URL=https://api.modeltoken.cc");
    console.log("IMG_API_KEY=sk-your-key");
    console.log("IMG_MODEL=gpt-image-2");
    console.log("IMG_TIMEOUT=150");
    return 2;
  }
  console.log("Configuration looks ready.");
  return 0;
}

async function postGeneration(args, payload) {
  const url = `${args.baseUrl}/v1/images/generations`;
  console.log(`POST ${url}`);
  console.log(`model=${payload.model} size=${payload.size} quality=${payload.quality} output_format=${payload.output_format}`);
  console.log(`prompt=${payload.prompt}`);
  return requestJson(url, {
    method: "POST",
    headers: authHeaders(args),
    body: JSON.stringify(payload),
  }, args.timeout);
}

async function postEdit(args, payload) {
  const url = `${args.baseUrl}/v1/images/edits`;
  const form = new FormData();
  form.append("model", String(payload.model));
  form.append("prompt", String(payload.prompt));
  form.append("size", String(payload.size));
  form.append("quality", String(payload.quality));
  form.append("output_format", String(payload.output_format || "png"));
  form.append("n", String(payload.n || 1));

  for (const imagePath of args.referenceImages) {
    const resolved = path.resolve(imagePath);
    if (!fs.existsSync(resolved)) throw new Error(`Reference image not found: ${resolved}`);
    const blob = new Blob([fs.readFileSync(resolved)], { type: getMimeType(resolved) });
    form.append("image[]", blob, path.basename(resolved));
  }

  console.log(`POST ${url}`);
  console.log(`model=${payload.model} size=${payload.size} quality=${payload.quality} output_format=${payload.output_format}`);
  console.log(`prompt=${payload.prompt}`);
  console.log(`edit_images=${args.referenceImages.length} field=image[]`);
  return requestJson(url, {
    method: "POST",
    headers: authHeaders(args, null),
    body: form,
  }, args.timeout);
}

async function downloadUrl(url, outputPath, timeoutSeconds) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutSeconds * 1000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Failed to download image URL: HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    ensureDir(path.dirname(outputPath));
    fs.writeFileSync(outputPath, buffer);
  } finally {
    clearTimeout(timer);
  }
}

async function saveImageResult(response, outputPath, timeoutSeconds) {
  const first = response?.data?.[0];
  if (!first || typeof first !== "object") {
    throw new Error(`No image data returned.\n${JSON.stringify(response, null, 2)}`);
  }
  ensureDir(path.dirname(outputPath));
  if (first.b64_json) {
    fs.writeFileSync(outputPath, Buffer.from(first.b64_json, "base64"));
    return { kind: "file", outputPath, revisedPrompt: first.revised_prompt || null };
  }
  if (first.url) {
    await downloadUrl(first.url, outputPath, timeoutSeconds);
    return { kind: "file", outputPath, url: first.url, revisedPrompt: first.revised_prompt || null };
  }
  throw new Error(`Response did not include b64_json or url.\n${JSON.stringify(response, null, 2)}`);
}

function sidecarPaths(outputPath) {
  const parsed = path.parse(outputPath);
  return {
    promptPath: path.join(parsed.dir, `${parsed.name}.prompt.txt`),
    metaPath: path.join(parsed.dir, `${parsed.name}.meta.json`),
  };
}

function saveSidecars(outputPath, args, payload, result) {
  const { promptPath, metaPath } = sidecarPaths(outputPath);
  ensureDir(path.dirname(promptPath));
  fs.writeFileSync(promptPath, String(payload.prompt || ""), "utf8");
  const meta = {
    created_at: new Date().toISOString(),
    runtime: `node ${process.version}`,
    base_url: args.baseUrl,
    api_mode: resolveApiMode(args),
    model: payload.model,
    size: payload.size,
    quality: payload.quality,
    output_format: payload.output_format,
    style: args.style,
    optimize_level: args.optimizeLevel,
    timeout_seconds: args.timeout,
    reference_images: args.referenceImages.map((item) => path.resolve(item)),
    output_path: path.resolve(outputPath),
    result_kind: result?.kind || null,
    result_url: result?.url || null,
    revised_prompt: result?.revisedPrompt || null,
    payload,
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf8");
  console.log(`Saved prompt: ${path.resolve(promptPath)}`);
  console.log(`Saved metadata: ${path.resolve(metaPath)}`);
}

async function main() {
  const envFile = loadDotenv();
  const allowedModels = splitCsv(envValue(envFile, "IMG_ALLOWED_MODELS")).length
    ? splitCsv(envValue(envFile, "IMG_ALLOWED_MODELS"))
    : DEFAULT_ALLOWED_MODELS;
  const args = parseArgs(process.argv.slice(2), envFile);
  validateArgs(args, allowedModels);

  if (args.usageHelp) {
    console.log(HELP_TEXT);
    return 0;
  }
  if (args.checkConfig) return checkConfig(args, allowedModels);
  if (args.listModels) {
    if (!args.apiKey) throw new Error("Missing API key. Set IMG_API_KEY in .env or pass --api-key.");
    await listModels(args);
    return 0;
  }
  if (!args.prompt.trim()) throw new Error("Missing prompt. Pass --prompt or use --list-models.");
  if (!args.apiKey && !args.dryRun && !args.draftPrompt) {
    throw new Error("Missing API key. Set IMG_API_KEY in .env or pass --api-key.");
  }

  const payload = buildPayload(args);
  const outputPath = args.outputPath || defaultOutputPath(args);
  if (args.draftPrompt) {
    console.log(payload.prompt);
    return 0;
  }
  if (args.dryRun) {
    console.log(JSON.stringify({ api_mode: resolveApiMode(args), payload }, null, 2));
    if (args.saveMetadata) saveSidecars(outputPath, args, payload, null);
    return 0;
  }

  const response = resolveApiMode(args) === "edits"
    ? await postEdit(args, payload)
    : await postGeneration(args, payload);
  const result = await saveImageResult(response, outputPath, args.timeout);
  if (args.saveMetadata) saveSidecars(result.outputPath, args, payload, result);
  if (result.revisedPrompt) console.log(`revised_prompt=${result.revisedPrompt}`);
  console.log(`\nSaved image: ${path.resolve(result.outputPath)}`);
  return 0;
}

main().then((code) => {
  process.exitCode = code;
}).catch((error) => {
  console.error("\nRequest failed.");
  console.error(error.message || error);
  process.exitCode = 1;
});
