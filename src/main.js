import { HandTracker } from './handTracker.js';
import { GestureDetector, STATE } from './gestures.js';
import { SceneManager } from './scene.js';
import { ParticleSystem } from './particles.js';
import { EffectsManager } from './effects.js';
import { AudioManager } from './audio.js';
import { UIManager } from './ui.js';

const tracker = new HandTracker();
const gestures = new GestureDetector();
const audio = new AudioManager();
const ui = new UIManager();
const video = document.getElementById('webcam');
const container = document.getElementById('canvas-container');
const loadingScreen = document.getElementById('loading-screen');
const loadingFill = document.getElementById('loading-fill');

let scene, particles, effects;
let prevState = STATE.IDLE;

async function start() {
  let isSwitchingCamera = false;

  loadingFill.style.width = '20%';

  scene = new SceneManager(container);
  particles = new ParticleSystem(scene.effectsGroup);
  effects = new EffectsManager(scene, particles);
  loadingFill.style.width = '35%';

  try {
    // Parallelize camera permission/stream request and MediaPipe Hand Landmarker model loading
    const [stream, _] = await Promise.all([
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      }),
      tracker.init()
    ]);

    loadingFill.style.width = '75%';
    video.srcObject = stream;
    await video.play();

    scene.setupWebcam(video);
    loadingFill.style.width = '100%';
  } catch (err) {
    console.error("Initialization error:", err);
    loadingScreen.innerHTML = `<div id="loading-text">HATA</div><div id="loading-subtitle" style="padding: 10px; color: #ff3333; font-family: monospace; font-size: 14px; margin-top: 15px;">Kamera veya model yüklenemedi:<br>${err.message}</div>`;
    return;
  }

  setTimeout(() => loadingScreen.classList.add('hidden'), 500);

  // Guide Panel controls
  const guidePanel = document.getElementById('guide-panel');
  const guideOpenBtn = document.getElementById('guide-open-btn');
  const guideCloseBtn = document.getElementById('guide-close-btn');
  const guideCloseBottomBtn = document.getElementById('guide-close-bottom-btn');

  const closeGuide = () => {
    guidePanel.classList.remove('visible');
    guideOpenBtn.classList.remove('hidden');
  };

  const openGuide = () => {
    guidePanel.classList.add('visible');
    guideOpenBtn.classList.add('hidden');
  };

  guideCloseBtn.addEventListener('click', closeGuide);
  guideCloseBottomBtn.addEventListener('click', closeGuide);
  guideOpenBtn.addEventListener('click', openGuide);

  // Camera toggle logic
  const cameraToggleBtn = document.getElementById('camera-toggle-btn');
  let currentFacingMode = 'user';

  cameraToggleBtn.addEventListener('click', async () => {
    if (isSwitchingCamera) return; // Prevent double clicks
    
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    isSwitchingCamera = true;
    
    // Show loading screen while switching
    loadingScreen.classList.remove('hidden');
    loadingFill.style.width = '30%';

    try {
      // Stop old camera tracks
      if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
      }
      
      // Delay to release camera hardware on mobile devices
      await new Promise(resolve => setTimeout(resolve, 300));
      loadingFill.style.width = '60%';

      // Request new camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      video.srcObject = stream;
      await video.play();
      loadingFill.style.width = '80%';

      // Update state
      currentFacingMode = newFacingMode;
      const isMirrored = newFacingMode === 'user';
      scene.mirrored = isMirrored;
      gestures.mirrored = isMirrored;

      // Update Three.js video scaling/mirroring
      scene.updateVideoScale();
      
      loadingFill.style.width = '100%';
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
        isSwitchingCamera = false;
      }, 400);
    } catch (error) {
      console.error('Kamera geçiş hatası:', error);
      loadingScreen.classList.add('hidden');
      isSwitchingCamera = false;
      alert('Kamera geçişi başarısız oldu. Cihazınızda diğer kamera bulunmuyor veya izin verilmedi.');
    }
  });

  // Unlock audio on first interaction
  const unlockAudio = () => {
    audio.init();
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
  };
  document.addEventListener('click', unlockAudio);
  document.addEventListener('touchstart', unlockAudio);

  let lastTime = performance.now();
  let lastDetectTime = 0;
  const DETECT_INTERVAL = 33; // Target ~30fps for MediaPipe to save battery & CPU

  function loop() {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    // Hand tracking with controlled frequency and transition guard
    if (!isSwitchingCamera && video.readyState >= 2) {
      if (now - lastDetectTime >= DETECT_INTERVAL) {
        tracker.detect(video, now);
        lastDetectTime = now;
      }
    }
    
    const hands = tracker.getHands();
    const result = gestures.update(hands, dt);

    // Detect launch transition for flash
    if (result.state === STATE.LAUNCHING && prevState !== STATE.LAUNCHING) {
      ui.flash();
    }
    prevState = result.state;

    // Update subsystems
    effects.update(result, dt);
    particles.update(dt);
    audio.updateForState(result.state);
    ui.update(result);

    // Render
    scene.render();

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

start().catch(console.error);
