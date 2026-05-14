# 重启后恢复指南

**时间**: 2026-05-14 凌晨
**状态**: 首次环境搭建，Docker 因内存不足（90%+）引擎卡死

---

## 当前进度

### 已完成
- [x] 前端依赖安装 (`app/node_modules`)
- [x] 后端 Python 依赖安装
- [x] 后端 `.env` 配置（最小模式 + DeepSeek API Key）
- [x] Docker 镜像拉取完成（postgres, redis, bifrost, logto）
- [x] Docker 容器镜像构建完成（delta-backend, delta-frontend）
- [x] SQLite 兼容性修复（ConversationResponse 懒加载问题）
- [x] LLM_MODEL 修正为 deepseek-v4-pro
- [x] AI 对话验证通过

### 待完成
- [ ] 重启后启动 Docker 基础设施
- [ ] 后端切到 PostgreSQL + Bifrost + Logto 模式
- [ ] 后端用 Docker 模式启动
- [ ] RAG 教材知识库（ChromaDB 本地持久化，随 pip 安装）
- [ ] 语音功能（Edge-TTS 默认可用，本地 FunASR 需 pip install funasr）

---

## 重启后操作步骤

### 1. 开 Clash Verge
- 开 TUN 模式
- 开系统代理
- 开 Allow LAN（允许局域网连接）
- 模式选 Rule

### 2. 启动 Docker Desktop
- 等 Docker Engine 完全就绪（状态栏变绿）

### 3. 告诉 Claude Code 执行：
```
继续执行 Delta 项目的 Docker 基础设施启动
```

---

## 配置文件状态

### backend/.env 当前配置（最小模式）
```
DATABASE_URL=sqlite+aiosqlite:///./delta.db
BIFROST_ENABLED=false
LOGTO_ENABLED=false
LLM_MODEL=deepseek-v4-pro
LLM_API_KEY=your_api_key_here
```

### docker-compose.yml 当前状态
- 启用: postgres, redis, bifrost, logto
- 可选: funasr, kokoro, faster-whisper（--profile voice）, backend, frontend（--profile app）

### 已修复的代码 Bug
1. `backend/app/schemas/schemas.py` — 新增 ConversationDetailResponse（拆出 messages 字段）
2. `backend/app/api/conversations.py` — list/create 用 ConversationResponse，detail 用 ConversationDetailResponse

---

## 关键地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:3000 |
| 后端 | http://localhost:8000 |
| API 文档 | http://localhost:8000/docs |
| PostgreSQL (Docker) | localhost:5432 |
| Redis (Docker) | localhost:6379 |
| Bifrost (Docker) | http://localhost:8080 |
| Logto (Docker) | http://localhost:3302 |

## 登录凭据
- 邮箱: user77@delta.ai
- 密码: delta77admin

---

## 内存情况
- 机型: 联想拯救者 Y9000P 2022
- 重启前内存占用 90%+
- 建议重启后关闭不必要的应用再启动 Docker
