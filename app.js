/* ==========================================================================
   CROCODILE DAY ADVENTURE - APPLICATION LOGIC (REVISED)
   Playful Audio Synthesis, Navigation Transitions, and River Runner Game Loop
   ========================================================================== */

// --- STATE MANAGEMENT ---
let currentScene = 0;
const totalScenes = 4; // Slide 0 (Start), Slide 1 (Ancient), Slide 2 (Look), Slide 3 (Game)
let isSoundEnabled = true;

// --- WEB AUDIO SYNTHESIS ---
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Play a cute bubble pop sound
function playPopSound() {
    if (!isSoundEnabled) return;
    initAudio();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.08);
    
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    
    osc.start(now);
    osc.stop(now + 0.09);
}

// Play a happy chime arpeggio
function playChimeSound() {
    if (!isSoundEnabled) return;
    initAudio();
    
    const playNote = (freq, delay, duration) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'triangle';
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        const now = audioCtx.currentTime + delay;
        osc.frequency.setValueAtTime(freq, now);
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        osc.start(now);
        osc.stop(now + duration + 0.02);
    };
    
    playNote(523.25, 0, 0.18);     // C5
    playNote(659.25, 0.06, 0.18);  // E5
    playNote(783.99, 0.12, 0.18);  // G5
    playNote(1046.50, 0.18, 0.35); // C6
}

// Play downward bubble sliding pitches
function playBubbleSound() {
    if (!isSoundEnabled) return;
    initAudio();
    
    const now = audioCtx.currentTime;
    for (let i = 0; i < 4; i++) {
        const delay = i * 0.05;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.frequency.setValueAtTime(500 - (i * 80), now + delay);
        osc.frequency.exponentialRampToValueAtTime(120, now + delay + 0.07);
        
        gain.gain.setValueAtTime(0.12, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.07);
        
        osc.start(now + delay);
        osc.stop(now + delay + 0.08);
    }
}

// Play a low "bonk" sound effect when hitting trash
function playBonkSound() {
    if (!isSoundEnabled) return;
    initAudio();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(70, now + 0.22);
    
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    
    osc.start(now);
    osc.stop(now + 0.25);
}

// Play a sad slide sound for game-over
function playSadSound() {
    if (!isSoundEnabled) return;
    initAudio();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(290, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.55);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.55);
    
    osc.start(now);
    osc.stop(now + 0.6);
}

// --- SCENE NAVIGATION ENGINE ---
const scenes = [
    document.getElementById('scene-start'),
    document.getElementById('scene-ancient'),
    document.getElementById('scene-look'),
    document.getElementById('scene-game')
];

const dots = document.querySelectorAll('#progress-indicator .dot');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');

function navigateToScene(index) {
    if (index < 0 || index >= totalScenes) return;
    
    // Stop running games if navigating away
    if (currentScene === 3 && index !== 3) {
        stopGameEngine();
    }
    
    if (document.startViewTransition) {
        try {
            document.startViewTransition(() => updateDOMScene(index));
        } catch (e) {
            console.warn("View Transition failed, using fallback navigation", e);
            updateDOMScene(index);
        }
    } else {
        updateDOMScene(index);
    }
}

function updateDOMScene(index) {
    scenes[currentScene].classList.remove('active');
    scenes[index].classList.add('active');
    
    dots[currentScene].classList.remove('active');
    dots[index].classList.add('active');
    
    currentScene = index;
    
    if (currentScene === 0) {
        btnPrev.classList.add('hidden');
        btnNext.classList.add('hidden');
    } else {
        btnPrev.classList.remove('hidden');
        btnNext.classList.remove('hidden');
        
        btnPrev.disabled = false;
        btnNext.disabled = false;
        
        if (currentScene === 3) {
            btnNext.classList.add('hidden');
        } else {
            btnNext.classList.remove('hidden');
        }
    }
    
    if (currentScene === 3) {
        playChimeSound();
        startGameEngine();
    } else {
        playBubbleSound();
    }
}

// --- SCENE 3: RIVER CLEANUP CANVAS GAME ENGINE ---
const gameRiver = document.getElementById('game-river');
const gameCanvas = document.getElementById('game-canvas');
const ctx = gameCanvas.getContext('2d');
const heartsContainer = document.getElementById('hearts-container');
const gameTimerLabel = document.getElementById('game-timer');
const progressBarInner = document.getElementById('progress-bar-inner');
const gameOverOverlay = document.getElementById('game-over-overlay');
const gameWinOverlay = document.getElementById('game-win-overlay');

// Game constants
const GAME_WIDTH = 1000;
const GAME_HEIGHT = 550;

// Game state variables
let gameActive = false;
let hearts = 3;
let timeLeft = 20; // Shorter game time limit (20s)
let cleanliness = 0; // Starts dirty (0%), ends clean (100%)
let isInvulnerable = false;
let invulnerableTime = 0;
let score = 0;

// Entities & Particle systems
let player = { x: 150, y: 275, angle: 0, width: 190, height: 110 }; // Adjusted to match new sprite's aspect ratio (1.73:1)
let entities = [];
let particles = [];
let floatingTexts = [];
let ambientBubbles = [];

// Pointer/control tracking in virtual GAME coordinates
let pointerX = 150;
let pointerY = 275;

// Timing controls
let lastSpawnTime = 0;
let gameTimerId = null;
let gameAnimationFrameId = null;

// Preloaded images
const images = {
    player: new Image(),
    playerOpen: new Image(),
    bottle: new Image(),
    can: new Image(),
    bag: new Image(),
    fish: new Image(),
    fishGold: new Image(),
    turtle: new Image(),
    frog: new Image(),
    meat: new Image(),
    crab: new Image(),
    duckling: new Image(),
    dragonfly: new Image(),
    snail: new Image(),
    shrimp: new Image(),
    riverBg: new Image()
};
images.player.src = 'assets/game_crocodile.png';
images.playerOpen.src = 'assets/game_crocodile_open.png';
images.bottle.src = 'assets/game_bottle.png';
images.can.src = 'assets/game_can.png';
images.bag.src = 'assets/game_bag.png';
images.fish.src = 'assets/game_fish.png';
images.fishGold.src = 'assets/game_fish_gold.png';
images.turtle.src = 'assets/game_turtle.png';
images.frog.src = 'assets/game_frog.png';
images.meat.src = 'assets/game_meat.png';
images.crab.src = 'assets/game_crab.png';
images.duckling.src = 'assets/game_duckling.png';
images.dragonfly.src = 'assets/game_dragonfly.png';
images.snail.src = 'assets/game_snail.png';
images.shrimp.src = 'assets/game_shrimp.png';
images.riverBg.src = 'assets/game_river_bg.png';

let bgScrollX = 0;

// Setup canvas resolution and resizing
let canvasWidth = 800;
let canvasHeight = 450;

function resizeCanvas() {
    if (!gameRiver) return;
    const rect = gameRiver.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    gameCanvas.width = rect.width * dpr;
    gameCanvas.height = rect.height * dpr;
    canvasWidth = rect.width;
    canvasHeight = rect.height;
}

// Translate mouse/touch inputs into virtual coordinates
function updatePointerFromClient(clientX, clientY) {
    const rect = gameCanvas.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;
    pointerX = (clientX - rect.left) * scaleX;
    pointerY = (clientY - rect.top) * scaleY;
}

// Interaction listeners
gameCanvas.addEventListener('mousemove', (e) => {
    updatePointerFromClient(e.clientX, e.clientY);
});
gameCanvas.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
        updatePointerFromClient(e.touches[0].clientX, e.touches[0].clientY);
    }
    e.preventDefault();
}, { passive: false });
gameCanvas.addEventListener('mousedown', (e) => {
    initAudio();
    updatePointerFromClient(e.clientX, e.clientY);
});
gameCanvas.addEventListener('touchstart', (e) => {
    initAudio();
    if (e.touches.length > 0) {
        updatePointerFromClient(e.touches[0].clientX, e.touches[0].clientY);
    }
    e.preventDefault();
}, { passive: false });

// Particles helper
function spawnParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            radius: Math.random() * 5 + 2,
            color: color,
            alpha: 1,
            decay: Math.random() * 0.03 + 0.02
        });
    }
}

// Floating texts helper
function spawnFloatingText(x, y, text, color) {
    floatingTexts.push({
        x: x,
        y: y,
        text: text,
        color: color,
        alpha: 1,
        vy: -1.5,
        decay: 0.02
    });
}

function startGameEngine() {
    stopGameEngine();
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    gameActive = true;
    hearts = 3;
    timeLeft = 20;
    cleanliness = 0;
    score = 0;
    isInvulnerable = false;
    invulnerableTime = 0;
    
    player.x = 150;
    player.y = 275;
    player.angle = 0;
    pointerX = 150;
    pointerY = 275;
    
    entities = [];
    particles = [];
    floatingTexts = [];
    ambientBubbles = [];
    
    // Spawn initial ambient bubbles
    for (let i = 0; i < 20; i++) {
        ambientBubbles.push({
            x: Math.random() * GAME_WIDTH,
            y: Math.random() * GAME_HEIGHT,
            speed: Math.random() * 1.5 + 0.5,
            radius: Math.random() * 6 + 2,
            opacity: Math.random() * 0.4 + 0.1
        });
    }
    
    updateHeartsUI();
    updateProgressBarUI();
    gameTimerLabel.innerText = timeLeft;
    
    gameOverOverlay.classList.add('hidden');
    gameWinOverlay.classList.add('hidden');
    
    gameTimerId = setInterval(updateGameTimer, 1000);
    lastSpawnTime = Date.now();
    
    gameAnimationFrameId = requestAnimationFrame(gameLoop);
}

function stopGameEngine() {
    gameActive = false;
    clearInterval(gameTimerId);
    cancelAnimationFrame(gameAnimationFrameId);
    window.removeEventListener('resize', resizeCanvas);
}

function updateHeartsUI() {
    let heartsHTML = "";
    for (let i = 0; i < 3; i++) {
        heartsHTML += (i < hearts) ? "❤️ " : "🤍 ";
    }
    heartsContainer.innerHTML = heartsHTML.trim();
}

function updateProgressBarUI() {
    progressBarInner.style.width = `${cleanliness}%`;
}

function updateGameTimer() {
    if (!gameActive) return;
    timeLeft--;
    gameTimerLabel.innerText = timeLeft;
    
    if (timeLeft <= 0) {
        triggerVictory();
    }
}

// Spawns items (trash or food/animals)
function spawnEntity() {
    const isTrash = Math.random() < 0.22; // Decreased trash ratio to 22%
    const y = 50 + Math.random() * (GAME_HEIGHT - 100);
    const vx = -(Math.random() * 1.5 + 2.0); // Slower movement
    
    if (isTrash) {
        const trashTypes = ['bottle', 'can', 'bag'];
        const type = trashTypes[Math.floor(Math.random() * trashTypes.length)];
        let w = 75, h = 75;
        if (type === 'bottle') {
            w = 80; h = 62; // 1.28 ratio
        } else if (type === 'can') {
            w = 60; h = 75; // 0.8 ratio
        } else if (type === 'bag') {
            w = 75; h = 75; // 1.0 ratio
        }
        entities.push({
            type: 'trash',
            subType: type,
            x: GAME_WIDTH + 50,
            y: y,
            vx: vx,
            vy: (Math.random() - 0.5) * 0.5,
            width: w,
            height: h,
            angle: Math.random() * Math.PI,
            rotSpeed: (Math.random() - 0.5) * 0.08 // faster spin
        });
    } else {
        const friendTypes = ['fish', 'fish_gold', 'turtle', 'frog', 'crab', 'duckling', 'shrimp'];
        const type = friendTypes[Math.floor(Math.random() * friendTypes.length)];
        let w = 75, h = 50;
        if (type === 'fish' || type === 'fish_gold') {
            w = 78; h = 60;
        } else if (type === 'turtle') {
            w = 80; h = 65;
        } else if (type === 'frog') {
            w = 110; h = 92; // Much bigger frog
        } else if (type === 'crab') {
            w = 76; h = 68;
        } else if (type === 'duckling') {
            w = 105; h = 98; // Much bigger duckling
        } else if (type === 'shrimp') {
            w = 76; h = 58;
        }
        entities.push({
            type: 'friend',
            subType: type,
            x: GAME_WIDTH + 50,
            y: y,
            vx: vx * 1.15,
            vy: type === 'frog' ? (Math.random() - 0.5) * 1.5 : Math.sin(y) * 0.8, // frog has active vertical hopping motion
            width: w,
            height: h,
            wiggle: 0,
            wiggleSpeed: 0.25 + Math.random() * 0.15
        });
    }
}

function gameLoop() {
    if (!gameActive) return;
    
    updateGameLogic();
    renderGame();
    
    gameAnimationFrameId = requestAnimationFrame(gameLoop);
}

function updateGameLogic() {
    // 1. Interpolate Player Position toward Pointer
    const dx = pointerX - player.x;
    const dy = pointerY - player.y;
    player.x += dx * 0.12;
    player.y += dy * 0.12;
    
    // Dynamic swim animation speed based on movement
    const dist = Math.sqrt(dx * dx + dy * dy);
    player.swimTime = (player.swimTime || 0) + 0.08 + Math.min(dist * 0.008, 0.18);
    
    // Update mouth opening logic based on food proximity or timer
    if (player.mouthOpenTimer > 0) {
        player.mouthOpenTimer--;
    }
    
    let foodClose = false;
    for (let i = 0; i < entities.length; i++) {
        const ent = entities[i];
        if (ent.type === 'friend') {
            const fdx = ent.x - (player.x + player.width * 0.25);
            const fdy = ent.y - player.y;
            const distToMouth = Math.hypot(fdx, fdy);
            if (distToMouth < 160) {
                foodClose = true;
                break;
            }
        }
    }
    player.isMouthOpen = foodClose || (player.mouthOpenTimer > 0);
    
    // Boundary checks
    player.x = Math.max(70, Math.min(GAME_WIDTH - 70, player.x));
    player.y = Math.max(50, Math.min(GAME_HEIGHT - 50, player.y));
    
    // Swim angle calculation
    const targetAngle = Math.atan2(dy, dx + 60) * 0.5;
    player.angle += (targetAngle - player.angle) * 0.15;
    
    // Invulnerability cooldown
    if (isInvulnerable) {
        invulnerableTime -= 16.7; // Approx ms per frame
        if (invulnerableTime <= 0) {
            isInvulnerable = false;
        }
    }
    
    // 2. Scroll River Background
    bgScrollX -= 1.2; // background scrolls slightly slower to match item speeds
    if (bgScrollX <= -GAME_WIDTH) {
        bgScrollX = 0;
    }
    
    // 3. Update Entities
    const now = Date.now();
    if (now - lastSpawnTime > 600) { // Spawns every 600ms (slower rate)
        spawnEntity();
        lastSpawnTime = now;
    }
    
    for (let i = entities.length - 1; i >= 0; i--) {
        const ent = entities[i];
        ent.x += ent.vx;
        ent.y += ent.vy;
        
        // Boundaries
        if (ent.y < 30 || ent.y > GAME_HEIGHT - 30) {
            ent.vy *= -1;
        }
        
        // Specific animations
        if (ent.type === 'trash') {
            ent.angle += ent.rotSpeed;
        } else if (ent.type === 'friend') {
            ent.wiggle += ent.wiggleSpeed;
        }
        
        // Remove offscreen
        if (ent.x < -100) {
            entities.splice(i, 1);
            continue;
        }
        
        // Collision detection with player
        const dist = Math.hypot(player.x - ent.x, player.y - ent.y);
        const collisionRadius = (player.width * 0.45) + (ent.width * 0.45);
        
        if (dist < collisionRadius * 0.85) { // Forgiving bounds
            handleCollision(ent, i);
        }
    }
    
    // 4. Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
            particles.splice(i, 1);
        }
    }
    
    // 5. Update Floating Texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y += ft.vy;
        ft.alpha -= ft.decay;
        if (ft.alpha <= 0) {
            floatingTexts.splice(i, 1);
        }
    }
    
    // 6. Ambient Bubbles
    for (let i = 0; i < ambientBubbles.length; i++) {
        const b = ambientBubbles[i];
        b.x -= b.speed;
        if (b.x < -20) {
            b.x = GAME_WIDTH + 20;
            b.y = Math.random() * GAME_HEIGHT;
        }
    }
}

function handleCollision(ent, index) {
    if (ent.type === 'trash' && !isInvulnerable) {
        playBonkSound();
        spawnParticles(ent.x, ent.y, '#e57373', 15);
        
        hearts--;
        updateHeartsUI();
        
        spawnFloatingText(player.x, player.y - 40, "Yuck! Trash! 🚮", "#e57373");
        
        isInvulnerable = true;
        invulnerableTime = 1200; // 1.2 seconds invulnerability
        
        entities.splice(index, 1);
        
        if (hearts <= 0) {
            triggerGameOver();
        }
    } else if (ent.type === 'friend') {
        playPopSound();
        spawnParticles(ent.x, ent.y, '#ffd54f', 12);
        
        // Open mouth on eat
        player.mouthOpenTimer = 18; 
        
        cleanliness = Math.min(100, cleanliness + 8); // Eat food to gain 8% energy
        score += 150; // Add 150 score points
        updateProgressBarUI();
        
        let foodLabel = "Yum! Fish! 🐟";
        if (ent.subType === 'fish_gold') foodLabel = "Awesome Gold Fish! 🐠";
        if (ent.subType === 'turtle') foodLabel = "Yum! Turtle! 🐢";
        if (ent.subType === 'frog') foodLabel = "Crunchy Frog! 🐸";
        if (ent.subType === 'meat') foodLabel = "Delicious Meat! 🥩";
        if (ent.subType === 'crab') foodLabel = "Tasty Crab! 🦀";
        if (ent.subType === 'duckling') foodLabel = "Cute Duckling! 🦆";
        if (ent.subType === 'dragonfly') foodLabel = "Zippy Dragonfly! 🦟";
        if (ent.subType === 'snail') foodLabel = "Chewy Snail! 🐌";
        if (ent.subType === 'shrimp') foodLabel = "Crispy Shrimp! 🦐";
        spawnFloatingText(ent.x, ent.y - 20, foodLabel, "#4caf50");
        entities.splice(index, 1);
    }
}

function triggerGameOver() {
    playSadSound();
    stopGameEngine();
    document.getElementById('game-over-score').innerText = `${cleanliness}%`;
    gameOverOverlay.classList.remove('hidden');
}

function triggerVictory() {
    playChimeSound();
    stopGameEngine();
    launchConfetti();
    
    // Final score includes collected score + time bonus + health/heart bonus
    const finalScore = score + (timeLeft * 50) + (hearts * 300);
    document.getElementById('game-win-score').innerText = finalScore;
    
    gameWinOverlay.classList.remove('hidden');
}

function launchConfetti() {
    const colors = ['#ffd54f', '#81c784', '#64b5f6', '#ff8a80', '#ba68c8', '#a1887f'];
    for (let i = 0; i < 80; i++) {
        particles.push({
            x: Math.random() * GAME_WIDTH,
            y: -20,
            vx: (Math.random() - 0.5) * 3,
            vy: Math.random() * 4 + 2,
            radius: Math.random() * 8 + 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: 1,
            decay: Math.random() * 0.01 + 0.005
        });
    }
}

// Renders everything onto the canvas
function renderGame() {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Scale everything relative to virtual GAME coordinates
    const dpr = window.devicePixelRatio || 1;
    const finalScaleX = canvasWidth / GAME_WIDTH;
    const finalScaleY = canvasHeight / GAME_HEIGHT;
    
    ctx.save();
    ctx.scale(finalScaleX * dpr, finalScaleY * dpr);
    
    // 1. Draw River Background
    if (images.riverBg.complete) {
        ctx.drawImage(images.riverBg, bgScrollX, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.drawImage(images.riverBg, bgScrollX + GAME_WIDTH, 0, GAME_WIDTH, GAME_HEIGHT);
    } else {
        // Fallback simple background gradient
        ctx.fillStyle = '#0288d1';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    
    // 2. Draw Ambient Murky overlay - disabled color shifts as requested
    
    // 3. Draw Ambient Bubbles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let i = 0; i < ambientBubbles.length; i++) {
        const b = ambientBubbles[i];
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${b.opacity})`;
        ctx.fill();
        // highlight dot
        ctx.beginPath();
        ctx.arc(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${b.opacity * 1.5})`;
        ctx.fill();
    }
    
    // 4. Draw entities (trash images and procedural animals)
    for (let i = 0; i < entities.length; i++) {
        const ent = entities[i];
        ctx.save();
        ctx.translate(ent.x, ent.y);
        
        if (ent.type === 'trash') {
            ctx.rotate(ent.angle);
            let img = null;
            if (ent.subType === 'bottle') img = images.bottle;
            if (ent.subType === 'can') img = images.can;
            if (ent.subType === 'bag') img = images.bag;
            
            if (img && img.complete) {
                ctx.drawImage(img, -ent.width/2, -ent.height/2, ent.width, ent.height);
            } else {
                // simple colored circles for missing images
                ctx.fillStyle = '#ff7043';
                ctx.beginPath();
                ctx.arc(0, 0, ent.width/2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (ent.type === 'friend') {
            let img = null;
            if (ent.subType === 'fish') img = images.fish;
            if (ent.subType === 'fish_gold') img = images.fishGold;
            if (ent.subType === 'turtle') img = images.turtle;
            if (ent.subType === 'frog') img = images.frog;
            if (ent.subType === 'meat') img = images.meat;
            if (ent.subType === 'crab') img = images.crab;
            if (ent.subType === 'duckling') img = images.duckling;
            if (ent.subType === 'dragonfly') img = images.dragonfly;
            if (ent.subType === 'snail') img = images.snail;
            if (ent.subType === 'shrimp') img = images.shrimp;
            
            if (img && img.complete && img.naturalWidth > 0) {
                // If it is a fish, add a subtle wiggle angle
                if (ent.subType === 'fish' || ent.subType === 'fish_gold') {
                    const fishWiggle = Math.sin(ent.wiggle) * 0.08;
                    ctx.rotate(fishWiggle);
                }
                if (ent.subType === 'frog') {
                    ctx.scale(1, 1 + Math.sin(ent.wiggle) * 0.1);
                }
                if (ent.subType === 'dragonfly') {
                    ctx.scale(1 + Math.sin(ent.wiggle * 2) * 0.05, 1);
                }
                ctx.drawImage(img, -ent.width/2, -ent.height/2, ent.width, ent.height);
            } else {
                // Draw cute friendly animals procedurally as a fallback
                if (ent.subType === 'fish') {
                    // Fish body
                    ctx.fillStyle = '#ff7043';
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 22, 12, 0, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Tail (animated wiggle)
                    const tailWiggle = Math.sin(ent.wiggle) * 12;
                    ctx.beginPath();
                    ctx.moveTo(-20, 0);
                    ctx.lineTo(-35, -10 + tailWiggle);
                    ctx.lineTo(-30, 0);
                    ctx.lineTo(-35, 10 + tailWiggle);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Eye
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(10, -3, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#000000';
                    ctx.beginPath();
                    ctx.arc(11, -3, 2, 0, Math.PI * 2);
                    ctx.fill();
                } else if (ent.subType === 'fish_gold') {
                    // Golden Fish body
                    ctx.fillStyle = '#ffa726';
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 22, 12, 0, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Tail (wiggle)
                    const tailWiggle = Math.sin(ent.wiggle) * 12;
                    ctx.beginPath();
                    ctx.moveTo(-20, 0);
                    ctx.lineTo(-35, -10 + tailWiggle);
                    ctx.lineTo(-30, 0);
                    ctx.lineTo(-35, 10 + tailWiggle);
                    ctx.closePath();
                    ctx.fill();
                    
                    // Eye
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(10, -3, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#000000';
                    ctx.beginPath();
                    ctx.arc(11, -3, 2, 0, Math.PI * 2);
                    ctx.fill();
                } else if (ent.subType === 'frog') {
                    // Frog body
                    ctx.fillStyle = '#66bb6a';
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 20, 15, 0, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Legs
                    ctx.fillStyle = '#43a047';
                    ctx.beginPath();
                    ctx.ellipse(-12, 6, 12, 6, Math.PI/4, 0, Math.PI * 2);
                    ctx.ellipse(12, 6, 8, 5, -Math.PI/4, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Eyes
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(6, -11, 5, 0, Math.PI * 2);
                    ctx.arc(-6, -11, 5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#000000';
                    ctx.beginPath();
                    ctx.arc(6, -11, 2, 0, Math.PI * 2);
                    ctx.arc(-6, -11, 2, 0, Math.PI * 2);
                    ctx.fill();
                } else if (ent.subType === 'meat') {
                    // Meat bone
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 6;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(-18, 0);
                    ctx.lineTo(18, 0);
                    ctx.stroke();
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(-18, -4, 4, 0, Math.PI*2);
                    ctx.arc(-18, 4, 4, 0, Math.PI*2);
                    ctx.arc(18, -4, 4, 0, Math.PI*2);
                    ctx.arc(18, 4, 4, 0, Math.PI*2);
                    ctx.fill();
                    
                    // Meat body
                    ctx.fillStyle = '#e64a19';
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 18, 14, 0, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Meat marble lines
                    ctx.strokeStyle = '#ffcc80';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.arc(-4, 0, 8, -Math.PI/2, Math.PI/2);
                    ctx.stroke();
                } else if (ent.subType === 'meat') {
                    // Meat bone
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 6;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(-18, 0);
                    ctx.lineTo(18, 0);
                    ctx.stroke();
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(-18, -4, 4, 0, Math.PI*2);
                    ctx.arc(-18, 4, 4, 0, Math.PI*2);
                    ctx.arc(18, -4, 4, 0, Math.PI*2);
                    ctx.arc(18, 4, 4, 0, Math.PI*2);
                    ctx.fill();
                    
                    // Meat body
                    ctx.fillStyle = '#e64a19';
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 18, 14, 0, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Meat marble lines
                    ctx.strokeStyle = '#ffcc80';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.arc(-4, 0, 8, -Math.PI/2, Math.PI/2);
                    ctx.stroke();
                } else if (ent.subType === 'crab') {
                    // Crab legs
                    ctx.strokeStyle = '#d84315';
                    ctx.lineWidth = 4;
                    ctx.lineCap = 'round';
                    for (let i = -1; i <= 1; i += 2) {
                        ctx.beginPath();
                        ctx.moveTo(i * 6, 4);
                        ctx.quadraticCurveTo(i * 18, 12, i * 22, 4);
                        ctx.stroke();
                        
                        ctx.beginPath();
                        ctx.moveTo(i * 6, -4);
                        ctx.quadraticCurveTo(i * 18, -12, i * 22, -4);
                        ctx.stroke();
                    }
                    // Crab claws
                    ctx.fillStyle = '#d84315';
                    ctx.beginPath();
                    ctx.arc(14, -14, 8, 0, Math.PI*2);
                    ctx.arc(-14, -14, 8, 0, Math.PI*2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(10, -8); ctx.lineTo(14, -16); ctx.lineTo(18, -8); ctx.fill();
                    ctx.moveTo(-10, -8); ctx.lineTo(-14, -16); ctx.lineTo(-18, -8); ctx.fill();
                    // Crab body
                    ctx.fillStyle = '#e64a19';
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 18, 14, 0, 0, Math.PI * 2);
                    ctx.fill();
                    // Eyes
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(6, -15, 3.5, 0, Math.PI * 2);
                    ctx.arc(-6, -15, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#000000';
                    ctx.beginPath();
                    ctx.arc(6, -15, 1.5, 0, Math.PI * 2);
                    ctx.arc(-6, -15, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                } else if (ent.subType === 'duckling') {
                    // Body
                    ctx.fillStyle = '#fdd835';
                    ctx.beginPath();
                    ctx.ellipse(0, 6, 20, 14, 0, 0, Math.PI*2);
                    ctx.fill();
                    // Head
                    ctx.beginPath();
                    ctx.arc(14, -8, 11, 0, Math.PI*2);
                    ctx.fill();
                    // Beak
                    ctx.fillStyle = '#ff9800';
                    ctx.beginPath();
                    ctx.moveTo(23, -11);
                    ctx.lineTo(32, -8);
                    ctx.lineTo(23, -5);
                    ctx.fill();
                    // Wing (animated flapping)
                    ctx.fillStyle = '#fbc02d';
                    ctx.save();
                    ctx.translate(-4, 4);
                    ctx.rotate(Math.sin(ent.wiggle * 2) * 0.2);
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI*2);
                    ctx.fill();
                    ctx.restore();
                    // Eye
                    ctx.fillStyle = '#000000';
                    ctx.beginPath();
                    ctx.arc(17, -10, 2, 0, Math.PI*2);
                    ctx.fill();
                } else if (ent.subType === 'dragonfly') {
                    // Wings (transparent, animated)
                    ctx.fillStyle = 'rgba(179, 229, 252, 0.6)';
                    const wingSwing = Math.sin(ent.wiggle * 3) * 0.18;
                    // Left wings
                    ctx.save();
                    ctx.rotate(-Math.PI/6 + wingSwing);
                    ctx.beginPath(); ctx.ellipse(0, -18, 5, 20, Math.PI/12, 0, Math.PI*2); ctx.fill();
                    ctx.restore();
                    ctx.save();
                    ctx.rotate(-Math.PI/3 + wingSwing);
                    ctx.beginPath(); ctx.ellipse(0, -14, 4, 16, Math.PI/12, 0, Math.PI*2); ctx.fill();
                    ctx.restore();
                    // Right wings
                    ctx.save();
                    ctx.rotate(Math.PI/6 - wingSwing);
                    ctx.beginPath(); ctx.ellipse(0, 18, 5, 20, -Math.PI/12, 0, Math.PI*2); ctx.fill();
                    ctx.restore();
                    ctx.save();
                    ctx.rotate(Math.PI/3 - wingSwing);
                    ctx.beginPath(); ctx.ellipse(0, 14, 4, 16, -Math.PI/12, 0, Math.PI*2); ctx.fill();
                    ctx.restore();
                    
                    // Tail / Segmented body
                    ctx.strokeStyle = '#0288d1';
                    ctx.lineWidth = 5;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(-4, 0);
                    ctx.lineTo(-24, 0);
                    ctx.stroke();
                    // Thorax
                    ctx.fillStyle = '#0288d1';
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI*2);
                    ctx.fill();
                    // Head & large eyes
                    ctx.fillStyle = '#01579b';
                    ctx.beginPath();
                    ctx.arc(6, 0, 5, 0, Math.PI*2);
                    ctx.fill();
                    ctx.fillStyle = '#80d8ff';
                    ctx.beginPath();
                    ctx.arc(7, -3, 2, 0, Math.PI*2);
                    ctx.arc(7, 3, 2, 0, Math.PI*2);
                    ctx.fill();
                } else if (ent.subType === 'snail') {
                    // Snail soft body
                    ctx.fillStyle = '#ffe082';
                    ctx.beginPath();
                    ctx.ellipse(-4, 8, 18, 6, 0, 0, Math.PI*2);
                    ctx.fill();
                    // Snail tail
                    ctx.beginPath();
                    ctx.moveTo(-20, 8); ctx.lineTo(-26, 11); ctx.lineTo(-14, 11); ctx.fill();
                    // Snail head
                    ctx.beginPath();
                    ctx.arc(12, 4, 6, 0, Math.PI*2);
                    ctx.fill();
                    // Eyestalks
                    ctx.strokeStyle = '#ffe082';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.moveTo(12, 4); ctx.lineTo(16, -6);
                    ctx.moveTo(10, 4); ctx.lineTo(11, -8);
                    ctx.stroke();
                    ctx.fillStyle = '#000000';
                    ctx.beginPath();
                    ctx.arc(16, -6, 1.2, 0, Math.PI*2);
                    ctx.arc(11, -8, 1.2, 0, Math.PI*2);
                    ctx.fill();
                    // Shell (swirly)
                    ctx.fillStyle = '#bcaaa4';
                    ctx.beginPath();
                    ctx.arc(-2, 0, 12, 0, Math.PI*2);
                    ctx.fill();
                    ctx.strokeStyle = '#5d4037';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(-2, 0, 8, 0, Math.PI);
                    ctx.stroke();
                } else if (ent.subType === 'shrimp') {
                    // Shrimp tail fan
                    ctx.fillStyle = '#ffab91';
                    ctx.beginPath();
                    ctx.moveTo(-16, 0); ctx.lineTo(-24, -6); ctx.lineTo(-20, 0); ctx.lineTo(-24, 6); ctx.closePath();
                    ctx.fill();
                    // Curved segmented body
                    ctx.save();
                    ctx.translate(-2, 0);
                    for (let i = 0; i < 4; i++) {
                        ctx.translate(4, 0);
                        ctx.beginPath();
                        ctx.ellipse(0, 0, 6, 9 - i*1.2, 0, 0, Math.PI*2);
                        ctx.fill();
                    }
                    ctx.restore();
                    // Head
                    ctx.beginPath();
                    ctx.ellipse(14, 0, 8, 6, 0, 0, Math.PI*2);
                    ctx.fill();
                    // Eye
                    ctx.fillStyle = '#000000';
                    ctx.beginPath();
                    ctx.arc(16, -2, 1.5, 0, Math.PI*2);
                    ctx.fill();
                    // Long feelers/antennas
                    ctx.strokeStyle = '#ffab91';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(18, 0);
                    ctx.quadraticCurveTo(28, -12, 38, -16);
                    ctx.moveTo(18, 2);
                    ctx.quadraticCurveTo(28, 12, 38, 16);
                    ctx.stroke();
                } else if (ent.subType === 'turtle') {
                    // Flippers
                    ctx.fillStyle = '#81c784';
                    ctx.beginPath();
                    ctx.ellipse(10, -15, 14, 6, -Math.PI / 4, 0, Math.PI * 2); // Front top
                    ctx.ellipse(10, 15, 14, 6, Math.PI / 4, 0, Math.PI * 2);  // Front bottom
                    ctx.ellipse(-15, -10, 10, 5, -Math.PI / 6, 0, Math.PI * 2); // Back top
                    ctx.ellipse(-15, 10, 10, 5, Math.PI / 6, 0, Math.PI * 2);  // Back bottom
                    ctx.fill();
                    
                    // Head
                    ctx.beginPath();
                    ctx.arc(28, 0, 8, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#000000';
                    ctx.beginPath();
                    ctx.arc(31, -2, 1.5, 0, Math.PI * 2);
                    ctx.arc(31, 2, 1.5, 0, Math.PI * 2);
                    ctx.fill();

                    // Shell
                    ctx.fillStyle = '#33691e';
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 24, 18, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#558b2f';
                    ctx.lineWidth = 3;
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    }
    
    // 5. Draw Player (Crocodile)
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    
    // Flashing effect if invulnerable
    let drawPlayer = true;
    if (isInvulnerable && Math.floor(Date.now() / 100) % 2 === 0) {
        drawPlayer = false;
    }
    
    if (drawPlayer) {
        const activePlayerImg = (player.isMouthOpen && images.playerOpen.complete) ? images.playerOpen : images.player;
        if (activePlayerImg.complete) {
            const numSlices = 24;
            const sliceWidth = activePlayerImg.width / numSlices;
            const destSliceWidth = player.width / numSlices;
            
            for (let i = 0; i < numSlices; i++) {
                const t = i / (numSlices - 1); // 0 (tail/left) to 1 (head/right)
                const amplitude = (1 - t) * 14; // max wiggle at tail, stable head
                const phase = player.swimTime - t * Math.PI * 1.6;
                const wiggleY = Math.sin(phase) * amplitude;
                
                const sx = i * sliceWidth;
                const sy = 0;
                const sw = sliceWidth;
                const sh = activePlayerImg.height;
                
                const dx = -player.width / 2 + i * destSliceWidth;
                const dy = -player.height / 2 + wiggleY;
                const dw = destSliceWidth + 0.5; // slight overlap to prevent gaps
                const dh = player.height;
                
                ctx.drawImage(activePlayerImg, sx, sy, sw, sh, dx, dy, dw, dh);
            }
        } else {
            // Draw a cute fallback canvas crocodile body
            ctx.fillStyle = '#2e7d32';
            ctx.beginPath();
            ctx.ellipse(0, 0, player.width/2, player.height/2, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
    
    // 6. Draw Particle System
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0; // Reset
    
    // 7. Draw Floating Texts
    ctx.font = "bold 22px 'Fredoka', cursive";
    ctx.textAlign = 'center';
    for (let i = 0; i < floatingTexts.length; i++) {
        const ft = floatingTexts[i];
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = ft.alpha;
        ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1.0;
    
    // 8. Custom premium cursor bubble drawn at pointer coordinates
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(pointerX, pointerY, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(pointerX - 4, pointerY - 4, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// --- GLOBAL NAVIGATION BINDINGS ---
window.addEventListener('DOMContentLoaded', () => {
    
    // Begin Button on start screen
    document.getElementById('btn-begin').addEventListener('click', () => {
        initAudio();
        playChimeSound();
        navigateToScene(1);
    });
    
    // Next slide button
    btnNext.addEventListener('click', () => {
        initAudio();
        if (currentScene < totalScenes - 1) {
            navigateToScene(currentScene + 1);
        }
    });
    
    // Back slide button
    btnPrev.addEventListener('click', () => {
        initAudio();
        if (currentScene > 0) {
            navigateToScene(currentScene - 1);
        }
    });
    
    // Sound effects toggle button
    const btnSound = document.getElementById('btn-sound');
    const iconSoundOn = btnSound.querySelector('.icon-sound-on');
    const iconSoundOff = btnSound.querySelector('.icon-sound-off');
    
    btnSound.addEventListener('click', () => {
        isSoundEnabled = !isSoundEnabled;
        if (isSoundEnabled) {
            iconSoundOn.classList.remove('hidden');
            iconSoundOff.classList.add('hidden');
            playPopSound();
        } else {
            iconSoundOn.classList.add('hidden');
            iconSoundOff.classList.remove('hidden');
        }
    });
    
    // Replay/Restart buttons
    document.getElementById('btn-restart').addEventListener('click', () => {
        playChimeSound();
        startGameEngine();
    });
    
    document.getElementById('btn-replay').addEventListener('click', () => {
        playChimeSound();
        startGameEngine();
    });
});
