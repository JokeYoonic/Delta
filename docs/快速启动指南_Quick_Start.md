# AI家教 Delta — 快速启动指南

**日期**：2026-05-14
**状态**：环境就绪后按此文档操作

---

## 前置条件检查清单

- [ ] **Docker Desktop** 已安装并运行（去 https://www.docker.com/products/docker-desktop/ 下载）
- [ ] Node.js ≥ v18（当前 v24.13.0 ✅）
- [ ] Python ≥ 3.11（当前 3.11.9 ✅）
- [ ] **DeepSeek API Key** 已获取（去 https://platform.deepseek.com 注册，新用户送额度）

---

## 第一步：配置环境变量

```bash
cd note2026/ai家教/Delta

# 从模板创建 .env
cp backend/.env.example backend/.env
```

然后用编辑器打开 `backend/.env`，**至少修改这一行**：

```
LLM_API_KEY=sk-你的DeepSeek密钥
```

其余配置保持默认即可。完整配置项说明见文末。

---

## 第二步：启动 Docker 基础设施（需要 2-5 分钟）

```bash
# 在 Delta 目录下执行（默认只启动核心基础设施）
docker compose up -d
```

默认启动核心基础设施：
- PostgreSQL 16（数据库）
- Redis 7（缓存）
- bifrost（LLM 统一网关）
- Logto（认证服务）

RAG 引擎使用 **ChromaDB**（轻量级本地向量数据库，随 pip 安装，无需 Docker）。

语音服务默认使用 **Edge-TTS**（纯 Python，无需 Docker）和 **本地 FunASR**（pip install funasr）。

如需启动可选服务：
```bash
# 启动应用服务（backend + frontend 容器）
docker compose --profile app up -d

# 启动语音服务（Docker 版 FunASR/Kokoro/faster-whisper，镜像可用时）
docker compose --profile voice up -d
```

**等待所有容器就绪**：
```bash
docker compose ps
# 确认所有服务 STATUS 都是 Up / healthy
```

---

## 第三步：安装依赖并启动后端

```bash
cd backend

# 安装 Python 依赖
pip install -e ".[dev]"

# 启动后端开发服务器
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

后端启动后访问：
- API 文档：http://localhost:8000/docs
- 健康检查：http://localhost:8000/health

---

## 第四步：安装依赖并启动前端

```bash
# 新开一个终端
cd note2026/ai家教/Delta/app

npm install
npm run dev
```

前端启动后访问：http://localhost:5173

---

## 关键地址速查

| 服务 | 地址 |
|------|------|
| 前端页面 | http://localhost:5173 |
| 后端 API | http://localhost:8000 |
| API 文档 (Swagger) | http://localhost:8000/docs |
| bifrost 网关 | http://localhost:8080 |
| Logto 管理后台 | http://localhost:3302 |

---

## 如果没有 Docker（最小模式）

修改 `backend/.env`：

```
BIFROST_ENABLED=false
LOGTO_ENABLED=false
```

然后跳过第二步，直接执行第三步和第四步。这样能体验最基础的 AI 文字对话功能（通过 DeepSeek API），但没有 RAG 教材检索、语音、认证等功能。

---

## 推送到自己的 GitHub

```bash
cd note2026/ai家教/Delta

# 先确认当前 remote（应该是 JokeYoonic/Delta）
git remote -v

# 在 GitHub 网页上先创建一个空仓库（不要勾选 README / .gitignore / LICENSE）
# 然后改 remote 指向你自己的仓库：
git remote set-url origin https://github.com/你的用户名/你的仓库名.git

# 推送
git push -u origin main
```

---

## .env 关键配置项速查

| 变量 | 说明 | 必填？ |
|------|------|:---:|
| `LLM_API_KEY` | DeepSeek API 密钥 | **必填** |
| `LLM_MODEL` | 模型名 | 默认 deepseek-chat |
| `BIFROST_ENABLED` | 启用 LLM 网关 | 默认 true |
| `LOGTO_ENABLED` | 启用认证服务 | 默认 true |
| `CHROMA_COLLECTION_NAME` | ChromaDB 集合名 | 默认 delta-textbooks |
| `CHROMA_PERSIST_DIR` | ChromaDB 持久化目录 | 默认 ./data/chroma |
| `NEON_ENABLED` | 启用 Neon 云数据库 | 默认 false |
| `OCR_ENGINE` | OCR 引擎 rapidocr/paddleocr | 默认 rapidocr |
| `ASR_ENGINE` | 语音识别引擎 local_funasr/funasr/faster_whisper | 默认 local_funasr |
| `TTS_ENGINE` | 语音合成引擎 edge_tts/kokoro | 默认 edge_tts |

---

## 文档导航

- `AI家教项目开发者文档_Developer_Documentation.md` — 完整开发者文档（架构/模块/路线图）
- `DeltaAI家教_开源组件驱动开发流程文档_v1.1.md` — 30 个开源项目选型与 5 阶段计划
- `DeltaAI家教_开源组件驱动开发流程文档_v1.2_增量版.md` — 网关/Agent/数据库增量设计
- `DeltaAI家教_质量保障与AI自动化开发增量文档_v1.3.md` — 测试与 AI 辅助开发体系
