// Keyboard state packed into a bitmask, read once per simulation tick.
export const BIT = {
  KeyW: 1 << 0, KeyA: 1 << 1, KeyS: 1 << 2, KeyD: 1 << 3,
  ArrowUp: 1 << 4, ArrowDown: 1 << 5, ArrowLeft: 1 << 6, ArrowRight: 1 << 7,
  Space: 1 << 8, KeyE: 1 << 9, KeyQ: 1 << 10, KeyF: 1 << 11, KeyR: 1 << 12,
  // Story-only actions (no keyboard key): driven by the story runner
  Fly: 1 << 13, Scold: 1 << 14, Sad: 1 << 15, Love: 1 << 16, Laugh: 1 << 17,
};
const GAME_KEYS = new Set(Object.keys(BIT).filter((k) => k.startsWith('Key') || k.startsWith('Arrow') || k === 'Space'));

export class Input {
  constructor() {
    this.mask = 0;        // keys held right now
    this.tapped = 0;      // keys pressed since the last tick (so very quick taps are never lost)
    this.virtual = 0;     // keys held through the on-screen touch controls
    this.clearListeners = new Set();
    this.enabled = false;
    this.listeners = new Set();   // (code, down) → for UI feedback
    this.commands = new Map();    // one-shot UI keys (Esc)

    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => this.clear());
  }

  onKey(e, down) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (document.querySelector('dialog[open]')) return;
    const code = e.code === 'Spacebar' ? 'Space' : e.code;
    if (this.enabled && GAME_KEYS.has(code)) {
      e.preventDefault();
      // A focused button would otherwise also react to Space.
      if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
      const bit = BIT[code];
      const was = (this.mask & bit) !== 0;
      if (down) { this.mask |= bit; if (!e.repeat) this.tapped |= bit; } else this.mask &= ~bit;
      if (was !== down) for (const fn of this.listeners) fn(code, down);
      return;
    }
    if (down && !e.repeat && this.commands.has(code)) {
      const ok = this.commands.get(code)(e);
      if (ok !== false) e.preventDefault();
    }
  }

  /** On-screen (touch) controls press and release the same keys as the keyboard. */
  press(code) {
    const bit = BIT[code];
    if (!bit || !this.enabled) return;
    if (!(this.virtual & bit)) {
      this.virtual |= bit;
      this.tapped |= bit;
      for (const fn of this.listeners) fn(code, true);
    }
  }

  release(code) {
    const bit = BIT[code];
    if (!bit || !(this.virtual & bit)) return;
    this.virtual &= ~bit;
    for (const fn of this.listeners) fn(code, false);
  }

  /** Mask for one tick: held keys (keyboard + touch) plus anything tapped since the previous tick. */
  read() {
    const m = this.mask | this.virtual | this.tapped;
    this.tapped = 0;
    return m;
  }

  clear() {
    const held = this.mask | this.virtual;
    if (held) for (const code of GAME_KEYS) if (held & BIT[code]) for (const fn of this.listeners) fn(code, false);
    this.mask = 0;
    this.virtual = 0;
    this.tapped = 0;
    for (const fn of this.clearListeners) fn();
  }
}
