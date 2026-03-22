/* ============================================
   Renderer — Canvas Procedural Drawing
   Pastel Watercolor Style
   ============================================ */

const Renderer = (() => {
    let canvas, ctxR;
    let cameraX = 0;

    function init(canvasEl) {
        canvas = canvasEl;
        ctxR = canvas.getContext('2d');
    }

    function setCameraX(x) { cameraX = x; }
    function getCameraX() { return cameraX; }

    function clear() {
        ctxR.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Draw sky gradient
    function drawSky(stageProgress) {
        const grad = ctxR.createLinearGradient(0, 0, 0, canvas.height);
        // Sky shifts color based on stage
        const topColors = ['#b8d8f0', '#a8d0e8', '#d4b8e0', '#ffe8b0'];
        const botColors = ['#f0e6d3', '#e0f0e0', '#f0d8e8', '#fff4d0'];
        const idx = Math.min(Math.floor(stageProgress * 4), 3);
        grad.addColorStop(0, topColors[idx]);
        grad.addColorStop(1, botColors[idx]);
        ctxR.fillStyle = grad;
        ctxR.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Clouds
    function drawClouds(time) {
        ctxR.save();
        ctxR.globalAlpha = 0.5;
        const clouds = [
            { x: 100, y: 50, w: 120, h: 40 },
            { x: 400, y: 80, w: 90, h: 30 },
            { x: 700, y: 40, w: 150, h: 45 },
            { x: 1000, y: 70, w: 100, h: 35 },
        ];
        ctxR.fillStyle = '#ffffff';
        clouds.forEach(c => {
            const cx = ((c.x + time * 8 - cameraX * 0.05) % (canvas.width + 200)) - 100;
            drawCloud(cx, c.y, c.w, c.h);
        });
        ctxR.restore();
    }

    function drawCloud(x, y, w, h) {
        ctxR.beginPath();
        ctxR.ellipse(x, y, w * 0.5, h, 0, 0, Math.PI * 2);
        ctxR.ellipse(x - w * 0.25, y + h * 0.2, w * 0.35, h * 0.8, 0, 0, Math.PI * 2);
        ctxR.ellipse(x + w * 0.3, y + h * 0.15, w * 0.3, h * 0.7, 0, 0, Math.PI * 2);
        ctxR.fill();
    }

    // Far mountains (parallax 0.1)
    function drawFarMountains(worldWidth) {
        ctxR.save();
        const parallax = 0.1;
        const ox = -cameraX * parallax;
        const groundY = canvas.height * 0.7;
        const mountains = [
            { x: 0, h: 180 }, { x: 300, h: 140 }, { x: 550, h: 200 },
            { x: 800, h: 160 }, { x: 1100, h: 190 }, { x: 1400, h: 150 },
        ];
        ctxR.fillStyle = 'rgba(180, 170, 200, 0.4)';
        mountains.forEach(m => {
            const mx = ox + m.x;
            ctxR.beginPath();
            ctxR.moveTo(mx - 150, groundY);
            ctxR.quadraticCurveTo(mx, groundY - m.h, mx + 150, groundY);
            ctxR.fill();
        });
        ctxR.restore();
    }

    // Mid layer — trees/scenery (parallax 0.3)
    function drawMidLayer(stage, worldWidth) {
        ctxR.save();
        const parallax = 0.3;
        const ox = -cameraX * parallax;
        const groundY = canvas.height * 0.72;

        ctxR.globalAlpha = 0.5;
        ctxR.fillStyle = '#8fbc8f';

        for (let i = 0; i < 20; i++) {
            const tx = ox + i * 180 + 50;
            if (tx < -100 || tx > canvas.width + 100) continue;
            // Soft tree silhouette
            ctxR.beginPath();
            ctxR.ellipse(tx, groundY - 40, 30, 50, 0, 0, Math.PI * 2);
            ctxR.fill();
            ctxR.fillRect(tx - 4, groundY - 10, 8, 20);
        }
        ctxR.restore();
    }

    // Ground (terrain-aware)
    function drawGround(baseGroundY, stage) {
        const groundColors = [
            ['#8fbc8f', '#6b8e6b'], // forest
            ['#7eb8c9', '#5a9aab'], // lake
            ['#c9a8d8', '#a888b8'], // flower hill
            ['#d4b870', '#b89840'], // golden tree
        ];
        const idx = Math.min(stage, 3);

        // Draw terrain-following ground as a polygon
        const step = 4; // sample every 4 pixels for smooth terrain
        ctxR.save();

        const grad = ctxR.createLinearGradient(0, baseGroundY - 50, 0, canvas.height);
        grad.addColorStop(0, groundColors[idx][0]);
        grad.addColorStop(1, groundColors[idx][1]);
        ctxR.fillStyle = grad;

        ctxR.beginPath();
        ctxR.moveTo(0, canvas.height); // bottom-left

        for (let sx = 0; sx <= canvas.width; sx += step) {
            const worldX = sx + cameraX;
            const terrainY = GameWorld.getGroundY(worldX, canvas.height);
            ctxR.lineTo(sx, terrainY);
        }

        ctxR.lineTo(canvas.width, canvas.height); // bottom-right
        ctxR.closePath();
        ctxR.fill();

        // Darker edge line along terrain surface
        ctxR.strokeStyle = groundColors[idx][1];
        ctxR.lineWidth = 2;
        ctxR.beginPath();
        for (let sx = 0; sx <= canvas.width; sx += step) {
            const worldX = sx + cameraX;
            const terrainY = GameWorld.getGroundY(worldX, canvas.height);
            if (sx === 0) ctxR.moveTo(sx, terrainY);
            else ctxR.lineTo(sx, terrainY);
        }
        ctxR.stroke();

        // Grass tufts on terrain — fixed world positions
        ctxR.fillStyle = groundColors[idx][0];
        for (let i = 0; i < 200; i++) {
            const worldGx = i * 53 + 17; // fixed world X, no cameraX influence
            const gx = worldGx - cameraX;
            if (gx < -10 || gx > canvas.width + 10) continue;
            const gy = GameWorld.getGroundY(worldGx, canvas.height);
            const gh = 6 + Math.sin(i * 3.7) * 4;
            ctxR.beginPath();
            ctxR.ellipse(gx, gy, 8, gh, 0, Math.PI, Math.PI * 2);
            ctxR.fill();
        }
        ctxR.restore();
    }

    // Forest-specific decorations
    function drawForestDecor(time) {
        ctxR.save();
        const groundY = canvas.height * 0.78;
        // Trees
        for (let i = 0; i < 15; i++) {
            const tx = i * 450 + 100 - cameraX;
            if (tx < -100 || tx > canvas.width + 100) continue;
            drawTree(tx, groundY, 60 + Math.sin(i * 2.3) * 15, time, i);
        }
        // Mushrooms
        for (let i = 0; i < 20; i++) {
            const mx = i * 350 + 200 - cameraX;
            if (mx < -30 || mx > canvas.width + 30) continue;
            drawMushroom(mx, groundY, 12 + Math.sin(i * 1.7) * 4);
        }
        ctxR.restore();
    }

    function drawTree(x, groundY, size, time, idx) {
        // Trunk
        ctxR.fillStyle = '#8b7355';
        const tw = size * 0.18;
        ctxR.fillRect(x - tw / 2, groundY - size * 0.6, tw, size * 0.6);

        // Canopy (soft pastel circles)
        const sway = Math.sin(time * 0.8 + idx) * 3;
        const colors = ['#7ab87a', '#8fbc8f', '#a8d8a8'];
        for (let j = 0; j < 3; j++) {
            ctxR.fillStyle = colors[j];
            ctxR.globalAlpha = 0.7;
            ctxR.beginPath();
            ctxR.ellipse(
                x + sway + (j - 1) * size * 0.3,
                groundY - size * 0.7 - j * size * 0.15,
                size * 0.4,
                size * 0.35,
                0, 0, Math.PI * 2
            );
            ctxR.fill();
        }
        ctxR.globalAlpha = 1;
    }

    function drawMushroom(x, y, size) {
        // Stem
        ctxR.fillStyle = '#f5f0e0';
        ctxR.fillRect(x - size * 0.15, y - size * 0.5, size * 0.3, size * 0.5);
        // Cap
        ctxR.fillStyle = '#f4c2c2';
        ctxR.beginPath();
        ctxR.ellipse(x, y - size * 0.5, size * 0.5, size * 0.35, 0, Math.PI, Math.PI * 2);
        ctxR.fill();
        // Spots
        ctxR.fillStyle = '#ffffff';
        ctxR.globalAlpha = 0.7;
        ctxR.beginPath();
        ctxR.arc(x - size * 0.15, y - size * 0.65, size * 0.08, 0, Math.PI * 2);
        ctxR.arc(x + size * 0.1, y - size * 0.55, size * 0.06, 0, Math.PI * 2);
        ctxR.fill();
        ctxR.globalAlpha = 1;
    }

    // Lake-specific decorations
    function drawLakeDecor(time) {
        ctxR.save();
        const groundY = canvas.height * 0.78;
        const lakeStart = 2000;
        const lakeEnd = 4000;

        // Water surface
        for (let i = 0; i < 12; i++) {
            const wx = (lakeStart + 100 + i * 160) - cameraX;
            if (wx < -60 || wx > canvas.width + 60) continue;
            const wy = groundY - 5 + Math.sin(time * 1.5 + i * 0.8) * 3;
            ctxR.fillStyle = 'rgba(100, 180, 220, 0.3)';
            ctxR.beginPath();
            ctxR.ellipse(wx, wy, 50, 8, 0, 0, Math.PI * 2);
            ctxR.fill();

            // Sparkle
            ctxR.fillStyle = 'rgba(255, 255, 255, 0.6)';
            const sparkle = Math.sin(time * 3 + i * 2) * 0.5 + 0.5;
            ctxR.globalAlpha = sparkle * 0.7;
            ctxR.beginPath();
            ctxR.arc(wx + 10, wy - 3, 2, 0, Math.PI * 2);
            ctxR.fill();
            ctxR.globalAlpha = 1;
        }

        // Lily pads
        for (let i = 0; i < 6; i++) {
            const lx = (lakeStart + 200 + i * 280) - cameraX;
            if (lx < -40 || lx > canvas.width + 40) continue;
            const ly = groundY - 2 + Math.sin(time + i) * 2;
            ctxR.fillStyle = '#6baa6b';
            ctxR.beginPath();
            ctxR.ellipse(lx, ly, 20, 10, i * 0.3, 0, Math.PI * 2);
            ctxR.fill();
            // Flower on lily pad
            if (i % 2 === 0) {
                ctxR.fillStyle = '#f4c2c2';
                ctxR.beginPath();
                ctxR.arc(lx + 5, ly - 8, 5, 0, Math.PI * 2);
                ctxR.fill();
            }
        }

        // Some trees too
        for (let i = 0; i < 6; i++) {
            const tx = (lakeStart + i * 350 + 80) - cameraX;
            if (tx < -100 || tx > canvas.width + 100) continue;
            drawTree(tx, groundY, 50 + Math.sin(i * 3.1) * 10, time, i + 20);
        }
        ctxR.restore();
    }

    // Flower hill decorations
    function drawFlowerHillDecor(time) {
        ctxR.save();
        const groundY = canvas.height * 0.78;
        const hillStart = 4000;

        // Rolling hills
        ctxR.fillStyle = '#c9e8a8';
        for (let i = 0; i < 5; i++) {
            const hx = (hillStart + i * 400) - cameraX;
            if (hx < -200 || hx > canvas.width + 200) continue;
            ctxR.beginPath();
            ctxR.ellipse(hx, groundY + 10, 180, 40, 0, Math.PI, Math.PI * 2);
            ctxR.fill();
        }

        // Flowers
        const flowerColors = ['#f4c2c2', '#ffd9a0', '#d4b8e0', '#fff4c1', '#b8d8f0'];
        for (let i = 0; i < 40; i++) {
            const fx = (hillStart + 50 + i * 48) - cameraX;
            if (fx < -20 || fx > canvas.width + 20) continue;
            const fy = groundY - 5 - Math.abs(Math.sin(i * 0.7)) * 15;
            const sway = Math.sin(time * 1.2 + i * 0.5) * 2;

            // Stem
            ctxR.strokeStyle = '#6b8e6b';
            ctxR.lineWidth = 1.5;
            ctxR.beginPath();
            ctxR.moveTo(fx, fy + 12);
            ctxR.quadraticCurveTo(fx + sway, fy + 6, fx + sway, fy);
            ctxR.stroke();

            // Petals
            ctxR.fillStyle = flowerColors[i % flowerColors.length];
            const petals = 5;
            for (let p = 0; p < petals; p++) {
                const angle = (p / petals) * Math.PI * 2 + time * 0.3;
                ctxR.beginPath();
                ctxR.ellipse(
                    fx + sway + Math.cos(angle) * 4,
                    fy + Math.sin(angle) * 4,
                    3.5, 2.5, angle, 0, Math.PI * 2
                );
                ctxR.fill();
            }
            // Center
            ctxR.fillStyle = '#ffd700';
            ctxR.beginPath();
            ctxR.arc(fx + sway, fy, 2, 0, Math.PI * 2);
            ctxR.fill();
        }
        ctxR.restore();
    }

    // Golden tree area — MAJESTIC!
    function drawGoldenTreeDecor(time) {
        ctxR.save();
        const groundY = canvas.height * 0.78;
        const treeX = 6000 - cameraX;
        // Scale factor based on canvas height so it looks good at any DPR
        const s = canvas.height / 700;

        if (treeX > -400 * s && treeX < canvas.width + 400 * s) {
            // Golden carpet on ground
            const carpetGrad = ctxR.createRadialGradient(treeX, groundY, 20 * s, treeX, groundY, 300 * s);
            carpetGrad.addColorStop(0, 'rgba(255, 215, 0, 0.25)');
            carpetGrad.addColorStop(0.6, 'rgba(255, 200, 50, 0.1)');
            carpetGrad.addColorStop(1, 'rgba(255, 200, 50, 0)');
            ctxR.fillStyle = carpetGrad;
            ctxR.fillRect(treeX - 300 * s, groundY - 10, 600 * s, 60 * s);

            // Big warm glow behind tree
            const glowGrad = ctxR.createRadialGradient(treeX, groundY - 200 * s, 20 * s, treeX, groundY - 150 * s, 350 * s);
            glowGrad.addColorStop(0, 'rgba(255, 230, 100, 0.45)');
            glowGrad.addColorStop(0.5, 'rgba(255, 215, 0, 0.15)');
            glowGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctxR.fillStyle = glowGrad;
            ctxR.fillRect(treeX - 350 * s, groundY - 500 * s, 700 * s, 550 * s);

            // Trunk (thick)
            ctxR.fillStyle = '#a0884e';
            const tw = 20 * s;
            ctxR.fillRect(treeX - tw / 2, groundY - 220 * s, tw, 220 * s);
            // Trunk bark details
            ctxR.fillStyle = '#8a7040';
            ctxR.fillRect(treeX - tw / 2 + 3 * s, groundY - 180 * s, 4 * s, 40 * s);
            ctxR.fillRect(treeX + tw / 2 - 7 * s, groundY - 120 * s, 4 * s, 30 * s);

            // Roots
            ctxR.strokeStyle = '#a0884e';
            ctxR.lineWidth = 4 * s;
            for (let r = -1; r <= 1; r += 2) {
                ctxR.beginPath();
                ctxR.moveTo(treeX + r * tw * 0.3, groundY);
                ctxR.quadraticCurveTo(treeX + r * 40 * s, groundY + 5 * s, treeX + r * 60 * s, groundY + 10 * s);
                ctxR.stroke();
            }

            // Golden canopy — multiple large circles
            const goldenColors = ['#ffd700', '#ffcc00', '#ffe44d', '#ffdb4d', '#ffc800'];
            const canopyParts = [
                { ox: 0, oy: -260, rx: 80, ry: 65 },
                { ox: -60, oy: -230, rx: 70, ry: 55 },
                { ox: 60, oy: -235, rx: 65, ry: 50 },
                { ox: -30, oy: -280, rx: 60, ry: 50 },
                { ox: 35, oy: -285, rx: 55, ry: 48 },
                { ox: 0, oy: -310, rx: 50, ry: 40 },
                { ox: -80, oy: -200, rx: 50, ry: 40 },
                { ox: 80, oy: -205, rx: 45, ry: 38 },
            ];
            canopyParts.forEach((p, j) => {
                ctxR.fillStyle = goldenColors[j % goldenColors.length];
                ctxR.globalAlpha = 0.85;
                const sway = Math.sin(time * 0.5 + j * 0.7) * 4 * s;
                ctxR.beginPath();
                ctxR.ellipse(
                    treeX + p.ox * s + sway,
                    groundY + p.oy * s,
                    p.rx * s, p.ry * s,
                    0, 0, Math.PI * 2
                );
                ctxR.fill();
            });
            ctxR.globalAlpha = 1;

            // Tangerines hanging from tree
            for (let i = 0; i < 14; i++) {
                const angle = (i / 14) * Math.PI * 2 + time * 0.15;
                const r = (50 + (i % 4) * 20) * s;
                const tx = treeX + Math.cos(angle) * r;
                const ty = groundY - 250 * s + Math.sin(angle) * r * 0.5;
                const bob = Math.sin(time * 2 + i) * 2 * s;

                // Tangerine
                ctxR.fillStyle = '#ff8c42';
                ctxR.beginPath();
                ctxR.arc(tx, ty + bob, 9 * s, 0, Math.PI * 2);
                ctxR.fill();
                // Shine
                ctxR.fillStyle = 'rgba(255,255,255,0.4)';
                ctxR.beginPath();
                ctxR.arc(tx - 2 * s, ty + bob - 3 * s, 3 * s, 0, Math.PI * 2);
                ctxR.fill();
                // Leaf
                ctxR.fillStyle = '#6b8e6b';
                ctxR.beginPath();
                ctxR.ellipse(tx + 5 * s, ty + bob - 8 * s, 5 * s, 2.5 * s, 0.5, 0, Math.PI * 2);
                ctxR.fill();
            }

            // Sparkle particles (lots!)
            for (let i = 0; i < 25; i++) {
                const sparkleT = (time * 0.6 + i * 0.9) % 5;
                const sx = treeX + Math.sin(i * 2.7) * 120 * s;
                const sy = groundY - 150 * s - sparkleT * 50 * s + Math.cos(i * 1.9) * 60 * s;
                const alpha = 1 - sparkleT / 5;
                if (alpha > 0) {
                    const sparkleSize = (2 + Math.sin(time * 4 + i) * 1.5) * s;
                    ctxR.fillStyle = `rgba(255, 215, 0, ${alpha * 0.9})`;
                    ctxR.beginPath();
                    ctxR.arc(sx, sy, sparkleSize, 0, Math.PI * 2);
                    ctxR.fill();
                    // Star cross
                    ctxR.strokeStyle = `rgba(255, 240, 150, ${alpha * 0.5})`;
                    ctxR.lineWidth = 1 * s;
                    ctxR.beginPath();
                    ctxR.moveTo(sx - sparkleSize * 2, sy);
                    ctxR.lineTo(sx + sparkleSize * 2, sy);
                    ctxR.moveTo(sx, sy - sparkleSize * 2);
                    ctxR.lineTo(sx, sy + sparkleSize * 2);
                    ctxR.stroke();
                }
            }

            // Falling golden leaves
            for (let i = 0; i < 8; i++) {
                const leafT = (time * 0.4 + i * 1.2) % 3;
                const lx = treeX + Math.sin(time * 0.5 + i * 2) * 100 * s;
                const ly = groundY - 300 * s + leafT * 120 * s;
                const alpha = 1 - leafT / 3;
                if (alpha > 0) {
                    ctxR.fillStyle = `rgba(255, 200, 50, ${alpha * 0.7})`;
                    ctxR.beginPath();
                    const rot = time + i;
                    ctxR.ellipse(lx, ly, 4 * s, 2 * s, rot, 0, Math.PI * 2);
                    ctxR.fill();
                }
            }
        }
        ctxR.restore();
    }

    // Signpost
    function drawSignpost(x, groundY, message, active, time) {
        ctxR.save();
        const sx = x - cameraX;
        if (sx < -40 || sx > canvas.width + 40) { ctxR.restore(); return; }

        // Post
        ctxR.fillStyle = '#8b7355';
        ctxR.fillRect(sx - 3, groundY - 55, 6, 55);

        // Sign board
        ctxR.fillStyle = '#f0e6d3';
        ctxR.strokeStyle = '#8b6f4e';
        ctxR.lineWidth = 2;
        const bw = 70, bh = 30;
        ctxR.beginPath();
        roundedRect(sx - bw / 2, groundY - 78, bw, bh, 4);
        ctxR.fill();
        ctxR.stroke();

        // Text on sign
        ctxR.fillStyle = '#5a3e28';
        ctxR.font = '10px "Gaegu", cursive';
        ctxR.textAlign = 'center';
        ctxR.fillText('읽기 →', sx, groundY - 58);

        // Interaction glow
        if (active) {
            ctxR.strokeStyle = `rgba(255, 215, 0, ${0.5 + Math.sin(time * 4) * 0.3})`;
            ctxR.lineWidth = 3;
            ctxR.beginPath();
            roundedRect(sx - bw / 2 - 3, groundY - 81, bw + 6, bh + 6, 6);
            ctxR.stroke();
        }
        ctxR.restore();
    }

    function roundedRect(x, y, w, h, r) {
        ctxR.moveTo(x + r, y);
        ctxR.lineTo(x + w - r, y);
        ctxR.quadraticCurveTo(x + w, y, x + w, y + r);
        ctxR.lineTo(x + w, y + h - r);
        ctxR.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctxR.lineTo(x + r, y + h);
        ctxR.quadraticCurveTo(x, y + h, x, y + h - r);
        ctxR.lineTo(x, y + r);
        ctxR.quadraticCurveTo(x, y, x + r, y);
    }

    // Particle list
    let particles = [];

    function addParticle(worldX, worldY, color, count) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x: worldX,
                y: worldY,
                vx: (Math.random() - 0.5) * 3,
                vy: -Math.random() * 3 - 1,
                life: 1,
                decay: 0.015 + Math.random() * 0.02,
                size: 2 + Math.random() * 3,
                color: color,
            });
        }
    }

    function updateAndDrawParticles(dt) {
        ctxR.save();
        particles = particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05;
            p.life -= p.decay;
            if (p.life <= 0) return false;

            const sx = p.x - cameraX;
            ctxR.globalAlpha = p.life;
            ctxR.fillStyle = p.color;
            ctxR.beginPath();
            ctxR.arc(sx, p.y, p.size * p.life, 0, Math.PI * 2);
            ctxR.fill();
            return true;
        });
        ctxR.restore();
    }

    return {
        init, setCameraX, getCameraX, clear, drawSky, drawClouds,
        drawFarMountains, drawMidLayer, drawGround,
        drawForestDecor, drawLakeDecor, drawFlowerHillDecor, drawGoldenTreeDecor,
        drawSignpost, addParticle, updateAndDrawParticles,
        getCtx: () => ctxR, getCanvas: () => canvas,
    };
})();
