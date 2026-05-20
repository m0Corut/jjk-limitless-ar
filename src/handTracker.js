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
