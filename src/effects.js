import * as THREE from 'three';

export class EffectsManager {
  constructor(sceneManager, particles) {
    this.scene = sceneManager;
    this.particles = particles;
    this.effectsGroup = sceneManager.effectsGroup;

    this.glowTexture = this.createGlowTexture();

    // Red orb (repel) with a pitch-black void core
    this.redSphere = this.createOrb(new THREE.Color(4.0, 0.1, 0.0));
    
    // Core of Red is essentially a black hole pushing things away
    const redCoreMat = new THREE.SpriteMaterial({
      map: this.glowTexture,
      color: new THREE.Color(0, 0, 0),
      transparent: true, blending: THREE.NormalBlending, opacity: 0.9,
    });
    this.redCore = new THREE.Sprite(redCoreMat);
    this.redCore.scale.set(0.4, 0.4, 1);
    this.redSphere.add(this.redCore);

    // Repulsive repeating shockwave ring for Red
    this.repelRing = this.createRing(new THREE.Color(4.0, 0.2, 0.1), 0.1, 0.15);
    this.redSphere.add(this.repelRing);

    this.effectsGroup.add(this.redSphere);

    // Blue energy orb
    this.blueSphere = this.createOrb(new THREE.Color(0.1, 0.5, 3.0));
    this.effectsGroup.add(this.blueSphere);

    // Purple orb (held + launched)
    // Purple sphere with a blinding white core
    this.purpleSphere = this.createOrb(new THREE.Color(1.5, 0.1, 3.0));
    
    const coreMat = new THREE.SpriteMaterial({
      map: this.glowTexture,
      color: new THREE.Color(5.0, 5.0, 5.0), // Super bright white
      transparent: true, blending: THREE.AdditiveBlending, opacity: 1.0,
    });
    this.purpleCore = new THREE.Sprite(coreMat);
    this.purpleCore.scale.set(0.6, 0.6, 1);
    this.purpleSphere.add(this.purpleCore);
    
    this.effectsGroup.add(this.purpleSphere);

    // Lightning generator for purple
    this.lightnings = [];
    for(let i=0; i<8; i++) {
       const geom = new THREE.BufferGeometry();
       geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(30), 3)); // 10 points
       const mat = new THREE.LineBasicMaterial({ 
         color: new THREE.Color(2.5, 1.0, 5.0), 
         transparent: true, blending: THREE.AdditiveBlending, linewidth: 2 
       });
       const line = new THREE.Line(geom, mat);
       line.visible = false;
       this.effectsGroup.add(line);
       this.lightnings.push(line);
    }

    // Expanding shockwave ring for launch
    this.shockRing = this.createRing(new THREE.Color(1.5, 0.3, 3.0), 0.1, 0.12);
    this.effectsGroup.add(this.shockRing);

    // Thin orbit rings for Blue vacuum
    this.orbitRings = [];
    for (let i = 0; i < 3; i++) {
      const r = this.createRing(new THREE.Color(0.1, 0.5, 2.5), 0.05 + i * 0.035, 0.055 + i * 0.035);
      this.effectsGroup.add(r);
      this.orbitRings.push(r);
    }

    // Purple orbit rings
    this.purpleOrbitRings = [];
    for (let i = 0; i < 2; i++) {
      const r = this.createRing(new THREE.Color(1.5, 0.1, 3.0), 0.08 + i * 0.05, 0.085 + i * 0.05);
      this.effectsGroup.add(r);
      this.purpleOrbitRings.push(r);
    }

    // Ghost skeleton meshes — cleared each frame
    this.activeLandmarkMeshes = [];

    // Launch trail points
    this.launchStartPos = new THREE.Vector3();

    this.time = 0;
    this.hideAll();
  }

  createGlowTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    g.addColorStop(0,   'rgba(255,255,255,1)');
    g.addColorStop(0.15,'rgba(255,255,255,0.9)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.4)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.1)');
    g.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }

  createOrb(color, scale = 1) {
    const mat = new THREE.SpriteMaterial({
      map: this.glowTexture,
      color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 1.0,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.15 * scale, 0.15 * scale, 1);
    sprite.visible = false;
    return sprite;
  }

  createRing(color, inner, outer) {
    const geo = new THREE.RingGeometry(inner, outer, 64);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    return mesh;
  }

  hideAll() {
    this.redSphere.visible = false;
    this.blueSphere.visible = false;
    this.purpleSphere.visible = false;
    this.shockRing.visible = false;
    this.orbitRings.forEach(r => r.visible = false);
    this.purpleOrbitRings.forEach(r => r.visible = false);
  }

  clearLandmarks() {
    for (const mesh of this.activeLandmarkMeshes) {
      this.effectsGroup.remove(mesh);
      mesh.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
    }
    this.activeLandmarkMeshes = [];
  }

  renderLandmarks(hands, state) {
    this.clearLandmarks();

    const stateColorR = {
      RED_ACTIVE: new THREE.Color(3.0, 0.2, 0.0), BOTH_ACTIVE: new THREE.Color(3.0, 1.0, 0.0),
      MERGING: new THREE.Color(2.5, 0.2, 3.0), PURPLE_READY: new THREE.Color(2.0, 0.0, 3.5), LAUNCHING: new THREE.Color(2.0, 0.0, 3.5),
    };
    const stateColorL = {
      BLUE_ACTIVE: new THREE.Color(0.0, 0.6, 3.0), BOTH_ACTIVE: new THREE.Color(0.0, 1.0, 3.0),
      MERGING: new THREE.Color(2.5, 0.2, 3.0), PURPLE_READY: new THREE.Color(2.0, 0.0, 3.5), LAUNCHING: new THREE.Color(2.0, 0.0, 3.5),
    };
    const defaultColor = new THREE.Color(0.0, 1.5, 2.0);

    const connections = [
      [0,1],[1,2],[2,3],[3,4],
      [0,5],[5,6],[6,7],[7,8],
      [0,9],[9,10],[10,11],[11,12],
      [0,13],[13,14],[14,15],[15,16],
      [0,17],[17,18],[18,19],[19,20],
      [5,9],[9,13],[13,17],
    ];

    for (const hand of hands) {
      const group = new THREE.Group();
      const lm = hand.landmarks;
      const isRight = hand.label === 'Right';
      const col = isRight
        ? (stateColorR[state] || defaultColor)
        : (stateColorL[state] || defaultColor);

      for (const [a, b] of connections) {
        const pA = this.scene.landmarkToScene(lm[a]);
        const pB = this.scene.landmarkToScene(lm[b]);
        const geom = new THREE.BufferGeometry().setFromPoints([pA, pB]);
        const mat = new THREE.LineBasicMaterial({
          color: col, transparent: true, opacity: 0.55,
          blending: THREE.AdditiveBlending,
        });
        group.add(new THREE.Line(geom, mat));
      }

      for (let i = 0; i < lm.length; i++) {
        const pos = this.scene.landmarkToScene(lm[i]);
        const dm = new THREE.SpriteMaterial({
          map: this.glowTexture, color: col,
          transparent: true, blending: THREE.AdditiveBlending, opacity: 0.9,
        });
        const dot = new THREE.Sprite(dm);
        dot.position.copy(pos);
        dot.scale.set(0.013, 0.013, 1);
        group.add(dot);
      }

      this.effectsGroup.add(group);
      this.activeLandmarkMeshes.push(group);
    }
  }

  update(gestureResult, dt) {
    this.time += dt;
    const {
      state, indexTipPositions, palmPositions,
      purpleHeldPos, launchDir,
      mergeProgress, launchProgress,
    } = gestureResult;

    if (state !== 'MERGING') {
      this.lastMergePosR = null;
      this.lastMergePosL = null;
    }

    this.hideAll();
    this.lightnings.forEach(l => l.visible = false);
    
    this.renderLandmarks(gestureResult.hands, state);

    // ─── RED ───────────────────────────────────────────────────────────────
    if (state === 'RED_ACTIVE' || state === 'BOTH_ACTIVE') {
      if (indexTipPositions.right) {
        const pos = this.scene.landmarkToScene(indexTipPositions.right);
        this.redSphere.visible = true;
        this.redSphere.position.copy(pos);

        // Intensely pulsating core
        const pulse = 1 + Math.sin(this.time * 25) * 0.15;
        this.redSphere.scale.set(0.25 * pulse, 0.25 * pulse, 1);

        // Repulsive Expanding Ring
        const ringScale = (this.time * 2.5) % 1.0; // 0.0 to 1.0 repeatedly
        this.repelRing.scale.set(1 + ringScale * 4, 1 + ringScale * 4, 1);
        this.repelRing.material.opacity = Math.max(0, 1.0 - ringScale * 1.2);

        // Explosive outward burst (Red Energy)
        this.particles.emit({
          position: pos, count: 6,
          color: new THREE.Color(5.0, 0.1, 0.0),
          speed: 2.5 + Math.random() * 2, spread: Math.PI * 2,
          lifetime: 0.4, size: 0.025, pattern: 'radial',
        });

        // Pitch Black Debris (Reality being torn by repulsion)
        if (Math.random() > 0.4) {
          this.particles.emit({
            position: pos, count: 3,
            color: new THREE.Color(0, 0, 0),
            speed: 1.5 + Math.random(), spread: Math.PI * 2,
            lifetime: 0.6, size: 0.04 + Math.random() * 0.04, pattern: 'radial',
          });
        }

        this.scene.shake(0.005);
        this.scene.setChromaticAberration(0.004); // Spatial distortion
        this.scene.setBloom(2.5, 0.5, 0.99); // high threshold protects webcam
      }
    }

    // ─── BLUE ──────────────────────────────────────────────────────────────
    if (state === 'BLUE_ACTIVE' || state === 'BOTH_ACTIVE') {
      if (indexTipPositions.left) {
        const pos = this.scene.landmarkToScene(indexTipPositions.left);
        this.blueSphere.visible = true;
        this.blueSphere.position.copy(pos);

        // Inward pulsing — shrinks
        const pulse = 0.9 + Math.sin(this.time * 14) * 0.1;
        this.blueSphere.scale.set(0.18 * pulse, 0.18 * pulse, 1);

        // Fast spinning orbit rings — reversed to feel like vacuum
        this.orbitRings.forEach((ring, i) => {
          ring.visible = true;
          ring.position.copy(pos);
          ring.rotation.z = -this.time * (7 + i * 2);
          ring.rotation.x = Math.sin(this.time * 1.5 + i * 1.2) * 0.6;
          const s = 1 + Math.sin(this.time * 9 + i) * 0.08;
          ring.scale.set(s, s, 1);
          ring.material.opacity = 0.55;
        });

        // Particles sucked inward from wide area
        this.particles.emit({
          position: pos, count: 10,
          color: new THREE.Color(0.1, 0.8, 5.0),
          speed: 1.2, spread: 0.8,
          lifetime: 0.35, size: 0.018, pattern: 'inward', target: pos,
        });

        this.scene.setBloom(1.8, 0.5, 0.99);
        this.scene.shake(0.003);
      }
    }

    // ─── MERGING ───────────────────────────────────────────────────────────
    if (state === 'MERGING') {
      // Cache last known positions so the animation completes even if a hand disappears
      if (indexTipPositions.right) this.lastMergePosR = this.scene.landmarkToScene(indexTipPositions.right);
      if (indexTipPositions.left) this.lastMergePosL = this.scene.landmarkToScene(indexTipPositions.left);

      if (this.lastMergePosR && this.lastMergePosL) {
        const posR = this.lastMergePosR;
        const posL = this.lastMergePosL;
        // Interpolate the visual center from exactly between hands towards the physical left hand (posR in code)
        const trueCenter = new THREE.Vector3().addVectors(posR, posL).multiplyScalar(0.5);
        // By the end of the merge, the center is 100% on the physical left finger
        const center = new THREE.Vector3().lerpVectors(trueCenter, posR, mergeProgress);

        // Exponentially faster rotation as merge completes
        const orbitAngle = this.time * (8 + mergeProgress * 30);
        
        // Radius starts wide and collapses to 0 exponentially
        const orbitR = 0.1 * Math.pow(1 - mergeProgress, 1.5);

        this.redSphere.visible = true;
        this.redSphere.position.set(
          center.x + Math.cos(orbitAngle) * orbitR,
          center.y + Math.sin(orbitAngle) * orbitR, 0
        );
        const rPulse = 1 + Math.sin(this.time * 20) * 0.1;
        this.redSphere.scale.set(0.16 * rPulse, 0.16 * rPulse, 1);

        this.blueSphere.visible = true;
        this.blueSphere.position.set(
          center.x - Math.cos(orbitAngle) * orbitR,
          center.y - Math.sin(orbitAngle) * orbitR, 0
        );
        this.blueSphere.scale.set(0.14, 0.14, 1);

        // Particles spiraling to center
        this.particles.emit({
          position: center, count: 8,
          color: new THREE.Color(2.0, 0.2, 3.0),
          speed: 0.2, spread: 0.15,
          lifetime: 0.4, size: 0.016, pattern: 'orbital',
        });

        this.scene.setBloom(2.5, 0.6, 0.99);
        this.scene.setChromaticAberration(0.003 * mergeProgress);
        this.scene.shake(0.004 * mergeProgress);
      }
    }

    // ─── PURPLE READY (held on right index tip) ────────────────────────────
    if (state === 'PURPLE_READY') {
      // Use live right tip position if available, fallback to locked pos
      const rawPos = indexTipPositions.right || purpleHeldPos;
      if (rawPos) {
        const pos = this.scene.landmarkToScene(rawPos);

        // Save for launch
        this.launchStartPos.copy(pos);

        // Big glowing purple orb
        this.purpleSphere.visible = true;
        this.purpleSphere.position.copy(pos);
        const pPulse = 1 + Math.sin(this.time * 25) * 0.15;
        this.purpleSphere.scale.set(0.25 * pPulse, 0.25 * pPulse, 1);
        this.purpleCore.scale.set(0.7 * pPulse, 0.7 * pPulse, 1);

        // Ambient lightning while holding
        this.updateLightning(pos, 3, 0.2, 0.4);

        // Two orbit rings around it
        this.purpleOrbitRings.forEach((ring, i) => {
          ring.visible = true;
          ring.position.copy(pos);
          ring.rotation.z = this.time * (2 + i);
          ring.rotation.x = Math.sin(this.time * 0.8 + i) * 0.4;
          const rs = 2.5 + Math.sin(this.time * 2 + i) * 0.15;
          ring.scale.set(rs, rs, 1);
          ring.material.opacity = 0.6;
        });

        // Orbital particles
        this.particles.emit({
          position: pos, count: 12,
          color: new THREE.Color(2.0, 0.3, 4.0),
          speed: 0.25, spread: 0.2,
          lifetime: 0.7, size: 0.022, pattern: 'orbital',
        });

        this.scene.setBloom(3.0, 0.8, 0.99);
        this.scene.setChromaticAberration(0.005);
        this.scene.shake(0.005);
      }
    }

    // ─── LAUNCHING ─────────────────────────────────────────────────────────
    if (state === 'LAUNCHING') {
      const p = launchProgress;
      const startPos = this.launchStartPos;

      const orbPos = new THREE.Vector3(
        startPos.x + launchDir.x * p * 7.5,
        startPos.y + launchDir.y * p * 7.5,
        startPos.z
      );

      this.purpleSphere.visible = true;
      this.purpleSphere.position.copy(orbPos);
      
      // Massive growth
      const scale = 0.5 + p * 6.0; 
      this.purpleSphere.scale.set(scale, scale, 1);
      this.purpleCore.scale.set(0.4, 0.4, 1); // core stays intense but relatively smaller

      // Shockwave ring expands from orb
      this.shockRing.visible = true;
      this.shockRing.position.copy(startPos);
      this.shockRing.scale.set(1 + p * 15, 1 + p * 15, 1);
      this.shockRing.material.opacity = Math.max(0, 1 - p * 2);

      // Extreme lightning wiping out everything
      this.updateLightning(orbPos, 8, 0.5 + p * 1.5, 0.9);

      // Trail particles
      if (p < 0.8) {
        this.particles.emit({
          position: orbPos, count: 40,
          color: new THREE.Color(3.0, 0.5, 5.0),
          speed: 3.0 + p * 4.0, spread: Math.PI * 2,
          lifetime: 1.0, size: 0.08 + p * 0.1, pattern: 'radial',
        });
      }

      if (p < 0.95 && Math.random() > 0.3) {
        // Absolute void/black blocks to mimic "reality tearing" leaving holes in the webcam feed
        this.particles.emit({
          position: orbPos, count: 6,
          color: new THREE.Color(0, 0, 0), // Pure pitch black (cuts through light)
          speed: 0.8 + p * 1.5, spread: Math.PI * 2,
          lifetime: 1.5 + Math.random(), size: 0.2 + Math.random() * 0.25, pattern: 'radial',
        });
      }

      this.scene.setBloom(5.0 * (1 - p * 0.3), 1.2, 0.99);
      this.scene.setChromaticAberration(0.03 * (1 - p)); // massive space distortion
      this.scene.shake(0.04 * (1 - p)); // violent screen shake
    }

    // ─── IDLE ──────────────────────────────────────────────────────────────
    if (state === 'IDLE') {
      this.scene.setBloom(0.5, 0.4, 0.99);
      this.scene.setChromaticAberration(0);
    }
  }

  // Helper to draw lightning bolts
  updateLightning(origin, count, lengthPhase, probability) {
    for(let i=0; i<this.lightnings.length; i++) {
       const line = this.lightnings[i];
       if (i >= count || Math.random() > probability) {
          line.visible = false; 
          continue;  
       }
       line.visible = true;
       const positions = line.geometry.attributes.position.array;
       let currVector = origin.clone();
       
       const baseAngle = Math.random() * Math.PI * 2;
       
       for(let j=0; j<10; j++) {
          positions[j*3] = currVector.x;
          positions[j*3+1] = currVector.y;
          positions[j*3+2] = currVector.z;
          
          const angle = baseAngle + (Math.random() - 0.5) * 2.0;
          const step = (0.05 + Math.random() * lengthPhase);
          currVector.x += Math.cos(angle) * step;
          currVector.y += Math.sin(angle) * step;
       }
       line.geometry.attributes.position.needsUpdate = true;
    }
  }

  dispose() {
    this.clearLandmarks();
    this.glowTexture.dispose();
    [this.redSphere, this.blueSphere, this.purpleSphere].forEach(s => s.material.dispose());
    [this.shockRing, ...this.orbitRings, ...this.purpleOrbitRings].forEach(r => {
      r.geometry.dispose(); r.material.dispose();
    });
  }
}
