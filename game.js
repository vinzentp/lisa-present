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
    skier.jumpPower = -7 * SCALE;
    skier.gravity = 0.25 * SCALE;
}

window.addEventListener('resize', resizeCanvas);

// Present state
let presentVisible = false;
let presentX = 0;

// Game end state
let gameWon = false;
let winAnimationStart = 0;
let gameOver = false;
let gameOverStart = 0;
let skierOnObstacle = false;

// Speed boost state (fart boost!)
let isBoosting = false;
let boostStartTime = 0;
const BOOST_DURATION = 800; // 0.8 seconds of boost
const BOOST_COOLDOWN = 5000; // 5 seconds cooldown
let lastBoostTime = -BOOST_COOLDOWN;
let lastDKeyPress = 0;
const DOUBLE_TAP_THRESHOLD = 300; // ms between taps to count as double-tap
let fartClouds = [];

// ============================================
// OBSTACLES SYSTEM
// Add your obstacle image filenames here!
// Place the image in the /obstacles folder and configure below
// ============================================
const OBSTACLE_FILES = [
    { file: 'couch.png', size: 2.0, rotation: 15 },
    { file: 'lisa.png', size: 2.0, rotation: 20 },
    { file: 'curry.png', size: 1.0, rotation: 15 },
    { file: 'weizen.png', size: 1.0, rotation: 15 },

    // Example:
    // { file: 'rock.png', size: 1.0, rotation: 0 },
    // { file: 'snowman.png', size: 1.5, rotation: 0 },
    // { file: 'sign.png', size: 0.8, rotation: -15 },
    //
    // Parameters:
    //   file: filename in /obstacles folder
    //   size: size multiplier (1.0 = normal, 2.0 = double, 0.5 = half)
    //   rotation: rotation in degrees (positive = clockwise)
];

// Obstacle settings
const OBSTACLE_BASE_SIZE = 60; // Base size in pixels (will be scaled)
const OBSTACLE_SPACING_MIN = 600; // Minimum distance between obstacles
const OBSTACLE_SPACING_MAX = 1200; // Maximum distance between obstacles

// Load obstacle images
const obstacleData = [];
let obstaclesLoaded = 0;

OBSTACLE_FILES.forEach((obstacle, index) => {
    const img = new Image();
    img.src = `obstacles/${obstacle.file}`;
    img.onload = () => {
        obstaclesLoaded++;
    };
    obstacleData.push({
        image: img,
        size: obstacle.size || 1.0,
        rotation: obstacle.rotation || 0
    });
});

// Active obstacles in the game
let obstacles = [];
let nextObstacleDistance = OBSTACLE_SPACING_MIN + Math.random() * (OBSTACLE_SPACING_MAX - OBSTACLE_SPACING_MIN);

// Spawn a new obstacle
function spawnObstacle() {
    if (obstacleData.length === 0) return;

    const randomObstacle = obstacleData[Math.floor(Math.random() * obstacleData.length)];
    const size = OBSTACLE_BASE_SIZE * SCALE * randomObstacle.size;

    obstacles.push({
        x: CANVAS_WIDTH + size,
        image: randomObstacle.image,
        size: size,
        rotation: randomObstacle.rotation
    });

    nextObstacleDistance = OBSTACLE_SPACING_MIN + Math.random() * (OBSTACLE_SPACING_MAX - OBSTACLE_SPACING_MIN);
}

// Check collision between skier and obstacles
function checkCollisions() {
    if (gameWon || gameOver) return;

    const s = PIXEL_SIZE;
    const spriteWidth = 20;
    const bodyHeight = 17;

    // Skier hitbox (smaller than visual for fair gameplay)
    const skierLeft = skier.x + 4 * s;
    const skierRight = skier.x + (spriteWidth - 4) * s;
    const skierBottom = skier.y;
    const skierTop = skier.y - bodyHeight * s;

    for (const obstacle of obstacles) {
        const groundY = getGroundYAtX(obstacle.x);
        const img = obstacle.image;
        const aspectRatio = img.naturalWidth / img.naturalHeight || 1;

        let drawWidth, drawHeight;
        if (aspectRatio >= 1) {
            drawWidth = obstacle.size;
            drawHeight = obstacle.size / aspectRatio;
        } else {
            drawHeight = obstacle.size;
            drawWidth = obstacle.size * aspectRatio;
        }

        // Obstacle hitbox (centered on ground)
        const obstacleLeft = obstacle.x - drawWidth / 2;
        const obstacleRight = obstacle.x + drawWidth / 2;
        const obstacleTop = groundY - drawHeight;
        const obstacleBottom = groundY;

        // Check horizontal overlap
        const horizontalOverlap = skierRight > obstacleLeft && skierLeft < obstacleRight;

        // Check if skier is at obstacle height
        const verticalOverlap = skierBottom > obstacleTop && skierTop < obstacleBottom;

        if (horizontalOverlap && verticalOverlap) {
            // Check if skier jumped high enough to clear the obstacle
            const clearanceHeight = obstacleTop + drawHeight * 0.3; // Need to clear 70% of obstacle height

            if (skierBottom <= clearanceHeight) {
                // Successfully jumping over!
                continue;
            } else {
                // Collision - game over!
                gameOver = true;
                gameOverStart = Date.now();
                return;
            }
        }
    }
}

// Update obstacles
function updateObstacles(speedMultiplier = 1.0) {
    if (gameWon || gameOver) return;

    // Move obstacles with background
    obstacles.forEach(obstacle => {
        obstacle.x -= BASE_SCROLL_SPEED * SCALE * speedMultiplier;
    });

    // Remove off-screen obstacles
    obstacles = obstacles.filter(obstacle => obstacle.x > -obstacle.size);

    // Spawn new obstacles based on distance traveled
    if (obstacleData.length > 0) {
        const distanceInPixels = distanceTraveled * PIXELS_PER_METER * SCALE;
        if (distanceInPixels > nextObstacleDistance) {
            spawnObstacle();
            nextObstacleDistance = distanceInPixels + OBSTACLE_SPACING_MIN + Math.random() * (OBSTACLE_SPACING_MAX - OBSTACLE_SPACING_MIN);
        }
    }

    // Check for collisions with obstacles
    checkCollisions();
}

// Draw obstacles
function drawObstacles() {
    obstacles.forEach(obstacle => {
        const groundY = getGroundYAtX(obstacle.x);
        const drawX = obstacle.x;

        // Calculate dimensions maintaining aspect ratio
        const img = obstacle.image;
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        let drawWidth, drawHeight;

        if (aspectRatio >= 1) {
            // Wider than tall
            drawWidth = obstacle.size;
            drawHeight = obstacle.size / aspectRatio;
        } else {
            // Taller than wide
            drawHeight = obstacle.size;
            drawWidth = obstacle.size * aspectRatio;
        }

        const drawY = groundY - drawHeight / 2;

        ctx.save();

        // Move to obstacle center and rotate
        ctx.translate(drawX, drawY);
        ctx.rotate(obstacle.rotation * Math.PI / 180);

        // Draw image centered, maintaining aspect ratio
        ctx.drawImage(
            img,
            -drawWidth / 2,
            -drawHeight / 2,
            drawWidth,
            drawHeight
        );

        ctx.restore();
    });
}

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
    skiTip: '#1D3557',
    // Present colors
    presentRed: '#C41E3A',
    presentRedDark: '#8B0000',
    presentRedLight: '#FF4444',
    ribbon: '#FFD700',
    ribbonDark: '#DAA520'
};

// Skier state
const skier = {
    x: 150 * SCALE,
    y: getGroundYAtX(150 * SCALE),
    width: 20 * PIXEL_SIZE,
    height: 22 * PIXEL_SIZE,
    velocityY: 0,
    isJumping: false,
    jumpPower: -7 * SCALE,
    gravity: 0.25 * SCALE
};

// Background elements
let backgroundOffset = 0;
const BASE_SCROLL_SPEED = 5;

// Distance tracking (in meters)
const TOTAL_DISTANCE = 3000; // Total distance to the present in meters
const PIXELS_PER_METER = 10; // How many pixels equal one meter
let distanceTraveled = 0;

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

// Restart game function
function restartGame() {
    gameOver = false;
    gameOverStart = 0;
    backgroundOffset = 0;
    distanceTraveled = 0;
    obstacles = [];
    nextObstacleDistance = OBSTACLE_SPACING_MIN + Math.random() * (OBSTACLE_SPACING_MAX - OBSTACLE_SPACING_MIN);
    presentVisible = false;
    presentX = 0;
    skier.x = 150 * SCALE;
    skier.y = getGroundYAtX(skier.x);
    skier.velocityY = 0;
    skier.isJumping = false;
    skierOnObstacle = false;
    // Reset boost state
    isBoosting = false;
    boostStartTime = 0;
    lastBoostTime = -BOOST_COOLDOWN;
    lastDKeyPress = 0;
    fartClouds = [];
}

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    // Restart game on space when game over
    if (e.code === 'Space' && gameOver) {
        restartGame();
        return;
    }

    if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        // Can jump if: not game over AND (not jumping OR currently on an obstacle)
        const canJump = !gameOver && (!skier.isJumping || skierOnObstacle);
        if (canJump) {
            skier.velocityY = skier.jumpPower;
            skier.isJumping = true;
            skierOnObstacle = false; // Leaving the obstacle
        }
    }

    // Double-tap 'D' for speed boost (fart boost!)
    if (e.code === 'KeyD' && !gameOver && !gameWon) {
        const now = Date.now();
        const timeSinceLastPress = now - lastDKeyPress;

        if (timeSinceLastPress < DOUBLE_TAP_THRESHOLD) {
            // Double-tap detected!
            const timeSinceLastBoost = now - lastBoostTime;
            if (timeSinceLastBoost >= BOOST_COOLDOWN) {
                // Activate boost!
                isBoosting = true;
                boostStartTime = now;
                lastBoostTime = now;

                // Create fart clouds (close to the butt!)
                for (let i = 0; i < 10; i++) {
                    fartClouds.push({
                        x: skier.x - (5 + Math.random() * 10) * SCALE,
                        y: skier.y - (25 + Math.random() * 15) * SCALE,
                        size: (10 + Math.random() * 12) * SCALE,
                        velocityX: -(0.3 + Math.random() * 0.5) * SCALE,
                        velocityY: (Math.random() - 0.5) * 0.3 * SCALE,
                        opacity: 1,
                        lifetime: 0
                    });
                }
            }
        }
        lastDKeyPress = now;
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

// Draw fart clouds (speed boost effect!)
function drawFartClouds() {
    fartClouds.forEach(cloud => {
        ctx.save();
        ctx.globalAlpha = cloud.opacity;

        // Draw multiple overlapping circles for cloud effect
        const cloudColors = ['#7CB342', '#9CCC65', '#AED581']; // Green fart colors

        for (let i = 0; i < 3; i++) {
            const offsetX = (Math.random() - 0.5) * cloud.size * 0.3;
            const offsetY = (Math.random() - 0.5) * cloud.size * 0.3;
            const circleSize = cloud.size * (0.7 + Math.random() * 0.3);

            ctx.fillStyle = cloudColors[i % cloudColors.length];
            ctx.beginPath();
            ctx.arc(cloud.x + offsetX, cloud.y + offsetY, circleSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    });
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

        // Trees sit on the ground line (offset down to align with snow)
        const baseY = getGroundYAtX(tx) + 12 * SCALE;
        // Round centerX to prevent trunk flickering
        const centerX = Math.round(tx + scaledSize / 2);
        const treeHeight = scaledSize * 2;

        // Trunk (use fillRect directly to avoid pixel snapping issues)
        const trunkWidth = 8 * SCALE;
        const trunkHeight = 14 * SCALE;
        ctx.fillStyle = COLORS.treeTrunk;
        ctx.fillRect(Math.round(centerX - trunkWidth / 2), Math.round(baseY - trunkHeight), Math.round(trunkWidth), Math.round(trunkHeight));

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
    // Don't update if game is won or over
    if (gameWon || gameOver) return;

    // Check boost state
    const now = Date.now();
    if (isBoosting && now - boostStartTime > BOOST_DURATION) {
        isBoosting = false;
    }

    // Apply speed boost multiplier
    const speedMultiplier = isBoosting ? 2.5 : 1.0;

    // Update background scroll (scaled) with boost
    backgroundOffset += BASE_SCROLL_SPEED * SCALE * speedMultiplier;

    // Update distance traveled
    distanceTraveled = Math.min(backgroundOffset / (PIXELS_PER_METER * SCALE), TOTAL_DISTANCE);

    // Update fart clouds
    fartClouds = fartClouds.filter(cloud => {
        cloud.lifetime += 16; // Assuming ~60fps
        cloud.x += cloud.velocityX;
        cloud.y += cloud.velocityY;
        cloud.opacity = Math.max(0, 1 - cloud.lifetime / 800);
        cloud.size *= 1.02; // Grow slightly
        return cloud.lifetime < 800; // Remove after 800ms
    });

    // Show present when approaching the end
    if (distanceTraveled >= TOTAL_DISTANCE * 0.9 && !presentVisible) {
        presentVisible = true;
        presentX = CANVAS_WIDTH + 300 * SCALE; // Start off-screen to the right
    }

    // Move present towards skier (scrolls with background)
    if (presentVisible) {
        presentX -= BASE_SCROLL_SPEED * SCALE * speedMultiplier;

        // Check collision with present
        const presentSize = 200 * SCALE;
        const skierRight = skier.x + skier.width;
        const presentLeft = presentX - presentSize / 2;

        if (skierRight >= presentLeft && skier.x <= presentX + presentSize / 2) {
            gameWon = true;
            winAnimationStart = Date.now();
        }
    }

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

    // Update obstacles
    updateObstacles(speedMultiplier);
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

// Draw the huge present box
function drawPresent() {
    if (!presentVisible) return;

    const presentSize = 200 * SCALE;
    const groundY = getGroundYAtX(presentX);
    const x = presentX - presentSize / 2;
    const y = groundY - presentSize;

    // Main box body
    ctx.fillStyle = COLORS.presentRed;
    ctx.fillRect(x, y, presentSize, presentSize);

    // Dark side for 3D effect
    ctx.fillStyle = COLORS.presentRedDark;
    ctx.fillRect(x, y, presentSize * 0.1, presentSize);

    // Light top for 3D effect
    ctx.fillStyle = COLORS.presentRedLight;
    ctx.fillRect(x, y, presentSize, presentSize * 0.1);

    // Vertical ribbon
    const ribbonWidth = presentSize * 0.15;
    ctx.fillStyle = COLORS.ribbon;
    ctx.fillRect(x + presentSize / 2 - ribbonWidth / 2, y, ribbonWidth, presentSize);

    // Ribbon shadow
    ctx.fillStyle = COLORS.ribbonDark;
    ctx.fillRect(x + presentSize / 2 - ribbonWidth / 2, y, ribbonWidth * 0.2, presentSize);

    // Horizontal ribbon
    ctx.fillStyle = COLORS.ribbon;
    ctx.fillRect(x, y + presentSize / 2 - ribbonWidth / 2, presentSize, ribbonWidth);

    // Horizontal ribbon shadow
    ctx.fillStyle = COLORS.ribbonDark;
    ctx.fillRect(x, y + presentSize / 2 - ribbonWidth / 2, presentSize, ribbonWidth * 0.2);

    // Bow on top
    const bowSize = presentSize * 0.3;
    const bowX = x + presentSize / 2;
    const bowY = y - bowSize * 0.3;

    // Bow loops
    ctx.fillStyle = COLORS.ribbon;
    ctx.beginPath();
    ctx.ellipse(bowX - bowSize * 0.4, bowY, bowSize * 0.4, bowSize * 0.25, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(bowX + bowSize * 0.4, bowY, bowSize * 0.4, bowSize * 0.25, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Bow center knot
    ctx.fillStyle = COLORS.ribbonDark;
    ctx.beginPath();
    ctx.arc(bowX, bowY + bowSize * 0.1, bowSize * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.ribbon;
    ctx.beginPath();
    ctx.arc(bowX, bowY + bowSize * 0.1, bowSize * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Bow tails
    ctx.fillStyle = COLORS.ribbon;
    ctx.beginPath();
    ctx.moveTo(bowX - bowSize * 0.15, bowY + bowSize * 0.2);
    ctx.lineTo(bowX - bowSize * 0.4, bowY + bowSize * 0.6);
    ctx.lineTo(bowX - bowSize * 0.2, bowY + bowSize * 0.5);
    ctx.lineTo(bowX, bowY + bowSize * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bowX + bowSize * 0.15, bowY + bowSize * 0.2);
    ctx.lineTo(bowX + bowSize * 0.4, bowY + bowSize * 0.6);
    ctx.lineTo(bowX + bowSize * 0.2, bowY + bowSize * 0.5);
    ctx.lineTo(bowX, bowY + bowSize * 0.25);
    ctx.closePath();
    ctx.fill();

    // Sparkle effects
    ctx.fillStyle = '#FFFFFF';
    const sparkleTime = Date.now() / 200;
    for (let i = 0; i < 5; i++) {
        const sparkleX = x + presentSize * 0.2 + (i * presentSize * 0.15);
        const sparkleY = y + presentSize * 0.2 + Math.sin(sparkleTime + i) * 10 * SCALE;
        const sparkleSize = (3 + Math.sin(sparkleTime + i * 2)) * SCALE;
        ctx.beginPath();
        ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Draw game over screen
function drawGameOverScreen() {
    const elapsed = Date.now() - gameOverStart;
    const fadeIn = Math.min(1, elapsed / 500);

    // Semi-transparent overlay
    ctx.fillStyle = `rgba(139, 0, 0, ${fadeIn * 0.85})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (elapsed < 300) return;

    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;

    // Title: "GAME OVER"
    const titleSize = Math.floor(48 * SCALE);
    ctx.font = `bold ${titleSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Shake effect
    const shake = elapsed < 800 ? Math.sin(elapsed / 30) * 5 * SCALE : 0;

    // Title shadow
    ctx.fillStyle = '#000000';
    ctx.fillText("💥 GAME OVER 💥", centerX + 3 * SCALE + shake, centerY - 40 * SCALE + 3 * SCALE);

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText("💥 GAME OVER 💥", centerX + shake, centerY - 40 * SCALE);

    // Subtitle
    if (elapsed > 600) {
        const subAlpha = Math.min(1, (elapsed - 600) / 400);
        ctx.globalAlpha = subAlpha;

        const subSize = Math.floor(24 * SCALE);
        ctx.font = `bold ${subSize}px monospace`;
        ctx.fillStyle = '#FFD700';
        ctx.fillText("Du hast ein Hindernis getroffen!", centerX, centerY + 20 * SCALE);

        // Distance traveled
        ctx.font = `bold ${Math.floor(18 * SCALE)}px monospace`;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`Geschaffte Distanz: ${Math.floor(distanceTraveled)}m von ${TOTAL_DISTANCE}m`, centerX, centerY + 60 * SCALE);

        ctx.globalAlpha = 1;
    }

    // Restart hint
    if (elapsed > 1200) {
        const hintAlpha = 0.5 + Math.sin(elapsed / 300) * 0.5;
        ctx.globalAlpha = hintAlpha;

        const hintSize = Math.floor(20 * SCALE);
        ctx.font = `bold ${hintSize}px monospace`;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText("Drücke LEERTASTE zum Neustarten", centerX, centerY + 120 * SCALE);

        ctx.globalAlpha = 1;
    }
}

// Draw the win screen with gift reveal
function drawWinScreen() {
    const elapsed = Date.now() - winAnimationStart;
    const fadeIn = Math.min(1, elapsed / 1000);

    // Semi-transparent overlay
    ctx.fillStyle = `rgba(26, 26, 46, ${fadeIn * 0.85})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Animated snowflakes in background
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 50; i++) {
        const snowX = (Math.sin(elapsed / 1000 + i * 0.5) * 0.5 + 0.5) * CANVAS_WIDTH;
        const snowY = ((elapsed / 20 + i * 50) % CANVAS_HEIGHT);
        const snowSize = (2 + (i % 3)) * SCALE;
        ctx.globalAlpha = fadeIn * 0.7;
        ctx.beginPath();
        ctx.arc(snowX, snowY, snowSize, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (elapsed < 500) return; // Wait before showing text

    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;

    // Draw decorative present icons on sides
    const miniPresentSize = 30 * SCALE;
    const sideOffset = 200 * SCALE;
    for (let side = -1; side <= 1; side += 2) {
        const px = centerX + side * sideOffset;
        const py = centerY - 20 * SCALE + Math.sin(elapsed / 300 + side) * 8 * SCALE;

        ctx.fillStyle = COLORS.presentRed;
        ctx.fillRect(px - miniPresentSize/2, py - miniPresentSize/2, miniPresentSize, miniPresentSize);
        ctx.fillStyle = COLORS.ribbon;
        ctx.fillRect(px - miniPresentSize * 0.1, py - miniPresentSize/2, miniPresentSize * 0.2, miniPresentSize);
        ctx.fillRect(px - miniPresentSize/2, py - miniPresentSize * 0.1, miniPresentSize, miniPresentSize * 0.2);

        // Mini bow
        ctx.beginPath();
        ctx.arc(px, py - miniPresentSize/2 - 4 * SCALE, 6 * SCALE, 0, Math.PI * 2);
        ctx.fill();
    }

    // Title: "FROHE WEIHNACHTEN!"
    const titleSize = Math.floor(32 * SCALE);
    ctx.font = `bold ${titleSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const titleY = centerY - 135 * SCALE;
    const title = "🎄 FROHE WEIHNACHTEN! 🎄";

    // Glow effect
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20 * SCALE;

    // Title outline
    ctx.fillStyle = '#0D3B0D';
    for (let ox = -3; ox <= 3; ox++) {
        for (let oy = -3; oy <= 3; oy++) {
            ctx.fillText(title, centerX + ox * SCALE, titleY + oy * SCALE);
        }
    }

    // Animated rainbow title
    const gradient = ctx.createLinearGradient(centerX - 200 * SCALE, 0, centerX + 200 * SCALE, 0);
    const hueShift = (elapsed / 20) % 360;
    gradient.addColorStop(0, `hsl(${hueShift}, 80%, 50%)`);
    gradient.addColorStop(0.5, `hsl(${(hueShift + 60) % 360}, 80%, 50%)`);
    gradient.addColorStop(1, `hsl(${(hueShift + 120) % 360}, 80%, 50%)`);
    ctx.fillStyle = gradient;
    ctx.fillText(title, centerX, titleY);

    ctx.shadowBlur = 0;

    // Subtitle: "Liebe Lisa"
    if (elapsed > 800) {
        const subSize = Math.floor(18 * SCALE);
        ctx.font = `bold ${subSize}px monospace`;
        ctx.fillStyle = '#FFD700';
        ctx.fillText("Geschenkgutschein für Lisa", centerX, titleY + 48 * SCALE);
    }

    // Main gift text
    if (elapsed > 1200) {
        const textSize = Math.floor(18 * SCALE);
        ctx.font = `bold ${textSize}px monospace`;

        const lines = [
            "✨ ALL-INCLUSIVE SKITRIP ✨",
            "nach",
            "🏔️ HOCHFICHT, Österreich 🏔️",
            "📅 6. Januar 2026 📅"
        ];

        const startY = centerY - 25 * SCALE;
        const lineHeight = 34 * SCALE;

        lines.forEach((line, i) => {
            const y = startY + i * lineHeight;
            const alpha = Math.min(1, (elapsed - 1200 - i * 150) / 300);
            if (alpha <= 0) return;

            ctx.globalAlpha = alpha;

            // Special styling for highlight lines
            if (line.includes("ALL-INCLUSIVE") || line.includes("HOCHFICHT")) {
                ctx.font = `bold ${Math.floor(22 * SCALE)}px monospace`;
                ctx.fillStyle = '#E53935';

                // Pulsing effect
                const pulse = 1 + Math.sin(elapsed / 200) * 0.05;
                ctx.save();
                ctx.translate(centerX, y);
                ctx.scale(pulse, pulse);
                ctx.translate(-centerX, -y);

                // Outline
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 2 * SCALE;
                ctx.strokeText(line, centerX, y);
                ctx.fillText(line, centerX, y);
                ctx.restore();
            } else if (line.includes("6. Januar")) {
                ctx.font = `bold ${Math.floor(20 * SCALE)}px monospace`;
                ctx.fillStyle = '#4CAF50';
                ctx.fillText(line, centerX, y);
            } else {
                ctx.font = `bold ${textSize}px monospace`;
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(line, centerX, y);
            }
        });

        ctx.globalAlpha = 1;
    }

    // Lunch bonus reveal
    if (elapsed > 2500) {
        const bonusY = centerY + 125 * SCALE;
        const bonusAlpha = Math.min(1, (elapsed - 2500) / 500);
        ctx.globalAlpha = bonusAlpha;

        // Box background
        const boxWidth = 300 * SCALE;
        const boxHeight = 50 * SCALE;
        ctx.fillStyle = 'rgba(139, 0, 0, 0.8)';
        ctx.fillRect(centerX - boxWidth/2, bonusY - boxHeight/2, boxWidth, boxHeight);

        // Gold border
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3 * SCALE;
        ctx.strokeRect(centerX - boxWidth/2, bonusY - boxHeight/2, boxWidth, boxHeight);

        // Bonus text
        ctx.font = `bold ${Math.floor(14 * SCALE)}px monospace`;
        ctx.fillStyle = '#FFD700';
        ctx.fillText("🍽️ INKLUSIVE EINKEHR 🍽️", centerX, bonusY - 10 * SCALE);

        ctx.font = `bold ${Math.floor(16 * SCALE)}px monospace`;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText("🌭 Currywurst & Pommes 🍟", centerX, bonusY + 12 * SCALE);

        ctx.globalAlpha = 1;
    }

    // Sparkle stars animation
    if (elapsed > 1000) {
        ctx.fillStyle = '#FFD700';
        for (let i = 0; i < 12; i++) {
            const starAngle = (elapsed / 1000 + i * 0.5) % (Math.PI * 2);
            const starDist = 140 * SCALE + Math.sin(i * 2) * 60 * SCALE;
            const starX = centerX + Math.cos(starAngle + i) * starDist;
            const starY = centerY + Math.sin(starAngle * 0.7 + i) * starDist * 0.4;
            const starSize = (2 + Math.sin(elapsed / 100 + i)) * SCALE;

            ctx.globalAlpha = 0.5 + Math.sin(elapsed / 150 + i) * 0.5;
            ctx.beginPath();
            ctx.arc(starX, starY, starSize, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}

// Draw boost meter
function drawBoostMeter() {
    const padding = 20 * SCALE;
    const meterWidth = 200 * SCALE;
    const meterHeight = 15 * SCALE;
    const meterX = padding;
    const meterY = padding + 30 * SCALE; // Slightly below the top to avoid overlap

    // Calculate boost cooldown progress
    const now = Date.now();
    const timeSinceBoost = now - lastBoostTime;
    const cooldownProgress = Math.min(1, timeSinceBoost / BOOST_COOLDOWN);
    const isReady = cooldownProgress >= 1;

    // Draw label
    ctx.font = `bold ${Math.floor(12 * SCALE)}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';

    const label = isBoosting ? '🔥 BOOSTING! 🔥' : (isReady ? '💨 BOOST READY (DD) 💨' : '⏳ Boost Cooldown...');
    ctx.fillStyle = isBoosting ? '#FF6B00' : (isReady ? '#4CAF50' : '#999999');
    ctx.fillText(label, meterX, meterY - 5 * SCALE);

    // Draw meter background
    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(meterX - 2 * SCALE, meterY - 2 * SCALE, meterWidth + 4 * SCALE, meterHeight + 4 * SCALE);

    // Meter border
    ctx.fillStyle = isReady ? '#4CAF50' : '#555555';
    ctx.fillRect(meterX, meterY, meterWidth, meterHeight);

    // Meter fill
    if (isBoosting) {
        // Show boost duration remaining
        const boostProgress = 1 - (now - boostStartTime) / BOOST_DURATION;
        const fillWidth = meterWidth * boostProgress;
        ctx.fillStyle = '#FF6B00';
        ctx.fillRect(meterX, meterY, fillWidth, meterHeight);
    } else {
        // Show cooldown progress
        const fillWidth = meterWidth * cooldownProgress;
        ctx.fillStyle = isReady ? '#66BB6A' : '#FFD700';
        ctx.fillRect(meterX, meterY, fillWidth, meterHeight);
    }

    // Add shine effect
    if (isReady || isBoosting) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(meterX, meterY, meterWidth * (isBoosting ? (1 - (now - boostStartTime) / BOOST_DURATION) : 1), meterHeight / 3);
    }
}

// Draw progress bar and distance counter
function drawProgressBar() {
    const padding = 20 * SCALE;
    const barWidth = 300 * SCALE;
    const barHeight = 20 * SCALE;
    const barX = (CANVAS_WIDTH - barWidth) / 2;
    const barY = CANVAS_HEIGHT - padding - barHeight - 30 * SCALE;

    // Calculate progress
    const progress = distanceTraveled / TOTAL_DISTANCE;
    const remaining = TOTAL_DISTANCE - distanceTraveled;

    // Draw label
    ctx.font = `bold ${Math.floor(14 * SCALE)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Shadow
    ctx.fillStyle = '#1A1A2E';
    ctx.fillText('Distance till present', barX + barWidth / 2 + 2 * SCALE, barY - 5 * SCALE + 2 * SCALE);

    // Label text
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Distance till present', barX + barWidth / 2, barY - 5 * SCALE);

    // Draw bar background
    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(barX - 2 * SCALE, barY - 2 * SCALE, barWidth + 4 * SCALE, barHeight + 4 * SCALE);

    // Bar border
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Bar fill (progress)
    const fillWidth = barWidth * progress;
    ctx.fillStyle = '#E53935';
    ctx.fillRect(barX, barY, fillWidth, barHeight);

    // Add shine effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(barX, barY, fillWidth, barHeight / 3);

    // Draw distance counter below the bar
    const counterY = barY + barHeight + 15 * SCALE;
    ctx.font = `bold ${Math.floor(16 * SCALE)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const distanceText = `${Math.floor(distanceTraveled)}m / ${TOTAL_DISTANCE}m  (${Math.floor(remaining)}m remaining)`;

    // Shadow
    ctx.fillStyle = '#1A1A2E';
    ctx.fillText(distanceText, barX + barWidth / 2 + 2 * SCALE, counterY + 2 * SCALE);

    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(distanceText, barX + barWidth / 2, counterY);
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

    // Draw obstacles
    drawObstacles();

    // Draw the present (if visible)
    drawPresent();

    // Draw fart clouds (behind skier)
    drawFartClouds();

    // Draw skier
    drawSkier();

    // Draw title
    drawTitle();

    // Draw boost meter
    drawBoostMeter();

    // Draw progress bar and distance counter
    drawProgressBar();

    // Draw win screen if game is won
    if (gameWon) {
        drawWinScreen();
    }

    // Draw game over screen if game is over
    if (gameOver) {
        drawGameOverScreen();
    }
}

// Game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop();
