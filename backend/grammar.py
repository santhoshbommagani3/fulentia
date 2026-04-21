import json
import random
import os
from engine import speech_to_text


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GRAMMAR_PATH = os.path.join(BASE_DIR, "grammar.json")

with open(GRAMMAR_PATH, "r") as f:
    GRAMMAR_DB = json.load(f)



def get_grammar_questions(count=5):
    valid = [
        q for q in GRAMMAR_DB
        if "options" in q and isinstance(q["options"], list) and len(q["options"]) > 0
    ]

    count = min(count, len(valid))
    selected = random.sample(valid, count)

    return selected

def check_typed_answer(question_id, user_answer):
    """
    Checks typed grammar answer.
    """
    question = next((q for q in GRAMMAR_DB if q["id"] == question_id), None)
    if not question:
        return None

    correct = user_answer.strip().lower() == question["answer"].lower()

    return {
        "correct": correct,
        "expected": question["answer"],
        "rule": question["rule"]
    }



def check_spoken_answer(question_id, audio_file):
    """
    Checks spoken grammar answer using speech recognition.
    """
    question = next((q for q in GRAMMAR_DB if q["id"] == question_id), None)
    if not question:
        return None

    os.makedirs("recordings", exist_ok=True)
    wav_path = os.path.join("recordings", "grammar.wav")
    audio_file.save(wav_path)

    recognized = speech_to_text(wav_path)

    correct = recognized.strip().lower() == question["full"].lower()

    return {
        "recognized": recognized,
        "correct": correct,
        "expected": question["full"],
        "rule": question["rule"]
    }
