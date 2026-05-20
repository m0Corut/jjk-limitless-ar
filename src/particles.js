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
