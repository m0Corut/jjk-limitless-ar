/**
 * AudioManager — MP3 file based sound effects for cursed techniques.
 * Each technique sound plays ONCE per activation. Does not replay until
 * the hand is dropped (IDLE) and raised again.
 */
export class AudioManager {
  constructor() {
    this.sounds = {};
    this.initialized = false;
    this._prevState = null;
    // Individual "already played" flags — reset only on IDLE
    this._played = { red: false, blue: false, purple: false };
  }

  init() {
    if (this.initialized) return;

    const load = (name, src) => {
      const audio = new Audio(src);
      audio.loop = false;
      audio.preload = 'auto';
      this.sounds[name] = audio;
    };

    load('red',    'sound/red.mp3');
    load('blue',   'sound/blue.mp3');
    load('purple', 'sound/hollow.mp3');
    load('launch', 'sound/purple-launch.mp3');

    this.initialized = true;
  }

  _playOnce(name, volume = 0.7) {
    const audio = this.sounds[name];
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.volume = volume;
    audio.play().catch(() => {});
  }

  updateForState(state) {
    if (!this.initialized) return;
    if (state === this._prevState) return;
    this._prevState = state;

    // IDLE sıfırlar bayrakları — bir sonraki aktivasyonda ses tekrar çalar
    if (state === 'IDLE') {
      this._played.red    = false;
      this._played.blue   = false;
      this._played.purple = false;
      return;
    }

    // Red: sadece daha önce çalmadıysa çal
    const needsRed = state === 'RED_ACTIVE' || state === 'BOTH_ACTIVE';
    if (needsRed && !this._played.red) {
      this._playOnce('red', 0.70);
      this._played.red = true;
    }

    // Blue: sadece daha önce çalmadıysa çal
    const needsBlue = state === 'BLUE_ACTIVE' || state === 'BOTH_ACTIVE';
    if (needsBlue && !this._played.blue) {
      this._playOnce('blue', 0.65);
      this._played.blue = true;
    }

    // Purple (merge + hold): sadece daha önce çalmadıysa çal
    const needsPurple = state === 'MERGING' || state === 'PURPLE_READY';
    if (needsPurple && !this._played.purple) {
      this._playOnce('purple', 0.75);
      this._played.purple = true;
    }

    // Launch: her fırlatmada çal (one-shot, bayrak yok, IDLE sıfırlar purple'ı)
    if (state === 'LAUNCHING') {
      this._playOnce('launch', 0.85);
      this._played.purple = false; // bir sonraki morde tekrar hollow çalsın
    }
  }
}
