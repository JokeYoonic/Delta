import json
from typing import AsyncGenerator, Optional
from openai import AsyncOpenAI

from app.core.config import settings
from app.services.rag_service import ragflow_service

SYSTEM_PROMPT_BASE = """你是Delta AI家教，一个专业、友好、耐心的AI教学助手。你的核心使命是帮助学生理解和掌握知识，而不是直接给出答案。

## 教学原则
1. **苏格拉底式引导**：通过提问引导学生思考，而非直接告知答案
2. **因材施教**：根据学生的年级和水平调整讲解深度
3. **多模态表达**：善用类比、举例、图示说明抽象概念
4. **正向激励**：及时肯定学生的进步，建立学习信心
5. **知识关联**：帮助建立新旧知识之间的联系

## 回答规范
- 先确认理解学生的问题
- 分步骤讲解，每步都有逻辑衔接
- 关键概念用**加粗**标注
- 提供1-2个生活化的类比
- 最后用一个问题检验学生是否理解
"""

MR_REINDEER_CONFIG = {
    "depth": {
        1: "仅给出结论和最简解释",
        2: "给出结论+简要推理过程",
        3: "完整推理+1个类比",
        4: "完整推理+2个类比+1个反例",
        5: "深度推导+多角度论证+边界情况讨论",
    },
    "learning_style": {
        "visual": "多用图表、流程图、思维导图描述",
        "auditory": "多用对话、口诀、韵律描述",
        "kinesthetic": "多用动手实验、操作步骤描述",
        "reading": "多用文本、引用、定义描述",
    },
    "communication_style": {
        "socratic": "用提问引导学生思考",
        "direct": "直接给出清晰解释",
        "storytelling": "用故事和场景包装知识",
    },
    "tone_style": {
        "friendly": "亲切友好，像大哥哥大姐姐",
        "professional": "专业严谨，像大学教授",
        "playful": "活泼有趣，像游戏伙伴",
    },
    "reasoning_framework": {
        "deductive": "从一般到特殊（先原理后应用）",
        "inductive": "从特殊到一般（先例子后规律）",
        "abductive": "从观察到假设（先现象后解释）",
        "analogical": "从已知到未知（先类比后迁移）",
    },
}


class AITutorEngine:
    def __init__(self):
        self._client: Optional[AsyncOpenAI] = None
        self.model = settings.LLM_MODEL

    @property
    def client(self) -> AsyncOpenAI:
        if self._client is None:
            api_key = settings.llm_api_key_resolved or "sk-placeholder"
            self._client = AsyncOpenAI(
                api_key=api_key,
                base_url=settings.llm_base_url,
            )
        return self._client

    def _build_system_prompt(self, tutor_config: dict = None) -> str:
        prompt = SYSTEM_PROMPT_BASE

        if tutor_config:
            depth = tutor_config.get("depth", 3)
            depth_desc = MR_REINDEER_CONFIG["depth"].get(depth, MR_REINDEER_CONFIG["depth"][3])
            prompt += f"\n\n## 讲解深度（{depth}/5）\n{depth_desc}\n"

            learning_style = tutor_config.get("learning_style", "visual")
            ls_desc = MR_REINDEER_CONFIG["learning_style"].get(learning_style, "")
            if ls_desc:
                prompt += f"\n## 学习风格偏好\n{ls_desc}\n"

            comm_style = tutor_config.get("communication_style", "socratic")
            cs_desc = MR_REINDEER_CONFIG["communication_style"].get(comm_style, "")
            if cs_desc:
                prompt += f"\n## 沟通方式\n{cs_desc}\n"

            tone_style = tutor_config.get("tone_style", "friendly")
            ts_desc = MR_REINDEER_CONFIG["tone_style"].get(tone_style, "")
            if ts_desc:
                prompt += f"\n## 语气风格\n{ts_desc}\n"

            reasoning = tutor_config.get("reasoning_framework", "deductive")
            r_desc = MR_REINDEER_CONFIG["reasoning_framework"].get(reasoning, "")
            if r_desc:
                prompt += f"\n## 推理框架\n{r_desc}\n"

            language = tutor_config.get("language", "zh-CN")
            prompt += f"\n## 回答语言\n{language}\n"

        return prompt

    async def chat(
        self,
        messages: list[dict],
        tutor_config: dict = None,
        use_rag: bool = True,
        kb_name: str = None,
    ) -> str:
        system_prompt = self._build_system_prompt(tutor_config)

        context = ""
        rag_sources = []
        if use_rag and messages:
            last_user_msg = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
            if last_user_msg:
                try:
                    rag_result = await ragflow_service.query(last_user_msg, kb_name)
                    if rag_result.get("answer"):
                        context = f"\n\n## 参考教材内容\n{rag_result['answer']}"
                    if rag_result.get("sources"):
                        rag_sources = rag_result["sources"]
                except Exception:
                    pass

        full_system = system_prompt + context

        api_messages = [{"role": "system", "content": full_system}] + messages[-20:]

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=api_messages,
            temperature=0.7,
            max_tokens=2048,
        )
        return response.choices[0].message.content

    async def chat_with_sources(
        self,
        messages: list[dict],
        tutor_config: dict = None,
        use_rag: bool = True,
        kb_name: str = None,
    ) -> tuple[str, list[dict]]:
        system_prompt = self._build_system_prompt(tutor_config)

        context = ""
        rag_sources = []
        if use_rag and messages:
            last_user_msg = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
            if last_user_msg:
                try:
                    rag_result = await ragflow_service.query(last_user_msg, kb_name)
                    if rag_result.get("answer"):
                        context = f"\n\n## 参考教材内容\n{rag_result['answer']}"
                    if rag_result.get("sources"):
                        rag_sources = rag_result["sources"]
                except Exception:
                    pass

        full_system = system_prompt + context
        api_messages = [{"role": "system", "content": full_system}] + messages[-20:]

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=api_messages,
            temperature=0.7,
            max_tokens=2048,
        )
        return response.choices[0].message.content, rag_sources

    async def chat_stream(
        self,
        messages: list[dict],
        tutor_config: dict = None,
        use_rag: bool = True,
        kb_name: str = None,
    ) -> AsyncGenerator[str, None]:
        system_prompt = self._build_system_prompt(tutor_config)

        context = ""
        if use_rag and messages:
            last_user_msg = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
            if last_user_msg:
                try:
                    rag_result = await ragflow_service.query(last_user_msg, kb_name)
                    if rag_result.get("answer"):
                        context = f"\n\n## 参考教材内容\n{rag_result['answer']}"
                except Exception:
                    pass

        full_system = system_prompt + context
        api_messages = [{"role": "system", "content": full_system}] + messages[-20:]

        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=api_messages,
            temperature=0.7,
            max_tokens=2048,
            stream=True,
        )

        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def chat_stream_with_sources(
        self,
        messages: list[dict],
        tutor_config: dict = None,
        use_rag: bool = True,
        kb_name: str = None,
    ) -> tuple[AsyncGenerator[str, None], list[dict]]:
        system_prompt = self._build_system_prompt(tutor_config)

        context = ""
        rag_sources = []
        if use_rag and messages:
            last_user_msg = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
            if last_user_msg:
                try:
                    rag_result = await ragflow_service.query(last_user_msg, kb_name)
                    if rag_result.get("answer"):
                        context = f"\n\n## 参考教材内容\n{rag_result['answer']}"
                    if rag_result.get("sources"):
                        rag_sources = rag_result["sources"]
                except Exception:
                    pass

        full_system = system_prompt + context
        api_messages = [{"role": "system", "content": full_system}] + messages[-20:]

        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=api_messages,
            temperature=0.7,
            max_tokens=2048,
            stream=True,
        )

        async def _stream():
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        return _stream(), rag_sources

    async def generate_exam_questions(
        self,
        subject: str,
        chapter: str,
        difficulty: str = "medium",
        count: int = 10,
        question_types: list[str] = None,
    ) -> list[dict]:
        q_types = question_types or ["choice", "fill", "short_answer"]
        prompt = f"""请为以下内容生成{count}道练习题：

科目：{subject}
章节：{chapter}
难度：{difficulty}
题型：{', '.join(q_types)}

请以JSON格式返回，格式如下：
[
  {{
    "id": "q1",
    "type": "choice",
    "content": "题目内容",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "answer": "A",
    "explanation": "解析",
    "knowledge_points": ["知识点1"],
    "difficulty": "medium",
    "score": 5
  }}
]

只返回JSON，不要其他内容。"""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_tokens=4096,
        )
        content = response.choices[0].message.content
        try:
            json_str = content.strip()
            if json_str.startswith("```"):
                json_str = json_str.split("\n", 1)[1].rsplit("```", 1)[0]
            return json.loads(json_str)
        except (json.JSONDecodeError, IndexError):
            return []

    async def evaluate_answer(
        self,
        question: str,
        correct_answer: str,
        user_answer: str,
        subject: str = "",
    ) -> dict:
        prompt = f"""请评估学生的回答：

题目：{question}
正确答案：{correct_answer}
学生答案：{user_answer}
科目：{subject}

请以JSON格式返回：
{{
  "is_correct": true/false,
  "score": 0-100,
  "feedback": "具体反馈",
  "hint": "提示（如果答错）",
  "knowledge_gaps": ["缺失的知识点"]
}}

只返回JSON。"""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1024,
        )
        content = response.choices[0].message.content
        try:
            json_str = content.strip()
            if json_str.startswith("```"):
                json_str = json_str.split("\n", 1)[1].rsplit("```", 1)[0]
            return json.loads(json_str)
        except (json.JSONDecodeError, IndexError):
            return {
                "is_correct": user_answer.strip() == correct_answer.strip(),
                "score": 100 if user_answer.strip() == correct_answer.strip() else 0,
                "feedback": "评估出错，请重试",
                "hint": "",
                "knowledge_gaps": [],
            }

    async def analyze_mistakes(
        self,
        wrong_questions: list[dict],
        subject: str = "",
    ) -> dict:
        prompt = f"""请分析以下错题，找出学生的薄弱知识点：

错题列表：{json.dumps(wrong_questions, ensure_ascii=False)}
科目：{subject}

请以JSON格式返回：
{{
  "weak_points": ["薄弱知识点1", "薄弱知识点2"],
  "error_patterns": ["错误模式1"],
  "suggestions": ["改进建议1"],
  "review_plan": "复习计划"
}}

只返回JSON。"""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=2048,
        )
        content = response.choices[0].message.content
        try:
            json_str = content.strip()
            if json_str.startswith("```"):
                json_str = json_str.split("\n", 1)[1].rsplit("```", 1)[0]
            return json.loads(json_str)
        except (json.JSONDecodeError, IndexError):
            return {
                "weak_points": [],
                "error_patterns": [],
                "suggestions": [],
                "review_plan": "",
            }


ai_tutor_engine = AITutorEngine()
