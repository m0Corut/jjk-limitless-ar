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
