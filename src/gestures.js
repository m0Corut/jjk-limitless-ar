// State constants
export const STATE = {
  IDLE: 'IDLE',
  RED_ACTIVE: 'RED_ACTIVE',
  BLUE_ACTIVE: 'BLUE_ACTIVE',
  BOTH_ACTIVE: 'BOTH_ACTIVE',
  MERGING: 'MERGING',
  PURPLE_READY: 'PURPLE_READY',   // Purple formed, held on right index tip
  LAUNCHING: 'LAUNCHING',         // Launch animation playing
};

// Landmark indices
const WRIST = 0;
const THUMB_TIP = 4;
const THUMB_IP = 3;
const INDEX_TIP = 8;
const INDEX_PIP = 6;
const MIDDLE_TIP = 12;
const MIDDLE_PIP = 10;
const RING_TIP = 16;
const RING_PIP = 14;
const PINKY_TIP = 20;
const PINKY_PIP = 18;
const PALM_BASE = 9;

const MERGE_THRESHOLD = 0.22;   // normalized distance between index tips for merge
const MERGE_DURATION = 1000;    // ms to hold merge before purple forms
const LAUNCH_DURATION = 3500;   // Slowed down dramatically for anime-style cinematic devastation
const LAUNCH_VELOCITY = 0.5;    // velocity threshold (backup trigger, lower = easier)
// History window for velocity estimation
const VEL_HISTORY = 6;

export class GestureDetector {
  constructor() {
    this.state = STATE.IDLE;
    this.mergeStartTime = 0;
    this.launchStartTime = 0;

    this.redHand = null;
    this.blueHand = null;
    this.palmPositions = { left: null, right: null };
    this.indexTipPositions = { left: null, right: null };

    // Purple is "held" on right index after merge
    this.purpleHeldPos = null;

    // How many consecutive frames right-hand pose has been broken in PURPLE_READY
    // Only cancel purple after this exceeds the threshold
    this.purpleCancelFrames = 0;
    this.PURPLE_CANCEL_THRESHOLD = 20; // ~0.66s at 30fps

    // Velocity tracking for both hands
    this.tipHistory = { left: [], right: [] }; // [{x, y, t}]
    this.purpleHoldingHand = null; // 'Right' or 'Left'
    this.launchDir = { x: 0, y: 0 }; // direction of launch
  }

  isFingerExtended(landmarks, tipIdx, pipIdx) {
    return landmarks[tipIdx].y < landmarks[pipIdx].y;
  }

  isTechniquePose(landmarks) {
    const indexUp = this.isFingerExtended(landmarks, INDEX_TIP, INDEX_PIP);
    const middleDown = !this.isFingerExtended(landmarks, MIDDLE_TIP, MIDDLE_PIP);
    const ringDown = !this.isFingerExtended(landmarks, RING_TIP, RING_PIP);
    const pinkyDown = !this.isFingerExtended(landmarks, PINKY_TIP, PINKY_PIP);
    return indexUp && middleDown && ringDown && pinkyDown;
  }

  /**
   * Hollow Purple Launch Pose (like the image):
   * Index extended, Pinky extended, Middle pulled to Thumb (curled), Ring curled.
   */
  isPurpleLaunchPose(landmarks) {
    const indexUp = this.isFingerExtended(landmarks, INDEX_TIP, INDEX_PIP);
    const pinkyUp = this.isFingerExtended(landmarks, PINKY_TIP, PINKY_PIP);
    const middleDown = !this.isFingerExtended(landmarks, MIDDLE_TIP, MIDDLE_PIP);
    const ringDown = !this.isFingerExtended(landmarks, RING_TIP, RING_PIP);
    
    return indexUp && pinkyUp && middleDown && ringDown;
  }

  getPalmCenter(landmarks) {
    return { x: landmarks[PALM_BASE].x, y: landmarks[PALM_BASE].y, z: landmarks[PALM_BASE].z };
  }

  getIndexTipTarget(landmarks) {
    const tip = landmarks[INDEX_TIP];
    const pip = landmarks[INDEX_PIP];
    const dx = tip.x - pip.x;
    const dy = tip.y - pip.y;
    return {
      x: tip.x + dx * 0.35,
      y: tip.y + dy * 0.35,
      z: tip.z,
    };
  }

  distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Compute index tip velocity from recent history (units/s)
   */
  getTipVelocity(side, now) {
    const h = this.tipHistory[side];
    if (!h || h.length < 2) return { x: 0, y: 0, mag: 0 };
    const oldest = h[0];
    const latest = h[h.length - 1];
    const dt = (latest.t - oldest.t) / 1000;
    if (dt <= 0) return { x: 0, y: 0, mag: 0 };
    const vx = (latest.x - oldest.x) / dt;
    const vy = (latest.y - oldest.y) / dt;
    const mag = Math.sqrt(vx * vx + vy * vy);
    return { x: vx, y: vy, mag };
  }

  update(hands, dt) {
    const now = performance.now();
    let rightHand = null;
    let leftHand = null;

    for (const hand of hands) {
      if (hand.label === 'Right') rightHand = hand.landmarks;
      if (hand.label === 'Left') leftHand = hand.landmarks;
    }

    // Update positions
    this.palmPositions.right = rightHand ? this.getPalmCenter(rightHand) : null;
    this.palmPositions.left = leftHand ? this.getPalmCenter(leftHand) : null;
    this.indexTipPositions.right = rightHand ? this.getIndexTipTarget(rightHand) : null;
    this.indexTipPositions.left = leftHand ? this.getIndexTipTarget(leftHand) : null;

    // Track index tip velocity for both hands
    if (rightHand && this.indexTipPositions.right) {
      this.tipHistory.right.push({ ...this.indexTipPositions.right, t: now });
      if (this.tipHistory.right.length > VEL_HISTORY) this.tipHistory.right.shift();
    } else {
      this.tipHistory.right = [];
    }

    if (leftHand && this.indexTipPositions.left) {
      this.tipHistory.left.push({ ...this.indexTipPositions.left, t: now });
      if (this.tipHistory.left.length > VEL_HISTORY) this.tipHistory.left.shift();
    } else {
      this.tipHistory.left = [];
    }

    // --- LAUNCHING state: wait for animation ---
    if (this.state === STATE.LAUNCHING) {
      const elapsed = now - this.launchStartTime;
      if (elapsed > LAUNCH_DURATION) {
        this.state = STATE.IDLE;
        this.purpleHeldPos = null;
      }
      return this.getResult(hands);
    }

    // --- PURPLE READY: purple is held on hand tip ---
    if (this.state === STATE.PURPLE_READY) {
      
      // Determine which hand is holding purple (prefer the current one, default to Physical Left = 'Right')
      let handStr = this.purpleHoldingHand || 'Right';
      let handData = handStr === 'Right' ? rightHand : leftHand;
      
      const isValidKeep = (hd) => hd && (this.isTechniquePose(hd) || this.isPurpleLaunchPose(hd));

      // Update where purple floats
      const tipPos = handStr === 'Right' ? this.indexTipPositions.right : this.indexTipPositions.left;
      if (tipPos) {
        this.purpleHeldPos = { ...tipPos };
      }

      // Check launch triggers (using current holding hand)
      const purplePose = handData && this.isPurpleLaunchPose(handData);

      if (purplePose) {
        // Calculate aim direction from wrist to index tip
        const wrist = handData[0];
        const tip = handData[8];
        const dx = tip.x - wrist.x;
        const dy = tip.y - wrist.y;
        
        // Reverse X for screen mirror, reverse Y because Y is top-down
        let vx = -dx;
        let vy = -dy; 
        
        const mag = Math.sqrt(vx*vx + vy*vy);
        if (mag > 0.001) {
          this.launchDir = { x: vx/mag, y: vy/mag };
        } else {
          this.launchDir = { x: -1, y: 0 };
        }

        this.launchStartTime = now;
        this.state = STATE.LAUNCHING;
        this.mergeStartTime = 0;
        this.purpleCancelFrames = 0;
        this.purpleHoldingHand = null;
      }

      // Only cancel Purple if the holding hand fails pose for many frames
      if (!isValidKeep(handData)) {
        this.purpleCancelFrames++;
        if (this.purpleCancelFrames > this.PURPLE_CANCEL_THRESHOLD) {
          this.state = STATE.IDLE;
          this.purpleHeldPos = null;
          this.purpleCancelFrames = 0;
          this.purpleHoldingHand = null;
        }
      } else {
        this.purpleCancelFrames = 0; // good frame, reset counter
      }

      return this.getResult(hands);
    }

    const rightPose = rightHand && this.isTechniquePose(rightHand);
    const leftPose = leftHand && this.isTechniquePose(leftHand);

    // Handle MERGING leniency separately
    if (this.state === STATE.MERGING) {
      // Once merging starts, only the target holding hand (Physical Left = rightPose in code) needs to stay valid!
      // This allows the user to pull their Physical Right hand completely out of frame for a cool anime effect.
      const isValidKeep = rightPose;
      
      if (!isValidKeep) {
        this.mergeCancelFrames = (this.mergeCancelFrames || 0) + 1;
        if (this.mergeCancelFrames > 15) { // ~0.5s leniency
          this.state = STATE.IDLE; // Fall through to re-evaluate below
          this.mergeStartTime = 0;
          this.mergeCancelFrames = 0;
        } else {
          // Still merging! (Just leniency frame)
          this.redHand = rightHand || this.redHand;
          this.blueHand = leftHand || this.blueHand;
        }
      } else {
        this.mergeCancelFrames = 0;
        this.redHand = rightHand;
        this.blueHand = leftHand;
      }

      if (this.state === STATE.MERGING) {
        const mergeElapsed = now - this.mergeStartTime;
        if (mergeElapsed > MERGE_DURATION) {
          // Purple formed! Default onto Physical Left hand (Right in code), or the other if missing
          this.state = STATE.PURPLE_READY;
          this.purpleHoldingHand = rightHand ? 'Right' : 'Left';
          const tip = rightHand ? this.indexTipPositions.right : this.indexTipPositions.left;
          this.purpleHeldPos = tip ? { ...tip } : null;
          this.mergeCancelFrames = 0;
        }
        return this.getResult(hands);
      }
    }

    // Base state evaluation (IDLE, RED, BLUE, BOTH)
    if (!rightPose && !leftPose) {
      this.state = STATE.IDLE;
      this.mergeStartTime = 0;
      this.redHand = null;
      this.blueHand = null;
      return this.getResult(hands);
    }

    this.redHand = rightPose ? rightHand : null;
    this.blueHand = leftPose ? leftHand : null;

    if (rightPose && leftPose) {
      const tipDist = this.distance(rightHand[INDEX_TIP], leftHand[INDEX_TIP]);
      
      if (tipDist < MERGE_THRESHOLD) {
        this.state = STATE.MERGING;
        this.mergeStartTime = now;
        this.mergeCancelFrames = 0;
      } else {
        this.state = STATE.BOTH_ACTIVE;
        this.mergeStartTime = 0;
      }
    } else if (rightPose) {
      this.state = STATE.RED_ACTIVE;
      this.mergeStartTime = 0;
    } else if (leftPose) {
      this.state = STATE.BLUE_ACTIVE;
      this.mergeStartTime = 0;
    }

    return this.getResult(hands);
  }

  getResult(hands) {
    const mergeProgress = this.state === STATE.MERGING
      ? Math.min(1, (performance.now() - this.mergeStartTime) / MERGE_DURATION)
      : (this.state === STATE.PURPLE_READY || this.state === STATE.LAUNCHING) ? 1 : 0;

    const launchProgress = this.state === STATE.LAUNCHING
      ? Math.min(1, (performance.now() - this.launchStartTime) / LAUNCH_DURATION)
      : 0;

    return {
      state: this.state,
      palmPositions: { ...this.palmPositions },
      indexTipPositions: { ...this.indexTipPositions },
      purpleHeldPos: this.purpleHeldPos,
      launchDir: { ...this.launchDir },
      redHand: this.redHand,
      blueHand: this.blueHand,
      hands,
      mergeProgress,
      launchProgress,
    };
  }
}
