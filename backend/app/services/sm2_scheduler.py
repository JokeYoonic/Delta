from datetime import datetime, timedelta, timezone
from typing import Optional
from app.models import KnowledgePoint


class SM2Scheduler:
    def evaluate(self, kp: KnowledgePoint, quality: int) -> dict:
        if quality < 0 or quality > 5:
            raise ValueError("Quality must be between 0 and 5")

        ef = kp.easiness_factor
        interval = kp.interval_days
        repetitions = kp.review_count

        if quality >= 3:
            if repetitions == 0:
                interval = 1
            elif repetitions == 1:
                interval = 6
            else:
                interval = round(interval * ef)
            repetitions += 1
        else:
            repetitions = 0
            interval = 1

        ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        if ef < 1.3:
            ef = 1.3

        now = datetime.now(timezone.utc)
        next_review = now + timedelta(days=interval)

        new_mastery = min(100, kp.mastery + (quality - 2) * 10)

        return {
            "easiness_factor": round(ef, 2),
            "interval_days": interval,
            "review_count": repetitions,
            "next_review": next_review,
            "mastery": max(0, new_mastery),
        }

    def get_due_knowledge_points(self, knowledge_points: list[KnowledgePoint]) -> list[KnowledgePoint]:
        now = datetime.now(timezone.utc)
        due = []
        for kp in knowledge_points:
            if kp.next_review is None or kp.next_review <= now:
                due.append(kp)
        return sorted(due, key=lambda x: x.mastery)

    def get_difficulty_adjusted_questions(
        self,
        knowledge_points: list[KnowledgePoint],
        target_count: int = 10,
    ) -> list[dict]:
        due = self.get_due_knowledge_points(knowledge_points)
        selected = due[:target_count]

        questions = []
        for kp in selected:
            if kp.mastery < 40:
                difficulty = "easy"
            elif kp.mastery < 70:
                difficulty = "medium"
            else:
                difficulty = "hard"

            questions.append({
                "knowledge_point_id": kp.id,
                "name": kp.name,
                "subject": kp.subject,
                "chapter": kp.chapter,
                "difficulty": difficulty,
                "current_mastery": kp.mastery,
                "recommended_review": True,
            })

        return questions


sm2_scheduler = SM2Scheduler()
