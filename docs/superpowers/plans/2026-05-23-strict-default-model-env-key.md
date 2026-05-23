# Strict Default Model And Env Key Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep `gpt-image-2` and lightweight generation as safe defaults, accept API keys only from `.env`, require prompt confirmation before img2img, and avoid automatic result validation after generation.

**Architecture:** The Node CLI owns enforceable configuration rules: its model defaults internally and only changes via `--model`, while credentials are read solely from the current working directory `.env`. The skill instructions and UI metadata require prompt drafting and user confirmation before generation, followed by direct output presentation without model-led visual correctness checks.

**Tech Stack:** Node.js ESM CLI, built-in `node:test`, Markdown skill documentation, YAML interface metadata.

---

### Task 1: Lock CLI configuration behavior

**Files:**
- Modify: `tests/defaults.test.mjs`
- Modify: `scripts/generate_image.mjs`

- [x] Add tests proving `IMG_MODEL` and shell API key values do not override strict defaults, `.env` supplies the key, and explicit `--model` is still accepted.
- [x] Run `node --test tests/defaults.test.mjs` and confirm the new tests fail against existing behavior.
- [x] Update CLI argument/config parsing so the default model is always `gpt-image-2`, only `--model` changes it, and `IMG_API_KEY` is read only from `.env`.
- [x] Run the test suite again and confirm it passes.

### Task 2: Align skill behavior and distribution

**Files:**
- Modify: `.env.example`
- Modify: `SKILL.md`
- Modify: `README.md`
- Modify: `agents/openai.yaml`

- [x] Document that any image-generation request triggers this skill, reference-image requests require prompt confirmation before generation, generated results are returned without automatic accuracy validation, defaults are lightweight with `gpt-image-2`, and keys belong only in `.env`.
- [x] Copy updated skill files to the installed skill directory.
- [x] Run CLI syntax/tests and a dry-run/config check to verify the distributed copy follows the new policy.
- [ ] Commit and push the updated repository.
