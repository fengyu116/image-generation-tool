# Image Generation Tool Skill

这是一个可用于 Codex、OpenClaw 等 AI Agent/自动化工作流的图片生成技能/工具包，通过 OpenAI-compatible 图片接口生成图片。它适合用于提示词优化、风格预设、参考图生图、产品图广告图、科技海报、3D 动画角色、电商主图等场景。

## 功能

- 使用 `.env` 配置接口地址、密钥、轻量默认参数和输出目录
- 默认模型固定为 `gpt-image-2`；用户明确提出时可使用 `nano-banana-2`、`gpt-image-2-vip`、`nano-banana-pro`
- 支持通过 `IMG_ALLOWED_MODELS` 动态配置模型白名单
- 支持提示词优化等级：`none`、`light`、`standard`、`strong`
- 内置风格预设：科技海报、3D 动画、产品图、品牌吉祥物、微信封面、小红书封面、淘宝主图等
- 支持本地参考图路径输入
- 传入参考图时默认使用 `/v1/images/edits` 的 multipart img2img 请求
- 默认保存 `.prompt.txt` 和 `.meta.json`，便于复盘生成参数
- 生图前必须先产出提示词，用户确认后再执行
- 生图完成后直接返回文件，不自动校验画面或文字准确性
- 使用前静默检查关键配置，仅在缺少密钥或无法执行时提醒配置

## 安装

### Codex

把整个目录复制到 Codex skills 目录：

```powershell
Copy-Item -Recurse . "$env:USERPROFILE\.codex\skills\image-generation-tool"
```

也可以让 Codex 从这个 GitHub 仓库安装技能。

### OpenClaw / 其它 Agent

把整个仓库作为工具目录加入 OpenClaw 或其它 Agent 的可访问工作区即可。核心入口是：

```text
scripts/generate_image.mjs
```

Agent 只需要能够读取 `SKILL.md`、`references/` 和执行 Node.js 脚本，就可以按同样流程完成配置检查、提示词草稿、参考图生图和结果保存。

## 配置

复制 `.env.example` 为项目目录下的 `.env`，然后填写你的 API key：

```text
IMG_BASE_URL=https://api.modeltoken.cc
IMG_API_KEY=sk-...
IMG_SIZE=auto
IMG_QUALITY=auto
IMG_TIMEOUT=150
IMG_OUTPUT_DIR=dist
IMG_REFERENCE_FIELD=reference_images
IMG_API_MODE=auto
IMG_ALLOWED_MODELS=nano-banana-2,gpt-image-2,gpt-image-2-vip,nano-banana-pro
IMG_OPTIMIZE_LEVEL=light
IMG_SAVE_METADATA=1
```

`IMG_API_KEY` 必须写入当前工作目录下的 `.env`，脚本不会从 shell 环境变量或命令行参数读取密钥。

默认模型固定为 `gpt-image-2`。只有用户明确指定其它模型时，才通过 `--model` 传入 `nano-banana-2`、`gpt-image-2-vip` 或 `nano-banana-pro`。

## 常用命令

查看使用帮助：

```powershell
node scripts/generate_image.mjs --usage-help
```

检查关键配置是否完整：

```powershell
node scripts/generate_image.mjs --check-config
```

列出接口可用模型：

```powershell
node scripts/generate_image.mjs --list-models
```

先根据需求和参考图生成提示词，不调用生图接口：

```powershell
node scripts/generate_image.mjs --draft-prompt --style taobao-product --optimize-level strong --prompt "根据这张产品图，生成一张高级电商主图，面向年轻用户，突出质感和卖点" --reference-image C:/path/product.png
```

确认提示词后生成图片：

```powershell
node scripts/generate_image.mjs --style taobao-product --optimize-level strong --prompt "根据这张产品图，生成一张高级电商主图，面向年轻用户，突出质感和卖点" --reference-image C:/path/product.png
```

传入 `--reference-image` 时，默认会走 `/v1/images/edits`：

```text
POST /v1/images/edits
model=gpt-image-2
image[]=@C:/path/product.png
prompt=...
```

如需测试旧的 JSON 参考图字段，可以加：

```powershell
node scripts/generate_image.mjs --api-mode generations --prompt "..." --reference-image C:/path/product.png
```

生成科技公司宣传海报：

```powershell
node scripts/generate_image.mjs --style poster-tech --prompt "淘心API 科技公司宣传海报，突出智能接口、稳定高效、开箱即用"
```

生成 3D 动画角色：

```powershell
node scripts/generate_image.mjs --style 3d-animation --optimize-level strong --prompt "一个自信的科技公司工程师吉祥物角色"
```

## 推荐工作流

当用户提出生图、生成图片、做图、改图，或上传产品图/参考图时，必须使用该技能并先走提示词确认流程：

1. 询问或确认目标用途，比如电商主图、详情页场景图、社媒封面、宣传海报。
2. 使用 `--draft-prompt` 生成最终提示词。
3. 把提示词展示给用户确认。
4. 用户确认后，再用相同提示词和 `--reference-image` 调用生图。
5. 生成后直接返回结果文件/预览；除非用户明确要求，不让模型再校验 logo、文字或画面是否准确。

这样可以减少无效生成，也方便用户调整画面方向。
