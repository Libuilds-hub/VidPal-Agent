# video-study-agent

> 把看过的视频，变成你自己的知识结构。

AI 驱动的视频学习平台。它做的不是「帮你找到更多视频」，而是把散落在 B站 / YouTube 的视频**下载 → 转写 → 摘要 → 关联**，沉淀成可检索、可视化的个人知识资产。

搜索 → 导入 → 转写 → 摘要 → 思维导图 → 跨视频检索 → 知识图谱

---

## 功能

| 模块 | 说明 |
|---|---|
| **视频导入** | 粘贴 B站 / YouTube 链接解析导入；也支持本地上传。下载走 `yt-dlp`，转码走 `ffmpeg` |
| **语音转写** | 抽取音轨后经 `faster-whisper` 转写，OpenCC 自动繁体转简体，产出带时间轴的文稿 |
| **AI 摘要 / 思维导图** | 调用你配置的 LLM 生成结构化摘要与 Mermaid 思维导图 |
| **跨视频检索** | Agent 工具 `search_transcripts` 可在全部转写文稿里检索，回答「这几个视频对 X 的解释有什么不同」 |
| **AI 对话助手** | ReAct 风格 Agent（LangChain + LangGraph），SSE 流式输出，支持思考过程展示、历史会话、消息编辑与分支 |
| **Agent 工具调用** | 10 个内置工具（见下文），含文件读写、终端命令、网页抓取与搜索 |
| **任务队列** | 导入/转写等长任务异步执行，支持取消、重试、SSE 事件订阅、进程崩溃后自动恢复 |
| **技能系统** | `skills/*/SKILL.md` 形式的可插拔技能，支持从目录扫描、在线安装、ZIP 上传 |
| **知识图谱** | 基于视频与转写内容的关系图谱可视化（React Flow / Force Graph） |
| **多 LLM 供应商** | 支持 MiniMax / DeepSeek / OpenRouter / OpenAI / Kimi / 智谱 / Qwen / Ollama 等任意 OpenAI 兼容端点；可设默认供应商、开启思考模式、连通性测试、云端模型列表同步 |
| **设置中心** | Cookie 配置、AI & Agent、模型管理、存储、偏好、技能、集成等 |

---

## 架构

两个独立进程，共享一个 SQLite 数据库：

```
┌──────────────────────────────┐        ┌────────────────────────────────────┐
│  Web (Next.js App Router)    │        │  Runtime (Node + tsx)              │
│  http://127.0.0.1:3000       │  HTTP  │  http://127.0.0.1:3100             │
│                              │ ─────► │                                    │
│  · 页面 UI                   │        │  · Agent 编排 (LangChain/LangGraph)│
│  · /api/* 路由               │        │  · 任务队列 + worker + 崩溃恢复     │
│  · Prisma 读写业务数据       │        │  · 10 个工具的执行                  │
└───────────┬──────────────────┘        │  · SSE 事件流                      │
            │                            └───────────┬────────────────────────┘
            │  Prisma (better-sqlite3)               │  better-sqlite3
            ▼                                        ▼
   prisma/dev.db                            data/agent.db
   Video / Setting / LlmProvider            session / task / task_event / skill_usage
```

- **Web 进程**负责界面与 `/api/*`，用 Prisma 读写 `dev.db`
- **Runtime 进程**负责 Agent、任务队列与工具执行，用 better-sqlite3 读写 `data/agent.db`；需要写业务数据时也直接走 Prisma
- 前端通过 `NEXT_PUBLIC_RUNTIME_URL` 直连 Runtime 的 HTTP API（含 SSE）

---

## 技术栈

- **框架**：Next.js 16.2.6（App Router / Turbopack）、React 19、TypeScript 5
- **样式与组件**：Tailwind CSS 4、Radix UI / shadcn、Ant Design X、lucide-react
- **数据**：Prisma 5 + SQLite（`@prisma/adapter-better-sqlite3`）、better-sqlite3
- **Agent**：LangChain、LangGraph、`@langchain/openai`
- **可视化**：Mermaid、markmap、React Flow、react-force-graph-2d、Excalidraw、video.js / plyr
- **媒体处理**：yt-dlp（下载）、ffmpeg（转码 / 抽音轨）、faster-whisper（转写）、OpenCC（繁简转换）

---

## 环境要求

- **Node.js ≥ 20.9.0**（Next.js 16 的要求）
- **Python 3.10+**，并安装转写依赖：

  ```bash
  pip install faster-whisper opencc
  ```

- **ffmpeg** 与 **yt-dlp** 需要在 `PATH` 中可执行
  - 若 ffmpeg 不在 `PATH`，用 `FFMPEG_PATH` 环境变量指定绝对路径
- 至少一个 **OpenAI 兼容的 LLM API Key**（MiniMax / DeepSeek / OpenRouter / OpenAI / Ollama 等）

> Windows 用户注意：`yt-dlp` / `ffmpeg` 通常随 Python 安装在 `...\Python3x\Scripts\`，确认该目录已加入 `PATH`。

---

## 快速开始

```bash
git clone https://github.com/Libuilds-hub/video-study-agent.git
cd video-study-agent

npm install

# 配置环境变量
cp .env.example .env        # Windows: copy .env.example .env
# 按需修改 .env 中的 DATABASE_URL 等

# 初始化数据库
npx prisma generate
npx prisma db push

# 同时启动 Runtime 与 Web
npm run dev:all
```

打开 <http://localhost:3000>（会自动跳转到 `/dashboard`），然后：

1. **设置 → 模型**：添加 LLM 供应商并填入 API Key，设为默认
2. **设置 → Cookie 配置**（可选）：填入已登录 bilibili.com 的浏览器 Cookie（需含 `SESSDATA`），可解决 B站 HTTP 412 风控拦截、获取更高清晰度
3. 回到首页粘贴视频链接，或在上传页选择本地文件

---

## 环境变量

完整说明见 [`.env.example`](.env.example)。

| 变量 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | Prisma 使用的 SQLite 路径。**该文件含明文密钥与 Cookie，务必排除在版本控制之外** |
| `RUNTIME_PORT` | | `3100` | Runtime 监听端口 |
| `RUNTIME_HOST` | | `127.0.0.1` | Runtime 监听地址。**Runtime 无鉴权，且 Agent 可执行终端命令，不要随意暴露** |
| `RUNTIME_WEB_ORIGIN` | | `http://localhost:3000` | 允许跨域访问 Runtime 的 Web 控制台地址（CORS 白名单） |
| `AGENT_DB_PATH` | | `data/agent.db` | Runtime 的任务/会话数据库 |
| `RUNTIME_WORKSPACE` | | 当前工作目录 | Agent 文件工具的沙箱根目录 |
| `NEXT_PUBLIC_RUNTIME_URL` | | `http://localhost:3100` | 浏览器访问 Runtime 的地址 |
| `FFMPEG_PATH` | | `ffmpeg` | ffmpeg 可执行文件路径，默认走 `PATH` |

---

## npm 脚本

| 脚本 | 作用 |
|---|---|
| `npm run dev:all` | 同时启动 Runtime 与 Web（推荐） |
| `npm run dev:web` | 仅启动 Next.js Web（`127.0.0.1:3000`） |
| `npm run dev:runtime` | 仅启动 Agent Runtime（`127.0.0.1:3100`，`tsx watch`） |
| `npm run test:runtime` | 运行 Runtime 测试套件（Node 内置 test runner） |
| `npm run build` | 生产构建 |
| `npm run start` | 启动生产服务（`127.0.0.1:3000`） |

---

## 目录结构

```
app/
  (main)/            主界面：dashboard、videos、collections、knowledge-graph、
                     ai-assistant、agent（任务 / 技能）
  (settings)/        设置中心：llm、ai、cookies、skills、storage、preferences …
  api/               Route Handlers：video、llm-providers、settings、chat、openrouter
components/          UI 组件（chat、video-detail、llm、knowledge-graph、ui …）
lib/                 Prisma 客户端、Runtime HTTP 客户端、LLM 序列化与脱敏
hooks/               通用 hooks
prisma/
  schema.prisma      Video / Setting / LlmProvider
runtime/             Agent Runtime 进程
  index.ts           入口：恢复 → worker → HTTP 服务 → 优雅退出
  server.ts          路由、CORS、SSE
  llm.ts             供应商读取与模型构建
  agent/             Agent 构建、缓存、LangChain 适配、视频相关工具
  tools/             fs / shell / http / web-search 工具
  tasks/             任务队列与 handler
  video/             yt-dlp 下载、ffmpeg 转码、whisper 转写、摘要
  skills/            技能注册表与安装
  tests/             Runtime 测试
scripts/
  transcribe.py      转写脚本（首次使用时自动生成）
skills/              可插拔技能（每个技能一个 SKILL.md）
data/                Runtime 本地数据库（不入库）
public/videos/       下载与转码产物（不入库）
```

---

## Runtime HTTP API

Runtime 是一个轻量 `node:http` 服务，默认只监听 `127.0.0.1:3100`：

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/tasks` | 创建任务（入队） |
| `GET` | `/tasks` | 列出任务，可按 `sessionId` / `type` 过滤 |
| `GET` | `/tasks/:id` | 查询单个任务 |
| `POST` | `/tasks/:id/cancel` | 取消任务 |
| `POST` | `/tasks/:id/retry` | 重试任务 |
| `GET` | `/tasks/:id/events` | 订阅任务事件（SSE） |
| `POST` | `/sessions` | 创建会话 |
| `GET` | `/sessions` | 列出会话 |
| `POST` | `/chat` | Agent 对话（SSE 流式） |
| `POST` | `/llm/cache/clear` | 清除 Agent 缓存（供应商配置变更后调用） |
| `GET` | `/skills` | 列出已安装技能 |
| `GET` | `/skills/catalog` | 技能目录 |
| `POST` | `/skills/install` | 安装技能 |
| `POST` | `/skills/upload` | 上传技能 ZIP |
| `DELETE` | `/skills/:name` | 卸载技能 |
| `GET` | `/tools` | 工具索引（名称 / 描述 / 是否危险） |

---

## Agent 内置工具

| 工具 | 危险 | 说明 |
|---|---|---|
| `run_command` | ⚠️ | 在 workspace 内执行终端命令 |
| `read_file` | | 读取工作区文本文件 |
| `write_file` | ⚠️ | 写入工作区文件（覆盖） |
| `list_dir` | | 列出工作区目录条目 |
| `http_get` | | HTTP GET（拒绝内网/回环地址，内容超 200KB 截断） |
| `web_search` | | DuckDuckGo 网页搜索 |
| `search_videos` | | 在已导入的视频中检索 |
| `search_transcripts` | | 跨视频转写文稿检索 |
| `get_video_context` | | 获取单个视频的完整上下文 |
| `import_video` | | 导入视频（入队下载 + 转写） |

文件类工具通过 `realpath` + 前缀校验限制在 workspace 内，无法逃逸。

---

## 安全说明

这个项目在本地保存明文凭证，请留意：

1. **数据库中有明文密钥。** `prisma/dev.db` 的 `LlmProvider.apiKey` 与 `Setting.bilibiliCookie` 均为明文。`.gitignore` 已排除 `prisma/*.db*`，**不要提交、不要放进同步盘**。
2. **Runtime 没有鉴权。** 它能执行终端命令、读写文件。因此默认只监听 `127.0.0.1`，CORS 也仅放行 `RUNTIME_WEB_ORIGIN`。**对外暴露前请自行加认证**，不要直接绑 `0.0.0.0`。
3. **接口对密钥脱敏。** `GET /api/llm-providers`、`GET /api/settings` 返回的是掩码值与「是否已配置」标记，不回传明文，也不会把明文渲染进页面。
4. **Cookie 落盘。** 为调用 `yt-dlp`，Cookie 会被写成 `cookies.txt`（Netscape 格式）。该文件已排除在版本控制外；在设置中清空 Cookie 时会自动删除。
5. **B站 Cookie 等同账号登录态。** 泄露后应立即退出登录（B站会在服务端注销该 `SESSDATA`）或修改密码。

---

## 已知限制

- 转写走 Python `faster-whisper`，首次运行需要下载模型；CPU 推理较慢，长视频耗时明显
- 转写阶段不支持子进程级取消：取消请求在阶段边界生效，正在运行的 Python 进程会跑完当前任务
- B站下载依赖登录 Cookie，缺失时会被风控拦截（HTTP 412）
- 使用 SQLite 单文件存储，未做多用户隔离——设计定位是**单机自用**

---

## License

[Apache-2.0](LICENSE)
