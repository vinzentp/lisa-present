const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Load Lisa's head image
const lisaHead = new Image();
lisaHead.src = 'images/lisa_head1.png';
let lisaHeadLoaded = false;
lisaHead.onload = () => {
    lisaHeadLoaded = true;
};

// Base design dimensions (original size)
const BASE_WIDTH = 800;
const BASE_HEIGHT = 400;

// Game settings - dynamic
let CANVAS_WIDTH = window.innerWidth;
let CANVAS_HEIGHT = window.innerHeight;
let SCALE = Math.min(CANVAS_WIDTH / BASE_WIDTH, CANVAS_HEIGHT / BASE_HEIGHT);
let GROUND_Y = CANVAS_HEIGHT - (80 * SCALE);
let PIXEL_SIZE = Math.max(4, Math.floor(4 * SCALE));
const SLOPE_ANGLE = 0.20;  // Slope steepness (rise/run) - 20% grade

// Get ground Y at a specific X position (for slope)
function getGroundYAtX(xPos) {
    return GROUND_Y - (CANVAS_WIDTH / 2 - xPos) * SLOPE_ANGLE;
}

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
    skier.x = 150 * SCALE;
    skier.y = getGroundYAtX(skier.x);
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
    trees: '#1B5E20',
    treeDark: '#0D3B0D',
    treeTrunk: '#5D4037',
    star: '#FFD700',
    ornamentRed: '#E53935',
    ornamentBlue: '#1E88E5',
    ornamentGold: '#FFC107',
    treeSnow: '#FFFFFF',
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
    y: getGroundYAtX(150 * SCALE),
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
    { x: 100, size: 70 },
    { x: 300, size: 85 },
    { x: 500, size: 65 },
    { x: 700, size: 80 },
    { x: 900, size: 75 },
    { x: 1100, size: 90 },
    { x: 1300, size: 72 },
    { x: 1500, size: 82 },
    { x: 1700, size: 68 },
    { x: 1900, size: 88 }
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
    const bodyHeight = 17;    // Body sprite rows (14) + skis (3)
    const headSize = 9;      // Size of Lisa's head in pixels
    const spriteHeight = bodyHeight + headSize;  // Total height
    const spriteWidth = 20;

    // Save canvas state for rotation
    ctx.save();

    // Translate to skier's foot position (pivot point for rotation)
    const pivotX = skier.x + (spriteWidth / 2) * s;
    const pivotY = skier.y;
    ctx.translate(pivotX, pivotY);

    // Rotate to match slope
    const slopeRadians = Math.atan(SLOPE_ANGLE);
    ctx.rotate(slopeRadians);

    // Offset for drawing body (relative to pivot)
    const x = -(spriteWidth / 2) * s;
    const y = -(bodyHeight * s);

    // Draw Lisa's head above the body
    if (lisaHeadLoaded) {
        const headDrawSize = headSize * s;
        const headX = x + (spriteWidth / 2 - headSize / 2) * s; // Centered
        const headY = y - headDrawSize; // Above body
        ctx.drawImage(lisaHead, headX, headY, headDrawSize, headDrawSize);
    }

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

    // Skier sprite - body only (head drawn separately with Lisa's image)
    // Facing right, leaning forward, poles behind (skis drawn separately)
    const sprite = [
        '........jJJd........',  // 0  collar
        '.......jJJJJd.......',  // 1  shoulders
        '......jJJJJJJd......',  // 2  upper body
        '.....VjJJJJJJdV.....',  // 3  body with arms
        '.....VdJJJJJJdV.....',  // 4  body with gloves
        '......dJJJJJJd......',  // 5  lower jacket
        '.......dJJJJd.......',  // 6  waist
        '........PPPP........',  // 7  upper pants
        '.......pPPPPp.......',  // 8  pants
        '......pPP..PPp......',  // 9  legs apart
        '......PP....PP......',  // 10 legs
        '.....BP......PB.....',  // 11 lower legs
        '.....BB......BB.....',  // 12 boots upper
        '.....BB......BB.....',  // 13 boots lower (connects to skis)
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

    // Draw ski bindings (connect boots to skis)
    // Left binding
    drawPixel(x, y, 5, 14, COLORS.boots);
    drawPixel(x, y, 6, 14, COLORS.boots);
    // Right binding
    drawPixel(x, y, 13, 14, COLORS.boots);
    drawPixel(x, y, 14, 14, COLORS.boots);

    // Draw long skis extending in front and behind
    const skiLength = 18;     // Length of ski in pixels
    const skiBackLength = 6;  // How far ski extends behind boot

    // Left ski (under left boot at col 5-6)
    const leftBootX = 5;
    // Ski tip (curved up at front)
    drawPixel(x, y, leftBootX - skiBackLength + skiLength + 2, 13, COLORS.skiTip);
    drawPixel(x, y, leftBootX - skiBackLength + skiLength + 1, 14, COLORS.skiTip);
    // Main ski body
    for (let i = 0; i < skiLength; i++) {
        const skiCol = leftBootX - skiBackLength + i;
        drawPixel(x, y, skiCol, 15, COLORS.skiTop);
        drawPixel(x, y, skiCol, 16, COLORS.skiBase);
    }
    // Ski tail
    drawPixel(x, y, leftBootX - skiBackLength - 1, 16, COLORS.skiBase);

    // Right ski (under right boot at col 13-14)
    const rightBootX = 13;
    // Ski tip (curved up at front)
    drawPixel(x, y, rightBootX - skiBackLength + skiLength + 2, 13, COLORS.skiTip);
    drawPixel(x, y, rightBootX - skiBackLength + skiLength + 1, 14, COLORS.skiTip);
    // Main ski body
    for (let i = 0; i < skiLength; i++) {
        const skiCol = rightBootX - skiBackLength + i;
        drawPixel(x, y, skiCol, 15, COLORS.skiTop);
        drawPixel(x, y, skiCol, 16, COLORS.skiBase);
    }
    // Ski tail
    drawPixel(x, y, rightBootX - skiBackLength - 1, 16, COLORS.skiBase);

    // Draw ski poles (angled behind the skier)
    // Left pole
    for (let i = 0; i < 14; i++) {
        drawPixel(x, y, 3 - Math.floor(i/3), 4 + i, COLORS.poles);
    }
    // Left pole grip
    drawPixel(x, y, 4, 3, COLORS.poleGrip);
    drawPixel(x, y, 4, 4, COLORS.poleGrip);

    // Right pole
    for (let i = 0; i < 14; i++) {
        drawPixel(x, y, 16 - Math.floor(i/3), 4 + i, COLORS.poles);
    }
    // Right pole grip
    drawPixel(x, y, 15, 3, COLORS.poleGrip);
    drawPixel(x, y, 15, 4, COLORS.poleGrip);

    // Update skier height for collision detection
    skier.height = spriteHeight * s / SCALE;

    // Restore canvas state after rotation
    ctx.restore();
}

// Draw mountains (parallax background)
function drawMountains() {
    const parallaxOffset = backgroundOffset * 0.3;
    const wrapWidth = CANVAS_WIDTH + 400 * SCALE;
    const slopeRadians = Math.atan(SLOPE_ANGLE);

    mountains.forEach(mountain => {
        const scaledX = mountain.x * SCALE;
        const scaledWidth = mountain.width * SCALE;
        const scaledHeight = mountain.height * SCALE;

        let mx = ((scaledX - parallaxOffset) % wrapWidth);
        if (mx < -scaledWidth) mx += wrapWidth;
        if (mx > CANVAS_WIDTH) mx -= wrapWidth;

        // Mountains sit on the ground line
        const baseY = getGroundYAtX(mx + scaledWidth / 2);

        // Save, translate and rotate to match slope
        ctx.save();
        ctx.translate(mx + scaledWidth / 2, baseY);
        ctx.rotate(slopeRadians);

        // Mountain body (drawn relative to rotated origin)
        ctx.fillStyle = COLORS.mountains;
        ctx.beginPath();
        ctx.moveTo(-scaledWidth / 2, 0);
        ctx.lineTo(0, -scaledHeight);
        ctx.lineTo(scaledWidth / 2, 0);
        ctx.closePath();
        ctx.fill();

        // Snow cap
        ctx.fillStyle = COLORS.mountainSnow;
        ctx.beginPath();
        ctx.moveTo(-20 * SCALE, -scaledHeight + 30 * SCALE);
        ctx.lineTo(0, -scaledHeight);
        ctx.lineTo(20 * SCALE, -scaledHeight + 30 * SCALE);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    });
}

// Draw trees (Christmas trees)
function drawTrees() {
    const wrapWidth = CANVAS_WIDTH + 600 * SCALE;

    trees.forEach((tree, index) => {
        const scaledX = tree.x * SCALE;
        const scaledSize = tree.size * SCALE;

        let tx = ((scaledX - backgroundOffset) % wrapWidth);
        if (tx < -scaledSize) tx += wrapWidth;
        if (tx > CANVAS_WIDTH) tx -= wrapWidth;

        // Trees sit on the ground line
        const baseY = getGroundYAtX(tx);
        const centerX = tx + scaledSize / 2;
        const treeHeight = scaledSize * 2;

        // Trunk
        const trunkWidth = 8 * SCALE;
        const trunkHeight = 14 * SCALE;
        drawPixelRect(centerX - trunkWidth / 2, baseY - trunkHeight, trunkWidth, trunkHeight, COLORS.treeTrunk);

        // Pointy tree layers (5 overlapping triangles)
        const layers = 5;
        for (let i = 0; i < layers; i++) {
            const layerProgress = i / layers;
            const layerWidth = scaledSize * (1 - layerProgress * 0.6);
            const layerHeight = treeHeight / layers + 8 * SCALE;
            const layerY = baseY - trunkHeight - (i * treeHeight / layers);

            // Main triangle
            ctx.fillStyle = COLORS.trees;
            ctx.beginPath();
            ctx.moveTo(centerX, layerY - layerHeight);
            ctx.lineTo(centerX - layerWidth / 2, layerY);
            ctx.lineTo(centerX + layerWidth / 2, layerY);
            ctx.closePath();
            ctx.fill();

            // Dark edge for depth
            ctx.fillStyle = COLORS.treeDark;
            ctx.beginPath();
            ctx.moveTo(centerX, layerY - layerHeight);
            ctx.lineTo(centerX - layerWidth / 2, layerY);
            ctx.lineTo(centerX - layerWidth / 3, layerY);
            ctx.closePath();
            ctx.fill();

            // Snow on branches
            if (i < layers - 1) {
                ctx.fillStyle = COLORS.treeSnow;
                const snowY = layerY - layerHeight * 0.3;
                ctx.beginPath();
                ctx.moveTo(centerX - layerWidth * 0.3, snowY);
                ctx.lineTo(centerX, layerY - layerHeight + 4 * SCALE);
                ctx.lineTo(centerX + layerWidth * 0.3, snowY);
                ctx.closePath();
                ctx.fill();
            }
        }

        // Star on top
        const starY = baseY - trunkHeight - treeHeight - 4 * SCALE;
        const starSize = 6 * SCALE;
        ctx.fillStyle = COLORS.star;
        // Draw star shape
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
            const r = i === 0 ? starSize : starSize;
            const px = centerX + Math.cos(angle) * starSize;
            const py = starY + Math.sin(angle) * starSize;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
            // Inner point
            const innerAngle = angle + Math.PI / 5;
            const ipx = centerX + Math.cos(innerAngle) * (starSize * 0.4);
            const ipy = starY + Math.sin(innerAngle) * (starSize * 0.4);
            ctx.lineTo(ipx, ipy);
        }
        ctx.closePath();
        ctx.fill();

        // Ornaments (baubles)
        const ornamentColors = [COLORS.ornamentRed, COLORS.ornamentBlue, COLORS.ornamentGold];
        const seed = index * 137; // Pseudo-random seed per tree
        for (let i = 0; i < 6; i++) {
            const layer = Math.floor(i / 2);
            const layerProgress = (layer + 1) / layers;
            const maxWidth = scaledSize * (1 - layerProgress * 0.5) * 0.4;
            const ornX = centerX + ((((seed + i * 73) % 100) / 50) - 1) * maxWidth;
            const ornY = baseY - trunkHeight - ((layer + 0.5) * treeHeight / layers);
            const ornSize = 3 * SCALE;

            ctx.fillStyle = ornamentColors[(seed + i) % 3];
            ctx.beginPath();
            ctx.arc(ornX, ornY, ornSize, 0, Math.PI * 2);
            ctx.fill();

            // Shine on ornament
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath();
            ctx.arc(ornX - ornSize * 0.3, ornY - ornSize * 0.3, ornSize * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

// Draw ground (sloped)
function drawGround() {
    // Draw sloped snow ground as a filled polygon
    ctx.fillStyle = COLORS.snow;
    ctx.beginPath();
    ctx.moveTo(0, getGroundYAtX(0));
    ctx.lineTo(CANVAS_WIDTH, getGroundYAtX(CANVAS_WIDTH));
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.lineTo(0, CANVAS_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Ground line with texture (sloped)
    for (let i = 0; i < CANVAS_WIDTH; i += PIXEL_SIZE * 2) {
        const groundYHere = getGroundYAtX(i);
        const offset = (i + backgroundOffset) % (PIXEL_SIZE * 4);
        const shade = offset < PIXEL_SIZE * 2 ? COLORS.groundLine : COLORS.ground;
        ctx.fillStyle = shade;
        ctx.fillRect(i, groundYHere, PIXEL_SIZE * 2, PIXEL_SIZE);
    }
}

// Update game state
function update() {
    // Update background scroll (scaled)
    backgroundOffset += BASE_SCROLL_SPEED * SCALE;

    // Get ground level at skier's position
    const groundAtSkier = getGroundYAtX(skier.x + 10 * SCALE);

    // Update skier physics
    if (skier.isJumping) {
        skier.velocityY += skier.gravity;
        skier.y += skier.velocityY;

        // Land on ground (slope)
        if (skier.y >= groundAtSkier) {
            skier.y = groundAtSkier;
            skier.velocityY = 0;
            skier.isJumping = false;
        }
    } else {
        // Keep skier on the slope when not jumping
        skier.y = groundAtSkier;
    }
}

// Draw title text in pixel art style
function drawTitle() {
    const title = "Lisa's Christmas Game";
    const fontSize = Math.floor(32 * SCALE);
    const padding = 20 * SCALE;

    // Set pixel art font style
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';

    const x = CANVAS_WIDTH - padding;
    const y = padding;

    // Draw pixel shadow layers for depth
    ctx.fillStyle = '#1A1A2E';
    ctx.fillText(title, x + 4 * SCALE, y + 4 * SCALE);

    // Dark green outline
    ctx.fillStyle = '#0D3B0D';
    for (let ox = -2; ox <= 2; ox++) {
        for (let oy = -2; oy <= 2; oy++) {
            if (ox !== 0 || oy !== 0) {
                ctx.fillText(title, x + ox * SCALE, y + oy * SCALE);
            }
        }
    }

    // Red and green gradient effect (alternating letters)
    const letters = title.split('');
    let currentX = x;

    // Measure total width first
    const totalWidth = ctx.measureText(title).width;
    currentX = x - totalWidth;

    letters.forEach((letter, i) => {
        // Alternate between Christmas colors
        if (i % 2 === 0) {
            ctx.fillStyle = '#E53935'; // Red
        } else {
            ctx.fillStyle = '#2E7D32'; // Green
        }

        // Special gold for apostrophe and capital letters
        if (letter === "'" || letter === 'L' || letter === 'C' || letter === 'G') {
            ctx.fillStyle = '#FFD700'; // Gold
        }

        ctx.textAlign = 'left';
        ctx.fillText(letter, currentX, y);
        currentX += ctx.measureText(letter).width;
    });

    // Add snow decoration on top
    ctx.fillStyle = '#FFFFFF';
    const snowY = y - 2 * SCALE;
    for (let i = 0; i < 8; i++) {
        const snowX = x - totalWidth + (i * totalWidth / 7);
        const snowSize = (2 + (i % 3)) * SCALE;
        ctx.beginPath();
        ctx.arc(snowX, snowY + Math.sin(i * 0.8) * 3 * SCALE, snowSize, 0, Math.PI * 2);
        ctx.fill();
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

    // Draw title
    drawTitle();
}

// Game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop();
