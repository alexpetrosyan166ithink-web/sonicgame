// ============================================================
// TURBO RACING - 2D Top-Down Arcade Racer (Nintendo Style)
// ============================================================

// ============================================================
// SECTION 1: CONSTANTS
// ============================================================
const CANVAS_W = 800;
const CANVAS_H = 400;

// 2D physics
const MAX_SPEED = 4;
const ACCEL = 0.08;
const DECEL = -0.02;
const BRAKE = -0.12;
const TURN_SPEED = 0.05;
const OFF_ROAD_FRICTION = 0.92;
const OFF_ROAD_MAX = 1.5;

// Track
const TRACK_HALF_WIDTH = 40;
const CAMERA_ZOOM = 3.0;
const WAYPOINT_ADVANCE_DIST = 30;
const COIN_COLLECT_DIST = 18;
const CAR_COLLISION_DIST = 16;

// ============================================================
// SECTION 2: AUDIO SYSTEM (KEEP AS-IS)
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

// Track data
let waypoints = [];         // [{x,y}, ...] centerline loop
let trackLeftEdge = [];     // [{x,y}, ...] left boundary
let trackRightEdge = [];    // [{x,y}, ...] right boundary
let trackCoins = [];
let cars = [];
let sceneryObjects = [];

// Player state - 2D world coords
let playerX = 0;
let playerY = 0;
let playerAngle = 0;        // radians, 0 = right, PI/2 = down
let playerSpeed = 0;
let playerWaypoint = 0;     // current target waypoint index

let currentTrack = 0;
let currentLap = 0;
let totalLaps = 3;
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
// SECTION 4: SHOP & PERSISTENCE (KEEP AS-IS)
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
    { name: 'Sunny Speedway',  scenery: 'grass',    laps: 3 },
    { name: 'Desert Dash',     scenery: 'desert',   laps: 3 },
    { name: 'Forest Run',      scenery: 'forest',   laps: 3 },
    { name: 'Mountain Pass',   scenery: 'mountain', laps: 3 },
    { name: 'Night Circuit',   scenery: 'night',    laps: 3 },
    { name: 'Coastal Drive',   scenery: 'coast',    laps: 3 },
    { name: 'Ice Track',       scenery: 'snow',     laps: 3 },
    { name: 'Inferno Circuit', scenery: 'lava',     laps: 3 }
];

// Control points for each track shape
function getTrackControlPoints(idx) {
    const S = 300; // scale factor
    switch (idx) {
        case 0: // Oval
            return [
                {x:0,y:-S}, {x:S*0.8,y:-S*0.6}, {x:S,y:0}, {x:S*0.8,y:S*0.6},
                {x:0,y:S}, {x:-S*0.8,y:S*0.6}, {x:-S,y:0}, {x:-S*0.8,y:-S*0.6}
            ];
        case 1: // Rounded rectangle
            return [
                {x:-S,y:-S*0.5}, {x:0,y:-S*0.5}, {x:S,y:-S*0.5}, {x:S*1.1,y:0},
                {x:S,y:S*0.5}, {x:0,y:S*0.5}, {x:-S,y:S*0.5}, {x:-S*1.1,y:0}
            ];
        case 2: // Figure-8
            return [
                {x:0,y:-S*0.1}, {x:S*0.7,y:-S*0.8}, {x:S*1.0,y:-S*0.3}, {x:S*0.3,y:S*0.1},
                {x:0,y:S*0.1}, {x:-S*0.7,y:S*0.8}, {x:-S*1.0,y:S*0.3}, {x:-S*0.3,y:-S*0.1}
            ];
        case 3: // L-shape
            return [
                {x:-S*0.8,y:-S}, {x:S*0.2,y:-S}, {x:S*0.3,y:-S*0.3},
                {x:S,y:-S*0.2}, {x:S,y:S*0.5}, {x:S*0.3,y:S*0.6},
                {x:-S*0.5,y:S*0.6}, {x:-S*0.8,y:0}
            ];
        case 4: // Triangle
            return [
                {x:0,y:-S*1.1}, {x:S*0.5,y:-S*0.4}, {x:S*0.9,y:S*0.5},
                {x:S*0.4,y:S*0.8}, {x:-S*0.4,y:S*0.8}, {x:-S*0.9,y:S*0.5},
                {x:-S*0.5,y:-S*0.4}
            ];
        case 5: // S-curve
            return [
                {x:-S,y:-S*0.8}, {x:-S*0.3,y:-S*1.0}, {x:S*0.4,y:-S*0.5},
                {x:S*0.9,y:-S*0.2}, {x:S*1.0,y:S*0.3}, {x:S*0.3,y:S*0.7},
                {x:-S*0.4,y:S*0.5}, {x:-S*0.9,y:S*0.2}, {x:-S*1.0,y:-S*0.3}
            ];
        case 6: // Diamond
            return [
                {x:0,y:-S*1.2}, {x:S*0.6,y:-S*0.5}, {x:S*1.0,y:0},
                {x:S*0.6,y:S*0.5}, {x:0,y:S*1.2}, {x:-S*0.6,y:S*0.5},
                {x:-S*1.0,y:0}, {x:-S*0.6,y:-S*0.5}
            ];
        case 7: // Complex circuit
            return [
                {x:-S*0.5,y:-S*1.0}, {x:S*0.5,y:-S*0.9}, {x:S*1.0,y:-S*0.3},
                {x:S*0.6,y:S*0.1}, {x:S*1.0,y:S*0.5}, {x:S*0.5,y:S*0.9},
                {x:-S*0.3,y:S*0.7}, {x:-S*0.8,y:S*0.3}, {x:-S*1.0,y:-S*0.2},
                {x:-S*0.7,y:-S*0.6}
            ];
        default:
            return [{x:0,y:-S},{x:S,y:0},{x:0,y:S},{x:-S,y:0}];
    }
}

// Catmull-Rom spline interpolation
function catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t;
    return {
        x: 0.5 * ((2*p1.x) + (-p0.x+p2.x)*t + (2*p0.x-5*p1.x+4*p2.x-p3.x)*t2 + (-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
        y: 0.5 * ((2*p1.y) + (-p0.y+p2.y)*t + (2*p0.y-5*p1.y+4*p2.y-p3.y)*t2 + (-p0.y+3*p1.y-3*p2.y+p3.y)*t3)
    };
}

function buildTrack(trackIdx) {
    const cp = getTrackControlPoints(trackIdx);
    const n = cp.length;
    const samplesPerSegment = 30;

    // Generate smooth waypoints via Catmull-Rom
    waypoints = [];
    for (let i = 0; i < n; i++) {
        const p0 = cp[(i - 1 + n) % n];
        const p1 = cp[i];
        const p2 = cp[(i + 1) % n];
        const p3 = cp[(i + 2) % n];
        for (let s = 0; s < samplesPerSegment; s++) {
            const t = s / samplesPerSegment;
            waypoints.push(catmullRom(p0, p1, p2, p3, t));
        }
    }

    // Pre-compute left and right edges
    trackLeftEdge = [];
    trackRightEdge = [];
    const wn = waypoints.length;
    for (let i = 0; i < wn; i++) {
        const curr = waypoints[i];
        const next = waypoints[(i + 1) % wn];
        const dx = next.x - curr.x;
        const dy = next.y - curr.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        // Normal (perpendicular left)
        const nx = -dy / len;
        const ny = dx / len;
        trackLeftEdge.push({ x: curr.x + nx * TRACK_HALF_WIDTH, y: curr.y + ny * TRACK_HALF_WIDTH });
        trackRightEdge.push({ x: curr.x - nx * TRACK_HALF_WIDTH, y: curr.y - ny * TRACK_HALF_WIDTH });
    }

    totalLaps = TRACK_DATA[trackIdx].laps;
}

function getTrackColors(scenery) {
    switch (scenery) {
        case 'grass':    return { road: '#686868', grass: '#10AA10', rumble: '#FF0000', curb: '#FFFFFF', center: '#FFFFFF', bg: '#009A00' };
        case 'desert':   return { road: '#808080', grass: '#C2A645', rumble: '#FF8800', curb: '#FFFFFF', center: '#FFFFFF', bg: '#B89830' };
        case 'forest':   return { road: '#606060', grass: '#0C7A0C', rumble: '#FF0000', curb: '#FFFFFF', center: '#FFFF00', bg: '#086A08' };
        case 'mountain': return { road: '#686868', grass: '#608060', rumble: '#FF0000', curb: '#FFFFFF', center: '#FFFFFF', bg: '#507050' };
        case 'night':    return { road: '#404040', grass: '#0A3A0A', rumble: '#FFFF00', curb: '#000000', center: '#FFFF00', bg: '#082A08' };
        case 'coast':    return { road: '#707070', grass: '#DDB040', rumble: '#0088FF', curb: '#FFFFFF', center: '#FFFFFF', bg: '#CCA030' };
        case 'snow':     return { road: '#808890', grass: '#DDDDEE', rumble: '#0044FF', curb: '#FFFFFF', center: '#FFFF00', bg: '#CCCCDD' };
        case 'lava':     return { road: '#505050', grass: '#441100', rumble: '#FF4400', curb: '#FF8800', center: '#FF0000', bg: '#331000' };
        default:         return { road: '#686868', grass: '#10AA10', rumble: '#FF0000', curb: '#FFFFFF', center: '#FFFFFF', bg: '#009A00' };
    }
}

function spawnTrackCoins(trackIdx) {
    trackCoins = [];
    const wn = waypoints.length;
    for (let i = 10; i < wn; i += 6 + Math.floor(Math.random() * 10)) {
        const wp = waypoints[i];
        const next = waypoints[(i + 1) % wn];
        const dx = next.x - wp.x;
        const dy = next.y - wp.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const offset = (Math.random() - 0.5) * TRACK_HALF_WIDTH * 1.2;
        trackCoins.push({
            x: wp.x + nx * offset,
            y: wp.y + ny * offset,
            collected: false
        });
    }
}

function spawnAICars() {
    cars = [];
    const aiColors = ['#0088FF', '#00CC00', '#FF8800', '#FF00FF', '#FFFFFF'];
    const wn = waypoints.length;
    for (let i = 0; i < 5; i++) {
        const wpIdx = Math.floor((i + 1) * wn / 7) % wn;
        const wp = waypoints[wpIdx];
        const nextWp = waypoints[(wpIdx + 1) % wn];
        const angle = Math.atan2(nextWp.y - wp.y, nextWp.x - wp.x);
        cars.push({
            x: wp.x,
            y: wp.y,
            angle: angle,
            speed: MAX_SPEED * (0.55 + Math.random() * 0.25),
            color: aiColors[i],
            waypoint: wpIdx,
            lap: 0,
            lapWaypointCrossed: false
        });
    }
}

function generateScenery(trackIdx) {
    sceneryObjects = [];
    const scenery = TRACK_DATA[trackIdx].scenery;
    const types = getSceneryTypes(scenery);

    // Place objects away from track
    for (let i = 0; i < 120; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 200 + Math.random() * 500;
        const cx = Math.cos(angle) * dist;
        const cy = Math.sin(angle) * dist;

        // Check if too close to any waypoint
        let tooClose = false;
        for (let w = 0; w < waypoints.length; w += 5) {
            const dx = waypoints[w].x - cx;
            const dy = waypoints[w].y - cy;
            if (dx * dx + dy * dy < (TRACK_HALF_WIDTH + 30) * (TRACK_HALF_WIDTH + 30)) {
                tooClose = true;
                break;
            }
        }
        if (tooClose) continue;

        const t = types[Math.floor(Math.random() * types.length)];
        sceneryObjects.push({ x: cx, y: cy, type: t, size: 6 + Math.random() * 10 });
    }
}

function getSceneryTypes(scenery) {
    switch (scenery) {
        case 'grass':    return ['tree', 'bush', 'flower'];
        case 'desert':   return ['cactus', 'rock', 'skull'];
        case 'forest':   return ['pine', 'tree', 'mushroom'];
        case 'mountain': return ['rock', 'pine', 'boulder'];
        case 'night':    return ['tree', 'lamp', 'bush'];
        case 'coast':    return ['palm', 'rock', 'umbrella'];
        case 'snow':     return ['pine_snow', 'snowman', 'rock'];
        case 'lava':     return ['rock_lava', 'flame', 'crystal'];
        default:         return ['tree', 'bush'];
    }
}

// ============================================================
// SECTION 6: RENDERING
// ============================================================
function render() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    if (waypoints.length === 0) return;

    const colors = getTrackColors(TRACK_DATA[currentTrack].scenery);

    // Fill background
    ctx.fillStyle = colors.grass;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Camera transform: player at center, facing UP
    ctx.save();
    ctx.translate(CANVAS_W / 2, CANVAS_H / 2);
    ctx.rotate(-playerAngle - Math.PI / 2);
    ctx.scale(CAMERA_ZOOM, CAMERA_ZOOM);
    ctx.translate(-playerX, -playerY);

    drawScenery(colors);
    drawTrack(colors);
    drawCoins();
    drawAICars();
    drawPlayerCar();

    ctx.restore();

    // Overlays (screen-space)
    drawMinimap(colors);

    if (countdownTimer > 0) drawCountdown();

    if (crashed) {
        ctx.fillStyle = 'rgba(255,0,0,' + (0.3 * crashTimer / 45).toFixed(2) + ')';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    if (nitroActive) drawNitroOverlay();
}

function drawTrack(colors) {
    const wn = waypoints.length;
    if (wn < 2) return;

    // Track surface
    ctx.fillStyle = colors.road;
    ctx.beginPath();
    ctx.moveTo(trackLeftEdge[0].x, trackLeftEdge[0].y);
    for (let i = 1; i < wn; i++) ctx.lineTo(trackLeftEdge[i].x, trackLeftEdge[i].y);
    ctx.closePath();
    for (let i = wn - 1; i >= 0; i--) ctx.lineTo(trackRightEdge[i].x, trackRightEdge[i].y);
    ctx.closePath();
    ctx.fill();

    // Better approach: draw as quad strips
    ctx.fillStyle = colors.road;
    for (let i = 0; i < wn; i++) {
        const j = (i + 1) % wn;
        ctx.beginPath();
        ctx.moveTo(trackLeftEdge[i].x, trackLeftEdge[i].y);
        ctx.lineTo(trackLeftEdge[j].x, trackLeftEdge[j].y);
        ctx.lineTo(trackRightEdge[j].x, trackRightEdge[j].y);
        ctx.lineTo(trackRightEdge[i].x, trackRightEdge[i].y);
        ctx.closePath();
        ctx.fill();
    }

    // Curb/rumble strips (alternating)
    for (let i = 0; i < wn; i += 2) {
        const j = (i + 1) % wn;
        const k = (i + 2) % wn;
        // Left curb
        ctx.fillStyle = colors.rumble;
        ctx.beginPath();
        ctx.moveTo(trackLeftEdge[i].x, trackLeftEdge[i].y);
        ctx.lineTo(trackLeftEdge[j].x, trackLeftEdge[j].y);
        const lnx1 = trackLeftEdge[j].x + (trackLeftEdge[j].x - trackRightEdge[j].x) * 0.08;
        const lny1 = trackLeftEdge[j].y + (trackLeftEdge[j].y - trackRightEdge[j].y) * 0.08;
        const lnx0 = trackLeftEdge[i].x + (trackLeftEdge[i].x - trackRightEdge[i].x) * 0.08;
        const lny0 = trackLeftEdge[i].y + (trackLeftEdge[i].y - trackRightEdge[i].y) * 0.08;
        ctx.lineTo(lnx1, lny1);
        ctx.lineTo(lnx0, lny0);
        ctx.closePath();
        ctx.fill();

        // Right curb
        ctx.beginPath();
        ctx.moveTo(trackRightEdge[i].x, trackRightEdge[i].y);
        ctx.lineTo(trackRightEdge[j].x, trackRightEdge[j].y);
        const rnx1 = trackRightEdge[j].x + (trackRightEdge[j].x - trackLeftEdge[j].x) * 0.08;
        const rny1 = trackRightEdge[j].y + (trackRightEdge[j].y - trackLeftEdge[j].y) * 0.08;
        const rnx0 = trackRightEdge[i].x + (trackRightEdge[i].x - trackLeftEdge[i].x) * 0.08;
        const rny0 = trackRightEdge[i].y + (trackRightEdge[i].y - trackLeftEdge[i].y) * 0.08;
        ctx.lineTo(rnx1, rny1);
        ctx.lineTo(rnx0, rny0);
        ctx.closePath();
        ctx.fill();
    }
    // White curb strips (alternating with rumble)
    for (let i = 1; i < wn; i += 2) {
        const j = (i + 1) % wn;
        ctx.fillStyle = colors.curb;
        // Left
        ctx.beginPath();
        ctx.moveTo(trackLeftEdge[i].x, trackLeftEdge[i].y);
        ctx.lineTo(trackLeftEdge[j].x, trackLeftEdge[j].y);
        const lnx1 = trackLeftEdge[j].x + (trackLeftEdge[j].x - trackRightEdge[j].x) * 0.08;
        const lny1 = trackLeftEdge[j].y + (trackLeftEdge[j].y - trackRightEdge[j].y) * 0.08;
        const lnx0 = trackLeftEdge[i].x + (trackLeftEdge[i].x - trackRightEdge[i].x) * 0.08;
        const lny0 = trackLeftEdge[i].y + (trackLeftEdge[i].y - trackRightEdge[i].y) * 0.08;
        ctx.lineTo(lnx1, lny1);
        ctx.lineTo(lnx0, lny0);
        ctx.closePath();
        ctx.fill();
        // Right
        ctx.beginPath();
        ctx.moveTo(trackRightEdge[i].x, trackRightEdge[i].y);
        ctx.lineTo(trackRightEdge[j].x, trackRightEdge[j].y);
        const rnx1 = trackRightEdge[j].x + (trackRightEdge[j].x - trackLeftEdge[j].x) * 0.08;
        const rny1 = trackRightEdge[j].y + (trackRightEdge[j].y - trackLeftEdge[j].y) * 0.08;
        const rnx0 = trackRightEdge[i].x + (trackRightEdge[i].x - trackLeftEdge[i].x) * 0.08;
        const rny0 = trackRightEdge[i].y + (trackRightEdge[i].y - trackLeftEdge[i].y) * 0.08;
        ctx.lineTo(rnx1, rny1);
        ctx.lineTo(rnx0, rny0);
        ctx.closePath();
        ctx.fill();
    }

    // Dashed center line
    ctx.strokeStyle = colors.center;
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    for (let i = 0; i < wn; i++) {
        const wp = waypoints[i];
        if (i === 0) ctx.moveTo(wp.x, wp.y);
        else ctx.lineTo(wp.x, wp.y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Start/finish line
    const s0 = waypoints[0];
    const s1 = waypoints[1];
    const sdx = s1.x - s0.x;
    const sdy = s1.y - s0.y;
    const slen = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
    const snx = -sdy / slen * TRACK_HALF_WIDTH;
    const sny = sdx / slen * TRACK_HALF_WIDTH;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(s0.x + snx, s0.y + sny);
    ctx.lineTo(s0.x - snx, s0.y - sny);
    ctx.stroke();

    // Checkered pattern on start line
    const steps = 8;
    for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const lx = s0.x + snx * (1 - 2 * t);
        const ly = s0.y + sny * (1 - 2 * t);
        ctx.fillStyle = s % 2 === 0 ? '#FFFFFF' : '#000000';
        ctx.fillRect(lx - 3, ly - 3, 6, 6);
    }
}

function drawScenery(colors) {
    sceneryObjects.forEach(obj => {
        const s = obj.size;
        switch (obj.type) {
            case 'tree':
                ctx.fillStyle = '#4B2F0A';
                ctx.fillRect(obj.x - 2, obj.y - 2, 4, 8);
                ctx.fillStyle = '#228B22';
                ctx.beginPath();
                ctx.arc(obj.x, obj.y - 4, s * 0.7, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'pine':
            case 'pine_snow':
                ctx.fillStyle = '#4B2F0A';
                ctx.fillRect(obj.x - 1.5, obj.y, 3, 7);
                ctx.fillStyle = obj.type === 'pine_snow' ? '#446644' : '#0B5B0B';
                ctx.beginPath();
                ctx.moveTo(obj.x, obj.y - s);
                ctx.lineTo(obj.x - s * 0.5, obj.y + 2);
                ctx.lineTo(obj.x + s * 0.5, obj.y + 2);
                ctx.closePath();
                ctx.fill();
                if (obj.type === 'pine_snow') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.beginPath();
                    ctx.moveTo(obj.x, obj.y - s);
                    ctx.lineTo(obj.x - s * 0.3, obj.y - s * 0.3);
                    ctx.lineTo(obj.x + s * 0.3, obj.y - s * 0.3);
                    ctx.closePath();
                    ctx.fill();
                }
                break;
            case 'bush':
                ctx.fillStyle = '#2D8B2D';
                ctx.beginPath();
                ctx.arc(obj.x, obj.y, s * 0.5, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'flower':
                ctx.fillStyle = '#2D8B2D';
                ctx.beginPath();
                ctx.arc(obj.x, obj.y, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = ['#FF4488', '#FFDD00', '#FF8844'][Math.floor(obj.size) % 3];
                ctx.beginPath();
                ctx.arc(obj.x, obj.y - 2, 2, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'cactus':
                ctx.fillStyle = '#2D6B2D';
                ctx.fillRect(obj.x - 2, obj.y - s, 4, s);
                ctx.fillRect(obj.x - 6, obj.y - s * 0.7, 4, s * 0.3);
                ctx.fillRect(obj.x + 2, obj.y - s * 0.5, 4, s * 0.3);
                break;
            case 'rock':
            case 'boulder':
            case 'rock_lava':
                ctx.fillStyle = obj.type === 'rock_lava' ? '#553322' : '#888888';
                ctx.beginPath();
                ctx.ellipse(obj.x, obj.y, s * 0.5, s * 0.35, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = obj.type === 'rock_lava' ? '#442211' : '#666666';
                ctx.beginPath();
                ctx.ellipse(obj.x - 1, obj.y - 1, s * 0.3, s * 0.2, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'skull':
                ctx.fillStyle = '#DDCCBB';
                ctx.beginPath();
                ctx.arc(obj.x, obj.y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.fillRect(obj.x - 2, obj.y - 1, 1.5, 1.5);
                ctx.fillRect(obj.x + 0.5, obj.y - 1, 1.5, 1.5);
                break;
            case 'mushroom':
                ctx.fillStyle = '#8B6B3D';
                ctx.fillRect(obj.x - 1, obj.y - 1, 2, 5);
                ctx.fillStyle = '#DD3333';
                ctx.beginPath();
                ctx.arc(obj.x, obj.y - 2, 4, Math.PI, 0);
                ctx.fill();
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(obj.x - 1, obj.y - 3, 1, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'palm':
                ctx.fillStyle = '#8B6B3D';
                ctx.fillRect(obj.x - 2, obj.y - 2, 4, 12);
                ctx.fillStyle = '#228B22';
                for (let a = 0; a < 5; a++) {
                    const pa = a * Math.PI * 2 / 5;
                    ctx.beginPath();
                    ctx.ellipse(obj.x + Math.cos(pa) * 5, obj.y - 5 + Math.sin(pa) * 3, 6, 2, pa, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            case 'umbrella':
                ctx.fillStyle = '#8B6B3D';
                ctx.fillRect(obj.x - 1, obj.y - 1, 2, 8);
                ctx.fillStyle = ['#FF4444', '#4444FF', '#FFFF00'][Math.floor(obj.size) % 3];
                ctx.beginPath();
                ctx.arc(obj.x, obj.y - 1, 6, Math.PI, 0);
                ctx.fill();
                break;
            case 'lamp':
                ctx.fillStyle = '#444444';
                ctx.fillRect(obj.x - 1, obj.y - 1, 2, 10);
                ctx.fillStyle = '#FFFF88';
                ctx.beginPath();
                ctx.arc(obj.x, obj.y - 2, 3, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'snowman':
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath(); ctx.arc(obj.x, obj.y + 2, 5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(obj.x, obj.y - 4, 3.5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(obj.x, obj.y - 9, 2.5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#FF6600';
                ctx.fillRect(obj.x, obj.y - 9.5, 3, 1);
                break;
            case 'flame':
                ctx.fillStyle = '#FF4400';
                ctx.beginPath();
                ctx.moveTo(obj.x, obj.y - s);
                ctx.lineTo(obj.x - 3, obj.y + 2);
                ctx.lineTo(obj.x + 3, obj.y + 2);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#FFAA00';
                ctx.beginPath();
                ctx.moveTo(obj.x, obj.y - s * 0.6);
                ctx.lineTo(obj.x - 2, obj.y + 2);
                ctx.lineTo(obj.x + 2, obj.y + 2);
                ctx.closePath();
                ctx.fill();
                break;
            case 'crystal':
                ctx.fillStyle = '#AA44FF';
                ctx.beginPath();
                ctx.moveTo(obj.x, obj.y - s);
                ctx.lineTo(obj.x - 3, obj.y);
                ctx.lineTo(obj.x, obj.y + 2);
                ctx.lineTo(obj.x + 3, obj.y);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#CC88FF';
                ctx.beginPath();
                ctx.moveTo(obj.x, obj.y - s);
                ctx.lineTo(obj.x + 3, obj.y);
                ctx.lineTo(obj.x, obj.y + 2);
                ctx.closePath();
                ctx.fill();
                break;
        }
    });
}

function drawCoins() {
    trackCoins.forEach(c => {
        if (c.collected) return;
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.arc(c.x - 1, c.y - 1, 2, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawAICars() {
    cars.forEach(car => {
        ctx.save();
        ctx.translate(car.x, car.y);
        ctx.rotate(car.angle);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(1, 1, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = car.color;
        ctx.fillRect(-7, -4, 14, 8);

        // Windshield
        ctx.fillStyle = '#88CCFF';
        ctx.fillRect(3, -2.5, 3, 5);

        // Wheels
        ctx.fillStyle = '#111';
        ctx.fillRect(-6, -5.5, 4, 2);
        ctx.fillRect(-6, 3.5, 4, 2);
        ctx.fillRect(2, -5.5, 4, 2);
        ctx.fillRect(2, 3.5, 4, 2);

        ctx.restore();
    });
}

function drawPlayerCar() {
    // Invincibility flicker
    if (crashInvincible > 0 && Math.floor(crashInvincible / 4) % 2 === 0) return;

    const carData = carStats[equippedCar] || carStats.racer;

    ctx.save();
    ctx.translate(playerX, playerY);
    ctx.rotate(playerAngle);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(1, 1, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = carData.color;
    ctx.fillRect(-8, -5, 16, 10);

    // Cabin
    ctx.fillStyle = '#88CCFF';
    ctx.fillRect(3, -3, 4, 6);

    // Wheels
    ctx.fillStyle = '#111';
    ctx.fillRect(-7, -6.5, 5, 2);
    ctx.fillRect(-7, 4.5, 5, 2);
    ctx.fillRect(3, -6.5, 5, 2);
    ctx.fillRect(3, 4.5, 5, 2);

    // Headlights
    ctx.fillStyle = '#FFFF88';
    ctx.fillRect(7, -3, 2, 2);
    ctx.fillRect(7, 1, 2, 2);

    // Nitro flames
    if (nitroActive) {
        for (let i = 0; i < 5; i++) {
            const fx = -10 - Math.random() * 8;
            const fy = -3 + Math.random() * 6;
            const fs = 2 + Math.random() * 3;
            ctx.fillStyle = ['#FF4400', '#FFAA00', '#FFFF00'][Math.floor(Math.random() * 3)];
            ctx.fillRect(fx, fy, fs, fs);
        }
    }

    ctx.restore();
}

function drawMinimap(colors) {
    const mmW = 120, mmH = 80;
    const mmX = CANVAS_W - mmW - 10, mmY = 10;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(mmX, mmY, mmW, mmH);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.strokeRect(mmX, mmY, mmW, mmH);

    if (waypoints.length === 0) return;

    // Find bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    waypoints.forEach(wp => {
        if (wp.x < minX) minX = wp.x;
        if (wp.x > maxX) maxX = wp.x;
        if (wp.y < minY) minY = wp.y;
        if (wp.y > maxY) maxY = wp.y;
    });
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scale = Math.min((mmW - 12) / rangeX, (mmH - 12) / rangeY);
    const cx = mmX + mmW / 2;
    const cy = mmY + mmH / 2;
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    // Draw track outline
    ctx.strokeStyle = colors.road;
    ctx.lineWidth = 2;
    ctx.beginPath();
    waypoints.forEach((wp, i) => {
        const sx = cx + (wp.x - midX) * scale;
        const sy = cy + (wp.y - midY) * scale;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
    });
    ctx.closePath();
    ctx.stroke();

    // AI car dots
    cars.forEach(car => {
        ctx.fillStyle = car.color;
        const sx = cx + (car.x - midX) * scale;
        const sy = cy + (car.y - midY) * scale;
        ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
    });

    // Player dot
    ctx.fillStyle = (carStats[equippedCar] || carStats.racer).color;
    const px = cx + (playerX - midX) * scale;
    const py = cy + (playerY - midY) * scale;
    ctx.fillRect(px - 2, py - 2, 4, 4);
    // Direction indicator
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(playerAngle) * 5, py + Math.sin(playerAngle) * 5);
    ctx.stroke();
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

function drawNitroOverlay() {
    // Screen-edge glow
    ctx.save();
    const grad = ctx.createRadialGradient(CANVAS_W/2, CANVAS_H/2, CANVAS_W*0.3, CANVAS_W/2, CANVAS_H/2, CANVAS_W*0.55);
    grad.addColorStop(0, 'rgba(255,100,0,0)');
    grad.addColorStop(1, 'rgba(255,100,0,0.15)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.restore();
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
        playerSpeed *= 0.94;
        if (crashTimer <= 0) {
            crashed = false;
            crashInvincible = 90;
            if (playerSpeed < 0.5) playerSpeed = 0.5;
        }
        // Still move during crash
        playerX += Math.cos(playerAngle) * playerSpeed;
        playerY += Math.sin(playerAngle) * playerSpeed;
        updateAI();
        return;
    }

    const carData = carStats[equippedCar] || carStats.racer;
    const topSpeed = MAX_SPEED * carData.topSpeed * (nitroActive ? 1.5 : 1);
    const accelRate = ACCEL * carData.accelMod;
    const handling = TURN_SPEED * carData.handling;

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
    if (playerSpeed < -1) playerSpeed = -1; // allow slight reverse

    // Steering — turn rate scales with speed
    const speedFactor = Math.min(1, Math.abs(playerSpeed) / (MAX_SPEED * 0.3));
    if (keys['ArrowLeft'] || keys['KeyA']) {
        playerAngle -= handling * speedFactor;
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
        playerAngle += handling * speedFactor;
    }

    // Move in facing direction
    playerX += Math.cos(playerAngle) * playerSpeed;
    playerY += Math.sin(playerAngle) * playerSpeed;

    // Off-road check
    if (!isOnTrack(playerX, playerY)) {
        playerSpeed *= OFF_ROAD_FRICTION;
        if (playerSpeed > OFF_ROAD_MAX) playerSpeed = OFF_ROAD_MAX;
    }

    // Nitro timer
    if (nitroActive) {
        nitroTimer--;
        if (nitroTimer <= 0) nitroActive = false;
    }

    // Update player waypoint progress & lap
    updatePlayerProgress();

    // Race timer
    raceTime++;

    // Coin collection
    collectCoins();

    // AI collision
    checkCarCollisions();

    // Update AI
    updateAI();

    // Calculate position
    calculatePosition();

    // HUD
    updateHUD();
}

function isOnTrack(x, y) {
    // Check distance to nearest track segments
    const wn = waypoints.length;
    // Only check waypoints near player's current waypoint for performance
    const searchRange = 40;
    for (let offset = -searchRange; offset <= searchRange; offset++) {
        const idx = ((playerWaypoint + offset) % wn + wn) % wn;
        const wp = waypoints[idx];
        const dx = x - wp.x;
        const dy = y - wp.y;
        if (dx * dx + dy * dy < TRACK_HALF_WIDTH * TRACK_HALF_WIDTH) {
            return true;
        }
    }
    return false;
}

function updatePlayerProgress() {
    const wn = waypoints.length;
    if (wn === 0) return;

    // Check if we've reached our target waypoint
    const target = waypoints[playerWaypoint];
    const dx = playerX - target.x;
    const dy = playerY - target.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < WAYPOINT_ADVANCE_DIST) {
        const prevWaypoint = playerWaypoint;
        playerWaypoint = (playerWaypoint + 1) % wn;

        // Lap detection: crossed from last segment back to first
        if (playerWaypoint < prevWaypoint && prevWaypoint > wn * 0.8) {
            currentLap++;
            if (currentLap >= totalLaps) {
                raceComplete();
                return;
            }
            playSFX('lap');
            trackCoins.forEach(c => c.collected = false);
        }
    }
}

function collectCoins() {
    const magnetW = COIN_COLLECT_DIST + magnetRange * 8;
    trackCoins.forEach(c => {
        if (c.collected) return;
        const dx = c.x - playerX;
        const dy = c.y - playerY;
        if (dx * dx + dy * dy < magnetW * magnetW) {
            c.collected = true;
            raceCoins++;
            coins++;
            saveCoins();
            playSFX('coin');
        }
    });
}

function checkCarCollisions() {
    cars.forEach(car => {
        const dx = car.x - playerX;
        const dy = car.y - playerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CAR_COLLISION_DIST) {
            if (!crashed && crashInvincible <= 0 && !armorActive) {
                crashed = true;
                crashTimer = 45;
                playerSpeed *= 0.3;
                playSFX('crash');
            } else if (!crashed && armorActive) {
                armorActive = false;
                // Push AI car away
                const pushAngle = Math.atan2(dy, dx);
                car.x += Math.cos(pushAngle) * 30;
                car.y += Math.sin(pushAngle) * 30;
                playSFX('crash');
            }
        }
    });
}

function updateAI() {
    const wn = waypoints.length;
    cars.forEach(car => {
        // Steer toward next waypoint
        const target = waypoints[car.waypoint];
        const dx = target.x - car.x;
        const dy = target.y - car.y;
        const targetAngle = Math.atan2(dy, dx);

        // Smooth angle toward target
        let angleDiff = targetAngle - car.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        car.angle += angleDiff * 0.1;

        // Move forward
        car.x += Math.cos(car.angle) * car.speed;
        car.y += Math.sin(car.angle) * car.speed;

        // Advance waypoint
        const wdist = Math.sqrt(dx * dx + dy * dy);
        if (wdist < WAYPOINT_ADVANCE_DIST) {
            const prevWp = car.waypoint;
            car.waypoint = (car.waypoint + 1) % wn;
            // Lap detection for AI
            if (car.waypoint < prevWp && prevWp > wn * 0.8) {
                car.lap++;
            }
        }

        // Random speed wobble
        car.speed += (Math.random() - 0.5) * 0.05;
        car.speed = Math.max(MAX_SPEED * 0.5, Math.min(MAX_SPEED * 0.85, car.speed));
    });
}

function calculatePosition() {
    const wn = waypoints.length;
    const myProgress = currentLap * wn + playerWaypoint;
    playerPosition = 1;
    cars.forEach(car => {
        const carProgress = car.lap * wn + car.waypoint;
        if (carProgress > myProgress) playerPosition++;
    });
}

function updateHUD() {
    const mph = Math.round((Math.abs(playerSpeed) / MAX_SPEED) * 200);
    document.getElementById('ui-speed').textContent = mph + ' MPH';
    document.getElementById('ui-lap').textContent = 'LAP ' + Math.min(currentLap + 1, totalLaps) + '/' + totalLaps;
    const posNames = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
    document.getElementById('ui-position').textContent = 'POS ' + (posNames[playerPosition - 1] || playerPosition + 'th');
    const totalSecs = Math.floor(raceTime / 60);
    document.getElementById('ui-time').textContent = Math.floor(totalSecs / 60) + ':' + String(totalSecs % 60).padStart(2, '0');
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
    generateScenery(idx);

    const carData = carStats[equippedCar] || carStats.racer;

    // Place player at first waypoint, facing toward second
    playerX = waypoints[0].x;
    playerY = waypoints[0].y;
    const next = waypoints[1];
    playerAngle = Math.atan2(next.y - waypoints[0].y, next.x - waypoints[0].x);
    playerWaypoint = 0;
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
// SECTION 9: INPUT HANDLING (KEEP AS-IS)
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
// SECTION 10: SCREEN MANAGEMENT & EVENTS (KEEP AS-IS)
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
// SECTION 11: GAME LOOP (KEEP AS-IS)
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
// SECTION 12: INIT (KEEP AS-IS)
// ============================================================
function init() {
    initShopListeners();
    updateCoinDisplay();
    showScreen('start-screen');
    gameLoop();
}

init();
