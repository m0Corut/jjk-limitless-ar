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
      1.2,  // strength
      0.4,  // radius
      0.95  // threshold (high to prevent webcam bloom)
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

    // Use a 1x1 geometry; we will scale the mesh dynamically
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      map: this.videoTexture,
      side: THREE.FrontSide,
    });

    this.videoMesh = new THREE.Mesh(geometry, material);
    this.videoMesh.position.z = -1; // behind effects
    this.scene.add(this.videoMesh);

    this.updateVideoScale();
  }

  updateVideoScale() {
    if (!this.videoMesh || !this.videoTexture || !this.videoTexture.image) return;
    
    const video = this.videoTexture.image;
    // Default to a 16:9 ratio if metadata isn't fully loaded yet
    const videoWidth = video.videoWidth || 1280;
    const videoHeight = video.videoHeight || 720;

    const videoAspect = videoWidth / videoHeight;
    const screenAspect = window.innerWidth / window.innerHeight;

    // Scale plane to cover screen, maintaining video aspect ratio
    let scaleX, scaleY;
    if (videoAspect > screenAspect) {
      scaleY = 2;
      scaleX = scaleY * videoAspect;
    } else {
      scaleX = 2 * screenAspect;
      scaleY = scaleX / videoAspect;
    }

    // Mirror the video (flip X)
    this.videoMesh.scale.set(-scaleX, scaleY, 1);
  }

  /**
   * Convert normalized landmark position (0-1) to scene coordinates.
   * Accounts for the mirrored video and dynamic scaling.
   */
  landmarkToScene(landmark) {
    if (!this.videoMesh) return new THREE.Vector3();
    
    // videoMesh scale represents the full world-size of the video plane
    const videoScaleX = Math.abs(this.videoMesh.scale.x);
    const videoScaleY = Math.abs(this.videoMesh.scale.y);

    return new THREE.Vector3(
      ((1 - landmark.x) - 0.5) * videoScaleX, // mirror X
      (0.5 - landmark.y) * videoScaleY,       // flip Y
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
    
    this.updateVideoScale();
  }

  dispose() {
    this.renderer.dispose();
    if (this.videoTexture) this.videoTexture.dispose();
  }
}
