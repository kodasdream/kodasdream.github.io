// Game shell: render loop, scene switching with fades, input routing, autosave.
import { THREE, R } from '../render/renderer.js';
import { IsoCamera } from './camera.js';
import { Input } from './input.js';
import { updateOutlineScale } from '../render/toon.js';
import { updateAnchors, clearAnchors, toast, anyPanelOpen, closeAllPanels, topPanel } from '../ui/ui.js';
import { S, save, tick } from '../game/state.js';
import { bus } from '../core/util.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = R.renderer;
    this.iso = new IsoCamera();
    this.scenes = {};
    this.current = null;
    this.currentName = null;
    this.busy = false;
    this.clock = new THREE.Clock();
    this.saveTimer = 0;
    this.input = new Input(canvas, {
      tap: (x, y, e) => { if (!this.busy && !anyPanelOpen()) this.current?.onTap?.(x, y, e); },
      longPress: (x, y) => this.current?.onLongPress?.(x, y),
      pan: (dx, dy) => { if (this.current?.onPan) this.current.onPan(dx, dy); else this.iso.pan(dx, dy); },
      zoom: (f, x, y) => { if (this.current?.onZoom) this.current.onZoom(f, x, y); else this.iso.zoomBy(f); },
      rotate: (d) => { if (this.current?.noRotate) return; this.iso.rotateBy(d); },
      move: (x, y) => this.current?.onHover?.(x, y),
      key: (code, down, e) => this.onKey(code, down, e),
    });
    this.resize();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
    window.addEventListener('pagehide', () => save());
  }

  register(name, SceneClass) { this.scenes[name] = SceneClass; }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.renderer.setSize(this.width, this.height, false);
    this.iso.resize(this.width, this.height);
    clearTimeout(this._rt);
    this._rt = setTimeout(() => this.current?.onResize?.(), 250);
  }

  async go(name, params = {}) {
    if (this.switching) return;
    this.switching = true;
    const fade = document.getElementById('fade');
    fade.classList.add('on');
    await wait(360);
    closeAllPanels();
    try { this.current?.exit?.(); } catch (e) { console.error(e); }
    clearAnchors();
    this.iso.follow = null;
    const Scene = this.scenes[name];
    const sc = new Scene(this);
    this.current = sc;
    this.currentName = name;
    try { await sc.enter(params); } catch (e) { console.error('scene enter failed', e); toast('Something went wrong loading this area.', 'warn'); }
    bus.emit('scene', name, params);
    this.clock.getDelta();
    await wait(60);
    fade.classList.remove('on');
    this.switching = false;
  }

  onKey(code, down, e) {
    if (!down) return;
    if (code === 'Escape') { const p = topPanel(); if (p) p.close(); else this.current?.onEscape?.(); return; }
    if (anyPanelOpen()) return;
    if (code === 'KeyQ') this.iso.rotateStep(-1);
    if (code === 'KeyE') this.iso.rotateStep(1);
    if (code === 'Equal' || code === 'NumpadAdd') this.iso.zoomBy(1.15);
    if (code === 'Minus' || code === 'NumpadSubtract') this.iso.zoomBy(1 / 1.15);
    this.current?.onKey?.(code, e);
    bus.emit('key', code);
  }

  toast(text, kind, icon) { toast(text, kind, icon); }

  start() {
    const loop = () => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, this.clock.getDelta());
      tick();
      if (this.current) {
        try { this.current.update(dt); } catch (e) { console.error(e); }
        const cam = this.current.camera || this.iso.cam;
        if (!this.current.camera) this.iso.update(dt);
        updateOutlineScale(cam, this.height);
        this.renderer.render(this.current.scene, cam);
        const proj = this.current.project ? (p, o) => this.current.project(p, o) : (p, o) => this.iso.project(p, o);
        updateAnchors(proj);
      }
      bus.emit('frame', dt);
      this.saveTimer += dt;
      if (this.saveTimer > 20 && S && S.settings.autosave) { this.saveTimer = 0; save(); }
    };
    loop();
  }
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
