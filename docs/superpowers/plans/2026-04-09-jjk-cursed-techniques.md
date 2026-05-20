# JJK Cursed Technique Effects — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based real-time hand gesture effect system that recreates Gojo's cursed techniques (Red, Blue, Purple, Launch) from Jujutsu Kaisen using webcam input.

**Architecture:** Webcam feeds into MediaPipe Hand Landmarker for 21-point hand tracking. A rule-based gesture recognizer classifies poses (index finger up = technique active) and drives a state machine (IDLE → RED/BLUE → BOTH → MERGE → PURPLE → LAUNCH). Three.js renders the webcam as a background plane with particle effects, energy spheres, and post-processing (bloom, chromatic aberration, vignette) overlaid. HTML/CSS UI shows technique names in Japanese. Web Audio API synthesizes all sound effects.

**Tech Stack:** Vite, Three.js, MediaPipe Tasks-Vision, Web Audio API

**Spec:** `docs/superpowers/specs/2026-04-09-jjk-cursed-techniques-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `index.html` | HTML shell: canvas container, UI overlay divs, script entry point, Google Fonts |
| `style.css` | All styling: fullscreen layout, UI overlay, technique name animations, hand status |
| `src/main.js` | App entry: initializes all modules, runs requestAnimationFrame game loop, coordinates state |
| `src/handTracker.js` | MediaPipe Hand Landmarker setup, webcam stream, processes frames, returns landmarks + handedness |
| `src/gestures.js` | Finger state detection, pose classification (Red/Blue), state machine (IDLE→LAUNCH), merge/launch detection |
| `src/scene.js` | Three.js scene setup: renderer, camera, webcam video texture plane, EffectComposer with bloom/chromatic/vignette |
| `src/particles.js` | Object-pooled particle system: Particle class, ParticleSystem with emit/update/draw, GPU-friendly Points mesh |
| `src/effects.js` | Visual effects: RedEffect, BlueEffect, PurpleEffect, LaunchEffect, HandLandmarkRenderer — each manages its own meshes/particles |
| `src/audio.js` | Web Audio API synth: OscillatorNode chains for each technique, crossfade between states, dynamic volume |
| `src/ui.js` | DOM manipulation: technique name display with animations, status bar updates, header state text |
| `package.json` | Dependencies: three, vite, @mediapipe/tasks-vision |
| `vite.config.js` | Vite config: dev server settings |

---

## Chunk 1: Project Foundation & Hand Tracking

### Task 1: Vite Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `style.css`

- [ ] **Step 1: Initialize package.json**

```json
{
  "name": "jjk-cursed-techniques",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

Write this to `package.json`.

- [ ] **Step 2: Install dependencies**

Run: `npm install three @mediapipe/tasks-vision`
Run: `npm install -D vite`

Expected: `node_modules/` created, `package-lock.json` generated.

- [ ] **Step 3: Create vite.config.js**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true,
    https: false,
  },
  build: {
    target: 'esnext',
  },
});
```

- [ ] **Step 4: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>呪術廻戦 — Cursed Technique System</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@700;900&family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="./style.css" />
</head>
<body>
  <div id="app">
    <!-- Three.js canvas will be injected here -->
    <div id="canvas-container"></div>

    <!-- Hidden video element for webcam -->
    <video id="webcam" autoplay playsinline style="display:none;"></video>

    <!-- UI Overlay -->
    <div id="ui-overlay">
      <div id="header">
        <div id="header-title">呪術廻戦</div>
        <div id="header-subtitle">CURSED TECHNIQUE SYSTEM</div>
        <div id="header-status">IDLE</div>
      </div>

      <div id="technique-name">
        <div id="technique-kanji"></div>
        <div id="technique-label"></div>
      </div>

      <div id="hand-status">
        <div id="hand-left">LEFT: <span class="dot">●</span> <span class="status-text">—</span></div>
        <div id="hand-right">RIGHT: <span class="dot">●</span> <span class="status-text">—</span></div>
      </div>
    </div>

    <!-- Loading screen -->
    <div id="loading-screen">
      <div id="loading-text">呪術廻戦</div>
      <div id="loading-subtitle">Initializing Cursed Energy...</div>
      <div id="loading-bar"><div id="loading-fill"></div></div>
    </div>
  </div>

  <script type="module" src="./src/main.js"></script>
</body>
</html>
```

- [ ] **Step 5: Create style.css**

```css
/* === Reset & Base === */
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
  font-family: 'Orbitron', sans-serif;
  color: #fff;
}

#app {
  position: relative;
  width: 100vw;
  height: 100vh;
}

/* === Canvas Container === */
#canvas-container {
  position: absolute;
  inset: 0;
  z-index: 1;
}

#canvas-container canvas {
  width: 100% !important;
  height: 100% !important;
  display: block;
}

/* === UI Overlay === */
#ui-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
}

/* Header */
#header {
  text-align: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 12px 28px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

#header-title {
  font-family: 'Noto Serif JP', serif;
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 8px;
  background: linear-gradient(135deg, #ff4444, #ff8800, #ff4444);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

#header-subtitle {
  font-size: 10px;
  letter-spacing: 6px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4px;
}

#header-status {
  font-size: 11px;
  letter-spacing: 3px;
  color: rgba(255, 255, 255, 0.3);
  margin-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 8px;
}

/* Technique Name - center screen */
#technique-name {
  text-align: center;
  opacity: 0;
  transform: scale(0.5);
  transition: opacity 0.3s ease-out, transform 0.3s ease-out;
  pointer-events: none;
}

#technique-name.visible {
  opacity: 1;
  transform: scale(1);
}

#technique-kanji {
  font-family: 'Noto Serif JP', serif;
  font-size: 120px;
  font-weight: 900;
  text-shadow: 0 0 40px currentColor, 0 0 80px currentColor;
}

#technique-label {
  font-family: 'Orbitron', sans-serif;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 12px;
  margin-top: -10px;
}

/* Technique Colors */
#technique-name.red { color: #ff3333; }
#technique-name.blue { color: #3366ff; }
#technique-name.purple { color: #aa22ff; }

/* Hand Status */
#hand-status {
  display: flex;
  gap: 40px;
  font-size: 12px;
  letter-spacing: 3px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 10px 24px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.dot {
  font-size: 8px;
  color: rgba(255, 255, 255, 0.3);
}

.dot.active { color: #00ff88; }
.dot.red { color: #ff3333; }
.dot.blue { color: #3366ff; }
.dot.purple { color: #aa22ff; }

.status-text {
  color: rgba(255, 255, 255, 0.4);
}

/* Loading Screen */
#loading-screen {
  position: absolute;
  inset: 0;
  z-index: 100;
  background: #000;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  transition: opacity 0.8s ease;
}

#loading-screen.hidden {
  opacity: 0;
  pointer-events: none;
}

#loading-text {
  font-family: 'Noto Serif JP', serif;
  font-size: 48px;
  font-weight: 900;
  letter-spacing: 12px;
  background: linear-gradient(135deg, #ff4444, #aa22ff, #3366ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

#loading-subtitle {
  font-size: 12px;
  letter-spacing: 4px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 12px;
}

#loading-bar {
  width: 200px;
  height: 2px;
  background: rgba(255, 255, 255, 0.1);
  margin-top: 24px;
  border-radius: 1px;
  overflow: hidden;
}

#loading-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #ff4444, #aa22ff, #3366ff);
  transition: width 0.3s ease;
}

/* Screen Flash */
#app.flash {
  animation: screenFlash 0.3s ease-out;
}

@keyframes screenFlash {
  0% { filter: brightness(3) saturate(0.5); }
  100% { filter: brightness(1) saturate(1); }
}
```

- [ ] **Step 6: Verify dev server starts**

Run: `npm run dev`
Expected: Vite dev server starts, opens browser, shows black screen with loading animation.

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Vite project with HTML shell and CSS design system"
```

---

### Task 2: MediaPipe Hand Tracker

**Files:**
- Create: `src/handTracker.js`

- [ ] **Step 1: Create handTracker.js**

```js
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export class HandTracker {
  constructor() {
    this.handLandmarker = null;
    this.lastTimestamp = 0;
    this.results = null;
  }

  async init() {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
        delegate: 'GPU',
      },
      numHands: 2,
      runningMode: 'VIDEO',
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }

  detect(videoElement, timestamp) {
    if (!this.handLandmarker || timestamp === this.lastTimestamp) return this.results;
    this.lastTimestamp = timestamp;

    this.results = this.handLandmarker.detectForVideo(videoElement, timestamp);
    return this.results;
  }

  getHands() {
    if (!this.results || !this.results.landmarks) return [];

    return this.results.landmarks.map((landmarks, i) => {
      const handedness = this.results.handednesses[i]?.[0];
      // MediaPipe reports handedness as seen from camera (mirrored)
      // So "Left" from MediaPipe = user's right hand when mirrored
      const label = handedness?.categoryName === 'Left' ? 'Right' : 'Left';
      return { landmarks, label, score: handedness?.score || 0 };
    });
  }

  destroy() {
    if (this.handLandmarker) {
      this.handLandmarker.close();
      this.handLandmarker = null;
    }
  }
}
```

- [ ] **Step 2: Test by wiring into a temporary main.js**

Create a minimal `src/main.js` that initializes the tracker, starts webcam, and logs detected hand count:

```js
import { HandTracker } from './handTracker.js';

const tracker = new HandTracker();
const video = document.getElementById('webcam');
const loadingScreen = document.getElementById('loading-screen');
const loadingFill = document.getElementById('loading-fill');

async function start() {
  loadingFill.style.width = '30%';

  // Start webcam
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: 1280, height: 720 },
  });
  video.srcObject = stream;
  await video.play();
  loadingFill.style.width = '60%';

  // Init hand tracker
  await tracker.init();
  loadingFill.style.width = '100%';

  // Hide loading
  setTimeout(() => loadingScreen.classList.add('hidden'), 500);

  // Detection loop
  function loop() {
    const now = performance.now();
    tracker.detect(video, now);
    const hands = tracker.getHands();
    if (hands.length > 0) {
      console.log(`Hands: ${hands.map(h => h.label).join(', ')}`);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

start().catch(console.error);
```

- [ ] **Step 3: Run dev server and verify hand detection**

Run: `npm run dev`
Expected: Camera starts, loading screen fades, console logs "Hands: Right" or "Hands: Left, Right" when hands are visible.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add MediaPipe hand tracking with webcam integration"
```

---

### Task 3: Gesture Detection & State Machine

**Files:**
- Create: `src/gestures.js`

- [ ] **Step 1: Create gestures.js**

```js
// State constants
export const STATE = {
  IDLE: 'IDLE',
  RED_ACTIVE: 'RED_ACTIVE',
  BLUE_ACTIVE: 'BLUE_ACTIVE',
  BOTH_ACTIVE: 'BOTH_ACTIVE',
  MERGING: 'MERGING',
  PURPLE_READY: 'PURPLE_READY',
  LAUNCHING: 'LAUNCHING',
};

// Landmark indices
const WRIST = 0;
const INDEX_TIP = 8;
const INDEX_PIP = 6;
const MIDDLE_TIP = 12;
const MIDDLE_PIP = 10;
const RING_TIP = 16;
const RING_PIP = 14;
const PINKY_TIP = 20;
const PINKY_PIP = 18;
const PALM_BASE = 9; // middle finger MCP — approximates palm center

const MERGE_THRESHOLD = 0.15; // normalized distance between wrists
const LAUNCH_SCALE_VELOCITY = 0.4; // hand scale change per second
const MERGE_DURATION = 1000; // ms to hold merge before purple forms

export class GestureDetector {
  constructor() {
    this.state = STATE.IDLE;
    this.mergeStartTime = 0;
    this.launchStartTime = 0;
    this.prevHandScale = null;
    this.redHand = null;   // landmarks for red-active hand
    this.blueHand = null;  // landmarks for blue-active hand
    this.palmPositions = { left: null, right: null };
  }

  /**
   * Check if a specific finger is extended.
   * In normalized coords y=0 is top, y=1 is bottom.
   * Extended = tip is above (lower y) than PIP joint.
   */
  isFingerExtended(landmarks, tipIdx, pipIdx) {
    return landmarks[tipIdx].y < landmarks[pipIdx].y;
  }

  /**
   * Detect the "technique pose": index finger up, other fingers curled
   */
  isTechniquePose(landmarks) {
    const indexUp = this.isFingerExtended(landmarks, INDEX_TIP, INDEX_PIP);
    const middleDown = !this.isFingerExtended(landmarks, MIDDLE_TIP, MIDDLE_PIP);
    const ringDown = !this.isFingerExtended(landmarks, RING_TIP, RING_PIP);
    const pinkyDown = !this.isFingerExtended(landmarks, PINKY_TIP, PINKY_PIP);
    return indexUp && middleDown && ringDown && pinkyDown;
  }

  /**
   * Get palm center position from landmarks (use middle finger MCP as approximation)
   */
  getPalmCenter(landmarks) {
    return { x: landmarks[PALM_BASE].x, y: landmarks[PALM_BASE].y, z: landmarks[PALM_BASE].z };
  }

  /**
   * Calculate hand scale (distance between wrist and middle fingertip)
   * Larger scale = hand closer to camera
   */
  getHandScale(landmarks) {
    const dx = landmarks[WRIST].x - landmarks[MIDDLE_TIP].x;
    const dy = landmarks[WRIST].y - landmarks[MIDDLE_TIP].y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Distance between two normalized points
   */
  distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Main update — called every frame with detected hands
   * @param {Array} hands - [{landmarks, label}]
   * @param {number} dt - delta time in seconds
   * @returns {object} current state + metadata
   */
  update(hands, dt) {
    let rightHand = null;
    let leftHand = null;

    for (const hand of hands) {
      if (hand.label === 'Right') rightHand = hand.landmarks;
      if (hand.label === 'Left') leftHand = hand.landmarks;
    }

    // Track palm positions for effects
    this.palmPositions.right = rightHand ? this.getPalmCenter(rightHand) : null;
    this.palmPositions.left = leftHand ? this.getPalmCenter(leftHand) : null;

    const rightPose = rightHand && this.isTechniquePose(rightHand);
    const leftPose = leftHand && this.isTechniquePose(leftHand);

    // If launching, wait for animation to complete
    if (this.state === STATE.LAUNCHING) {
      const elapsed = performance.now() - this.launchStartTime;
      if (elapsed > 2000) {
        this.state = STATE.IDLE;
      }
      return this.getResult(hands);
    }

    // No hands or no poses → fade to IDLE
    if (!rightPose && !leftPose) {
      this.state = STATE.IDLE;
      this.mergeStartTime = 0;
      this.redHand = null;
      this.blueHand = null;
      return this.getResult(hands);
    }

    // Detect individual poses
    const redActive = rightPose;
    const blueActive = leftPose;

    this.redHand = redActive ? rightHand : null;
    this.blueHand = blueActive ? leftHand : null;

    if (redActive && blueActive) {
      // Both hands active — check for merge
      const wristDist = this.distance(
        rightHand[WRIST],
        leftHand[WRIST]
      );

      if (wristDist < MERGE_THRESHOLD) {
        if (this.state !== STATE.MERGING && this.state !== STATE.PURPLE_READY) {
          this.state = STATE.MERGING;
          if (this.mergeStartTime === 0) this.mergeStartTime = performance.now();
        }

        // Check if merge duration exceeded → purple ready
        if (this.state === STATE.MERGING) {
          const mergeElapsed = performance.now() - this.mergeStartTime;
          if (mergeElapsed > MERGE_DURATION) {
            this.state = STATE.PURPLE_READY;
          }
        }

        // Check for launch (hand pushing toward camera)
        if (this.state === STATE.PURPLE_READY) {
          const currentScale = this.getHandScale(rightHand);
          if (this.prevHandScale !== null) {
            const scaleVelocity = (currentScale - this.prevHandScale) / dt;
            if (scaleVelocity > LAUNCH_SCALE_VELOCITY) {
              this.state = STATE.LAUNCHING;
              this.launchStartTime = performance.now();
            }
          }
          this.prevHandScale = currentScale;
        }
      } else {
        this.state = STATE.BOTH_ACTIVE;
        this.mergeStartTime = 0;
      }
    } else if (redActive) {
      this.state = STATE.RED_ACTIVE;
      this.mergeStartTime = 0;
    } else if (blueActive) {
      this.state = STATE.BLUE_ACTIVE;
      this.mergeStartTime = 0;
    }

    return this.getResult(hands);
  }

  getResult(hands) {
    return {
      state: this.state,
      palmPositions: { ...this.palmPositions },
      redHand: this.redHand,
      blueHand: this.blueHand,
      hands,
      mergeProgress: this.state === STATE.MERGING
        ? Math.min(1, (performance.now() - this.mergeStartTime) / MERGE_DURATION)
        : this.state === STATE.PURPLE_READY || this.state === STATE.LAUNCHING ? 1 : 0,
      launchProgress: this.state === STATE.LAUNCHING
        ? Math.min(1, (performance.now() - this.launchStartTime) / 2000)
        : 0,
    };
  }
}
```

- [ ] **Step 2: Update main.js to use gesture detector and display state**

Replace `src/main.js` to use GestureDetector, display the current state in the header status:

```js
import { HandTracker } from './handTracker.js';
import { GestureDetector } from './gestures.js';

const tracker = new HandTracker();
const gestures = new GestureDetector();
const video = document.getElementById('webcam');
const loadingScreen = document.getElementById('loading-screen');
const loadingFill = document.getElementById('loading-fill');
const headerStatus = document.getElementById('header-status');

async function start() {
  loadingFill.style.width = '30%';

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: 1280, height: 720 },
  });
  video.srcObject = stream;
  await video.play();
  loadingFill.style.width = '60%';

  await tracker.init();
  loadingFill.style.width = '100%';

  setTimeout(() => loadingScreen.classList.add('hidden'), 500);

  let lastTime = performance.now();

  function loop() {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    tracker.detect(video, now);
    const hands = tracker.getHands();
    const result = gestures.update(hands, dt);

    headerStatus.textContent = result.state;

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

start().catch(console.error);
```

- [ ] **Step 3: Run and verify gesture states**

Run: `npm run dev`
Expected: Header status shows "IDLE" normally. When right hand makes index-finger-up pose → "RED_ACTIVE". Left hand → "BLUE_ACTIVE". Both hands → "BOTH_ACTIVE". Hands close → "MERGING" → "PURPLE_READY".

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add gesture detection with state machine (Red/Blue/Merge/Purple/Launch)"
```

---

## Chunk 2: Three.js Scene & Visual Effects

### Task 4: Three.js Scene with Webcam Background

**Files:**
- Create: `src/scene.js`
- Modify: `src/main.js`

- [ ] **Step 1: Create scene.js**

```js
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Custom Chromatic Aberration shader
const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float amount;
    varying vec2 vUv;
    void main() {
      vec2 offset = amount * (vUv - 0.5);
      vec4 cr = texture2D(tDiffuse, vUv + offset);
      vec4 cg = texture2D(tDiffuse, vUv);
      vec4 cb = texture2D(tDiffuse, vUv - offset);
      gl_FragColor = vec4(cr.r, cg.g, cb.b, 1.0);
    }
  `,
};

// Custom Vignette shader
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    darkness: { value: 1.0 },
    offset: { value: 1.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float darkness;
    uniform float offset;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - 0.5) * 2.0;
      float vig = clamp(1.0 - dot(uv, uv) * darkness + offset, 0.0, 1.0);
      gl_FragColor = vec4(texel.rgb * vig, texel.a);
    }
  `,
};

export class SceneManager {
  constructor(container) {
    this.container = container;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();

    // Orthographic camera for 2D overlay style
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 100);
    this.camera.position.z = 1;

    // Video texture (will be set later)
    this.videoTexture = null;
    this.videoMesh = null;

    // Effects group — all effects go here
    this.effectsGroup = new THREE.Group();
    this.scene.add(this.effectsGroup);

    // Post-processing
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.8,  // strength
      0.4,  // radius
      0.2   // threshold
    );
    this.composer.addPass(this.bloomPass);

    this.chromaticPass = new ShaderPass(ChromaticAberrationShader);
    this.chromaticPass.uniforms.amount.value = 0.0;
    this.composer.addPass(this.chromaticPass);

    this.vignettePass = new ShaderPass(VignetteShader);
    this.vignettePass.uniforms.darkness.value = 0.6;
    this.vignettePass.uniforms.offset.value = 1.2;
    this.composer.addPass(this.vignettePass);

    // Screen shake
    this.shakeAmount = 0;
    this.shakeDecay = 0.92;

    // Resize
    window.addEventListener('resize', () => this.onResize());
  }

  setupWebcam(videoElement) {
    this.videoTexture = new THREE.VideoTexture(videoElement);
    this.videoTexture.minFilter = THREE.LinearFilter;
    this.videoTexture.magFilter = THREE.LinearFilter;
    this.videoTexture.colorSpace = THREE.SRGBColorSpace;

    const videoAspect = videoElement.videoWidth / videoElement.videoHeight;
    const screenAspect = window.innerWidth / window.innerHeight;
    const cameraAspect = screenAspect;

    // Scale plane to cover screen, maintaining video aspect ratio
    let scaleX, scaleY;
    if (videoAspect > cameraAspect) {
      scaleY = 2;
      scaleX = scaleY * videoAspect;
    } else {
      scaleX = 2 * cameraAspect;
      scaleY = scaleX / videoAspect;
    }

    const geometry = new THREE.PlaneGeometry(scaleX, scaleY);
    const material = new THREE.MeshBasicMaterial({
      map: this.videoTexture,
      side: THREE.FrontSide,
    });

    this.videoMesh = new THREE.Mesh(geometry, material);
    // Mirror the video (flip X) so it looks like a mirror
    this.videoMesh.scale.x = -1;
    this.videoMesh.position.z = -1; // behind effects
    this.scene.add(this.videoMesh);
  }

  /**
   * Convert normalized landmark position (0-1) to scene coordinates.
   * Accounts for the mirrored video.
   */
  landmarkToScene(landmark) {
    const aspect = window.innerWidth / window.innerHeight;
    return new THREE.Vector3(
      ((1 - landmark.x) - 0.5) * 2 * aspect,  // mirror X
      (0.5 - landmark.y) * 2,                   // flip Y
      0
    );
  }

  setBloom(strength, radius, threshold) {
    this.bloomPass.strength = strength;
    this.bloomPass.radius = radius;
    this.bloomPass.threshold = threshold;
  }

  setChromaticAberration(amount) {
    this.chromaticPass.uniforms.amount.value = amount;
  }

  shake(amount) {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
  }

  render() {
    // Apply screen shake
    if (this.shakeAmount > 0.001) {
      const sx = (Math.random() - 0.5) * this.shakeAmount;
      const sy = (Math.random() - 0.5) * this.shakeAmount;
      this.camera.position.x = sx;
      this.camera.position.y = sy;
      this.shakeAmount *= this.shakeDecay;
    } else {
      this.camera.position.x = 0;
      this.camera.position.y = 0;
    }

    this.composer.render();
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;

    this.camera.left = -aspect;
    this.camera.right = aspect;
    this.camera.top = 1;
    this.camera.bottom = -1;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloomPass.resolution.set(w, h);
  }

  dispose() {
    this.renderer.dispose();
    if (this.videoTexture) this.videoTexture.dispose();
  }
}
```

- [ ] **Step 2: Update main.js to wire SceneManager**

Replace `src/main.js`:

```js
import { HandTracker } from './handTracker.js';
import { GestureDetector } from './gestures.js';
import { SceneManager } from './scene.js';

const tracker = new HandTracker();
const gestures = new GestureDetector();
const video = document.getElementById('webcam');
const container = document.getElementById('canvas-container');
const loadingScreen = document.getElementById('loading-screen');
const loadingFill = document.getElementById('loading-fill');
const headerStatus = document.getElementById('header-status');

let scene;

async function start() {
  loadingFill.style.width = '20%';

  // Init Three.js scene
  scene = new SceneManager(container);
  loadingFill.style.width = '30%';

  // Start webcam
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: 1280, height: 720 },
  });
  video.srcObject = stream;
  await video.play();
  loadingFill.style.width = '50%';

  // Setup webcam as background
  scene.setupWebcam(video);
  loadingFill.style.width = '70%';

  // Init hand tracker
  await tracker.init();
  loadingFill.style.width = '100%';

  setTimeout(() => loadingScreen.classList.add('hidden'), 500);

  let lastTime = performance.now();

  function loop() {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    // Hand tracking
    tracker.detect(video, now);
    const hands = tracker.getHands();
    const result = gestures.update(hands, dt);

    // UI update
    headerStatus.textContent = result.state;

    // Render
    scene.render();

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

start().catch(console.error);
```

- [ ] **Step 3: Run and verify webcam background + post-processing**

Run: `npm run dev`
Expected: Webcam visible as mirrored fullscreen background, slight vignette visible on edges, bloom subtly active.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add Three.js scene with webcam background and post-processing pipeline"
```

---

### Task 5: Particle System

**Files:**
- Create: `src/particles.js`

- [ ] **Step 1: Create particles.js**

```js
import * as THREE from 'three';

/**
 * A single particle's data. Stored in typed arrays for GPU upload.
 */
const MAX_PARTICLES = 2000;

export class ParticleSystem {
  constructor(scene) {
    // Particle data (CPU side)
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.velocities = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);
    this.lifetimes = new Float32Array(MAX_PARTICLES);  // remaining life in seconds
    this.maxLifetimes = new Float32Array(MAX_PARTICLES);
    this.alive = new Uint8Array(MAX_PARTICLES);

    this.count = MAX_PARTICLES;
    this.activeCount = 0;

    // Three.js geometry
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    // Custom shader material for soft glowing particles
    this.material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          alpha *= alpha; // squared falloff for softer glow
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    scene.add(this.points);
  }

  /**
   * Emit particles
   * @param {object} config
   * @param {THREE.Vector3} config.position - emission center
   * @param {number} config.count - number to emit
   * @param {THREE.Color} config.color - particle color
   * @param {number} config.speed - initial speed
   * @param {number} config.spread - angular spread (radians)
   * @param {number} config.lifetime - seconds
   * @param {number} config.size - particle size
   * @param {string} config.pattern - 'radial' | 'inward' | 'orbital'
   * @param {THREE.Vector3} [config.target] - target position for 'inward' pattern
   * @param {number} [config.angle] - base angle for directional emission
   */
  emit(config) {
    const {
      position, count, color, speed, spread, lifetime, size,
      pattern = 'radial', target = null,
    } = config;

    let emitted = 0;
    for (let i = 0; i < this.count && emitted < count; i++) {
      if (this.alive[i]) continue;

      this.alive[i] = 1;
      emitted++;

      const i3 = i * 3;
      // Position with slight random offset
      this.positions[i3] = position.x + (Math.random() - 0.5) * 0.02;
      this.positions[i3 + 1] = position.y + (Math.random() - 0.5) * 0.02;
      this.positions[i3 + 2] = position.z || 0;

      // Velocity based on pattern
      const angle = Math.random() * Math.PI * 2;
      const spd = speed * (0.5 + Math.random() * 0.5);

      if (pattern === 'radial') {
        this.velocities[i3] = Math.cos(angle) * spd;
        this.velocities[i3 + 1] = Math.sin(angle) * spd;
        this.velocities[i3 + 2] = 0;
      } else if (pattern === 'inward' && target) {
        const dx = target.x - this.positions[i3];
        const dy = target.y - this.positions[i3 + 1];
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        // Start from outside, move toward target
        this.positions[i3] = target.x + Math.cos(angle) * spread * 0.3;
        this.positions[i3 + 1] = target.y + Math.sin(angle) * spread * 0.3;
        const dx2 = target.x - this.positions[i3];
        const dy2 = target.y - this.positions[i3 + 1];
        const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 0.01;
        this.velocities[i3] = (dx2 / dist2) * spd;
        this.velocities[i3 + 1] = (dy2 / dist2) * spd;
        this.velocities[i3 + 2] = 0;
      } else if (pattern === 'orbital') {
        // Circular orbit around position
        const orbitRadius = 0.05 + Math.random() * 0.1;
        this.positions[i3] = position.x + Math.cos(angle) * orbitRadius;
        this.positions[i3 + 1] = position.y + Math.sin(angle) * orbitRadius;
        // Tangential velocity
        this.velocities[i3] = -Math.sin(angle) * spd;
        this.velocities[i3 + 1] = Math.cos(angle) * spd;
        this.velocities[i3 + 2] = 0;
      }

      // Color
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;

      // Size and lifetime
      this.sizes[i] = size * (0.5 + Math.random() * 0.5);
      this.lifetimes[i] = lifetime * (0.7 + Math.random() * 0.3);
      this.maxLifetimes[i] = this.lifetimes[i];
    }
  }

  update(dt) {
    this.activeCount = 0;

    for (let i = 0; i < this.count; i++) {
      if (!this.alive[i]) continue;

      this.lifetimes[i] -= dt;
      if (this.lifetimes[i] <= 0) {
        this.alive[i] = 0;
        this.sizes[i] = 0;
        continue;
      }

      this.activeCount++;
      const i3 = i * 3;
      const lifeRatio = this.lifetimes[i] / this.maxLifetimes[i];

      // Update position
      this.positions[i3] += this.velocities[i3] * dt;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * dt;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * dt;

      // Fade out size near death
      this.sizes[i] *= (lifeRatio > 0.3 ? 1.0 : lifeRatio / 0.3);

      // Slight velocity damping
      this.velocities[i3] *= 0.98;
      this.velocities[i3 + 1] *= 0.98;
    }

    // Upload to GPU
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
```

- [ ] **Step 2: Quick visual test — emit particles on click**

Temporarily add to main.js loop: if any hand detected, emit 5 red particles at palm position each frame. Verify glowing additive particles appear in scene.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add object-pooled GPU particle system with radial/inward/orbital patterns"
```

---

### Task 6: Visual Effects (Red, Blue, Purple, Launch)

**Files:**
- Create: `src/effects.js`
- Modify: `src/main.js`

- [ ] **Step 1: Create effects.js**

```js
import * as THREE from 'three';

/**
 * Manages all cursed technique visual effects.
 * Each technique creates/manages its own Three.js objects.
 */
export class EffectsManager {
  constructor(sceneManager, particles) {
    this.scene = sceneManager;
    this.particles = particles;
    this.effectsGroup = sceneManager.effectsGroup;

    // Shared glow sprite texture (generated)
    this.glowTexture = this.createGlowTexture();

    // Red energy sphere
    this.redSphere = this.createEnergySphere(new THREE.Color(1, 0.2, 0.1));
    this.effectsGroup.add(this.redSphere);

    // Blue energy sphere
    this.blueSphere = this.createEnergySphere(new THREE.Color(0.1, 0.3, 1.0));
    this.effectsGroup.add(this.blueSphere);

    // Purple energy sphere (larger)
    this.purpleSphere = this.createEnergySphere(new THREE.Color(0.6, 0.1, 1.0), 1.5);
    this.effectsGroup.add(this.purpleSphere);

    // Energy ring for launch
    this.ring = this.createEnergyRing();
    this.effectsGroup.add(this.ring);

    // Spiral rings for blue effect
    this.spiralRings = [];
    for (let i = 0; i < 3; i++) {
      const ring = this.createSpiralRing(new THREE.Color(0.2, 0.4, 1.0), 0.06 + i * 0.04);
      this.effectsGroup.add(ring);
      this.spiralRings.push(ring);
    }

    // Energy arcs (lines between merging spheres)
    this.arcMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    // Hand landmark visualization
    this.landmarkMeshes = { left: null, right: null };

    // Time tracking for animations
    this.time = 0;

    // Hide everything initially
    this.hideAll();
  }

  createGlowTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  createEnergySphere(color, sizeMultiplier = 1) {
    const material = new THREE.SpriteMaterial({
      map: this.glowTexture,
      color: color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.9,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.15 * sizeMultiplier, 0.15 * sizeMultiplier, 1);
    sprite.visible = false;
    return sprite;
  }

  createEnergyRing() {
    const geometry = new THREE.RingGeometry(0.12, 0.14, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0xaa22ff,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    return mesh;
  }

  createSpiralRing(color, radius) {
    const geometry = new THREE.RingGeometry(radius - 0.005, radius + 0.005, 64);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    return mesh;
  }

  hideAll() {
    this.redSphere.visible = false;
    this.blueSphere.visible = false;
    this.purpleSphere.visible = false;
    this.ring.visible = false;
    this.spiralRings.forEach(r => r.visible = false);
  }

  /**
   * Render hand landmarks as glowing dots and lines
   */
  renderLandmarks(hands, state) {
    // Remove old landmark meshes from scene
    for (const key of ['left', 'right']) {
      if (this.landmarkMeshes[key]) {
        this.effectsGroup.remove(this.landmarkMeshes[key]);
        this.landmarkMeshes[key].traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
        this.landmarkMeshes[key] = null;
      }
    }

    // Determine landmark color based on state
    const colorMap = {
      IDLE: 0x00ddff,
      RED_ACTIVE: 0xff3333,
      BLUE_ACTIVE: 0x3366ff,
      BOTH_ACTIVE: 0xffaa00,
      MERGING: 0xaa22ff,
      PURPLE_READY: 0xaa22ff,
      LAUNCHING: 0xaa22ff,
    };

    for (const hand of hands) {
      const group = new THREE.Group();
      const landmarks = hand.landmarks;
      const handColor = hand.label === 'Right' ?
        (state === 'RED_ACTIVE' || state === 'BOTH_ACTIVE' || state === 'MERGING' || state === 'PURPLE_READY' || state === 'LAUNCHING' ? 0xff3333 : 0x00ddff) :
        (state === 'BLUE_ACTIVE' || state === 'BOTH_ACTIVE' || state === 'MERGING' || state === 'PURPLE_READY' || state === 'LAUNCHING' ? 0x3366ff : 0x00ddff);

      // Draw connections
      const connections = [
        [0,1],[1,2],[2,3],[3,4],
        [0,5],[5,6],[6,7],[7,8],
        [0,9],[9,10],[10,11],[11,12],
        [0,13],[13,14],[14,15],[15,16],
        [0,17],[17,18],[18,19],[19,20],
        [5,9],[9,13],[13,17],
      ];

      for (const [a, b] of connections) {
        const pA = this.scene.landmarkToScene(landmarks[a]);
        const pB = this.scene.landmarkToScene(landmarks[b]);
        const geom = new THREE.BufferGeometry().setFromPoints([pA, pB]);
        const mat = new THREE.LineBasicMaterial({
          color: handColor,
          transparent: true,
          opacity: 0.6,
          blending: THREE.AdditiveBlending,
        });
        group.add(new THREE.Line(geom, mat));
      }

      // Draw dots at each landmark
      for (let i = 0; i < landmarks.length; i++) {
        const pos = this.scene.landmarkToScene(landmarks[i]);
        const dotMat = new THREE.SpriteMaterial({
          map: this.glowTexture,
          color: handColor,
          transparent: true,
          blending: THREE.AdditiveBlending,
          opacity: 0.8,
        });
        const dot = new THREE.Sprite(dotMat);
        dot.position.copy(pos);
        dot.scale.set(0.015, 0.015, 1);
        group.add(dot);
      }

      this.effectsGroup.add(group);
      this.landmarkMeshes[hand.label.toLowerCase()] = group;
    }
  }

  /**
   * Main update, called every frame
   */
  update(gestureResult, dt) {
    this.time += dt;
    const { state, palmPositions, redHand, blueHand, mergeProgress, launchProgress } = gestureResult;

    this.hideAll();

    // Render hand landmarks
    this.renderLandmarks(gestureResult.hands, state);

    // === RED EFFECT ===
    if (state === 'RED_ACTIVE' || state === 'BOTH_ACTIVE') {
      if (palmPositions.right) {
        const pos = this.scene.landmarkToScene(palmPositions.right);
        this.redSphere.visible = true;
        this.redSphere.position.copy(pos);

        // Pulsing scale
        const pulse = 1 + Math.sin(this.time * 8) * 0.15;
        this.redSphere.scale.set(0.15 * pulse, 0.15 * pulse, 1);

        // Emit outward particles
        this.particles.emit({
          position: pos,
          count: 3,
          color: new THREE.Color(1, 0.3, 0.1),
          speed: 0.3,
          spread: Math.PI * 2,
          lifetime: 0.8,
          size: 0.02,
          pattern: 'radial',
        });

        this.scene.shake(0.002);
        this.scene.setBloom(1.2, 0.5, 0.15);
      }
    }

    // === BLUE EFFECT ===
    if (state === 'BLUE_ACTIVE' || state === 'BOTH_ACTIVE') {
      if (palmPositions.left) {
        const pos = this.scene.landmarkToScene(palmPositions.left);
        this.blueSphere.visible = true;
        this.blueSphere.position.copy(pos);

        // Pulsing
        const pulse = 1 + Math.sin(this.time * 6) * 0.1;
        this.blueSphere.scale.set(0.12 * pulse, 0.12 * pulse, 1);

        // Spiral rings rotate around palm
        this.spiralRings.forEach((ring, idx) => {
          ring.visible = true;
          ring.position.copy(pos);
          ring.rotation.z = this.time * (2 + idx) + idx * Math.PI * 0.66;
          ring.rotation.x = Math.sin(this.time * 0.5 + idx) * 0.3;
          const scale = 1 + Math.sin(this.time * 3 + idx) * 0.2;
          ring.scale.set(scale, scale, 1);
        });

        // Emit inward particles
        this.particles.emit({
          position: pos,
          count: 3,
          color: new THREE.Color(0.2, 0.5, 1.0),
          speed: 0.2,
          spread: 0.3,
          lifetime: 0.6,
          size: 0.015,
          pattern: 'inward',
          target: pos,
        });

        this.scene.setBloom(1.0, 0.5, 0.2);
      }
    }

    // === MERGING ===
    if (state === 'MERGING') {
      if (palmPositions.right && palmPositions.left) {
        const posR = this.scene.landmarkToScene(palmPositions.right);
        const posL = this.scene.landmarkToScene(palmPositions.left);
        const center = new THREE.Vector3().addVectors(posR, posL).multiplyScalar(0.5);

        // Red and blue orbit around center
        const orbitAngle = this.time * 4;
        const orbitRadius = 0.06 * (1 - mergeProgress * 0.8);

        this.redSphere.visible = true;
        this.redSphere.position.set(
          center.x + Math.cos(orbitAngle) * orbitRadius,
          center.y + Math.sin(orbitAngle) * orbitRadius,
          0
        );

        this.blueSphere.visible = true;
        this.blueSphere.position.set(
          center.x - Math.cos(orbitAngle) * orbitRadius,
          center.y - Math.sin(orbitAngle) * orbitRadius,
          0
        );

        // Orbital particles
        this.particles.emit({
          position: center,
          count: 5,
          color: new THREE.Color(0.6, 0.1, 1.0),
          speed: 0.15,
          spread: 0.1,
          lifetime: 0.5,
          size: 0.015,
          pattern: 'orbital',
        });

        this.scene.setBloom(1.5, 0.6, 0.1);
        this.scene.setChromaticAberration(0.002 * mergeProgress);
        this.scene.shake(0.003 * mergeProgress);
      }
    }

    // === PURPLE READY ===
    if (state === 'PURPLE_READY') {
      if (palmPositions.right && palmPositions.left) {
        const posR = this.scene.landmarkToScene(palmPositions.right);
        const posL = this.scene.landmarkToScene(palmPositions.left);
        const center = new THREE.Vector3().addVectors(posR, posL).multiplyScalar(0.5);

        this.purpleSphere.visible = true;
        this.purpleSphere.position.copy(center);

        const pulse = 1 + Math.sin(this.time * 5) * 0.2;
        this.purpleSphere.scale.set(0.2 * pulse, 0.2 * pulse, 1);

        // Ring behind
        this.ring.visible = true;
        this.ring.position.copy(center);
        this.ring.rotation.z = this.time * 1.5;
        this.ring.scale.set(1 + Math.sin(this.time * 3) * 0.1, 1 + Math.sin(this.time * 3) * 0.1, 1);

        // Intense particles
        this.particles.emit({
          position: center,
          count: 8,
          color: new THREE.Color(0.7, 0.2, 1.0),
          speed: 0.2,
          spread: 0.15,
          lifetime: 0.7,
          size: 0.02,
          pattern: 'orbital',
        });

        this.scene.setBloom(2.0, 0.7, 0.05);
        this.scene.setChromaticAberration(0.004);
        this.scene.shake(0.004);
      }
    }

    // === LAUNCHING ===
    if (state === 'LAUNCHING') {
      const progress = launchProgress;

      // Purple sphere flies forward (scales up and fades)
      this.purpleSphere.visible = true;
      const startY = 0;
      this.purpleSphere.position.set(0, startY, 0);
      const launchScale = 0.2 + progress * 2.0;
      this.purpleSphere.scale.set(launchScale, launchScale, 1);
      this.purpleSphere.material.opacity = Math.max(0, 1 - progress);

      // Ring expands
      this.ring.visible = true;
      this.ring.position.set(0, startY, 0);
      this.ring.rotation.z = this.time * 3;
      const ringScale = 1 + progress * 6;
      this.ring.scale.set(ringScale, ringScale, 1);
      this.ring.material.opacity = Math.max(0, 0.7 - progress * 0.8);

      // Explosion particles
      if (progress < 0.5) {
        this.particles.emit({
          position: new THREE.Vector3(0, startY, 0),
          count: 20,
          color: new THREE.Color(0.8, 0.3, 1.0),
          speed: 0.8 + progress * 2,
          spread: Math.PI * 2,
          lifetime: 1.0,
          size: 0.03,
          pattern: 'radial',
        });
      }

      // Intense post-processing
      this.scene.setBloom(3.0 * (1 - progress), 1.0, 0.0);
      this.scene.setChromaticAberration(0.01 * (1 - progress));
      this.scene.shake(0.015 * (1 - progress));
    }

    // Reset post-processing when idle
    if (state === 'IDLE') {
      this.scene.setBloom(0.8, 0.4, 0.2);
      this.scene.setChromaticAberration(0);
    }
  }

  dispose() {
    this.glowTexture.dispose();
    this.redSphere.material.dispose();
    this.blueSphere.material.dispose();
    this.purpleSphere.material.dispose();
    this.ring.geometry.dispose();
    this.ring.material.dispose();
    this.spiralRings.forEach(r => { r.geometry.dispose(); r.material.dispose(); });
    this.arcMaterial.dispose();
  }
}
```

- [ ] **Step 2: Wire effects into main.js**

Update `src/main.js` to create ParticleSystem and EffectsManager, call their update methods in the loop:

```js
import { HandTracker } from './handTracker.js';
import { GestureDetector } from './gestures.js';
import { SceneManager } from './scene.js';
import { ParticleSystem } from './particles.js';
import { EffectsManager } from './effects.js';

const tracker = new HandTracker();
const gestures = new GestureDetector();
const video = document.getElementById('webcam');
const container = document.getElementById('canvas-container');
const loadingScreen = document.getElementById('loading-screen');
const loadingFill = document.getElementById('loading-fill');
const headerStatus = document.getElementById('header-status');

let scene, particles, effects;

async function start() {
  loadingFill.style.width = '20%';

  scene = new SceneManager(container);
  particles = new ParticleSystem(scene.effectsGroup);
  effects = new EffectsManager(scene, particles);
  loadingFill.style.width = '30%';

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: 1280, height: 720 },
  });
  video.srcObject = stream;
  await video.play();
  loadingFill.style.width = '50%';

  scene.setupWebcam(video);
  loadingFill.style.width = '70%';

  await tracker.init();
  loadingFill.style.width = '100%';

  setTimeout(() => loadingScreen.classList.add('hidden'), 500);

  let lastTime = performance.now();

  function loop() {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05); // cap dt at 50ms
    lastTime = now;

    tracker.detect(video, now);
    const hands = tracker.getHands();
    const result = gestures.update(hands, dt);

    headerStatus.textContent = result.state;

    effects.update(result, dt);
    particles.update(dt);
    scene.render();

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

start().catch(console.error);
```

- [ ] **Step 3: Run and verify all visual effects**

Run: `npm run dev`
Expected:
- Right hand index up → red glow sphere + outward particles at palm
- Left hand index up → blue glow sphere + spiral rings + inward particles
- Both hands → both effects
- Hands close → red/blue orbit each other with purple particles
- Hold 1sec → purple sphere forms with ring
- Push forward → purple launches with explosion particles + screen flash

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add visual effects for Red/Blue/Purple/Launch with particles and post-processing"
```

---

## Chunk 3: Audio, UI & Polish

### Task 7: Web Audio API Sound Effects

**Files:**
- Create: `src/audio.js`
- Modify: `src/main.js`

- [ ] **Step 1: Create audio.js**

```js
/**
 * Web Audio API synthesized sound effects for cursed techniques.
 * All sounds are generated programmatically — no audio files needed.
 */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.activeSounds = {};
    this.initialized = false;
  }

  /**
   * Must be called from a user gesture (click/touch) to unlock AudioContext
   */
  init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.ctx.destination);
    this.initialized = true;
  }

  /**
   * Red technique: low bass hum (~80Hz sawtooth + LPF)
   */
  startRed() {
    if (!this.initialized || this.activeSounds.red) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 80;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    filter.Q.value = 5;

    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 0.3);

    // Add subtle LFO modulation
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 4;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 10;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start();

    this.activeSounds.red = { osc, filter, gain, lfo, lfoGain };
  }

  stopRed() {
    const s = this.activeSounds.red;
    if (!s) return;
    s.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
    setTimeout(() => {
      s.osc.stop();
      s.lfo.stop();
      s.osc.disconnect();
      s.lfo.disconnect();
    }, 400);
    this.activeSounds.red = null;
  }

  /**
   * Blue technique: high-pitched whoosh (white noise + BPF with sweep)
   */
  startBlue() {
    if (!this.initialized || this.activeSounds.blue) return;

    // Create white noise
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 2;

    // Sweep filter frequency up and down
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.5;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 800;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start();

    this.activeSounds.blue = { noise, filter, gain, lfo, lfoGain };
  }

  stopBlue() {
    const s = this.activeSounds.blue;
    if (!s) return;
    s.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
    setTimeout(() => {
      s.noise.stop();
      s.lfo.stop();
      s.noise.disconnect();
      s.lfo.disconnect();
    }, 400);
    this.activeSounds.blue = null;
  }

  /**
   * Merge/Purple: layered oscillators with pulsating volume
   */
  startPurple() {
    if (!this.initialized || this.activeSounds.purple) return;

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 60;

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = 120;

    const osc3 = this.ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = 180;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    filter.Q.value = 3;

    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 0.5);

    // Pulsating LFO
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 2;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.15;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();

    osc1.connect(filter);
    osc2.connect(filter);
    osc3.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc1.start();
    osc2.start();
    osc3.start();

    this.activeSounds.purple = { osc1, osc2, osc3, filter, gain, lfo, lfoGain };
  }

  stopPurple() {
    const s = this.activeSounds.purple;
    if (!s) return;
    s.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
    setTimeout(() => {
      s.osc1.stop(); s.osc2.stop(); s.osc3.stop(); s.lfo.stop();
      s.osc1.disconnect(); s.osc2.disconnect(); s.osc3.disconnect(); s.lfo.disconnect();
    }, 400);
    this.activeSounds.purple = null;
  }

  /**
   * Launch: one-shot explosion (noise burst + sub bass)
   */
  triggerLaunch() {
    if (!this.initialized) return;

    // Noise burst
    const bufferSize = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.15));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 0.6;

    noise.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start();

    // Sub bass hit
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 40;
    sub.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.5);

    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.8;
    subGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.0);

    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start();
    sub.stop(this.ctx.currentTime + 1.0);
  }

  /**
   * Called every frame to manage sound state transitions
   */
  updateForState(state) {
    if (!this.initialized) return;

    const needsRed = state === 'RED_ACTIVE' || state === 'BOTH_ACTIVE';
    const needsBlue = state === 'BLUE_ACTIVE' || state === 'BOTH_ACTIVE';
    const needsPurple = state === 'MERGING' || state === 'PURPLE_READY';
    const isLaunching = state === 'LAUNCHING';

    if (needsRed) this.startRed(); else this.stopRed();
    if (needsBlue) this.startBlue(); else this.stopBlue();
    if (needsPurple) this.startPurple(); else this.stopPurple();

    // Launch is a one-shot
    if (isLaunching && !this.activeSounds.launchTriggered) {
      this.stopRed();
      this.stopBlue();
      this.stopPurple();
      this.triggerLaunch();
      this.activeSounds.launchTriggered = true;
    }
    if (!isLaunching) {
      this.activeSounds.launchTriggered = false;
    }
  }
}
```

- [ ] **Step 2: Wire audio into main.js**

Add AudioManager to main.js imports and initialization. Add a click-to-start mechanism to unlock AudioContext:

Add to `start()` function in main.js, after loading screen hides:
```js
// Unlock audio on first user interaction
const unlockAudio = () => {
  audio.init();
  document.removeEventListener('click', unlockAudio);
  document.removeEventListener('touchstart', unlockAudio);
};
document.addEventListener('click', unlockAudio);
document.addEventListener('touchstart', unlockAudio);
```

Add to main loop:
```js
audio.updateForState(result.state);
```

- [ ] **Step 3: Run and verify sounds**

Run: `npm run dev`
Expected: Click page first to unlock audio. Then:
- Right hand pose → deep bass hum
- Left hand pose → whooshing wind sound
- Merge → deep pulsating buzz
- Launch → explosive boom

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add Web Audio API synthesized sound effects for all techniques"
```

---

### Task 8: UI Overlay (Technique Names & Status)

**Files:**
- Create: `src/ui.js`
- Modify: `src/main.js`

- [ ] **Step 1: Create ui.js**

```js
/**
 * Manages HTML/CSS UI overlay for technique names and status indicators.
 */
export class UIManager {
  constructor() {
    this.headerStatus = document.getElementById('header-status');
    this.techniqueNameEl = document.getElementById('technique-name');
    this.kanjiEl = document.getElementById('technique-kanji');
    this.labelEl = document.getElementById('technique-label');

    this.leftDot = document.querySelector('#hand-left .dot');
    this.rightDot = document.querySelector('#hand-right .dot');
    this.leftText = document.querySelector('#hand-left .status-text');
    this.rightText = document.querySelector('#hand-right .status-text');

    this.currentTechnique = null;
    this.techniqueTimeout = null;
  }

  /**
   * Update all UI elements based on gesture state
   */
  update(gestureResult) {
    const { state, hands } = gestureResult;

    // Update header status
    const statusMap = {
      IDLE: 'IDLE',
      RED_ACTIVE: 'CHARGING CURSED ENERGY',
      BLUE_ACTIVE: 'CHARGING CURSED ENERGY',
      BOTH_ACTIVE: 'CURSED SYSTEM ACTIVE',
      MERGING: 'MERGING CURSED ENERGY',
      PURPLE_READY: 'CURSED TECHNIQUE READY',
      LAUNCHING: 'CURSED TECHNIQUE REVERSAL: 茈',
    };
    this.headerStatus.textContent = statusMap[state] || state;

    // Update hand indicators
    const hasLeft = hands.some(h => h.label === 'Left');
    const hasRight = hands.some(h => h.label === 'Right');

    this.updateHandDot(this.leftDot, this.leftText, hasLeft, state, 'left');
    this.updateHandDot(this.rightDot, this.rightText, hasRight, state, 'right');

    // Show technique name
    this.updateTechniqueName(state);
  }

  updateHandDot(dot, text, detected, state, side) {
    dot.className = 'dot';
    if (!detected) {
      text.textContent = '—';
      return;
    }

    text.textContent = 'ACTIVE';

    if (state === 'MERGING' || state === 'PURPLE_READY' || state === 'LAUNCHING') {
      dot.classList.add('purple');
    } else if (side === 'right' && (state === 'RED_ACTIVE' || state === 'BOTH_ACTIVE')) {
      dot.classList.add('red');
    } else if (side === 'left' && (state === 'BLUE_ACTIVE' || state === 'BOTH_ACTIVE')) {
      dot.classList.add('blue');
    } else {
      dot.classList.add('active');
    }
  }

  updateTechniqueName(state) {
    const techniqueMap = {
      RED_ACTIVE: { kanji: '赫', label: 'RED', color: 'red' },
      BLUE_ACTIVE: { kanji: '蒼', label: 'BLUE', color: 'blue' },
      PURPLE_READY: { kanji: '茈', label: 'MURASAKI', color: 'purple' },
      LAUNCHING: { kanji: '茈', label: 'MURASAKI', color: 'purple' },
    };

    const technique = techniqueMap[state];
    const key = technique ? technique.label : null;

    if (key !== this.currentTechnique) {
      this.currentTechnique = key;

      if (this.techniqueTimeout) clearTimeout(this.techniqueTimeout);

      if (technique) {
        this.kanjiEl.textContent = technique.kanji;
        this.labelEl.textContent = technique.label;
        this.techniqueNameEl.className = `visible ${technique.color}`;

        // Auto-hide after 2s (except during launch)
        if (state !== 'LAUNCHING' && state !== 'PURPLE_READY') {
          this.techniqueTimeout = setTimeout(() => {
            this.techniqueNameEl.className = '';
          }, 2000);
        }
      } else {
        this.techniqueNameEl.className = '';
      }
    }
  }

  /**
   * Flash the screen (for launch)
   */
  flash() {
    const app = document.getElementById('app');
    app.classList.add('flash');
    setTimeout(() => app.classList.remove('flash'), 300);
  }
}
```

- [ ] **Step 2: Wire UI into main.js**

Add to main.js:
- Import UIManager
- Create instance
- Call `ui.update(result)` in loop
- Call `ui.flash()` when state transitions to LAUNCHING

Final `src/main.js`:

```js
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
  loadingFill.style.width = '20%';

  scene = new SceneManager(container);
  particles = new ParticleSystem(scene.effectsGroup);
  effects = new EffectsManager(scene, particles);
  loadingFill.style.width = '30%';

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: 1280, height: 720 },
  });
  video.srcObject = stream;
  await video.play();
  loadingFill.style.width = '50%';

  scene.setupWebcam(video);
  loadingFill.style.width = '70%';

  await tracker.init();
  loadingFill.style.width = '100%';

  setTimeout(() => loadingScreen.classList.add('hidden'), 500);

  // Unlock audio on first interaction
  const unlockAudio = () => {
    audio.init();
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
  };
  document.addEventListener('click', unlockAudio);
  document.addEventListener('touchstart', unlockAudio);

  let lastTime = performance.now();

  function loop() {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    // Hand tracking
    tracker.detect(video, now);
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
```

- [ ] **Step 3: Run and verify complete application**

Run: `npm run dev`
Expected:
- Loading screen with JJK branding → fades to webcam
- Header shows 呪術廻戦 with status updates
- Technique names appear/disappear with animations
- Hand status dots show correct colors
- Screen flashes on launch
- All effects + sounds work together

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add UI overlay with technique names, status indicators, and screen flash"
```

---

### Task 9: Final Polish & Integration Testing

**Files:**
- Modify: `src/main.js` (minor cleanup)
- Modify: `style.css` (if any tweaks needed)

- [ ] **Step 1: Full flow test**

Test the complete Red → Blue → Both → Merge → Purple → Launch flow end-to-end:
1. Open app, wait for loading
2. Click to unlock audio
3. Right hand index up → Red effect + sound + UI
4. Left hand index up → Blue effect + sound + UI
5. Both hands → Both effects
6. Bring hands close → Merge animation + orbital particles
7. Hold 1sec → Purple forms with "MURASAKI"
8. Push forward → Launch explosion + screen flash + boom sound
9. Effects fade → Back to IDLE

Document any issues found and fix them.

- [ ] **Step 2: Performance check**

Open DevTools → Performance tab. Record 10 seconds of active effects. Verify:
- FPS stays above 50
- No memory leaks (heap stable)
- Particle count stays under 2000

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "feat: complete JJK Cursed Technique System v1 — Red/Blue/Purple/Launch"
```
