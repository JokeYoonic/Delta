import httpx
import json
import re
from typing import AsyncGenerator, Optional
from app.core.config import settings

PHONEME_MAP = {
    "th": {"ipa": "/θ/", "examples": ["think", "three", "math"], "common_error": "替换为/s/或/t/"},
    "th_voiced": {"ipa": "/ð/", "examples": ["the", "this", "that"], "common_error": "替换为/d/或/z/"},
    "v": {"ipa": "/v/", "examples": ["very", "have", "love"], "common_error": "替换为/w/"},
    "r": {"ipa": "/r/", "examples": ["red", "run", "around"], "common_error": "替换为/l/或/w/"},
    "l": {"ipa": "/l/", "examples": ["like", "look", "feel"], "common_error": "替换为/r/"},
    "ng": {"ipa": "/ŋ/", "examples": ["sing", "ring", "long"], "common_error": "替换为/n/"},
    "ae": {"ipa": "/æ/", "examples": ["cat", "bad", "man"], "common_error": "替换为/e/或/ɑ/"},
    "ih": {"ipa": "/ɪ/", "examples": ["sit", "bit", "hit"], "common_error": "替换为/i/"},
    "uh": {"ipa": "/ʌ/", "examples": ["cup", "but", "run"], "common_error": "替换为/ɑ/"},
    "oo": {"ipa": "/uː/", "examples": ["food", "moon", "blue"], "common_error": "缩短为/ʊ/"},
    "aw": {"ipa": "/ɔː/", "examples": ["call", "all", "walk"], "common_error": "替换为/ɑ/"},
    "er": {"ipa": "/ɜːr/", "examples": ["bird", "word", "her"], "common_error": "替换为/ɑr/"},
}

CHINESE_PHONEME_MAP = {
    "zh": {"ipa": "/ʈʂ/", "examples": ["知", "中", "张"], "common_error": "替换为/z/或/j/"},
    "ch": {"ipa": "/ʈʂʰ/", "examples": ["吃", "出", "长"], "common_error": "替换为/c/"},
    "sh": {"ipa": "/ʂ/", "examples": ["是", "上", "说"], "common_error": "替换为/s/"},
    "r_zh": {"ipa": "/ʐ/", "examples": ["日", "人", "让"], "common_error": "替换为/l/"},
    "c": {"ipa": "/tsʰ/", "examples": ["次", "从", "草"], "common_error": "替换为/ch/"},
    "ang": {"ipa": "/ɑŋ/", "examples": ["帮", "当", "上"], "common_error": "鼻音不足"},
    "eng": {"ipa": "/əŋ/", "examples": ["风", "等", "成"], "common_error": "鼻音不足"},
    "ing": {"ipa": "/iŋ/", "examples": ["星", "听", "名"], "common_error": "鼻音不足"},
}


class VoiceService:
    def __init__(self):
        self.asr_engine = settings.ASR_ENGINE
        self.tts_engine = settings.TTS_ENGINE

    async def speech_to_text(self, audio_data: bytes, language: str = "zh") -> dict:
        if self.asr_engine == "funasr":
            return await self._funasr_stt(audio_data)
        elif self.asr_engine == "faster_whisper":
            return await self._faster_whisper_stt(audio_data)
        return await self._funasr_stt(audio_data)

    async def text_to_speech(self, text: str, voice: str = None, language: str = "zh") -> bytes:
        if self.tts_engine == "kokoro":
            return await self._kokoro_tts(text, voice)
        elif self.tts_engine == "edge_tts":
            return await self._edge_tts(text, voice)
        return await self._kokoro_tts(text, voice)

    async def _funasr_stt(self, audio_data: bytes) -> dict:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{settings.FUNASR_URL}/asr",
                    content=audio_data,
                    headers={"Content-Type": "audio/wav"},
                )
                response.raise_for_status()
                data = response.json()
                return {
                    "text": data.get("text", ""),
                    "confidence": data.get("confidence", 0.9),
                    "language": "zh",
                    "segments": data.get("segments", []),
                }
        except httpx.HTTPError:
            return {"text": "", "confidence": 0, "language": "zh", "segments": []}

    async def _faster_whisper_stt(self, audio_data: bytes) -> dict:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{settings.FASTER_WHISPER_URL}/asr",
                    content=audio_data,
                    headers={"Content-Type": "audio/wav"},
                )
                response.raise_for_status()
                data = response.json()
                return {
                    "text": data.get("text", ""),
                    "confidence": data.get("confidence", 0.9),
                    "language": data.get("language", "zh"),
                    "segments": data.get("segments", []),
                }
        except httpx.HTTPError:
            return {"text": "", "confidence": 0, "language": "zh", "segments": []}

    async def _kokoro_tts(self, text: str, voice: str = None) -> bytes:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{settings.KOKORO_URL}/tts",
                    json={"text": text, "voice": voice or "zf_xiaobei"},
                )
                response.raise_for_status()
                return response.content
        except httpx.HTTPError:
            return b""

    async def _edge_tts(self, text: str, voice: str = None) -> bytes:
        try:
            import edge_tts
            communicate = edge_tts.Communicate(text, voice or settings.EDGE_TTS_VOICE)
            buffer = bytearray()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    buffer.extend(chunk["data"])
            return bytes(buffer)
        except ImportError:
            return b""

    async def evaluate_pronunciation(self, audio_data: bytes, reference_text: str) -> dict:
        stt_result = await self.speech_to_text(audio_data)
        recognized = stt_result.get("text", "")

        if not recognized or not reference_text:
            return {
                "pronunciation_score": 0,
                "fluency_score": 0,
                "accuracy_score": 0,
                "feedback": "无法识别语音",
            }

        is_english = bool(re.match(r'^[a-zA-Z\s\']+$', reference_text.strip()))
        phoneme_analysis = self._analyze_phonemes(recognized, reference_text, is_english)

        ref_chars = set(reference_text.lower().replace(" ", ""))
        rec_chars = set(recognized.lower().replace(" ", ""))
        correct_chars = ref_chars & rec_chars
        accuracy = len(correct_chars) / len(ref_chars) * 100 if ref_chars else 0

        fluency = min(stt_result.get("confidence", 0.5) * 100, 100)

        phoneme_score = self._compute_phoneme_score(phoneme_analysis)
        pronunciation = accuracy * 0.3 + fluency * 0.2 + phoneme_score * 0.5

        return {
            "pronunciation_score": int(pronunciation),
            "fluency_score": int(fluency),
            "accuracy_score": int(accuracy),
            "phoneme_score": int(phoneme_score),
            "recognized_text": recognized,
            "reference_text": reference_text,
            "phoneme_analysis": phoneme_analysis,
            "feedback": self._generate_phoneme_feedback(pronunciation, phoneme_analysis),
        }

    def _analyze_phonemes(self, recognized: str, reference: str, is_english: bool) -> list[dict]:
        analysis = []
        phoneme_map = PHONEME_MAP if is_english else CHINESE_PHONEME_MAP

        ref_words = reference.split() if is_english else list(reference)
        rec_words = recognized.split() if is_english else list(recognized)

        for i, ref_word in enumerate(ref_words):
            rec_word = rec_words[i] if i < len(rec_words) else ""
            word_analysis = self._analyze_word_phonemes(ref_word, rec_word, is_english, phoneme_map)
            if word_analysis:
                analysis.append(word_analysis)

        if len(rec_words) < len(ref_words):
            for i in range(len(rec_words), len(ref_words)):
                analysis.append({
                    "word": ref_words[i],
                    "phonemes": [],
                    "score": 0,
                    "issue": "遗漏",
                })

        return analysis

    def _analyze_word_phonemes(self, ref_word: str, rec_word: str, is_english: bool, phoneme_map: dict) -> dict:
        if not ref_word:
            return None

        phoneme_issues = []
        score = 100

        if is_english:
            ref_lower = ref_word.lower()
            rec_lower = rec_word.lower() if rec_word else ""

            for key, info in phoneme_map.items():
                for example in info["examples"]:
                    if key == "th" and ("th" in ref_lower):
                        if rec_lower and "th" not in rec_lower:
                            phoneme_issues.append({
                                "phoneme": info["ipa"],
                                "expected": ref_lower,
                                "actual": rec_lower or "(未识别)",
                                "error_type": info["common_error"],
                                "examples": info["examples"],
                            })
                            score -= 15
                        break
                    elif key == "th_voiced" and ref_lower.startswith("th"):
                        if rec_lower and not rec_lower.startswith("th"):
                            phoneme_issues.append({
                                "phoneme": info["ipa"],
                                "expected": ref_lower,
                                "actual": rec_lower or "(未识别)",
                                "error_type": info["common_error"],
                                "examples": info["examples"],
                            })
                            score -= 15
                        break

            if ref_lower != rec_lower:
                for i, (rc, cc) in enumerate(zip(ref_lower, rec_lower)):
                    if rc != cc:
                        phoneme_issues.append({
                            "phoneme": rc,
                            "position": i,
                            "expected": rc,
                            "actual": cc,
                            "error_type": "音素替换",
                        })
                        score -= 10
        else:
            ref_chars = list(ref_word)
            rec_chars = list(rec_word) if rec_word else []

            for i, rc in enumerate(ref_chars):
                cc = rec_chars[i] if i < len(rec_chars) else ""
                if rc != cc:
                    for key, info in phoneme_map.items():
                        if rc in info.get("examples", []):
                            phoneme_issues.append({
                                "phoneme": info["ipa"],
                                "expected_char": rc,
                                "actual_char": cc or "(未识别)",
                                "error_type": info["common_error"],
                            })
                            score -= 12
                            break
                    else:
                        phoneme_issues.append({
                            "phoneme": rc,
                            "expected_char": rc,
                            "actual_char": cc or "(未识别)",
                            "error_type": "发音偏差",
                        })
                        score -= 8

        return {
            "word": ref_word,
            "phonemes": phoneme_issues,
            "score": max(score, 0),
            "issue": "有音素错误" if phoneme_issues else "",
        }

    def _compute_phoneme_score(self, phoneme_analysis: list[dict]) -> float:
        if not phoneme_analysis:
            return 80.0
        total_score = sum(w.get("score", 80) for w in phoneme_analysis)
        return total_score / len(phoneme_analysis)

    def _generate_phoneme_feedback(self, overall_score: float, phoneme_analysis: list[dict]) -> str:
        if overall_score >= 90:
            return "发音非常标准！音素清晰准确，继续保持！"
        elif overall_score >= 70:
            issues = []
            for w in phoneme_analysis:
                for p in w.get("phonemes", []):
                    if p.get("error_type"):
                        issues.append(f"{w['word']}: {p.get('phoneme', '')} {p['error_type']}")
            if issues:
                return f"发音不错，但以下音素需要加强：{'；'.join(issues[:3])}"
            return "发音不错，部分音素需要加强练习。"
        elif overall_score >= 50:
            issue_count = sum(len(w.get("phonemes", [])) for w in phoneme_analysis)
            return f"发音需要改进，共{issue_count}处音素偏差。建议逐词慢速跟读，注意区分相似音素。"
        else:
            return "发音偏差较大，建议从基础音标开始练习，先掌握单个音素再组合练习。"


voice_service = VoiceService()
