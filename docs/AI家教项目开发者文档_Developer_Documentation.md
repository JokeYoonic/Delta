# AI家教项目开发者文档 (Developer Documentation)

**版本**：v0.2.0
**日期**：2026-05-14
**状态**：MVP 阶段——基于 Delta v0.2.0 骨架 + 42 个开源组件深度分析
**目标读者**：全栈开发工程师、AI 算法工程师、后端/前端开发、测试/运维工程师

---

## 目录

1. [项目概述 (Project Overview)](#1-项目概述)
2. [系统架构 (System Architecture)](#2-系统架构)
3. [参考资源整合方案 (Resource Integration)](#3-参考资源整合方案)
4. [技术栈与依赖 (Tech Stack & Dependencies)](#4-技术栈与依赖)
5. [核心模块设计 (Core Modules Design)](#5-核心模块设计)
6. [开发路线图 (Development Roadmap)](#6-开发路线图)
7. [附录](#7-附录)

---

## 1. 项目概述

### 1.1 项目定位

**AI家教（Delta AI Tutor）**是一款面向中国内地 K12（小学至高中）学生群体的 AI 智能学习助手。产品以"苏格拉底式引导教学"为核心理念——不直接给答案，通过追问引导学生独立思考。

### 1.2 核心目标

| 维度 | 目标 |
|------|------|
| **教学覆盖** | 覆盖全9大学科（语/数/外/物/化/生/史/地/政），首发人教版初中主科 |
| **交互模态** | 文字答疑 + 拍照搜题 + AI 课堂 + 在线考试 + 实时语音口语对话 |
| **用户角色** | 学生端（学/练/测/口语） + 家长监管端（学习报告/时长管理/错题查看） |
| **多端支持** | Web 端（Next.js + React 19）+ iOS/Android PWA + PC 桌面（Electron） |
| **商业模型** | 免费版（每日限次）+ 会员版（¥29.9/月无限次）+ 家庭版（¥498/年 × 3学生） |
| **技术目标** | 文字答疑 <1s 响应，语音对话 <1.5s 延迟，支持百万级并发 |

### 1.3 Delta 基础概览

Delta 是项目的骨架仓库（fork 自 `JokeYoonic/Delta`），当前版本 **v0.2.0**，已实现：

- **后端**：FastAPI + SQLAlchemy 异步 + LangChain/LangGraph 编排
- **前端**：Vite + React 19 + React Router 7 + Radix UI + Tailwind CSS 3 + Zustand
- **认证**：Logto OAuth/OIDC（支持手机验证码 + Google OAuth）
- **LLM 网关**：bifrost 统一路由（DeepSeek 主 / Qwen 备 / GLM 备 / OpenAI 备）
- **RAG 引擎**：RAGFlow Docker 部署（内置 docling 文档解析）
- **语音管道**：Pipecat 编排，FunASR (ASR) + Kokoro (TTS) 自研引擎，faster-whisper + edge-tts 降级
- **OCR**：RapidOCR（轻量 ONNX）主引擎 + PaddleOCR-VL 高精度备选
- **Skills 插件系统**：ZhixuebanSkill 抽象基类 + 自动注册机制
- **Agent 多角色**：严厉老师 / 温柔学姐 / 同龄学伴 / 外教 + 主控 Agent 调度
- **测试体系**：Playwright E2E + DeepEval LLM 质量 + Promptfoo Red-team + RAGAS RAG 评估 + k6 性能压测
- **基础设施**：Docker Compose 一键启动完整服务栈（PostgreSQL + Redis + bifrost + RAGFlow + FunASR + Kokoro + faster-whisper）

### 1.4 设计文档体系

本项目基于以下 3 份设计文档进行开发（均位于仓库根目录）：

| 文档 | 内容 | 涉及开源项目数 |
|------|------|:---:|
| `DeltaAI家教_开源组件驱动开发流程文档_v1.1.md` | 核心教学引擎、RAG 引擎、语音交互、基础设施、计费系统选型与 5 阶段路线图 | 30 |
| `DeltaAI家教_开源组件驱动开发流程文档_v1.2_增量版.md` | bifrost LLM 网关、QwenPaw Skills 插件化 + 多 Agent 协作 + 安全体系、Neon Serverless Postgres、agnai 多租户参考 | +6 |
| `DeltaAI家教_质量保障与AI自动化开发增量文档_v1.3.md` | Promptfoo Red-teaming、DeepEval LLM 质量门禁、RAGAS RAG 评估、Playwright E2E、k6 性能压测、Aider/Continue.dev AI 辅助开发 | +6 |

---

## 2. 系统架构

### 2.1 当前架构总图（v0.2.0）

```
┌─────────────────────────────────────────────────────────────────┐
│                    客户端层（多端）                                │
│  ├─ Web (Vite + React 19 + React Router 7 + Tailwind 3)          │
│  ├─ iOS/Android (PWA — vite-plugin-pwa)                          │
│  └─ PC (Electron — 后续集成 Umi-OCR)                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    接入网关层                                      │
│  └─ Logto (OAuth/OIDC 认证服务，端口 3301/3302)                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                  业务服务层（FastAPI :8000）                        │
│  ├─ api/      — 20 个 API 路由模块                                │
│  ├─ services/ — 14 个业务服务                                     │
│  ├─ skills/   — 7 个 Skill 插件（qa/classroom/exam/oral/parent/   │
│  │              textbook/study_report）                           │
│  ├─ models/   — SQLAlchemy ORM 模型（user/models/memory）         │
│  ├─ schemas/  — Pydantic 请求/响应模型                            │
│  └─ core/     — 配置(config) / 数据库(database) / 安全(security)  │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    AI 能力层（开源组件集群）                        │
│  ├─ bifrost (:8080)         — LLM 统一网关（故障转移/缓存/预算）   │
│  ├─ RAGFlow (:9380, :80)   — RAG 检索引擎（内置 docling 解析）    │
│  ├─ FunASR (:10095)        — 中文语音识别 (ASR)                   │
│  ├─ Kokoro (:8880)         — 轻量 TTS 语音合成                    │
│  ├─ faster-whisper (:10300) — 英文/降级 ASR                       │
│  └─ RapidOCR (ONNX 微服务)  — 拍照搜题 OCR                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    数据存储层                                      │
│  ├─ PostgreSQL 16 (:5432) — 用户/订单/教材/对话记录               │
│  │   └─ pgvector 扩展     — 教材 chunk 向量存储                   │
│  └─ Redis 7 (:6379)       — 缓存/会话/限次计数                    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 后端目录结构

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI 应用入口，lifespan 事件
│   ├── api/                       # API 路由层（20 个模块）
│   │   ├── __init__.py            # APIRouter 聚合注册
│   │   ├── agents.py              # Agent 角色管理与调度
│   │   ├── auth.py                # 认证（Logto OAuth 集成）
│   │   ├── billing.py             # 计费/订阅管理（lago）
│   │   ├── chat.py                # AI 文字答疑（WebSocket 流式）
│   │   ├── classroom.py           # AI 课堂/章节学习
│   │   ├── conversations.py       # 对话历史管理
│   │   ├── exam_engine.py         # 组卷/监考引擎
│   │   ├── exams.py               # 考试提交/批改
│   │   ├── knowledge.py           # 知识库/教材管理
│   │   ├── memory_books.py        # 个人知识笔记本（agnai Memory Books）
│   │   ├── ocr.py                 # OCR 拍照搜题
│   │   ├── parent.py              # 家长监管后台
│   │   ├── rag.py                 # RAGFlow 知识库管理接口
│   │   ├── reports.py             # 学情报告
│   │   ├── skills.py              # Skills 插件管理
│   │   ├── speaking.py            # 口语训练
│   │   ├── tutor.py               # 家教调度
│   │   └── voice.py               # 语音会话管理
│   ├── services/                  # 业务逻辑层（14 个服务）
│   │   ├── agent_dispatcher.py    # Agent 调度器（多角色）
│   │   ├── ai_tutor.py            # AI 教学核心逻辑
│   │   ├── bifrost_gateway.py     # bifrost 网关客户端
│   │   ├── billing_service.py     # 计费服务（lago 集成）
│   │   ├── knowledge_extractor.py # 教材知识抽取
│   │   ├── logto_service.py       # Logto 认证服务封装
│   │   ├── memory_engine.py       # 记忆引擎（学习画像）
│   │   ├── ocr_service.py         # OCR 服务（RapidOCR/PaddleOCR）
│   │   ├── rag_service.py         # RAG 检索服务（RAGFlow API）
│   │   ├── security_service.py    # 安全层（Tool Guard + File Guard）
│   │   ├── sm2_scheduler.py       # SM-2 间隔重复复习调度
│   │   ├── study_tracker.py       # 学习追踪器
│   │   ├── usage_limiter.py       # 免费版使用量限制
│   │   └── voice_service.py       # 语音管道服务（Pipecat 编排）
│   ├── skills/                    # Skills 插件系统
│   │   ├── __init__.py            # auto_load_skills 自动加载
│   │   ├── base.py                # ZhixuebanSkill 抽象基类
│   │   ├── registry.py            # Skill 注册表
│   │   ├── qa_skill.py            # 答疑 Skill
│   │   ├── textbook_skill.py      # 教材 Skill
│   │   ├── classroom_skill.py     # 课堂 Skill
│   │   ├── exam_skill.py          # 考试 Skill
│   │   ├── oral_skill.py          # 口语 Skill
│   │   ├── parent_skill.py        # 家长监管 Skill
│   │   └── study_report_skill.py  # 学情报告 Skill
│   ├── core/
│   │   ├── config.py              # Pydantic Settings 全局配置
│   │   ├── database.py            # SQLAlchemy async engine + session
│   │   └── security.py            # JWT + 安全工具
│   ├── models/                    # ORM 模型
│   │   ├── models.py              # 核心业务模型
│   │   ├── user.py                # 用户模型
│   │   └── memory.py              # 记忆/笔记本模型
│   └── schemas/
│       └── schemas.py             # Pydantic 请求/响应 Schema
├── pyproject.toml                 # Python 项目配置 + 依赖
├── start.sh                       # 生产启动脚本
├── Dockerfile                     # 后端 Docker 镜像
└── .env.example                   # 环境变量模板
```

### 2.3 前端目录结构

```
app/
├── src/
│   ├── App.tsx                    # 根路由（AuthCallback + Home）
│   ├── main.tsx                   # React 挂载入口
│   ├── pages/
│   │   ├── AuthCallback.tsx       # OAuth 回调处理
│   │   └── Home.tsx               # 主页面（含 AppLayout）
│   ├── sections/                  # 业务页面区块
│   │   ├── AppLayout.tsx          # 全局布局（Sidebar + TopBar + 内容区）
│   │   ├── LoginPage.tsx          # 登录/注册页
│   │   ├── Dashboard.tsx          # 学生首页仪表盘
│   │   ├── AIChat.tsx             # AI 答疑聊天界面
│   │   ├── Classroom.tsx          # AI 课堂/章节学习
│   │   ├── ExamCenter.tsx         # 考试中心（组卷/监考/查分）
│   │   ├── KnowledgeMap.tsx       # 知识图谱/教材浏览
│   │   ├── SpeakingLab.tsx        # 口语实验室
│   │   ├── MemoryBooks.tsx        # 个人知识笔记本
│   │   ├── StudyReport.tsx        # 学情报告
│   │   ├── ParentDashboard.tsx    # 家长监管后台
│   │   └── UserProfile.tsx        # 用户设置/角色切换
│   ├── components/
│   │   ├── Sidebar.tsx            # 侧边导航栏
│   │   ├── TopBar.tsx             # 顶部工具栏
│   │   └── ui/                    # 60+ Radix UI 基础组件
│   ├── hooks/
│   │   ├── useStreamingChat.ts    # WebSocket 流式聊天 Hook
│   │   └── use-mobile.ts          # 移动端检测 Hook
│   ├── api/
│   │   ├── client.ts              # HTTP/WS 客户端封装
│   │   └── index.ts               # API 方法导出
│   ├── store/
│   │   └── index.ts               # Zustand 全局状态
│   ├── types/
│   │   └── index.ts               # TypeScript 类型定义
│   └── lib/
│       └── utils.ts               # 工具函数（cn/format 等）
├── package.json                   # 前端依赖（React 19 + Radix UI + Recharts + Zustand）
├── vite.config.ts                 # Vite 7 构建配置（PWA 插件）
├── tailwind.config.js             # Tailwind CSS 3 配置
├── playwright.config.ts           # Playwright E2E 配置
└── tsconfig.json                  # TypeScript 配置
```

### 2.4 关键架构决策（从设计文档到代码实现）

| 决策点 | v0.1（原始 Delta） | v0.2（当前） | 依据 |
|--------|---------------------|-------------|------|
| LLM 调用方式 | 直接调用各 API | **bifrost 统一网关** | 故障转移、语义缓存降本30-50%、预算管理、Guardrails |
| RAG 引擎 | — | **RAGFlow**（内置 docling） | 80.2k Stars，省去独立预处理管道 |
| 全栈底座 | — | **Vite + FastAPI 独立架构** | 轻量化，未采用 vstorm 全量模板，但借鉴其 AI Agent 设计理念 |
| Agent 架构 | — | **Skills 插件化 + 多 Agent 协作** | QwenPaw 参考，功能模块化，新增学科只需开发 Skill |
| 数据库 | SQLite（本地开发） | **PostgreSQL + pgvector** | 生产级 + 向量存储，预留 Neon Serverless 迁移路径 |
| 流式通信 | — | **WebSocket** | 比 SSE 更适合语音实时交互 |
| 认证方案 | — | **Logto OAuth/OIDC** | 开源自托管，手机验证码 + Google OAuth |
| 安全体系 | — | **Tool Guard + File Access Guard** | QwenPaw 三层安全移植（MVP 轻量版） |

---

## 3. 参考资源整合方案

### 3.1 已下载的参考项目

| 项目 | 路径 | 用途 | 整合阶段 |
|------|------|------|:---:|
| **RAGFlow** | `参考项目/ragflow/` | RAG 检索引擎——教材 PDF 解析、chunking、向量检索、Agent 工作流 | MVP（已集成） |
| **lago** | `参考项目/lago/` | 开源计费平台——订阅管理、使用量计量、发票生成 | V2.0 |
| **ai-code-review-helper** | `参考项目/ai-code-review-helper/` | AI 自动化 PR 审查——安全风险检测、代码规范检查 | V1.0 |

### 3.2 设计文档中引用但未下载的参考项目

这些项目中，部分在 `docker-compose.yml` 中已直接以 Docker 镜像形式集成（无需本地克隆源码），部分为设计/架构参考（通过阅读文档/论文获取方法论）。

#### 3.2.1 已通过 Docker 镜像集成的项目（无需本地源码）

| 项目 | Docker 镜像 | 配置位置 | 角色 |
|------|-------------|----------|------|
| **FunASR** | `registry.cn-hangzhou.aliyuncs.com/funasr/funasr:latest` | `docker-compose.yml` → `funasr` 服务 | ASR 引擎 |
| **Kokoro** | `ghcr.io/remsky/kokoro-fastapi:latest` | `docker-compose.yml` → `kokoro` 服务 | TTS 引擎 |
| **faster-whisper** | `fedirz/faster-whisper-server:latest-cpu` | `docker-compose.yml` → `faster-whisper` 服务 | ASR 降级 |
| **bifrost** | `maximhq/bifrost:latest` | `docker-compose.yml` → `bifrost` 服务 | LLM 网关 |
| **Logto** | `svhd/logto:latest` | `docker-compose.yml` → `logto` 服务 | 认证服务 |
| **Elasticsearch** | `elasticsearch:8.11.3` | `docker-compose.yml` → `elasticsearch` 服务 | RAGFlow 依赖 |

#### 3.2.2 设计/架构参考项目（阅读文档即用）

| 项目 | 参考价值 | 参考方式 |
|------|----------|----------|
| **DeepTutor** (~20k Stars) | Agent 架构、Book Engine（13 种块类型）、Quiz Generation | 阅读其 Agent 工具链设计、Book Page 结构，映射到 AI 课堂系统 |
| **Mr.-Ranedeer-AI-Tutor** (~30k Stars) | GPT-4 提示词工程杰作——10 级知识深度、6 种学习风格、5 种沟通方式 | 将其个性化配置转化为 System Prompt 模板，注入 LLM System Prompt |
| **QwenPaw** (~15k Stars) | Skills 插件化架构、多 Agent 协作、三层安全、记忆进化 | 已直接体现在 `skills/base.py` 和 `services/security_service.py` 的设计中 |
| **Open-TutorAI-CE** (~1.5k Stars) | 完整教育 AI 平台、PWA 支持、RBAC 权限 | 参考 PWA 配置策略（`vite-plugin-pwa`）和权限模型 |
| **companion** (171 Stars) | 四模态纠错（写/说/读/听+自动纠错）、本地/云端双模式 | 口语 Skill 设计参考 |
| **fluent** (~3k Stars) | SM-2 间隔重复算法、自适应难度（目标 60-70% 成功率） | 已直接实现在 `services/sm2_scheduler.py` |
| **agnai** | Memory/Lore Books、Group Conversations、多租户订阅 | 已体现在 `api/memory_books.py` 和 `services/memory_engine.py` |
| **coach** (~200 Stars) | 教练仪表盘、360° 数据聚合、性能评分 | 学情报告 UI 参考 |
| **Online-Exam-System** (~100 Stars) | 练习/测验/仿真三种考试模式 | 考试引擎业务逻辑参考 |
| **vstorm full-stack-ai-agent-template** (614 Stars) | FastAPI+Next.js+AI Agent+RAG 全栈模板 | 架构理念参考（Delta 采用更轻量的独立架构） |
| **PaddleOCR** (~40k Stars) | OCR + 文档解析，109 种语言 | 通过 Docker 镜像 `paddleocr/paddleocr:latest` 按需部署 |
| **Umi-OCR** (~30k Stars) | 离线 OCR 软件，PC 端截图识别 | 后续 Electron 端集成（HTTP 接口） |
| **docling** (~3k Stars) | IBM 高级 PDF 理解 | 已内置在 RAGFlow 中，RAGFlow 上传 PDF 自动调用 docling 解析 |
| **Pipecat** (~5k Stars) | 语音对话管道（ASR→LLM→TTS 编排） | 通过 `pipecat-ai` Python 包集成，在 `services/voice_service.py` 中使用 |
| **F5-TTS** (~10k Stars) | 情感语音合成/声音克隆 | V3.0 阶段用于 AI 角色固定音色 |
| **Promptfoo** | LLM Red-teaming 测试框架 | CI/CD 集成，配置在 `tests/promptfooconfig.yaml` |
| **DeepEval** | LLM 质量指标（14+ 指标） | 通过 `deepeval` Python 包集成，测试用例在 `tests/llm/` |
| **RAGAS** | RAG 管道评估 | 月度评估 RAGFlow 检索精度 |
| **k6** | 性能压测 | 脚本在 `tests/perf/k6-load-test.js` |
| **Aider** | AI 结对编程 | 开发工具推荐，非代码依赖 |
| **Continue.dev** | IDE 内 AI 辅助 | 开发工具推荐，非代码依赖 |

---

## 4. 技术栈与依赖

### 4.1 后端技术栈

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **Web 框架** | FastAPI | ≥0.115.0 | REST API + WebSocket |
| **ASGI 服务器** | Uvicorn | ≥0.32.0 | 生产级 ASGI 服务器 |
| **数据验证** | Pydantic + pydantic-settings | ≥2.10.0 / ≥2.7.0 | 请求验证 + 配置管理 |
| **ORM** | SQLAlchemy (async) | ≥2.0.36 | 异步数据库操作 |
| **数据库驱动** | asyncpg / aiosqlite | ≥0.30.0 / ≥0.20.0 | PostgreSQL 异步驱动 / SQLite 开发 |
| **数据库迁移** | Alembic | ≥1.14.0 | Schema 版本管理 |
| **认证** | python-jose / bcrypt | ≥3.3.0 / ≥4.2.0 | JWT Token + 密码哈希 |
| **HTTP 客户端** | httpx | ≥0.28.0 | 异步 HTTP 请求（调用外部 API） |
| **WebSocket** | websockets | ≥14.0 | 实时流式通信 |
| **LLM 调用** | openai (Python SDK) | ≥1.60.0 | OpenAI 兼容 API（通过 bifrost 网关） |
| **AI 编排** | LangChain / LangGraph | ≥0.3.14 / ≥0.2.60 | LLM 工作流编排 |
| **YAML 解析** | PyYAML | ≥6.0.2 | Skills 配置解析 |
| **文件处理** | aiofiles / Pillow | ≥24.1.0 / ≥11.1.0 | 异步文件读写 + 图片处理 |

**可选依赖组** (按功能模块):

| 依赖组 | 包 | 用途 |
|--------|-----|------|
| `[rag]` | ragflow-sdk | RAGFlow API 客户端 |
| `[ocr]` | rapidocr-onnxruntime, paddleocr, paddlepaddle | OCR 拍照搜题 |
| `[voice]` | pipecat-ai, funasr, faster-whisper, kokoro, edge-tts | 语音引擎 |
| `[billing]` | lago-python-client | 计费服务 |
| `[quality]` | deepeval, promptfoo, ragas | LLM 质量测试 |
| `[dev]` | pytest, pytest-asyncio, ruff, mypy | 开发工具 |

### 4.2 前端技术栈

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **构建工具** | Vite | ^7.2.4 | 极速开发服务器 + 生产构建 |
| **UI 框架** | React | ^19.2.0 | 用户界面 |
| **路由** | React Router DOM | ^7.15.0 | 客户端路由 |
| **状态管理** | Zustand | ^5.0.13 | 全局状态（用户/课程/对话） |
| **UI 组件库** | Radix UI | ^1.x (30+ 组件) | 无样式无障碍 UI 原语 |
| **样式** | Tailwind CSS | ^3.4.19 | 实用优先 CSS 框架 |
| **动画** | Framer Motion | ^12.38.0 | 声明式动画 |
| **图表** | Recharts | ^2.15.4 | 学情报告数据可视化 |
| **表单** | React Hook Form + Zod | ^7.70.0 / ^4.3.5 | 高性能表单 + Schema 验证 |
| **图标** | Lucide React | ^0.562.0 | 开源图标库 |
| **日期处理** | date-fns | ^4.1.0 | 轻量日期工具 |
| **PWA** | vite-plugin-pwa | ^1.3.0 | Progressive Web App |
| **代码检查** | ESLint 9 + TypeScript ESLint | ^9.39.1 / ^8.46.4 | 代码规范 |
| **E2E 测试** | Playwright | ^1.60.0 | 跨浏览器端到端测试 |

### 4.3 基础设施

| 组件 | 技术 | 版本 | 端口 |
|------|------|------|:---:|
| **数据库** | PostgreSQL | 16-alpine | 5432 |
| **向量扩展** | pgvector | (PG 内置扩展) | — |
| **缓存** | Redis | 7-alpine | 6379 |
| **LLM 网关** | bifrost | latest | 8080 |
| **认证** | Logto | latest | 3301, 3302 |
| **RAG 引擎** | RAGFlow | latest | 9380, 80 |
| **RAG 依赖** | Elasticsearch | 8.11.3 | 9200 |
| **ASR 引擎** | FunASR | latest | 10095 |
| **TTS 引擎** | Kokoro | latest | 8880 |
| **ASR 降级** | faster-whisper | latest-cpu | 10300 |
| **容器编排** | Docker Compose | v3 | — |

### 4.4 LLM 提供商（通过 bifrost 统一路由）

| 提供商 | 优先级 | 模型 | 用途 |
|--------|:---:|------|------|
| **DeepSeek** | 主 | deepseek-chat / deepseek-reasoner | 日常答疑、考试批改、学情分析 |
| **Qwen (通义千问)** | 备 | qwen-plus / qwen-turbo | DeepSeek 限流时自动切换 |
| **GLM (智谱)** | 备 | glm-4 | 第二备选 |
| **OpenAI** | 备 | gpt-4o | 第三方评测/Judge Model |

---

## 5. 核心模块设计

### 5.1 Skills 插件系统

**设计目标**：功能模块化，新增学科或场景只需开发 Skill，不修改核心代码。

**抽象基类** (`backend/app/skills/base.py`)：

```python
class ZhixuebanSkill(ABC):
    name: str = ""           # Skill 名称
    description: str = ""    # Skill 描述
    triggers: list[str] = [] # 触发关键词
    priority: int = 0        # 优先级（数字越大越优先）

    async def validate(self, context: SkillContext) -> bool:
        # 验证是否满足执行条件（默认检查关键词匹配）
        ...

    @abstractmethod
    async def execute(self, context: SkillContext) -> SkillResult:
        # 执行 Skill 核心逻辑
        ...
```

**当前已实现 Skills** (7 个):

| Skill | 触发词 | 核心能力 | 文件 |
|-------|--------|----------|------|
| **QASkill** | 问答、问题、怎么做、求解 | LLM+RAGFlow 答疑 | `skills/qa_skill.py` |
| **TextbookSkill** | 教材、课本、章节 | RAGFlow 知识库查询 | `skills/textbook_skill.py` |
| **ClassroomSkill** | 课堂、学习、上课 | AI 课堂（Book Engine 参考） | `skills/classroom_skill.py` |
| **ExamSkill** | 考试、测验、练习、组卷 | 三种模式考试+AI 批改 | `skills/exam_skill.py` |
| **OralSkill** | 口语、说话、发音、对话 | Pipecat 语音管道 | `skills/oral_skill.py` |
| **ParentSkill** | 报告、学习情况、时长 | 家长监管数据聚合 | `skills/parent_skill.py` |
| **StudyReportSkill** | 报告、分析、掌握情况 | 学情分析与学习画像 | `skills/study_report_skill.py` |

**Skill 注册与加载** (`backend/app/skills/registry.py`)：
- 启动时 `auto_load_skills()` 自动扫描 `skills/` 目录
- Skill 注册表按 `priority` 降序排列
- 用户消息到达 → 按优先级依次调用 `validate()` → 首个匹配的 Skill 执行 `execute()`

### 5.2 Agent 多角色调度系统

**设计目标**：根据学生状态和场景自动切换教学角色。

**四角色定义** (配置在 `services/agent_dispatcher.py`)：

| 角色 | TTS 音色 | 语速 | 适用场景 | 触发条件 |
|------|----------|:---:|----------|----------|
| **严厉老师** | Kokoro `z` | 1.0x | 考试模式、正式测评 | `考试模式` `严格训练` |
| **温柔学姐** | Kokoro `z` | 0.9x | 基础薄弱、需要鼓励 | `没听懂` `再讲一遍` |
| **同龄学伴** | Kokoro `a` | 1.0x | 日常交流讨论 | `聊聊` `讨论` |
| **外教** | edge-tts `en-GB-RyanNeural` | 1.0x | 英语口语对话 | `英语` `foreign` `外教` |

**调度流程**：学生输入 → 主控 Agent 分析状态 → 匹配角色 → 调度对应 Agent → 执行 Skill。

### 5.3 AI 答疑引擎

**核心流程**：

```
学生提问 → bifrost Guardrails 过滤 → RAGFlow 检索（教材 chunk + 上下文）
         → 构建 System Prompt（身份+深度+风格+安全）
         → LLM 推理（通过 bifrost 路由至 DeepSeek/Qwen）
         → bifrost 语义缓存（相似问题直接返回）
         → WebSocket 流式输出至前端
```

**关键组件**：
- `services/rag_service.py`：封装 RAGFlow API 调用（检索 + Agent 工作流）
- `services/ai_tutor.py`：System Prompt 构建（Mr.-Ranedeer 方法论）
- `services/bifrost_gateway.py`：bifrost 网关客户端（故障转移 + 缓存 + 预算）
- `services/security_service.py`：三层安全（Tool Guard + File Access Guard）

### 5.4 OCR 拍照搜题

**双引擎策略**：

| 引擎 | 适用场景 | 部署方式 | 配置 |
|------|----------|----------|------|
| **RapidOCR**（主） | 印刷体、手写体常规题目 | ONNX Runtime 微服务 | `OCR_ENGINE=rapidocr` |
| **PaddleOCR-VL**（备） | 数学公式、复杂版面、多语言 | Docker 服务 | `OCR_ENGINE=paddleocr` |

**流程**：学生上传图片 → RapidOCR 快速识别 → 置信度<0.6 时自动降级 PaddleOCR-VL → 识别文本送入 RAGFlow 检索相似题 → LLM 生成讲解。

### 5.5 语音对话系统

**双引擎架构** (配置在 `services/voice_service.py`)：

```
日常口语（自研引擎）：FunASR(ASR) → LLM → Kokoro(TTS)
正式测评（降级引擎）：faster-whisper(ASR) → LLM → edge-tts(TTS)
异常切换：自研引擎异常时 <100ms 自动切换至降级
```

**Pipecat 管道编排**：`VAD → ASR → LLM → TTS`，目标端到端延迟 <1.5s，支持打断（VAD 检测到用户说话时暂停 TTS）。

### 5.6 考试与批改系统

**三种考试模式** (参考 Online-Exam-System)：

| 模式 | 特点 | 实现位置 |
|------|------|----------|
| **练习模式** | 即时显示答案解析 | `api/exam_engine.py` |
| **测验模式** | 限时完成，交卷后显示成绩 | `api/exam_engine.py` |
| **仿真模式** | 倒计时、不可回看、随机抽题、切屏检测 | `api/exam_engine.py` |

**AI 批改引擎** (Celery 异步队列预留)：
- 客观题：直接判分
- 计算题：LLM 按步骤给分（MCP 计算器工具验证结果）
- 作文：多维度评分（立意/结构/语言/书写）
- 简答题：关键词匹配 + 语义理解

### 5.7 错题本与 SM-2 复习系统

`services/sm2_scheduler.py` 实现 SM-2 间隔重复算法：
- quality 0-5 分（0=完全不会，5=完全掌握）
- 自动计算复习间隔（1 天～365 天）
- daily Cron 推送当天需要复习的错题

### 5.8 计费系统 (V2.0 上线)

- 免费版：每日答疑 5 次（通过 `services/usage_limiter.py` 计数）
- 会员版：¥29.9/月无限次
- 家庭版：¥498/年 × 3 学生
- 底层：`lago` Docker 自托管（计量事件上报 + 功能权益控制）

### 5.9 三层安全体系

| 层级 | 实现 | 位置 |
|------|------|------|
| **Tool Guard** | 拦截 AI 生成的危险命令（rm -rf, DROP TABLE, 系统命令执行） | `services/security_service.py` |
| **File Access Guard** | 限制 AI 文件访问范围（学生只能访问自己的数据目录） | `services/security_service.py` |
| **bifrost Guardrails** | LLM 网关层内容安全过滤（屏蔽暴力/色情/敏感话题） | `docker-compose.yml` bifrost 配置 |

---

## 6. 开发路线图

### 6.1 阶段一：MVP 核心答疑（第 1-2 月）

**目标**：核心答疑功能 + 人教版主科教材 + Web 端 + 基础拍照搜题

#### 第 1 周：环境搭建与 bifrost 网关部署

- [x] Fork Delta 仓库，克隆到本地
- [ ] 配置 `.env` 文件（DeepSeek API Key + 各服务端口）
- [ ] `docker compose up -d` 启动完整服务栈（PostgreSQL + Redis + bifrost + Logto + RAGFlow + Elasticsearch + FunASR + Kokoro + faster-whisper）
- [ ] 配置 bifrost：4 个 LLM 提供商 + 虚拟密钥 + Guardrails 规则 + 语义缓存
- [ ] 验证各服务健康状态（`/health` 端点）
- **交付物**：一键启动的开发环境，所有服务绿亮

#### 第 2 周：后端核心 API 开发

- [ ] 完善 `services/ai_tutor.py`：System Prompt 模板（Mr.-Ranedeer 方法论移植）
- [ ] 完善 `services/rag_service.py`：RAGFlow API 集成（知识库创建 + 检索 + Agent 工作流）
- [ ] 完善 `services/bifrost_gateway.py`：bifrost 客户端（故障转移 + 语义缓存 + 预算控制）
- [ ] 完善 `api/chat.py`：WebSocket 流式对话 API
- [ ] 完善 `api/auth.py`：Logto OAuth 集成（手机验证码 + Google OAuth）
- [ ] 单元测试：`tests/unit/test_chat.py`, `tests/unit/test_rag.py`
- **交付物**：AI 文字答疑 API 可用，支持流式输出

#### 第 3-4 周：教材知识库构建

- [ ] 通过 RAGFlow Web 界面创建"人教版初中主科"知识库
- [ ] 上传 9 本 PDF 教材（数学/语文/英语 × 七/八/九年级）
- [ ] RAGFlow 自动 docling 解析 → 可视化 chunking 确认 → 启用索引
- [ ] MongoDB 存储教材元数据（章节树 + 知识点关联）
- [ ] `api/knowledge.py`：教材章节浏览 API
- **交付物**：9 本教材向量化，RAG 检索可用

#### 第 5-6 周：前端核心页面

- [ ] `AIChat.tsx`：AI 答疑聊天界面（WebSocket 流式 + 消息气泡 + Markdown 渲染）
- [ ] `Dashboard.tsx`：学生首页仪表盘
- [ ] `AppLayout.tsx`：全局布局（底部 Tab / 侧边栏导航）
- [ ] `LoginPage.tsx`：登录/注册页（Logto OAuth 集成）
- [ ] 响应式适配（移动端 Web + 平板）
- **交付物**：Web 端核心答疑可用

#### 第 7-8 周：拍照搜题 MVP + CI 质量门禁

- [ ] `services/ocr_service.py`：RapidOCR ONNX 微服务封装
- [ ] `api/ocr.py`：图片上传 + OCR 识别 + RAG 检索 + LLM 讲解 API
- [ ] `AIChat.tsx` 集成拍照上传按钮
- [ ] Promptfoo Red-teaming CI 集成（`.github/workflows/zhixueban-ci.yml`）
- [ ] DeepEval LLM 质量门禁配置
- [ ] Playwright E2E 核心流程测试
- **交付物**：拍照搜题可用，CI 质量门禁运行

### 6.2 阶段二：AI 课堂与考试系统（第 3-4 月）

#### 第 3-4 月核心任务

- [ ] `skills/classroom_skill.py`：AI 课堂（课程结构引擎 → 知识点讲解 → 即时练习 → 思维导图）
- [ ] `skills/exam_skill.py`：组卷系统（三种模式 + 防作弊 + AI 批改）
- [ ] `services/sm2_scheduler.py`：错题本 SM-2 复习调度
- [ ] `classroom.tsx` / `ExamCenter.tsx`：前端课堂/考试页面
- [ ] Agent 多角色调度器完善（`services/agent_dispatcher.py`）
- [ ] `skills/memory_books_skill.py`：个人知识笔记本（agnai Memory Books 参考）
- [ ] `api/memory_books.py`：笔记本 CRUD API
- [ ] `MemoryBooks.tsx`：前端笔记本界面
- [ ] PWA 配置（`vite-plugin-pwa` → 添加到主屏幕 + 离线缓存）
- [ ] ai-code-review-helper 部署 + GitHub Webhook 配置
- **交付物**：AI 课堂、考试系统、错题本、PWA 基础版

### 6.3 阶段三：口语对话与家长端（第 5-6 月）

- [ ] `services/voice_service.py`：Pipecat 语音管道（FunASR + Kokoro 适配器）
- [ ] `skills/oral_skill.py`：四模态纠错机制
- [ ] `SpeakingLab.tsx`：口语对话界面
- [ ] `skills/parent_skill.py`：家长监管 Skill
- [ ] `ParentDashboard.tsx`：家长端仪表盘（学习时长/雷达图/休息提醒）
- [ ] Group Conversations 三方对话（家长-学生-AI）
- [ ] 多版本教材覆盖（北师大版、苏教版等）
- **交付物**：实时语音对话、家长监管后台、多版本教材

### 6.4 阶段四：评测与商业化（第 7-9 月）

- [ ] 第三方权威口语评测 API 接入（科大讯飞/腾讯智影）
- [ ] `services/billing_service.py`：lago 计费集成
- [ ] `services/usage_limiter.py`：使用量计量与限次
- [ ] 学情分析系统（知识掌握图谱 + 精准推荐）
- [ ] RAGAS 月度 RAG 质量评估
- [ ] k6 性能压测达标（P95 文字 <1s，语音 <1.5s）
- **交付物**：会员付费体系、学情分析、性能达标

### 6.5 阶段五：全学科与生态（第 10-12 月）

- [ ] 物理/化学/生物/历史/地理/政治教材入库
- [ ] 9 大学科特化 Skills 开发
- [ ] MCP 工具链集成（计算器/绘图/公式验证/词典/地图）
- [ ] 真人老师预约/排队系统
- [ ] Skill 市场（第三方 Skills）
- [ ] 跨端数据同步
- **交付物**：全学科覆盖、生态 API 开放

---

## 7. 附录

### 7.1 本地开发环境一键启动

```bash
# 1. 克隆项目
git clone https://github.com/your-org/Delta.git
cd Delta

# 2. 配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env，填入 DEEPSEEK_API_KEY 等

# 3. 启动完整服务栈（需要 Docker Desktop）
docker compose up -d

# 4. 等待所有服务就绪后，访问：
# - 后端 API 文档: http://localhost:8000/docs
# - RAGFlow Web UI: http://localhost
# - Logto Admin Console: http://localhost:3302
# - bifrost Dashboard: http://localhost:8080

# 5. 安装前端依赖并启动开发服务器
cd app
npm install
npm run dev
# 前端: http://localhost:5173

# 6. 运行测试
cd ..
pytest tests/unit/                                    # 后端单元测试
deepeval test run tests/llm/                          # LLM 质量测试
promptfoo eval --config tests/promptfooconfig.yaml    # AI 安全测试
npx playwright test tests/e2e/                        # 端到端测试
k6 run tests/perf/k6-load-test.js                     # 性能压测
```

### 7.2 关键端口映射

| 服务 | 端口 | 访问地址 |
|------|:---:|------|
| **前端 (Vite)** | 5173 | http://localhost:5173 |
| **后端 (FastAPI)** | 8000 | http://localhost:8000 |
| **API 文档 (Swagger)** | 8000 | http://localhost:8000/docs |
| **bifrost** | 8080 | http://localhost:8080 |
| **RAGFlow** | 80 / 9380 | http://localhost |
| **Logto** | 3301 / 3302 | http://localhost:3301 |
| **PostgreSQL** | 5432 | `postgresql://delta:delta@localhost:5432/delta_ai` |
| **Redis** | 6379 | `redis://localhost:6379/0` |
| **FunASR** | 10095 | http://localhost:10095 |
| **Kokoro** | 8880 | http://localhost:8880 |
| **faster-whisper** | 10300 | http://localhost:10300 |

### 7.3 环境变量关键配置项

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | (必填) |
| `OPENAI_API_KEY` | OpenAI API 密钥（Judge Model） | (可选) |
| `BIFROST_ENABLED` | 是否启用 bifrost 网关 | `true` |
| `BIFROST_URL` | bifrost 网关地址 | `http://localhost:8080/v1` |
| `NEON_ENABLED` | 是否启用 Neon Serverless Postgres | `false` |
| `LOGTO_ENABLED` | 是否启用 Logto 认证 | `true` |
| `OCR_ENGINE` | OCR 引擎选择 | `rapidocr` |
| `ASR_ENGINE` | ASR 引擎选择 | `funasr` |
| `TTS_ENGINE` | TTS 引擎选择 | `kokoro` |
| `RAGFLOW_API_KEY` | RAGFlow API 密钥 | (部署后获取) |

### 7.4 开发规范

**Git 分支策略**：
- `main`：生产分支，仅通过 PR 合并
- `develop`：开发分支
- `feature/{feature-name}`：功能分支
- `fix/{bug-name}`：修复分支

**代码风格**：
- Python：Ruff (E/F/I/N/W/UP) + mypy strict
- TypeScript：ESLint 9 + TypeScript ESLint
- 行宽：Python 120，前端 Prettier 默认

**提交规范**：
```
feat: 新增功能
fix: Bug 修复
docs: 文档更新
refactor: 代码重构
test: 测试相关
chore: 构建/工具链变更
```

**质量门禁（PR 合并前必须通过）**：
1. `pytest tests/unit/` — 后端单元测试覆盖率 >80%
2. `deepeval test run tests/llm/` — Hallucination < 0.3, Faithfulness > 0.8
3. `promptfoo eval` — Red-team 40+ 插件全部通过
4. `npx playwright test` — 核心 E2E 流程 100% 通过
5. AI Code Review — Critical 问题 = 0

### 7.5 技术债务与注意事项

| 事项 | 说明 | 优先级 |
|------|------|:---:|
| **SQLite → PostgreSQL 迁移** | 当前 `DATABASE_URL` 默认为 SQLite 便于本地开发，生产必须切换 PostgreSQL | 高 |
| **Neon Serverless 迁移** | 当前自托管 PostgreSQL，V1.0 后评估迁移至 Neon（每学生独立分支） | 中 |
| **Skills 注册表并发安全** | 当前为内存注册表，多进程部署需改为 Redis/DB 存储 | 中 |
| **RAGFlow API Key 管理** | 当前通过 `.env` 配置，需建立 API Key 轮换机制 | 中 |
| **口语模块完成度** | 口语 Skill 框架已搭建，ASR/TTS 适配器待完善（预估 5-8 天） | 中 |
| **MCP 工具链** | 计算器/绘图/公式验证工具待集成（bifrost MCP 网关已预留） | 低 |

---

**文档结束**

> 本文档基于 Delta v0.2.0 代码库 + 42 个开源项目深度分析 + 3 份设计文档整合编写。涵盖项目概述、系统架构、参考资源整合方案、技术栈依赖、9 大核心模块设计、5 阶段开发路线图及附录。随着项目推进，本文档应持续更新。
