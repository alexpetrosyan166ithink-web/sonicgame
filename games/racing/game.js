// ============================================================
// TURBO RACING - Pseudo-3D Arcade Racer
// ============================================================

// ============================================================
// SECTION 1: CONSTANTS
// ============================================================
const CANVAS_W = 800;
const CANVAS_H = 400;
const ROAD_W = 2000;
const SEG_LEN = 200;
const DRAW_DIST = 120;
const CAM_HEIGHT = 500;
const CAM_DEPTH = 0.84;

// Physics (tuned for per-frame at 60fps)
const MAX_SPEED = 45;
const ACCEL = 0.5;
const DECEL = -0.15;
const BRAKE = -0.7;
const OFF_ROAD_DECEL = -0.6;
const OFF_ROAD_LIMIT = 12;
const STEER_SPEED = 0.035;
const CENTRIFUGAL = 0.0025;

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
let cars = [];
let trackCoins = [];
let playerX = 0;        // -1 to 1 across road
let playerSpeed = 0;
let position = 0;       // z position on track
let currentTrack = 0;
let currentLap = 0;
let totalLaps = 3;
let trackLength = 0;
let raceTime = 0;
let raceCoins = 0;
let playerPosition = 1;
let nitroCount = 0;
let nitroActive = false;
let nitroTimer = 0;
let armorActive = false;
let magnetRange = 0;
let crashed = false;
let crashTimer = 0;
let crashInvincible = 0;
let frameCount = 0;
let countdownTimer = 0;
let countdownPhase = 0;
let keys = {};

// ============================================================
// SECTION 4: SHOP & PERSISTENCE
// ============================================================
let coins = parseInt(localStorage.getItem('racingCoins')) || 0;
let ownedCars = JSON.parse(localStorage.getItem('racingOwnedCars')) || ['racer'];
let equippedCar = localStorage.getItem('racingEquippedCar') || 'racer';
let ownedUpgrades = JSON.parse(localStorage.getItem('racingOwnedUpgrades')) || { nitro: 0, armor: 0, magnet: 0 };

const carStats = {
    racer:    { price: 0,   topSpeed: 1.0,  accelMod: 1.0,  handling: 1.0,  nitroMod: 1, color: '#FF0000' },
    speedster:{ price: 100, topSpeed: 1.20, accelMod: 1.0,  handling: 0.95, nitroMod: 1, color: '#0088FF' },
    muscle:   { price: 150, topSpeed: 1.0,  accelMod: 1.30, handling: 0.9,  nitroMod: 1, color: '#FF8800' },
    drift:    { price: 200, topSpeed: 1.05, accelMod: 1.0,  handling: 1.30, nitroMod: 1, color: '#AA00FF' },
    turbo:    { price: 500, topSpeed: 1.20, accelMod: 1.30, handling: 1.20, nitroMod: 2, color: '#FFD700' }
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
                    saveCoins();
                    equippedCar = id;
                    localStorage.setItem('racingEquippedCar', id);
                    updateCoinDisplay();
                    updateShopUI();
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
                saveCoins();
                updateCoinDisplay();
                updateShopUI();
            }
        });
    });
}

// ============================================================
// SECTION 5: TRACK GENERATION
// ============================================================
const TRACK_DATA = [
    { name: 'Sunny Speedway',  numSeg: 300, curviness: 0.5, hilliness: 0.3, scenery: 'grass',    laps: 3 },
    { name: 'Desert Dash',     numSeg: 350, curviness: 0.7, hilliness: 0.2, scenery: 'desert',   laps: 3 },
    { name: 'Forest Run',      numSeg: 320, curviness: 0.8, hilliness: 0.5, scenery: 'forest',   laps: 3 },
    { name: 'Mountain Pass',   numSeg: 400, curviness: 0.6, hilliness: 0.9, scenery: 'mountain', laps: 3 },
    { name: 'Night Circuit',   numSeg: 300, curviness: 0.9, hilliness: 0.3, scenery: 'night',    laps: 3 },
    { name: 'Coastal Drive',   numSeg: 350, curviness: 0.7, hilliness: 0.4, scenery: 'coast',    laps: 3 },
    { name: 'Ice Track',       numSeg: 320, curviness: 0.8, hilliness: 0.2, scenery: 'snow',     laps: 3 },
    { name: 'Inferno Circuit', numSeg: 450, curviness: 1.0, hilliness: 0.7, scenery: 'lava',     laps: 3 }
];

function buildTrack(trackIdx) {
    const td = TRACK_DATA[trackIdx];
    segments = [];
    const n = td.numSeg;

    for (let i = 0; i < n; i++) {
        const seg = {
            index: i,
            p: { world: { y: 0, z: i * SEG_LEN }, camera: {}, screen: {} },
            curve: 0,
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
        seg.p.world.y = Math.sin(t * Math.PI * 6) * 400 * td.hilliness;

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
            return { road: dark ? '#707070' : '#686868', grass: dark ? '#10AA10' : '#009A00', rumble: dark ? '#FF0000' : '#FFFFFF', lane: dark ? '#FFFFFF' : null };
        case 'desert':
            return { road: dark ? '#808080' : '#757575', grass: dark ? '#C2A645' : '#B89830', rumble: dark ? '#FF8800' : '#FFFFFF', lane: dark ? '#FFFFFF' : null };
        case 'forest':
            return { road: dark ? '#606060' : '#585858', grass: dark ? '#0C7A0C' : '#086A08', rumble: dark ? '#FF0000' : '#FFFFFF', lane: dark ? '#FFFF00' : null };
        case 'mountain':
            return { road: dark ? '#686868' : '#606060', grass: dark ? '#608060' : '#507050', rumble: dark ? '#FF0000' : '#FFFFFF', lane: dark ? '#FFFFFF' : null };
        case 'night':
            return { road: dark ? '#404040' : '#383838', grass: dark ? '#0A3A0A' : '#082A08', rumble: dark ? '#FFFF00' : '#000000', lane: dark ? '#FFFF00' : null };
        case 'coast':
            return { road: dark ? '#707070' : '#686868', grass: dark ? '#DDB040' : '#CCA030', rumble: dark ? '#0088FF' : '#FFFFFF', lane: dark ? '#FFFFFF' : null };
        case 'snow':
            return { road: dark ? '#808890' : '#787880', grass: dark ? '#DDDDEE' : '#CCCCDD', rumble: dark ? '#0044FF' : '#FFFFFF', lane: dark ? '#FFFF00' : null };
        case 'lava':
            return { road: dark ? '#505050' : '#484848', grass: dark ? '#441100' : '#331000', rumble: dark ? '#FF4400' : '#FF8800', lane: dark ? '#FF0000' : null };
        default:
            return { road: dark ? '#707070' : '#686868', grass: dark ? '#10AA10' : '#009A00', rumble: dark ? '#FF0000' : '#FFFFFF', lane: dark ? '#FFFFFF' : null };
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
            z: (i + 1) * SEG_LEN * 10,
            x: -0.6 + i * 0.3,
            speed: MAX_SPEED * (0.6 + Math.random() * 0.25),
            color: aiColors[i],
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
    if (p.camera.z <= 0) p.camera.z = 1;
    p.screen.scale = CAM_DEPTH / p.camera.z;
    p.screen.x = Math.round(CANVAS_W / 2 + p.screen.scale * p.camera.x * CANVAS_W / 2);
    p.screen.y = Math.round(CANVAS_H / 2 - p.screen.scale * p.camera.y * CANVAS_H / 2);
    p.screen.w = Math.round(p.screen.scale * ROAD_W * CANVAS_W / 2);
}

function drawPoly(color, x1, y1, x2, y2, x3, y3, x4, y4) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
}

function render() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    if (segments.length === 0) return;

    drawSky();

    const baseIdx = Math.floor(position / SEG_LEN) % segments.length;
    const baseSeg = segments[baseIdx];
    const playerY = baseSeg.p.world.y || 0;

    // Ground fill below horizon (overdrawn by road segments)
    ctx.fillStyle = baseSeg.color.grass;
    ctx.fillRect(0, CANVAS_H / 2, CANVAS_W, CANVAS_H / 2);

    // Project all visible segments front-to-back (to accumulate curve offsets)
    const projected = [];
    let cumCurveX = 0;

    for (let n = 0; n < DRAW_DIST; n++) {
        const idx = (baseIdx + n) % segments.length;
        const seg = segments[idx];
        let segZ = idx * SEG_LEN;
        // Handle track wrap-around
        if (segZ < position - SEG_LEN) segZ += trackLength;

        const p = {
            world: { x: cumCurveX, y: seg.p.world.y, z: segZ },
            camera: {},
            screen: {}
        };
        project(p, playerX * ROAD_W / 2, playerY + CAM_HEIGHT, position);
        projected[n] = { seg, p };

        cumCurveX += seg.curve * (n > 0 ? 1 : 0);
    }

    // Draw back-to-front (painter's algorithm — closer segments overdraw farther ones)
    for (let n = DRAW_DIST - 1; n > 0; n--) {
        const cur = projected[n];
        const prev = projected[n - 1];
        if (!cur || !prev) continue;

        const p1 = prev.p;
        const p2 = cur.p;

        const c = cur.seg.color;
        const drawH = p1.screen.y - p2.screen.y;
        if (drawH <= 0) continue;

        // Skip segments entirely above or below canvas
        if (p1.screen.y < 0 && p2.screen.y < 0) continue;

        // Grass
        ctx.fillStyle = c.grass;
        ctx.fillRect(0, p2.screen.y, CANVAS_W, drawH + 1);

        // Road
        drawPoly(c.road,
            p1.screen.x - p1.screen.w, p1.screen.y,
            p1.screen.x + p1.screen.w, p1.screen.y,
            p2.screen.x + p2.screen.w, p2.screen.y,
            p2.screen.x - p2.screen.w, p2.screen.y
        );

        // Rumble strips
        const rw1 = p1.screen.w * 1.12;
        const rw2 = p2.screen.w * 1.12;
        drawPoly(c.rumble,
            p1.screen.x - rw1, p1.screen.y,
            p1.screen.x - p1.screen.w, p1.screen.y,
            p2.screen.x - p2.screen.w, p2.screen.y,
            p2.screen.x - rw2, p2.screen.y
        );
        drawPoly(c.rumble,
            p1.screen.x + p1.screen.w, p1.screen.y,
            p1.screen.x + rw1, p1.screen.y,
            p2.screen.x + rw2, p2.screen.y,
            p2.screen.x + p2.screen.w, p2.screen.y
        );

        // Lane markers
        if (c.lane) {
            const lw1 = Math.max(1, p1.screen.w / 80);
            const lw2 = Math.max(1, p2.screen.w / 80);
            for (let lane = -1; lane <= 1; lane += 2) {
                const lx1 = p1.screen.x + p1.screen.w * lane / 3;
                const lx2 = p2.screen.x + p2.screen.w * lane / 3;
                drawPoly(c.lane,
                    lx1 - lw1, p1.screen.y,
                    lx1 + lw1, p1.screen.y,
                    lx2 + lw2, p2.screen.y,
                    lx2 - lw2, p2.screen.y
                );
            }
        }
    }

    // Draw coins on track
    drawCoins(baseIdx, projected);

    // Draw AI cars
    drawAICars(baseIdx, projected);

    // Draw player car at bottom center
    drawPlayerCar();

    // Nitro flame effect
    if (nitroActive) drawNitroFlames();

    // Countdown overlay
    if (countdownTimer > 0) drawCountdown();

    // Crash red flash
    if (crashed) {
        ctx.fillStyle = 'rgba(255,0,0,' + (0.3 * crashTimer / 60).toFixed(2) + ')';
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
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Horizon hills (parallax)
    let hillColor;
    switch (td.scenery) {
        case 'night': hillColor = '#001800'; break;
        case 'desert': hillColor = '#AA8833'; break;
        case 'snow': hillColor = '#BBBBCC'; break;
        case 'lava': hillColor = '#331100'; break;
        case 'coast': hillColor = '#1155AA'; break;
        default: hillColor = '#227722'; break;
    }
    ctx.fillStyle = hillColor;
    const scroll = -(position * 0.0005) % 300;
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(scroll + i * 250, CANVAS_H / 2 + 5, 90 + (i % 3) * 30, Math.PI, 0);
        ctx.fill();
    }
}

function drawPlayerCar() {
    // Flicker during invincibility
    if (crashInvincible > 0 && Math.floor(crashInvincible / 4) % 2 === 0) return;

    const carData = carStats[equippedCar] || carStats.racer;
    const cx = CANVAS_W / 2;
    const cy = CANVAS_H - 20;
    const w = 54;
    const h = 36;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, w / 2 + 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main body
    ctx.fillStyle = carData.color;
    // Lower body
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h / 2);
    // Upper body (cabin)
    ctx.fillRect(cx - w / 3, cy - h, w * 2 / 3, h / 2 + 2);

    // Windshield
    ctx.fillStyle = '#88CCFF';
    ctx.fillRect(cx - w / 3 + 3, cy - h + 2, w * 2 / 3 - 6, h / 3);

    // Wheels
    ctx.fillStyle = '#111';
    ctx.fillRect(cx - w / 2 - 3, cy - h / 2 + 1, 7, 12);
    ctx.fillRect(cx + w / 2 - 4, cy - h / 2 + 1, 7, 12);
    ctx.fillRect(cx - w / 2 - 3, cy - 6, 7, 10);
    ctx.fillRect(cx + w / 2 - 4, cy - 6, 7, 10);

    // Headlights
    ctx.fillStyle = '#FFFF88';
    ctx.fillRect(cx - w / 2 + 4, cy - h / 2 - 2, 6, 3);
    ctx.fillRect(cx + w / 2 - 10, cy - h / 2 - 2, 6, 3);

    // Speed lines when moving fast
    if (playerSpeed > MAX_SPEED * 0.7) {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const lx = cx - 60 + i * 40 + (frameCount * 3 % 20);
            ctx.beginPath();
            ctx.moveTo(lx, cy + 8);
            ctx.lineTo(lx - 15, cy + 14);
            ctx.stroke();
        }
    }
}

function drawNitroFlames() {
    const cx = CANVAS_W / 2;
    const cy = CANVAS_H - 16;
    for (let i = 0; i < 8; i++) {
        const fx = cx - 10 + Math.random() * 20;
        const fy = cy + 2 + Math.random() * 12;
        const size = 3 + Math.random() * 5;
        ctx.fillStyle = ['#FF4400', '#FFAA00', '#FFFF00'][Math.floor(Math.random() * 3)];
        ctx.fillRect(fx, fy, size, size);
    }
}

function drawCoins(baseIdx, projected) {
    trackCoins.forEach(c => {
        if (c.collected) return;
        let relIdx = c.segIndex - baseIdx;
        if (relIdx < 0) relIdx += segments.length;
        if (relIdx < 1 || relIdx >= DRAW_DIST) return;
        const proj = projected[relIdx];
        if (!proj) return;
        const p = proj.p;
        if (p.screen.y < 10 || p.screen.y > CANVAS_H - 50) return;
        const cx = p.screen.x + p.screen.w * c.offset;
        const cy = p.screen.y - Math.max(4, p.screen.w * 0.02);
        const size = Math.max(3, Math.min(10, p.screen.w / 40));
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(cx, cy, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFAA00';
        ctx.beginPath();
        ctx.arc(cx - size * 0.2, cy - size * 0.2, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawAICars(baseIdx, projected) {
    // Sort by distance (farthest first) for proper z-order
    const sorted = cars.map(car => {
        const carSeg = Math.floor(car.z / SEG_LEN) % segments.length;
        let relIdx = carSeg - baseIdx;
        if (relIdx < 0) relIdx += segments.length;
        return { car, relIdx };
    }).filter(c => c.relIdx > 0 && c.relIdx < DRAW_DIST).sort((a, b) => b.relIdx - a.relIdx);

    sorted.forEach(({ car, relIdx }) => {
        const proj = projected[relIdx];
        if (!proj) return;
        const p = proj.p;
        if (p.screen.y < 10 || p.screen.y > CANVAS_H - 50) return;
        const cx = p.screen.x + p.screen.w * car.x;
        const w = Math.max(6, Math.min(40, p.screen.w / 14));
        const h = w * 0.7;
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(cx, p.screen.y + 2, w / 2, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Body
        ctx.fillStyle = car.color;
        ctx.fillRect(cx - w / 2, p.screen.y - h, w, h);
        // Windshield
        ctx.fillStyle = '#88CCFF';
        ctx.fillRect(cx - w / 4, p.screen.y - h + 1, w / 2, h / 3);
    });
}

function drawCountdown() {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const elapsed = 210 - countdownTimer;
    const phase = Math.min(3, Math.floor(elapsed / 60));
    ctx.fillStyle = phase === 0 ? '#FF0000' : (phase === 1 ? '#FFFF00' : '#00FF00');
    ctx.font = '64px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(phase < 3 ? String(3 - phase) : 'GO!', CANVAS_W / 2, CANVAS_H / 2);
}

// ============================================================
// SECTION 7: GAME UPDATE
// ============================================================
function update() {
    // Countdown
    if (countdownTimer > 0) {
        countdownTimer--;
        return;
    }

    // Crash invincibility cooldown
    if (crashInvincible > 0) crashInvincible--;

    // Crash recovery
    if (crashed) {
        crashTimer--;
        playerSpeed *= 0.96;
        if (crashTimer <= 0) {
            crashed = false;
            crashInvincible = 90; // 1.5 seconds of invincibility after crash
            if (playerSpeed < 5) playerSpeed = 5; // keep some momentum so player can keep going
        }
        position += playerSpeed;
        if (position >= trackLength) position -= trackLength;
        if (position < 0) position += trackLength;
        return;
    }

    const carData = carStats[equippedCar] || carStats.racer;
    const topSpeed = MAX_SPEED * carData.topSpeed * (nitroActive ? 1.5 : 1);
    const accelRate = ACCEL * carData.accelMod;
    const steer = STEER_SPEED * carData.handling;

    // Acceleration / braking
    if (keys['ArrowUp'] || keys['KeyW']) {
        playerSpeed += accelRate;
    } else if (keys['ArrowDown'] || keys['KeyS']) {
        playerSpeed += BRAKE;
    } else {
        playerSpeed += DECEL;
    }

    // Clamp speed
    if (playerSpeed > topSpeed) playerSpeed = topSpeed;
    if (playerSpeed < 0) playerSpeed = 0;

    // Steering (scales with speed)
    const speedPct = playerSpeed / MAX_SPEED;

    if (keys['ArrowLeft'] || keys['KeyA']) {
        playerX -= steer * speedPct;
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
        playerX += steer * speedPct;
    }

    // Centrifugal force from curves
    const segIdx = Math.floor(position / SEG_LEN) % segments.length;
    const seg = segments[segIdx];
    if (seg) {
        playerX += seg.curve * speedPct * CENTRIFUGAL;
    }

    // Off-road slowdown
    if (Math.abs(playerX) > 1.0) {
        playerSpeed += OFF_ROAD_DECEL;
        if (playerSpeed > OFF_ROAD_LIMIT) playerSpeed = OFF_ROAD_LIMIT;
        if (playerSpeed < 0) playerSpeed = 0;
    }

    // Clamp lateral position
    playerX = Math.max(-2.5, Math.min(2.5, playerX));

    // Nitro timer
    if (nitroActive) {
        nitroTimer--;
        if (nitroTimer <= 0) nitroActive = false;
    }

    // Move forward
    position += playerSpeed;

    // Lap check
    if (position >= trackLength) {
        position -= trackLength;
        currentLap++;
        if (currentLap >= totalLaps) {
            raceComplete();
            return;
        }
        playSFX('lap');
        trackCoins.forEach(c => c.collected = false);
    }
    if (position < 0) position += trackLength;

    // Race timer
    raceTime++;

    // Coin collection
    const playerSeg = Math.floor(position / SEG_LEN) % segments.length;
    const magnetW = 0.3 + magnetRange * 0.2;
    trackCoins.forEach(c => {
        if (c.collected) return;
        if (Math.abs(c.segIndex - playerSeg) <= 1 ||
            Math.abs(c.segIndex - playerSeg) >= segments.length - 1) {
            if (Math.abs(c.offset - playerX) < magnetW) {
                c.collected = true;
                raceCoins++;
                coins++;
                saveCoins();
                playSFX('coin');
            }
        }
    });

    // AI collision
    cars.forEach(car => {
        const carSeg = Math.floor(car.z / SEG_LEN) % segments.length;
        const segDiff = Math.abs(carSeg - playerSeg);
        if (segDiff < 3 || segDiff > segments.length - 3) {
            if (Math.abs(car.x - playerX) < 0.4) {
                if (!crashed && crashInvincible <= 0 && !armorActive) {
                    crashed = true;
                    crashTimer = 45;
                    playerSpeed *= 0.4;
                    playSFX('crash');
                } else if (!crashed && armorActive) {
                    armorActive = false;
                    car.x += car.x < playerX ? -0.8 : 0.8;
                    playSFX('crash');
                }
            }
        }
    });

    // Update AI
    updateAI();

    // Calculate race position
    playerPosition = 1;
    cars.forEach(car => {
        const carProgress = car.lap * trackLength + car.z;
        const myProgress = currentLap * trackLength + position;
        if (carProgress > myProgress) playerPosition++;
    });

    // HUD
    const mph = Math.round((playerSpeed / MAX_SPEED) * 200);
    document.getElementById('ui-speed').textContent = mph + ' MPH';
    document.getElementById('ui-lap').textContent = 'LAP ' + Math.min(currentLap + 1, totalLaps) + '/' + totalLaps;
    const posNames = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
    document.getElementById('ui-position').textContent = 'POS ' + (posNames[playerPosition - 1] || playerPosition + 'th');
    const totalSecs = Math.floor(raceTime / 60);
    document.getElementById('ui-time').textContent = Math.floor(totalSecs / 60) + ':' + String(totalSecs % 60).padStart(2, '0');
}

function updateAI() {
    cars.forEach(car => {
        car.z += car.speed;
        // Follow curves slightly
        const carSeg = Math.floor(car.z / SEG_LEN) % segments.length;
        const seg = segments[carSeg];
        if (seg) car.x -= seg.curve * 0.008;
        car.x = Math.max(-0.9, Math.min(0.9, car.x));
        // Lap
        if (car.z >= trackLength) {
            car.z -= trackLength;
            car.lap++;
        }
        // Random speed wobble
        car.speed += (Math.random() - 0.5) * 0.3;
        car.speed = Math.max(MAX_SPEED * 0.45, Math.min(MAX_SPEED * 0.82, car.speed));
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
    crashInvincible = 0;
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

    countdownTimer = 210;
    countdownPhase = 0;

    document.getElementById('ui-lap').textContent = 'LAP 1/' + totalLaps;
    document.getElementById('ui-position').textContent = 'POS 1st';
    document.getElementById('ui-speed').textContent = '0 MPH';
    document.getElementById('ui-time').textContent = '0:00';
}

function raceComplete() {
    gameState = 'RACE_COMPLETE';
    stopMusic();
    playSFX('finish');

    const totalSecs = Math.floor(raceTime / 60);
    const timeStr = Math.floor(totalSecs / 60) + ':' + String(totalSecs % 60).padStart(2, '0');

    const rewards = [100, 60, 40, 25, 15, 5];
    const reward = rewards[playerPosition - 1] || 5;
    coins += reward + raceCoins;
    saveCoins();

    const posNames = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
    document.getElementById('rc-position').textContent = posNames[playerPosition - 1] || playerPosition + 'th';
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

function showVictory() {
    gameState = 'VICTORY';
    stopMusic();
    playSFX('finish');
    coins += 200;
    saveCoins();
    const totalSecs = Math.floor(raceTime / 60);
    document.getElementById('victory-time').textContent = 'Total Time: ' + Math.floor(totalSecs / 60) + ':' + String(totalSecs % 60).padStart(2, '0');
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
document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
    }
    if (e.code === 'Space' && gameState === 'PLAYING' && !nitroActive && nitroCount > 0 && countdownTimer <= 0) {
        nitroActive = true;
        nitroTimer = 120;
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
    if (gameState === 'PLAYING') {
        update();
        render();
    }
    requestAnimationFrame(gameLoop);
}

// ============================================================
// SECTION 12: INIT
// ============================================================
function init() {
    initShopListeners();
    updateCoinDisplay();
    showScreen('start-screen');
    gameLoop();
}

init();
