/* ============================================
   World — Stage Layout & Entity Placement
   ============================================ */

const GameWorld = (() => {
    const WORLD_WIDTH = 7200;
    const GROUND_RATIO = 0.78; // groundY = canvas.height * GROUND_RATIO

    let tangerines = [];
    let npcs = [];
    let signposts = [];
    let totalTangerines = 0;

    // ---- Terrain height system ----
    // Each segment: { x1, x2, h } where h is pixel offset (negative = higher ground)
    const terrainSegments = [
        // Stage 1 — Forest: gentle hill
        { x1: 600, x2: 700, h: -15 },
        { x1: 700, x2: 1000, h: -30 },
        { x1: 1000, x2: 1100, h: -15 },

        // Forest staircase
        { x1: 1400, x2: 1500, h: -12 },
        { x1: 1500, x2: 1600, h: -25 },
        { x1: 1600, x2: 1700, h: -40 },
        { x1: 1700, x2: 1800, h: -25 },
        { x1: 1800, x2: 1900, h: -12 },

        // Stage 2 — Lake: bridge over water
        { x1: 2400, x2: 2500, h: -20 },
        { x1: 2500, x2: 2900, h: -35 },
        { x1: 2900, x2: 3000, h: -20 },

        // Lake hill
        { x1: 3300, x2: 3400, h: -18 },
        { x1: 3400, x2: 3600, h: -35 },
        { x1: 3600, x2: 3700, h: -18 },

        // Stage 3 — Flower Hill: rolling hills
        { x1: 4100, x2: 4200, h: -20 },
        { x1: 4200, x2: 4500, h: -45 },
        { x1: 4500, x2: 4600, h: -20 },

        // Flower staircase
        { x1: 4900, x2: 4980, h: -15 },
        { x1: 4980, x2: 5060, h: -30 },
        { x1: 5060, x2: 5200, h: -50 },
        { x1: 5200, x2: 5280, h: -30 },
        { x1: 5280, x2: 5360, h: -15 },

        // Stage 4 — Golden tree approach
        { x1: 5700, x2: 5850, h: -15 },
        { x1: 5850, x2: 6200, h: -25 },
        { x1: 6200, x2: 6350, h: -15 },
    ];

    function getTerrainOffset(worldX) {
        for (const seg of terrainSegments) {
            if (worldX >= seg.x1 && worldX <= seg.x2) {
                const edgeWidth = 40;
                let factor = 1;
                if (worldX < seg.x1 + edgeWidth) {
                    factor = (worldX - seg.x1) / edgeWidth;
                    factor = factor * factor * (3 - 2 * factor); // smoothstep
                } else if (worldX > seg.x2 - edgeWidth) {
                    factor = (seg.x2 - worldX) / edgeWidth;
                    factor = factor * factor * (3 - 2 * factor);
                }
                return seg.h * factor;
            }
        }
        return 0;
    }

    function getGroundY(worldX, canvasHeight) {
        return canvasHeight * GROUND_RATIO + getTerrainOffset(worldX);
    }

    function init(canvasHeight) {
        const gY = (wx) => getGroundY(wx, canvasHeight);

        // ---- Tangerines ----
        tangerines = [
            new Tangerine(350, gY(350) - 20),
            new Tangerine(650, gY(650) - 18),
            new Tangerine(850, gY(850) - 22),
            new Tangerine(1300, gY(1300) - 16),
            new Tangerine(1550, gY(1550) - 20),
            new Tangerine(1650, gY(1650) - 18),
            new Tangerine(1700, gY(1700) - 20),
            new Tangerine(2300, gY(2300) - 20),
            new Tangerine(2600, gY(2600) - 18),
            new Tangerine(2800, gY(2800) - 22),
            new Tangerine(3400, gY(3400) - 16),
            new Tangerine(3800, gY(3800) - 20),
            new Tangerine(4200, gY(4200) - 20),
            new Tangerine(4350, gY(4350) - 18),
            new Tangerine(4600, gY(4600) - 22),
            new Tangerine(5060, gY(5060) - 16),
            new Tangerine(5130, gY(5130) - 20),
            new Tangerine(5800, gY(5800) - 20),
        ];
        totalTangerines = tangerines.length;

        // ---- NPCs ----
        // Quiz pools — randomly pick one per NPC each game
        const turtleQuizzes = [
            { question: '🐢 거북이가 엎어지면 뭐가 될까요?', answers: ['화가 나요', '거북이등', '배가 고파요', '잠을 자요'], correct: 1 },
            { question: '🍊 귤이 세상에서 제일 무서워하는 것은?', answers: ['사과', '껍질 벗겨지는 것', '비', '추위'], correct: 1 },
            { question: '🐢 거북이가 제일 좋아하는 음악은?', answers: ['빠른 댄스 음악', '클래식', '힙합', '느린 발라드'], correct: 3 },
            { question: '⏰ 세상에서 가장 느린 동물이 달리면 뭐라고 할까요?', answers: ['스프린트', '조깅', '느린 질주', '기어가기'], correct: 2 },
            { question: '🐢 거북이가 뒤돌아보면?', answers: ['목이 아파요', '천천히 돌아봐요', '목이 껍질에 끼어요', '고개를 못 돌려요'], correct: 2 },
            { question: '🧊 얼음이 가장 겁내는 것은?', answers: ['소금', '바람', '태양', '냉장고'], correct: 2 },
        ];
        const duckQuizzes = [
            { question: '🦆 오리가 공부를 잘하면 뭐가 될까요?', answers: ['의사오리', '박사오리', '선생오리', '학자오리'], correct: 1 },
            { question: '⬆️ 위에서 봤을 때 눈이 4개인 것은?', answers: ['강아지', '코끼리', '안경 쓴 사람', '고양이'], correct: 2 },
            { question: '🦆 오리가 날면 꽥꽥, 강아지가 날면?', answers: ['멍멍', '왈왈', '야옹', '비행기가 돼요'], correct: 3 },
            { question: '❓ 물에 빠진 사람을 구하면 뭐라고 할까요?', answers: ['물사람', '구조대', '헤엄선수', '젖은사람'], correct: 3 },
            { question: '🍕 피자가 제일 싫어하는 말은?', answers: ['맛있다', '먹자', '한 조각만', '다 먹었다'], correct: 3 },
            { question: '🦆 오리가 시험을 보면 점수는?', answers: ['100점', '덕점(duck점)', '0점', '꽥점'], correct: 3 },
        ];

        const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

        npcs = [
            new NPC(3000, gY(3000) - 5, 'turtle', '거북이 꼬부기', [
                { speaker: '거북이 꼬부기', text: '안녕, 카피! 오랜만이야~ 어디 가는 길이야?' },
                { speaker: '카피', text: '안녕 꼬부기! 온천에 귤이 다 떨어졌어... 황금 귤 나무를 찾으러 가는 중이야!' },
                { speaker: '거북이 꼬부기', text: '황금 귤 나무를 찾는다고?! 대단하다!' },
                { speaker: '카피', text: '헤헤, 마을 친구들이 귤 없으면 너무 슬퍼하거든~ 🍊' },
                { speaker: '거북이 꼬부기', text: '좋아! 그럼 앞으로 가려면 내 퀴즈를 맞춰봐! 준비됐어? 🐢' },
                { speaker: '카피', text: '오~ 퀴즈! 재밌겠다! 해볼게!' },
            ], pickRandom(turtleQuizzes)),
            new NPC(5200, gY(5200) - 5, 'duck', '오리 꽥이', [
                { speaker: '오리 꽥이', text: '꽥꽥! 세상에, 카피잖아! 반가워!' },
                { speaker: '카피', text: '꽥이! 오래간만이야~ 꼬부기가 안부 전해달래!' },
                { speaker: '오리 꽥이', text: '꼬부기가?! 잘 지내고 있구나~ 꽥! 고마워!' },
                { speaker: '카피', text: '응! 온천 마을에 귤이 다 떨어져서... 모두를 위해 찾아가는 중이야!' },
                { speaker: '오리 꽥이', text: '이 언덕 너머에 황금빛이 보여! 꽥!' },
                { speaker: '오리 꽥이', text: '근데 먼저 내 퀴즈에 도전해봐! 꽥! 📝' },
                { speaker: '카피', text: '좋아! 이번에도 맞출 수 있어!' },
            ], pickRandom(duckQuizzes)),
        ];

        // ---- Signposts ----
        signposts = [
            new Signpost(500, gY(500), '🌲 반짝이는 호수까지 1500m'),
            new Signpost(1500, gY(1500), '🌊 호수가 가까워지고 있어요!'),
            new Signpost(2500, gY(2500), '🌸 꽃 언덕까지 1500m'),
            new Signpost(3500, gY(3500), '🌺 꽃 언덕이 보여요!'),
            new Signpost(4500, gY(4500), '✨ 황금 귤 나무까지 2000m'),
            new Signpost(5500, gY(5500), '🌟 황금빛이 보여요! 거의 다 왔어요!'),
            new Signpost(5800, gY(5800), '🎉 황금 귤 나무에 도착!'),
        ];
    }

    function getStage(cameraX, canvasWidth) {
        const center = cameraX + canvasWidth / 2;
        if (center < 2000) return 0;
        if (center < 4000) return 1;
        if (center < 6000) return 2;
        return 3;
    }

    function getStageProgress(cameraX, canvasWidth) {
        const center = cameraX + canvasWidth / 2;
        return Math.min(center / WORLD_WIDTH, 1);
    }

    function getStageNames() {
        return ['🌲 숲', '🌊 반짝이는 호수', '🌸 꽃 언덕', '🌟 황금 귤 나무'];
    }

    return {
        WORLD_WIDTH, GROUND_RATIO,
        init, getGroundY, getTerrainOffset, terrainSegments,
        getTangerines: () => tangerines,
        getNPCs: () => npcs,
        getSignposts: () => signposts,
        getTotalTangerines: () => totalTangerines,
        getStage, getStageProgress, getStageNames,
    };
})();
