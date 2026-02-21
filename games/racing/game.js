// ============================================================
// TURBO RACING - Pseudo-3D Arcade Racer
// ============================================================

// ============================================================
// SECTION 1: CONSTANTS
// ============================================================
const CANVAS_W = 800;
const CANVAS_H = 400;
const ROAD_W = 2000;       // road width in world units
const SEG_LEN = 200;       // segment length
const DRAW_DIST = 150;     // how many segments ahead to draw
const LANES = 3;
const CAM_HEIGHT = 1500;
const CAM_DEPTH = 0.84;    // camera depth (FOV)

// ============================================================
// SECTION 2: AUDIO SYSTEM
// ============================================================
let audioCtx = null;
let musicGain = null;
let sfxGain = null;
let musicPlaying = false;
let musicMuted = false;
let currentMusicInterval = null;

function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    musicGain = audioCtx.createGain();
    musicGain.connect(audioCtx.destination);
    musicGain.gain.value = 0.2;
    sfxGain = audioCtx.createGain();
    sfxGain.connect(audioCtx.destination);
    sfxGain.gain.value = 0.3;
}

function playNote(freq, start, dur, type, gain) {
    if (!audioCtx || musicMuted) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.2, start);
    g.gain.exponentialRampToValueAtTime(0.01, start + dur);
    osc.connect(g);
    g.connect(gain || musicGain);
    osc.start(start);
    osc.stop(start + dur);
}

function playSFX(type) {
    if (!audioCtx || musicMuted) return;
    const now = audioCtx.currentTime;
    switch (type) {
        case 'coin':
            playNote(988, now, 0.05, 'square', sfxGain);
            playNote(1319, now + 0.04, 0.12, 'square', sfxGain);
            break;
        case 'nitro':
            for (let i = 0; i < 6; i++) playNote(200 + i * 100, now + i * 0.03, 0.08, 'sawtooth', sfxGain);
            break;
        case 'crash':
            playNote(150, now, 0.15, 'sawtooth', sfxGain);
            playNote(80, now + 0.1, 0.2, 'sawtooth', sfxGain);
            playNote(50, now + 0.2, 0.3, 'sawtooth', sfxGain);
            break;
        case 'lap':
            for (let i = 0; i < 5; i++) playNote(500 + i * 80, now + i * 0.05, 0.1, 'square', sfxGain);
            break;
        case 'finish':
            for (let i = 0; i < 8; i++) playNote(400 + i * 60, now + i * 0.06, 0.12, 'square', sfxGain);
            break;
        case 'engine':
            playNote(80, now, 0.04, 'sawtooth', sfxGain);
            break;
    }
}

function stopMusic() {
    musicPlaying = false;
    if (currentMusicInterval) { clearInterval(currentMusicInterval); currentMusicInterval = null; }
}

function playRaceMusic() {
    if (!audioCtx) return;
    stopMusic();
    musicPlaying = true;
    const melody = [
        523, 0, 659, 0, 784, 784, 659, 0, 523, 0, 587, 0, 659, 0, 523, 0,
        440, 0, 523, 0, 659, 659, 523, 0, 440, 0, 494, 0, 523, 0, 0, 0,
        587, 0, 698, 0, 880, 880, 698, 0, 587, 0, 659, 0, 698, 0, 587, 0,
        523, 0, 659, 0, 784, 0, 659, 0, 523, 0, 0, 0, 0, 0, 0, 0
    ];
    let i = 0;
    currentMusicInterval = setInterval(() => {
        if (!musicPlaying || musicMuted) return;
        if (melody[i] > 0) playNote(melody[i], audioCtx.currentTime, 0.1, 'square', musicGain);
        i = (i + 1) % melody.length;
    }, 120);
}

// ============================================================
// SECTION 3: GAME STATE
// ============================================================
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let gameState = 'MENU';
let segments = [];
let cars = [];         // AI opponents
let trackCoins = [];   // coins on track
let playerX = 0;       // -1 to 1 across road
let playerSpeed = 0;
let maxSpeed = SEG_LEN * 60;   // adjusted per car
let accel = maxSpeed / 100;
let decel = -maxSpeed / 80;
let braking = -maxSpeed / 40;
let offRoadDecel = -maxSpeed / 30;
let offRoadLimit = maxSpeed / 4;
let centrifugal = 0.3;
let steerSpeed = 3.5;
let position = 0;      // z position on track
let currentTrack = 0;
let currentLap = 0;
let totalLaps = 3;
let trackLength = 0;
let raceTime = 0;
let raceCoins = 0;
let playerPosition = 1; // placement
let nitroCount = 0;
let nitroActive = false;
let nitroTimer = 0;
let armorActive = false;
let magnetRange = 0;
let crashed = false;
let crashTimer = 0;
let frameCount = 0;
let countdownTimer = 0;
let countdownPhase = 0;

// ============================================================
// SECTION 4: SHOP & PERSISTENCE
// ============================================================
let coins = parseInt(localStorage.getItem('racingCoins')) || 0;
let ownedCars = JSON.parse(localStorage.getItem('racingOwnedCars')) || ['racer'];
let equippedCar = localStorage.getItem('racingEquippedCar') || 'racer';
let ownedUpgrades = JSON.parse(localStorage.getItem('racingOwnedUpgrades')) || { nitro: 0, armor: 0, magnet: 0 };

const carStats = {
    racer:    { price: 0, topSpeed: 1.0, accelMod: 1.0, handling: 1.0, nitroMod: 1, color: '#FF0000' },
    speedster:{ price: 100, topSpeed: 1.2, accelMod: 1.0, handling: 0.95, nitroMod: 1, color: '#0088FF' },
    muscle:   { price: 150, topSpeed: 1.0, accelMod: 1.3, handling: 0.9, nitroMod: 1, color: '#FF8800' },
    drift:    { price: 200, topSpeed: 1.05, accelMod: 1.0, handling: 1.3, nitroMod: 1, color: '#AA00FF' },
    turbo:    { price: 500, topSpeed: 1.2, accelMod: 1.3, handling: 1.2, nitroMod: 2, color: '#FFD700' }
};

const upgradePrices = { nitro: 50, armor: 75, magnet: 100 };

function saveCoins() { localStorage.setItem('racingCoins', coins); }

function updateCoinDisplay() {
    const el1 = document.getElementById('coin-amount');
    const el2 = document.getElementById('coin-amount-shop');
    if (el1) el1.textContent = coins;
    if (el2) el2.textContent = coins;
}

function updateShopUI() {
    document.querySelectorAll('.car-card').forEach(card => {
        const id = card.getAttribute('data-car');
        const btn = card.querySelector('.car-btn');
        if (ownedCars.includes(id)) {
            if (equippedCar === id) {
                btn.textContent = 'EQUIPPED'; btn.className = 'car-btn equipped'; btn.disabled = true;
            } else {
                btn.textContent = 'EQUIP'; btn.className = 'car-btn owned'; btn.disabled = false;
            }
        } else {
            btn.textContent = 'BUY'; btn.className = 'car-btn'; btn.disabled = coins < carStats[id].price;
        }
    });
    document.querySelectorAll('.upgrade-card').forEach(card => {
        const id = card.getAttribute('data-upgrade');
        card.querySelector('.upgrade-owned').textContent = ownedUpgrades[id] || 0;
        card.querySelector('.upgrade-btn').disabled = coins < upgradePrices[id];
    });
}

function initShopListeners() {
    document.querySelectorAll('.car-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const card = e.target.closest('.car-card');
            const id = card.getAttribute('data-car');
            if (!ownedCars.includes(id)) {
                if (coins >= carStats[id].price) {
                    coins -= carStats[id].price;
                    ownedCars.push(id);
                    localStorage.setItem('racingOwnedCars', JSON.stringify(ownedCars));
                    saveCoins(); equippedCar = id;
                    localStorage.setItem('racingEquippedCar', id);
                    updateCoinDisplay(); updateShopUI();
                }
            } else if (equippedCar !== id) {
                equippedCar = id;
                localStorage.setItem('racingEquippedCar', id);
                updateShopUI();
            }
        });
    });
    document.querySelectorAll('.upgrade-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const card = e.target.closest('.upgrade-card');
            const id = card.getAttribute('data-upgrade');
            if (coins >= upgradePrices[id]) {
                coins -= upgradePrices[id];
                ownedUpgrades[id] = (ownedUpgrades[id] || 0) + 1;
                localStorage.setItem('racingOwnedUpgrades', JSON.stringify(ownedUpgrades));
                saveCoins(); updateCoinDisplay(); updateShopUI();
            }
        });
    });
}

// ============================================================
// SECTION 5: TRACK GENERATION
// ============================================================
const TRACK_DATA = [
    { name: 'Sunny Speedway',  numSeg: 300, curviness: 0.5, hilliness: 0.3, scenery: 'grass',  laps: 3 },
    { name: 'Desert Dash',     numSeg: 350, curviness: 0.7, hilliness: 0.2, scenery: 'desert', laps: 3 },
    { name: 'Forest Run',      numSeg: 320, curviness: 0.8, hilliness: 0.5, scenery: 'forest', laps: 3 },
    { name: 'Mountain Pass',   numSeg: 400, curviness: 0.6, hilliness: 0.9, scenery: 'mountain', laps: 3 },
    { name: 'Night Circuit',   numSeg: 300, curviness: 0.9, hilliness: 0.3, scenery: 'night',  laps: 3 },
    { name: 'Coastal Drive',   numSeg: 350, curviness: 0.7, hilliness: 0.4, scenery: 'coast',  laps: 3 },
    { name: 'Ice Track',       numSeg: 320, curviness: 0.8, hilliness: 0.2, scenery: 'snow',   laps: 3 },
    { name: 'Inferno Circuit', numSeg: 450, curviness: 1.0, hilliness: 0.7, scenery: 'lava',   laps: 3 }
];

function buildTrack(trackIdx) {
    const td = TRACK_DATA[trackIdx];
    segments = [];
    const n = td.numSeg;

    for (let i = 0; i < n; i++) {
        const seg = {
            index: i,
            p: { world: { x: 0, y: 0, z: i * SEG_LEN }, camera: {}, screen: {} },
            curve: 0,
            hill: 0,
            color: {}
        };

        // Curves
        const t = i / n;
        if (t > 0.05 && t < 0.15) seg.curve = 2 * td.curviness;
        else if (t > 0.2 && t < 0.35) seg.curve = -3 * td.curviness;
        else if (t > 0.4 && t < 0.5) seg.curve = 4 * td.curviness;
        else if (t > 0.55 && t < 0.65) seg.curve = -2 * td.curviness;
        else if (t > 0.7 && t < 0.8) seg.curve = 3 * td.curviness;
        else if (t > 0.85 && t < 0.95) seg.curve = -1.5 * td.curviness;

        // Hills
        seg.p.world.y = Math.sin(t * Math.PI * 6) * 1500 * td.hilliness;

        // Segment coloring (alternating stripes)
        const dark = Math.floor(i / 3) % 2 === 0;
        seg.color = getTrackColors(td.scenery, dark);

        segments.push(seg);
    }

    trackLength = n * SEG_LEN;
    totalLaps = td.laps;
}

function getTrackColors(scenery, dark) {
    switch (scenery) {
        case 'grass':
            return { road: dark ? '#707070' : '#686868', grass: dark ? '#10AA10' : '#009A00', rumble: dark ? '#FF0000' : '#FFFFFF', lane: dark ? '#FFFFFF' : '' };
        case 'desert':
            return { road: dark ? '#808080' : '#757575', grass: dark ? '#C2A645' : '#B89830', rumble: dark ? '#FF8800' : '#FFFFFF', lane: dark ? '#FFFFFF' : '' };
        case 'forest':
            return { road: dark ? '#606060' : '#585858', grass: dark ? '#0C7A0C' : '#086A08', rumble: dark ? '#FF0000' : '#FFFFFF', lane: dark ? '#FFFF00' : '' };
        case 'mountain':
            return { road: dark ? '#686868' : '#606060', grass: dark ? '#608060' : '#507050', rumble: dark ? '#FF0000' : '#FFFFFF', lane: dark ? '#FFFFFF' : '' };
        case 'night':
            return { road: dark ? '#404040' : '#383838', grass: dark ? '#0A3A0A' : '#082A08', rumble: dark ? '#FFFF00' : '#000000', lane: dark ? '#FFFF00' : '' };
        case 'coast':
            return { road: dark ? '#707070' : '#686868', grass: dark ? '#DDB040' : '#CCA030', rumble: dark ? '#0088FF' : '#FFFFFF', lane: dark ? '#FFFFFF' : '' };
        case 'snow':
            return { road: dark ? '#808890' : '#787880', grass: dark ? '#DDDDEE' : '#CCCCDD', rumble: dark ? '#0044FF' : '#FFFFFF', lane: dark ? '#FFFF00' : '' };
        case 'lava':
            return { road: dark ? '#505050' : '#484848', grass: dark ? '#441100' : '#331000', rumble: dark ? '#FF4400' : '#FF8800', lane: dark ? '#FF0000' : '' };
        default:
            return { road: dark ? '#707070' : '#686868', grass: dark ? '#10AA10' : '#009A00', rumble: dark ? '#FF0000' : '#FFFFFF', lane: dark ? '#FFFFFF' : '' };
    }
}

function spawnTrackCoins(trackIdx) {
    trackCoins = [];
    const n = TRACK_DATA[trackIdx].numSeg;
    for (let i = 20; i < n; i += 8 + Math.floor(Math.random() * 12)) {
        trackCoins.push({
            segIndex: i,
            offset: (Math.random() - 0.5) * 1.2,
            collected: false
        });
    }
}

function spawnAICars() {
    cars = [];
    const aiColors = ['#0088FF', '#00CC00', '#FF8800', '#FF00FF', '#FFFFFF'];
    for (let i = 0; i < 5; i++) {
        cars.push({
            z: (i + 1) * SEG_LEN * 15,
            x: (Math.random() - 0.5) * 1.2,
            speed: maxSpeed * (0.55 + Math.random() * 0.35),
            color: aiColors[i],
            w: 1.2,
            lap: 0
        });
    }
}

// ============================================================
// SECTION 6: PROJECTION & RENDERING
// ============================================================
function project(p, cameraX, cameraY, cameraZ) {
    p.camera.x = (p.world.x || 0) - cameraX;
    p.camera.y = (p.world.y || 0) - cameraY;
    p.camera.z = (p.world.z || 0) - cameraZ;
    if (p.camera.z <= 0) p.camera.z = 0.001;
    p.screen.scale = CAM_DEPTH / p.camera.z;
    p.screen.x = Math.round(CANVAS_W / 2 + p.screen.scale * p.camera.x * CANVAS_W / 2);
    p.screen.y = Math.round(CANVAS_H / 2 - p.screen.scale * p.camera.y * CANVAS_H / 2);
    p.screen.w = Math.round(p.screen.scale * ROAD_W * CANVAS_W / 2);
}

function render() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Sky
    drawSky();

    const baseIdx = Math.floor(position / SEG_LEN) % segments.length;
    const baseSeg = segments[baseIdx];
    const playerY = baseSeg ? (baseSeg.p.world.y || 0) : 0;
    let curX = 0;
    let curY = 0;

    // Draw segments from back to front
    let maxY = CANVAS_H; // clip line

    for (let n = DRAW_DIST - 1; n >= 0; n--) {
        const idx = (baseIdx + n) % segments.length;
        const seg = segments[idx];
        // Accumulate curve offset
        // We need to do this front-to-back for correct projection
    }

    // We project front-to-back first to get x offsets, then draw back-to-front
    const projected = [];
    curX = 0;
    for (let n = 0; n < DRAW_DIST; n++) {
        const idx = (baseIdx + n) % segments.length;
        const seg = segments[idx];
        const segZ = seg.index * SEG_LEN;
        let loopedZ = segZ;
        if (segZ < position) loopedZ += trackLength;

        const p = { world: { x: curX, y: seg.p.world.y, z: loopedZ }, camera: {}, screen: {} };
        project(p, playerX * ROAD_W / 2, playerY + CAM_HEIGHT, position);
        projected[n] = { seg, p, curX };
        curX += seg.curve;
    }

    // Draw back-to-front
    for (let n = DRAW_DIST - 1; n > 0; n--) {
        const cur = projected[n];
        const prev = projected[n - 1];
        if (!cur || !prev) continue;

        const p1 = prev.p;
        const p2 = cur.p;

        if (p2.screen.y >= maxY) continue;

        const c = cur.seg.color;

        // Grass
        ctx.fillStyle = c.grass;
        ctx.fillRect(0, p2.screen.y, CANVAS_W, p1.screen.y - p2.screen.y);

        // Road
        drawPoly(ctx, c.road,
            p1.screen.x - p1.screen.w, p1.screen.y,
            p1.screen.x + p1.screen.w, p1.screen.y,
            p2.screen.x + p2.screen.w, p2.screen.y,
            p2.screen.x - p2.screen.w, p2.screen.y
        );

        // Rumble strips
        const rumbleW1 = p1.screen.w * 1.15;
        const rumbleW2 = p2.screen.w * 1.15;
        drawPoly(ctx, c.rumble,
            p1.screen.x - rumbleW1, p1.screen.y,
            p1.screen.x - p1.screen.w, p1.screen.y,
            p2.screen.x - p2.screen.w, p2.screen.y,
            p2.screen.x - rumbleW2, p2.screen.y
        );
        drawPoly(ctx, c.rumble,
            p1.screen.x + p1.screen.w, p1.screen.y,
            p1.screen.x + rumbleW1, p1.screen.y,
            p2.screen.x + rumbleW2, p2.screen.y,
            p2.screen.x + p2.screen.w, p2.screen.y
        );

        // Lane markers
        if (c.lane) {
            const laneW1 = p1.screen.w / 100;
            const laneW2 = p2.screen.w / 100;
            for (let lane = -1; lane <= 1; lane += 2) {
                const lx1 = p1.screen.x + p1.screen.w * lane / 3;
                const lx2 = p2.screen.x + p2.screen.w * lane / 3;
                drawPoly(ctx, c.lane,
                    lx1 - laneW1, p1.screen.y,
                    lx1 + laneW1, p1.screen.y,
                    lx2 + laneW2, p2.screen.y,
                    lx2 - laneW2, p2.screen.y
                );
            }
        }

        maxY = Math.min(maxY, p2.screen.y);
    }

    // Draw coins
    drawCoins(baseIdx, projected);

    // Draw AI cars
    drawAICars(baseIdx, projected);

    // Draw player car
    drawPlayerCar();

    // Draw nitro flames
    if (nitroActive) drawNitroFlames();

    // Countdown overlay
    if (countdownTimer > 0) drawCountdown();

    // Crash effect
    if (crashed) {
        ctx.fillStyle = `rgba(255,0,0,${0.3 * (crashTimer / 60)})`;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
}

function drawSky() {
    const td = TRACK_DATA[currentTrack];
    let skyTop, skyBot;
    switch (td.scenery) {
        case 'night':  skyTop = '#000022'; skyBot = '#001144'; break;
        case 'desert': skyTop = '#4488CC'; skyBot = '#FFCC66'; break;
        case 'snow':   skyTop = '#8899AA'; skyBot = '#CCDDEE'; break;
        case 'lava':   skyTop = '#220000'; skyBot = '#440800'; break;
        case 'coast':  skyTop = '#2266CC'; skyBot = '#88BBEE'; break;
        default:       skyTop = '#4488FF'; skyBot = '#88CCFF'; break;
    }
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H / 2);
    grad.addColorStop(0, skyTop);
    grad.addColorStop(1, skyBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H / 2);

    // Hills/horizon scenery
    ctx.fillStyle = TRACK_DATA[currentTrack].scenery === 'night' ? '#001800' : '#227722';
    if (td.scenery === 'desert') ctx.fillStyle = '#AA8833';
    if (td.scenery === 'snow') ctx.fillStyle = '#BBBBCC';
    if (td.scenery === 'lava') ctx.fillStyle = '#331100';
    if (td.scenery === 'coast') ctx.fillStyle = '#1155AA';

    const hillScroll = -(position * 0.001) % CANVAS_W;
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(hillScroll + i * 300, CANVAS_H / 2, 100 + (i % 2) * 40, Math.PI, 0);
        ctx.fill();
    }
}

function drawPoly(ctx, color, x1, y1, x2, y2, x3, y3, x4, y4) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
}

function drawPlayerCar() {
    const carData = carStats[equippedCar] || carStats.racer;
    const cx = CANVAS_W / 2;
    const cy = CANVAS_H - 30;
    const cw = 50;
    const ch = 30;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(cx - cw / 2 + 3, cy + 3, cw, ch / 3);

    // Car body
    ctx.fillStyle = carData.color;
    ctx.fillRect(cx - cw / 2, cy - ch, cw, ch);

    // Windshield
    ctx.fillStyle = '#88CCFF';
    ctx.fillRect(cx - 15, cy - ch + 3, 30, 10);

    // Wheels
    ctx.fillStyle = '#222';
    ctx.fillRect(cx - cw / 2 - 4, cy - ch + 2, 8, 10);
    ctx.fillRect(cx + cw / 2 - 4, cy - ch + 2, 8, 10);
    ctx.fillRect(cx - cw / 2 - 4, cy - 10, 8, 10);
    ctx.fillRect(cx + cw / 2 - 4, cy - 10, 8, 10);

    // Steer animation
    if (keys['ArrowLeft'] || keys['KeyA']) {
        ctx.fillStyle = carData.color;
        ctx.fillRect(cx - cw / 2 - 2, cy - ch + 5, cw + 4, ch - 5);
        ctx.fillStyle = '#88CCFF';
        ctx.fillRect(cx - 13, cy - ch + 5, 26, 8);
    } else if (keys['ArrowRight'] || keys['KeyD']) {
        ctx.fillStyle = carData.color;
        ctx.fillRect(cx - cw / 2 - 2, cy - ch + 5, cw + 4, ch - 5);
        ctx.fillStyle = '#88CCFF';
        ctx.fillRect(cx - 17, cy - ch + 5, 26, 8);
    }
}

function drawNitroFlames() {
    const cx = CANVAS_W / 2;
    const cy = CANVAS_H - 28;
    for (let i = 0; i < 5; i++) {
        const fx = cx - 8 + Math.random() * 16;
        const fy = cy + Math.random() * 10;
        const size = 4 + Math.random() * 6;
        ctx.fillStyle = Math.random() > 0.5 ? '#FF4400' : '#FFAA00';
        ctx.fillRect(fx, fy, size, size);
    }
}

function drawCoins(baseIdx, projected) {
    trackCoins.forEach(c => {
        if (c.collected) return;
        const relIdx = c.segIndex - baseIdx;
        const drawIdx = relIdx >= 0 ? relIdx : relIdx + segments.length;
        if (drawIdx < 1 || drawIdx >= DRAW_DIST) return;
        const proj = projected[drawIdx];
        if (!proj) return;
        const p = proj.p;
        const cx = p.screen.x + p.screen.w * c.offset;
        const cy = p.screen.y - 10 * p.screen.scale * 200;
        const size = Math.max(3, p.screen.w / 30);
        if (cy < 0 || cy > CANVAS_H) return;
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(cx, cy, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#CC9900';
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawAICars(baseIdx, projected) {
    cars.forEach(car => {
        const carSeg = Math.floor(car.z / SEG_LEN) % segments.length;
        const relIdx = carSeg - baseIdx;
        const drawIdx = relIdx >= 0 ? relIdx : relIdx + segments.length;
        if (drawIdx < 1 || drawIdx >= DRAW_DIST) return;
        const proj = projected[drawIdx];
        if (!proj) return;
        const p = proj.p;
        const cx = p.screen.x + p.screen.w * car.x;
        const cy = p.screen.y;
        const w = Math.max(8, p.screen.w / 12);
        const h = w * 0.6;
        if (cy < 0 || cy > CANVAS_H) return;
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(cx - w / 2 + 2, cy + 2, w, h / 3);
        // Car body
        ctx.fillStyle = car.color;
        ctx.fillRect(cx - w / 2, cy - h, w, h);
        // Windshield
        ctx.fillStyle = '#88CCFF';
        ctx.fillRect(cx - w / 4, cy - h + 2, w / 2, h / 3);
    });
}

function drawCountdown() {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = countdownPhase === 0 ? '#FF0000' : (countdownPhase === 1 ? '#FFFF00' : '#00FF00');
    ctx.font = '64px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = countdownPhase < 3 ? String(3 - countdownPhase) : 'GO!';
    ctx.fillText(text, CANVAS_W / 2, CANVAS_H / 2);
}

// ============================================================
// SECTION 7: GAME UPDATE
// ============================================================
function update(dt) {
    if (countdownTimer > 0) {
        countdownTimer -= dt;
        countdownPhase = Math.floor((180 - countdownTimer) / 60);
        if (countdownPhase > 3) countdownPhase = 3;
        if (countdownTimer <= 0) { countdownTimer = 0; }
        return;
    }

    if (crashed) {
        crashTimer--;
        playerSpeed *= 0.95;
        if (crashTimer <= 0) {
            crashed = false;
            playerSpeed = 0;
        }
        position += playerSpeed * dt;
        if (position >= trackLength) position -= trackLength;
        if (position < 0) position += trackLength;
        return;
    }

    const carData = carStats[equippedCar] || carStats.racer;
    const currentMaxSpeed = maxSpeed * carData.topSpeed * (nitroActive ? 1.5 : 1);
    const currentAccel = accel * carData.accelMod;
    const steer = steerSpeed * carData.handling;

    // Input
    if (keys['ArrowUp'] || keys['KeyW']) {
        playerSpeed += currentAccel * dt;
    } else if (keys['ArrowDown'] || keys['KeyS']) {
        playerSpeed += braking * dt;
    } else {
        playerSpeed += decel * dt;
    }

    // Steering
    const segIdx = Math.floor(position / SEG_LEN) % segments.length;
    const seg = segments[segIdx];
    const speedPct = playerSpeed / maxSpeed;

    if (keys['ArrowLeft'] || keys['KeyA']) {
        playerX -= steer * speedPct * dt;
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
        playerX += steer * speedPct * dt;
    }

    // Centrifugal force from curves
    if (seg) playerX += seg.curve * speedPct * centrifugal * dt;

    // Off road
    if (Math.abs(playerX) > 1.0) {
        playerSpeed += offRoadDecel * dt;
        if (playerSpeed > offRoadLimit) playerSpeed = offRoadLimit;
    }

    // Clamp
    if (playerSpeed > currentMaxSpeed) playerSpeed = currentMaxSpeed;
    if (playerSpeed < 0) playerSpeed = 0;
    playerX = Math.max(-2.5, Math.min(2.5, playerX));

    // Nitro
    if (nitroActive) {
        nitroTimer--;
        if (nitroTimer <= 0) nitroActive = false;
    }

    // Move
    position += playerSpeed * dt;

    // Lap detection
    if (position >= trackLength) {
        position -= trackLength;
        currentLap++;
        if (currentLap >= totalLaps) {
            raceComplete();
            return;
        }
        playSFX('lap');
        // Re-enable coins
        trackCoins.forEach(c => c.collected = false);
    }
    if (position < 0) position += trackLength;

    // Race time
    raceTime += dt;

    // Coin collection
    const playerSeg = Math.floor(position / SEG_LEN) % segments.length;
    const magnetW = 0.3 + magnetRange * 0.2;
    trackCoins.forEach(c => {
        if (c.collected) return;
        if (c.segIndex === playerSeg || c.segIndex === (playerSeg + 1) % segments.length) {
            if (Math.abs(c.offset - playerX) < magnetW) {
                c.collected = true;
                raceCoins++;
                coins++;
                saveCoins();
                playSFX('coin');
            }
        }
    });

    // AI car collision
    cars.forEach(car => {
        const carSeg = Math.floor(car.z / SEG_LEN) % segments.length;
        if (Math.abs(carSeg - playerSeg) < 2) {
            if (Math.abs(car.x - playerX) < 0.5) {
                if (!crashed && !armorActive) {
                    crashed = true;
                    crashTimer = 60;
                    playerSpeed *= 0.3;
                    playSFX('crash');
                } else if (armorActive) {
                    armorActive = false;
                    car.x += car.x < playerX ? -1 : 1;
                    playSFX('crash');
                }
            }
        }
    });

    // Update AI
    updateAI(dt);

    // Calculate position
    playerPosition = 1;
    cars.forEach(car => {
        const carProgress = car.lap * trackLength + car.z;
        const playerProgress = currentLap * trackLength + position;
        if (carProgress > playerProgress) playerPosition++;
    });

    // Update HUD
    const mph = Math.floor((playerSpeed / maxSpeed) * 200);
    document.getElementById('ui-speed').textContent = mph + ' MPH';
    document.getElementById('ui-lap').textContent = 'LAP ' + Math.min(currentLap + 1, totalLaps) + '/' + totalLaps;
    const posStr = ['1st', '2nd', '3rd', '4th', '5th', '6th'][playerPosition - 1] || playerPosition + 'th';
    document.getElementById('ui-position').textContent = 'POS ' + posStr;
    const secs = Math.floor(raceTime / 60);
    const mins = Math.floor(secs / 60);
    const secR = secs % 60;
    document.getElementById('ui-time').textContent = mins + ':' + String(secR).padStart(2, '0');
}

function updateAI(dt) {
    cars.forEach(car => {
        car.z += car.speed * dt;
        // Slight curve following
        const carSeg = Math.floor(car.z / SEG_LEN) % segments.length;
        const seg = segments[carSeg];
        if (seg) car.x -= seg.curve * 0.01;
        car.x = Math.max(-1.0, Math.min(1.0, car.x));
        // Lap
        if (car.z >= trackLength) {
            car.z -= trackLength;
            car.lap++;
        }
        // Speed variation
        car.speed += (Math.random() - 0.5) * 50;
        car.speed = Math.max(maxSpeed * 0.4, Math.min(maxSpeed * 0.85, car.speed));
    });
}

// ============================================================
// SECTION 8: GAME STATE MANAGEMENT
// ============================================================
function startGame() {
    initAudio();
    gameState = 'PLAYING';
    currentTrack = 0;
    loadTrack(currentTrack);
    showScreen(null);
    playRaceMusic();
}

function loadTrack(idx) {
    buildTrack(idx);
    spawnTrackCoins(idx);
    spawnAICars();

    const carData = carStats[equippedCar] || carStats.racer;

    position = 0;
    playerX = 0;
    playerSpeed = 0;
    currentLap = 0;
    raceTime = 0;
    raceCoins = 0;
    crashed = false;
    crashTimer = 0;
    nitroActive = false;
    nitroTimer = 0;
    armorActive = false;
    magnetRange = 0;
    frameCount = 0;

    // Apply upgrades
    nitroCount = 1 + (ownedUpgrades.nitro || 0);
    nitroCount = Math.floor(nitroCount * carData.nitroMod);
    if (ownedUpgrades.armor > 0) {
        ownedUpgrades.armor--;
        localStorage.setItem('racingOwnedUpgrades', JSON.stringify(ownedUpgrades));
        armorActive = true;
    }
    if (ownedUpgrades.magnet > 0) {
        ownedUpgrades.magnet--;
        localStorage.setItem('racingOwnedUpgrades', JSON.stringify(ownedUpgrades));
        magnetRange = 2;
    }

    // Countdown
    countdownTimer = 180; // 3 seconds
    countdownPhase = 0;

    // HUD
    document.getElementById('ui-lap').textContent = 'LAP 1/' + totalLaps;
    document.getElementById('ui-position').textContent = 'POS 1st';
    document.getElementById('ui-speed').textContent = '0 MPH';
    document.getElementById('ui-time').textContent = '0:00';
}

function raceComplete() {
    gameState = 'RACE_COMPLETE';
    stopMusic();
    playSFX('finish');

    const secs = Math.floor(raceTime / 60);
    const mins = Math.floor(secs / 60);
    const secR = secs % 60;
    const timeStr = mins + ':' + String(secR).padStart(2, '0');

    // Rewards based on position
    const rewards = [100, 60, 40, 25, 15, 5];
    const reward = rewards[playerPosition - 1] || 5;
    coins += reward + raceCoins;
    saveCoins();

    const posStr = ['1st', '2nd', '3rd', '4th', '5th', '6th'][playerPosition - 1] || playerPosition + 'th';
    document.getElementById('rc-position').textContent = posStr;
    document.getElementById('rc-time').textContent = timeStr;
    document.getElementById('rc-coins').textContent = raceCoins;
    document.getElementById('rc-reward').textContent = (reward + raceCoins) + ' coins';

    updateCoinDisplay();
    showScreen('race-complete-screen');
}

function nextTrack() {
    currentTrack++;
    if (currentTrack >= TRACK_DATA.length) {
        showVictory();
    } else {
        gameState = 'PLAYING';
        loadTrack(currentTrack);
        showScreen(null);
        playRaceMusic();
    }
}

function showGameOver() {
    gameState = 'GAME_OVER';
    stopMusic();
    document.getElementById('final-track').textContent = 'Track: ' + TRACK_DATA[currentTrack].name;
    const posStr = ['1st', '2nd', '3rd', '4th', '5th', '6th'][playerPosition - 1] || playerPosition + 'th';
    document.getElementById('final-position').textContent = 'Position: ' + posStr;
    saveCoins();
    updateCoinDisplay();
    showScreen('game-over-screen');
}

function showVictory() {
    gameState = 'VICTORY';
    stopMusic();
    playSFX('finish');
    coins += 200;
    saveCoins();
    const secs = Math.floor(raceTime / 60);
    const mins = Math.floor(secs / 60);
    const secR = secs % 60;
    document.getElementById('victory-time').textContent = 'Total Time: ' + mins + ':' + String(secR).padStart(2, '0');
    updateCoinDisplay();
    showScreen('victory-screen');
}

function goToMainMenu() {
    gameState = 'MENU';
    stopMusic();
    showScreen('start-screen');
    updateCoinDisplay();
}

// ============================================================
// SECTION 9: INPUT HANDLING
// ============================================================
let keys = {};

document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
    }
    // Nitro
    if (e.code === 'Space' && gameState === 'PLAYING' && !nitroActive && nitroCount > 0 && countdownTimer <= 0) {
        nitroActive = true;
        nitroTimer = 120; // 2 seconds
        nitroCount--;
        playSFX('nitro');
    }
});

document.addEventListener('keyup', e => {
    keys[e.code] = false;
});

// ============================================================
// SECTION 10: SCREEN MANAGEMENT & EVENTS
// ============================================================
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    if (id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    }
}

document.getElementById('start-btn').addEventListener('click', () => startGame());
document.getElementById('shop-btn').addEventListener('click', () => { showScreen('shop-screen'); updateShopUI(); updateCoinDisplay(); });
document.getElementById('back-btn').addEventListener('click', () => showScreen('start-screen'));
document.getElementById('next-track-btn').addEventListener('click', () => nextTrack());
document.getElementById('restart-btn').addEventListener('click', () => { gameState = 'PLAYING'; loadTrack(currentTrack); showScreen(null); playRaceMusic(); });
document.getElementById('menu-btn').addEventListener('click', () => goToMainMenu());
document.getElementById('play-again-btn').addEventListener('click', () => startGame());
document.getElementById('victory-menu-btn').addEventListener('click', () => goToMainMenu());
document.getElementById('music-btn').addEventListener('click', () => {
    initAudio();
    musicMuted = !musicMuted;
    document.getElementById('music-btn').textContent = musicMuted ? 'MUSIC OFF' : 'MUSIC ON';
    if (musicMuted) stopMusic();
});

// ============================================================
// SECTION 11: GAME LOOP
// ============================================================
function gameLoop() {
    frameCount++;
    const dt = 1; // fixed step

    if (gameState === 'PLAYING') {
        update(dt);
        render();
    }

    requestAnimationFrame(gameLoop);
}

// ============================================================
// SECTION 12: INITIALIZATION
// ============================================================
function init() {
    initShopListeners();
    updateCoinDisplay();
    showScreen('start-screen');
    gameLoop();
}

init();
