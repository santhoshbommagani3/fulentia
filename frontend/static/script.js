document.addEventListener("DOMContentLoaded", () => {

    let sentences = [];
    let current = 0;

    let correctCount = 0;
    let mispronouncedCount = 0;
    let notSpokenCount = 0;

    let listenUsed = false;
    let recordStarted = false;


    let audioContext = null;
    let processor = null;
    let input = null;
    let stream = null;

    let recordedData = [];
    let userAudioURL = null;
    const userAudio = new Audio();

    let grammarCount = 5;
    let grammarQuestions = [];
    let grammarIndex = 0;
    let grammarScore = 0;
    let selectedGrammarOption = null;
    let answered = false;

    const modeScreen = document.getElementById("mode-screen");
    const diffScreen = document.getElementById("difficulty-screen");
    const sessScreen = document.getElementById("session-screen");
    const sumScreen = document.getElementById("summary-screen");
    const vocabScreen = document.getElementById("vocab-screen");
    const vocabNextFrontBtn = document.getElementById("vocab-next-front");
    const vocabExitFrontBtn = document.getElementById("vocab-exit-front");

    
    let seenVocabWords = new Set();

    const grammarSetup = document.getElementById("grammar-setup");
    const grammarSession = document.getElementById("grammar-session");
    const grammarSummary = document.getElementById("grammar-summary");

    const modePronunciation = document.getElementById("mode-pronunciation");
    const modeGrammar = document.getElementById("mode-grammar");
    const modeVocab = document.getElementById("mode-vocab");

    const sentenceBox = document.getElementById("sentence-box");
    const sentencePhoneticBox = document.getElementById("sentence-phonetic");
    const progress = document.getElementById("progress");
    const feedbackBox = document.getElementById("feedback");

    const listenBtn = document.getElementById("listen-btn");
    const recordBtn = document.getElementById("record-btn");
    const stopBtn = document.getElementById("stop-btn");
    const nextBtn = document.getElementById("next-btn");

    const playbackBox = document.getElementById("playback-compare");
    const playUserBtn = document.getElementById("play-user");
    const playCorrectBtn = document.getElementById("play-correct");

const vocabWord = document.getElementById("vocab-word");
const vocabMeaning = document.getElementById("vocab-meaning");
const vocabExample = document.getElementById("vocab-example");
const vocabCard = document.getElementById("vocab-card");
const vocabNextBtn = document.getElementById("vocab-next");
const vocabExitBtn = document.getElementById("vocab-exit");
const audioBtn = document.getElementById("play-audio");

let vocabAudioURL = "";

async function fetchVocabWord() {
    if (!vocabWord) return;

    vocabCard?.classList.remove("flipped");

    vocabWord.innerText = "Loading...";
    vocabMeaning.innerText = "";
    vocabExample.innerText = "";
    vocabAudioURL = "";
    audioBtn && (audioBtn.style.display = "inline-block");


    try {
        let attempts = 0;
        let data = null;

        while (attempts < 10) {
            const res = await fetch("/get-vocab-word");
            data = await res.json();

            if (!seenVocabWords.has(data.word)) {
                break;
            }
            attempts++;
        }

        if (!data || seenVocabWords.has(data.word)) {
            vocabWord.innerText = "No new words left!";
            return;
        }

        seenVocabWords.add(data.word);

        vocabWord.innerText = data.word;
        vocabMeaning.innerText = `Meaning: ${data.meaning}`;
        vocabExample.innerText = data.example
            ? `Example: "${data.example}"`
            : "";

        if (data.audio) {
            vocabAudioURL = data.audio;
            audioBtn && (audioBtn.style.display = "inline-block");
        }

    } catch (err) {
        vocabWord.innerText = "Failed to load word";
    }
}


vocabCard?.addEventListener("click", () => {
    vocabCard.classList.toggle("flipped");
});

vocabNextBtn?.addEventListener("click", e => {
    e.stopPropagation();
    vocabCard.classList.remove("flipped");
    fetchVocabWord();
});

vocabExitBtn?.addEventListener("click", () => {
    vocabScreen.classList.add("hidden");
    modeScreen.classList.remove("hidden");
});
vocabNextFrontBtn?.addEventListener("click", e => {
    e.stopPropagation(); 
    vocabCard.classList.remove("flipped");
    fetchVocabWord();
});

vocabExitFrontBtn?.addEventListener("click", e => {
    e.stopPropagation(); 
    vocabScreen.classList.add("hidden");
    modeScreen.classList.remove("hidden");
});

audioBtn?.addEventListener("click", e => {
    e.stopPropagation();

    if (vocabAudioURL) {
        new Audio(vocabAudioURL).play();
    } else if (vocabWord?.innerText) {
        const u = new SpeechSynthesisUtterance(vocabWord.innerText);
        u.lang = "en-US";
        u.rate = 0.85;
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
    }
});


    const startGrammarBtn = document.getElementById("start-grammar");
    const grammarQuestionBox = document.getElementById("grammar-question");
    const grammarOptionsBox = document.getElementById("grammar-options");
    const grammarProgress = document.getElementById("grammar-progress");
    const grammarFeedback = document.getElementById("grammar-feedback");
    const grammarScoreText = document.getElementById("grammar-score");


    function speak(text, rate = 0.85) {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "en-US";
        u.rate = rate;
        speechSynthesis.speak(u);
    }

    modePronunciation?.addEventListener("click", () => {
        modeScreen.classList.add("hidden");
        diffScreen.classList.remove("hidden");
    });

    modeGrammar?.addEventListener("click", () => {
        modeScreen.classList.add("hidden");
        grammarSetup.classList.remove("hidden");
    });

    modeVocab?.addEventListener("click", () => {
    modeScreen.classList.add("hidden");
    vocabScreen.classList.remove("hidden");

    fetchVocabWord();
});

    document.querySelectorAll(".level-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            diffScreen.classList.add("hidden");
            sessScreen.classList.remove("hidden");
            correctCount = 0;
mispronouncedCount = 0;
notSpokenCount = 0;

            const res = await fetch(`/get-sentences?level=${btn.dataset.level}&count=10`);
            const data = await res.json();

            sentences = data.sentences.map(s => s.text);
            current = 0;
            loadSentence();
        });
    });

    function loadSentence() {
        const sentence = sentences[current];

        progress.innerText = `Sentence ${current + 1} / ${sentences.length}`;
        sentenceBox.innerText = sentence;
        sentencePhoneticBox.innerText = "";
        feedbackBox.innerHTML = "";

        playbackBox.style.display = "none";
        nextBtn.classList.add("hidden");

        recordBtn.disabled = false;
        stopBtn.disabled = true;

        listenUsed = false;
        recordStarted = false;
        listenBtn.disabled = false;

    loadSentencePhonetic(sentence);
}


    listenBtn?.addEventListener("click", () => {
        if (listenUsed || recordStarted) return;

        speak(sentences[current]);
        listenUsed = true;
        listenBtn.disabled = true;
    });


    async function loadSentencePhonetic(sentence) {
        const res = await fetch(`/sentence-phonetic?sentence=${encodeURIComponent(sentence)}`);
        const data = await res.json();
        sentencePhoneticBox.innerText = data.phonetic;
    }

    recordBtn?.addEventListener("click", async () => {
        recordStarted = true;
        listenBtn.disabled = true;

        recordedData = [];
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new AudioContext({ sampleRate: 16000 });

        input = audioContext.createMediaStreamSource(stream);
        processor = audioContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = e =>
            recordedData.push(new Float32Array(e.inputBuffer.getChannelData(0)));

        input.connect(processor);
        processor.connect(audioContext.destination);

        recordBtn.disabled = true;
        stopBtn.disabled = false;
    });


    stopBtn?.addEventListener("click", async () => {
        processor.disconnect();
        input.disconnect();
        stream.getTracks().forEach(t => t.stop());
        await audioContext.close();

        stopBtn.disabled = true;

        const blob = createWavBlob(recordedData, 16000);
        userAudioURL = URL.createObjectURL(blob);

        await evaluateAudio(blob);
    });

    async function evaluateAudio(blob) {
        const form = new FormData();
        form.append("sentence", sentences[current]);
        form.append("audio", blob, "audio.wav");

        const res = await fetch("/evaluate", { method: "POST", body: form });
        const data = await res.json();
        showFeedback(data.results);
    }

    function showFeedback(results) {
    feedbackBox.innerHTML = "";

    results.forEach(r => {
        const span = document.createElement("span");
        span.innerText = r.word;

        if (r.status === "CORRECT") {
            span.className = "correct";
            correctCount++;
        } 
        else if (r.status === "MISPRONOUNCED") {
            span.className = "mispronounced";
            mispronouncedCount++;
            span.onclick = () => speak(r.word);
        } 
        else {
            span.className = "not-spoken";
            notSpokenCount++;
            span.onclick = () => speak(r.word);
        }

        feedbackBox.appendChild(span);
    });

    playbackBox.style.display = "flex";
    nextBtn.classList.remove("hidden");
}


    playUserBtn?.addEventListener("click", () => {
        if (!userAudioURL) return;
        userAudio.src = userAudioURL;
        userAudio.play();
    });

    playCorrectBtn?.addEventListener("click", () => {
        speak(sentences[current]);
    });

    nextBtn?.addEventListener("click", () => {
        current++;
        if (current < sentences.length) {
            loadSentence();
        } else {
    sessScreen.classList.add("hidden");

    document.getElementById("sum-correct").innerText =
        `Correct words: ${correctCount}`;

    document.getElementById("sum-wrong").innerText =
        `Mispronounced words: ${mispronouncedCount}`;

    document.getElementById("sum-missing").innerText =
        `Not spoken: ${notSpokenCount}`;

    document.getElementById("sum-weak").innerText =
        `Total words analyzed: ${correctCount + mispronouncedCount + notSpokenCount}`;

    sumScreen.classList.remove("hidden");
}

    });

    document.querySelectorAll(".g-count").forEach(btn => {
        btn.addEventListener("click", () => {
            grammarCount = parseInt(btn.dataset.count);
            document.querySelectorAll(".g-count").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
        });
    });

    startGrammarBtn?.addEventListener("click", async () => {
        const res = await fetch(`/get-grammar-questions?count=${grammarCount}`);
        grammarQuestions = await res.json();

        grammarIndex = 0;
        grammarScore = 0;

        grammarSetup.classList.add("hidden");
        grammarSession.classList.remove("hidden");

        loadGrammarQuestion();
    });

    function loadGrammarQuestion() {
        const q = grammarQuestions[grammarIndex];

        grammarProgress.innerText =
            `Question ${grammarIndex + 1} / ${grammarQuestions.length}`;

        grammarQuestionBox.innerText = q.sentence;
        grammarOptionsBox.innerHTML = "";
        grammarFeedback.innerHTML = "";

        selectedGrammarOption = null;
        answered = false;

        q.options.forEach(opt => {
            const btn = document.createElement("button");
            btn.className = "grammar-option";
            btn.innerText = opt;

            btn.onclick = () => {
                if (answered) return;
                document.querySelectorAll(".grammar-option")
                    .forEach(b => b.classList.remove("selected"));
                btn.classList.add("selected");
                selectedGrammarOption = opt;
            };

            grammarOptionsBox.appendChild(btn);
        });

        const controls = document.createElement("div");
        controls.id = "grammar-controls";

        const submitBtn = document.createElement("button");
        submitBtn.innerText = "Submit";
        submitBtn.onclick = submitGrammarAnswer;

        const nextBtn = document.createElement("button");
        nextBtn.innerText = "Next";
        nextBtn.disabled = true;

        submitBtn.onclick = () => {
            submitGrammarAnswer();
            nextBtn.disabled = false;
        };

        nextBtn.onclick = () => {
            grammarIndex++;
            if (grammarIndex < grammarQuestions.length) {
                loadGrammarQuestion();
            } else {
                endGrammar();
            }
        };

        controls.appendChild(submitBtn);
        controls.appendChild(nextBtn);
        grammarOptionsBox.appendChild(controls);
    }

    function submitGrammarAnswer() {
        if (!selectedGrammarOption || answered) return;
        answered = true;

        const q = grammarQuestions[grammarIndex];

        document.querySelectorAll(".grammar-option").forEach(btn => {
            const opt = btn.innerText;

            if (opt === q.answer) {
                btn.classList.add("correct");
            }

            if (opt === selectedGrammarOption && opt !== q.answer) {
                btn.classList.add("wrong");
            }

            btn.disabled = true;
        });

        if (selectedGrammarOption === q.answer) {
            grammarScore++;
            grammarFeedback.innerHTML =
                `<strong>Correct!</strong><br><small>${q.rule || ""}</small>`;
        } else {
            grammarFeedback.innerHTML =
                `<strong>Correct answer:</strong> ${q.answer}<br><small>${q.rule || ""}</small>`;
        }
    }

    function endGrammar() {
        grammarSession.classList.add("hidden");
        grammarSummary.classList.remove("hidden");
        grammarScoreText.innerText =
            `You scored ${grammarScore} / ${grammarQuestions.length}`;
    }



    function createWavBlob(buffers, sampleRate) {
        const samples = mergeBuffers(buffers);
        return new Blob([encodeWAV(samples, sampleRate)], { type: "audio/wav" });
    }

    function mergeBuffers(buffers) {
        let length = buffers.reduce((a, b) => a + b.length, 0);
        let merged = new Float32Array(length);
        let offset = 0;
        buffers.forEach(b => {
            merged.set(b, offset);
            offset += b.length;
        });
        return merged;
    }

    function encodeWAV(samples, sampleRate) {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);

        const write = (o, s) =>
            [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));

        write(0, "RIFF");
        view.setUint32(4, 36 + samples.length * 2, true);
        write(8, "WAVEfmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        write(36, "data");
        view.setUint32(40, samples.length * 2, true);

        let offset = 44;
        samples.forEach(s => {
            s = Math.max(-1, Math.min(1, s));
            view.setInt16(offset, s * 0x7fff, true);
            offset += 2;
        });

        return buffer;
    }

});
