// Unified mouse / touch / keyboard input. Taps vs drags, pinch-zoom, two-finger twist, wheel, keys.
export class Input {
  /**
   * h: { tap(x, y, e), longPress(x, y), pan(dx, dy), zoom(f, x, y), rotate(d), move(x, y), key(code, down) }
   */
  constructor(el, h) {
    this.el = el;
    this.h = h;
    this.pointers = new Map();
    this.keys = new Set();
    this.dragging = false;
    this.downAt = 0;
    this.start = null;
    this.lastPinch = null;
    this.enabled = true;
    el.addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.moveEv(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', (e) => this.up(e, true));
    el.addEventListener('wheel', (e) => { e.preventDefault(); if (this.enabled) h.zoom?.(Math.exp(-e.deltaY * 0.0012), e.clientX, e.clientY); }, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!this.keys.has(e.code)) h.key?.(e.code, true, e);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); h.key?.(e.code, false, e); });
    window.addEventListener('blur', () => this.keys.clear());
  }

  down(e) {
    if (!this.enabled) return;
    this.el.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button });
    if (this.pointers.size === 1) {
      this.start = { x: e.clientX, y: e.clientY, t: performance.now(), button: e.button };
      this.dragging = false;
      clearTimeout(this.lpTimer);
      this.lpTimer = setTimeout(() => {
        if (!this.dragging && this.pointers.size === 1) { this.longFired = true; this.h.longPress?.(this.start.x, this.start.y); }
      }, 550);
      this.longFired = false;
    } else {
      clearTimeout(this.lpTimer);
      this.dragging = true;
      this.lastPinch = this.pinchInfo();
    }
  }

  pinchInfo() {
    const ps = [...this.pointers.values()];
    if (ps.length < 2) return null;
    const [a, b] = ps;
    return { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }

  moveEv(e) {
    if (!this.pointers.has(e.pointerId)) { this.h.move?.(e.clientX, e.clientY); return; }
    const p = this.pointers.get(e.pointerId);
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (!this.enabled) return;
    if (this.pointers.size >= 2) {
      const info = this.pinchInfo();
      if (info && this.lastPinch) {
        if (this.lastPinch.d > 0) this.h.zoom?.(info.d / this.lastPinch.d, info.mx, info.my);
        let da = info.ang - this.lastPinch.ang;
        if (da > Math.PI) da -= Math.PI * 2; if (da < -Math.PI) da += Math.PI * 2;
        this.h.rotate?.(-da);
        this.h.pan?.(info.mx - this.lastPinch.mx, info.my - this.lastPinch.my);
      }
      this.lastPinch = info;
      return;
    }
    if (!this.dragging && Math.hypot(e.clientX - this.start.x, e.clientY - this.start.y) > 9) { this.dragging = true; clearTimeout(this.lpTimer); }
    if (this.dragging) {
      if (p.button === 2 || this.keys.has('ShiftLeft')) this.h.rotate?.(dx * 0.008);
      else this.h.pan?.(dx, dy);
    }
    this.h.move?.(e.clientX, e.clientY);
  }

  up(e, cancel = false) {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.delete(e.pointerId);
    clearTimeout(this.lpTimer);
    if (this.pointers.size === 0) {
      if (!cancel && !this.dragging && !this.longFired && this.enabled && this.start && performance.now() - this.start.t < 700) this.h.tap?.(e.clientX, e.clientY, e);
      this.dragging = false;
      this.lastPinch = null;
    } else this.lastPinch = this.pinchInfo();
  }

  axis() {
    const k = this.keys;
    let x = 0, y = 0;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) y += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
    return { x, y };
  }
}
