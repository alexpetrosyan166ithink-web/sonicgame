/**
 * Quiz Engine - Gamified grammar quiz system
 * Uses Web Audio API for retro sounds, CSS animations for characters
 */

class QuizEngine {
    constructor(quizData) {
        this.title = quizData.title;
        this.subtitle = quizData.subtitle;
        this.questions = quizData.questions;
        this.tips = quizData.tips;
        this.currentQuestion = 0;
        this.score = 0;
        this.wrongTopics = [];
        this.answered = false;
        this.audioCtx = null;

        this.happyChars = ['😄', '🥳', '🤩', '💪', '🎉', '👏', '⭐', '🏆', '✨', '🔥'];
        this.sadChars = ['🤦', '😵‍💫', '🫠', '😬', '🙈', '😅', '🤔', '😳', '🫣', '💀'];
        this.correctPhrases = ['AWESOME!', 'CORRECT!', 'NICE ONE!', 'PERFECT!', 'BRILLIANT!', 'NAILED IT!', 'GENIUS!', 'SUPERB!', 'WELL DONE!', 'GREAT JOB!'];
        this.wrongPhrases = ['OOPS!', 'NOT QUITE!', 'TRY HARDER!', 'SO CLOSE!', 'OH NO!', 'WHOOPSIE!', 'NICE TRY!', 'ALMOST!', 'UH OH!', 'KEEP GOING!'];

        this.init();
    }

    init() {
        this.renderStartScreen();
    }

    initAudio() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playCorrectSound() {
        this.initAudio();
        const ctx = this.audioCtx;
        const now = ctx.currentTime;

        // Happy ascending chime
        [523, 659, 784].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.15, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.3);
        });
    }

    playWrongSound() {
        this.initAudio();
        const ctx = this.audioCtx;
        const now = ctx.currentTime;

        // Descending buzzer
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.4);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
    }

    playVictorySound() {
        this.initAudio();
        const ctx = this.audioCtx;
        const now = ctx.currentTime;

        [523, 587, 659, 698, 784, 880, 988, 1047].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.12, now + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.12);
            osc.stop(now + i * 0.12 + 0.25);
        });
    }

    playFailSound() {
        this.initAudio();
        const ctx = this.audioCtx;
        const now = ctx.currentTime;

        [400, 350, 300, 250].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.12, now + i * 0.2);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.2 + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.2);
            osc.stop(now + i * 0.2 + 0.3);
        });
    }

    randomFrom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    renderStartScreen() {
        const container = document.getElementById('quiz-root');
        container.innerHTML = `
            <div class="quiz-header">
                <h1 class="quiz-title">${this.title}</h1>
                <p class="quiz-subtitle">${this.subtitle}</p>
            </div>
            <div class="start-screen">
                <div class="character-container">
                    <div class="character">📝</div>
                </div>
                <p>10 questions to test your skills.<br>Score 7 or more to pass!<br>Ready?</p>
                <button class="start-btn" id="start-btn">START QUIZ</button>
            </div>
        `;
        document.getElementById('start-btn').addEventListener('click', () => this.startQuiz());
    }

    startQuiz() {
        this.currentQuestion = 0;
        this.score = 0;
        this.wrongTopics = [];
        this.renderQuestion();
    }

    renderQuestion() {
        const q = this.questions[this.currentQuestion];
        this.answered = false;

        const container = document.getElementById('quiz-root');
        container.innerHTML = `
            <div class="progress-container">
                <div class="progress-info">
                    <span class="progress-question">Q${this.currentQuestion + 1} / ${this.questions.length}</span>
                    <span class="progress-score">SCORE: ${this.score * 10}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(this.currentQuestion / this.questions.length) * 100}%"></div>
                </div>
            </div>
            <div class="question-area active">
                <div class="question-text">${q.question}</div>
                <div class="options-grid">
                    ${q.options.map((opt, i) => `
                        <button class="option-btn" data-index="${i}">${opt}</button>
                    `).join('')}
                </div>
            </div>
            <div class="character-container">
                <div class="character" id="character">🤓</div>
            </div>
            <div class="feedback-text" id="feedback"></div>
            <button class="next-btn" id="next-btn">NEXT ▶</button>
        `;

        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleAnswer(e));
        });
        document.getElementById('next-btn').addEventListener('click', () => this.nextQuestion());
    }

    handleAnswer(e) {
        if (this.answered) return;
        this.answered = true;

        const selected = parseInt(e.target.dataset.index);
        const q = this.questions[this.currentQuestion];
        const correct = selected === q.answer;
        const character = document.getElementById('character');
        const feedback = document.getElementById('feedback');
        const buttons = document.querySelectorAll('.option-btn');

        // Disable all buttons
        buttons.forEach(btn => btn.classList.add('disabled'));

        // Highlight correct answer
        buttons[q.answer].classList.add('correct');

        if (correct) {
            this.score++;
            this.playCorrectSound();
            character.textContent = this.randomFrom(this.happyChars);
            character.className = 'character happy';
            feedback.textContent = this.randomFrom(this.correctPhrases);
            feedback.className = 'feedback-text correct-text';
        } else {
            e.target.classList.add('wrong');
            this.playWrongSound();
            character.textContent = this.randomFrom(this.sadChars);
            character.className = 'character sad';
            feedback.textContent = this.randomFrom(this.wrongPhrases) + ' Answer: ' + q.options[q.answer];
            feedback.className = 'feedback-text wrong-text';
            if (q.topic && !this.wrongTopics.includes(q.topic)) {
                this.wrongTopics.push(q.topic);
            }
        }

        document.getElementById('next-btn').classList.add('visible');
    }

    nextQuestion() {
        this.currentQuestion++;
        if (this.currentQuestion < this.questions.length) {
            this.renderQuestion();
        } else {
            this.showResults();
        }
    }

    showResults() {
        const passed = this.score >= 7;
        const percentage = this.score * 10;

        if (passed) {
            this.playVictorySound();
        } else {
            this.playFailSound();
        }

        const tipsHTML = this.wrongTopics.length > 0
            ? `<div class="results-tips">
                <h3>📖 STUDY THESE TOPICS:</h3>
                <ul>
                    ${this.wrongTopics.map(topic => {
                        const tip = this.tips[topic] || topic;
                        return `<li>${tip}</li>`;
                    }).join('')}
                </ul>
               </div>`
            : '';

        const container = document.getElementById('quiz-root');
        container.innerHTML = `
            ${passed ? '<div class="confetti-container" id="confetti"></div>' : ''}
            <div class="results-screen active">
                <div class="results-icon">${passed ? '🏆' : '📚'}</div>
                <h2 class="results-title ${passed ? 'pass' : 'fail'}">
                    ${passed ? 'CONGRATULATIONS!' : 'KEEP PRACTICING!'}
                </h2>
                <div class="results-score">
                    ${this.score} / ${this.questions.length} (${percentage}%)
                </div>
                <div class="results-message">
                    ${passed
                        ? 'Amazing work! You really know your stuff! Keep up the great learning!'
                        : 'Don\'t give up! Every mistake is a chance to learn. Review the topics below and try again!'}
                </div>
                ${passed ? '' : tipsHTML}
                <div class="results-buttons">
                    <button class="results-buttons btn-retry" onclick="location.reload()">TRY AGAIN</button>
                    <a href="../" class="results-buttons btn-back">ALL QUIZZES</a>
                </div>
            </div>
        `;

        if (passed) {
            this.launchConfetti();
        }
    }

    launchConfetti() {
        const container = document.getElementById('confetti');
        if (!container) return;
        const colors = ['#FFD700', '#DD0000', '#00FFFF', '#00CC44', '#FF69B4', '#FFFF00', '#FF8800'];
        for (let i = 0; i < 60; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = Math.random() * 100 + '%';
            piece.style.background = colors[Math.floor(Math.random() * colors.length)];
            piece.style.animationDuration = (2 + Math.random() * 3) + 's';
            piece.style.animationDelay = Math.random() * 2 + 's';
            piece.style.width = (6 + Math.random() * 8) + 'px';
            piece.style.height = (6 + Math.random() * 8) + 'px';
            piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
            piece.style.transform = `rotate(${Math.random() * 360}deg)`;
            container.appendChild(piece);
        }
    }
}
