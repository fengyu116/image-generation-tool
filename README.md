# Image Generation Tool Skill

这是一个可用于 Codex、OpenClaw 等 AI Agent/自动化工作流的图片生成技能/工具包，通过 OpenAI-compatible 图片接口生成图片。它适合用于提示词优化、风格预设、参考图生图、产品图广告图、科技海报、3D 动画角色、电商主图等场景。

## 功能

- 使用 `.env` 配置接口地址、密钥、模型和输出目录
- 支持模型：`nano-banana-2`、`gpt-image-2`、`gpt-image-2-vip`、`nano-banana-pro`
- 支持通过 `IMG_ALLOWED_MODELS` 动态配置模型白名单
- 支持提示词优化等级：`none`、`light`、`standard`、`strong`
- 内置风格预设：科技海报、3D 动画、产品图、品牌吉祥物、微信封面、小红书封面、淘宝主图等
- 支持本地参考图路径输入
- 传入参考图时默认使用 `/v1/images/edits` 的 multipart img2img 请求
- 默认保存 `.prompt.txt` 和 `.meta.json`，便于复盘生成参数
- 支持先产出提示词，用户确认后再生图
- 支持使用前检查关键配置，缺少密钥时会提醒配置

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
IMG_MODEL=gpt-image-2
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

也可以使用环境变量 `OPENAI_API_KEY` 作为 `IMG_API_KEY` 的备用值。

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
node scripts/generate_image.mjs --model gpt-image-2 --style taobao-product --optimize-level strong --prompt "根据这张产品图，生成一张高级电商主图，面向年轻用户，突出质感和卖点" --reference-image C:/path/product.png
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
node scripts/generate_image.mjs --model gpt-image-2 --style poster-tech --prompt "淘心API 科技公司宣传海报，突出智能接口、稳定高效、开箱即用"
```

生成 3D 动画角色：

```powershell
node scripts/generate_image.mjs --model gpt-image-2 --style 3d-animation --optimize-level strong --prompt "一个自信的科技公司工程师吉祥物角色"
```

## 推荐工作流

当用户上传产品图或参考图时，建议先走提示词确认流程：

1. 询问或确认目标用途，比如电商主图、详情页场景图、社媒封面、宣传海报。
2. 使用 `--draft-prompt` 生成最终提示词。
3. 把提示词展示给用户确认。
4. 用户确认后，再用相同提示词和 `--reference-image` 调用生图。

这样可以减少无效生成，也方便用户调整画面方向。
