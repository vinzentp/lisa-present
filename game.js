const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Base design dimensions (original size)
const BASE_WIDTH = 800;
const BASE_HEIGHT = 400;

// Game settings - dynamic
let CANVAS_WIDTH = window.innerWidth;
let CANVAS_HEIGHT = window.innerHeight;
let SCALE = Math.min(CANVAS_WIDTH / BASE_WIDTH, CANVAS_HEIGHT / BASE_HEIGHT);
let GROUND_Y = CANVAS_HEIGHT - (80 * SCALE);
let PIXEL_SIZE = Math.max(4, Math.floor(4 * SCALE));

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Handle window resize
function resizeCanvas() {
    CANVAS_WIDTH = window.innerWidth;
    CANVAS_HEIGHT = window.innerHeight;
    SCALE = Math.min(CANVAS_WIDTH / BASE_WIDTH, CANVAS_HEIGHT / BASE_HEIGHT);
    GROUND_Y = CANVAS_HEIGHT - (80 * SCALE);
    PIXEL_SIZE = Math.max(4, Math.floor(4 * SCALE));
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Update skier for new scale
    skier.y = GROUND_Y;
    skier.width = 20 * PIXEL_SIZE;
    skier.height = 22 * PIXEL_SIZE;
    skier.jumpPower = -12 * SCALE;
    skier.gravity = 0.5 * SCALE;
}

window.addEventListener('resize', resizeCanvas);

// Colors (pixel art palette)
const COLORS = {
    sky: '#87CEEB',
    snow: '#FFFFFF',
    ground: '#E8E8E8',
    groundLine: '#CCCCCC',
    trees: '#228B22',
    treeTrunk: '#8B4513',
    mountains: '#A0A0A0',
    mountainSnow: '#FFFFFF',
    // Skier colors
    helmet: '#E63946',
    helmetShine: '#FF6B6B',
    goggles: '#1D3557',
    goggleLens: '#A8DADC',
    skin: '#FDBF6F',
    jacket: '#457B9D',
    jacketLight: '#6BA3C7',
    jacketDark: '#2C5A7A',
    pants: '#2B2D42',
    pantsLight: '#3D3F5A',
    boots: '#1A1A2E',
    gloves: '#E63946',
    poles: '#C0C0C0',
    poleGrip: '#2B2D42',
    skiBase: '#F1FAEE',
    skiTop: '#E63946',
    skiTip: '#1D3557'
};

// Skier state
const skier = {
    x: 150 * SCALE,
    y: CANVAS_HEIGHT - (80 * SCALE),
    width: 20 * PIXEL_SIZE,
    height: 22 * PIXEL_SIZE,
    velocityY: 0,
    isJumping: false,
    jumpPower: -12 * SCALE,
    gravity: 0.5 * SCALE
};

// Background elements
let backgroundOffset = 0;
const BASE_SCROLL_SPEED = 5;

// Mountains (parallax - slower) - base values, will be scaled when drawing
const mountains = [
    { x: 0, width: 200, height: 120 },
    { x: 250, width: 180, height: 100 },
    { x: 500, width: 220, height: 140 },
    { x: 750, width: 190, height: 110 },
    { x: 1000, width: 210, height: 130 },
    { x: 1300, width: 185, height: 105 }
];

// Trees (move with ground) - base values, will be scaled when drawing
const trees = [
    { x: 100, size: 40 },
    { x: 300, size: 50 },
    { x: 500, size: 35 },
    { x: 700, size: 45 },
    { x: 900, size: 40 },
    { x: 1100, size: 55 },
    { x: 1300, size: 42 },
    { x: 1500, size: 48 },
    { x: 1700, size: 38 },
    { x: 1900, size: 52 }
];

// Input handling
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        if (!skier.isJumping) {
            skier.velocityY = skier.jumpPower;
            skier.isJumping = true;
        }
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Draw pixelated rectangle
function drawPixelRect(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(
        Math.floor(x / PIXEL_SIZE) * PIXEL_SIZE,
        Math.floor(y / PIXEL_SIZE) * PIXEL_SIZE,
        Math.floor(width / PIXEL_SIZE) * PIXEL_SIZE,
        Math.floor(height / PIXEL_SIZE) * PIXEL_SIZE
    );
}

// Draw a single pixel (scaled)
function drawPixel(baseX, baseY, px, py, color) {
    const size = PIXEL_SIZE;
    ctx.fillStyle = color;
    ctx.fillRect(baseX + px * size, baseY + py * size, size, size);
}

// Draw the skier (pixel art style) - detailed sprite
function drawSkier() {
    const s = PIXEL_SIZE;
    const spriteHeight = 22;  // Total height including skis
    const x = skier.x;
    const y = skier.y - (spriteHeight * s);

    // Color mapping for sprite
    const C = {
        'H': COLORS.helmet,
        'h': COLORS.helmetShine,
        'G': COLORS.goggles,
        'g': COLORS.goggleLens,
        'F': COLORS.skin,
        'J': COLORS.jacket,
        'j': COLORS.jacketLight,
        'd': COLORS.jacketDark,
        'P': COLORS.pants,
        'p': COLORS.pantsLight,
        'B': COLORS.boots,
        'V': COLORS.gloves,
        'L': COLORS.poles,
        'l': COLORS.poleGrip,
        'S': COLORS.skiTop,
        's': COLORS.skiBase,
        'T': COLORS.skiTip,
        '.': null // transparent
    };

    // Skier sprite - crouched skiing pose (19 rows x 20 cols)
    // Facing right, leaning forward, poles behind (skis drawn separately)
    const sprite = [
        '........hHHH........',  // 0  helmet top
        '.......hHHHHH.......',  // 1  helmet
        '.......HHHHHHH......',  // 2  helmet
        '.......GGggGG.......',  // 3  goggles
        '........FFFF........',  // 4  face
        '.........FF.........',  // 5  chin
        '........jJJd........',  // 6  collar
        '.......jJJJJd.......',  // 7  shoulders
        '......jJJJJJJd......',  // 8  upper body
        '.....VjJJJJJJdV.....',  // 9  body with arms
        '.....VdJJJJJJdV.....',  // 10 body with gloves
        '......dJJJJJJd......',  // 11 lower jacket
        '.......dJJJJd.......',  // 12 waist
        '........PPPP........',  // 13 upper pants
        '.......pPPPPp.......',  // 14 pants
        '......pPP..PPp......',  // 15 legs apart
        '......PP....PP......',  // 16 legs
        '.....BP......PB.....',  // 17 lower legs
        '.....BB......BB.....',  // 18 boots
    ];

    // Draw the sprite
    for (let row = 0; row < sprite.length; row++) {
        for (let col = 0; col < sprite[row].length; col++) {
            const char = sprite[row][col];
            const color = C[char];
            if (color) {
                drawPixel(x, y, col, row, color);
            }
        }
    }

    // Draw long skis extending in front and behind
    const skiY = y + 19 * s;  // Just below boots
    const skiLength = 18;     // Length of ski in pixels
    const skiBackLength = 6;  // How far ski extends behind boot

    // Left ski (under left boot at col 5-6)
    const leftBootX = 5;
    // Ski tip (curved up at front)
    drawPixel(x, y, leftBootX - skiBackLength + skiLength + 2, 18, COLORS.skiTip);
    drawPixel(x, y, leftBootX - skiBackLength + skiLength + 1, 19, COLORS.skiTip);
    // Main ski body
    for (let i = 0; i < skiLength; i++) {
        const skiCol = leftBootX - skiBackLength + i;
        drawPixel(x, y, skiCol, 20, COLORS.skiTop);
        drawPixel(x, y, skiCol, 21, COLORS.skiBase);
    }
    // Ski tail
    drawPixel(x, y, leftBootX - skiBackLength - 1, 21, COLORS.skiBase);

    // Right ski (under right boot at col 13-14)
    const rightBootX = 13;
    // Ski tip (curved up at front)
    drawPixel(x, y, rightBootX - skiBackLength + skiLength + 2, 18, COLORS.skiTip);
    drawPixel(x, y, rightBootX - skiBackLength + skiLength + 1, 19, COLORS.skiTip);
    // Main ski body
    for (let i = 0; i < skiLength; i++) {
        const skiCol = rightBootX - skiBackLength + i;
        drawPixel(x, y, skiCol, 20, COLORS.skiTop);
        drawPixel(x, y, skiCol, 21, COLORS.skiBase);
    }
    // Ski tail
    drawPixel(x, y, rightBootX - skiBackLength - 1, 21, COLORS.skiBase);

    // Draw ski poles (angled behind the skier)
    // Left pole
    for (let i = 0; i < 14; i++) {
        drawPixel(x, y, 3 - Math.floor(i/3), 10 + i, COLORS.poles);
    }
    // Left pole grip
    drawPixel(x, y, 4, 9, COLORS.poleGrip);
    drawPixel(x, y, 4, 10, COLORS.poleGrip);

    // Right pole
    for (let i = 0; i < 14; i++) {
        drawPixel(x, y, 16 - Math.floor(i/3), 10 + i, COLORS.poles);
    }
    // Right pole grip
    drawPixel(x, y, 15, 9, COLORS.poleGrip);
    drawPixel(x, y, 15, 10, COLORS.poleGrip);

    // Update skier height for collision detection
    skier.height = spriteHeight * s / SCALE;
}

// Draw mountains (parallax background)
function drawMountains() {
    const parallaxOffset = backgroundOffset * 0.3;
    const wrapWidth = CANVAS_WIDTH + 400 * SCALE;

    mountains.forEach(mountain => {
        const scaledX = mountain.x * SCALE;
        const scaledWidth = mountain.width * SCALE;
        const scaledHeight = mountain.height * SCALE;

        let mx = ((scaledX - parallaxOffset) % wrapWidth);
        if (mx < -scaledWidth) mx += wrapWidth;
        if (mx > CANVAS_WIDTH) mx -= wrapWidth;

        const baseY = GROUND_Y - 50 * SCALE;

        // Mountain body
        ctx.fillStyle = COLORS.mountains;
        ctx.beginPath();
        ctx.moveTo(mx, baseY);
        ctx.lineTo(mx + scaledWidth / 2, baseY - scaledHeight);
        ctx.lineTo(mx + scaledWidth, baseY);
        ctx.closePath();
        ctx.fill();

        // Snow cap
        ctx.fillStyle = COLORS.mountainSnow;
        ctx.beginPath();
        ctx.moveTo(mx + scaledWidth / 2 - 20 * SCALE, baseY - scaledHeight + 30 * SCALE);
        ctx.lineTo(mx + scaledWidth / 2, baseY - scaledHeight);
        ctx.lineTo(mx + scaledWidth / 2 + 20 * SCALE, baseY - scaledHeight + 30 * SCALE);
        ctx.closePath();
        ctx.fill();
    });
}

// Draw trees
function drawTrees() {
    const wrapWidth = CANVAS_WIDTH + 600 * SCALE;

    trees.forEach(tree => {
        const scaledX = tree.x * SCALE;
        const scaledSize = tree.size * SCALE;

        let tx = ((scaledX - backgroundOffset) % wrapWidth);
        if (tx < -scaledSize) tx += wrapWidth;
        if (tx > CANVAS_WIDTH) tx -= wrapWidth;

        const baseY = GROUND_Y - 50 * SCALE;

        // Trunk
        drawPixelRect(tx + scaledSize / 2 - 4 * SCALE, baseY - 12 * SCALE, 8 * SCALE, 16 * SCALE, COLORS.treeTrunk);

        // Tree layers (pixel triangle)
        for (let i = 0; i < 3; i++) {
            const layerWidth = scaledSize - i * 8 * SCALE;
            const layerHeight = 16 * SCALE;
            const layerY = baseY - 20 * SCALE - i * 12 * SCALE;
            drawPixelRect(tx + scaledSize / 2 - layerWidth / 2, layerY, layerWidth, layerHeight, COLORS.trees);
        }
    });
}

// Draw ground
function drawGround() {
    // Snow ground
    drawPixelRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y, COLORS.snow);

    // Ground line with texture
    for (let i = 0; i < CANVAS_WIDTH; i += PIXEL_SIZE * 2) {
        const offset = (i + backgroundOffset) % (PIXEL_SIZE * 4);
        const shade = offset < PIXEL_SIZE * 2 ? COLORS.groundLine : COLORS.ground;
        drawPixelRect(i, GROUND_Y, PIXEL_SIZE * 2, PIXEL_SIZE, shade);
    }
}

// Update game state
function update() {
    // Update background scroll (scaled)
    backgroundOffset += BASE_SCROLL_SPEED * SCALE;

    // Update skier physics
    if (skier.isJumping) {
        skier.velocityY += skier.gravity;
        skier.y += skier.velocityY;

        // Land on ground
        if (skier.y >= GROUND_Y) {
            skier.y = GROUND_Y;
            skier.velocityY = 0;
            skier.isJumping = false;
        }
    }
}

// Render game
function render() {
    // Clear canvas with sky color
    ctx.fillStyle = COLORS.sky;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw background elements
    drawMountains();
    drawTrees();
    drawGround();

    // Draw skier
    drawSkier();
}

// Game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop();
