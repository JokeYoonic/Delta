import json
import os
from typing import Dict, List

_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "knowledge")


def load_knowledge_file(filename: str) -> Dict[str, List[str]]:
    filepath = os.path.join(_DATA_DIR, filename)
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Knowledge data file not found: {filepath}")
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def load_all_knowledge() -> Dict[str, List[str]]:
    merged: Dict[str, List[str]] = {}
    for filename in sorted(os.listdir(_DATA_DIR)):
        if filename.endswith(".json"):
            data = load_knowledge_file(filename)
            for subject, texts in data.items():
                merged.setdefault(subject, []).extend(texts)
    return merged


def list_subjects() -> List[str]:
    all_data = load_all_knowledge()
    return sorted(all_data.keys())


def get_subject_knowledge(subject: str) -> List[str]:
    all_data = load_all_knowledge()
    return all_data.get(subject, [])


def get_knowledge_stats() -> Dict[str, int]:
    all_data = load_all_knowledge()
    return {subject: len(texts) for subject, texts in sorted(all_data.items())}
