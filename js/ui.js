/* ============================================
   UI System — HUD, Dialogue, Story, Quiz
   ============================================ */

const GameUI = (() => {
    let tangerineCountEl, statusMessageEl, dialogueBox, dialogueSpeaker, dialogueText;
    let storyOverlay, storyText, storyButton;
    let quizBox, quizSpeaker, quizQuestion, quizAnswers, quizResult;
    let currentStatusTimeout = null;

    function init() {
        tangerineCountEl = document.getElementById('tangerine-count');
        statusMessageEl = document.getElementById('status-message');
        dialogueBox = document.getElementById('dialogue-box');
        dialogueSpeaker = document.getElementById('dialogue-speaker');
        dialogueText = document.getElementById('dialogue-text');
        storyOverlay = document.getElementById('story-overlay');
        storyText = document.getElementById('story-text');
        storyButton = document.getElementById('story-button');
        quizBox = document.getElementById('quiz-box');
        quizSpeaker = document.getElementById('quiz-speaker');
        quizQuestion = document.getElementById('quiz-question');
        quizAnswers = document.getElementById('quiz-answers');
        quizResult = document.getElementById('quiz-result');
    }

    function updateTangerineCount(count) {
        tangerineCountEl.textContent = count;
        tangerineCountEl.style.transform = 'scale(1.4)';
        setTimeout(() => { tangerineCountEl.style.transform = 'scale(1)'; }, 200);
    }

    function setStatusMessage(msg, duration) {
        statusMessageEl.textContent = msg;
        statusMessageEl.parentElement.style.opacity = '1';
        if (currentStatusTimeout) clearTimeout(currentStatusTimeout);
        if (duration) {
            currentStatusTimeout = setTimeout(() => {
                statusMessageEl.parentElement.style.opacity = '0.7';
            }, duration);
        }
    }

    const stageMessages = [
        ['숲 속이 참 좋다~', '아, 버섯이다!', '귤 냄새가 나는 것 같아...', '느긋느긋~'],
        ['호수가 반짝반짝!', '물소리가 좋다~', '연꽃이 예쁘다!', '거북이 친구를 만날 것 같아!'],
        ['꽃이 가득하다!', '바람이 좋다~', '꿀벌 소리가 들려!', '거의 다 왔을 것 같아!'],
        ['황금빛이다!', '드디어 도착!', '귤 나무다!', '모두를 위해!'],
    ];

    function getRandomStageMessage(stage) {
        const msgs = stageMessages[Math.min(stage, 3)];
        return msgs[Math.floor(Math.random() * msgs.length)];
    }

    // ---- Dialogue system ----
    function showDialogue(speaker, text) {
        dialogueBox.classList.remove('hidden');
        dialogueSpeaker.textContent = speaker;

        if (speaker === '카피') {
            dialogueSpeaker.style.color = '#c8884e';
            dialogueSpeaker.textContent = '🐾 ' + speaker;
        } else {
            dialogueSpeaker.style.color = '#5a7a5a';
        }

        dialogueText.textContent = '';
        let idx = 0;
        const interval = setInterval(() => {
            if (idx < text.length) {
                dialogueText.textContent += text[idx];
                idx++;
                if (idx % 3 === 0) GameAudio.playBloop();
            } else {
                clearInterval(interval);
            }
        }, 40);
        return interval;
    }

    function hideDialogue() {
        dialogueBox.classList.add('hidden');
    }

    function isDialogueVisible() {
        return !dialogueBox.classList.contains('hidden');
    }

    // ---- Quiz system ----
    function showQuiz(npcName, quiz, onCorrect, onWrong) {
        quizBox.classList.remove('hidden');
        quizSpeaker.textContent = npcName + '의 퀴즈! 📝';
        quizQuestion.textContent = quiz.question;
        quizResult.textContent = '';
        quizAnswers.innerHTML = '';

        quiz.answers.forEach((answer, i) => {
            const btn = document.createElement('button');
            btn.textContent = answer;
            btn.onclick = () => handleQuizAnswer(i, quiz.correct, btn, onCorrect, onWrong);
            quizAnswers.appendChild(btn);
        });
    }

    function handleQuizAnswer(selectedIdx, correctIdx, selectedBtn, onCorrect, onWrong) {
        const buttons = quizAnswers.querySelectorAll('button');

        if (selectedIdx === correctIdx) {
            selectedBtn.classList.add('correct');
            buttons.forEach(b => b.disabled = true);
            quizResult.textContent = '🎉 정답이에요! 대단해요!';
            quizResult.style.color = '#4caf50';
            GameAudio.playBloop();
            setTimeout(() => {
                hideQuiz();
                if (onCorrect) onCorrect();
            }, 1200);
        } else {
            selectedBtn.classList.add('wrong');
            selectedBtn.disabled = true;
            quizResult.textContent = '❌ 아쉬워요! 귤 2개를 잃었어요... 다시 생각해 봐요~';
            quizResult.style.color = '#e57373';
            if (onWrong) onWrong();
            setTimeout(() => {
                selectedBtn.classList.remove('wrong');
            }, 500);
        }
    }

    function hideQuiz() {
        quizBox.classList.add('hidden');
    }

    // ---- Story screens ----
    function showStoryIntro(onStart) {
        storyOverlay.style.display = 'flex';
        storyOverlay.classList.remove('fade-out');

        const introLines = [
            '아주 먼 곳에, 따뜻한 온천 마을이 있었어요.',
            '',
            '그곳에는 세상에서 가장 느긋한',
            '카피바라 \'카피\'가 살고 있었지요.',
            '',
            '그런데 어느 날...',
            '온천에 귤이 다 떨어져 버렸어요! 🍊',
            '',
            '카피는 마을 친구들을 위해',
            '전설의 \'황금 귤 나무\'를 찾아',
            '여행을 떠나기로 했답니다.',
        ];

        storyText.textContent = '';
        let lineIdx = 0;
        let charIdx = 0;
        let skipped = false;

        function showAllText() {
            storyText.textContent = introLines.join('\n');
        }

        function showButton() {
            storyButton.classList.remove('hidden');
            storyButton.textContent = '여행을 시작하기';
            storyButton.onclick = () => {
                storyOverlay.classList.add('fade-out');
                storyOverlay.removeEventListener('click', handleSkip);
                setTimeout(() => {
                    storyOverlay.style.display = 'none';
                    if (onStart) onStart();
                }, 800);
            };
        }

        function handleSkip(e) {
            if (e.target === storyButton) return;
            if (skipped) return;
            skipped = true;
            clearInterval(typeInterval);
            showAllText();
            showButton();
        }
        storyOverlay.addEventListener('click', handleSkip);

        const typeInterval = setInterval(() => {
            if (lineIdx >= introLines.length) {
                clearInterval(typeInterval);
                showButton();
                return;
            }

            const line = introLines[lineIdx];
            if (charIdx < line.length) {
                storyText.textContent += line[charIdx];
                charIdx++;
            } else {
                storyText.textContent += '\n';
                lineIdx++;
                charIdx = 0;
            }
        }, 50);
    }

    function showStoryEnding(tangerineCount, onDone) {
        storyOverlay.style.display = 'flex';
        storyOverlay.classList.remove('fade-out');
        storyButton.classList.add('hidden');

        const endingLines = [
            '🎉 축하합니다! 🎉',
            '',
            '카피는 황금 귤 나무를 찾았어요!',
            '',
            `여행 중 ${tangerineCount}개의 귤을 모았고,`,
            '거북이 꼬부기와 오리 꽥이를 만나',
            '소중한 추억을 만들었답니다.',
            '',
            '카피는 귤을 가득 안고',
            '온천 마을로 돌아갔어요.',
            '',
            '마을 친구들과 함께',
            '따뜻한 귤 온천 파티를 열었답니다! 🧡',
            '',
            '~ 끝 ~',
        ];

        storyText.textContent = '';
        let lineIdx = 0;
        let charIdx = 0;

        const typeInterval = setInterval(() => {
            if (lineIdx >= endingLines.length) {
                clearInterval(typeInterval);
                storyButton.textContent = '다시 플레이하기';
                storyButton.classList.remove('hidden');
                storyButton.onclick = () => {
                    storyOverlay.classList.add('fade-out');
                    setTimeout(() => {
                        storyOverlay.style.display = 'none';
                        if (onDone) onDone();
                    }, 800);
                };
                return;
            }
            const line = endingLines[lineIdx];
            if (charIdx < line.length) {
                storyText.textContent += line[charIdx];
                charIdx++;
            } else {
                storyText.textContent += '\n';
                lineIdx++;
                charIdx = 0;
            }
        }, 50);
    }

    function showGameOver(onRestart) {
        storyOverlay.style.display = 'flex';
        storyOverlay.classList.remove('fade-out');
        storyButton.classList.add('hidden');

        const gameOverLines = [
            '😢 이런...',
            '',
            '카피가 모은 귤을 전부 잃어버렸어요!',
            '',
            '하지만 포기하지 않아요.',
            '카피는 다시 일어나',
            '처음부터 여행을 시작합니다!',
            '',
            '이번에는 퀴즈를 잘 풀어봐요! 💪',
        ];

        storyText.textContent = '';
        let lineIdx = 0;
        let charIdx = 0;

        const typeInterval = setInterval(() => {
            if (lineIdx >= gameOverLines.length) {
                clearInterval(typeInterval);
                storyButton.textContent = '다시 도전하기! 🍊';
                storyButton.classList.remove('hidden');
                storyButton.onclick = () => {
                    storyOverlay.classList.add('fade-out');
                    setTimeout(() => {
                        storyOverlay.style.display = 'none';
                        if (onRestart) onRestart();
                    }, 800);
                };
                return;
            }
            const line = gameOverLines[lineIdx];
            if (charIdx < line.length) {
                storyText.textContent += line[charIdx];
                charIdx++;
            } else {
                storyText.textContent += '\n';
                lineIdx++;
                charIdx = 0;
            }
        }, 50);
    }

    return {
        init, updateTangerineCount, setStatusMessage, getRandomStageMessage,
        showDialogue, hideDialogue, isDialogueVisible,
        showQuiz, hideQuiz,
        showStoryIntro, showStoryEnding, showGameOver,
    };
})();
