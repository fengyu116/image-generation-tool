import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.resolve(__dirname, "../scripts/generate_image.mjs");

function runCli(args) {
  return execFileSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      IMG_SIZE: "",
      IMG_QUALITY: "",
      IMG_TIMEOUT: "",
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
