/* ============================================
   Capybara Character — 카피
   Now with keyboard movement + jump!
   ============================================ */

class Capybara {
    constructor(x, y, canvasHeight) {
        this.x = x;
        this.y = y;
        this.targetX = null;
        this.speed = 150;
        this.runSpeed = 330;      // speed while running
        this.width = 50;
        this.height = 35;
        this.direction = 1;
        this.isWalking = false;
        this.isRunning = false;   // double-tap sprint state
        this.walkTime = 0;
        this.bobTime = 0;
        this.stepTimer = 0;
        this.groundY = y;
        this.canvasHeight = canvasHeight || 700;

        // Jump / gravity physics
        this.vy = 0;
        this.vx = 0;              // horizontal velocity during run-jump
        this.gravity = 600;       // px/s²
        this.jumpForce = -300;    // initial upward velocity
        this.runJumpForce = -270; // slightly less vertical, more horizontal
        this.isOnGround = true;
        this.isJumping = false;
        this.jumpRequested = false; // tracks rising-edge of jump key
    }

    setTarget(worldX) {
        this.targetX = worldX;
    }

    update(dt) {
        this.bobTime += dt;

        // ---- Keyboard movement (takes priority over click target) ----
        const kbLeft = GameInput.isLeft();
        const kbRight = GameInput.isRight();
        const kbJump = GameInput.isJump();
        const running = GameInput.isRunning();
        this.isRunning = running && (kbLeft || kbRight);

        if (kbLeft || kbRight) {
            // Cancel any click-to-move target when using keyboard
            this.targetX = null;
            this.direction = kbRight ? 1 : -1;
            this.isWalking = true;
            this.walkTime += dt;

            const currentSpeed = this.isRunning ? this.runSpeed : this.speed;

            // Only apply keyboard horizontal movement when on ground;
            // in the air during a run-jump, vx carries the momentum
            if (this.isOnGround) {
                this.x += this.direction * currentSpeed * dt;
            }

            // Footstep sounds (only when on ground)
            if (this.isOnGround) {
                const stepInterval = this.isRunning ? 0.18 : 0.3;
                this.stepTimer += dt;
                if (this.stepTimer > stepInterval) {
                    this.stepTimer = 0;
                    GameAudio.playStep();
                }
            }
        } else if (this.targetX !== null) {
            // ---- Click-to-move fallback ----
            const dx = this.targetX - (this.x + this.width / 2);
            if (Math.abs(dx) < 5) {
                this.targetX = null;
                this.isWalking = false;
            } else {
                this.direction = dx > 0 ? 1 : -1;
                this.isWalking = true;
                this.walkTime += dt;
                this.x += this.direction * this.speed * dt;

                if (this.isOnGround) {
                    this.stepTimer += dt;
                    if (this.stepTimer > 0.3) {
                        this.stepTimer = 0;
                        GameAudio.playStep();
                    }
                }
            }
        } else {
            this.isWalking = false;
        }

        // ---- Jump (rising-edge: only trigger once per key press) ----
        if (kbJump && this.isOnGround && !this.jumpRequested) {
            if (this.isRunning) {
                // Run-jump: lower arc, strong horizontal velocity
                this.vy = this.runJumpForce;
                this.vx = this.direction * this.runSpeed * 0.85;
            } else {
                this.vy = this.jumpForce;
                this.vx = 0;
            }
            this.isOnGround = false;
            this.isJumping = true;
            this.jumpRequested = true;
            GameAudio.playStep();
        }
        if (!kbJump) {
            this.jumpRequested = false;
        }

        // ---- Gravity + Terrain following ----
        const terrainGroundY = GameWorld.getGroundY(this.x + this.width / 2, this.canvasHeight) - this.height;
        this.groundY = terrainGroundY;

        if (!this.isOnGround) {
            this.vy += this.gravity * dt;
            this.y += this.vy * dt;
            // Apply horizontal run-jump velocity (with mild air drag)
            if (this.vx !== 0) {
                this.x += this.vx * dt;
                this.vx *= Math.pow(0.92, dt * 60); // air drag
                if (Math.abs(this.vx) < 2) this.vx = 0;
            }

            // Land on ground
            if (this.y >= this.groundY) {
                this.y = this.groundY;
                this.vy = 0;
                this.vx = 0;
                this.isOnGround = true;
                this.isJumping = false;
            }
        } else {
            // Snap to terrain when walking on ground
            this.y = this.groundY;
            this.vx = 0;
        }

        // Clamp to world bounds
        if (this.x < 0) this.x = 0;
        if (this.x > 6800) this.x = 6800;
    }

    draw(ctx, cameraX, time) {
        const sx = this.x - cameraX;

        // Walk bob only when on ground
        let bob = 0;
        if (this.isOnGround) {
            const walkFreq = this.isRunning ? 14 : 8;
            const walkAmp  = this.isRunning ? 4.5 : 3;
            bob = this.isWalking ? Math.sin(this.walkTime * walkFreq) * walkAmp : Math.sin(this.bobTime * 1.5) * 1.5;
        }
        const y = this.y + bob;
        const dir = this.direction;

        ctx.save();

        // Shadow (stays on ground, shrinks when jumping)
        const shadowScale = this.isOnGround ? 1 : Math.max(0.3, 1 - (this.groundY - this.y) / 150);
        ctx.fillStyle = `rgba(0,0,0,${0.1 * shadowScale})`;
        ctx.beginPath();
        ctx.ellipse(sx + this.width / 2, this.groundY + this.height, this.width * 0.4 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Squash-and-stretch for jump
        let scaleX = 1, scaleY = 1;
        if (this.isJumping) {
            if (this.vy < 0) {
                // Rising: stretch vertically
                scaleX = 0.9;
                scaleY = 1.15;
            } else {
                // Falling: squash
                scaleX = 1.1;
                scaleY = 0.9;
            }
        }

        // Apply scale transform centered on capybara
        ctx.translate(sx + this.width / 2, y + this.height / 2);
        ctx.scale(scaleX, scaleY);
        ctx.translate(-(sx + this.width / 2), -(y + this.height / 2));

        // Body (slightly darker + leaned when running)
        const runLean = this.isRunning && this.isOnGround ? this.direction * 0.18 : 0;
        ctx.fillStyle = this.isRunning ? '#b8946e' : '#c8a882';
        ctx.beginPath();
        ctx.ellipse(sx + this.width / 2, y + this.height / 2, this.width / 2, this.height / 2, runLean, 0, Math.PI * 2);
        ctx.fill();

        // Belly
        ctx.fillStyle = '#dbc4a0';
        ctx.beginPath();
        ctx.ellipse(sx + this.width / 2, y + this.height / 2 + 4, this.width * 0.35, this.height * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        const headX = sx + this.width / 2 + dir * 18;
        const headY = y - 2;
        ctx.fillStyle = '#c8a882';
        ctx.beginPath();
        ctx.ellipse(headX, headY, 16, 13, dir * 0.15, 0, Math.PI * 2);
        ctx.fill();

        // Snout
        ctx.fillStyle = '#b89870';
        ctx.beginPath();
        ctx.ellipse(headX + dir * 10, headY + 3, 8, 6, dir * 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Nose
        ctx.fillStyle = '#6b4e3d';
        ctx.beginPath();
        ctx.ellipse(headX + dir * 16, headY + 2, 3, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye
        const eyeX = headX + dir * 6;
        const eyeY = headY - 3;
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Eye shine
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(eyeX + 1, eyeY - 1, 1, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.fillStyle = '#b89870';
        ctx.beginPath();
        ctx.ellipse(headX - dir * 4, headY - 11, 5, 4, dir * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(headX + dir * 2, headY - 12, 5, 4, -dir * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Legs (walking animation — freeze during jump)
        ctx.fillStyle = '#b08a68';
        const legPhase = this.isWalking && this.isOnGround ? this.walkTime * 8 : 0;
        const legs = [
            { ox: -12, phase: 0 },
            { ox: -4, phase: Math.PI },
            { ox: 8, phase: Math.PI * 0.5 },
            { ox: 16, phase: Math.PI * 1.5 },
        ];
        legs.forEach(leg => {
            let legBob = 0;
            if (this.isOnGround && this.isWalking) {
                legBob = Math.sin(legPhase + leg.phase) * 4;
            } else if (this.isJumping) {
                // Tuck legs during jump
                legBob = this.vy < 0 ? -3 : 2;
            }
            ctx.beginPath();
            ctx.ellipse(
                sx + this.width / 2 + leg.ox,
                y + this.height + 2 + legBob,
                4, 6, 0, 0, Math.PI * 2
            );
            ctx.fill();
        });

        // Tangerine on head!
        const tangBob = Math.sin(time * 2) * 2;
        const tangX = headX - dir * 2;
        const tangY = headY - 16 + tangBob;
        ctx.fillStyle = '#ff8c42';
        ctx.beginPath();
        ctx.arc(tangX, tangY, 7, 0, Math.PI * 2);
        ctx.fill();
        // Tangerine shine
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(tangX - 2, tangY - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Tangerine leaf
        ctx.fillStyle = '#6b8e6b';
        ctx.beginPath();
        ctx.ellipse(tangX + 3, tangY - 6, 4, 2, 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Mouth (little smile — open when jumping)
        ctx.strokeStyle = '#6b4e3d';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (this.isJumping && this.vy < 0) {
            // Open mouth "whee!" when rising
            ctx.arc(headX + dir * 12, headY + 5, 4, 0, Math.PI);
            ctx.fillStyle = '#a06050';
            ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(headX + dir * 12, headY + 5, 3, 0, Math.PI);
        ctx.stroke();

        ctx.restore();
    }

    getCenterX() { return this.x + this.width / 2; }
    getCenterY() { return this.y + this.height / 2; }
}
