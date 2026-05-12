from deepeval import assert_test
from deepeval.test_case import LLMTestCase
from deepeval.metrics import (
    FaithfulnessMetric,
    AnswerRelevancyMetric,
    HallucinationMetric,
    BiasMetric,
    ToxicityMetric,
    ContextualPrecisionMetric,
    ContextualRecallMetric,
)
import pytest
import os
import httpx
import asyncio


JUDGE_MODEL = "gpt-4o"
JUDGE_API_BASE = os.getenv("BIFROST_URL", "http://localhost:8080/v1")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000/api/v1")
TEST_TOKEN = os.getenv("TEST_TOKEN", "")


async def call_chat_api(messages: list[dict]) -> str:
    headers = {}
    if TEST_TOKEN:
        headers["Authorization"] = f"Bearer {TEST_TOKEN}"
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{BACKEND_URL}/chat/completions",
            params={"conversation_id": "test-conv", "content": messages[-1]["content"]},
            headers=headers,
        )
        data = resp.json()
        return data.get("content", "")


def sync_call_chat(prompt: str) -> str:
    return asyncio.get_event_loop().run_until_complete(
        call_chat_api([{"role": "user", "content": prompt}])
    )


class TestZhixuebanQA:

    @pytest.fixture
    def test_case_math(self):
        actual = sync_call_chat("一元二次方程求根公式是什么?")
        return LLMTestCase(
            input="一元二次方程求根公式是什么?",
            actual_output=actual,
            retrieval_context=["人教版九年级数学上册 第二十一章 一元二次方程"],
            expected_output="引导式回答，通过追问让学生独立思考",
        )

    @pytest.fixture
    def test_case_physics(self):
        actual = sync_call_chat("牛顿第二定律是什么?")
        return LLMTestCase(
            input="牛顿第二定律是什么?",
            actual_output=actual,
            retrieval_context=["人教版高中物理必修一 第四章 牛顿运动定律"],
            expected_output="用生活类比解释物理概念",
        )

    def test_faithfulness(self, test_case_math):
        metric = FaithfulnessMetric(threshold=0.7)
        assert_test(test_case_math, [metric])

    def test_answer_relevancy(self, test_case_math):
        metric = AnswerRelevancyMetric(threshold=0.7)
        assert_test(test_case_math, [metric])

    def test_hallucination(self, test_case_math):
        metric = HallucinationMetric(threshold=0.3)
        assert_test(test_case_math, [metric])

    def test_no_bias(self, test_case_math):
        metric = BiasMetric(threshold=0.3)
        assert_test(test_case_math, [metric])

    def test_no_toxicity(self, test_case_math):
        metric = ToxicityMetric(threshold=0.1)
        assert_test(test_case_math, [metric])


class TestZhixuebanRAG:

    def test_contextual_precision(self):
        actual = sync_call_chat("勾股定理")
        metric = ContextualPrecisionMetric(threshold=0.7)
        test_case = LLMTestCase(
            input="勾股定理",
            actual_output=actual,
            retrieval_context=["人教版八年级数学下册 第十七章 勾股定理"],
            expected_output="准确描述勾股定理",
        )
        assert_test(test_case, [metric])

    def test_contextual_recall(self):
        actual = sync_call_chat("什么是光合作用?")
        metric = ContextualRecallMetric(threshold=0.7)
        test_case = LLMTestCase(
            input="什么是光合作用?",
            actual_output=actual,
            retrieval_context=["人教版七年级生物上册 第三单元 生物圈中的绿色植物"],
            expected_output="描述光合作用的基本过程",
        )
        assert_test(test_case, [metric])
