import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.resolve(__dirname, "../scripts/generate_image.mjs");

function runCli(args, env = {}, cwd = process.cwd()) {
  return execFileSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
    cwd,
    env: {
      ...process.env,
      IMG_SIZE: "",
      IMG_QUALITY: "",
      IMG_TIMEOUT: "",
      ...env,
    },
  });
}

test("uses lightweight defaults for dry-run payloads", () => {
  const output = runCli([
    "--dry-run",
    "--no-save-metadata",
    "--prompt",
    "a simple wellness poster",
  ]);
  const result = JSON.parse(output);

  assert.equal(result.payload.size, "auto");
  assert.equal(result.payload.quality, "auto");
  assert.doesNotMatch(result.payload.prompt, /Add concrete visual detail/);
});

test("reports 150 second timeout in configuration defaults", () => {
  const result = spawnSync(process.execPath, [cliPath, "--check-config"], {
    encoding: "utf8",
    env: {
      ...process.env,
      IMG_SIZE: "",
      IMG_QUALITY: "",
      IMG_TIMEOUT: "",
    },
  });
  const output = result.stdout;

  assert.match(output, /size=auto/);
  assert.match(output, /quality=auto/);
  assert.match(output, /timeout=150s/);
});

test("keeps gpt-image-2 unless the user explicitly passes a model", () => {
  const defaultOutput = runCli(
    ["--dry-run", "--no-save-metadata", "--prompt", "test"],
    { IMG_MODEL: "nano-banana-pro" },
  );
  const explicitOutput = runCli([
    "--model",
    "nano-banana-pro",
    "--dry-run",
    "--no-save-metadata",
    "--prompt",
    "test",
  ]);

  assert.equal(JSON.parse(defaultOutput).payload.model, "gpt-image-2");
  assert.equal(JSON.parse(explicitOutput).payload.model, "nano-banana-pro");
});

test("reads API key only from the working directory .env file", () => {
  const withoutFile = spawnSync(process.execPath, [cliPath, "--check-config"], {
    encoding: "utf8",
    cwd: os.tmpdir(),
    env: { ...process.env, IMG_API_KEY: "sk-shell-must-not-be-used" },
  });
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "image-tool-env-"));
  fs.writeFileSync(
    path.join(tempDir, ".env"),
    "IMG_API_KEY=sk-dotenv-accepted\nIMG_MODEL=nano-banana-pro\n",
    "utf8",
  );
  const withFile = spawnSync(process.execPath, [cliPath, "--check-config"], {
    encoding: "utf8",
    cwd: tempDir,
    env: { ...process.env, IMG_API_KEY: "sk-shell-must-not-be-used" },
  });

  assert.equal(withoutFile.status, 2);
  assert.match(withoutFile.stdout, /api_key=<missing>/);
  assert.equal(withFile.status, 0);
  assert.match(withFile.stdout, /api_key=set/);
  assert.match(withFile.stdout, /model=gpt-image-2/);
});

test("does not accept an API key on the command line", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "--api-key", "sk-cli-must-not-be-used", "--check-config"],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown argument: --api-key/);
});
