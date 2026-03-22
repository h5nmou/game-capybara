/* ============================================
   Main Entry Point
   ============================================ */

(function () {
    const canvas = document.getElementById('game-canvas');
    const btnSound = document.getElementById('btn-sound');
    const btnFullscreen = document.getElementById('btn-fullscreen');

    // Resize canvas to fill container w/ proper resolution
    function resize() {
        const container = document.getElementById('game-container');
        const dpr = 1; // Keep at 1 for larger, more visible game objects
        canvas.width = container.clientWidth * dpr;
        canvas.height = container.clientHeight * dpr;
        canvas.style.width = container.clientWidth + 'px';
        canvas.style.height = container.clientHeight + 'px';
    }

    resize();
    window.addEventListener('resize', resize);

    // Initialize all systems
    Renderer.init(canvas);
    GameInput.init(canvas);
    GameUI.init();
    GameEngine.init(canvas);

    // Draw initial frame for background behind story overlay
    function drawInitialFrame() {
        const ctx = Renderer.getCtx();
        Renderer.clear();
        Renderer.drawSky(0);
        Renderer.drawClouds(0);
        Renderer.drawFarMountains(7200);
        const groundY = canvas.height * 0.78;
        Renderer.drawGround(groundY, 0);
    }
    drawInitialFrame();

    // Sound button
    btnSound.addEventListener('click', (e) => {
        e.stopPropagation();
        GameAudio.init();
        GameAudio.resume();
        const muted = GameAudio.toggleMute();
        btnSound.textContent = muted ? '🔇' : '🔊';
    });

    // Fullscreen button
    btnFullscreen.addEventListener('click', (e) => {
        e.stopPropagation();
        const container = document.getElementById('game-container');
        if (!document.fullscreenElement) {
            (container.requestFullscreen || container.webkitRequestFullscreen).call(container);
        } else {
            (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        }
    });

    // Show story intro
    GameUI.showStoryIntro(() => {
        // Init audio on user interaction
        GameAudio.init();
        GameAudio.resume();
        GameAudio.playBGM();
        GameEngine.setState('PLAYING');
        GameEngine.start();
    });
})();
