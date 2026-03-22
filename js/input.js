/* ============================================
   Input System — Click/Touch + Keyboard
   ============================================ */

const GameInput = (() => {
    let targetX = null;
    let canvas = null;
    let clickCallbacks = [];
    let dialogueClickCallback = null;

    // Keyboard state
    const keys = {};

    // Double-tap running state
    const DOUBLE_TAP_MS = 300;
    let lastLeftTime = 0;
    let lastRightTime = 0;
    let _isRunning = false;
    let _runDirection = 0; // -1 left, 1 right

    function init(canvasEl) {
        canvas = canvasEl;
        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('touchend', handleTouch, { passive: false });

        // Keyboard listeners
        window.addEventListener('keydown', (e) => {
            const wasDown = keys[e.code];
            keys[e.code] = true;

            // Prevent page scroll on arrow keys and space
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
                e.preventDefault();
            }
            // Space or Enter can advance dialogue
            if ((e.code === 'Space' || e.code === 'Enter') && dialogueClickCallback) {
                dialogueClickCallback();
            }

            // Double-tap detection (only on fresh press)
            if (!wasDown) {
                const now = Date.now();
                if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                    if (now - lastLeftTime < DOUBLE_TAP_MS) {
                        _isRunning = true;
                        _runDirection = -1;
                    }
                    lastLeftTime = now;
                    // Stop running if switching direction
                    if (_runDirection === 1) { _isRunning = false; _runDirection = 0; }
                }
                if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                    if (now - lastRightTime < DOUBLE_TAP_MS) {
                        _isRunning = true;
                        _runDirection = 1;
                    }
                    lastRightTime = now;
                    // Stop running if switching direction
                    if (_runDirection === -1) { _isRunning = false; _runDirection = 0; }
                }
            }
        });
        window.addEventListener('keyup', (e) => {
            keys[e.code] = false;
            // Stop running when direction key released
            if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && _runDirection === -1) {
                _isRunning = false; _runDirection = 0;
            }
            if ((e.code === 'ArrowRight' || e.code === 'KeyD') && _runDirection === 1) {
                _isRunning = false; _runDirection = 0;
            }
        });
    }

    function handleClick(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        if (dialogueClickCallback) {
            dialogueClickCallback();
            return;
        }

        targetX = x;
        clickCallbacks.forEach(cb => cb(x, y));
    }

    function handleTouch(e) {
        e.preventDefault();
        if (e.changedTouches.length > 0) {
            const touch = e.changedTouches[0];
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const x = (touch.clientX - rect.left) * scaleX;
            const y = (touch.clientY - rect.top) * (canvas.height / rect.height);

            if (dialogueClickCallback) {
                dialogueClickCallback();
                return;
            }

            targetX = x;
            clickCallbacks.forEach(cb => cb(x, y));
        }
    }

    function isKeyDown(code) { return !!keys[code]; }
    function isLeft() { return !!keys['ArrowLeft'] || !!keys['KeyA']; }
    function isRight() { return !!keys['ArrowRight'] || !!keys['KeyD']; }
    function isJump() { return !!keys['Space'] || !!keys['ArrowUp'] || !!keys['KeyW']; }
    function isRunning() { return _isRunning; }

    function getTargetX() { return targetX; }
    function clearTarget() { targetX = null; }
    function onClick(cb) { clickCallbacks.push(cb); }
    function setDialogueCallback(cb) { dialogueClickCallback = cb; }
    function clearDialogueCallback() { dialogueClickCallback = null; }

    return {
        init, getTargetX, clearTarget, onClick, setDialogueCallback, clearDialogueCallback,
        isKeyDown, isLeft, isRight, isJump, isRunning,
    };
})();
