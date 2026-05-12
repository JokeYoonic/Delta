import re
from typing import Optional


class ToolGuard:
    DANGEROUS_COMMANDS = [
        r"rm\s+-rf", r"rm\s+-r", r"del\s+/[sfq]",
        r"DROP\s+TABLE", r"DELETE\s+FROM", r"TRUNCATE\s+TABLE?",
        r"ALTER\s+USER", r"GRANT\s+ALL",
        r"sudo\s+", r"chmod\s+777", r"chown\s+",
        r"/etc/passwd", r"/etc/shadow",
        r"curl\s+.*\|\s*bash", r"wget\s+.*\|\s*sh",
        r"exec\s*\(", r"eval\s*\(", r"__import__",
        r"subprocess", r"os\.system", r"os\.popen",
        r"shutil\.rmtree", r"open\s*\(.+[\"']w",
    ]

    @classmethod
    def check(cls, content: str) -> dict:
        if not content:
            return {"safe": True, "filtered": content, "violations": []}

        violations = []
        for pattern in cls.DANGEROUS_COMMANDS:
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                violations.append({"pattern": pattern, "matches": matches})

        if violations:
            return {"safe": False, "filtered": "", "violations": violations}

        return {"safe": True, "filtered": content, "violations": []}


class FileAccessGuard:
    def __init__(self):
        self._user_paths: dict[str, set[str]] = {}

    def register_user_path(self, user_id: str, allowed_paths: set[str]):
        self._user_paths[user_id] = allowed_paths

    def check_access(self, user_id: str, requested_path: str) -> dict:
        allowed = self._user_paths.get(user_id, set())

        if not allowed:
            return {"allowed": True, "reason": "No restrictions configured"}

        for allowed_path in allowed:
            if requested_path.startswith(allowed_path):
                return {"allowed": True, "reason": "Path within allowed scope"}

        return {"allowed": False, "reason": f"Path {requested_path} outside allowed scope for user {user_id}"}

    def check_data_access(self, requesting_user_id: str, target_user_id: str) -> dict:
        if requesting_user_id == target_user_id:
            return {"allowed": True, "reason": "Own data"}

        from app.core.config import settings
        from app.core.security import is_super_user

        if is_super_user(requesting_user_id):
            return {"allowed": True, "reason": "Super admin access"}

        return {"allowed": False, "reason": f"User {requesting_user_id} cannot access data of user {target_user_id}"}


class SkillSecurityScanner:
    INJECTION_PATTERNS = [
        (r"ignore\s+(previous|above|all)\s+instructions?", "prompt_injection"),
        (r"you\s+are\s+now\s+", "role_injection"),
        (r"system\s*:\s*", "system_prompt_leak"),
        (r"(password|secret|api_key|token)\s*[:=]", "data_exfiltration"),
        (r"(http|https)://[^\s\"]+", "external_url"),
        (r"import\s+(os|subprocess|sys)", "code_injection"),
    ]

    @classmethod
    def scan(cls, skill_code: str, skill_name: str = "") -> dict:
        if not skill_code:
            return {"safe": True, "issues": [], "risk_level": "low"}

        issues = []
        for pattern, issue_type in cls.INJECTION_PATTERNS:
            matches = re.findall(pattern, skill_code, re.IGNORECASE)
            if matches:
                issues.append({
                    "type": issue_type,
                    "pattern": pattern,
                    "count": len(matches),
                    "severity": cls._severity(issue_type),
                })

        risk_level = "low"
        if any(i["severity"] == "critical" for i in issues):
            risk_level = "critical"
        elif any(i["severity"] == "high" for i in issues):
            risk_level = "high"
        elif any(i["severity"] == "medium" for i in issues):
            risk_level = "medium"

        return {
            "safe": risk_level not in ("critical", "high"),
            "issues": issues,
            "risk_level": risk_level,
            "skill_name": skill_name,
        }

    @classmethod
    def _severity(cls, issue_type: str) -> str:
        severity_map = {
            "prompt_injection": "critical",
            "role_injection": "high",
            "system_prompt_leak": "high",
            "data_exfiltration": "critical",
            "external_url": "medium",
            "code_injection": "critical",
        }
        return severity_map.get(issue_type, "low")


tool_guard = ToolGuard()
file_access_guard = FileAccessGuard()
skill_scanner = SkillSecurityScanner()
