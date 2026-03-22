/* ============================================
   Game Engine — Loop, Camera, State Machine
   ============================================ */

const GameEngine = (() => {
    let canvas, ctx;
    let capybara;
    let lastTime = 0;
    let gameTime = 0;
    let score = 0;
    let state = 'STORY_INTRO'; // STORY_INTRO, PLAYING, DIALOGUE, QUIZ, STORY_ENDING
    let currentDialogueNPC = null;
    let dialogueTypeInterval = null;
    let statusMsgTimer = 0;
    let lastStage = -1;
    let endingTriggered = false;
    let pendingNPC = null; // NPC clicked from far away — walk there first

    // Falling tangerines from the sky
    let fallingTangerines = [];
    let fallingSpawnTimer = 0;
    let fallingSpawnInterval = 3.0;
    let fallingCaughtCount = 0;  // how many falling tangerines caught
    let nextIsGiant = false;     // flag: spawn giant on next drop

    let fallingBombs = [];
    let bombSpawnTimer = 0;
    let bombSpawnInterval = 8.0; // Wait 8s before first bomb

    function init(canvasEl) {
        canvas = canvasEl;
        ctx = canvas.getContext('2d');
    }

    function start() {
        const groundY = canvas.height * GameWorld.GROUND_RATIO;
        capybara = new Capybara(80, groundY - 35, canvas.height);
        GameWorld.init(canvas.height);

        // Input handler — set capybara target
        GameInput.onClick((clickX, clickY) => {
            if (state !== 'PLAYING') return;

            const worldClickX = clickX + Renderer.getCameraX();

            // Check signpost interactions first
            const signposts = GameWorld.getSignposts();
            for (const post of signposts) {
                const sx = post.x - Renderer.getCameraX();
                if (Math.abs(sx - clickX) < 40 && Math.abs(post.y - clickY - canvas.height * 0.22) < 50) {
                    if (post.isNear(capybara.getCenterX(), capybara.getCenterY())) {
                        showSignpostMessage(post);
                        return;
                    }
                }
            }

            // Check NPC interactions — click to walk over and talk
            const npcs = GameWorld.getNPCs();
            for (const npc of npcs) {
                const sx = npc.x - Renderer.getCameraX();
                if (Math.abs(sx - clickX) < 60) {
                    if (npc.isNear(capybara.getCenterX(), capybara.getCenterY())) {
                        // Already close — start dialogue immediately
                        startDialogue(npc);
                    } else {
                        // Far away — walk to the NPC first
                        pendingNPC = npc;
                        capybara.setTarget(npc.x - 40);
                        GameUI.setStatusMessage(`${npc.name}에게 걸어가는 중...`, 3000);
                    }
                    return;
                }
            }

            capybara.setTarget(worldClickX);
        });

        score = 0;
        fallingBombs = [];
        fallingTangerines = [];
        GameUI.updateTangerineCount(0);
        lastTime = performance.now();
        gameLoop(lastTime);
    }

    function showSignpostMessage(post) {
        GameUI.setStatusMessage(post.message, 3000);
        GameAudio.playBloop();
    }

    function startDialogue(npc) {
        if (state !== 'PLAYING') return;
        npc.resetDialogue();
        currentDialogueNPC = npc;
        state = 'DIALOGUE';
        capybara.setTarget(null);
        advanceDialogue();
    }

    function advanceDialogue() {
        if (!currentDialogueNPC) return;
        const line = currentDialogueNPC.getNextDialogue();
        if (line) {
            if (dialogueTypeInterval) clearInterval(dialogueTypeInterval);
            const speaker = line.speaker || currentDialogueNPC.name;
            const text = line.text || line;
            dialogueTypeInterval = GameUI.showDialogue(speaker, text);
            GameInput.setDialogueCallback(() => {
                advanceDialogue();
            });
        } else {
            endDialogue();
        }
    }

    function endDialogue() {
        GameUI.hideDialogue();
        GameInput.clearDialogueCallback();
        dialogueTypeInterval = null;

        // If NPC has a quiz that hasn't been passed, show quiz
        if (currentDialogueNPC && currentDialogueNPC.quiz && !currentDialogueNPC.quizPassed) {
            state = 'QUIZ';
            const npc = currentDialogueNPC;
            GameUI.showQuiz(npc.name, npc.quiz, () => {
                // Quiz answered correctly!
                npc.quizPassed = true;
                currentDialogueNPC = null;
                state = 'PLAYING';
                GameUI.setStatusMessage('🎉 퀴즈 통과! 앞으로 갈 수 있어!', 3000);
            }, () => {
                // Wrong answer — lose 2 tangerines
                score = Math.max(0, score - 2);
                GameUI.updateTangerineCount(score);
                if (score <= 0) {
                    // Game over!
                    GameUI.hideQuiz();
                    currentDialogueNPC = null;
                    state = 'STORY_ENDING';
                    GameUI.showGameOver(() => {
                        endingTriggered = false;
                        score = 0;
                        state = 'PLAYING';
                        capybara = new Capybara(80, canvas.height * GameWorld.GROUND_RATIO - 35, canvas.height);
                        GameWorld.init(canvas.height);
                        GameUI.updateTangerineCount(0);
                        Renderer.setCameraX(0);
                        lastStage = -1;
                        fallingTangerines = [];
                        fallingBombs = [];
                    });
                }
            });
        } else {
            currentDialogueNPC = null;
            state = 'PLAYING';
        }
    }

    function gameLoop(timestamp) {
        const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
        lastTime = timestamp;
        gameTime += dt;

        if (state === 'PLAYING' || state === 'DIALOGUE') {
            update(dt);
            render();
        }

        requestAnimationFrame(gameLoop);
    }

    function update(dt) {
        if (state === 'PLAYING') {
            capybara.update(dt);

            // Check if capybara arrived at a pending NPC
            if (pendingNPC && pendingNPC.isNear(capybara.getCenterX(), capybara.getCenterY())) {
                const npc = pendingNPC;
                pendingNPC = null;
                capybara.setTarget(null);
                startDialogue(npc);
            }

            // E key to talk to nearby NPCs
            if (GameInput.isKeyDown('KeyE')) {
                const npcs = GameWorld.getNPCs();
                for (const npc of npcs) {
                    if (npc.isNear(capybara.getCenterX(), capybara.getCenterY())) {
                        startDialogue(npc);
                        break;
                    }
                }
            }

            // Camera follows capybara
            const targetCamX = capybara.getCenterX() - canvas.width * 0.35;
            const camX = Renderer.getCameraX();
            const newCamX = camX + (targetCamX - camX) * 0.05;
            Renderer.setCameraX(Math.max(0, Math.min(newCamX, GameWorld.WORLD_WIDTH - canvas.width)));

            // ---- Falling tangerines ----
            fallingSpawnTimer += dt;
            if (fallingSpawnTimer >= fallingSpawnInterval) {
                fallingSpawnTimer = 0;
                fallingSpawnInterval = 2.0 + Math.random() * 3.0; // 2~5s
                const spawnOffsetX = (Math.random() - 0.3) * canvas.width * 0.5;
                const spawnX = capybara.getCenterX() + spawnOffsetX;
                const giant = nextIsGiant;
                nextIsGiant = false;
                fallingTangerines.push(new FallingTangerine(spawnX, -40, giant));
            }

            // Update and check collisions for falling tangerines
            fallingTangerines.forEach(ft => {
                ft.update(dt, canvas.height);
                if (!ft.collected && !ft.dead &&
                    ft.checkCollision(capybara.x, capybara.y, capybara.width, capybara.height)) {
                    ft.collected = true;
                    if (ft.isGiant) {
                        score += 5;
                        GameUI.updateTangerineCount(score);
                        GameUI.setStatusMessage('🌟 대왕귤 GET! 귤 5개 획득!', 2500);
                        Renderer.addParticle(ft.x, ft.y, '#ffd700', 20);
                        Renderer.addParticle(ft.x, ft.y, '#ff8c42', 12);
                    } else {
                        score++;
                        fallingCaughtCount++;
                        GameUI.updateTangerineCount(score);
                        GameUI.setStatusMessage('하늘에서 귤이! 럭키~! 🍊', 2000);
                        Renderer.addParticle(ft.x, ft.y, '#ff8c42', 8);
                        Renderer.addParticle(ft.x, ft.y, '#ffd700', 5);
                        // Every 5 catches, next drop is a giant!
                        if (fallingCaughtCount % 5 === 0) {
                            nextIsGiant = true;
                            GameUI.setStatusMessage('⭐ 5개 달성! 대왕귤이 온다!', 2500);
                        }
                    }
                    GameAudio.playCollect();
                }
            });
            fallingTangerines = fallingTangerines.filter(ft => !ft.dead && !ft.collected);

            // ---- Falling bombs ----
            bombSpawnTimer += dt;
            if (bombSpawnTimer >= bombSpawnInterval) {
                bombSpawnTimer = 0;
                bombSpawnInterval = 6.0 + Math.random() * 6.0; // 6~12s
                const spawnOffsetX = (Math.random() - 0.5) * canvas.width * 0.8;
                const spawnX = capybara.getCenterX() + spawnOffsetX;
                fallingBombs.push(new FallingBomb(spawnX, -40));
            }

            // Update and check collisions for bombs
            fallingBombs.forEach(fb => {
                fb.update(dt, canvas.height);
                if (fb.dead && !fb.exploded) {
                    fb.exploded = true;
                    // Explosion particles when hitting ground
                    Renderer.addParticle(fb.x, fb.y, '#ff3300', 8);
                    Renderer.addParticle(fb.x, fb.y, '#333333', 10);
                    GameAudio.playBloop(); // use bloop as explosion sound proxy
                }
                
                if (!fb.exploded && !fb.dead &&
                    fb.checkCollision(capybara.x, capybara.y, capybara.width, capybara.height)) {
                    fb.exploded = true;
                    Renderer.addParticle(fb.x, fb.y, '#ff3300', 20);
                    Renderer.addParticle(fb.x, fb.y, '#333333', 15);
                    GameAudio.playBloop();
                    
                    // Bomb hit! Game Over logic
                    GameUI.hideQuiz();
                    currentDialogueNPC = null;
                    state = 'STORY_ENDING';
                    GameUI.showGameOver(() => {
                        endingTriggered = false;
                        score = 0;
                        state = 'PLAYING';
                        capybara = new Capybara(80, canvas.height * GameWorld.GROUND_RATIO - 35, canvas.height);
                        GameWorld.init(canvas.height);
                        GameUI.updateTangerineCount(0);
                        Renderer.setCameraX(0);
                        lastStage = -1;
                        fallingTangerines = [];
                        fallingBombs = [];
                    });
                }
            });
            fallingBombs = fallingBombs.filter(fb => !fb.dead && !fb.exploded);

            // Tangerine collection
            const tangerines = GameWorld.getTangerines();
            tangerines.forEach(t => {
                if (!t.collected && t.checkCollision(capybara.x, capybara.y, capybara.width, capybara.height)) {
                    t.collected = true;
                    score++;
                    GameUI.updateTangerineCount(score);
                    GameUI.setStatusMessage('귤을 찾았다! 뾰로롱~', 2000);
                    GameAudio.playCollect();
                    Renderer.addParticle(t.x, t.y, '#ff8c42', 8);
                    Renderer.addParticle(t.x, t.y, '#ffd700', 5);
                }
            });

            // Stage change detection
            const currentStage = GameWorld.getStage(Renderer.getCameraX(), canvas.width);
            if (currentStage !== lastStage) {
                lastStage = currentStage;
                const stageNames = GameWorld.getStageNames();
                GameUI.setStatusMessage(`📍 ${stageNames[currentStage]}`, 3000);

                // Water ambience — only during lake stage
                if (currentStage === 1) {
                    GameAudio.startWaterAmbience();
                } else {
                    GameAudio.stopWaterAmbience();
                }
            }

            // Random status messages
            statusMsgTimer += dt;
            if (statusMsgTimer > 8) {
                statusMsgTimer = 0;
                const currentStage2 = GameWorld.getStage(Renderer.getCameraX(), canvas.width);
                GameUI.setStatusMessage(GameUI.getRandomStageMessage(currentStage2), 4000);
            }

            // NPC quiz blocking — can't go past NPC if quiz not passed
            const npcs = GameWorld.getNPCs();
            for (const npc of npcs) {
                if (npc.quiz && !npc.quizPassed) {
                    const capCenterX = capybara.getCenterX();
                    // Block going right past NPC
                    if (capCenterX > npc.x - 30 && capCenterX < npc.x + 200) {
                        capybara.x = npc.x - 30 - capybara.width / 2;
                    }
                }
            }

            // Ending trigger
            if (!endingTriggered && capybara.getCenterX() > 6100) {
                endingTriggered = true;
                state = 'STORY_ENDING';
                capybara.setTarget(null);
                GameAudio.stopBGM();
                GameAudio.playFanfare();
                setTimeout(() => {
                    GameUI.showStoryEnding(score, () => {
                        // Reset game
                        endingTriggered = false;
                        score = 0;
                        state = 'PLAYING';
                        capybara = new Capybara(80, canvas.height * GameWorld.GROUND_RATIO - 35, canvas.height);
                        GameWorld.init(canvas.height);
                        GameUI.updateTangerineCount(0);
                        Renderer.setCameraX(0);
                        lastStage = -1;
                        fallingTangerines = [];
                        fallingBombs = [];
                        GameAudio.playBGM();
                    });
                }, 2000);
            }
        }
    }

    function render() {
        Renderer.clear();

        const stage = GameWorld.getStage(Renderer.getCameraX(), canvas.width);
        const stageProgress = GameWorld.getStageProgress(Renderer.getCameraX(), canvas.width);
        const groundY = canvas.height * GameWorld.GROUND_RATIO;

        // Background layers
        Renderer.drawSky(stageProgress);
        Renderer.drawClouds(gameTime);
        Renderer.drawFarMountains(GameWorld.WORLD_WIDTH);
        Renderer.drawMidLayer(stage, GameWorld.WORLD_WIDTH);

        // Stage-specific decorations (behind ground)
        if (stage === 0 || Renderer.getCameraX() < 2200) Renderer.drawForestDecor(gameTime);
        if (stage === 1 || (Renderer.getCameraX() > 1800 && Renderer.getCameraX() < 4200)) Renderer.drawLakeDecor(gameTime);
        if (stage === 2 || (Renderer.getCameraX() > 3800 && Renderer.getCameraX() < 6200)) Renderer.drawFlowerHillDecor(gameTime);

        // Ground
        Renderer.drawGround(groundY, stage);

        // Golden tree rendered AFTER ground so it's fully visible
        if (stage === 3 || Renderer.getCameraX() > 4800) Renderer.drawGoldenTreeDecor(gameTime);

        // Signposts
        const signposts = GameWorld.getSignposts();
        signposts.forEach(post => {
            const isNear = post.isNear(capybara.getCenterX(), capybara.getCenterY());
            Renderer.drawSignpost(post.x, groundY, post.message, isNear, gameTime);
        });

        // Tangerines (ground)
        const renderCtx = Renderer.getCtx();
        const tangerines = GameWorld.getTangerines();
        tangerines.forEach(t => t.draw(renderCtx, Renderer.getCameraX(), gameTime));

        // Falling tangerines (sky)
        fallingTangerines.forEach(ft => ft.draw(renderCtx, Renderer.getCameraX(), gameTime));

        // Falling bombs (sky)
        fallingBombs.forEach(fb => fb.draw(renderCtx, Renderer.getCameraX(), gameTime));

        // NPCs
        const npcs = GameWorld.getNPCs();
        npcs.forEach(npc => {
            const isNearNPC = npc.isNear(capybara.getCenterX(), capybara.getCenterY());
            npc.draw(renderCtx, Renderer.getCameraX(), gameTime, isNearNPC);
        });

        // Capybara
        capybara.draw(renderCtx, Renderer.getCameraX(), gameTime);

        // Particles
        Renderer.updateAndDrawParticles(gameTime);
    }

    function getState() { return state; }
    function setState(s) { state = s; }

    return { init, start, getState, setState };
})();
