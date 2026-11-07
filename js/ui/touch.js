// On-screen controls for tablets: a joystick for gliding plus buttons for rising, sinking,
// turning and the four actions. They press the same virtual keys as the keyboard, so the
// puppet, the tutorial and the key highlights all work unchanged. Multi-touch: you can glide
// with one thumb and jump or turn with the other.

/** Should the touch controls be shown? (?touch=1 / ?touch=0 in the URL overrides detection.) */
export function wantsTouch() {
  const q = new URLSearchParams(location.search).get('touch');
  if (q === '1') return true;
  if (q === '0') return false;
  return window.matchMedia('(any-pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

// Pointer capture keeps a finger's events on its control even if it slides off; it can fail for
// unusual pointers, which must never stop the control from working.
const capture = (el, id) => { try { el.setPointerCapture(id); } catch (e) { /* ignore */ } };

export function setupTouch(root, input) {
  const stick = root.querySelector('.joystick');
  const knob = root.querySelector('.joystick-knob');
  let stickId = null;
  let held = new Set();

  const setStick = (keys) => {
    for (const k of held) if (!keys.has(k)) input.release(k);
    for (const k of keys) if (!held.has(k)) input.press(k);
    held = keys;
  };

  const moveStick = (e) => {
    const r = stick.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const max = r.width / 2;
    const len = Math.hypot(dx, dy);
    if (len > max) { dx *= max / len; dy *= max / len; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    // 8 directions with a small dead zone; up on screen = away from the audience (W)
    const keys = new Set();
    if (len > max * 0.25) {
      const nx = dx / len, ny = dy / len;
      if (nx > 0.38) keys.add('KeyD'); else if (nx < -0.38) keys.add('KeyA');
      if (ny > 0.38) keys.add('KeyS'); else if (ny < -0.38) keys.add('KeyW');
    }
    setStick(keys);
  };

  const endStick = () => {
    stickId = null;
    knob.style.transform = '';
    stick.classList.remove('active');
    setStick(new Set());
  };

  stick.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    stickId = e.pointerId;
    capture(stick, e.pointerId);
    stick.classList.add('active');
    moveStick(e);
  });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) moveStick(e); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    stick.addEventListener(type, (e) => { if (e.pointerId === stickId) endStick(); });
  }

  // Hold-to-press buttons (data-key = the keyboard key they stand for)
  root.querySelectorAll('[data-touch-key]').forEach((btn) => {
    const code = btn.dataset.touchKey;
    let id = null;
    const up = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      btn.classList.remove('down');
      input.release(code);
    };
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      id = e.pointerId;
      capture(btn, e.pointerId);
      btn.classList.add('down');
      input.press(code);
    });
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  });

  // When input is cleared (pause, blur), make sure nothing stays pressed on screen
  input.clearListeners.add(() => {
    knob.style.transform = '';
    stick.classList.remove('active');
    held = new Set();
    root.querySelectorAll('.down').forEach((b) => b.classList.remove('down'));
  });
}
