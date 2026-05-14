# Delta AI家教 — 开源组件驱动开发流程文档（增量版 v1.2）

**版本**：v1.2
**日期**：2026-05-12
**状态**：基于PRD v1.1与前36个开源项目深度分析制定
**变更说明**：v1.1→v1.2 重大增量——bifrost LLM统一网关替代多模型管理、QwenPaw Skills插件化架构+安全体系+记忆进化、Neon Serverless Postgres多租户数据隔离、agnai多租户+订阅参考

---

## 一、新增开源项目价值评估（6个项目）

### 1.1 LLM统一网关层（重大新增）

| 开源项目                              | Stars | 匹配PRD模块                     | 核心价值                                                                                                                                                                                                                    | 利用策略                                                                                                                                                                          | 优先级               |
| ------------------------------------- | ----- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **bifrost**                     | 高    | LLM调用管理、故障转移、成本控制 | **高性能AI网关**，50x faster than LiteLLM，<100µs overhead at 5k RPS。统一OpenAI兼容API接入23+提供商。自动故障转移、自适应负载均衡、**语义缓存**、预算管理/虚拟密钥、Guardrails内容安全、MCP网关、内置可观测性 | **LLM统一网关主选（重大升级）**。部署为独立网关服务，所有LLM调用通过bifrost统一路由。自动故障转移解决第三方依赖风险；语义缓存降低30-50%成本；Guardrails实现教育内容安全过滤 | **P0（新增）** |
| **spring-boot-llm-integration** | 低    | 多LLM提供商集成                 | Spring Boot多提供商集成，Reactive架构，配置驱动YAML，健康监控                                                                                                                                                               | **参考备选**。技术栈不匹配，bifrost作为独立网关更优                                                                                                                         | P3                   |

### 1.2 Agent架构与安全层（重大新增）

| 开源项目          | Stars         | 匹配PRD模块                               | 核心价值                                                                                                                                                                                                                  | 利用策略                                                                                                                                               | 优先级               |
| ----------------- | ------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| **QwenPaw** | **15k** | Agent架构、Skills扩展、安全体系、记忆系统 | **Qwen生态深度集成的个人AI助手**。①Skills扩展机制；②多Agent协作；③多层安全（Tool guard/File access guard/Skill security scanning）；④记忆进化与主动服务；⑤MCP支持；⑥多通道（钉钉/飞书/微信/Discord/Telegram） | **Agent架构参考+安全体系移植+Skills插件化设计**。Skills机制模块化功能；多Agent协作映射4角色；三层安全移植；记忆进化实现长期画像；MCP连接外部工具 | **P0（新增）** |

### 1.3 多租户与数据隔离层（重大新增）

| 开源项目                              | Stars | 匹配PRD模块                      | 核心价值                                                                                                                                                                      | 利用策略                                                                                                                                                    | 优先级               |
| ------------------------------------- | ----- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **azure-tenant-ai-chat** (Neon) | 中    | 多租户数据隔离、Serverless数据库 | **Neon Serverless Postgres**：每用户独立数据库，500ms内启动，计算存储分离scale-to-zero，数据库分支，pgvector向量存储，Azure Document Intelligence，Azure Speech Service | **PostgreSQL主选升级**。替代自托管PostgreSQL，家庭版每学生一个数据库分支物理隔离。pgvector替代Milvus简化架构                                          | **P1（新增）** |
| **agnai**                       | 中    | 多租户、订阅、角色记忆           | AI角色扮演平台。Group Conversations、多AI服务、多角色格式、多租户、订阅系统、Memory/Lore books、AI生成角色                                                                    | **多租户架构参考+订阅系统参考+Memory books设计**。Memory books映射学生个人知识笔记本；订阅为lago计费提供UI参考；Group Conversations为三方对话提供灵感 | P2                   |
| **basechat**                    | 低    | 多租户RAG UI                     | 多租户RAG聊天机器人，Next.js+Auth.js+PostgreSQL，多LLM支持                                                                                                                    | **多租户RAG UI参考**                                                                                                                                  | P3                   |

---

## 二、关键架构决策增量（v1.2）

### 2.1 LLM统一网关：bifrost 替代分散管理（重大升级）

**v1.1问题**：vstorm模板原生支持多LLM配置，但缺乏统一故障转移、缓存、成本控制能力。

**v1.2方案**：引入 **bifrost** 作为独立LLM网关层。

**核心收益**：

1. **自动故障转移**：DeepSeek API限流/故障时，bifrost在<100µs内自动路由到Qwen/GLM/OpenAI，零停机。直接解决PRD风险表"第三方引擎依赖"问题。
2. **语义缓存**：基于语义相似性的智能缓存。学生问"一元二次方程求根公式"和"怎么求一元二次方程的根"被识别为同一语义，直接返回缓存结果，**降低LLM调用成本30-50%**。对"免费版每日5次答疑"场景尤其重要——缓存不消耗额度。
3. **预算管理**：虚拟密钥+团队预算+客户预算层级控制。为"会员版"设置月度LLM预算上限，防止异常流量导致亏损。
4. **Guardrails**：内容安全过滤层，在LLM网关层面拦截不良内容请求/响应，作为PRD 4.2"内容安全"的第一道防线。
5. **MCP网关**：统一管理与外部工具（计算器、公式验证器、绘图工具）的交互。
6. **性能无损**：<100µs overhead at 5k RPS，对1秒响应时间目标无影响。

**架构变化**：

```
v1.1: 智学伴后端 → 直接调用 DeepSeek/Qwen/GLM API
v1.2: 智学伴后端 → bifrost网关(http://localhost:8080) → 自动路由到 DeepSeek/Qwen/GLM/OpenAI
       ↑ 语义缓存命中时直接返回，不调用LLM
       ↑ Guardrails过滤不良内容
       ↑ 预算超限时报错
```

### 2.2 Agent架构：QwenPaw Skills插件化 + 多Agent协作（重大新增）

**v1.1问题**：AI课堂、考试系统、口语训练等功能是硬编码在后端服务中，新增功能需要修改核心代码。

**v1.2方案**：借鉴 **QwenPaw** 的Skills扩展机制，将智学伴重构为**插件化Agent架构**。

**核心设计**：

```
智学伴核心Agent（主控）
    ├── 教材同步Skill（RAGFlow知识库管理）
    ├── 答疑Skill（LLM推理+RAG检索）
    ├── 课堂Skill（DeepTutor Book Engine）
    ├── 考试Skill（组卷/监考/AI批改）
    ├── 口语Skill（Pipecat语音管道）
    ├── 学情Skill（数据分析/推荐引擎）
    └── 家长Skill（监管后台/报告生成）
```

**多Agent角色映射**（QwenPaw多Agent协作）：

- **严厉老师Agent**：直接指出错误，要求严格（Prompt+Kokoro voice='z'）
- **温柔学姐Agent**：鼓励式教学，耐心解释（Prompt+Kokoro voice='z' 语速0.9x）
- **同龄学伴Agent**：平等交流，共同探讨（Prompt+Kokoro voice='a'）
- **外教Agent**：全英文对话，文化拓展（Prompt+edge-tts英式发音）
- **主控Agent**：根据学生状态/场景自动调度上述Agent

**安全体系移植**（QwenPaw三层安全）：

1. **Tool Guard**：拦截AI生成的危险操作（如删除数据库、执行系统命令）
2. **File Access Guard**：限制AI对学生数据的访问范围（只能访问自己的错题本，不能访问他人）
3. **Skill Security Scanning**：新Skill上线前自动扫描提示注入/命令注入/数据泄露风险

**记忆进化**（QwenPaw Memory-Evolving）：

- Agent从每次交互中学习，自动更新学生画像
- 主动服务：根据学习规律主动推送"该复习错题了"/"新章节已更新"
- 反思经验：AI定期复盘与学生的对话历史，优化后续教学策略

### 2.3 数据库：Neon Serverless Postgres 替代自托管（架构升级）

**v1.1问题**：vstorm模板使用自托管PostgreSQL，需要手动管理扩容/备份/高可用。

**v1.2方案**：引入 **Neon Serverless Postgres** 作为主数据库。

**核心收益**：

1. **多租户数据隔离**：家庭版3个学生账号 → Neon自动创建3个独立数据库分支，数据物理隔离，符合《个人信息保护法》
2. **Scale-to-Zero**：夜间/低峰期自动缩容到零，**降低数据库成本60%+**
3. **数据库分支**：
   - 开发分支：新功能开发时秒级克隆生产数据库
   - 测试分支：自动化测试使用独立分支，不影响生产
   - 学生分支：每学生独立分支，家长可"合并"查看汇总
4. **pgvector替代Milvus**：Neon原生支持pgvector扩展，**向量存储+关系数据在同一数据库**，简化架构（不再需要Milvus独立服务）
5. **500ms内启动**：新用户注册时，Neon在500ms内创建独立Postgres实例
6. **Serverless Driver**：Neon提供低延迟serverless PostgreSQL驱动，边缘环境sub-10ms查询

**架构变化**：

```
v1.1: PostgreSQL(自托管) + Milvus(向量) + MongoDB(文档)
v1.2: Neon Serverless Postgres(pgvector向量+关系数据) + MongoDB(文档/对话记录)
       ↑ 计算与存储分离，autoscaling，scale-to-zero
       ↑ 每学生独立数据库分支（家庭版）
```

### 2.4 订阅与多租户：agnai 补充参考

**借鉴点**：

1. **Memory/Lore books** → 智学伴"个人知识笔记本"：
   - 学生可收藏教材重点、记录个人理解、添加自定义笔记
   - AI答疑时自动检索个人笔记本内容，提供个性化回答
   - 与RAGFlow教材知识库形成"公共知识+个人知识"双层RAG
2. **Group Conversations** → "家长-学生-AI"三方对话模式：
   - 家长可在对话中@AI询问孩子学习情况
   - AI可同时与家长和学生在同一对话线程中交流
3. **订阅系统UI** → 会员/家庭版购买界面设计参考

---

## 三、增量开发路线图修订（v1.2）

### 阶段一修订：MVP核心答疑（第1-2月）

#### 新增：bifrost网关部署（第1月第1周，与架构搭建并行）

**开源组件组合**：bifrost + QwenPaw安全体系参考

**具体实施步骤**：

1. **部署bifrost网关**：

   ```bash
   # 方式1：Docker部署（推荐）
   docker run -d -p 8080:8080 -v $(pwd)/bifrost-data:/app/data maximhq/bifrost

   # 方式2：NPX快速启动
   npx -y @maximhq/bifrost
   ```

   - 配置提供商：DeepSeek（主）/ Qwen（备）/ GLM（备）/ OpenAI（备）
   - 配置虚拟密钥：为"免费版"/"会员版"/"家庭版"分别创建虚拟密钥，设置不同预算上限
   - 配置Guardrails：教育场景安全规则（屏蔽不良信息、限制敏感话题）
   - 配置语义缓存：启用，设置缓存TTL（24小时）
2. **智学伴后端集成bifrost**：

   ```python
   # vstorm后端调用bifrost（OpenAI兼容API）
   import openai

   client = openai.OpenAI(
       base_url="http://bifrost:8080/v1",  # 指向bifrost网关
       api_key="bifrost-virtual-key-for-zhixueban"
   )

   response = client.chat.completions.create(
       model="deepseek/deepseek-chat",  # bifrost自动路由
       messages=[{"role": "user", "content": "一元二次方程求根公式"}],
       stream=True
   )
   ```

   - 所有LLM调用统一通过bifrost，不再直接调用各提供商API
   - bifrost自动处理故障转移、缓存、预算控制
3. **QwenPaw安全体系移植**（轻量版）：

   - 实现Tool Guard：拦截AI生成的危险shell命令（如rm -rf、DROP TABLE）
   - 实现File Access Guard：限制AI文件访问范围（学生只能访问自己的数据目录）
   - Skill Security Scanning：MVP阶段暂不实现（V1.0后引入Skills机制时启用）

#### 修订：数据库选型（第1月第1周）

**开源组件组合**：Neon Serverless Postgres

**具体实施步骤**：

1. **创建Neon项目**：

   - 注册Neon账号（或Azure Marketplace部署）
   - 创建"zhixueban-prod"项目
   - 启用pgvector扩展：CREATE EXTENSION vector;
2. **配置vstorm后端连接Neon**：

   ```python
   # 使用Neon serverless driver（sub-10ms延迟）
   DATABASE_URL = "postgresql://user:pass@ep-xxx.neon.tech/zhixueban?sslmode=require"
   ```
3. **数据模型设计**（利用Neon分支特性）：

   - 主分支（main）：用户表、订单表、教材元数据表
   - 学生分支（student_*）：对话记录、错题本、个人笔记本（agnai Memory books概念）
   - pgvector表：教材chunk向量（替代Milvus）

#### 新增：Skills插件化架构设计（第2月第3-4周，MVP末期）

**开源组件组合**：QwenPaw Skills机制参考

**具体实施步骤**：

1. **定义Skill接口**：

   ```python
   class ZhixuebanSkill:
       name: str           # Skill名称
       description: str    # Skill描述
       triggers: List[str] # 触发关键词

       async def execute(self, context: SkillContext) -> SkillResult:
           # 执行Skill逻辑
           pass

       async def validate(self, context: SkillContext) -> bool:
           # 验证是否满足执行条件
           pass
   ```
2. **MVP阶段实现2个核心Skill**：

   - **答疑Skill**：LLM推理 + RAGFlow检索（已有功能封装为Skill）
   - **教材Skill**：RAGFlow知识库查询 + 章节浏览（已有功能封装为Skill）
3. **Skill自动加载机制**：

   - Skills目录：skills/ 下每个子目录为一个Skill
   - 启动时自动扫描加载（参考QwenPaw的"custom skills auto-loaded"）

---

### 阶段二修订：AI课堂与考试系统（第3-4月）

#### 新增：多Agent角色系统（第3月第1-2周）

**开源组件组合**：QwenPaw多Agent协作 + agnai角色格式

**具体实施步骤**：

1. **定义Agent角色配置**（借鉴agnai的W++/SBF格式）：

   ```json
   {
     "name": "严厉老师",
     "persona": "你是一位严格的中学老师，直接指出学生的错误，要求精确和严谨...",
     "voice": {"provider": "kokoro", "voice": "z", "speed": 1.0},
     "triggers": ["考试模式", "正式测评"],
     "skills": ["考试Skill", "批改Skill"]
   }
   ```
2. **Agent调度器**（QwenPaw多Agent协作机制）：

   - 学生选择"开始学习" → 主控Agent分析学生状态 → 调度"温柔学姐Agent"（基础薄弱）或"严厉老师Agent"（考前冲刺）
   - 学生选择"口语练习" → 调度"外教Agent"或"同龄学伴Agent"
   - Group Conversations模式：家长加入对话时，主控Agent同时维护学生视角和家长视角的回答
3. **Agent状态持久化**（Neon数据库）：

   - 每个Agent的"记忆"存储在Neon数据库中
   - Agent切换时保留上下文（如从"温柔学姐"切换到"严厉老师"，学习进度不丢失）

#### 修订：考试系统（第3月第3-4周）

**新增bifrost语义缓存优化**：

- 考试系统中"相似题推荐"环节：bifrost缓存常见推荐结果，降低LLM调用
- 客观题答案解析：高频题目解析缓存，提升响应速度

#### 新增：个人知识笔记本（第4月第3-4周）

**开源组件组合**：agnai Memory/Lore books + Neon分支

**具体实施步骤**：

1. **Memory Books设计**（借鉴agnai）：

   - 学生可创建多本"记忆书"："数学重点"/"英语词汇"/"物理公式"
   - 每本书包含条目：标题+内容+关联知识点+创建时间
   - AI答疑时自动检索学生的Memory Books，优先引用学生自己的笔记
2. **Lore Books（教材知识库）**：

   - 对应RAGFlow教材知识库，作为"公共知识"
   - 与Memory Books形成"公共+个人"双层RAG
3. **Neon分支存储**：

   - 每个学生的Memory Books存储在其独立Neon分支中
   - 家长可通过"合并分支"查看学生的笔记汇总

---

### 阶段三修订：口语对话与家长端（第5-6月）

#### 新增：口语Skill完整实现（第5月第1-3周）

**开源组件组合**：QwenPaw Skills + Pipecat + companion四模态纠错

**具体实施步骤**：

1. **口语Skill封装**：

   ```python
   class OralSkill(ZhixuebanSkill):
       name = "口语训练"
       triggers = ["口语", "说话", "发音", "对话"]

       async def execute(self, context):
           # 1. 场景识别（日常/考试/朗诵/说题）
           scenario = self.detect_scenario(context.message)

           # 2. Agent调度（外教Agent/学姐Agent）
           agent = self.select_agent(scenario, context.student_level)

           # 3. 启动Pipecat语音管道
           pipeline = self.build_pipeline(agent.voice_config)

           # 4. 四模态纠错（companion参考）
           return await pipeline.start()
   ```
2. **Skill安全扫描**（QwenPaw机制）：

   - 口语Skill上线前自动扫描：确保不会泄露学生语音数据、不会调用未授权API

#### 新增：家长监管Skill（第6月第2-4周）

**开源组件组合**：QwenPaw多通道 + agnai Group Conversations

**具体实施步骤**：

1. **家长Skill封装**：

   ```python
   class ParentSkill(ZhixuebanSkill):
       name = "家长监管"
       triggers = ["查看报告", "学习情况", "时长"]

       async def execute(self, context):
           # 聚合多学生数据（Neon各分支查询）
           reports = []
           for student_id in context.parent.students:
               report = await self.generate_report(student_id)
               reports.append(report)
           return reports
   ```
2. **Group Conversations模式**（agnai参考）：

   - 家长端可发起"三方对话"：家长+学生+AI同时在对话中
   - AI根据对话对象动态调整回答（对家长用数据/对学生用引导）
3. **QwenPaw多通道借鉴**：

   - 家长端支持钉钉/飞书/微信推送学习报告（未来扩展）

---

### 阶段四修订：第三方评测与学情分析（第7-9月）

#### 新增：学情分析Skill + 记忆进化（第8月）

**开源组件组合**：QwenPaw记忆进化 + coach仪表盘

**具体实施步骤**：

1. **学情分析Skill**：

   ```python
   class AnalyticsSkill(ZhixuebanSkill):
       name = "学情分析"
       triggers = ["报告", "分析", "掌握情况"]

       async def execute(self, context):
           # 1. 数据聚合（Neon各表查询）
           data = await self.aggregate_data(context.student_id)

           # 2. LLM生成分析（通过bifrost网关）
           analysis = await self.llm_analyze(data)

           # 3. 记忆进化：更新学生画像
           await self.update_student_profile(context.student_id, analysis)

           return analysis
   ```
2. **记忆进化机制**（QwenPaw Memory-Evolving）：

   - **学习规律发现**：Agent自动发现学生的学习模式（如"每晚8点数学效率最高"）
   - **主动推送**：根据规律主动推送"今晚适合复习几何"/"明天有新课预习"
   - **反思优化**：每周AI复盘教学效果，调整后续策略（如"该学生对视觉化讲解反应更好，增加图表"）
3. **bifrost预算管理优化**：

   - 学情分析等后台任务通过bifrost的"低优先级队列"调用LLM，降低成本
   - 语义缓存学情分析结果（同一学生短期内不重复分析）

---

### 阶段五修订：全学科与生态深化（第10-12月）

#### 新增：完整Skills生态 + MCP工具链（第10-11月）

**开源组件组合**：QwenPaw Skills + MCP + bifrost MCP网关

**具体实施步骤**：

1. **全学科Skills矩阵**：

   | 学科 | Skill名称     | 功能                           |
   | ---- | ------------- | ------------------------------ |
   | 数学 | MathSkill     | 公式识别、计算验证、几何绘图   |
   | 物理 | PhysicsSkill  | 力学模拟、单位换算、实验步骤   |
   | 化学 | ChemSkill     | 分子结构、方程式配平、实验安全 |
   | 语文 | ChineseSkill  | 古诗词鉴赏、作文批改、阅读理解 |
   | 英语 | EnglishSkill  | 语法纠正、翻译、发音评测       |
   | 历史 | HistorySkill  | 时间线、地图、史料分析         |
   | 地理 | GeoSkill      | 地图标注、气候分析、GIS        |
   | 生物 | BioSkill      | 解剖图、遗传计算、生态系统     |
   | 政治 | PoliticsSkill | 时政热点、政策分析、辩论       |
2. **MCP工具链**（bifrost MCP网关统一管理）：

   - **计算器工具**：数学计算验证（防止LLM计算错误）
   - **绘图工具**：几何图形、函数图像、物理示意图
   - **公式验证器**：LaTeX公式语法检查
   - **词典工具**：英语/语文词汇查询
   - **地图工具**：地理历史地图标注
3. **Skill市场**（QwenPaw机制扩展）：

   - 第三方可开发Skills并上架（如"奥数竞赛Skill"/"雅思口语Skill"）
   - Skill Security Scanning确保第三方Skills安全

#### 新增：真人老师服务流程Skill化（第11-12月）

**具体实施步骤**：

1. **真人老师Skill**：

   ```python
   class HumanTutorSkill(ZhixuebanSkill):
       name = "真人老师"
       triggers = ["找老师", "人工", "真人"]

       async def execute(self, context):
           # 1. AI兜底判断（连续3次无法解决）
           if await self.ai_fallback_check(context):
               # 2. 创建工单，排队
               ticket = await self.create_ticket(context)
               # 3. 打包上下文（完整对话历史+学生画像）
               await self.package_context(context, ticket)
               return {"status": "queued", "ticket_id": ticket.id}
   ```
2. **Neon分支数据隔离**：

   - 真人老师访问学生数据时，通过Neon的"只读分支"获取，确保不修改学生原始数据

---

## 四、修订后技术架构（v1.2）

```
┌─────────────────────────────────────────────────────────────────┐
│                      客户端层（多端）                              │
│  ├─ Web (Next.js 15+React 19+Tailwind v4) ← vstorm模板           │
│  ├─ iOS/Android (PWA/Capacitor) ← Open-TutorAI-CE PWA参考        │
│  ├─ PC (Electron) ← 集成 Umi-OCR HTTP接口                        │
│  └─ 平板 (响应式Web)                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      接入网关层（CDN + LB）                        │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      业务服务层（FastAPI + LangChain）              │
│  ├─ 用户服务（JWT/API Key/OAuth认证，vstorm内置）                   │
│  ├─ Agent调度器（QwenPaw多Agent协作参考）                          │
│  │    ├─ 主控Agent：状态分析+Skill调度+角色切换                      │
│  │    ├─ 答疑Agent / 课堂Agent / 考试Agent / 口语Agent              │
│  │    └─ 严厉老师/温柔学姐/同龄学伴/外教 角色Agent                   │
│  ├─ Skills引擎（QwenPaw Skills机制）                              │
│  │    ├─ 核心Skills：教材/答疑/课堂/考试/口语/学情/家长              │
│  │    └─ 学科Skills：Math/Physics/Chem/Chinese/English...         │
│  ├─ 对话服务（LLM推理 → bifrost网关 → 多提供商）                    │
│  ├─ 语音服务（Pipecat管道编排 + 双引擎适配）                        │
│  ├─ 计费服务（lago自托管 + 微信/支付宝Webhook）                     │
│  ├─ 数据服务（学情分析/推荐引擎/SM-2复习调度）                      │
│  └─ 安全层（QwenPaw三层安全移植）                                   │
│       ├─ Tool Guard：拦截危险操作                                  │
│       ├─ File Access Guard：数据访问隔离                           │
│       └─ Skill Security Scanning：技能安全扫描                      │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      AI能力层（开源组件集群）                       │
│  ├─ LLM统一网关（bifrost ← 新增）                                  │
│  │    ├─ 多提供商路由：DeepSeek(主)/Qwen(备)/GLM(备)/OpenAI(备)     │
│  │    ├─ 自动故障转移 + 自适应负载均衡                              │
│  │    ├─ 语义缓存（降低30-50%成本）                                │
│  │    ├─ 预算管理/虚拟密钥（控制LLM支出）                           │
│  │    ├─ Guardrails（内容安全过滤）                                │
│  │    └─ MCP网关（外部工具统一管理）                                 │
│  ├─ RAG引擎（RAGFlow，内置docling/MinerU解析）                     │
│  ├─ 文档解析（docling + PaddleOCR-VL双方案）                        │
│  ├─ 多模态理解（RapidOCR + PaddleOCR-VL + Umi-OCR）                 │
│  ├─ 语音引擎（Pipecat管道 + 双引擎适配）                            │
│  └─ MCP工具链（计算器/绘图/公式验证/词典/地图）                      │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      数据存储层（v1.2升级）                         │
│  ├─ Neon Serverless Postgres（替代自托管PostgreSQL+Milvus）          │
│  │    ├─ 主分支：用户/订单/教材元数据/计费数据                        │
│  │    ├─ 学生分支（每学生独立）：对话记录/错题本/个人笔记本            │
│  │    ├─ pgvector扩展：教材chunk向量存储（替代Milvus）                │
│  │    ├─ autoscaling + scale-to-zero（降本60%+）                   │
│  │    └─ 数据库分支：开发/测试/学生隔离                              │
│  ├─ MongoDB（题库/对话记录/Skills配置）                            │
│  ├─ Redis（缓存/会话/限次计数）                                     │
│  └─ OSS/S3（图片/音频/视频资源）                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 五、关键技术选型决策表增量（v1.2）

| PRD模块               | v1.1方案                  | **v1.2方案（增量）**                                 | 决策理由                                                                                                       |
| --------------------- | ------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **LLM网关**     | 直接调用各提供商API       | **bifrost统一网关**                                  | 自动故障转移解决第三方依赖风险；语义缓存降低30-50%成本；Guardrails内容安全；预算管理控制支出；<100µs overhead |
| **Agent架构**   | 单一Agent硬编码功能       | **QwenPaw Skills插件化+多Agent协作**                 | 功能模块化，新增学科/场景只需开发Skill；多Agent角色直接映射PRD角色设定；三层安全机制                           |
| **数据库**      | 自托管PostgreSQL + Milvus | **Neon Serverless Postgres**                         | 每学生独立数据库分支（家庭版数据隔离）；pgvector替代Milvus简化架构；scale-to-zero降本60%+；500ms启动           |
| **记忆系统**    | MongoDB存储对话历史       | **+ QwenPaw记忆进化+agnai Memory Books**             | Agent主动服务（推送复习提醒）；个人知识笔记本（学生自定义重点）；双层RAG（公共+个人）                          |
| **多租户**      | RBAC权限控制              | **+ Neon每用户数据库分支+agnai Group Conversations** | 物理隔离更符合个人信息保护法；家长-学生-AI三方对话模式                                                         |
| **MCP工具**     | 无                        | **bifrost MCP网关+计算器/绘图/公式验证等工具**       | 防止LLM数学计算错误；支持几何绘图/物理示意图；统一工具管理                                                     |
| **LLM多提供商** | vstorm配置                | **bifrost 23+提供商统一管理**                        | 更成熟的故障转移、负载均衡、缓存、成本控制                                                                     |

---

## 六、新增开源组件二次开发清单

| 组件                             | 适配工作                                                             | 预估工时 |
| -------------------------------- | -------------------------------------------------------------------- | -------- |
| **bifrost部署+配置**       | Docker部署，配置4个LLM提供商+虚拟密钥+Guardrails规则+语义缓存策略    | 2-3天    |
| **bifrost × 智学伴后端**  | 修改vstorm后端所有LLM调用点，统一指向bifrost网关（base_url变更）     | 3-5天    |
| **QwenPaw Skills机制移植** | 设计Skill接口规范，实现Skill自动加载/卸载/扫描机制                   | 5-7天    |
| **Agent调度器**            | 实现主控Agent状态分析+角色调度逻辑（严厉/温柔/学伴/外教）            | 3-5天    |
| **QwenPaw安全层移植**      | 实现Tool Guard（命令拦截）、File Access Guard（路径限制）            | 2-3天    |
| **Neon Postgres迁移**      | 数据模型迁移（自托管PostgreSQL→Neon），pgvector表创建，连接驱动替换 | 3-5天    |
| **Neon分支管理**           | 实现学生注册时自动创建Neon分支，家长查看时合并分支查询               | 2-3天    |
| **agnai Memory Books移植** | 设计个人知识笔记本数据模型，集成到RAG检索流程（双层RAG）             | 3-5天    |
| **bifrost MCP网关配置**    | 配置计算器/绘图/公式验证等MCP工具，与Skills集成                      | 2-3天    |

---

## 七、风险规避增量（v1.2）

| 风险               | v1.2开源对策                                                              | 缓解措施                                                                  |
| ------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| LLM提供商限流/故障 | **bifrost自动故障转移**：DeepSeek异常时<100µs切换Qwen/GLM          | 配置3+提供商，设置健康检查间隔5秒；异常时自动告警                         |
| LLM成本失控        | **bifrost预算管理**：虚拟密钥设置月度上限；语义缓存降低30-50%调用   | 免费版启用强语义缓存；会员版设置合理预算；超限时触发升级提示              |
| AI回答错误（幻觉） | **bifrost Guardrails** + **MCP计算器工具**验证数学结果        | 计算题通过MCP工具验证；关键知识点设置置信度阈值；低置信度时引导问真人老师 |
| 学生数据泄露       | **Neon每学生独立分支** + **QwenPaw File Access Guard**        | 物理隔离+逻辑隔离双重保障；AI只能访问当前学生分支数据                     |
| 新功能开发周期长   | **Skills插件化架构**：新增学科只需开发Skill，不影响核心             | 定义标准Skill接口；提供Skill开发文档；安全扫描自动检测风险                |
| Skill安全风险      | **QwenPaw Skill Security Scanning**：扫描提示注入/命令注入/密钥泄露 | 所有第三方Skill上线前强制扫描；禁止Skills执行系统命令/网络请求            |
| 数据库运维负担     | **Neon Serverless**：自动扩容/备份/高可用/scale-to-zero             | 无需DBA运维；监控Neon Dashboard；设置成本告警                             |

---

## 八、里程碑与开源组件交付对照（v1.2增量）

| 里程碑         | 时间    | v1.2新增开源组件交付                                                                                                                                                             | 自研重点                                              |
| -------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **MVP**  | 1-2月   | **bifrost**网关部署（4提供商+缓存+Guardrails）、**Neon**Serverless Postgres（主分支+pgvector）、**QwenPaw**Skills架构（2核心Skill）、安全层（Tool/File Guard） | LLM调用迁移到bifrost、Neon数据模型、Skill接口设计     |
| **V1.0** | 3-4月   | **QwenPaw**多Agent角色系统（4角色）、**agnai**Memory Books（个人笔记本）、**bifrost**MCP网关（计算器工具）、**Neon**学生分支自动创建                     | Agent调度器、双层RAG（公共+个人）、考试/课堂Skill封装 |
| **V1.5** | 5-6月   | **QwenPaw**口语Skill完整实现、家长Skill（Group Conversations）、**bifrost**预算管理上线、**Neon**scale-to-zero优化                                             | 四模态纠错、家长端三方对话、多通道推送                |
| **V2.0** | 7-9月   | **QwenPaw**记忆进化（主动推送/反思优化）、学情分析Skill、**bifrost**语义缓存优化（学情分析）、**Neon**只读分支（真人老师数据访问）                             | 学习规律发现、AI教学策略自优化、真人老师Skill         |
| **V3.0** | 10-12月 | **QwenPaw**全学科Skills生态（9科）、**bifrost**MCP工具链完整（绘图/公式/词典/地图）、Skill市场（第三方Skills）、**Neon**数据库分支CI/CD                        | 学科特化功能、第三方Skill审核、生态API开放            |

---

## 九、附录：v1.2新增快速启动命令

### 9.1 bifrost网关部署

```bash
# 1. 启动bifrost（Docker）
docker run -d -p 8080:8080   -v $(pwd)/bifrost-data:/app/data   -e BIFROST_DEFAULT_PROVIDER=deepseek   maximhq/bifrost

# 2. 配置提供商（通过Web UI或API）
curl -X POST http://localhost:8080/admin/providers   -H "Content-Type: application/json"   -d '{
    "name": "deepseek",
    "type": "openai",
    "base_url": "https://api.deepseek.com/v1",
    "api_key": "sk-xxx",
    "models": ["deepseek-chat", "deepseek-reasoner"]
  }'

curl -X POST http://localhost:8080/admin/providers   -H "Content-Type: application/json"   -d '{
    "name": "qwen",
    "type": "openai",
    "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "api_key": "sk-xxx",
    "models": ["qwen-plus", "qwen-turbo"]
  }'

# 3. 配置虚拟密钥（按会员层级）
curl -X POST http://localhost:8080/admin/virtual-keys   -H "Content-Type: application/json"   -d '{
    "name": "zhixueban-free",
    "budget": {"limit": 50, "period": "daily", "currency": "CNY"},
    "rate_limit": {"requests_per_minute": 5}
  }'

curl -X POST http://localhost:8080/admin/virtual-keys   -H "Content-Type: application/json"   -d '{
    "name": "zhixueban-premium",
    "budget": {"limit": 500, "period": "daily", "currency": "CNY"}
  }'

# 4. 配置Guardrails（教育场景）
curl -X POST http://localhost:8080/admin/guardrails   -H "Content-Type: application/json"   -d '{
    "name": "education-safety",
    "rules": [
      {"type": "content_filter", "block": ["暴力", "色情", "政治敏感"]},
      {"type": "prompt_injection", "action": "block"},
      {"type": "jailbreak", "action": "block"}
    ]
  }'

# 5. 启用语义缓存
curl -X POST http://localhost:8080/admin/cache   -H "Content-Type: application/json"   -d '{
    "enabled": true,
    "type": "semantic",
    "similarity_threshold": 0.92,
    "ttl": 86400
  }'
```

### 9.2 Neon Serverless Postgres配置

```bash
# 1. 创建Neon项目（通过Neon Console或API）
curl -X POST https://console.neon.tech/api/v2/projects   -H "Authorization: Bearer $NEON_API_KEY"   -H "Content-Type: application/json"   -d '{
    "project": {
      "name": "zhixueban-prod",
      "pg_version": 16
    }
  }'

# 2. 获取连接字符串并配置到vstorm后端
# DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/zhixueban?sslmode=require"

# 3. 启用pgvector扩展
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 4. 创建向量表（替代Milvus）
psql $DATABASE_URL -c "
CREATE TABLE textbook_chunks (
    id SERIAL PRIMARY KEY,
    kb_id VARCHAR(64),
    chapter_id VARCHAR(64),
    content TEXT,
    embedding VECTOR(1024),
    metadata JSONB
);
CREATE INDEX ON textbook_chunks USING ivfflat (embedding vector_cosine_ops);
"

# 5. 学生注册时自动创建分支（通过Neon API）
curl -X POST https://console.neon.tech/api/v2/projects/$PROJECT_ID/branches   -H "Authorization: Bearer $NEON_API_KEY"   -H "Content-Type: application/json"   -d '{
    "branch": {
      "name": "student_12345",
      "parent_id": "main"
    }
  }'
```

### 9.3 Skills开发模板

```python
# skills/oral_skill/skill.py
from zhixueban import ZhixuebanSkill, SkillContext, SkillResult

class OralSkill(ZhixuebanSkill):
    name = "口语训练"
    description = "提供实时语音对话、发音纠正、情景模拟"
    triggers = ["口语", "说话", "发音", "对话", "朗读"]
    version = "1.0.0"

    async def validate(self, context: SkillContext) -> bool:
        # 检查学生是否开通了口语功能（会员版）
        return context.student.plan in ["premium", "family"]

    async def execute(self, context: SkillContext) -> SkillResult:
        # 1. 场景识别
        scenario = self.detect_scenario(context.message)

        # 2. Agent调度
        agent = self.select_agent(scenario, context.student)

        # 3. 启动语音管道（Pipecat）
        pipeline = self.build_voice_pipeline(agent)

        # 4. 返回会话信息
        return SkillResult(
            type="voice_session",
            data={"session_id": pipeline.session_id, "agent": agent.name},
            message=f"已启动{agent.name}口语练习，请开始说话..."
        )

    def detect_scenario(self, message: str) -> str:
        if "考试" in message: return "exam_simulation"
        if "古诗" in message: return "poetry_recitation"
        if "说题" in message: return "math_explanation"
        return "daily_conversation"

    def select_agent(self, scenario: str, student):
        agents = {
            "exam_simulation": self.load_agent("严厉老师"),
            "daily_conversation": self.load_agent("外教"),
            "poetry_recitation": self.load_agent("温柔学姐"),
            "math_explanation": self.load_agent("同龄学伴")
        }
        return agents.get(scenario, agents["daily_conversation"])

# skill.yaml（元数据）
name: oral_skill
version: 1.0.0
author: zhixueban-team
permissions:
  - voice:read
  - voice:write
  - student:read
security:
  scan_level: strict
  allow_network: false
  allow_file_write: false
```

### 9.4 Agent角色配置示例

```json
{
  "agents": [
    {
      "id": "strict_teacher",
      "name": "严厉老师",
      "persona": "你是一位严格的中学特级教师，教学30年。你直接指出学生的错误，要求精确和严谨，不容忍马虎。你会用简短有力的语言纠正错误，然后给出标准解法。",
      "system_prompt": "你是智学伴的严厉老师角色。你的任务是帮助学生掌握知识点，但方式严格直接。当学生犯错时，立即指出错误并给出正确方法。不要过度安慰，但要确保学生理解。",
      "voice_config": {
        "provider": "kokoro",
        "voice": "z",
        "speed": 1.0,
        "pitch": 1.0
      },
      "triggers": ["考试模式", "正式测评", "我要严格训练"],
      "skills": ["exam", "correction"],
      "memory_style": "strict"
    },
    {
      "id": "gentle_senior",
      "name": "温柔学姐",
      "persona": "你是一位耐心温柔的大学学姐，擅长用简单易懂的方式解释复杂概念。你会鼓励学生，用生活中的例子帮助理解，从不让学生感到挫败。",
      "system_prompt": "你是智学伴的温柔学姐角色。你的任务是用最耐心、最易懂的方式帮助学生。多用类比和生活例子，多鼓励，让学生感到学习是愉快的。",
      "voice_config": {
        "provider": "kokoro",
        "voice": "z",
        "speed": 0.9,
        "pitch": 1.05
      },
      "triggers": ["我没听懂", "能再讲一遍吗", "基础薄弱"],
      "skills": ["tutorial", "encouragement"],
      "memory_style": "gentle"
    },
    {
      "id": "foreign_teacher",
      "name": "外教",
      "persona": "你是一位来自英国的英语外教，热情开朗，喜欢分享英美文化。你只用英语交流，偶尔用中文解释难词。你注重实用口语和文化背景。",
      "system_prompt": "You are Zhixueban's foreign teacher. You only speak English (with occasional Chinese for difficult words). Focus on practical conversation skills and cultural context. Correct pronunciation gently but clearly.",
      "voice_config": {
        "provider": "edge-tts",
        "voice": "en-GB-RyanNeural",
        "speed": 1.0
      },
      "triggers": ["英语", "口语", "外教", "foreign"],
      "skills": ["oral_english", "culture"],
      "memory_style": "cultural"
    }
  ]
}
```

---

**文档结束**

> 本增量开发流程文档v1.2基于前36个开源项目的深度分析制定。v1.1→v1.2核心增量：
>
> 1. **bifrost LLM统一网关**：替代分散的LLM调用管理，提供自动故障转移、语义缓存（降本30-50%）、预算管理、Guardrails内容安全
> 2. **QwenPaw Skills插件化架构**：将功能模块化（教材/答疑/课堂/考试/口语/学情/家长Skills），支持第三方扩展
> 3. **QwenPaw多Agent协作**：4角色Agent体系（严厉老师/温柔学姐/同龄学伴/外教）+ 主控Agent调度
> 4. **QwenPaw三层安全**：Tool Guard + File Access Guard + Skill Security Scanning
> 5. **QwenPaw记忆进化**：Agent主动服务（推送复习提醒）、反思优化教学策略
> 6. **Neon Serverless Postgres**：替代自托管PostgreSQL+Milvus，每学生独立数据库分支，pgvector向量存储，scale-to-zero降本60%+
> 7. **agnai Memory/Lore Books**：个人知识笔记本，双层RAG（公共教材+个人笔记）
> 8. **agnai Group Conversations**：家长-学生-AI三方对话模式
>
> v1.2架构使智学伴从"功能堆砌"升级为"Agent化、插件化、安全化、Serverless化"的现代AI教育平台，整体开发周期维持12个月，但后期扩展效率提升3x+。
