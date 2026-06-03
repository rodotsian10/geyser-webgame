/**
 * Thermal Bond - Game Logic
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let gameState = 'title'; // title, playing, clear
let lastTime = 0;
let level = null;
let camera = { x: 0, y: 0, zoom: 1 };

// Inputs
const keys = {};
const keyTimes = {};
const doubleTaps = {};

window.addEventListener('keydown', (e) => {
    if (!keys[e.code]) {
        const now = performance.now();
        if (now - (keyTimes[e.code] || 0) < 300) {
            doubleTaps[e.code] = true;
        }
        keyTimes[e.code] = now;
    }
    keys[e.code] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    doubleTaps[e.code] = false;
});

// UI Elements
const ui = {
    titleScreen: document.getElementById('title-screen'),
    gameScreen: document.getElementById('game-screen'),
    clearScreen: document.getElementById('clear-screen'),
    pyroState: document.getElementById('pyro-state'),
    cryoState: document.getElementById('cryo-state'),
    pyroSkill: document.getElementById('pyro-skill-bar'),
    cryoSkill: document.getElementById('cryo-skill-bar'),
    objective: document.getElementById('objective-text'),
    stage: document.getElementById('stage-label'),
    clearStats: document.getElementById('clear-stats')
};

let customLevelMap = null;

document.getElementById('btn-start').addEventListener('click', () => {
    openStageSelect();
});
document.getElementById('btn-restart').addEventListener('click', startGame);

document.getElementById('btn-next-stage').addEventListener('click', () => {
    currentLevelIndex++;
    if (currentLevelIndex >= levels.length) currentLevelIndex = 0;
    customLevelMap = null;
    startGame();
});

document.getElementById('btn-load-map').addEventListener('click', () => {
    const ui = document.getElementById('custom-map-ui');
    ui.style.display = ui.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('btn-start-custom').addEventListener('click', () => {
    const input = document.getElementById('custom-map-input').value;
    try {
        const match = input.match(/\[([\s\S]*)\]/);
        if(match) {
            customLevelMap = eval('[' + match[1] + ']');
            startGame();
        } else {
            alert('올바른 맵 코드가 아닙니다. (const levelMap = [...] 형태인지 확인하세요)');
        }
    } catch(e) {
        alert('맵 코드를 불러오는데 실패했습니다: ' + e.message);
    }
});

document.getElementById('btn-clear-menu').addEventListener('click', () => {
    goToMenu();
});

// Stage Select Functions
function openStageSelect() {
    const overlay = document.getElementById('stage-select-overlay');
    overlay.style.display = 'flex';
}

function closeStageSelect() {
    const overlay = document.getElementById('stage-select-overlay');
    overlay.style.display = 'none';
}

function selectStage(index) {
    closeStageSelect();
    currentLevelIndex = index;
    customLevelMap = null;
    startGame();
}

function goToMenu() {
    gameState = 'title';
    ui.gameScreen.classList.remove('active');
    ui.clearScreen.classList.remove('active');
    ui.titleScreen.classList.add('active');
}

// Constants
const TILE_SIZE = 40;
const GRAVITY = 1200;
const TERMINAL_VELOCITY = 800;

// Particles and Projectiles
let particles = [];
let bullets = [];
let enemyMissiles = [];
function addParticle(x, y, color, vx, vy, life) {
    particles.push({ x, y, color, vx, vy, life, maxLife: life, size: Math.random() * 4 + 2 });
}
function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
    }
}
function drawParticles() {
    for (let p of particles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1.0;
}

// -----------------------------------------------------
// Level Design (1: Normal, 2: Red, 3: Blue, 4: Spike, 5: Exit)
// -----------------------------------------------------
const tutorialMap1 = [
    "111111111111111111111111111111",
    "100000000000000000000000000001",
    "100000000000000000000000000001",
    "100000000000000000000000000001",
    "100000000700000400006000000001",
    "100000000000000000000000000001",
    "100000000000000000000000000001",
    "100000000000000000000000000001",
    "10p0c0000000000000000000055501",
    "100000000000000000000000055501",
    "111110007770004440066600055501",
    "111111111111111111111111111111",
];

const tutorialMap2 = [
    "111111111111111111111111111111",
    "100000001000000000000000000001",
    "100000001000000000000000000001",
    "100000001000000000000000000001",
    "100000001000000000000000000001",
    "100000001000000000000000O00001",
    "2000000010000440000440000B0001",
    "200000001133111111111111111331",
    "20000A000000000000000000000001",
    "200111112033000000000000000001",
    "200000002000000000000000000001",
    "200000002000000000000000bbbbb1",
    "2000000020330000000E0000b55551",
    "20p0c0002000000000000000b55551",
    "20000000a000000000000000b55551",
    "111111111111111111111111111111",
];

const tutorialMap3 = [
    "111111111111111111111111111111",
    "100000000100021000000000700001",
    "10p0000c01A0021000000000700001",
    "100000000111021000000000755001",
    "111171611100021000000000755001",
    "100001000100021000000000111001",
    "1A0001000100021013311110000001",
    "133331aaa100021000000000000001",
    "100001000000021000000000000001",
    "100001000000021011113310000001",
    "100001000000021000000000000001",
    "1aaaa1DDDDDDD21000000000000001",
    "100000000000000033111110000001",
    "100000000000010000000000000001",
    "100001ddddddd10000000000000001",
    "2000014444444100111133100E0001",
    "203301111111110000000000000002",
    "200206666666660000000000000002",
    "2C0206666666660000000000000001",
    "111111111111111111111111111111",
];

const mainLevelMap = [
    // 30 x 40
    "111111111111111111111111111111",
    "100000000060070000003000000001",
    "133300000060070000003000000001",
    "15560000006006000000b000000001",
    "15560440007006000B00b000A00002",
    "111111111111111111111111113002",
    "10000000a000000000000000000002",
    "10000000a00000000000J000000002",
    "20000000a000000000000000003002",
    "20000000a0000000J0000000J00002",
    "20011000a000000000000000000002",
    "200001111111111111111111111111",
    "200000000006000000007000000002",
    "200000000000000000000000000002",
    "111000000000000000000000000002",
    "100110000000000000000000000002",
    "10000110000A00000000B000000002",
    "100000011111111111111111111302",
    "1000000000a00b00a00b00a00b0002",
    "1000000000a00b00a00b00a00b0002",
    "1000000000a00b00a00b00a00b0002",
    "100000110010010010010010010131",
    "100011114444444444444444444101",
    "100111114444444444444444444101",
    "100111111111111111111111111101",
    "100100000012323232323232323131",
    "100100000013232323232323232101",
    "100100A0B012323232323232323101",
    "100133111111111111111111111101",
    "100100300000b0000a0000b0000031",
    "100100300000b0000a0000b0000001",
    "10010030000011100a0000b0000001",
    "10013310000000000a000011100001",
    "10010010111000000a000000000031",
    "100100100000000001110000000001",
    "100100100000000000000000000001",
    "200133100000000000000000000001",
    "20p0c0166666666666666666666661",
    "10000010E0E0E0E0E0E0E0E0E0E0E1",
    "111111111111111111111111111111"
];

const levels = [tutorialMap1, tutorialMap2, tutorialMap3, mainLevelMap];
let currentLevelIndex = 0;

class Level {
    constructor(map) {
        this.cols = map[0].length;
        this.rows = map.length;
        this.width = this.cols * TILE_SIZE;
        this.height = this.rows * TILE_SIZE;
        this.tiles = [];
        this.switches = [];
        this.doors = [];
        this.elevators = [];
        this.rocks = [];
        this.enemies = [];
        this.elevatorTargets = [];
        this.spawnP = { x: 2 * TILE_SIZE, y: 35 * TILE_SIZE };
        this.spawnC = { x: 4 * TILE_SIZE, y: 35 * TILE_SIZE };
        
        let exitLeft = Infinity, exitTop = Infinity, exitRight = -Infinity, exitBottom = -Infinity;

        for (let r = 0; r < this.rows; r++) {
            this.tiles[r] = [];
            for (let c = 0; c < this.cols; c++) {
                let char = map[r][c];
                let val = parseInt(char, 10);
                
                if (char === 'A' || char === 'B' || char === 'C') {
                    let color = char === 'A' ? '#ffaa00' : char === 'B' ? '#00ffcc' : '#b200ff';
                    let target = char === 'C' ? 'elevators_c' : 'door_' + char.toLowerCase();
                    this.switches.push({ x: c * TILE_SIZE, y: (r+1) * TILE_SIZE - 10, w: TILE_SIZE, h: 10, pressed: false, targetId: target, color: color });
                    val = 0;
                } else if (char === 'U' || char === 'D' || char === 'L' || char === 'R') {
                    let vx = char === 'L' ? -1 : char === 'R' ? 1 : 0;
                    let vy = char === 'U' ? -1 : char === 'D' ? 1 : 0;
                    let basex = c * TILE_SIZE, basey = r * TILE_SIZE;
                    this.elevators.push({ x: basex, y: basey, startX: basex, startY: basey, w: TILE_SIZE, h: TILE_SIZE, vx: vx * 100, vy: vy * 100, active: false, id: 'elevators_c', char: char });
                    val = 0;
                } else if (char === 'u' || char === 'd' || char === 'l' || char === 'r') {
                    this.elevatorTargets.push({ x: c * TILE_SIZE, y: r * TILE_SIZE, char: char });
                    val = 0;
                } else if (char === 'O') {
                    this.rocks.push(new Rock(c * TILE_SIZE, r * TILE_SIZE));
                    val = 0;
                } else if (char === 'a' || char === 'b') {
                    this.doors.push({ x: c * TILE_SIZE, y: r * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE, open: false, id: 'door_' + char });
                    val = 0;
                } else if (char === '8') {
                    // Default door
                    this.doors.push({ x: c * TILE_SIZE, y: r * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE, open: false, id: 'shutter1' });
                    val = 0;
                } else if (char === 'p') {
                    this.spawnP = { x: c * TILE_SIZE, y: r * TILE_SIZE };
                    val = 0;
                } else if (char === 'c') {
                    this.spawnC = { x: c * TILE_SIZE, y: r * TILE_SIZE };
                    val = 0;
                } else if (char === 'E') {
                    this.enemies.push(new Enemy(c * TILE_SIZE, r * TILE_SIZE, 'stationary'));
                    val = 0;
                } else if (char === 'J') {
                    this.enemies.push(new Enemy(c * TILE_SIZE, r * TILE_SIZE, 'jumping'));
                    val = 0;
                } else if (char === '5') {
                    exitLeft = Math.min(exitLeft, c * TILE_SIZE);
                    exitTop = Math.min(exitTop, r * TILE_SIZE);
                    exitRight = Math.max(exitRight, c * TILE_SIZE + TILE_SIZE);
                    exitBottom = Math.max(exitBottom, r * TILE_SIZE + TILE_SIZE);
                    val = 0;
                } else if (isNaN(val)) {
                    val = 0;
                }
                
                this.tiles[r][c] = val;
            }
        }
        
        if (exitLeft !== Infinity) {
            this.exit = { x: exitLeft, y: exitTop, w: exitRight - exitLeft, h: exitBottom - exitTop };
        } else {
            this.exit = { x: 0, y: 0, w: 0, h: 0 };
        }
        
        // Manual setups for triggers (legacy map only)
        if (map === mainLevelMap) {
            this.switches.push({ x: 2 * TILE_SIZE, y: 38 * TILE_SIZE, w: TILE_SIZE, h: 10, pressed: false, targetId: 'shutter1', color: '#4ac8ff' });
            this.switches.push({ x: 14 * TILE_SIZE, y: 22 * TILE_SIZE, w: TILE_SIZE, h: 10, pressed: false, targetId: 'elevator1', color: '#ff6b4a' });
            this.elevators.push({ x: 19 * TILE_SIZE, y: 27 * TILE_SIZE, startX: 19 * TILE_SIZE, startY: 27 * TILE_SIZE, w: TILE_SIZE * 3, h: TILE_SIZE, sy: 27 * TILE_SIZE, ey: 22 * TILE_SIZE, active: false, id: 'elevator1' });
        }

        // Assign targets to elevators
        for (let e of this.elevators) {
            if (e.char === 'U') {
                let ts = this.elevatorTargets.filter(t => t.char === 'u' && t.x === e.x && t.y < e.y).sort((a,b) => b.y - a.y);
                if (ts.length) e.ey = ts[0].y;
            } else if (e.char === 'D') {
                let ts = this.elevatorTargets.filter(t => t.char === 'd' && t.x === e.x && t.y > e.y).sort((a,b) => a.y - b.y);
                if (ts.length) e.ey = ts[0].y;
            } else if (e.char === 'L') {
                let ts = this.elevatorTargets.filter(t => t.char === 'l' && t.y === e.y && t.x < e.x).sort((a,b) => b.x - a.x);
                if (ts.length) e.ex = ts[0].x;
            } else if (e.char === 'R') {
                let ts = this.elevatorTargets.filter(t => t.char === 'r' && t.y === e.y && t.x > e.x).sort((a,b) => a.x - b.x);
                if (ts.length) e.ex = ts[0].x;
            }
        }
    }

    getTile(x, y) {
        let col = Math.floor(x / TILE_SIZE);
        let row = Math.floor(y / TILE_SIZE);
        if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
            return this.tiles[row][col];
        }
        return 1; // Wall out of bounds
    }

    draw(ctx) {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                let tile = this.tiles[r][c];
                if (tile === 0) continue;
                
                if (tile === 6) ctx.fillStyle = '#ff5500'; // Pyro Lava
                else if (tile === 7) ctx.fillStyle = '#88ccff'; // Cryo Ice
                else ctx.fillStyle = tile === 1 ? '#444' : tile === 2 ? '#8b1a00' : tile === 3 ? 'rgba(46,184,255,0.4)' : tile === 4 ? '#ff00ff' : '#000';
                
                ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                
                if (tile === 1) {
                    ctx.strokeStyle = '#222';
                    ctx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                } else if (tile === 2) {
                    ctx.strokeStyle = '#ff4d2e';
                    ctx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                } else if (tile === 4) { // Spikes
                    ctx.fillStyle = '#ff3333';
                    ctx.beginPath();
                    ctx.moveTo(c*TILE_SIZE, (r+1)*TILE_SIZE);
                    ctx.lineTo(c*TILE_SIZE + TILE_SIZE/2, r*TILE_SIZE);
                    ctx.lineTo((c+1)*TILE_SIZE, (r+1)*TILE_SIZE);
                    ctx.fill();
                }
            }
        }

        // Draw Switches
        for (let s of this.switches) {
            ctx.fillStyle = s.pressed ? '#222' : s.color;
            let sy = s.pressed ? s.y + s.h - 4 : s.y;
            let sh = s.pressed ? 4 : s.h;
            ctx.fillRect(s.x, sy, s.w, sh);
        }

        // Draw Doors
        for (let d of this.doors) {
            if (!d.open) {
                ctx.fillStyle = '#777';
                ctx.fillRect(d.x, d.y, d.w, d.h);
                ctx.strokeStyle = '#ffff00';
                ctx.strokeRect(d.x, d.y, d.w, d.h);
            }
        }

        // Draw Elevators
        for (let e of this.elevators) {
            ctx.fillStyle = '#666';
            ctx.fillRect(e.x, e.y, e.w, e.h);
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(e.x, e.y, e.w, e.h);
            ctx.lineWidth = 1;
            
            if (e.char) {
                ctx.fillStyle = '#fff';
                ctx.font = '16px sans-serif';
                let arrow = e.char === 'U' ? '▲' : e.char === 'D' ? '▼' : e.char === 'L' ? '◀' : '▶';
                ctx.fillText(arrow, e.x + 12, e.y + 26);
            }
        }
        
        for (let r of this.rocks) r.draw(ctx);

        // Draw Exit
        ctx.fillStyle = '#00ffaa';
        ctx.shadowColor = '#00ffaa';
        ctx.shadowBlur = 20;
        ctx.fillRect(this.exit.x, this.exit.y, this.exit.w, this.exit.h);
        ctx.shadowBlur = 0;
    }
}

// -----------------------------------------------------
// Entities
// -----------------------------------------------------
class Rock {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.w = TILE_SIZE; this.h = TILE_SIZE;
        this.vx = 0; this.vy = 0;
    }
    update(dt) {
        this.vy += GRAVITY * dt;
        if (this.vy > TERMINAL_VELOCITY) this.vy = TERMINAL_VELOCITY;
        this.vx *= 0.8;
        if (Math.abs(this.vx) < 5) this.vx = 0;
        this.x += this.vx * dt;
        this.checkCollisionX();
        this.y += this.vy * dt;
        this.checkCollisionY();
    }
    isSolid(tile) {
        return tile !== 0 && tile !== 4 && tile !== 5 && tile !== 6 && tile !== 7;
    }
    checkCollisionX() {
        let left = Math.floor(this.x / TILE_SIZE), right = Math.floor((this.x + this.w) / TILE_SIZE);
        let top = Math.floor(this.y / TILE_SIZE), bottom = Math.floor((this.y + this.h - 1) / TILE_SIZE);
        for (let r = top; r <= bottom; r++) {
            for (let c = left; c <= right; c++) {
                if (this.isSolid(level.getTile(c * TILE_SIZE, r * TILE_SIZE))) {
                    if (this.vx > 0) this.x = c * TILE_SIZE - this.w - 0.1;
                    else if (this.vx < 0) this.x = (c + 1) * TILE_SIZE + 0.1;
                    this.vx = 0; return;
                }
            }
        }
    }
    checkCollisionY() {
        let left = Math.floor(this.x / TILE_SIZE), right = Math.floor((this.x + this.w - 1) / TILE_SIZE);
        let top = Math.floor(this.y / TILE_SIZE), bottom = Math.floor((this.y + this.h) / TILE_SIZE);
        for (let r = top; r <= bottom; r++) {
            for (let c = left; c <= right; c++) {
                if (this.isSolid(level.getTile(c * TILE_SIZE, r * TILE_SIZE))) {
                    if (this.vy > 0) this.y = r * TILE_SIZE - this.h - 0.1;
                    else if (this.vy < 0) this.y = (r + 1) * TILE_SIZE + 0.1;
                    this.vy = 0; return;
                }
            }
        }
    }
    draw(ctx) {
        ctx.fillStyle = '#6b4d32'; ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.strokeStyle = '#4a3422'; ctx.strokeRect(this.x, this.y, this.w, this.h);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('O', this.x + 12, this.y + 26);
    }
}

class Enemy {
    constructor(x, y, type) {
        this.x = x; this.y = y;
        this.w = TILE_SIZE; this.h = TILE_SIZE;
        this.type = type;
        this.vx = 0; this.vy = 0;
        this.shootTimer = 1.0;
        this.jumpTimer = 0;
        this.dead = false;
    }
    update(dt) {
        if (this.dead) return;
        
        this.vy += GRAVITY * dt;
        if (this.vy > TERMINAL_VELOCITY) this.vy = TERMINAL_VELOCITY;
        
        this.y += this.vy * dt;
        this.checkCollisionY();

        if (this.type === 'jumping') {
            if (this.jumpTimer <= 0 && this.vy === 0) {
                this.vy = -500;
                this.jumpTimer = 1.0;
            }
            if (this.jumpTimer > 0) this.jumpTimer -= dt;
        }
        
        this.shootTimer -= dt;
        if (this.shootTimer <= 0) {
            this.shootTimer = 1.0;
            this.fire();
        }
    }
    fire() {
        let d1 = Math.hypot(player1.x - this.x, player1.y - this.y);
        let d2 = Math.hypot(player2.x - this.x, player2.y - this.y);
        let target = d1 < d2 ? player1 : player2;
        
        let dx = (target.x + target.w/2) - (this.x + this.w/2);
        let dy = (target.y + target.h/2) - (this.y + this.h/2);
        let mag = Math.hypot(dx, dy);
        let vx = (dx / mag) * 250;
        let vy = (dy / mag) * 250;
        
        enemyMissiles.push({ x: this.x + this.w/2 - 4, y: this.y + this.h/2 - 4, w: 8, h: 8, vx, vy });
    }
    checkCollisionY() {
        let left = Math.floor(this.x / TILE_SIZE), right = Math.floor((this.x + this.w - 1) / TILE_SIZE);
        let top = Math.floor(this.y / TILE_SIZE), bottom = Math.floor((this.y + this.h) / TILE_SIZE);
        for (let r = top; r <= bottom; r++) {
            for (let c = left; c <= right; c++) {
                let tile = level.getTile(c * TILE_SIZE, r * TILE_SIZE);
                if (tile !== 0 && tile !== 4 && tile !== 5 && tile !== 6 && tile !== 7) {
                    if (this.vy > 0) { this.y = r * TILE_SIZE - this.h - 0.1; this.vy = 0; }
                    else if (this.vy < 0) { this.y = (r + 1) * TILE_SIZE + 0.1; this.vy = 0; }
                    return;
                }
            }
        }
    }
    draw(ctx) {
        if (this.dead) return;
        ctx.fillStyle = '#9900ff';
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(this.x + 8, this.y + 12, 24, 8);
    }
}

class Player {
    constructor(x, y, type) {
        this.x = x; this.y = y;
        this.w = 30; this.h = 30;
        this.vx = 0; this.vy = 0;
        this.type = type; // 1 = Pyro, 2 = Cryo
        
        if (type === 1) { // Pyro
            this.speed = 350;
            this.jumpForce = 400;
            this.gravityScale = 1.0;
            this.color = '#ff4d2e';
            this.ammo = 3;
            this.reloadTimer = 0;
            this.fireCooldown = 0;
        } else { // Cryo
            this.speed = 250;
            this.jumpForce = 550;
            this.gravityScale = 1.1;
            this.color = '#2eb8ff';
        }

        this.grounded = false;
        this.state = 'IDLE';
        this.facing = 1; // 1 right, -1 left

        // Specifics
        this.wallClinging = false;
        this.wallDir = 0;
        this.dashTimer = 0;
        this.dashCooldown = 0;
        this.isDashing = false;
    }

    update(dt, otherPlayer) {
        let prevX = this.x;
        let prevY = this.y;

        // Input
        let moveX = 0;
        let jump = false;
        let skill = false;

        if (this.type === 1) {
            if (this.reloadTimer > 0) {
                this.reloadTimer -= dt;
                if (this.reloadTimer <= 0) this.ammo = 3;
            }
            if (this.fireCooldown > 0) this.fireCooldown -= dt;

            if (keys['KeyR'] && this.fireCooldown <= 0 && this.ammo > 0) {
                this.fireCooldown = 0.6;
                this.ammo--;
                bullets.push({ x: this.x + this.w/2, y: this.y + this.h/2, vx: this.facing * 600, vy: 0, w: 10, h: 4 });
                for(let i=0; i<5; i++) addParticle(this.x + (this.facing>0?this.w:0), this.y+this.h/2, '#ffaa00', this.facing*200, (Math.random()-0.5)*100, 0.2);
                if (this.ammo === 0) this.reloadTimer = 3.0;
            }

            if (keys['KeyA']) moveX = -1;
            if (keys['KeyD']) moveX = 1;
            if (keys['KeyW']) jump = true;
            if (keys['KeyF']) skill = true;
        } else {
            if (keys['ArrowLeft']) moveX = -1;
            if (keys['ArrowRight']) moveX = 1;
            if (keys['ArrowUp']) jump = true;
            if (keys['ShiftRight'] || keys['ControlRight']) skill = true;
        }

        if (moveX !== 0) this.facing = moveX;

        // --- Cryo Dash Logic ---
        if (this.type === 2) {
            let dLeft = doubleTaps['ArrowLeft'];
            let dRight = doubleTaps['ArrowRight'];
            let dUp = doubleTaps['ArrowUp'];
            let dDown = doubleTaps['ArrowDown'];
            let dashTriggered = skill || dLeft || dRight || dUp || dDown;

            if (this.dashCooldown > 0) this.dashCooldown -= dt;
            if (dashTriggered && this.dashCooldown <= 0 && !this.isDashing) {
                this.isDashing = true;
                this.dashTimer = 0.2; // 0.2s duration
                this.dashCooldown = 1.5;
                
                this.vx = 0;
                this.vy = 0;

                if (dUp || (skill && keys['ArrowUp'])) {
                    this.vy = -600; // Vertical Dash
                } else if (dDown || (skill && keys['ArrowDown'])) {
                    this.vy = 600; // Downward Dash
                } else if (dLeft || (skill && keys['ArrowLeft'])) {
                    this.vx = -600;
                    this.facing = -1;
                } else if (dRight || (skill && keys['ArrowRight'])) {
                    this.vx = 600;
                    this.facing = 1;
                } else {
                    this.vx = this.facing * 600;
                }
                
                doubleTaps['ArrowLeft'] = false;
                doubleTaps['ArrowRight'] = false;
                doubleTaps['ArrowUp'] = false;
                doubleTaps['ArrowDown'] = false;

                for(let i=0; i<10; i++) addParticle(this.x+15, this.y+15, this.color, (Math.random()-0.5)*200, (Math.random()-0.5)*200, 0.5);
            }
        }

        if (this.isDashing) {
            this.dashTimer -= dt;
            this.state = 'DASH';
            addParticle(this.x+15, this.y+15, '#fff', 0, 0, 0.2);
            if (this.dashTimer <= 0) {
                this.isDashing = false;
                this.vx = 0;
                this.vy = 0;
            }
        } else if (this.state === 'LAUNCHED') {
            // Pyro getting launched
            this.vy += GRAVITY * this.gravityScale * dt;
            if (this.vy > 0) this.state = 'JUMP';
        } else {
            // Normal Movement
            if (this.wallClinging) {
                this.vy = 0;
                this.vx = 0;
                if (!skill) this.wallClinging = false; // release
                else if (jump) { // Wall Jump
                    this.wallClinging = false;
                    this.vy = -this.jumpForce * 1.2;
                    this.vx = -this.wallDir * this.speed * 1.2;
                    for(let i=0; i<5; i++) addParticle(this.x+15, this.y+15, this.color, -this.wallDir*100, -100, 0.5);
                }
            } else {
                this.vx = moveX * this.speed;
                this.vy += GRAVITY * this.gravityScale * dt;
                
                if (jump && this.grounded) {
                    this.vy = -this.jumpForce;
                    this.grounded = false;
                    for(let i=0; i<5; i++) addParticle(this.x+15, this.y+30, '#fff', (Math.random()-0.5)*100, -Math.random()*50, 0.3);
                }
            }
        }

        if (this.vy > TERMINAL_VELOCITY) this.vy = TERMINAL_VELOCITY;

        // Update X
        this.x += this.vx * dt;
        this.checkCollisionX();
        
        // Rock push (X axis) — must run AFTER checkCollisionX, BEFORE Y update
        for (let rock of level.rocks) {
            if (this.rectIntersect(this.x, this.y, this.w, this.h, rock.x, rock.y, rock.w, rock.h)) {
                // Determine which side the player is approaching from
                let playerCenterX = this.x + this.w / 2;
                let rockCenterX   = rock.x + rock.w / 2;
                if (playerCenterX < rockCenterX) {
                    // Player is to the left → push rock right
                    this.x = rock.x - this.w - 0.1;
                    rock.vx = Math.max(rock.vx, this.speed * 0.8);
                } else {
                    // Player is to the right → push rock left
                    this.x = rock.x + rock.w + 0.1;
                    rock.vx = Math.min(rock.vx, -this.speed * 0.8);
                }
                this.vx = 0;
            }
        }

        // Update Y
        this.y += this.vy * dt;
        this.grounded = false;
        this.checkCollisionY();

        // --- Pyro Wall Cling Logic ---
        if (this.type === 1 && !this.grounded && this.state !== 'LAUNCHED') {
            if (skill) {
                // Try to cling only when pressing into a red wall tile (tile 2)
                let tL = level.getTile(this.x - 2, this.y + this.h/2);
                let tR = level.getTile(this.x + this.w + 2, this.y + this.h/2);
                let canCling = (tL === 2) || (tR === 2);
                
                if (canCling) {
                    if (!this.wallClinging) {
                        this.wallClinging = true;
                        if (tL === 2) {
                            this.wallDir = -1;
                            // Snap flush to left wall
                            let wallC = Math.floor((this.x - 2) / TILE_SIZE);
                            this.x = (wallC + 1) * TILE_SIZE + 0.1;
                        } else {
                            this.wallDir = 1;
                            // Snap flush to right wall
                            let wallC = Math.floor((this.x + this.w + 2) / TILE_SIZE);
                            this.x = wallC * TILE_SIZE - this.w - 0.1;
                        }
                    }
                } else {
                    // Not touching a red wall anymore (or tried to cling on a normal wall)
                    this.wallClinging = false;
                }
            } else {
                this.wallClinging = false;
            }
        } else if (this.grounded) {
            if (this.wallClinging) this.wallClinging = false;
        }

        // --- COMBO LOGIC: Thermal Rocket Launch ---
        // If Pyro is wall clinging, and Cryo vertical dashes into him
        if (this.type === 2 && this.isDashing && this.vy < 0) { // Cryo dashing up
            if (otherPlayer.type === 1 && otherPlayer.wallClinging) { // Pyro is clinging
                if (this.rectIntersect(this.x, this.y, this.w, this.h, otherPlayer.x, otherPlayer.y, otherPlayer.w, otherPlayer.h)) {
                    // Trigger Combo!
                    otherPlayer.wallClinging = false;
                    otherPlayer.state = 'LAUNCHED';
                    otherPlayer.vy = -otherPlayer.jumpForce * 3.5; // Huge boost
                    
                    // FX
                    for(let i=0; i<30; i++) {
                        addParticle(otherPlayer.x+15, otherPlayer.y+30, '#ff4d2e', (Math.random()-0.5)*300, Math.random()*300, 1.0);
                        addParticle(this.x+15, this.y, '#2eb8ff', (Math.random()-0.5)*300, Math.random()*300, 1.0);
                    }
                }
            }
        }

        // Update State String
        if (!this.wallClinging && this.state !== 'LAUNCHED' && !this.isDashing) {
            if (!this.grounded) this.state = 'JUMP';
            else if (Math.abs(this.vx) > 0) this.state = 'RUN';
            else this.state = 'IDLE';
        } else if (this.wallClinging) {
            this.state = 'WALL CLING';
        }

        // Bounds / Death
        // Bounds / Death
        let centerTile = level.getTile(this.x+this.w/2, this.y+this.h-5);
        if (this.y > level.height || centerTile === 4) {
            this.die();
        } else if (this.type === 1 && centerTile === 7) {
            this.die(); // 파이로가 얼음(7) 밟으면 사망
        } else if (this.type === 2 && centerTile === 6) {
            this.die(); // 크라이오가 용암(6) 밟으면 사망
        }
    }

    die() {
        if (gameState !== 'playing') return;
        gameState = 'dead';
        setTimeout(startGame, 50); // 약간 딜레이 후 완전 재시작
    }

    rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    }

    isSolid(tile) {
        if (tile === 0 || tile === 4 || tile === 5 || tile === 6 || tile === 7) return false; // Empty, Spikes, Exit, Lava, Ice are not solid for AABB
        if (this.type === 2 && this.isDashing && tile === 3) return false; // Cryo dashes through Blue
        if (this.type === 1 && tile === 3) return true; // Pyro blocked by Blue
        return true; // Normal and Red are solid
    }

    checkCollisionX() {
        let left = Math.floor(this.x / TILE_SIZE);
        let right = Math.floor((this.x + this.w) / TILE_SIZE);
        let top = Math.floor(this.y / TILE_SIZE);
        let bottom = Math.floor((this.y + this.h - 1) / TILE_SIZE);

        for (let r = top; r <= bottom; r++) {
            for (let c = left; c <= right; c++) {
                let tile = level.getTile(c * TILE_SIZE, r * TILE_SIZE);
                if (this.isSolid(tile)) {
                    if (this.vx > 0) { // Moving right
                        this.x = c * TILE_SIZE - this.w - 0.1;
                    } else if (this.vx < 0) { // Moving left
                        this.x = (c + 1) * TILE_SIZE + 0.1;
                    }
                    this.vx = 0;
                    return;
                }
            }
        }
        
        // Door Collision X
        for (let d of level.doors) {
            if (!d.open && this.rectIntersect(this.x, this.y, this.w, this.h, d.x, d.y, d.w, d.h)) {
                let overlapL = (d.x + d.w) - this.x;
                let overlapR = (this.x + this.w) - d.x;
                if (overlapR <= overlapL) {
                    this.x = d.x - this.w - 0.1;
                } else {
                    this.x = d.x + d.w + 0.1;
                }
                this.vx = 0;
            }
        }
    }

    checkCollisionY() {
        let left = Math.floor(this.x / TILE_SIZE);
        let right = Math.floor((this.x + this.w - 1) / TILE_SIZE);
        let top = Math.floor(this.y / TILE_SIZE);
        let bottom = Math.floor((this.y + this.h) / TILE_SIZE);

        for (let r = top; r <= bottom; r++) {
            for (let c = left; c <= right; c++) {
                let tile = level.getTile(c * TILE_SIZE, r * TILE_SIZE);
                if (this.isSolid(tile)) {
                    if (this.vy > 0) { // Falling
                        this.y = r * TILE_SIZE - this.h - 0.1;
                        this.grounded = true;
                    } else if (this.vy < 0) { // Jumping up
                        this.y = (r + 1) * TILE_SIZE + 0.1;
                    }
                    this.vy = 0;
                    return;
                }
            }
        }
        
        // Door / Elevator Collision Y
        for (let d of level.doors) {
            if (!d.open && this.rectIntersect(this.x, this.y, this.w, this.h, d.x, d.y, d.w, d.h)) {
                let overlapTop = (d.y + d.h) - this.y;
                let overlapBot = (this.y + this.h) - d.y;
                if (overlapBot <= overlapTop) {
                    this.y = d.y - this.h - 0.1;
                    this.grounded = true;
                } else {
                    this.y = d.y + d.h + 0.1;
                }
                this.vy = 0;
            }
        }
        
        // Rock collision Y
        for (let rock of level.rocks) {
            if (this.rectIntersect(this.x, this.y, this.w, this.h, rock.x, rock.y, rock.w, rock.h)) {
                let overlapBot = (this.y + this.h) - rock.y;
                let overlapTop = (rock.y + rock.h) - this.y;
                if (overlapBot <= overlapTop) {
                    this.y = rock.y - this.h - 0.1;
                    this.grounded = true;
                    this.vy = 0;
                } else {
                    this.y = rock.y + rock.h + 0.1;
                    this.vy = 0;
                }
            }
        }
        
        for (let e of level.elevators) {
            if (this.rectIntersect(this.x, this.y, this.w, this.h, e.x, e.y, e.w, e.h)) {
                // Resolve overlap: find smallest penetration
                let overlapTop = (e.y + e.h) - this.y;
                let overlapBot = (this.y + this.h) - e.y;
                let overlapL   = (e.x + e.w) - this.x;
                let overlapR   = (this.x + this.w) - e.x;
                let minPen = Math.min(overlapTop, overlapBot, overlapL, overlapR);
                if (minPen === overlapBot) {
                    this.y = e.y - this.h - 0.1;
                    this.grounded = true;
                    this.vy = 0;
                } else if (minPen === overlapTop) {
                    this.y = e.y + e.h + 0.1;
                    this.vy = 0;
                } else if (minPen === overlapL) {
                    this.x = e.x + e.w + 0.1;
                    this.vx = 0;
                } else {
                    this.x = e.x - this.w - 0.1;
                    this.vx = 0;
                }
            }
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        
        // Glow if active state
        if (this.state === 'LAUNCHED' || this.isDashing) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 15;
        }

        ctx.fillRect(this.x, this.y, this.w, this.h);
        
        // Eyes (direction)
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        let eyeX = this.facing === 1 ? this.x + 20 : this.x + 5;
        ctx.fillRect(eyeX, this.y + 5, 5, 5);
    }
}

let player1, player2;

// -----------------------------------------------------
// Game Loop & Logic
// -----------------------------------------------------
function startGame() {
    ui.titleScreen.classList.remove('active');
    ui.clearScreen.classList.remove('active');
    ui.gameScreen.classList.add('active');
    
    level = new Level(customLevelMap || levels[currentLevelIndex]);
    player1 = new Player(level.spawnP.x, level.spawnP.y, 1);
    player2 = new Player(level.spawnC.x, level.spawnC.y, 2);
    
    ui.stage.innerText = customLevelMap ? 'CUSTOM STAGE' : 'STAGE ' + (currentLevelIndex + 1);
    
    particles = [];
    bullets = [];
    enemyMissiles = [];
    gameState = 'playing';
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function updateTriggers() {
    // Check Switches
    for (let s of level.switches) {
        let p1Touch = player1.rectIntersect(player1.x, player1.y, player1.w, player1.h, s.x, s.y, s.w, s.h);
        let p2Touch = player2.rectIntersect(player2.x, player2.y, player2.w, player2.h, s.x, s.y, s.w, s.h);
        let rockTouch = false;
        for (let r of level.rocks) {
            if (player1.rectIntersect(r.x, r.y, r.w, r.h, s.x, s.y, s.w, s.h)) { rockTouch = true; break; }
        }
        
        let isTouched = p1Touch || p2Touch || rockTouch;
        
        if (s.pressed !== isTouched) {
            s.pressed = isTouched;
            // Activate/Deactivate Target
            if (s.targetId && s.targetId.startsWith('door_')) {
                for (let d of level.doors) {
                    if (d.id === s.targetId) d.open = isTouched;
                }
            } else if (s.targetId === 'elevators_c') {
                for (let e of level.elevators) {
                    if (e.id === 'elevators_c') e.active = isTouched;
                }
            } else if (s.targetId === 'shutter1') {
                for (let d of level.doors) {
                    if (d.id === 'shutter1') d.open = isTouched;
                }
            } else if (s.targetId === 'elevator1') {
                for (let e of level.elevators) {
                    if (e.id === 'elevator1') e.active = isTouched;
                }
            }
        }
    }

    // Update Elevators
    for (let e of level.elevators) {
        if (e.active) {
            if (e.vx !== undefined && e.vy !== undefined) {
                // Directional elevator moving towards target
                let prevX = e.x, prevY = e.y;
                let curVx = e.vx, curVy = e.vy;
                
                if (e.ex !== undefined) {
                    if (curVx > 0 && e.x >= e.ex) curVx = 0;
                    if (curVx < 0 && e.x <= e.ex) curVx = 0;
                }
                if (e.ey !== undefined && e.char) {
                    if (curVy > 0 && e.y >= e.ey) curVy = 0;
                    if (curVy < 0 && e.y <= e.ey) curVy = 0;
                }

                e.x += curVx * 0.016;
                e.y += curVy * 0.016;
                
                // Force exact position if overshot
                if (e.ex !== undefined) {
                    if (e.vx > 0 && e.x > e.ex) e.x = e.ex;
                    if (e.vx < 0 && e.x < e.ex) e.x = e.ex;
                }
                if (e.ey !== undefined && e.char) {
                    if (e.vy > 0 && e.y > e.ey) e.y = e.ey;
                    if (e.vy < 0 && e.y < e.ey) e.y = e.ey;
                }

                let dx = e.x - prevX, dy = e.y - prevY;

                // Move players on it
                if (player1.grounded && Math.abs((player1.y + player1.h) - prevY) < 5) { player1.x += dx; player1.y += dy; }
                if (player2.grounded && Math.abs((player2.y + player2.h) - prevY) < 5) { player2.x += dx; player2.y += dy; }
            } else if (e.y > e.ey) {
                // Legacy Elevator moving up
                e.y -= 50 * 0.016; 
                if (player1.grounded && Math.abs((player1.y + player1.h) - (e.y + 50 * 0.016)) < 2) player1.y -= 50 * 0.016;
                if (player2.grounded && Math.abs((player2.y + player2.h) - (e.y + 50 * 0.016)) < 2) player2.y -= 50 * 0.016;
            }
        } else {
            // Revert Elevators
            if (e.vx !== undefined && e.vy !== undefined) {
                // Directional elevator moving towards start
                let prevX = e.x, prevY = e.y;
                let curVx = -e.vx, curVy = -e.vy;
                
                if (curVx > 0 && e.x >= e.startX) curVx = 0;
                if (curVx < 0 && e.x <= e.startX) curVx = 0;
                if (curVy > 0 && e.y >= e.startY) curVy = 0;
                if (curVy < 0 && e.y <= e.startY) curVy = 0;
                
                e.x += curVx * 0.016;
                e.y += curVy * 0.016;
                
                if (e.vx > 0 && e.x < e.startX) e.x = e.startX;
                if (e.vx < 0 && e.x > e.startX) e.x = e.startX;
                if (e.vy > 0 && e.y < e.startY) e.y = e.startY;
                if (e.vy < 0 && e.y > e.startY) e.y = e.startY;
                
                let dx = e.x - prevX, dy = e.y - prevY;
                if (player1.grounded && Math.abs((player1.y + player1.h) - prevY) < 5) { player1.x += dx; player1.y += dy; }
                if (player2.grounded && Math.abs((player2.y + player2.h) - prevY) < 5) { player2.x += dx; player2.y += dy; }
            } else if (e.y < e.sy) {
                // Legacy Elevator moving down
                e.y += 50 * 0.016;
                if (player1.grounded && Math.abs((player1.y + player1.h) - (e.y - 50 * 0.016)) < 2) player1.y += 50 * 0.016;
                if (player2.grounded && Math.abs((player2.y + player2.h) - (e.y - 50 * 0.016)) < 2) player2.y += 50 * 0.016;
            }
        }
    }

    // Check Exit
    let p1Exit = player1.rectIntersect(player1.x, player1.y, player1.w, player1.h, level.exit.x, level.exit.y, level.exit.w, level.exit.h);
    let p2Exit = player2.rectIntersect(player2.x, player2.y, player2.w, player2.h, level.exit.x, level.exit.y, level.exit.w, level.exit.h);
    
    if (p1Exit && p2Exit && gameState === 'playing') {
        gameState = 'clear';
        ui.gameScreen.classList.remove('active');
        ui.clearScreen.classList.add('active');
        
        let isLast = customLevelMap || (currentLevelIndex === levels.length - 1);
        document.getElementById('btn-next-stage').style.display = isLast ? 'none' : 'inline-block';
        
        if (isLast) {
            ui.clearStats.innerHTML = `Great Teamwork! All stages cleared!`;
        } else {
            ui.clearStats.innerHTML = `Stage Cleared!`;
        }
    }
}

function updateHUD() {
    ui.pyroState.innerText = player1.state;
    ui.cryoState.innerText = player2.state;
    
    // Ammo
    document.getElementById('pyro-ammo').innerText = player1.ammo > 0 ? player1.ammo : (player1.reloadTimer > 0 ? '장전중' : 0);
    
    // Skills
    if (player1.wallClinging) ui.pyroSkill.style.width = '100%';
    else ui.pyroSkill.style.width = '0%';
    
    let cRatio = player2.dashCooldown > 0 ? (1.5 - player2.dashCooldown) / 1.5 : 1;
    ui.cryoSkill.style.width = `${cRatio * 100}%`;
}

function gameLoop(timestamp) {
    if (gameState !== 'playing') return;
    
    let dt = (timestamp - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    lastTime = timestamp;

    // Update Entities
    player1.update(dt, player2);
    player2.update(dt, player1);
    for (let r of level.rocks) r.update(dt);
    for (let e of level.enemies) e.update(dt);
    updateTriggers();
    updateParticles(dt);

    // Update Projectiles
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        
        let hit = false;
        // Hit Tile
        let tile = level.getTile(b.x + b.w/2, b.y + b.h/2);
        if (tile !== 0 && tile !== 4 && tile !== 5 && tile !== 6 && tile !== 7) hit = true;
        
        // Hit Doors, Elevators, Rocks
        if (!hit) {
            for (let d of level.doors) if (!d.open && player1.rectIntersect(b.x, b.y, b.w, b.h, d.x, d.y, d.w, d.h)) hit = true;
            for (let el of level.elevators) if (player1.rectIntersect(b.x, b.y, b.w, b.h, el.x, el.y, el.w, el.h)) hit = true;
            for (let r of level.rocks) if (player1.rectIntersect(b.x, b.y, b.w, b.h, r.x, r.y, r.w, r.h)) hit = true;
        }

        // Hit Enemy
        for (let e of level.enemies) {
            if (!e.dead && player1.rectIntersect(b.x, b.y, b.w, b.h, e.x, e.y, e.w, e.h)) {
                e.dead = true;
                hit = true;
                for(let k=0; k<15; k++) addParticle(e.x+15, e.y+15, '#ff00ff', (Math.random()-0.5)*200, (Math.random()-0.5)*200, 0.5);
            }
        }
        if (hit) bullets.splice(i, 1);
    }
    
    for (let i = enemyMissiles.length - 1; i >= 0; i--) {
        let m = enemyMissiles[i];
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        
        let hit = false;
        // Hit Tile
        let tile = level.getTile(m.x + m.w/2, m.y + m.h/2);
        if (tile !== 0 && tile !== 4 && tile !== 5 && tile !== 6 && tile !== 7) hit = true;
        
        // Hit Doors, Elevators, Rocks
        if (!hit) {
            for (let d of level.doors) if (!d.open && player1.rectIntersect(m.x, m.y, m.w, m.h, d.x, d.y, d.w, d.h)) hit = true;
            for (let el of level.elevators) if (player1.rectIntersect(m.x, m.y, m.w, m.h, el.x, el.y, el.w, el.h)) hit = true;
            for (let r of level.rocks) if (player1.rectIntersect(m.x, m.y, m.w, m.h, r.x, r.y, r.w, r.h)) hit = true;
        }
        
        // Hit Players
        if (player1.rectIntersect(m.x, m.y, m.w, m.h, player1.x, player1.y, player1.w, player1.h)) {
            player1.die(); hit = true;
        }
        if (player2.rectIntersect(m.x, m.y, m.w, m.h, player2.x, player2.y, player2.w, player2.h)) {
            player2.die(); hit = true;
        }
        if (hit) enemyMissiles.splice(i, 1);
    }

    // Camera (View Entire Map)
    camera.zoom = Math.min(canvas.width / level.width, canvas.height / level.height);
    camera.x = -(canvas.width / camera.zoom - level.width) / 2;
    camera.y = -(canvas.height / camera.zoom - level.height) / 2;

    // Draw
    resizeCanvas();
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    level.draw(ctx);
    for (let e of level.enemies) e.draw(ctx);
    player1.draw(ctx);
    player2.draw(ctx);
    
    ctx.fillStyle = '#ffaa00';
    for (let b of bullets) ctx.fillRect(b.x, b.y, b.w, b.h);
    
    ctx.fillStyle = '#ff00ff';
    for (let m of enemyMissiles) {
        ctx.beginPath();
        ctx.arc(m.x + m.w/2, m.y + m.h/2, m.w/2, 0, Math.PI*2);
        ctx.fill();
    }
    
    drawParticles();

    ctx.restore();
    
    updateHUD();

    requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }
}
window.addEventListener('resize', resizeCanvas);
