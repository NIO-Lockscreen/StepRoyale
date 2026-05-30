/* Dependency-free dopamine layer: canvas confetti + coin burst, a Web-Audio chime,
   and haptic taps. No libraries — keeps the bundle tiny and the build trivial.
   Driven by `bus.celebrate(...)`; wired up once in App via initFx(). */

type Kind = 'win' | 'buy' | 'mega';

interface P { x: number; y: number; vx: number; vy: number; rot: number; vr: number; size: number; color: string; shape: 0 | 1 | 2; life: number; }

const COLORS = ['#46e08a', '#f4d35e', '#2fbf71', '#e9c46a', '#ffffff', '#7ef0b0'];
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let parts: P[] = [];
let raf = 0;
let prefersReduced = false;

function ensureCanvas() {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.className = 'fx-canvas';
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

function resize() {
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function spawn(kind: Kind, ox: number, oy: number) {
  const W = window.innerWidth;
  const counts: Record<Kind, number> = { buy: 14, win: 40, mega: 120 };
  const n = prefersReduced ? Math.min(counts[kind], 10) : counts[kind];
  const spread = kind === 'mega' ? W * 0.5 : 120;
  const power = kind === 'mega' ? 16 : kind === 'win' ? 12 : 8;
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2;
    const sp = Math.random() * power + 3;
    parts.push({
      x: ox + (Math.random() - 0.5) * spread,
      y: oy + (Math.random() - 0.5) * 20,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - power * 0.6,   // bias upward — fountain feel
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 6 + 4,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      shape: ((Math.random() * 3) | 0) as 0 | 1 | 2,
      life: 1,
    });
  }
  if (parts.length && !raf) raf = requestAnimationFrame(tick);
}

function tick() {
  if (!ctx || !canvas) { raf = 0; return; }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  parts = parts.filter(p => p.life > 0);
  for (const p of parts) {
    p.vy += 0.35;            // gravity
    p.vx *= 0.99;
    p.x += p.vx; p.y += p.vy;
    p.rot += p.vr;
    p.life -= 0.012;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    if (p.shape === 0) ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);          // confetti strip
    else if (p.shape === 1) { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, 7); ctx.fill(); } // dot
    else { ctx.font = `${p.size * 2}px serif`; ctx.textAlign = 'center'; ctx.fillText('🪙', 0, p.size / 2); } // coin
    ctx.restore();
  }
  raf = parts.length ? requestAnimationFrame(tick) : 0;
}

// ── Sound: short, pleasant arpeggio via Web Audio (no asset files) ───────────────
let actx: AudioContext | null = null;
function blip(kind: Kind) {
  try {
    actx ??= new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = kind === 'mega' ? [523, 659, 784, 1047] : kind === 'win' ? [523, 784] : [659];
    notes.forEach((f, i) => {
      const o = actx!.createOscillator(), g = actx!.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      const t = actx!.currentTime + i * 0.08;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g); g.connect(actx!.destination);
      o.start(t); o.stop(t + 0.26);
    });
  } catch { /* audio blocked until a user gesture — fine */ }
}

function haptic(kind: Kind) {
  try { navigator.vibrate?.(kind === 'mega' ? [12, 30, 12] : kind === 'win' ? 14 : 6); } catch { /* unsupported */ }
}

let soundOn = true;
export const setSound = (on: boolean) => { soundOn = on; };
export const getSound = () => soundOn;

/** Fire the full multisensory burst. x/y default to upper-center (near the hero number). */
export function celebrate(kind: Kind, x?: number, y?: number) {
  ensureCanvas();
  spawn(kind, x ?? window.innerWidth / 2, y ?? window.innerHeight * 0.28);
  if (soundOn) blip(kind);
  haptic(kind);
}
