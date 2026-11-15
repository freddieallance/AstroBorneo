# AstroBorneo — Google AI Studio 导入指南

## 为什么原来的 Replit ZIP 会出现无法识别？

原始 ZIP 采用 pnpm Workspace 结构；主应用在 `artifacts/lunalab/`，API 在 `artifacts/api-server/`，并依赖 Replit 的专用配置与环境变量。Google AI Studio 从 GitHub 导入时，看到的根目录不是标准的 React 应用入口。这是迁移障碍的一种合理解释，并非证明 Google AI Studio 一定无法处理 Monorepo。

## Leader 的正确操作

1. **不要将 ZIP 当作 Prompt 的附件**，也不要只在 GitHub 存储一个 ZIP 文件。
2. 下载本次的 `AstroBorneo_Google_AI_Studio_Ready.zip`，解压。
3. 新建一个 GitHub 仓库（建议 Private），把**解压后文件夹里面的全部文件和文件夹**放在 GitHub 仓库根目录。确认 `package.json` 和 `index.html` 就在根目录。
4. 在 Google AI Studio 打开 **Build Mode** → **Add files (+)** → **Import from GitHub**，授权并选择该 GitHub 仓库。
5. 导入后，先阅读 `README.md` 与 `AI_STUDIO_HANDOFF.md`，把 Handoff 里面的英文指令粘贴到 AI Studio。
6. 按顺序先检查 `npm install`、`npm run dev`、`npm run typecheck`、`npm run test:game`、`npm run test:nasa`、`npm run build`，并检查实际页面与 API；如果 AI Studio 的环境不允许执行所有命令，就要求 AI 明确报告无法执行的项目。
7. 检查 `/api/healthz` 和 NASA 模拟模式；在使用实际 NASA API 前，应检查服务器 Secrets 配置。
8. **确认 Phase 1 运行稳定后**才运行 Visual-First Moon Base 改造 Prompts，不要在迁移过程中同时要求 AI 全部重写。

## 重要说明

- 这是 **完整 Phase 1 游戏代码的迁移版本**，不是已经实现 Mentor 最新 Visual-First 画面设计的最终版本。
- 游戏资源规则、五个 Cycle、测验、评分和存档沿用原始代码。
- Replit 以前通过 API 的 Secrets / 环境变量不会自动转移。不要把 API Key 粘贴到聊天或 GitHub；在 AI Studio 的服务器端 Secrets 重新设置。
- 没有导入 Scenario AI 新图，因为上传的原 ZIP 中没有这些新素材。
- 浏览器 localStorage 不会跨不同域名直接复制旧进度。
- 此地无法联网安装 npm 依赖，因此没有进行完整 `npm install`、`npm run build` 或 Google AI Studio 实机预览测试。这些必须由 Leader 在平台上运行。
