// ============================================================
// SECTION 1: CONSTANTS
// ============================================================
const CANVAS_W = 800;
const CANVAS_H = 400;
const TILE = 32;
const COLS_VISIBLE = Math.ceil(CANVAS_W / TILE) + 2;
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const JUMP_HOLD_FORCE = -0.4;
const JUMP_HOLD_FRAMES = 12;
const WALK_ACCEL = 0.4;
const RUN_ACCEL = 0.6;
const MAX_WALK = 3.5;
const MAX_RUN = 5.5;
const FRICTION = 0.85;
const MAX_FALL = 10;

// Tile codes
const T = {
    EMPTY: 0, GROUND: 1, BRICK: 2, QUESTION: 3, USED: 4,
    PIPE_TL: 5, PIPE_TR: 6, PIPE_BL: 7, PIPE_BR: 8,
    FLAG_POLE: 9, FLAG_TOP: 10, LAVA: 11, STONE: 12,
    BRIDGE: 13, CLOUD: 14, COIN_TILE: 15, INVIS_Q: 16
};

// Entity types
const ENT = {
    COIN: 0, MUSHROOM: 1, FIRE_FLOWER: 2, STAR: 3,
    GOOMBA: 10, KOOPA: 11, SHELL: 12, PIRANHA: 13, BOSS: 14,
    FIREBALL: 20
};

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
    musicGain.gain.value = 0.25;
    sfxGain = audioCtx.createGain();
    sfxGain.connect(audioCtx.destination);
    sfxGain.gain.value = 0.4;
}

function playNote(freq, start, dur, type, gainNode) {
    if (!audioCtx || musicMuted) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.3, start);
    g.gain.exponentialRampToValueAtTime(0.01, start + dur);
    osc.connect(g);
    g.connect(gainNode || musicGain);
    osc.start(start);
    osc.stop(start + dur);
}

function playSFX(type) {
    if (!audioCtx || musicMuted) return;
    const now = audioCtx.currentTime;
    switch (type) {
        case 'jump':
            playNote(400, now, 0.08, 'square', sfxGain);
            playNote(600, now + 0.05, 0.1, 'square', sfxGain);
            break;
        case 'coin':
            playNote(988, now, 0.05, 'square', sfxGain);
            playNote(1319, now + 0.05, 0.15, 'square', sfxGain);
            break;
        case 'powerup':
            for (let i = 0; i < 6; i++) playNote(400 + i * 100, now + i * 0.06, 0.1, 'square', sfxGain);
            break;
        case 'stomp':
            playNote(400, now, 0.05, 'square', sfxGain);
            playNote(600, now + 0.03, 0.08, 'square', sfxGain);
            break;
        case 'brick':
            playNote(200, now, 0.06, 'noise', sfxGain);
            playNote(150, now + 0.04, 0.08, 'sawtooth', sfxGain);
            break;
        case 'fireball':
            playNote(800, now, 0.04, 'sawtooth', sfxGain);
            playNote(400, now + 0.03, 0.06, 'sawtooth', sfxGain);
            break;
        case 'death':
            playNote(600, now, 0.15, 'square', sfxGain);
            playNote(500, now + 0.15, 0.15, 'square', sfxGain);
            playNote(400, now + 0.3, 0.15, 'square', sfxGain);
            playNote(300, now + 0.45, 0.3, 'square', sfxGain);
            break;
        case 'flag':
            for (let i = 0; i < 8; i++) playNote(523 + i * 50, now + i * 0.08, 0.12, 'square', sfxGain);
            break;
        case '1up':
            playNote(330, now, 0.08, 'square', sfxGain);
            playNote(523, now + 0.08, 0.08, 'square', sfxGain);
            playNote(659, now + 0.16, 0.08, 'square', sfxGain);
            playNote(784, now + 0.24, 0.15, 'square', sfxGain);
            break;
        case 'bump':
            playNote(200, now, 0.08, 'triangle', sfxGain);
            break;
    }
}

function stopMusic() {
    musicPlaying = false;
    if (currentMusicInterval) { clearInterval(currentMusicInterval); currentMusicInterval = null; }
}

function playOverworldMusic() {
    if (!audioCtx) return;
    stopMusic();
    musicPlaying = true;
    const melody = [
        659,659,0,659,0,523,659,0,784,0,0,0,392,0,0,0,
        523,0,0,392,0,0,330,0,0,440,0,494,0,466,440,0,
        392,659,784,880,0,698,784,0,659,0,523,587,494,0,0,0
    ];
    let i = 0;
    const tempo = 125;
    currentMusicInterval = setInterval(() => {
        if (!musicPlaying || musicMuted) return;
        if (melody[i] > 0) playNote(melody[i], audioCtx.currentTime, 0.1, 'square', musicGain);
        i = (i + 1) % melody.length;
    }, tempo);
}

function playUndergroundMusic() {
    if (!audioCtx) return;
    stopMusic();
    musicPlaying = true;
    const melody = [
        131,165,196,0,131,165,196,0,
        147,175,220,0,147,175,220,0,
        156,196,247,0,156,196,247,0,
        147,175,220,0,147,175,220,0
    ];
    let i = 0;
    currentMusicInterval = setInterval(() => {
        if (!musicPlaying || musicMuted) return;
        if (melody[i] > 0) playNote(melody[i], audioCtx.currentTime, 0.15, 'triangle', musicGain);
        i = (i + 1) % melody.length;
    }, 180);
}

function playCastleMusic() {
    if (!audioCtx) return;
    stopMusic();
    musicPlaying = true;
    const melody = [
        196,0,233,247,0,262,0,196,0,175,0,165,0,196,0,0,
        262,0,311,330,0,349,0,262,0,247,0,233,0,262,0,0
    ];
    let i = 0;
    currentMusicInterval = setInterval(() => {
        if (!musicPlaying || musicMuted) return;
        if (melody[i] > 0) playNote(melody[i], audioCtx.currentTime, 0.12, 'sawtooth', musicGain);
        i = (i + 1) % melody.length;
    }, 160);
}

// ============================================================
// SECTION 3: GAME STATE
// ============================================================
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let gameState = 'MENU'; // MENU, PLAYING, LEVEL_COMPLETE, GAME_OVER, VICTORY, SHOP
let mario = {};
let camera = { x: 0, y: 0 };
let entities = [];
let particles = [];
let floatingTexts = [];
let blockAnims = [];
let levelTiles = [];
let levelRows = 0;
let levelCols = 0;
let currentLevel = 0;
let score = 0;
let totalCoins = 0;
let levelCoins = 0;
let lives = 3;
let levelTime = 300;
let levelTimer = 0;
let flagSliding = false;
let flagSlideY = 0;
let deathTimer = 0;
let frameCount = 0;

// Input
let keys = {};
let justPressed = {};

// ============================================================
// SECTION 4: SHOP & PERSISTENCE
// ============================================================
let coins = parseInt(localStorage.getItem('marioCoins')) || 0;
let ownedChars = JSON.parse(localStorage.getItem('marioOwnedChars')) || ['mario'];
let equippedChar = localStorage.getItem('marioEquippedChar') || 'mario';
let ownedPowerups = JSON.parse(localStorage.getItem('marioOwnedPowerups')) || { mushroom: 0, fireflower: 0, star: 0 };

const characters = {
    mario: { price: 0, jumpMod: 1, speedMod: 1, floatMod: false },
    luigi: { price: 100, jumpMod: 1.2, speedMod: 1, floatMod: false },
    toad: { price: 150, jumpMod: 1, speedMod: 1.3, floatMod: false },
    peach: { price: 200, jumpMod: 1, speedMod: 1, floatMod: true },
    golden: { price: 500, jumpMod: 1.2, speedMod: 1.3, floatMod: true }
};

function saveCoins() {
    localStorage.setItem('marioCoins', coins);
}

function updateCoinDisplay() {
    const el1 = document.getElementById('coin-amount');
    const el2 = document.getElementById('coin-amount-shop');
    if (el1) el1.textContent = coins;
    if (el2) el2.textContent = coins;
}

function updateShopUI() {
    document.querySelectorAll('.char-card').forEach(card => {
        const id = card.getAttribute('data-char');
        const btn = card.querySelector('.char-btn');
        if (ownedChars.includes(id)) {
            if (equippedChar === id) {
                btn.textContent = 'EQUIPPED';
                btn.className = 'char-btn equipped';
                btn.disabled = true;
            } else {
                btn.textContent = 'EQUIP';
                btn.className = 'char-btn owned';
                btn.disabled = false;
            }
        } else {
            btn.textContent = 'BUY';
            btn.className = 'char-btn';
            btn.disabled = coins < characters[id].price;
        }
    });
    document.querySelectorAll('.powerup-card').forEach(card => {
        const id = card.getAttribute('data-powerup');
        card.querySelector('.powerup-owned').textContent = ownedPowerups[id] || 0;
        const btn = card.querySelector('.powerup-btn');
        const prices = { mushroom: 50, fireflower: 100, star: 75 };
        btn.disabled = coins < prices[id];
    });
}

function initShopListeners() {
    document.querySelectorAll('.char-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const card = e.target.closest('.char-card');
            const id = card.getAttribute('data-char');
            if (!ownedChars.includes(id)) {
                if (coins >= characters[id].price) {
                    coins -= characters[id].price;
                    ownedChars.push(id);
                    localStorage.setItem('marioOwnedChars', JSON.stringify(ownedChars));
                    saveCoins();
                    equippedChar = id;
                    localStorage.setItem('marioEquippedChar', id);
                    updateCoinDisplay();
                    updateShopUI();
                }
            } else if (equippedChar !== id) {
                equippedChar = id;
                localStorage.setItem('marioEquippedChar', id);
                updateShopUI();
            }
        });
    });
    document.querySelectorAll('.powerup-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const card = e.target.closest('.powerup-card');
            const id = card.getAttribute('data-powerup');
            const prices = { mushroom: 50, fireflower: 100, star: 75 };
            if (coins >= prices[id]) {
                coins -= prices[id];
                ownedPowerups[id] = (ownedPowerups[id] || 0) + 1;
                localStorage.setItem('marioOwnedPowerups', JSON.stringify(ownedPowerups));
                saveCoins();
                updateCoinDisplay();
                updateShopUI();
            }
        });
    });
}

// ============================================================
// SECTION 5: LEVEL DATA
// ============================================================
// Tile key: . = empty, # = ground, B = brick, ? = question, U = used,
// [ = pipe_tl, ] = pipe_tr, { = pipe_bl, } = pipe_br,
// | = flag_pole, ^ = flag_top, ~ = lava, S = stone,
// - = bridge, c = coin_tile, H = invis question

const LEVEL_DATA = [
    { // World 1-1 (Overworld - Intro)
        name: 'WORLD 1-1', type: 'overworld', spawnX: 2, spawnY: 9,
        rows: [
            '.....................................................................................................',
            '.....................................................................................................',
            '.....................................................................................................',
            '..............?..B?B?B...............................................?...............................',
            '.....................................................................................................',
            '.......?..............................................B?B..............?..........BBB.................',
            '.....................................................................................................',
            '...........................................................[]...........[]...........................',
            '...........................................................{}...........{}...........[].......^......',
            '...........................................................[}.........c.{}...........[}.......|......',
            '...cc.........cc.......cc.........cc.......cc.........cc..{}..cc....cc.{}...cc.....{}.......|......',
            '####..####..####..##..####..####..####..##..####..####..####..####..####..####..####..##..####..###',
            '#############################################################################..###################'
        ],
        enemies: [
            { type: ENT.GOOMBA, col: 8, row: 10 },
            { type: ENT.GOOMBA, col: 18, row: 10 },
            { type: ENT.GOOMBA, col: 26, row: 10 },
            { type: ENT.KOOPA, col: 35, row: 10 },
            { type: ENT.GOOMBA, col: 45, row: 10 },
            { type: ENT.GOOMBA, col: 50, row: 10 },
            { type: ENT.GOOMBA, col: 65, row: 10 },
            { type: ENT.GOOMBA, col: 72, row: 10 }
        ],
        questionContents: { '4_14': 'coin', '5_7': 'coin', '3_14': 'mushroom', '3_16': 'coin', '3_18': 'coin', '5_49': 'mushroom', '5_50': 'coin', '5_58': 'coin', '5_68': 'fireflower' }
    },
    { // World 1-2 (Underground)
        name: 'WORLD 1-2', type: 'underground', spawnX: 2, spawnY: 9,
        rows: [
            'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS',
            'S...................................................................................................S',
            'S...................................................................................................S',
            'S...............BBBBB........?...................................BBB................................S',
            'S.............................?........BBB.......................B?B..........BB.....................S',
            'S............?.........cc.....?...................................B.................................S',
            'S....................cc..cc.........................................BBB..............................S',
            'S.......[]......cc.cc....cc...[]..........[]................[]..........[]...............[]...^.....S',
            'S.......{}....cc..........cc..{}..........{}................{}..........{}...............[}...|.....S',
            'S.......[}..cc............cc..[}..........{}.......cc......{}..........{}.........cc...{}...|.....S',
            'S...cc..{}....................{}..........{}......cccc.....{}..........{}........cccc..{}...|.....S',
            'S####..####..##########..####..##..####..####..##########..####..####..####..####..####..##..####.S',
            'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS'
        ],
        enemies: [
            { type: ENT.GOOMBA, col: 10, row: 10 },
            { type: ENT.GOOMBA, col: 15, row: 10 },
            { type: ENT.KOOPA, col: 22, row: 10 },
            { type: ENT.GOOMBA, col: 30, row: 10 },
            { type: ENT.GOOMBA, col: 38, row: 10 },
            { type: ENT.PIRANHA, col: 7, row: 7 },
            { type: ENT.PIRANHA, col: 24, row: 7 },
            { type: ENT.GOOMBA, col: 50, row: 10 },
            { type: ENT.KOOPA, col: 60, row: 10 },
            { type: ENT.GOOMBA, col: 70, row: 10 }
        ],
        questionContents: { '3_25': 'coin', '4_25': 'mushroom', '5_25': 'coin', '5_12': 'coin', '4_53': 'fireflower' }
    },
    { // World 2-1 (Overworld - Harder platforms)
        name: 'WORLD 2-1', type: 'overworld', spawnX: 2, spawnY: 9,
        rows: [
            '.....................................................................................................',
            '.....................................................................................................',
            '...........................?.........................................................................',
            '.....................................................................................................',
            '...............BBB......BBB.....?..............BB?BB..........BBB.................BBB.................',
            '.....................................................................................................',
            '..........?......................................................?...................................',
            '...........................................................[]...........[]..........[].........^......',
            '...........................................................{}..........{}..........{}.........|......',
            '...........................................................[}..........{}..........{}..........|......',
            '...cc........cc.......cc..........cc........cc..........cc{}..cc......{}...cc....{}....cc....|......',
            '####..##..####..##..####..####..####..##..####..####..####..####..####..####..####..####..##..####..',
            '###############################################..##############..###################..#############'
        ],
        enemies: [
            { type: ENT.GOOMBA, col: 8, row: 10 },
            { type: ENT.KOOPA, col: 15, row: 10 },
            { type: ENT.GOOMBA, col: 22, row: 10 },
            { type: ENT.GOOMBA, col: 23, row: 10 },
            { type: ENT.KOOPA, col: 32, row: 10 },
            { type: ENT.GOOMBA, col: 40, row: 10 },
            { type: ENT.PIRANHA, col: 55, row: 7 },
            { type: ENT.GOOMBA, col: 60, row: 10 },
            { type: ENT.KOOPA, col: 68, row: 10 },
            { type: ENT.GOOMBA, col: 75, row: 10 },
            { type: ENT.GOOMBA, col: 76, row: 10 }
        ],
        questionContents: { '2_27': 'star', '4_24': 'mushroom', '4_30': 'coin', '4_51': 'fireflower', '6_10': 'coin', '6_56': 'coin' }
    },
    { // World 2-2 (Castle + Boss)
        name: 'WORLD 2-2', type: 'castle', spawnX: 2, spawnY: 9,
        rows: [
            'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS',
            'S...................................................................................................S',
            'S...........?...........?.......................................................................S',
            'S......BBB......BBB..........BBB...........BB..............BBB.............................SSSSS.S',
            'S..............................................?......................................SSSSS.S.....S',
            'S.....?.........................................................?.................SSSSS.S.........S',
            'S...........................................................................SSSSS.S.............S',
            'S.......................................................SSSS..............SSSS.S.................S',
            'S..........................SSSS..............SSSS..........SSSS.......SSSS...S.................S',
            'S.....................SSSS...............................SSSS.......S...S.................S',
            'S...cc..........cc..........cc..........cc..........cc...........cc.....S.....BOSS..........S',
            'S####..######..####..######..####..######..####..######..########..######..SSSSSSSSSSSSSSSSSSS',
            'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS'
        ],
        enemies: [
            { type: ENT.GOOMBA, col: 10, row: 10 },
            { type: ENT.GOOMBA, col: 18, row: 10 },
            { type: ENT.KOOPA, col: 25, row: 10 },
            { type: ENT.GOOMBA, col: 35, row: 10 },
            { type: ENT.GOOMBA, col: 42, row: 10 },
            { type: ENT.KOOPA, col: 50, row: 10 },
            { type: ENT.BOSS, col: 82, row: 9 }
        ],
        questionContents: { '2_11': 'mushroom', '2_23': 'fireflower', '4_42': 'coin', '5_5': 'coin', '5_57': 'mushroom' }
    },
    { // World 3-1 (Final Castle + Final Boss)
        name: 'WORLD 3-1', type: 'castle', spawnX: 2, spawnY: 9,
        rows: [
            'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS',
            'S...................................................................................................S',
            'S..............?.......?....?...................................................................S',
            'S.......BBB.......BBB....BBB......BBB........?B?........BBB.............................SSSSS.S',
            'S........................................................................?...............SSSSS.S.S',
            'S....?..............................................................?.............SSSSS.S.....S',
            'S...........................................................................SSSSS.S.............S',
            'S.......................................................SSSS..............SSSS.S.................S',
            'S..........................SSSS..............SSSS..........SSSS.......SSSS...S.................S',
            'S.....................SSSS...............................SSSS.......S...S.................S',
            'S...cc..........cc..........cc..........cc..........cc...........cc.....S.....BOSS..........S',
            'S##~~##..##~~##..##~~##..##~~##..##~~##..##~~##..##~~##..######..####..######..SSSSSSSSSSSSSSSSSSS',
            'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS'
        ],
        enemies: [
            { type: ENT.GOOMBA, col: 8, row: 10 },
            { type: ENT.KOOPA, col: 14, row: 10 },
            { type: ENT.GOOMBA, col: 20, row: 10 },
            { type: ENT.GOOMBA, col: 21, row: 10 },
            { type: ENT.KOOPA, col: 30, row: 10 },
            { type: ENT.PIRANHA, col: 38, row: 7 },
            { type: ENT.GOOMBA, col: 45, row: 10 },
            { type: ENT.KOOPA, col: 52, row: 10 },
            { type: ENT.GOOMBA, col: 58, row: 10 },
            { type: ENT.BOSS, col: 82, row: 9 }
        ],
        questionContents: { '2_14': 'mushroom', '2_22': 'coin', '2_26': 'fireflower', '3_44': 'star', '3_45': 'coin', '4_60': 'mushroom', '5_4': 'coin', '5_56': 'fireflower' }
    }
];

function parseLevelTiles(levelIdx) {
    const data = LEVEL_DATA[levelIdx];
    const rows = data.rows;
    levelRows = rows.length;
    levelCols = rows[0].length;
    levelTiles = [];
    for (let r = 0; r < levelRows; r++) {
        levelTiles[r] = [];
        for (let c = 0; c < levelCols; c++) {
            const ch = rows[r][c] || '.';
            switch (ch) {
                case '#': levelTiles[r][c] = T.GROUND; break;
                case 'B': levelTiles[r][c] = T.BRICK; break;
                case '?': levelTiles[r][c] = T.QUESTION; break;
                case 'U': levelTiles[r][c] = T.USED; break;
                case '[': levelTiles[r][c] = T.PIPE_TL; break;
                case ']': levelTiles[r][c] = T.PIPE_TR; break;
                case '{': levelTiles[r][c] = T.PIPE_BL; break;
                case '}': levelTiles[r][c] = T.PIPE_BR; break;
                case '|': levelTiles[r][c] = T.FLAG_POLE; break;
                case '^': levelTiles[r][c] = T.FLAG_TOP; break;
                case '~': levelTiles[r][c] = T.LAVA; break;
                case 'S': levelTiles[r][c] = T.STONE; break;
                case '-': levelTiles[r][c] = T.BRIDGE; break;
                case 'c': levelTiles[r][c] = T.COIN_TILE; break;
                case 'H': levelTiles[r][c] = T.INVIS_Q; break;
                default: levelTiles[r][c] = T.EMPTY; break;
            }
        }
    }
}

// ============================================================
// SECTION 6: SPRITE DRAWING
// ============================================================
const spriteCache = {};

function createPixelCanvas(pixelData, scale, palette) {
    scale = scale || 2;
    const rows = pixelData.length;
    const cols = pixelData[0].length;
    const c = document.createElement('canvas');
    c.width = cols * scale;
    c.height = rows * scale;
    const cx = c.getContext('2d');
    for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
            const ch = pixelData[r][col];
            if (ch === '.' || ch === ' ') continue;
            cx.fillStyle = palette[ch] || '#FF00FF';
            cx.fillRect(col * scale, r * scale, scale, scale);
        }
    }
    return c;
}

function initSprites() {
    // Mario Small Stand (16x16 pixel art)
    const marioSmallPal = { 'R': '#E44040', 'B': '#8B4513', 'S': '#FFB090', 'O': '#FF8800', 'b': '#000000', 'W': '#FFFFFF', 'Y': '#FFD700' };
    spriteCache['mario_small_r'] = createPixelCanvas([
        '....RRR.....',
        '...RRRRRR...',
        '...BSSBb....',
        '..SBSBSBS...',
        '..SBSSBBS...',
        '...SSSS.....',
        '..RRORR.....',
        '.RRRORRRR...',
        'SRROORRSRS..',
        'SSSOOOSSSS..',
        'SSSOOOOSS...',
        '..OO.OO.....',
        '..BBB.BBB...',
        '..BBBB.BBBB.',
    ], 2, marioSmallPal);

    spriteCache['mario_small_l'] = createPixelCanvas([
        '.....RRR....',
        '....RRRRRR..',
        '....bBSSB...',
        '...SBSBSBS..',
        '...SBBSSBS..',
        '.....SSSS...',
        '.....RRORR..',
        '...RRRRORR..',
        '..SRSSROORRS',
        '..SSSSOOSSS.',
        '...SSOOOOSS.',
        '.....OO.OO..',
        '.....BBB.BBB',
        '...BBBB.BBBB',
    ], 2, marioSmallPal);

    spriteCache['mario_small_jump_r'] = createPixelCanvas([
        '....RRR.....',
        '...RRRRRR...',
        '...BSSBb....',
        '..SBSBSBS...',
        '..SBSSBBS...',
        '...SSSS.....',
        '..RRORRS....',
        '.RRRORRSRR..',
        'SRROORRSSS..',
        'SSSOOORS....',
        '...OOOO.....',
        '..RROORR....',
        '..BBB.......',
        '.....BBBB...',
    ], 2, marioSmallPal);

    spriteCache['mario_small_jump_l'] = createPixelCanvas([
        '.....RRR....',
        '....RRRRRR..',
        '....bBSSB...',
        '...SBSBSBS..',
        '...SBBSSBS..',
        '.....SSSS...',
        '....SRRORR..',
        '..RRSSRORRR.',
        '..SSSRROORRR',
        '....SROOOS..',
        '.....OOOO...',
        '....RROORR..',
        '.......BBB..',
        '...BBBB.....',
    ], 2, marioSmallPal);

    // Mario Big Stand
    spriteCache['mario_big_r'] = createPixelCanvas([
        '.....RRR....',
        '....RRRRRR..',
        '....BSSBb...',
        '...SBSBSBS..',
        '...SBSSBBS..',
        '....SSSS....',
        '...RRORR....',
        '..RRRORRRR..',
        '.RRROORRRR..',
        '.SRROORRSRS.',
        '.SSSOOOSSSS.',
        '.SSSOOOOSS..',
        '..OO..OO....',
        '..RR..RR....',
        '..RRR.RRR...',
        '..BBB..BBB..',
    ], 2, marioSmallPal);

    spriteCache['mario_big_l'] = createPixelCanvas([
        '....RRR.....',
        '..RRRRRR....',
        '...bBSSB....',
        '..SBSBSBS...',
        '..SBBSSBS...',
        '....SSSS....',
        '....RRORR...',
        '..RRRRORRRR.',
        '..RRRROORRR.',
        '.SRSRROORRRS',
        '.SSSSOOOOSSS',
        '..SSOOOOSS..',
        '....OO..OO..',
        '....RR..RR..',
        '...RRR.RRR..',
        '..BBB..BBB..',
    ], 2, marioSmallPal);

    spriteCache['mario_big_jump_r'] = createPixelCanvas([
        '.....RRR....',
        '....RRRRRR..',
        '....BSSBb...',
        '...SBSBSBS..',
        '...SBSSBBS..',
        '....SSSS....',
        '...RRORRS...',
        '..RRRORRSR..',
        '.RRROORRSSS.',
        '.SRROORRS...',
        '..SSOOORS...',
        '...OOOO.....',
        '...RROOSS...',
        '..RR....RR..',
        '..BBB.......',
        '......BBBB..',
    ], 2, marioSmallPal);

    spriteCache['mario_big_jump_l'] = createPixelCanvas([
        '....RRR.....',
        '..RRRRRR....',
        '...bBSSB....',
        '..SBSBSBS...',
        '..SBBSSBS...',
        '....SSSS....',
        '...SRRORR...',
        '..RSRRORRRR.',
        '.SSSRROORRR.',
        '...SRROORRS.',
        '...SROOOSS..',
        '.....OOOO...',
        '...SSOORR...',
        '..RR....RR..',
        '.......BBB..',
        '..BBBB......',
    ], 2, marioSmallPal);

    // Fire Mario (same shapes, different palette)
    const firePal = { 'R': '#FFFFFF', 'B': '#8B4513', 'S': '#FFB090', 'O': '#FF4400', 'b': '#000000', 'W': '#FFFFFF', 'Y': '#FFD700' };
    spriteCache['mario_fire_r'] = createPixelCanvas([
        '.....RRR....',
        '....RRRRRR..',
        '....BSSBb...',
        '...SBSBSBS..',
        '...SBSSBBS..',
        '....SSSS....',
        '...OOORR....',
        '..OOOOORRRR.',
        '.OOOOORRRR..',
        '.SOOOORRSOS.',
        '.SSSOOOSSSS.',
        '.SSSOOOOSS..',
        '..OO..OO....',
        '..OO..OO....',
        '..OOR.OOR...',
        '..BBB..BBB..',
    ], 2, firePal);

    spriteCache['mario_fire_l'] = createPixelCanvas([
        '....RRR.....',
        '..RRRRRR....',
        '...bBSSB....',
        '..SBSBSBS...',
        '..SBBSSBS...',
        '....SSSS....',
        '....RROOO...',
        '.RRRROOOOOO.',
        '..RRRROOOOO.',
        '.SORSRROOOS.',
        '.SSSSOOOOSS.',
        '..SSOOOOSS..',
        '....OO..OO..',
        '....OO..OO..',
        '...ROO.ROO..',
        '..BBB..BBB..',
    ], 2, firePal);

    spriteCache['mario_fire_jump_r'] = spriteCache['mario_big_jump_r']; // reuse shape
    spriteCache['mario_fire_jump_l'] = spriteCache['mario_big_jump_l'];

    // Dead mario
    spriteCache['mario_dead'] = createPixelCanvas([
        '.....RRR....',
        '....RRRRRR..',
        '....BSSBb...',
        '...SBSBSBS..',
        '...SBSSBBS..',
        '....SSSS....',
        '..SRRORRRS..',
        '.SSRRORRRSS.',
        '.SSRROORRSS.',
        '..SSOOOSS...',
        '...SOOOS....',
        '...OOOO.....',
        '..SS..SS....',
        '..BB..BB....',
    ], 2, marioSmallPal);

    // Luigi variant (green)
    const luigiPal = { 'R': '#40A840', 'B': '#8B4513', 'S': '#FFB090', 'O': '#208020', 'b': '#000000', 'W': '#FFFFFF' };
    spriteCache['luigi_small_r'] = createPixelCanvas(spriteCache['mario_small_r']._pixelData || [
        '....RRR.....',
        '...RRRRRR...',
        '...BSSBb....',
        '..SBSBSBS...',
        '..SBSSBBS...',
        '...SSSS.....',
        '..RRORR.....',
        '.RRRORRRR...',
        'SRROORRSRS..',
        'SSSOOOSSSS..',
        'SSSOOOOSS...',
        '..OO.OO.....',
        '..BBB.BBB...',
        '..BBBB.BBBB.',
    ], 2, luigiPal);

    // Goomba
    const goombaPal = { 'B': '#8B4513', 'D': '#5C3010', 'W': '#FFFFFF', 'b': '#000000', 'T': '#FFB090' };
    spriteCache['goomba1'] = createPixelCanvas([
        '....BBBB....',
        '...BBBBBB...',
        '..BBBBBBBB..',
        '..BWBbbBWB..',
        '..BBBbbBBB..',
        '...BbBBbB...',
        '....TTTT....',
        '...TTTTTT...',
        '..DDbbbbDD..',
        '..DD....DD..',
        '.DDD....DDD.',
    ], 2, goombaPal);

    spriteCache['goomba2'] = createPixelCanvas([
        '....BBBB....',
        '...BBBBBB...',
        '..BBBBBBBB..',
        '..BWBbbBWB..',
        '..BBBbbBBB..',
        '...BbBBbB...',
        '....TTTT....',
        '...TTTTTT...',
        '..DDbbbbDD..',
        '...DD..DD...',
        '..DDD..DDD..',
    ], 2, goombaPal);

    spriteCache['goomba_flat'] = createPixelCanvas([
        '..BBBBBBBB..',
        '..BWBbbBWB..',
        '..BBBBBBBB..',
        '.DDDDDDDDDD.',
    ], 2, goombaPal);

    // Koopa
    const koopaPal = { 'G': '#40A840', 'D': '#208020', 'Y': '#FFDD00', 'W': '#FFFFFF', 'b': '#000000', 'S': '#FFB090' };
    spriteCache['koopa1'] = createPixelCanvas([
        '....GG......',
        '...GGGG.....',
        '...GbWG.....',
        '...GGGG.....',
        '..GGGGGG....',
        '.GDGDDGDG...',
        '.GGDDDDGG...',
        '..GGGGGG....',
        '...YYYY.....',
        '..YY..YY....',
        '..bb..bb....',
    ], 2, koopaPal);

    spriteCache['koopa2'] = createPixelCanvas([
        '....GG......',
        '...GGGG.....',
        '...GbWG.....',
        '...GGGG.....',
        '..GGGGGG....',
        '.GDGDDGDG...',
        '.GGDDDDGG...',
        '..GGGGGG....',
        '...YYYY.....',
        '...YY.YY....',
        '...bb.bb....',
    ], 2, koopaPal);

    spriteCache['shell'] = createPixelCanvas([
        '...GGGG.....',
        '..GGGGGG....',
        '.GDGDDGDG...',
        '.GGDDDDGG...',
        '.GGGGGGGG...',
        '..GGGGGG....',
        '...GGGG.....',
    ], 2, koopaPal);

    // Piranha Plant
    const pirPal = { 'G': '#40A840', 'D': '#208020', 'R': '#E44040', 'W': '#FFFFFF', 'b': '#000000' };
    spriteCache['piranha1'] = createPixelCanvas([
        '..RR..RR....',
        '.RRRRRRRR...',
        '.RWRRRRRW...',
        '.RRRRRRRR...',
        '..GGGGGG....',
        '...GGGG.....',
        '...GGGG.....',
        '...GGGG.....',
    ], 2, pirPal);

    spriteCache['piranha2'] = createPixelCanvas([
        '.RRRRRRRR...',
        '.RWRRRRRW...',
        '.RRRRRRRR...',
        '..RRRRRR....',
        '..GGGGGG....',
        '...GGGG.....',
        '...GGGG.....',
        '...GGGG.....',
    ], 2, pirPal);

    // Boss
    const bossPal = { 'G': '#40A840', 'D': '#208020', 'Y': '#FFDD00', 'R': '#E44040', 'b': '#000000', 'W': '#FFFFFF', 'S': '#FFB090', 'O': '#FF8800' };
    spriteCache['boss'] = createPixelCanvas([
        '..GGGGGGGG..',
        '.GGGGGGGGGG.',
        '.GGRbbRRGGG.',
        '.GGGbbGGGGG.',
        '.GGGGGGGGGG.',
        '.GGYYYYYGGG.',
        '.GGGYYYYGGG.',
        '..GGGGGGGG..',
        '.DDDDDDDDDD.',
        '.DD.DDDD.DD.',
        '.DD.DDDD.DD.',
        '..D......D..',
        '..bb....bb..',
    ], 3, bossPal);

    // Items
    const coinPal = { 'Y': '#FFD700', 'O': '#CC9900', 'b': '#000000' };
    spriteCache['coin1'] = createPixelCanvas([
        '..YY..',
        '.YYYY.',
        '.YOYY.',
        '.YYYY.',
        '.YYYY.',
        '..YY..',
    ], 3, coinPal);
    spriteCache['coin2'] = createPixelCanvas([
        '..YY..',
        '..YY..',
        '..OY..',
        '..YY..',
        '..YY..',
        '..YY..',
    ], 3, coinPal);

    const mushPal = { 'R': '#E44040', 'W': '#FFFFFF', 'b': '#000000', 'T': '#FFB090' };
    spriteCache['mushroom'] = createPixelCanvas([
        '...RRRR.....',
        '..RRRRRR....',
        '.RRWRRWRR...',
        '.RWWRWWWR...',
        '.RRRRRRRRR..',
        '..TTTTTT....',
        '..TWTTTT....',
        '...TTTT.....',
    ], 2, mushPal);

    const fireFPal = { 'R': '#FF4400', 'O': '#FF8800', 'Y': '#FFD700', 'G': '#40A840', 'W': '#FFFFFF' };
    spriteCache['fireflower'] = createPixelCanvas([
        '....OO......',
        '...OORO.....',
        '..ORRRO.....',
        '..OORRRO....',
        '...OOOO.....',
        '....GG......',
        '...GGGG.....',
        '....GG......',
    ], 2, fireFPal);

    const starPal = { 'Y': '#FFD700', 'O': '#CC9900', 'b': '#000000' };
    spriteCache['star'] = createPixelCanvas([
        '....YY......',
        '....YY......',
        '...YYYY.....',
        'YYYYYYYYYY..',
        '.YYYYYYYY...',
        '..YYYYYY....',
        '..YYO.YY....',
        '.YY....YY...',
    ], 2, starPal);

    // Fireball (player projectile)
    const fbPal = { 'O': '#FF8800', 'R': '#FF4400', 'Y': '#FFD700' };
    spriteCache['fireball'] = createPixelCanvas([
        '.OR.',
        'OYRR',
        'OYRR',
        '.OR.',
    ], 3, fbPal);

    // Tiles
    const groundPal = { 'B': '#C84C0C', 'D': '#A03808', 'b': '#000000' };
    spriteCache['tile_ground'] = createPixelCanvas([
        'BBBBBBBBBBBBBBBBB',
        'BDDDDDBBDDDDDBBB',
        'BDDDDDBBBDDDDBB',
        'BBBBBBBBBBBBBBBB',
        'BBBDDDDDDBBBBBB',
        'BBBDDDDDDDBBBBB',
        'BBBDDDDDDDBBBBB',
        'BBBBBBBBBBBBBBBB',
    ], 4, groundPal);

    const brickPal = { 'B': '#C84C0C', 'D': '#A03808', 'b': '#000000', 'L': '#E07020' };
    spriteCache['tile_brick'] = createPixelCanvas([
        'BBLBBBBLBBBBLBBB',
        'BBLBBBBLBBBBLBBB',
        'bbbbbbbbbbbbbbbb',
        'BBBLBBBBLBBBBLBB',
        'BBBLBBBBLBBBBLBB',
        'bbbbbbbbbbbbbbbb',
        'BBLBBBBLBBBBLBBB',
        'BBLBBBBLBBBBLBBB',
    ], 4, brickPal);

    spriteCache['tile_question'] = createPixelCanvas([
        'YYYYYYYYYYYYYYY',
        'YOOOOOOOOOOOOYY',
        'YOYYYYOOYYYYYOY',
        'YOYYYYYOYYYYYYOY',
        'YOOOOOOYYYYYOY',
        'YOYYYYOOYYYYYOY',
        'YOOOOOOOOOOOOYY',
        'YYYYYYYYYYYYYYY',
    ], 4, { 'Y': '#FFD700', 'O': '#CC9900' });

    spriteCache['tile_used'] = createPixelCanvas([
        'DDDDDDDDDDDDDDDD',
        'DDDDDDDDDDDDDDDD',
        'DDBBBBBBBBBBBDDD',
        'DDBBBBBBBBBBBDDD',
        'DDBBBBBBBBBBBDDD',
        'DDBBBBBBBBBBBDDD',
        'DDDDDDDDDDDDDDDD',
        'DDDDDDDDDDDDDDDD',
    ], 4, { 'B': '#8B6914', 'D': '#6B4C0C' });

    spriteCache['tile_stone'] = createPixelCanvas([
        'DDDDDDDDDDDDDDDD',
        'DLLLLLDLLLLLDLLL',
        'DLLLLLDLLLLLDLLL',
        'DDDDDDDDDDDDDDDD',
        'DLLLDDLLLLLDDLLL',
        'DLLLDDLLLLLDDLLL',
        'DDDDDDDDDDDDDDDD',
        'DDDDDDDDDDDDDDDD',
    ], 4, { 'D': '#606060', 'L': '#909090' });

    spriteCache['tile_pipe_tl'] = createPixelCanvas([
        'bGGGGGGGGGGGGGGG',
        'bGLLLLLLLLLLLGGG',
        'bGGGGGGGGGGGGGGG',
        'bbbGGGGGGGGGGbbb',
        'bbbGGGGGGGGGGbbb',
        'bbbGGGGGGGGGGbbb',
        'bbbGGGGGGGGGGbbb',
        'bbbGGGGGGGGGGbbb',
    ], 4, { 'G': '#40A840', 'L': '#80E080', 'b': '#000000' });

    spriteCache['tile_pipe_tr'] = createPixelCanvas([
        'GGGGGGGGGGGGGGGb',
        'GGGLLLLLLLLLLGGb',
        'GGGGGGGGGGGGGGGb',
        'bbbGGGGGGGGGGbbb',
        'bbbGGGGGGGGGGbbb',
        'bbbGGGGGGGGGGbbb',
        'bbbGGGGGGGGGGbbb',
        'bbbGGGGGGGGGGbbb',
    ], 4, { 'G': '#40A840', 'L': '#80E080', 'b': '#000000' });

    spriteCache['tile_pipe_bl'] = createPixelCanvas([
        'bbbGGGGGGGGGGbbb',
        'bbbGGGGGGGGGGbbb',
        'bbbGGGGGGGGGGbbb',
        'bbbGGGGGGGGGGbbb',
        'bbbGGGGGGGGGGbbb',
        'bbbGGGGGGGGGGbbb',
        'bbbGGGGGGGGGGbbb',
        'bbbGGGGGGGGGGbbb',
    ], 4, { 'G': '#40A840', 'b': '#000000' });

    spriteCache['tile_pipe_br'] = spriteCache['tile_pipe_bl'];

    spriteCache['tile_flag_pole'] = createPixelCanvas([
        '......bb........',
        '......bb........',
        '......bb........',
        '......bb........',
        '......bb........',
        '......bb........',
        '......bb........',
        '......bb........',
    ], 4, { 'b': '#808080' });

    spriteCache['tile_flag_top'] = createPixelCanvas([
        '......bGGGGGGGGG',
        '......bGGGGGGGGG',
        '......bGGGGGGGGG',
        '......bGGGGGGGGG',
        '......bb........',
        '......bb........',
        '......bb........',
        '......bb........',
    ], 4, { 'G': '#40A840', 'b': '#808080' });

    spriteCache['tile_lava'] = createPixelCanvas([
        'RROORROORROORROO',
        'ORROORROORROOROO',
        'OORROORROORROORR',
        'RROORROORROORROO',
        'RROORROORROORROO',
        'OORROORROORROORR',
        'ORROORROORROOROO',
        'RROORROORROORROO',
    ], 4, { 'R': '#FF4400', 'O': '#FF8800' });
}

function drawSprite(name, x, y, w, h) {
    const s = spriteCache[name];
    if (!s) return;
    ctx.drawImage(s, Math.round(x), Math.round(y), w || s.width, h || s.height);
}

function getMarioSprite() {
    const dir = mario.facingRight ? '_r' : '_l';
    const jumping = !mario.grounded;
    if (mario.dead) return 'mario_dead';

    let prefix = 'mario';
    if (equippedChar === 'luigi') prefix = 'luigi';

    if (mario.powerState === 0) {
        // Small
        if (jumping) return prefix + '_small_jump' + dir;
        return prefix + '_small' + dir;
    } else if (mario.powerState === 2) {
        // Fire
        if (jumping) return 'mario_fire_jump' + dir;
        return 'mario_fire' + dir;
    } else {
        // Big
        if (jumping) return prefix + '_big_jump' + dir;
        return prefix + '_big' + dir;
    }
}

// ============================================================
// SECTION 7: PHYSICS & COLLISION
// ============================================================
function getTile(px, py) {
    const c = Math.floor(px / TILE);
    const r = Math.floor(py / TILE);
    if (r < 0 || r >= levelRows || c < 0 || c >= levelCols) return T.EMPTY;
    return levelTiles[r][c];
}

function isSolid(tile) {
    return tile === T.GROUND || tile === T.BRICK || tile === T.QUESTION ||
           tile === T.USED || tile === T.PIPE_TL || tile === T.PIPE_TR ||
           tile === T.PIPE_BL || tile === T.PIPE_BR || tile === T.STONE ||
           tile === T.INVIS_Q;
}

function marioWidth() { return mario.powerState === 0 ? 20 : 24; }
function marioHeight() { return mario.powerState === 0 ? 26 : 32; }

function resolveCollisions() {
    const w = marioWidth();
    const h = marioHeight();

    // X axis
    mario.x += mario.vx;
    // Left
    if (mario.vx < 0) {
        const col = Math.floor(mario.x / TILE);
        const topRow = Math.floor(mario.y / TILE);
        const botRow = Math.floor((mario.y + h - 1) / TILE);
        for (let r = topRow; r <= botRow; r++) {
            if (r < 0 || r >= levelRows || col < 0) continue;
            if (isSolid(levelTiles[r][col])) {
                mario.x = (col + 1) * TILE;
                mario.vx = 0;
                break;
            }
        }
    }
    // Right
    if (mario.vx > 0) {
        const col = Math.floor((mario.x + w) / TILE);
        const topRow = Math.floor(mario.y / TILE);
        const botRow = Math.floor((mario.y + h - 1) / TILE);
        for (let r = topRow; r <= botRow; r++) {
            if (r < 0 || r >= levelRows || col >= levelCols) continue;
            if (isSolid(levelTiles[r][col])) {
                mario.x = col * TILE - w;
                mario.vx = 0;
                break;
            }
        }
    }

    // Y axis
    mario.y += mario.vy;
    mario.grounded = false;

    // Down (landing)
    if (mario.vy >= 0) {
        const leftCol = Math.floor(mario.x / TILE);
        const rightCol = Math.floor((mario.x + w - 1) / TILE);
        const row = Math.floor((mario.y + h) / TILE);
        for (let c = leftCol; c <= rightCol; c++) {
            if (row < 0 || row >= levelRows || c < 0 || c >= levelCols) continue;
            if (isSolid(levelTiles[row][c])) {
                mario.y = row * TILE - h;
                mario.vy = 0;
                mario.grounded = true;
                mario.jumpHoldFrames = 0;
                break;
            }
        }
    }

    // Up (hitting blocks)
    if (mario.vy < 0) {
        const leftCol = Math.floor((mario.x + 2) / TILE);
        const rightCol = Math.floor((mario.x + w - 3) / TILE);
        const row = Math.floor(mario.y / TILE);
        for (let c = leftCol; c <= rightCol; c++) {
            if (row < 0 || row >= levelRows || c < 0 || c >= levelCols) continue;
            if (isSolid(levelTiles[row][c])) {
                mario.y = (row + 1) * TILE;
                mario.vy = 0;
                onBlockHit(c, row);
                break;
            }
        }
    }

    // Lava check
    {
        const leftCol = Math.floor(mario.x / TILE);
        const rightCol = Math.floor((mario.x + w - 1) / TILE);
        const topRow = Math.floor(mario.y / TILE);
        const botRow = Math.floor((mario.y + h - 1) / TILE);
        for (let r = topRow; r <= botRow; r++) {
            for (let c = leftCol; c <= rightCol; c++) {
                if (r >= 0 && r < levelRows && c >= 0 && c < levelCols) {
                    if (levelTiles[r][c] === T.LAVA) {
                        marioDeath();
                        return;
                    }
                }
            }
        }
    }

    // Coin tile pickup
    {
        const leftCol = Math.floor(mario.x / TILE);
        const rightCol = Math.floor((mario.x + w - 1) / TILE);
        const topRow = Math.floor(mario.y / TILE);
        const botRow = Math.floor((mario.y + h - 1) / TILE);
        for (let r = topRow; r <= botRow; r++) {
            for (let c = leftCol; c <= rightCol; c++) {
                if (r >= 0 && r < levelRows && c >= 0 && c < levelCols) {
                    if (levelTiles[r][c] === T.COIN_TILE) {
                        levelTiles[r][c] = T.EMPTY;
                        collectCoin(c * TILE, r * TILE);
                    }
                }
            }
        }
    }

    // Clamp to level bounds
    if (mario.x < 0) { mario.x = 0; mario.vx = 0; }
    if (mario.x + w > levelCols * TILE) { mario.x = levelCols * TILE - w; mario.vx = 0; }

    // Fall death
    if (mario.y > levelRows * TILE + 50) {
        marioDeath();
    }
}

function onBlockHit(col, row) {
    const tile = levelTiles[row][col];
    if (tile === T.QUESTION || tile === T.INVIS_Q) {
        levelTiles[row][col] = T.USED;
        blockAnims.push({ col, row, t: 0 });
        playSFX('bump');
        // Spawn content
        const key = row + '_' + col;
        const content = LEVEL_DATA[currentLevel].questionContents[key] || 'coin';
        if (content === 'coin') {
            collectCoin(col * TILE, row * TILE - TILE);
        } else if (content === 'mushroom') {
            if (mario.powerState === 0) {
                spawnEntity(ENT.MUSHROOM, col * TILE, row * TILE - TILE);
            } else {
                spawnEntity(ENT.FIRE_FLOWER, col * TILE, row * TILE - TILE);
            }
        } else if (content === 'fireflower') {
            spawnEntity(ENT.FIRE_FLOWER, col * TILE, row * TILE - TILE);
        } else if (content === 'star') {
            spawnEntity(ENT.STAR, col * TILE, row * TILE - TILE);
        }
    } else if (tile === T.BRICK) {
        if (mario.powerState > 0) {
            // Break brick
            levelTiles[row][col] = T.EMPTY;
            playSFX('brick');
            spawnBrickDebris(col * TILE + TILE / 2, row * TILE + TILE / 2);
            score += 50;
        } else {
            // Just bump
            blockAnims.push({ col, row, t: 0 });
            playSFX('bump');
        }
        // Check if enemy is on top
        entities.forEach(e => {
            if (e.alive && e.type >= 10 && e.type <= 14) {
                const ec = Math.floor((e.x + 12) / TILE);
                const er = Math.floor((e.y + e.h) / TILE);
                if (ec === col && er === row) {
                    e.alive = false;
                    score += 100;
                    addFloatingText(e.x, e.y, '100');
                }
            }
        });
    }
}

function collectCoin(x, y) {
    levelCoins++;
    totalCoins++;
    coins++;
    score += 200;
    saveCoins();
    updateCoinDisplay();
    playSFX('coin');
    addFloatingText(x, y, '200');
    // Update HUD
    document.getElementById('ui-coins').textContent = 'COINS ' + totalCoins;
    document.getElementById('ui-score').textContent = 'SCORE ' + score;
    // 1-up every 100 coins
    if (totalCoins > 0 && totalCoins % 100 === 0) {
        lives++;
        playSFX('1up');
        addFloatingText(mario.x, mario.y - 20, '1UP');
        document.getElementById('ui-lives').textContent = 'LIVES ' + lives;
    }
}

function updateMarioPhysics() {
    if (mario.dead) return;
    if (flagSliding) return;

    const charData = characters[equippedChar] || characters.mario;
    const speedMod = charData.speedMod;
    const jumpMod = charData.jumpMod;
    const canFloat = charData.floatMod;

    // Horizontal
    const running = keys['ShiftLeft'] || keys['ShiftRight'] || keys['KeyS'];
    const maxSpeed = (running ? MAX_RUN : MAX_WALK) * speedMod;
    const accel = (running ? RUN_ACCEL : WALK_ACCEL) * speedMod;

    if (keys['ArrowLeft'] || keys['KeyA']) {
        mario.vx -= accel;
        if (mario.vx < -maxSpeed) mario.vx = -maxSpeed;
        mario.facingRight = false;
    } else if (keys['ArrowRight'] || keys['KeyD']) {
        mario.vx += accel;
        if (mario.vx > maxSpeed) mario.vx = maxSpeed;
        mario.facingRight = true;
    } else {
        mario.vx *= FRICTION;
        if (Math.abs(mario.vx) < 0.2) mario.vx = 0;
    }

    // Jump
    if (justPressed['Space'] || justPressed['ArrowUp'] || justPressed['KeyW']) {
        if (mario.grounded) {
            mario.vy = JUMP_FORCE * jumpMod;
            mario.grounded = false;
            mario.jumpHoldFrames = JUMP_HOLD_FRAMES;
            playSFX('jump');
        }
    }

    // Variable jump height (hold to go higher)
    if ((keys['Space'] || keys['ArrowUp'] || keys['KeyW']) && mario.jumpHoldFrames > 0 && mario.vy < 0) {
        mario.vy += JUMP_HOLD_FORCE * jumpMod;
        mario.jumpHoldFrames--;
    } else {
        mario.jumpHoldFrames = 0;
    }

    // Float (Peach / Golden)
    if (canFloat && !mario.grounded && mario.vy > 0) {
        if (keys['Space'] || keys['ArrowUp'] || keys['KeyW']) {
            mario.vy = Math.min(mario.vy, 1.5);
        }
    }

    // Gravity
    mario.vy += GRAVITY;
    if (mario.vy > MAX_FALL) mario.vy = MAX_FALL;

    // Fire
    if (justPressed['KeyF'] || justPressed['KeyX']) {
        if (mario.powerState === 2 && mario.fireTimer <= 0) {
            const fbx = mario.facingRight ? mario.x + marioWidth() : mario.x - 10;
            const fby = mario.y + 8;
            const fbvx = mario.facingRight ? 6 : -6;
            entities.push({
                type: ENT.FIREBALL, x: fbx, y: fby, vx: fbvx, vy: 0,
                w: 12, h: 12, alive: true, bounceCount: 0
            });
            mario.fireTimer = 15;
            playSFX('fireball');
        }
    }
    if (mario.fireTimer > 0) mario.fireTimer--;

    // Invincibility timer
    if (mario.invincible > 0) mario.invincible--;
    if (mario.hurtTimer > 0) mario.hurtTimer--;
}

// ============================================================
// SECTION 8: CAMERA
// ============================================================
function updateCamera() {
    const targetX = mario.x - CANVAS_W / 3;
    camera.x += (targetX - camera.x) * 0.1;
    if (camera.x < 0) camera.x = 0;
    const maxCamX = levelCols * TILE - CANVAS_W;
    if (camera.x > maxCamX) camera.x = maxCamX;
    camera.y = 0;
}

// ============================================================
// SECTION 9: ENTITY SYSTEM
// ============================================================
function spawnEntity(type, x, y) {
    const e = { type, x, y, vx: 0, vy: 0, alive: true, timer: 0, w: 24, h: 24, dir: 1 };
    if (type === ENT.MUSHROOM) { e.vx = 2; e.vy = -4; }
    if (type === ENT.FIRE_FLOWER) { e.vy = -2; }
    if (type === ENT.STAR) { e.vx = 2; e.vy = -6; }
    if (type === ENT.BOSS) { e.w = 36; e.h = 40; e.hp = 10; e.phase = 0; e.attackTimer = 60; }
    entities.push(e);
    playSFX('powerup');
}

function spawnLevelEntities() {
    const data = LEVEL_DATA[currentLevel];
    data.enemies.forEach(ed => {
        const e = {
            type: ed.type, x: ed.col * TILE, y: ed.row * TILE,
            vx: 0, vy: 0, alive: true, timer: 0, dir: -1, w: 24, h: 24
        };
        if (ed.type === ENT.GOOMBA) { e.vx = -1; e.h = 22; }
        if (ed.type === ENT.KOOPA) { e.vx = -1; e.h = 28; }
        if (ed.type === ENT.PIRANHA) { e.vx = 0; e.baseY = ed.row * TILE; e.h = 32; e.w = 24; e.timer = 0; }
        if (ed.type === ENT.BOSS) { e.w = 36; e.h = 40; e.hp = 10; e.phase = 0; e.attackTimer = 60; e.dir = -1; }
        entities.push(e);
    });
}

function updateEntities() {
    entities.forEach(e => {
        if (!e.alive) return;
        switch (e.type) {
            case ENT.GOOMBA: updateGoomba(e); break;
            case ENT.KOOPA: updateKoopa(e); break;
            case ENT.SHELL: updateShell(e); break;
            case ENT.PIRANHA: updatePiranha(e); break;
            case ENT.BOSS: updateBoss(e); break;
            case ENT.MUSHROOM: updateItem(e); break;
            case ENT.FIRE_FLOWER: updateFireFlower(e); break;
            case ENT.STAR: updateStarItem(e); break;
            case ENT.FIREBALL: updateFireball(e); break;
        }
    });
    // Remove dead
    entities = entities.filter(e => e.alive || e.deathTimer > 0);
}

function updateGoomba(e) {
    e.vy += GRAVITY;
    if (e.vy > MAX_FALL) e.vy = MAX_FALL;
    e.x += e.vx;
    e.y += e.vy;
    e.timer++;

    // Ground collision
    const botRow = Math.floor((e.y + e.h) / TILE);
    const leftCol = Math.floor(e.x / TILE);
    const rightCol = Math.floor((e.x + e.w - 1) / TILE);
    for (let c = leftCol; c <= rightCol; c++) {
        if (botRow >= 0 && botRow < levelRows && c >= 0 && c < levelCols) {
            if (isSolid(levelTiles[botRow][c])) {
                e.y = botRow * TILE - e.h;
                e.vy = 0;
            }
        }
    }

    // Wall collision
    if (e.vx < 0) {
        const col = Math.floor(e.x / TILE);
        const midRow = Math.floor((e.y + e.h / 2) / TILE);
        if (col >= 0 && col < levelCols && midRow >= 0 && midRow < levelRows && isSolid(levelTiles[midRow][col])) {
            e.vx = Math.abs(e.vx);
        }
    } else if (e.vx > 0) {
        const col = Math.floor((e.x + e.w) / TILE);
        const midRow = Math.floor((e.y + e.h / 2) / TILE);
        if (col >= 0 && col < levelCols && midRow >= 0 && midRow < levelRows && isSolid(levelTiles[midRow][col])) {
            e.vx = -Math.abs(e.vx);
        }
    }

    // Fall off screen
    if (e.y > levelRows * TILE + 100) e.alive = false;
}

function updateKoopa(e) {
    updateGoomba(e); // Same basic movement
}

function updateShell(e) {
    e.x += e.vx;
    e.vy += GRAVITY;
    e.y += e.vy;
    if (e.vy > MAX_FALL) e.vy = MAX_FALL;

    // Ground
    const botRow = Math.floor((e.y + e.h) / TILE);
    const midCol = Math.floor((e.x + e.w / 2) / TILE);
    if (botRow >= 0 && botRow < levelRows && midCol >= 0 && midCol < levelCols && isSolid(levelTiles[botRow][midCol])) {
        e.y = botRow * TILE - e.h;
        e.vy = 0;
    }

    // Walls
    if (e.vx !== 0) {
        const col = e.vx > 0 ? Math.floor((e.x + e.w) / TILE) : Math.floor(e.x / TILE);
        const midRow = Math.floor((e.y + e.h / 2) / TILE);
        if (col >= 0 && col < levelCols && midRow >= 0 && midRow < levelRows && isSolid(levelTiles[midRow][col])) {
            e.vx = -e.vx;
        }
    }

    // Shell kills enemies it touches
    if (Math.abs(e.vx) > 0) {
        entities.forEach(other => {
            if (other === e || !other.alive) return;
            if (other.type === ENT.GOOMBA || other.type === ENT.KOOPA) {
                if (Math.abs(e.x - other.x) < 20 && Math.abs(e.y - other.y) < 20) {
                    other.alive = false;
                    score += 100;
                    addFloatingText(other.x, other.y, '100');
                }
            }
        });
    }

    if (e.y > levelRows * TILE + 100) e.alive = false;
}

function updatePiranha(e) {
    e.timer++;
    const cycle = e.timer % 180;
    if (cycle < 60) {
        e.y = e.baseY - (cycle / 60) * TILE;
    } else if (cycle < 90) {
        // pause at top
    } else if (cycle < 150) {
        e.y = e.baseY - TILE + ((cycle - 90) / 60) * TILE;
    }
    // Else hidden below
}

function updateBoss(e) {
    e.timer++;
    e.vy += GRAVITY * 0.5;
    if (e.vy > MAX_FALL) e.vy = MAX_FALL;
    e.y += e.vy;

    // Ground collision
    const botRow = Math.floor((e.y + e.h) / TILE);
    const midCol = Math.floor((e.x + e.w / 2) / TILE);
    if (botRow >= 0 && botRow < levelRows && midCol >= 0 && midCol < levelCols && isSolid(levelTiles[botRow][midCol])) {
        e.y = botRow * TILE - e.h;
        e.vy = 0;
    }

    // Move toward Mario
    if (e.timer % 120 < 80) {
        e.x += mario.x < e.x ? -1 : 1;
    }

    // Jump periodically
    if (e.timer % 90 === 0 && e.vy === 0) {
        e.vy = -10;
    }

    // Enrage at half health
    if (e.hp <= 5 && e.timer % 60 === 0 && e.vy === 0) {
        e.vy = -12;
    }

    // Wall collisions
    if (e.x < 0) e.x = 0;
    if (e.x + e.w > levelCols * TILE) e.x = levelCols * TILE - e.w;
}

function updateItem(e) {
    e.vy += GRAVITY;
    if (e.vy > MAX_FALL) e.vy = MAX_FALL;
    e.x += e.vx;
    e.y += e.vy;

    // Ground
    const botRow = Math.floor((e.y + e.h) / TILE);
    const midCol = Math.floor((e.x + e.w / 2) / TILE);
    if (botRow >= 0 && botRow < levelRows && midCol >= 0 && midCol < levelCols && isSolid(levelTiles[botRow][midCol])) {
        e.y = botRow * TILE - e.h;
        e.vy = 0;
    }

    // Wall bounce
    const col = e.vx > 0 ? Math.floor((e.x + e.w) / TILE) : Math.floor(e.x / TILE);
    const midRow = Math.floor((e.y + e.h / 2) / TILE);
    if (col >= 0 && col < levelCols && midRow >= 0 && midRow < levelRows && isSolid(levelTiles[midRow][col])) {
        e.vx = -e.vx;
    }

    if (e.y > levelRows * TILE + 100) e.alive = false;
}

function updateFireFlower(e) {
    if (e.vy < 0) {
        e.vy += 0.1;
        e.y += e.vy;
        if (e.vy >= 0) e.vy = 0;
    }
}

function updateStarItem(e) {
    e.vy += GRAVITY;
    e.x += e.vx;
    e.y += e.vy;

    // Ground - bounce
    const botRow = Math.floor((e.y + e.h) / TILE);
    const midCol = Math.floor((e.x + e.w / 2) / TILE);
    if (botRow >= 0 && botRow < levelRows && midCol >= 0 && midCol < levelCols && isSolid(levelTiles[botRow][midCol])) {
        e.y = botRow * TILE - e.h;
        e.vy = -8;
    }

    // Wall bounce
    const col = e.vx > 0 ? Math.floor((e.x + e.w) / TILE) : Math.floor(e.x / TILE);
    const midRow = Math.floor((e.y + e.h / 2) / TILE);
    if (col >= 0 && col < levelCols && midRow >= 0 && midRow < levelRows && isSolid(levelTiles[midRow][col])) {
        e.vx = -e.vx;
    }

    if (e.y > levelRows * TILE + 100) e.alive = false;
}

function updateFireball(e) {
    e.x += e.vx;
    e.vy += GRAVITY;
    e.y += e.vy;

    // Ground bounce
    const botRow = Math.floor((e.y + e.h) / TILE);
    const midCol = Math.floor((e.x + e.w / 2) / TILE);
    if (botRow >= 0 && botRow < levelRows && midCol >= 0 && midCol < levelCols && isSolid(levelTiles[botRow][midCol])) {
        e.y = botRow * TILE - e.h;
        e.vy = -5;
        e.bounceCount++;
        if (e.bounceCount > 4) e.alive = false;
    }

    // Wall hit
    const col = e.vx > 0 ? Math.floor((e.x + e.w) / TILE) : Math.floor(e.x / TILE);
    const midRow = Math.floor((e.y + e.h / 2) / TILE);
    if (col >= 0 && col < levelCols && midRow >= 0 && midRow < levelRows && isSolid(levelTiles[midRow][col])) {
        e.alive = false;
    }

    if (e.y > levelRows * TILE + 100 || e.x < camera.x - 50 || e.x > camera.x + CANVAS_W + 50) {
        e.alive = false;
    }
}

function updateMarioEnemyCollisions() {
    if (mario.dead || mario.hurtTimer > 0) return;
    const mw = marioWidth();
    const mh = marioHeight();

    entities.forEach(e => {
        if (!e.alive) return;
        // AABB overlap
        if (mario.x + mw > e.x && mario.x < e.x + e.w &&
            mario.y + mh > e.y && mario.y < e.y + e.h) {

            // Item pickups
            if (e.type === ENT.MUSHROOM) {
                e.alive = false;
                if (mario.powerState === 0) {
                    mario.powerState = 1;
                    playSFX('powerup');
                }
                score += 1000;
                addFloatingText(e.x, e.y, '1000');
                return;
            }
            if (e.type === ENT.FIRE_FLOWER) {
                e.alive = false;
                mario.powerState = 2;
                playSFX('powerup');
                score += 1000;
                addFloatingText(e.x, e.y, '1000');
                return;
            }
            if (e.type === ENT.STAR) {
                e.alive = false;
                mario.invincible = 480; // 8 seconds
                playSFX('powerup');
                score += 1000;
                addFloatingText(e.x, e.y, '1000');
                return;
            }
            if (e.type === ENT.COIN) {
                e.alive = false;
                collectCoin(e.x, e.y);
                return;
            }

            // Star kill
            if (mario.invincible > 0 && (e.type === ENT.GOOMBA || e.type === ENT.KOOPA || e.type === ENT.SHELL || e.type === ENT.BOSS)) {
                if (e.type === ENT.BOSS) {
                    e.hp -= 3;
                    if (e.hp <= 0) {
                        e.alive = false;
                        score += 5000;
                        addFloatingText(e.x, e.y, '5000');
                    }
                } else {
                    e.alive = false;
                    score += 200;
                    addFloatingText(e.x, e.y, '200');
                }
                playSFX('stomp');
                return;
            }

            // Enemy collision
            if (e.type === ENT.GOOMBA) {
                if (mario.vy > 0 && mario.y + mh - e.y < 12) {
                    // Stomp
                    e.alive = false;
                    e.deathTimer = 20;
                    mario.vy = -7;
                    score += 100;
                    addFloatingText(e.x, e.y, '100');
                    playSFX('stomp');
                } else {
                    hurtMario();
                }
            } else if (e.type === ENT.KOOPA) {
                if (mario.vy > 0 && mario.y + mh - e.y < 12) {
                    // Turn into shell
                    e.type = ENT.SHELL;
                    e.h = 16;
                    e.vx = 0;
                    mario.vy = -7;
                    score += 100;
                    addFloatingText(e.x, e.y, '100');
                    playSFX('stomp');
                } else {
                    hurtMario();
                }
            } else if (e.type === ENT.SHELL) {
                if (e.vx === 0) {
                    // Kick shell
                    e.vx = mario.x < e.x ? 6 : -6;
                    playSFX('stomp');
                } else {
                    hurtMario();
                }
            } else if (e.type === ENT.PIRANHA) {
                hurtMario();
            } else if (e.type === ENT.BOSS) {
                if (mario.vy > 0 && mario.y + mh - e.y < 15) {
                    e.hp -= 2;
                    mario.vy = -10;
                    addFloatingText(e.x, e.y, 'HIT!');
                    playSFX('stomp');
                    if (e.hp <= 0) {
                        e.alive = false;
                        score += 5000;
                        addFloatingText(e.x, e.y, '5000');
                    }
                } else {
                    hurtMario();
                }
            }
        }
    });

    // Fireball vs enemies
    entities.forEach(fb => {
        if (!fb.alive || fb.type !== ENT.FIREBALL) return;
        entities.forEach(e => {
            if (!e.alive || e === fb) return;
            if (e.type < 10) return; // Skip items
            if (fb.x + fb.w > e.x && fb.x < e.x + e.w && fb.y + fb.h > e.y && fb.y < e.y + e.h) {
                fb.alive = false;
                if (e.type === ENT.BOSS) {
                    e.hp--;
                    addFloatingText(e.x, e.y, 'HIT!');
                    playSFX('stomp');
                    if (e.hp <= 0) {
                        e.alive = false;
                        score += 5000;
                        addFloatingText(e.x, e.y, '5000');
                    }
                } else if (e.type !== ENT.PIRANHA) {
                    e.alive = false;
                    score += 200;
                    addFloatingText(e.x, e.y, '200');
                    playSFX('stomp');
                }
            }
        });
    });
}

function hurtMario() {
    if (mario.hurtTimer > 0 || mario.invincible > 0) return;
    if (mario.powerState === 2) {
        mario.powerState = 1;
        mario.hurtTimer = 90;
        playSFX('bump');
    } else if (mario.powerState === 1) {
        mario.powerState = 0;
        mario.hurtTimer = 90;
        playSFX('bump');
    } else {
        marioDeath();
    }
}

function marioDeath() {
    if (mario.dead) return;
    mario.dead = true;
    mario.vy = -10;
    mario.vx = 0;
    deathTimer = 90;
    stopMusic();
    playSFX('death');
}

// ============================================================
// SECTION 10: RENDERING
// ============================================================
function render() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawBackground();
    drawTiles();
    drawEntities();
    drawMario();
    drawParticles();
    drawBlockAnims();
    drawFloatingTexts();
}

function drawBackground() {
    const levelType = LEVEL_DATA[currentLevel].type;
    if (levelType === 'overworld') {
        // Sky gradient
        const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
        grad.addColorStop(0, '#6185F8');
        grad.addColorStop(1, '#87CEEB');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Parallax clouds
        const cloudX = -(camera.x * 0.2) % 400;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        for (let i = 0; i < 5; i++) {
            const cx = cloudX + i * 200;
            const cy = 30 + (i % 3) * 25;
            ctx.beginPath();
            ctx.arc(cx, cy, 20, 0, Math.PI * 2);
            ctx.arc(cx + 20, cy - 8, 18, 0, Math.PI * 2);
            ctx.arc(cx + 40, cy, 20, 0, Math.PI * 2);
            ctx.fill();
        }

        // Parallax hills
        ctx.fillStyle = '#4CAF50';
        const hillX = -(camera.x * 0.3) % 500;
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.arc(hillX + i * 250, CANVAS_H - 40, 120, Math.PI, 0);
            ctx.fill();
        }
        ctx.fillStyle = '#66BB6A';
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.arc(hillX + i * 250 + 125, CANVAS_H - 40, 80, Math.PI, 0);
            ctx.fill();
        }
    } else if (levelType === 'underground') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    } else {
        // Castle
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        // Subtle lava glow at bottom
        const glowGrad = ctx.createLinearGradient(0, CANVAS_H - 50, 0, CANVAS_H);
        glowGrad.addColorStop(0, 'rgba(255, 68, 0, 0)');
        glowGrad.addColorStop(1, 'rgba(255, 68, 0, 0.2)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, CANVAS_H - 50, CANVAS_W, 50);
    }
}

function drawTiles() {
    const startCol = Math.max(0, Math.floor(camera.x / TILE) - 1);
    const endCol = Math.min(levelCols, startCol + COLS_VISIBLE + 2);

    for (let r = 0; r < levelRows; r++) {
        for (let c = startCol; c < endCol; c++) {
            const tile = levelTiles[r][c];
            if (tile === T.EMPTY) continue;
            const sx = c * TILE - camera.x;
            const sy = r * TILE - camera.y;

            let spriteName = null;
            switch (tile) {
                case T.GROUND: spriteName = 'tile_ground'; break;
                case T.BRICK: spriteName = 'tile_brick'; break;
                case T.QUESTION:
                    spriteName = 'tile_question';
                    break;
                case T.USED: spriteName = 'tile_used'; break;
                case T.PIPE_TL: spriteName = 'tile_pipe_tl'; break;
                case T.PIPE_TR: spriteName = 'tile_pipe_tr'; break;
                case T.PIPE_BL: spriteName = 'tile_pipe_bl'; break;
                case T.PIPE_BR: spriteName = 'tile_pipe_br'; break;
                case T.FLAG_POLE: spriteName = 'tile_flag_pole'; break;
                case T.FLAG_TOP: spriteName = 'tile_flag_top'; break;
                case T.LAVA: spriteName = 'tile_lava'; break;
                case T.STONE: spriteName = 'tile_stone'; break;
                case T.BRIDGE:
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(sx, sy, TILE, TILE / 2);
                    ctx.fillStyle = '#6B3410';
                    ctx.fillRect(sx, sy + TILE / 2, TILE, TILE / 2);
                    continue;
                case T.COIN_TILE:
                    // Animated coin
                    const coinFrame = Math.floor(frameCount / 10) % 2;
                    drawSprite(coinFrame === 0 ? 'coin1' : 'coin2', sx + 4, sy + 2, 24, 28);
                    continue;
            }
            if (spriteName) {
                drawSprite(spriteName, sx, sy, TILE, TILE);
            }
        }
    }
}

function drawMario() {
    if (mario.dead && deathTimer <= 0) return;

    // Invincibility flicker
    if (mario.hurtTimer > 0 && Math.floor(frameCount / 3) % 2 === 0) return;

    const sx = mario.x - camera.x;
    const sy = mario.y - camera.y;
    const w = marioWidth() + 8;
    const h = marioHeight() + 4;

    // Star rainbow effect
    if (mario.invincible > 0) {
        const hue = (frameCount * 20) % 360;
        ctx.fillStyle = `hsla(${hue}, 100%, 60%, 0.4)`;
        ctx.fillRect(sx - 4, sy - 4, w + 8, h + 8);
    }

    const spriteName = getMarioSprite();
    if (spriteCache[spriteName]) {
        drawSprite(spriteName, sx - 2, sy - 2, w, h);
    } else {
        // Fallback rectangle
        ctx.fillStyle = mario.powerState === 2 ? '#FFFFFF' : '#E44040';
        ctx.fillRect(sx, sy, marioWidth(), marioHeight());
    }
}

function drawEntities() {
    entities.forEach(e => {
        if (!e.alive && !e.deathTimer) return;
        const sx = e.x - camera.x;
        const sy = e.y - camera.y;
        if (sx < -50 || sx > CANVAS_W + 50) return;

        switch (e.type) {
            case ENT.GOOMBA:
                if (!e.alive && e.deathTimer > 0) {
                    drawSprite('goomba_flat', sx, sy + e.h - 8, e.w, 8);
                    e.deathTimer--;
                } else {
                    const gf = Math.floor(frameCount / 12) % 2;
                    drawSprite(gf === 0 ? 'goomba1' : 'goomba2', sx, sy, e.w, e.h);
                }
                break;
            case ENT.KOOPA:
                const kf = Math.floor(frameCount / 12) % 2;
                drawSprite(kf === 0 ? 'koopa1' : 'koopa2', sx, sy, e.w, e.h);
                break;
            case ENT.SHELL:
                drawSprite('shell', sx, sy, e.w, e.h);
                break;
            case ENT.PIRANHA:
                const pf = Math.floor(frameCount / 15) % 2;
                drawSprite(pf === 0 ? 'piranha1' : 'piranha2', sx, sy, e.w, e.h);
                break;
            case ENT.BOSS:
                drawSprite('boss', sx, sy, e.w, e.h);
                // HP bar
                if (e.hp !== undefined) {
                    ctx.fillStyle = '#333';
                    ctx.fillRect(sx - 5, sy - 10, e.w + 10, 6);
                    ctx.fillStyle = e.hp > 5 ? '#40A840' : '#E44040';
                    ctx.fillRect(sx - 5, sy - 10, (e.w + 10) * (e.hp / 10), 6);
                }
                break;
            case ENT.MUSHROOM:
                drawSprite('mushroom', sx, sy, e.w, e.h);
                break;
            case ENT.FIRE_FLOWER:
                drawSprite('fireflower', sx, sy, e.w, e.h);
                break;
            case ENT.STAR:
                drawSprite('star', sx, sy, e.w, e.h);
                break;
            case ENT.FIREBALL:
                drawSprite('fireball', sx, sy, e.w, e.h);
                break;
        }
    });
}

// ============================================================
// SECTION 11: VISUAL EFFECTS
// ============================================================
function spawnBrickDebris(x, y) {
    for (let i = 0; i < 4; i++) {
        particles.push({
            x, y,
            vx: (i < 2 ? -2 : 2) + Math.random() * 2 - 1,
            vy: -6 - Math.random() * 3,
            life: 40,
            color: i % 2 === 0 ? '#C84C0C' : '#A03808',
            size: 6
        });
    }
}

function addFloatingText(x, y, text) {
    floatingTexts.push({ x, y, text, life: 45, vy: -1.5 });
}

function drawParticles() {
    particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;
        p.life--;
        if (p.life <= 0) { particles.splice(i, 1); return; }
        const sx = p.x - camera.x;
        const sy = p.y - camera.y;
        ctx.fillStyle = p.color;
        ctx.fillRect(sx, sy, p.size, p.size);
    });
}

function drawBlockAnims() {
    blockAnims.forEach((b, i) => {
        b.t++;
        if (b.t > 8) { blockAnims.splice(i, 1); return; }
    });
}

function drawFloatingTexts() {
    floatingTexts.forEach((ft, i) => {
        ft.y += ft.vy;
        ft.life--;
        if (ft.life <= 0) { floatingTexts.splice(i, 1); return; }
        const sx = ft.x - camera.x;
        const sy = ft.y - camera.y;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, sx, sy);
    });
}

// ============================================================
// SECTION 12: GAME LOOP & STATE MACHINE
// ============================================================
function gameLoop() {
    frameCount++;
    if (gameState === 'PLAYING') {
        if (mario.dead) {
            // Death animation
            mario.vy += GRAVITY;
            mario.y += mario.vy;
            deathTimer--;
            if (deathTimer <= 0) {
                lives--;
                if (lives <= 0) {
                    showGameOver();
                } else {
                    loadLevel(currentLevel);
                }
            }
            render();
        } else if (flagSliding) {
            // Flag slide animation
            mario.y += 2;
            flagSlideY += 2;
            if (flagSlideY > 96) {
                flagSliding = false;
                levelComplete();
            }
            render();
        } else {
            update();
            render();
        }
    }
    requestAnimationFrame(gameLoop);
}

function update() {
    updateMarioPhysics();
    resolveCollisions();
    updateCamera();
    updateEntities();
    updateMarioEnemyCollisions();
    checkFlagPole();
    checkBossDefeated();

    // Level timer
    levelTimer++;
    if (levelTimer % 60 === 0 && levelTime > 0) {
        levelTime--;
        document.getElementById('ui-time').textContent = 'TIME ' + levelTime;
        if (levelTime <= 0) marioDeath();
    }

    // Update HUD
    document.getElementById('ui-score').textContent = 'SCORE ' + score;

    // Clear justPressed
    justPressed = {};
}

function startGame() {
    initAudio();
    gameState = 'PLAYING';
    score = 0;
    totalCoins = 0;
    levelCoins = 0;
    lives = 3;
    currentLevel = 0;
    loadLevel(currentLevel);
    showScreen(null);
}

function loadLevel(idx) {
    parseLevelTiles(idx);
    entities = [];
    particles = [];
    floatingTexts = [];
    blockAnims = [];
    spawnLevelEntities();

    const data = LEVEL_DATA[idx];
    mario = {
        x: data.spawnX * TILE,
        y: data.spawnY * TILE,
        vx: 0, vy: 0,
        powerState: 0,
        facingRight: true,
        grounded: false,
        jumpHoldFrames: 0,
        dead: false,
        invincible: 0,
        hurtTimer: 0,
        fireTimer: 0
    };

    // Apply power-up packs
    if (ownedPowerups.star > 0) {
        ownedPowerups.star--;
        localStorage.setItem('marioOwnedPowerups', JSON.stringify(ownedPowerups));
        mario.invincible = 480;
        mario.powerState = 1;
    } else if (ownedPowerups.fireflower > 0) {
        ownedPowerups.fireflower--;
        localStorage.setItem('marioOwnedPowerups', JSON.stringify(ownedPowerups));
        mario.powerState = 2;
    } else if (ownedPowerups.mushroom > 0) {
        ownedPowerups.mushroom--;
        localStorage.setItem('marioOwnedPowerups', JSON.stringify(ownedPowerups));
        mario.powerState = 1;
    }

    camera = { x: 0, y: 0 };
    levelTime = 300;
    levelTimer = 0;
    levelCoins = 0;
    flagSliding = false;
    flagSlideY = 0;
    deathTimer = 0;

    // Update HUD
    document.getElementById('ui-level').textContent = data.name;
    document.getElementById('ui-coins').textContent = 'COINS ' + totalCoins;
    document.getElementById('ui-lives').textContent = 'LIVES ' + lives;
    document.getElementById('ui-time').textContent = 'TIME ' + levelTime;
    document.getElementById('ui-score').textContent = 'SCORE ' + score;

    // Music
    if (data.type === 'overworld') playOverworldMusic();
    else if (data.type === 'underground') playUndergroundMusic();
    else playCastleMusic();
}

function checkFlagPole() {
    if (flagSliding || mario.dead) return;
    const mw = marioWidth();
    const mh = marioHeight();
    // Check flag pole and flag top tiles
    const leftCol = Math.floor(mario.x / TILE);
    const rightCol = Math.floor((mario.x + mw - 1) / TILE);
    const topRow = Math.floor(mario.y / TILE);
    const botRow = Math.floor((mario.y + mh - 1) / TILE);
    for (let r = topRow; r <= botRow; r++) {
        for (let c = leftCol; c <= rightCol; c++) {
            if (r >= 0 && r < levelRows && c >= 0 && c < levelCols) {
                if (levelTiles[r][c] === T.FLAG_POLE || levelTiles[r][c] === T.FLAG_TOP) {
                    flagSliding = true;
                    flagSlideY = 0;
                    mario.vx = 0;
                    mario.vy = 0;
                    stopMusic();
                    playSFX('flag');
                    return;
                }
            }
        }
    }
}

function checkBossDefeated() {
    const data = LEVEL_DATA[currentLevel];
    const hasBoss = data.enemies.some(e => e.type === ENT.BOSS);
    if (!hasBoss) return;
    const bossAlive = entities.some(e => e.type === ENT.BOSS && e.alive);
    if (!bossAlive && !flagSliding && !mario.dead) {
        // Boss defeated = level complete
        levelComplete();
    }
}

function levelComplete() {
    gameState = 'LEVEL_COMPLETE';
    stopMusic();
    const timeBonus = levelTime * 50;
    const totalScore = score + timeBonus;
    score = totalScore;

    document.getElementById('lc-score').textContent = score;
    document.getElementById('lc-coins').textContent = levelCoins;
    document.getElementById('lc-time').textContent = timeBonus;
    document.getElementById('lc-total').textContent = totalScore;

    saveCoins();
    updateCoinDisplay();
    showScreen('level-complete-screen');
}

function nextLevel() {
    currentLevel++;
    if (currentLevel >= LEVEL_DATA.length) {
        showVictory();
    } else {
        gameState = 'PLAYING';
        loadLevel(currentLevel);
        showScreen(null);
    }
}

function showGameOver() {
    gameState = 'GAME_OVER';
    stopMusic();
    document.getElementById('final-score').textContent = 'Final Score: ' + score;
    saveCoins();
    updateCoinDisplay();
    showScreen('game-over-screen');
}

function showVictory() {
    gameState = 'VICTORY';
    stopMusic();
    document.getElementById('victory-score').textContent = 'Final Score: ' + score;
    coins += 200; // Victory bonus
    saveCoins();
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
// SECTION 13: INPUT HANDLING
// ============================================================
document.addEventListener('keydown', e => {
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
    // Prevent scrolling
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', e => {
    keys[e.code] = false;
});

// ============================================================
// SECTION 14: SCREEN MANAGEMENT & EVENT LISTENERS
// ============================================================
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    if (id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    }
}

document.getElementById('start-btn').addEventListener('click', () => {
    startGame();
});

document.getElementById('shop-btn').addEventListener('click', () => {
    showScreen('shop-screen');
    updateShopUI();
    updateCoinDisplay();
});

document.getElementById('back-btn').addEventListener('click', () => {
    showScreen('start-screen');
});

document.getElementById('next-level-btn').addEventListener('click', () => {
    nextLevel();
});

document.getElementById('restart-btn').addEventListener('click', () => {
    startGame();
});

document.getElementById('menu-btn').addEventListener('click', () => {
    goToMainMenu();
});

document.getElementById('play-again-btn').addEventListener('click', () => {
    startGame();
});

document.getElementById('victory-menu-btn').addEventListener('click', () => {
    goToMainMenu();
});

document.getElementById('music-btn').addEventListener('click', () => {
    initAudio();
    musicMuted = !musicMuted;
    document.getElementById('music-btn').textContent = musicMuted ? 'MUSIC OFF' : 'MUSIC ON';
    if (musicMuted) stopMusic();
});

// ============================================================
// SECTION 15: INITIALIZATION
// ============================================================
function init() {
    initSprites();
    initShopListeners();
    updateCoinDisplay();
    showScreen('start-screen');
    gameLoop();
}

init();
