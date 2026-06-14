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
        document.startViewTransition(() => updateDOMScene(index));
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
        
        if (currentScene === 1) {
            btnPrev.disabled = true;
        }
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

// --- SCENE 3: RIVER RUNNER GAME ENGINE ---
const gameRiver = document.getElementById('game-river');
const player = document.getElementById('runner-player');
const heartsContainer = document.getElementById('hearts-container');
const gameTimerLabel = document.getElementById('game-timer');
const gameOverOverlay = document.getElementById('game-over-overlay');
const gameWinOverlay = document.getElementById('game-win-overlay');
const estuaryOverlay = document.querySelector('.estuary-overlay');

let gameActive = false;
let hearts = 3;
let timeLeft = 30;
let obstacles = [];
let spawnIntervalId = null;
let countdownIntervalId = null;
let gameAnimationFrameId = null;
let isInvulnerable = false;

// Transparent generated png assets
const OBSTACLE_ASSETS = [
    'assets/game_bottle.png',
    'assets/game_can.png',
    'assets/game_bag.png'
];

function startGameEngine() {
    stopGameEngine(); // Clean start
    
    gameActive = true;
    hearts = 3;
    timeLeft = 30;
    obstacles = [];
    isInvulnerable = false;
    
    gameTimerLabel.innerText = timeLeft;
    updateHeartsUI();
    
    // Hide modals
    gameOverOverlay.classList.add('hidden');
    gameWinOverlay.classList.add('hidden');
    
    // Reset overlays
    estuaryOverlay.style.opacity = 0;
    player.style.top = "50%";
    player.classList.remove('hit');
    
    // Clear old trash elements
    const oldTrash = gameRiver.querySelectorAll('.obstacle-sprite');
    oldTrash.forEach(item => item.remove());
    
    // Start game intervals
    spawnIntervalId = setInterval(spawnObstacle, 1100);
    countdownIntervalId = setInterval(updateGameTimer, 1000);
    
    gameAnimationFrameId = requestAnimationFrame(gameLoop);
}

function stopGameEngine() {
    gameActive = false;
    
    clearInterval(spawnIntervalId);
    clearInterval(countdownIntervalId);
    cancelAnimationFrame(gameAnimationFrameId);
    
    const trash = gameRiver.querySelectorAll('.obstacle-sprite');
    trash.forEach(item => item.remove());
    obstacles = [];
}

// Smooth vertical player movement on mouse/touch interaction
function handlePlayerMovement(clientY) {
    if (!gameActive) return;
    const rect = gameRiver.getBoundingClientRect();
    const relativeY = clientY - rect.top;
    
    // Convert to percentage and bound it (12% to 88% range)
    let targetPercentageY = (relativeY / rect.height) * 100;
    targetPercentageY = Math.max(12, Math.min(88, targetPercentageY));
    
    player.style.top = `${targetPercentageY}%`;
}

// Event Listeners for Player Control
gameRiver.addEventListener('mousemove', (e) => {
    handlePlayerMovement(e.clientY);
});
gameRiver.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
        handlePlayerMovement(e.touches[0].clientY);
    }
});
gameRiver.addEventListener('mousedown', (e) => {
    initAudio();
    handlePlayerMovement(e.clientY);
});
gameRiver.addEventListener('touchstart', (e) => {
    initAudio();
    if (e.touches.length > 0) {
        handlePlayerMovement(e.touches[0].clientY);
    }
});

// Render hearts
function updateHeartsUI() {
    let heartsHTML = "";
    for (let i = 0; i < 3; i++) {
        if (i < hearts) {
            heartsHTML += "❤️ ";
        } else {
            heartsHTML += "🤍 ";
        }
    }
    heartsContainer.innerHTML = heartsHTML.trim();
}

function updateGameTimer() {
    if (!gameActive) return;
    timeLeft--;
    gameTimerLabel.innerText = timeLeft;
    
    // Estuary fade effect
    const cleanProgress = (30 - timeLeft) / 30;
    estuaryOverlay.style.opacity = cleanProgress * 0.75;
    
    if (timeLeft <= 0) {
        triggerVictory();
    }
}

// Spawn new trash obstacle
function spawnObstacle() {
    if (!gameActive) return;
    
    const imgElement = document.createElement('img');
    const assetIndex = Math.floor(Math.random() * OBSTACLE_ASSETS.length);
    imgElement.src = OBSTACLE_ASSETS[assetIndex];
    imgElement.className = 'obstacle-sprite';
    
    const topPercentage = 15 + Math.random() * 70;
    const speed = 0.35 + Math.random() * 0.3;
    
    imgElement.style.top = `${topPercentage}%`;
    imgElement.style.left = `100%`;
    
    gameRiver.appendChild(imgElement);
    
    obstacles.push({
        element: imgElement,
        x: 100,
        y: topPercentage,
        speed: speed
    });
}

// Game loop logic
function gameLoop() {
    if (!gameActive) return;
    
    // Move obstacles left
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= obs.speed;
        obs.element.style.left = `${obs.x}%`;
        
        // Remove offscreen obstacles
        if (obs.x < -10) {
            obs.element.remove();
            obstacles.splice(i, 1);
            continue;
        }
        
        // Bounding-box Collision Check
        if (!isInvulnerable) {
            const playerRect = player.getBoundingClientRect();
            const obsRect = obs.element.getBoundingClientRect();
            
            if (checkCollision(playerRect, obsRect)) {
                handlePlayerHit();
                
                obs.element.remove();
                obstacles.splice(i, 1);
            }
        }
    }
    
    if (gameActive) {
        gameAnimationFrameId = requestAnimationFrame(gameLoop);
    }
}

// Collision detection with a 20% inner padding for forgiving gameplay
function checkCollision(rect1, rect2) {
    const marginX = rect1.width * 0.2;
    const marginY = rect1.height * 0.2;
    
    return !(
        rect1.right - marginX < rect2.left + marginX ||
        rect1.left + marginX > rect2.right - marginX ||
        rect1.bottom - marginY < rect2.top + marginY ||
        rect1.top + marginY > rect2.bottom - marginY
    );
}

function handlePlayerHit() {
    playBonkSound();
    hearts--;
    updateHeartsUI();
    
    if (hearts <= 0) {
        triggerGameOver();
        return;
    }
    
    // Flash invulnerability
    isInvulnerable = true;
    player.classList.add('hit');
    
    setTimeout(() => {
        player.classList.remove('hit');
        isInvulnerable = false;
    }, 1200);
}

function triggerGameOver() {
    playSadSound();
    stopGameEngine();
    gameOverOverlay.classList.remove('hidden');
}

function triggerVictory() {
    playChimeSound();
    stopGameEngine();
    
    estuaryOverlay.style.opacity = 0.9;
    launchConfetti();
    
    setTimeout(() => {
        gameWinOverlay.classList.remove('hidden');
    }, 1000);
}

function launchConfetti() {
    const colors = ['#ff4444', '#ff007f', '#a832a8', '#3f51b5', '#00e5ff', '#00e676', '#ffea00', '#ff9100'];
    const container = document.getElementById('scene-game');
    
    for (let i = 0; i < 60; i++) {
        const particle = document.createElement('div');
        particle.className = 'confetti-particle';
        
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `-15px`;
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        const size = 6 + Math.random() * 10;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        const duration = 2.4 + Math.random() * 1.8;
        const delay = Math.random() * 0.4;
        particle.style.animationDuration = `${duration}s`;
        particle.style.animationDelay = `${delay}s`;
        
        if (Math.random() > 0.5) {
            particle.style.borderRadius = "0";
        }
        
        container.appendChild(particle);
        setTimeout(() => particle.remove(), (duration + delay) * 1000);
    }
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
    
    // Replay buttons
    document.getElementById('btn-restart').addEventListener('click', () => {
        playChimeSound();
        startGameEngine();
    });
    
    document.getElementById('btn-replay').addEventListener('click', () => {
        playChimeSound();
        startGameEngine();
    });
});
