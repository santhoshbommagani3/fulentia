import speech_recognition as sr
from nltk.corpus import cmudict
from Levenshtein import distance


cmu = cmudict.dict()


def normalize_word(w):
    """Lowercase and remove non-alphabetic characters."""
    return ''.join(ch for ch in w.lower() if ch.isalpha())


def speech_to_text(wav_path):
    r = sr.Recognizer()
    try:
        with sr.AudioFile(wav_path) as source:
            r.adjust_for_ambient_noise(source, duration=0.2)
            audio = r.record(source)

        text = r.recognize_google(audio)
        print("[ASR]:", text)
        return text.lower()

    except sr.UnknownValueError:
        print("[ASR]: could not understand audio")
        return ""

    except sr.RequestError as e:
        print("[ASR]: request to Google failed:", e)
        return ""


def sentence_to_phonemes(sentence):
    """
    Converts reference sentence to phonemes.
    Returns: [(word, [phonemes])]
    """
    words = [normalize_word(w) for w in sentence.split()]
    phonemes = []

    for w in words:
        if w in cmu:
            phones = cmu[w][0]
            phones = [p.rstrip("0123456789") for p in phones]
            phonemes.append((w, phones))
        else:
            phonemes.append((w, []))

    return phonemes


def user_speech_to_phonemes(asr_text):
    """
    Converts recognized speech to phonemes.
    Returns: [(word, [phonemes])]
    """
    words = [normalize_word(w) for w in asr_text.split()]
    phonemes = []

    for w in words:
        if w in cmu:
            phones = cmu[w][0]
            phones = [p.rstrip("0123456789") for p in phones]
            phonemes.append((w, phones))
        else:
            phonemes.append((w, []))

    return phonemes




VOWELS = {
    "AA", "AE", "AH", "AO", "AW", "AY",
    "EH", "ER", "EY",
    "IH", "IY",
    "OW", "OY",
    "UH", "UW"
}

PHONEME_MAP = {
    "HH": "h", "L": "l", "S": "s", "N": "n", "D": "d", "R": "r",
    "K": "k", "M": "m", "B": "b", "P": "p", "F": "f", "V": "v",
    "TH": "th", "DH": "th", "SH": "sh", "CH": "ch", "JH": "j",
    "T": "t", "G": "g", "Z": "z", "Y": "y", "W": "w",

    "IY": "ee", "IH": "i",
    "EH": "e",  "AE": "a",
    "AH": "uh", "UH": "u",
    "UW": "oo",
    "AO": "aw", "AA": "ah",
    "ER": "er",
    "EY": "ay",
    "OW": "oh",
    "OY": "oy",
    "AW": "ow"
}


def syllabify_with_stress(phones):
    """
    Splits phonemes into syllables while preserving stress.
    Returns: [(phoneme_list, stress)]
    """
    syllables = []
    current = []
    stress = None

    for p in phones:
        if p[-1].isdigit():
            base = p[:-1]
            stress = int(p[-1])
        else:
            base = p

        if base in VOWELS and current:
            syllables.append((current, stress))
            current = []
            stress = None

        current.append(base)

    if current:
        syllables.append((current, stress))

    return syllables


def sentence_to_phonetic(sentence):
    """
    Returns teacher-style respelling with syllable breaks and stress.
    Example:
    she ti-ed RIB-uns ah-ROUND kra-ft BUN-duhlz
    """

    output_words = []

    for word in sentence.split():
        clean = normalize_word(word)

        if clean not in cmu:
            output_words.append(clean)
            continue

        phones = cmu[clean][0]
        syllables = syllabify_with_stress(phones)

        rendered = []
        for syl, stress in syllables:
            text = ""
            for p in syl:
                text += PHONEME_MAP.get(p, "")

            if stress == 1:
                text = text.upper()

            rendered.append(text)

        output_words.append("-".join(rendered))

    return " ".join(output_words)


 
def detect_pronunciation(ref_ph, user_ph, asr_text, reference_sentence):
    """
    Compares reference phonemes with user phonemes.

    ref_ph  = [(word, [phonemes])]
    user_ph = [(word, [phonemes])]

    Returns:
    {
        word: "CORRECT" | "MISPRONOUNCED" | "NOT SPOKEN"
    }
    """

    results = {}

    for i, (ref_word, ref_phones) in enumerate(ref_ph):

        if i >= len(user_ph):
            results[ref_word] = "NOT SPOKEN"
            continue

        user_word, user_phones = user_ph[i]

        if user_word != ref_word:
            results[ref_word] = "MISPRONOUNCED"
            continue

        if not ref_phones or not user_phones:
            results[ref_word] = "MISPRONOUNCED"
            continue

        d = distance(" ".join(ref_phones), " ".join(user_phones))

        if d == 0:
            results[ref_word] = "CORRECT"
        else:
            results[ref_word] = "MISPRONOUNCED"

    return results
