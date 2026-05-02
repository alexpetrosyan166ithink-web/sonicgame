// Pokemon Battle - Browser Game
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const screenEl = document.getElementById('screen');

// =========================================================
// TYPE CHART (attacker -> defender multipliers)
// =========================================================
const TYPE_CHART = {
    fire:     { grass: 2, water: 0.5, fire: 0.5, electric: 1, normal: 1, psychic: 1, ghost: 1, rock: 0.5 },
    water:    { fire: 2, grass: 0.5, water: 0.5, electric: 1, normal: 1, psychic: 1, ghost: 1, rock: 2 },
    grass:    { water: 2, fire: 0.5, grass: 0.5, electric: 1, normal: 1, psychic: 1, ghost: 1, rock: 2 },
    electric: { water: 2, grass: 0.5, fire: 1, electric: 0.5, normal: 1, psychic: 1, ghost: 1, rock: 0 },
    normal:   { fire: 1, water: 1, grass: 1, electric: 1, normal: 1, psychic: 1, ghost: 0, rock: 0.5 },
    psychic:  { fire: 1, water: 1, grass: 1, electric: 1, normal: 1, psychic: 0.5, ghost: 1, rock: 1 },
    ghost:    { fire: 1, water: 1, grass: 1, electric: 1, normal: 0, psychic: 2, ghost: 2, rock: 1 },
    rock:     { fire: 2, water: 1, grass: 1, electric: 1, normal: 1, psychic: 1, ghost: 1, rock: 1 }
};

const TYPE_COLOR = {
    fire: '#f08030', water: '#6890f0', grass: '#78c850', electric: '#f8d030',
    normal: '#a8a878', psychic: '#f85888', ghost: '#705898', rock: '#b8a038'
};

// =========================================================
// LOW-LEVEL DRAW HELPERS
// =========================================================
function pix(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
}
function circle(x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
}
function ellipse(x, y, rx, ry, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
}

// =========================================================
// POKEMON SPRITES (drawn with canvas primitives)
// (cx, cy) = center-bottom feet point. s = scale.
// =========================================================
const SPRITES = {
    pikachu(cx, cy, s) {
        // ears
        ctx.fillStyle = '#fcd83d';
        ctx.beginPath(); ctx.moveTo(cx - 30 * s, cy - 60 * s); ctx.lineTo(cx - 44 * s, cy - 102 * s); ctx.lineTo(cx - 14 * s, cy - 70 * s); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx + 30 * s, cy - 60 * s); ctx.lineTo(cx + 44 * s, cy - 102 * s); ctx.lineTo(cx + 14 * s, cy - 70 * s); ctx.fill();
        ctx.fillStyle = '#202020';
        ctx.beginPath(); ctx.moveTo(cx - 44 * s, cy - 102 * s); ctx.lineTo(cx - 32 * s, cy - 80 * s); ctx.lineTo(cx - 22 * s, cy - 88 * s); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx + 44 * s, cy - 102 * s); ctx.lineTo(cx + 32 * s, cy - 80 * s); ctx.lineTo(cx + 22 * s, cy - 88 * s); ctx.fill();
        // tail (lightning bolt)
        ctx.fillStyle = '#fcd83d';
        ctx.beginPath();
        ctx.moveTo(cx + 28 * s, cy - 30 * s);
        ctx.lineTo(cx + 56 * s, cy - 50 * s);
        ctx.lineTo(cx + 46 * s, cy - 36 * s);
        ctx.lineTo(cx + 66 * s, cy - 24 * s);
        ctx.lineTo(cx + 46 * s, cy - 18 * s);
        ctx.lineTo(cx + 56 * s, cy - 6 * s);
        ctx.lineTo(cx + 32 * s, cy - 18 * s);
        ctx.closePath(); ctx.fill();
        pix(cx + 26 * s, cy - 32 * s, 6 * s, 6 * s, '#7d4a16');
        // body
        ellipse(cx, cy - 30 * s, 38 * s, 36 * s, '#fcd83d');
        ellipse(cx, cy - 22 * s, 28 * s, 24 * s, '#fff1a8');
        // cheeks
        circle(cx - 24 * s, cy - 22 * s, 7 * s, '#e8443c');
        circle(cx + 24 * s, cy - 22 * s, 7 * s, '#e8443c');
        // eyes
        circle(cx - 13 * s, cy - 38 * s, 6 * s, '#202020');
        circle(cx + 13 * s, cy - 38 * s, 6 * s, '#202020');
        circle(cx - 11 * s, cy - 40 * s, 2 * s, '#fff');
        circle(cx + 15 * s, cy - 40 * s, 2 * s, '#fff');
        // mouth
        ctx.strokeStyle = '#202020';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx - 4 * s, cy - 24 * s, 4 * s, 0, Math.PI);
        ctx.arc(cx + 4 * s, cy - 24 * s, 4 * s, 0, Math.PI);
        ctx.stroke();
        // feet
        ellipse(cx - 18 * s, cy - 2 * s, 10 * s, 5 * s, '#fcd83d');
        ellipse(cx + 18 * s, cy - 2 * s, 10 * s, 5 * s, '#fcd83d');
    },

    charmander(cx, cy, s) {
        // tail + flame
        ctx.fillStyle = '#f08030';
        ctx.beginPath();
        ctx.moveTo(cx + 30 * s, cy - 18 * s);
        ctx.quadraticCurveTo(cx + 70 * s, cy - 10 * s, cx + 60 * s, cy - 50 * s);
        ctx.quadraticCurveTo(cx + 50 * s, cy - 30 * s, cx + 30 * s, cy - 30 * s);
        ctx.fill();
        ctx.fillStyle = '#ff7f00';
        ctx.beginPath();
        ctx.moveTo(cx + 60 * s, cy - 50 * s);
        ctx.quadraticCurveTo(cx + 80 * s, cy - 70 * s, cx + 65 * s, cy - 90 * s);
        ctx.quadraticCurveTo(cx + 55 * s, cy - 70 * s, cx + 60 * s, cy - 50 * s);
        ctx.fill();
        ctx.fillStyle = '#ffd200';
        ctx.beginPath();
        ctx.moveTo(cx + 62 * s, cy - 55 * s);
        ctx.quadraticCurveTo(cx + 72 * s, cy - 70 * s, cx + 64 * s, cy - 82 * s);
        ctx.quadraticCurveTo(cx + 58 * s, cy - 68 * s, cx + 62 * s, cy - 55 * s);
        ctx.fill();
        // body
        ellipse(cx, cy - 28 * s, 30 * s, 32 * s, '#f08030');
        ellipse(cx, cy - 22 * s, 22 * s, 22 * s, '#fbd2a0');
        // legs
        pix(cx - 18 * s, cy - 12 * s, 12 * s, 14 * s, '#f08030');
        pix(cx + 6 * s, cy - 12 * s, 12 * s, 14 * s, '#f08030');
        // arms
        ellipse(cx - 28 * s, cy - 32 * s, 8 * s, 12 * s, '#f08030');
        ellipse(cx + 28 * s, cy - 32 * s, 8 * s, 12 * s, '#f08030');
        // head
        circle(cx, cy - 60 * s, 28 * s, '#f08030');
        ellipse(cx, cy - 52 * s, 16 * s, 10 * s, '#fbd2a0');
        // eyes
        circle(cx - 10 * s, cy - 68 * s, 5 * s, '#fff');
        circle(cx + 10 * s, cy - 68 * s, 5 * s, '#fff');
        circle(cx - 10 * s, cy - 68 * s, 3 * s, '#202020');
        circle(cx + 10 * s, cy - 68 * s, 3 * s, '#202020');
        // mouth
        ctx.strokeStyle = '#202020'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 6 * s, cy - 50 * s);
        ctx.lineTo(cx + 6 * s, cy - 50 * s);
        ctx.stroke();
    },

    bulbasaur(cx, cy, s) {
        // body
        ellipse(cx, cy - 24 * s, 38 * s, 26 * s, '#78c850');
        ellipse(cx, cy - 18 * s, 28 * s, 16 * s, '#a8e090');
        // bulb
        circle(cx + 6 * s, cy - 50 * s, 22 * s, '#5fa052');
        circle(cx - 4 * s, cy - 60 * s, 10 * s, '#7ec068');
        circle(cx + 18 * s, cy - 56 * s, 8 * s, '#7ec068');
        // dark spots
        ellipse(cx - 18 * s, cy - 30 * s, 6 * s, 4 * s, '#3b6b30');
        ellipse(cx + 16 * s, cy - 32 * s, 6 * s, 4 * s, '#3b6b30');
        // legs
        ellipse(cx - 22 * s, cy - 4 * s, 10 * s, 6 * s, '#78c850');
        ellipse(cx + 22 * s, cy - 4 * s, 10 * s, 6 * s, '#78c850');
        ellipse(cx - 8 * s, cy - 4 * s, 8 * s, 5 * s, '#78c850');
        ellipse(cx + 8 * s, cy - 4 * s, 8 * s, 5 * s, '#78c850');
        // head
        ellipse(cx - 28 * s, cy - 30 * s, 22 * s, 18 * s, '#78c850');
        circle(cx - 36 * s, cy - 34 * s, 5 * s, '#fff');
        circle(cx - 22 * s, cy - 34 * s, 5 * s, '#fff');
        circle(cx - 36 * s, cy - 34 * s, 2.5 * s, '#a02828');
        circle(cx - 22 * s, cy - 34 * s, 2.5 * s, '#a02828');
        ctx.strokeStyle = '#202020'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx - 30 * s, cy - 24 * s, 4 * s, 0, Math.PI);
        ctx.stroke();
    },

    squirtle(cx, cy, s) {
        // shell
        ellipse(cx + 4 * s, cy - 30 * s, 36 * s, 30 * s, '#a06030');
        // body
        ellipse(cx - 4 * s, cy - 26 * s, 30 * s, 26 * s, '#80c0f0');
        ellipse(cx - 8 * s, cy - 20 * s, 18 * s, 14 * s, '#f8e0a0');
        ctx.strokeStyle = '#704018'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx + 4 * s, cy - 30 * s, 30 * s, 24 * s, 0, 0, Math.PI * 2);
        ctx.stroke();
        // head
        circle(cx - 22 * s, cy - 38 * s, 20 * s, '#80c0f0');
        circle(cx - 32 * s, cy - 42 * s, 5 * s, '#fff');
        circle(cx - 16 * s, cy - 42 * s, 5 * s, '#fff');
        circle(cx - 32 * s, cy - 41 * s, 2.5 * s, '#202020');
        circle(cx - 16 * s, cy - 41 * s, 2.5 * s, '#202020');
        ctx.strokeStyle = '#202020'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 28 * s, cy - 30 * s);
        ctx.lineTo(cx - 20 * s, cy - 30 * s);
        ctx.stroke();
        // legs
        ellipse(cx - 16 * s, cy - 4 * s, 9 * s, 5 * s, '#80c0f0');
        ellipse(cx + 14 * s, cy - 4 * s, 9 * s, 5 * s, '#80c0f0');
        // tail
        ctx.fillStyle = '#80c0f0';
        ctx.beginPath();
        ctx.moveTo(cx + 30 * s, cy - 24 * s);
        ctx.quadraticCurveTo(cx + 50 * s, cy - 18 * s, cx + 38 * s, cy - 8 * s);
        ctx.quadraticCurveTo(cx + 30 * s, cy - 14 * s, cx + 30 * s, cy - 24 * s);
        ctx.fill();
    },

    eevee(cx, cy, s) {
        ellipse(cx + 28 * s, cy - 32 * s, 18 * s, 14 * s, '#f5e0a0');
        ellipse(cx + 36 * s, cy - 30 * s, 12 * s, 10 * s, '#a06030');
        ellipse(cx, cy - 22 * s, 30 * s, 22 * s, '#c98d50');
        ellipse(cx, cy - 18 * s, 22 * s, 14 * s, '#f5e0a0');
        ellipse(cx - 14 * s, cy - 4 * s, 8 * s, 5 * s, '#c98d50');
        ellipse(cx + 12 * s, cy - 4 * s, 8 * s, 5 * s, '#c98d50');
        circle(cx - 18 * s, cy - 38 * s, 18 * s, '#c98d50');
        ctx.fillStyle = '#c98d50';
        ctx.beginPath(); ctx.moveTo(cx - 32 * s, cy - 50 * s); ctx.lineTo(cx - 38 * s, cy - 70 * s); ctx.lineTo(cx - 22 * s, cy - 56 * s); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx - 6 * s, cy - 52 * s); ctx.lineTo(cx - 4 * s, cy - 72 * s); ctx.lineTo(cx - 14 * s, cy - 52 * s); ctx.fill();
        ellipse(cx - 8 * s, cy - 28 * s, 16 * s, 8 * s, '#f5e0a0');
        circle(cx - 26 * s, cy - 40 * s, 4 * s, '#202020');
        circle(cx - 12 * s, cy - 40 * s, 4 * s, '#202020');
        circle(cx - 25 * s, cy - 41 * s, 1.5 * s, '#fff');
        circle(cx - 18 * s, cy - 32 * s, 2.5 * s, '#202020');
    },

    gengar(cx, cy, s) {
        ellipse(cx, cy - 32 * s, 40 * s, 38 * s, '#705898');
        ctx.fillStyle = '#604888';
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(cx + i * 14 * s - 4 * s, cy - 60 * s);
            ctx.lineTo(cx + i * 14 * s, cy - 76 * s);
            ctx.lineTo(cx + i * 14 * s + 4 * s, cy - 60 * s);
            ctx.fill();
        }
        ellipse(cx - 36 * s, cy - 26 * s, 10 * s, 14 * s, '#705898');
        ellipse(cx + 36 * s, cy - 26 * s, 10 * s, 14 * s, '#705898');
        ellipse(cx - 16 * s, cy - 4 * s, 12 * s, 6 * s, '#705898');
        ellipse(cx + 16 * s, cy - 4 * s, 12 * s, 6 * s, '#705898');
        circle(cx - 14 * s, cy - 44 * s, 6 * s, '#fff');
        circle(cx + 14 * s, cy - 44 * s, 6 * s, '#fff');
        circle(cx - 14 * s, cy - 44 * s, 3 * s, '#d02828');
        circle(cx + 14 * s, cy - 44 * s, 3 * s, '#d02828');
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(cx - 18 * s, cy - 28 * s);
        ctx.quadraticCurveTo(cx, cy - 14 * s, cx + 18 * s, cy - 28 * s);
        ctx.lineTo(cx + 14 * s, cy - 24 * s);
        ctx.lineTo(cx - 14 * s, cy - 24 * s);
        ctx.fill();
        ctx.strokeStyle = '#705898'; ctx.lineWidth = 1.5;
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(cx + i * 7 * s, cy - 28 * s);
            ctx.lineTo(cx + i * 7 * s, cy - 22 * s);
            ctx.stroke();
        }
    },

    snorlax(cx, cy, s) {
        ellipse(cx, cy - 40 * s, 60 * s, 44 * s, '#5878a0');
        ellipse(cx, cy - 26 * s, 46 * s, 28 * s, '#e0d0a0');
        ellipse(cx - 50 * s, cy - 32 * s, 14 * s, 18 * s, '#5878a0');
        ellipse(cx + 50 * s, cy - 32 * s, 14 * s, 18 * s, '#5878a0');
        ellipse(cx - 22 * s, cy - 4 * s, 18 * s, 8 * s, '#5878a0');
        ellipse(cx + 22 * s, cy - 4 * s, 18 * s, 8 * s, '#5878a0');
        ellipse(cx - 22 * s, cy - 4 * s, 10 * s, 4 * s, '#e0d0a0');
        ellipse(cx + 22 * s, cy - 4 * s, 10 * s, 4 * s, '#e0d0a0');
        ellipse(cx, cy - 76 * s, 30 * s, 22 * s, '#5878a0');
        ctx.fillStyle = '#5878a0';
        ctx.beginPath(); ctx.moveTo(cx - 24 * s, cy - 92 * s); ctx.lineTo(cx - 16 * s, cy - 80 * s); ctx.lineTo(cx - 30 * s, cy - 80 * s); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx + 24 * s, cy - 92 * s); ctx.lineTo(cx + 16 * s, cy - 80 * s); ctx.lineTo(cx + 30 * s, cy - 80 * s); ctx.fill();
        ctx.strokeStyle = '#202020'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx - 10 * s, cy - 78 * s, 4 * s, 0, Math.PI, true);
        ctx.arc(cx + 10 * s, cy - 78 * s, 4 * s, 0, Math.PI, true);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 6 * s, cy - 70 * s);
        ctx.lineTo(cx + 6 * s, cy - 70 * s);
        ctx.stroke();
    },

    mewtwo(cx, cy, s) {
        ctx.strokeStyle = '#c0c0d0'; ctx.lineWidth = 6 * s;
        ctx.beginPath();
        ctx.moveTo(cx + 20 * s, cy - 30 * s);
        ctx.quadraticCurveTo(cx + 70 * s, cy - 50 * s, cx + 60 * s, cy - 90 * s);
        ctx.stroke();
        ellipse(cx, cy - 36 * s, 22 * s, 36 * s, '#c0c0d0');
        ellipse(cx - 14 * s, cy - 6 * s, 8 * s, 8 * s, '#c0c0d0');
        ellipse(cx + 14 * s, cy - 6 * s, 8 * s, 8 * s, '#c0c0d0');
        ellipse(cx - 22 * s, cy - 40 * s, 7 * s, 16 * s, '#c0c0d0');
        ellipse(cx + 22 * s, cy - 40 * s, 7 * s, 16 * s, '#c0c0d0');
        ellipse(cx, cy - 34 * s, 12 * s, 18 * s, '#9080a8');
        ellipse(cx, cy - 86 * s, 22 * s, 24 * s, '#c0c0d0');
        circle(cx + 14 * s, cy - 88 * s, 12 * s, '#c0c0d0');
        ctx.strokeStyle = '#9080a8'; ctx.lineWidth = 5 * s;
        ctx.beginPath();
        ctx.moveTo(cx + 18 * s, cy - 88 * s);
        ctx.quadraticCurveTo(cx + 26 * s, cy - 70 * s, cx + 16 * s, cy - 56 * s);
        ctx.stroke();
        circle(cx - 6 * s, cy - 88 * s, 4 * s, '#7050a0');
        circle(cx + 6 * s, cy - 88 * s, 4 * s, '#7050a0');
        circle(cx - 6 * s, cy - 88 * s, 1.5 * s, '#fff');
        ctx.strokeStyle = '#202020'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 4 * s, cy - 78 * s);
        ctx.lineTo(cx + 4 * s, cy - 78 * s);
        ctx.stroke();
    }
};

// =========================================================
// POKEMON DATA
// =========================================================
const POKEDEX = {
    pikachu:    { name: 'Pikachu',    type: 'electric', maxHp: 80,  scale: 1.0, sprite: 'pikachu',
                  moves: [ {name:'Thunderbolt', type:'electric', power:25}, {name:'Quick Attack', type:'normal', power:18}, {name:'Iron Tail', type:'normal', power:22}, {name:'Thunder', type:'electric', power:32}] },
    charmander: { name: 'Charmander', type: 'fire', maxHp: 85, scale: 1.0, sprite: 'charmander',
                  moves: [ {name:'Ember', type:'fire', power:22}, {name:'Scratch', type:'normal', power:16}, {name:'Flamethrower', type:'fire', power:30}, {name:'Slash', type:'normal', power:24}] },
    bulbasaur:  { name: 'Bulbasaur',  type: 'grass', maxHp: 90, scale: 1.0, sprite: 'bulbasaur',
                  moves: [ {name:'Vine Whip', type:'grass', power:22}, {name:'Tackle', type:'normal', power:18}, {name:'Razor Leaf', type:'grass', power:28}, {name:'Solar Beam', type:'grass', power:34}] },
    squirtle:   { name: 'Squirtle',   type: 'water', maxHp: 88, scale: 1.0, sprite: 'squirtle',
                  moves: [ {name:'Water Gun', type:'water', power:22}, {name:'Tackle', type:'normal', power:18}, {name:'Bubble Beam', type:'water', power:26}, {name:'Hydro Pump', type:'water', power:34}] },
    eevee:      { name: 'Eevee',      type: 'normal', maxHp: 75, scale: 1.0, sprite: 'eevee',
                  moves: [ {name:'Tackle', type:'normal', power:18}, {name:'Quick Attack', type:'normal', power:20}, {name:'Bite', type:'normal', power:22}] },
    gengar:     { name: 'Gengar',     type: 'ghost', maxHp: 95, scale: 1.0, sprite: 'gengar',
                  moves: [ {name:'Shadow Ball', type:'ghost', power:28}, {name:'Lick', type:'ghost', power:18}, {name:'Hypnosis', type:'psychic', power:22}] },
    snorlax:    { name: 'Snorlax',    type: 'normal', maxHp: 130, scale: 0.95, sprite: 'snorlax',
                  moves: [ {name:'Body Slam', type:'normal', power:26}, {name:'Headbutt', type:'normal', power:20}, {name:'Hyper Beam', type:'normal', power:34}] },
    mewtwo:     { name: 'Mewtwo',     type: 'psychic', maxHp: 140, scale: 1.0, sprite: 'mewtwo',
                  moves: [ {name:'Psychic', type:'psychic', power:32}, {name:'Shadow Ball', type:'ghost', power:26}, {name:'Aura Sphere', type:'normal', power:28}, {name:'Recover', type:'psychic', power:0, heal:40}] }
};

function makePokemon(key) {
    const base = POKEDEX[key];
    return {
        key, name: base.name, type: base.type,
        hp: base.maxHp, maxHp: base.maxHp,
        moves: base.moves, scale: base.scale, sprite: base.sprite
    };
}

// =========================================================
// GAME STATE
// =========================================================
let state = 'pick';
let player = null;
let enemy = null;
let trainerIndex = 0;
let messageQueue = [];
let currentMessage = null;
let messageTimer = 0;
let busy = false;          // blocks input while animations/messages run
let attackAnim = null;
let shakeTimer = 0;
let flashTimer = 0;
let flashColor = '';

const TRAINERS = [
    { name: 'Wild Eevee',     mons: ['eevee'],     intro: 'A wild EEVEE appeared!', wild: true },
    { name: 'Wild Bulbasaur', mons: ['bulbasaur'], intro: 'A wild BULBASAUR appeared!', wild: true },
    { name: 'Wild Squirtle',  mons: ['squirtle'],  intro: 'A wild SQUIRTLE appeared!', wild: true },
    { name: 'Ghost Trainer',  mons: ['gengar'],    intro: 'GHOST TRAINER sent out GENGAR!', wild: false },
    { name: 'Sleeping Giant', mons: ['snorlax'],   intro: 'A massive SNORLAX blocks your path!', wild: false },
    { name: 'Champion',       mons: ['mewtwo'],    intro: 'CHAMPION sent out MEWTWO!', wild: false }
];

// =========================================================
// STARTER PICKER
// =========================================================
function buildStarterPicker() {
    const container = document.getElementById('starterPick');
    container.innerHTML = '';
    const starters = ['pikachu', 'charmander', 'bulbasaur', 'squirtle'];
    starters.forEach(key => {
        const div = document.createElement('div');
        div.className = 'starter';
        const p = POKEDEX[key];
        const typeColor = TYPE_COLOR[p.type];
        div.innerHTML = `
            <div style="height:90px;display:flex;align-items:center;justify-content:center;font-size:42px;">
                ${ {pikachu:'⚡',charmander:'🔥',bulbasaur:'🌿',squirtle:'💧'}[key] }
            </div>
            <p style="color:#ffcb05;">${p.name}</p>
            <p style="font-size:11px;background:${typeColor};color:#fff;border-radius:8px;padding:2px 6px;display:inline-block;margin-top:4px;">${p.type.toUpperCase()}</p>
            <p style="font-size:11px;color:#ccc;margin-top:6px;">HP ${p.maxHp}</p>
        `;
        div.onclick = () => pickStarter(key);
        container.appendChild(div);
    });
}

// =========================================================
// FLOW
// =========================================================
function pickStarter(key) {
    player = makePokemon(key);
    trainerIndex = 0;
    screenEl.classList.add('hidden');
    startNextBattle();
}

function startNextBattle() {
    if (trainerIndex >= TRAINERS.length) { showWinScreen(); return; }
    const t = TRAINERS[trainerIndex];
    enemy = makePokemon(t.mons[0]);
    queueMessage(t.intro);
    queueMessage(`Go, ${player.name}!`, () => { state = 'choose'; });
}

function queueMessage(text, after) {
    messageQueue.push({ text, after });
    if (!currentMessage) advanceMessage();
}

function advanceMessage() {
    if (messageQueue.length === 0) {
        currentMessage = null;
        busy = false;
        return;
    }
    currentMessage = messageQueue.shift();
    messageTimer = 110;
    busy = true;
}

// =========================================================
// COMBAT
// =========================================================
function calcDamage(attacker, defender, move) {
    const eff = (TYPE_CHART[move.type] && TYPE_CHART[move.type][defender.type]);
    const e = eff === undefined ? 1 : eff;
    const variance = 0.85 + Math.random() * 0.3;
    const dmg = Math.max(1, Math.floor(move.power * e * variance));
    return { dmg, eff: e };
}

function playerUseMove(idx) {
    if (state !== 'choose' || busy) return;
    const move = player.moves[idx];
    if (!move) return;
    busy = true;
    state = 'playerAttack';
    attackAnim = { who: 'player', frame: 0 };
    setTimeout(() => {
        attackAnim = null;
        if (move.heal) {
            const h = Math.min(move.heal, player.maxHp - player.hp);
            player.hp += h;
            queueMessage(`${player.name} used ${move.name}! Recovered ${h} HP.`, afterPlayerMove);
        } else {
            const r = calcDamage(player, enemy, move);
            enemy.hp = Math.max(0, enemy.hp - r.dmg);
            shakeTimer = 18; flashTimer = 10; flashColor = '#fff';
            queueMessage(`${player.name} used ${move.name}!`);
            if (r.eff > 1) queueMessage("It's super effective!");
            else if (r.eff === 0) queueMessage('It had no effect...');
            else if (r.eff < 1) queueMessage("It's not very effective...");
            queueMessage(`Dealt ${r.dmg} damage.`, afterPlayerMove);
        }
    }, 350);
}

function afterPlayerMove() {
    if (enemy.hp <= 0) {
        queueMessage(`${enemy.name} fainted!`, () => {
            trainerIndex++;
            if (trainerIndex >= TRAINERS.length) showWinScreen();
            else queueMessage('You won the battle!', startNextBattle);
        });
        return;
    }
    state = 'enemyAttack';
    setTimeout(enemyTurn, 500);
}

function enemyTurn() {
    let best = enemy.moves[0], bestScore = -1;
    for (const m of enemy.moves) {
        if (m.heal && enemy.hp < enemy.maxHp * 0.35) { best = m; break; }
        const eff = (TYPE_CHART[m.type] && TYPE_CHART[m.type][player.type]) ?? 1;
        const score = m.power * eff;
        if (score > bestScore) { bestScore = score; best = m; }
    }
    attackAnim = { who: 'enemy', frame: 0 };
    setTimeout(() => {
        attackAnim = null;
        if (best.heal) {
            const h = Math.min(best.heal, enemy.maxHp - enemy.hp);
            enemy.hp += h;
            queueMessage(`Foe ${enemy.name} used ${best.name}! Recovered ${h} HP.`, afterEnemyMove);
        } else {
            const r = calcDamage(enemy, player, best);
            player.hp = Math.max(0, player.hp - r.dmg);
            shakeTimer = 18; flashTimer = 10; flashColor = '#f88';
            queueMessage(`Foe ${enemy.name} used ${best.name}!`);
            if (r.eff > 1) queueMessage("It's super effective!");
            else if (r.eff === 0) queueMessage('It had no effect...');
            else if (r.eff < 1) queueMessage("It's not very effective...");
            queueMessage(`You took ${r.dmg} damage.`, afterEnemyMove);
        }
    }, 350);
}

function afterEnemyMove() {
    if (player.hp <= 0) { queueMessage(`${player.name} fainted!`, showLoseScreen); return; }
    state = 'choose';
    busy = false;
}

function tryRun() {
    if (state !== 'choose' || busy) return;
    if (!TRAINERS[trainerIndex].wild) {
        queueMessage("Can't run from a trainer battle!");
        return;
    }
    if (Math.random() < 0.6) {
        queueMessage('Got away safely!', () => {
            trainerIndex++;
            if (trainerIndex >= TRAINERS.length) showWinScreen();
            else startNextBattle();
        });
    } else {
        queueMessage("Couldn't escape!", () => {
            state = 'enemyAttack';
            setTimeout(enemyTurn, 400);
        });
    }
}

function showWinScreen() {
    state = 'win';
    screenEl.classList.remove('hidden');
    screenEl.innerHTML = `
        <h1>YOU WON!</h1>
        <p>You defeated all trainers including the Champion's MEWTWO!</p>
        <p>${player.name} is now a true legend!</p>
        <p style="margin-top:20px;color:#aaa;">Press ENTER to play again</p>
    `;
}

function showLoseScreen() {
    state = 'defeat';
    screenEl.classList.remove('hidden');
    screenEl.innerHTML = `
        <h1>YOU LOST...</h1>
        <p>${player.name} fainted against ${enemy.name}.</p>
        <p style="margin-top:20px;color:#aaa;">Press ENTER to try again</p>
    `;
}

function resetToPicker() {
    screenEl.classList.remove('hidden');
    screenEl.innerHTML = `
        <h1>POKEMON BATTLE</h1>
        <p>Choose your starter!</p>
        <div class="starters" id="starterPick"></div>
        <div id="controls">
            <p>1 / 2 / 3 / 4 — pick a move during battle</p>
            <p>R — run from wild pokemon &nbsp;•&nbsp; ENTER — skip message</p>
        </div>
    `;
    state = 'pick'; player = null; enemy = null; trainerIndex = 0;
    messageQueue = []; currentMessage = null; busy = false;
    buildStarterPicker();
}

// =========================================================
// RENDER
// =========================================================
function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, 360);
    g.addColorStop(0, '#87ceeb'); g.addColorStop(1, '#cdeaf7');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 800, 400);
    circle(680, 70, 36, '#fff5b0');
    ctx.fillStyle = '#7090c0';
    ctx.beginPath();
    ctx.moveTo(0, 280);
    ctx.lineTo(120, 180); ctx.lineTo(220, 260); ctx.lineTo(360, 170);
    ctx.lineTo(500, 250); ctx.lineTo(640, 190); ctx.lineTo(800, 270);
    ctx.lineTo(800, 400); ctx.lineTo(0, 400);
    ctx.fill();
    ctx.fillStyle = '#8fc859'; ctx.fillRect(0, 320, 800, 80);
    ctx.fillStyle = '#6ba03f';
    ctx.beginPath(); ctx.ellipse(180, 380, 150, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7fb84a';
    ctx.beginPath(); ctx.ellipse(620, 270, 130, 20, 0, 0, Math.PI * 2); ctx.fill();
}

function drawHpBar(x, y, w, name, type, hp, maxHp) {
    ctx.fillStyle = '#fff8e0';
    ctx.strokeStyle = '#202020'; ctx.lineWidth = 3;
    ctx.fillRect(x, y, w, 60); ctx.strokeRect(x, y, w, 60);
    ctx.fillStyle = '#202020'; ctx.font = 'bold 18px Arial';
    ctx.fillText(name, x + 12, y + 22);
    ctx.fillStyle = TYPE_COLOR[type];
    ctx.fillRect(x + w - 78, y + 8, 66, 18);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial';
    ctx.fillText(type.toUpperCase(), x + w - 70, y + 21);
    ctx.fillStyle = '#202020'; ctx.font = 'bold 12px Arial';
    ctx.fillText('HP', x + 12, y + 42);
    ctx.fillStyle = '#404040';
    ctx.fillRect(x + 36, y + 32, w - 50, 12);
    const ratio = Math.max(0, hp / maxHp);
    let barColor = '#48c020';
    if (ratio < 0.5) barColor = '#f0c020';
    if (ratio < 0.2) barColor = '#e04030';
    ctx.fillStyle = barColor;
    ctx.fillRect(x + 38, y + 34, (w - 54) * ratio, 8);
    ctx.fillStyle = '#202020'; ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${hp}/${maxHp}`, x + w - 12, y + 54);
    ctx.textAlign = 'left';
}

function drawMoveBox() {
    ctx.fillStyle = '#202020';
    ctx.fillRect(0, 400, 800, 120);
    ctx.fillStyle = '#fff8e0';
    ctx.fillRect(8, 408, 784, 104);
    ctx.strokeStyle = '#202020'; ctx.lineWidth = 3;
    ctx.strokeRect(8, 408, 784, 104);

    if (state === 'choose' && !busy) {
        ctx.fillStyle = '#202020';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('Choose a move:', 22, 432);
        for (let i = 0; i < player.moves.length; i++) {
            const m = player.moves[i];
            const col = i % 2; const row = Math.floor(i / 2);
            const bx = 22 + col * 380; const by = 442 + row * 32;
            ctx.fillStyle = '#2a75bb';
            ctx.fillRect(bx, by, 22, 22);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial';
            ctx.fillText(String(i + 1), bx + 7, by + 16);
            ctx.fillStyle = '#202020'; ctx.font = 'bold 15px Arial';
            ctx.fillText(m.name, bx + 30, by + 16);
            ctx.fillStyle = TYPE_COLOR[m.type];
            ctx.fillRect(bx + 200, by + 4, 60, 16);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial';
            ctx.fillText(m.type.toUpperCase(), bx + 207, by + 16);
            // power label
            ctx.fillStyle = '#666'; ctx.font = '11px Arial';
            ctx.fillText(m.heal ? `Heal +${m.heal}` : `Pow ${m.power}`, bx + 270, by + 16);
        }
        ctx.fillStyle = '#666'; ctx.font = '12px Arial';
        ctx.fillText(`Press R to run${TRAINERS[trainerIndex].wild ? '' : ' (not allowed in trainer battle)'}`, 22, 506);
    } else {
        ctx.fillStyle = '#202020';
        ctx.font = 'bold 18px Arial';
        const txt = currentMessage ? currentMessage.text : '';
        wrapText(txt, 22, 442, 760, 24);
        ctx.fillStyle = '#888'; ctx.font = '11px Arial';
        ctx.fillText('press ENTER to skip', 660, 502);
    }
}

function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '', yy = y;
    for (let n = 0; n < words.length; n++) {
        const test = line + words[n] + ' ';
        if (ctx.measureText(test).width > maxWidth) {
            ctx.fillText(line, x, yy);
            line = words[n] + ' ';
            yy += lineHeight;
        } else { line = test; }
    }
    ctx.fillText(line, x, yy);
}

function render() {
    let dx = 0, dy = 0;
    if (shakeTimer > 0) {
        dx = (Math.random() - 0.5) * 8;
        dy = (Math.random() - 0.5) * 8;
        shakeTimer--;
    }
    ctx.save();
    ctx.translate(dx, dy);
    drawBackground();

    if (player && enemy) {
        const enemyX = 620 + (attackAnim && attackAnim.who === 'enemy' ? -20 : 0);
        const enemyY = 270;
        SPRITES[POKEDEX[enemy.key].sprite](enemyX, enemyY, enemy.scale * 1.4);
        const playerX = 180 + (attackAnim && attackAnim.who === 'player' ? 20 : 0);
        const playerY = 380;
        SPRITES[POKEDEX[player.key].sprite](playerX, playerY, player.scale * 1.7);

        drawHpBar(40, 30, 320, enemy.name, enemy.type, enemy.hp, enemy.maxHp);
        drawHpBar(440, 230, 320, player.name, player.type, player.hp, player.maxHp);

        if (attackAnim) {
            const tx = attackAnim.who === 'player' ? enemyX : playerX;
            const ty = attackAnim.who === 'player' ? enemyY - 40 : playerY - 60;
            for (let i = 0; i < 8; i++) {
                circle(tx + (Math.random() - 0.5) * 60, ty + (Math.random() - 0.5) * 60, 6 + Math.random() * 8, 'rgba(255,180,40,0.6)');
            }
        }
    }

    drawMoveBox();

    if (flashTimer > 0) {
        ctx.fillStyle = flashColor;
        ctx.globalAlpha = flashTimer / 10 * 0.4;
        ctx.fillRect(0, 0, 800, 400);
        ctx.globalAlpha = 1;
        flashTimer--;
    }
    ctx.restore();
}

// =========================================================
// LOOP
// =========================================================
function loop() {
    if (currentMessage && messageTimer > 0) {
        messageTimer--;
        if (messageTimer === 0) {
            const after = currentMessage.after;
            currentMessage = null;
            if (messageQueue.length > 0) advanceMessage();
            else busy = false;
            if (after) after();
        }
    } else if (!currentMessage && messageQueue.length > 0) {
        advanceMessage();
    }
    render();
    requestAnimationFrame(loop);
}

// =========================================================
// INPUT
// =========================================================
window.addEventListener('keydown', (e) => {
    if (state === 'pick') return;
    if (state === 'win' || state === 'defeat') {
        if (e.key === 'Enter') resetToPicker();
        return;
    }
    if (e.key === 'Enter' && currentMessage) {
        messageTimer = 1; // skip current message
        return;
    }
    if (state === 'choose' && !busy) {
        if (e.key === '1') playerUseMove(0);
        else if (e.key === '2') playerUseMove(1);
        else if (e.key === '3') playerUseMove(2);
        else if (e.key === '4') playerUseMove(3);
        else if (e.key.toLowerCase() === 'r') tryRun();
    }
});

// =========================================================
// BOOT
// =========================================================
buildStarterPicker();
loop();
