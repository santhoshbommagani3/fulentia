from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import json
import random
import os
import requests
USED_WORDS = set()
from engine import (
    speech_to_text,
    sentence_to_phonemes,
    user_speech_to_phonemes,
    detect_pronunciation,
    sentence_to_phonetic
)

from grammar import get_grammar_questions

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

frontend_dir = os.path.abspath(
    os.path.join(BASE_DIR, "..", "frontend")
)

app = Flask(
    __name__,
    static_folder=os.path.join(frontend_dir, "static"),
    template_folder=frontend_dir
)

CORS(app)

with open(os.path.join(BASE_DIR, "sentences.json"), "r", encoding="utf-8") as f:
    SENTENCE_DB = json.load(f)

with open(os.path.join(BASE_DIR, "common_words.json"), "r", encoding="utf-8") as f:
    WORD_LIST = json.load(f)


@app.route("/")
def index():
    return render_template("index.html")

def generate_example_sentence(word):
    templates = [
        f"I am working on improving my {word}.",
        f"This course helped me build my {word}.",
        f"She showed great {word} during the project.",
        f"Developing {word} takes time and practice.",
        f"He gained more {word} through experience."
    ]
    return random.choice(templates)

USED_WORDS = set()

def generate_example_sentence(word):
    templates = [
        f"I am working on improving my {word}.",
        f"This course helped me build my {word}.",
        f"She showed great {word} during the project.",
        f"Developing {word} takes time and practice.",
        f"He gained more {word} through experience."
    ]
    return random.choice(templates)

@app.get("/get-vocab-word")
def get_vocab_word():
    global USED_WORDS

    if len(USED_WORDS) >= len(WORD_LIST):
        USED_WORDS.clear()

    remaining_words = list(set(WORD_LIST) - USED_WORDS)
    word = random.choice(remaining_words)
    USED_WORDS.add(word)

    meaning = "Definition not available."
    example = generate_example_sentence(word)
    audio = ""

    try:
        res = requests.get(
            f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}",
            timeout=3
        )

        if res.status_code == 200:
            data = res.json()[0]

            meanings = data.get("meanings", [])
            if meanings:
                definitions = meanings[0].get("definitions", [])
                if definitions:
                    meaning = definitions[0].get("definition", meaning)
                    example = definitions[0].get("example", example)

            for p in data.get("phonetics", []):
                if p.get("audio"):
                    audio = p["audio"]
                    break

    except Exception as e:
        print("Vocab API error:", e)

    return jsonify({
        "word": word,
        "meaning": meaning,
        "example": example,
        "audio": audio
    })

@app.get("/get-sentences")
def get_sentences():
    level = request.args.get("level", "beginner").lower()
    count = int(request.args.get("count", 10))

    if level not in SENTENCE_DB:
        return jsonify({"error": "Invalid level"}), 400

    return jsonify({
        "level": level,
        "sentences": random.sample(SENTENCE_DB[level], count)
    })



@app.get("/sentence-phonetic")
def get_sentence_phonetic():
    sentence = request.args.get("sentence")
    if not sentence:
        return jsonify({"error": "Missing sentence"}), 400

    return jsonify({
        "sentence": sentence,
        "phonetic": sentence_to_phonetic(sentence)
    })

@app.post("/evaluate")
def evaluate():
    reference_sentence = request.form.get("sentence")
    audio_file = request.files.get("audio")

    if not reference_sentence or not audio_file:
        return jsonify({"error": "Missing sentence or audio"}), 400

    os.makedirs(os.path.join(BASE_DIR, "recordings"), exist_ok=True)
    wav_path = os.path.join(BASE_DIR, "recordings", "user.wav")
    audio_file.save(wav_path)

    recognized = speech_to_text(wav_path)

    if not recognized:
        return jsonify({
            "recognized": "",
            "results": [
                {"word": w.rstrip(".,!?"), "status": "NOT SPOKEN"}
                for w in reference_sentence.split()
            ]
        })

    ref_ph = sentence_to_phonemes(reference_sentence)
    user_ph = user_speech_to_phonemes(recognized)

    results = detect_pronunciation(
        ref_ph, user_ph, recognized, reference_sentence
    )

    ordered = []
    for word in reference_sentence.lower().split():
        clean = ''.join(ch for ch in word if ch.isalpha())
        ordered.append({
            "word": word.rstrip(".,!?"),
            "status": results.get(clean, "NOT SPOKEN")
        })

    return jsonify({
        "recognized": recognized,
        "results": ordered
    })


@app.get("/get-grammar-questions")
def grammar_questions():
    count = int(request.args.get("count", 5))
    return jsonify(get_grammar_questions(count))


@app.get("/ping")
def ping():
    return "Backend running"


if __name__ == "__main__":
    app.run(port=5000, debug=True)
