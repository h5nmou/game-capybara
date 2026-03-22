/* ============================================
   Entities — Tangerine, NPC, Signpost
   ============================================ */

class Tangerine {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.collected = false;
        this.radius = 12;
        this.bobOffset = Math.random() * Math.PI * 2;
    }

    draw(ctx, cameraX, time) {
        if (this.collected) return;
        const sx = this.x - cameraX;
        if (sx < -30 || sx > ctx.canvas.width + 30) return;

        const bob = Math.sin(time * 2.5 + this.bobOffset) * 4;
        const y = this.y + bob;

        // Glow
        ctx.save();
        ctx.globalAlpha = 0.3 + Math.sin(time * 3 + this.bobOffset) * 0.15;
        const glow = ctx.createRadialGradient(sx, y, 2, sx, y, 22);
        glow.addColorStop(0, 'rgba(255, 200, 80, 0.6)');
        glow.addColorStop(1, 'rgba(255, 200, 80, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(sx - 22, y - 22, 44, 44);
        ctx.globalAlpha = 1;

        // Body
        ctx.fillStyle = '#ff8c42';
        ctx.beginPath();
        ctx.arc(sx, y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(sx - 3, y - 4, 4, 0, Math.PI * 2);
        ctx.fill();

        // Leaf
        ctx.fillStyle = '#6b8e6b';
        ctx.beginPath();
        ctx.ellipse(sx + 2, y - this.radius + 1, 6, 3, 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Stem
        ctx.strokeStyle = '#6b8e6b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx, y - this.radius);
        ctx.lineTo(sx + 1, y - this.radius - 4);
        ctx.stroke();
        ctx.restore();
    }

    checkCollision(px, py, pw, ph) {
        if (this.collected) return false;
        const cx = this.x;
        const cy = this.y;
        return (
            px + pw > cx - this.radius &&
            px < cx + this.radius &&
            py + ph > cy - this.radius &&
            py < cy + this.radius
        );
    }
}

class FallingTangerine {
    constructor(worldX, startY, isGiant = false) {
        this.x = worldX;
        this.y = startY;
        this.isGiant = isGiant;
        this.radius = isGiant ? 28 : 11;
        this.vy = (isGiant ? 60 : 80) + Math.random() * 60;
        this.gravity = isGiant ? 380 : 500;
        this.collected = false;
        this.dead = false;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * (isGiant ? 3 : 6);
        this.vx = (Math.random() - 0.5) * 30;
    }

    update(dt, canvasHeight) {
        if (this.dead || this.collected) return;
        this.vy += this.gravity * dt;
        this.y += this.vy * dt;
        this.x += this.vx * dt;
        this.rotation += this.rotSpeed * dt;

        const ground = GameWorld.getGroundY(this.x, canvasHeight) - this.radius;
        if (this.y >= ground) {
            this.dead = true;
        }
    }

    draw(ctx, cameraX, time) {
        if (this.dead || this.collected) return;
        const sx = this.x - cameraX;
        if (sx < -60 || sx > ctx.canvas.width + 60) return;

        ctx.save();
        ctx.translate(sx, this.y);
        ctx.rotate(this.rotation);

        if (this.isGiant) {
            // Pulsing glow ring
            const pulse = 0.3 + Math.sin((time || 0) * 5) * 0.15;
            ctx.globalAlpha = pulse;
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Shadow trail
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#ff8c42';
        ctx.beginPath();
        ctx.arc(0, this.isGiant ? -18 : -10, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Body
        ctx.fillStyle = this.isGiant ? '#ff7020' : '#ff8c42';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(this.isGiant ? -7 : -3, this.isGiant ? -7 : -3,
                this.isGiant ? 8 : 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Leaf
        ctx.fillStyle = '#6b8e6b';
        ctx.beginPath();
        ctx.ellipse(2, -this.radius + 1,
                    this.isGiant ? 10 : 5,
                    this.isGiant ? 5 : 2.5, 0.5, 0, Math.PI * 2);
        ctx.fill();

        if (this.isGiant) {
            // "대왕!" label
            ctx.rotate(-this.rotation); // cancel rotation for text
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('대왕!', 0, 0);
        }

        ctx.restore();
    }

    checkCollision(px, py, pw, ph) {
        if (this.collected || this.dead) return false;
        return (
            px + pw > this.x - this.radius &&
            px < this.x + this.radius &&
            py + ph > this.y - this.radius &&
            py < this.y + this.radius
        );
    }
}

class FallingBomb {
    constructor(worldX, startY) {
        this.x = worldX;
        this.y = startY;
        this.radius = 16;
        this.vy = 50 + Math.random() * 40;
        this.gravity = 400;
        this.exploded = false;
        this.dead = false;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 4;
        this.vx = (Math.random() - 0.5) * 20;
    }

    update(dt, canvasHeight) {
        if (this.dead || this.exploded) return;
        this.vy += this.gravity * dt;
        this.y += this.vy * dt;
        this.x += this.vx * dt;
        this.rotation += this.rotSpeed * dt;

        const ground = GameWorld.getGroundY(this.x, canvasHeight) - this.radius;
        if (this.y >= ground) {
            this.dead = true;
        }
    }

    draw(ctx, cameraX, time) {
        if (this.dead || this.exploded) return;
        const sx = this.x - cameraX;
        if (sx < -60 || sx > ctx.canvas.width + 60) return;

        ctx.save();
        ctx.translate(sx, this.y);
        ctx.rotate(this.rotation);

        // Body (black round bomb)
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(-4, -4, 4, 0, Math.PI * 2);
        ctx.fill();

        // Cap
        ctx.fillStyle = '#555';
        ctx.fillRect(-5, -this.radius - 4, 10, 5);

        // Fuse
        ctx.strokeStyle = '#8b7355';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -this.radius - 4);
        ctx.quadraticCurveTo(8, -this.radius - 12, 12, -this.radius - 8);
        ctx.stroke();

        // Spark on the fuse
        const sparkT = time * 10;
        const sparkScale = 1 + Math.sin(sparkT) * 0.3;
        ctx.fillStyle = (Math.floor(sparkT) % 2 === 0) ? '#ffcc00' : '#ff3300';
        ctx.beginPath();
        ctx.arc(12, -this.radius - 8, 3 * sparkScale, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    checkCollision(px, py, pw, ph) {
        if (this.exploded || this.dead) return false;
        return (
            px + pw > this.x - this.radius &&
            px < this.x + this.radius &&
            py + ph > this.y - this.radius &&
            py < this.y + this.radius
        );
    }
}

class NPC {
    constructor(x, y, type, name, dialogues, quiz) {
        this.x = x;
        this.y = y;
        this.type = type; // 'turtle' or 'duck'
        this.name = name;
        this.dialogues = dialogues;
        this.dialogueIndex = 0;
        this.talked = false;
        this.interactRadius = 60;
        this.quiz = quiz || null;     // quiz question data
        this.quizPassed = false;      // whether quiz has been answered correctly
    }

    draw(ctx, cameraX, time, isNear) {
        const sx = this.x - cameraX;
        if (sx < -60 || sx > ctx.canvas.width + 60) return;

        ctx.save();
        if (this.type === 'turtle') {
            this.drawTurtle(ctx, sx, this.y, time);
        } else {
            this.drawDuck(ctx, sx, this.y, time);
        }

        // Name tag
        ctx.fillStyle = '#5a3e28';
        ctx.font = 'bold 13px "Gaegu", cursive';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, sx, this.y - 40);

        // Interaction prompt when capybara is near
        if (isNear) {
            const pulse = Math.sin(time * 3) * 0.15 + 0.85;
            ctx.globalAlpha = pulse;

            // Speech bubble background
            const promptText = 'E를 눌러 대화하기';
            ctx.font = 'bold 12px "Gaegu", cursive';
            const tw = ctx.measureText(promptText).width;
            const bx = sx - tw / 2 - 10;
            const by = this.y - 72;
            const bw = tw + 20;
            const bh = 22;

            ctx.fillStyle = 'rgba(255, 253, 240, 0.9)';
            ctx.beginPath();
            ctx.moveTo(bx + 6, by);
            ctx.lineTo(bx + bw - 6, by);
            ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + 6);
            ctx.lineTo(bx + bw, by + bh - 6);
            ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - 6, by + bh);
            ctx.lineTo(bx + 6, by + bh);
            ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - 6);
            ctx.lineTo(bx, by + 6);
            ctx.quadraticCurveTo(bx, by, bx + 6, by);
            ctx.fill();

            ctx.strokeStyle = '#c8a060';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Small triangle pointer
            ctx.fillStyle = 'rgba(255, 253, 240, 0.9)';
            ctx.beginPath();
            ctx.moveTo(sx - 5, by + bh);
            ctx.lineTo(sx, by + bh + 6);
            ctx.lineTo(sx + 5, by + bh);
            ctx.fill();

            // Text
            ctx.fillStyle = '#8b6f4e';
            ctx.fillText(promptText, sx, by + 16);
            ctx.globalAlpha = 1;

        } else if (!this.talked) {
            // Exclamation mark if not talked yet and far away
            const pulse = Math.sin(time * 3) * 0.3 + 0.7;
            ctx.globalAlpha = pulse;
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 16px "Gaegu", cursive';
            ctx.fillText('!', sx, this.y - 52);
            ctx.globalAlpha = 1;
        }
        ctx.restore();
    }

    drawTurtle(ctx, sx, sy, time) {
        const bob = Math.sin(time * 1.5) * 2;
        // Shell
        ctx.fillStyle = '#8fbc8f';
        ctx.beginPath();
        ctx.ellipse(sx, sy - 12 + bob, 22, 16, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6b8e6b';
        ctx.beginPath();
        ctx.ellipse(sx, sy - 12 + bob, 22, 16, 0, 0, Math.PI);
        ctx.fill();
        // Shell pattern
        ctx.strokeStyle = '#5a7a5a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx - 8, sy - 12 + bob);
        ctx.lineTo(sx - 4, sy - 22 + bob);
        ctx.moveTo(sx + 8, sy - 12 + bob);
        ctx.lineTo(sx + 4, sy - 22 + bob);
        ctx.stroke();
        // Head
        ctx.fillStyle = '#a0c090';
        ctx.beginPath();
        ctx.arc(sx + 22, sy - 10 + bob, 8, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(sx + 25, sy - 12 + bob, 2, 0, Math.PI * 2);
        ctx.fill();
        // Legs
        ctx.fillStyle = '#a0c090';
        for (const lx of [-14, -6, 6, 14]) {
            ctx.beginPath();
            ctx.ellipse(sx + lx, sy + 2 + bob, 4, 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawDuck(ctx, sx, sy, time) {
        const bob = Math.sin(time * 2) * 2;
        // Body
        ctx.fillStyle = '#fff8dc';
        ctx.beginPath();
        ctx.ellipse(sx, sy - 10 + bob, 18, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        // Wing
        ctx.fillStyle = '#ffeebb';
        ctx.beginPath();
        ctx.ellipse(sx - 8, sy - 10 + bob, 10, 8, -0.3, 0, Math.PI * 2);
        ctx.fill();
        // Head
        ctx.fillStyle = '#fff8dc';
        ctx.beginPath();
        ctx.arc(sx + 14, sy - 20 + bob, 10, 0, Math.PI * 2);
        ctx.fill();
        // Beak
        ctx.fillStyle = '#ffa500';
        ctx.beginPath();
        ctx.moveTo(sx + 24, sy - 20 + bob);
        ctx.lineTo(sx + 32, sy - 18 + bob);
        ctx.lineTo(sx + 24, sy - 16 + bob);
        ctx.closePath();
        ctx.fill();
        // Eye
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(sx + 18, sy - 22 + bob, 2, 0, Math.PI * 2);
        ctx.fill();
        // Feet
        ctx.fillStyle = '#ffa500';
        ctx.beginPath();
        ctx.ellipse(sx - 6, sy + 4 + bob, 5, 2, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(sx + 6, sy + 4 + bob, 5, 2, 0.2, 0, Math.PI * 2);
        ctx.fill();
    }

    isNear(px, py) {
        const dx = this.x - px;
        const dy = this.y - py;
        return Math.sqrt(dx * dx + dy * dy) < this.interactRadius;
    }

    getNextDialogue() {
        if (this.dialogueIndex < this.dialogues.length) {
            const d = this.dialogues[this.dialogueIndex];
            this.dialogueIndex++;
            if (this.dialogueIndex >= this.dialogues.length) {
                this.talked = true;
            }
            return d;
        }
        return null;
    }

    resetDialogue() {
        this.dialogueIndex = 0;
    }
}

class Signpost {
    constructor(x, y, message) {
        this.x = x;
        this.y = y;
        this.message = message;
        this.interactRadius = 50;
    }

    isNear(px, py) {
        const dx = this.x - px;
        const dy = this.y - py;
        return Math.sqrt(dx * dx + dy * dy) < this.interactRadius;
    }
}
