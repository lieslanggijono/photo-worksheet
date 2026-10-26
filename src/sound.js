// A tiny paper rip for every button in the phone: the same crackly tear as
// the Allow slip, cut short, so each tap sounds like tearing off a little
// stub. Slightly different every time.

let ctx = null;

export function playPaper() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ctx ??= new Ctx();
    if (ctx.state === "suspended") ctx.resume();
    const dur = 0.17 + Math.random() * 0.08;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    let fiber = 0;
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      // Fibers snapping: short bursts of loud crackle between quieter tearing.
      if (fiber <= 0 && Math.random() < 0.004) fiber = 40 + Math.random() * 160;
      const crackle = fiber-- > 0 ? 0.7 : Math.random() < 0.12 ? 0.55 : 0.2;
      const env = Math.sin(Math.PI * Math.min(1, t * 1.1)) ** 0.5 * (1 - t * 0.5);
      data[i] = (Math.random() * 2 - 1) * crackle * env;
    }
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    const top = 2000 + Math.random() * 600;
    band.frequency.setValueAtTime(top, now);
    band.frequency.linearRampToValueAtTime(top * 0.6, now + dur);
    band.Q.value = 0.9;
    const gain = ctx.createGain();
    gain.gain.value = 0.1;
    src.connect(band).connect(gain).connect(ctx.destination);
    src.start();
  } catch {
    // no audio here: buttons just stay silent
  }
}

// The crayon icons (back, grid, check, +, mic) make one short chalk stroke:
// a gritty scratch of stick-slip grains, quick and quiet, like a single line
// on a blackboard.
export function playCrayon(length) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ctx ??= new Ctx();
    if (ctx.state === "suspended") ctx.resume();
    const dur = length ?? 0.11 + Math.random() * 0.05;
    const rate = ctx.sampleRate;
    const buf = ctx.createBuffer(1, Math.floor(rate * dur), rate);
    const data = buf.getChannelData(0);
    let grain = 0;
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      // Stick-slip: the chalk catches and releases in tiny irregular bursts.
      if (grain <= 0 && Math.random() < 0.012) grain = 6 + Math.random() * 30;
      const catchSlip = grain-- > 0 ? 1 : 0.18;
      // Presses in, drags, lifts off.
      // Long strokes keep dragging; short taps press in and lift off.
      const env = Math.min(1, t * 9) * (1 - t) ** (dur > 0.3 ? 0.5 : 1.4);
      data[i] = (Math.random() * 2 - 1) * catchSlip * env;
    }
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1800;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    const f = 3800 + Math.random() * 900;
    band.frequency.setValueAtTime(f, now);
    band.frequency.linearRampToValueAtTime(f * 1.15, now + dur);
    band.Q.value = 1.1;
    const gain = ctx.createGain();
    gain.gain.value = 0.14;
    src.connect(hp).connect(band).connect(gain).connect(ctx.destination);
    src.start();
  } catch {
    // no audio here
  }
}

// Every button inside the phone taps, except the Allow slip, which tears.
export function installPaperTaps(root = document) {
  const onDown = (e) => {
    const b = e.target.closest?.("button, [role='button']");
    if (!b || b.disabled || !b.closest(".phone") || b.closest(".allow")) return;
    if (b.matches(".mic-crayon, .mic")) return; // the mic plays its own click
    b.matches(".crayon-btn") ? playCrayon() : playPaper();
  };
  root.addEventListener("pointerdown", onDown, true);
  return () => root.removeEventListener("pointerdown", onDown, true);
}

// A mechanical keyboard key for every keystroke in the phone's text fields,
// like keyboard ASMR: a crisp, high clack as the key bottoms out, a short
// woody body, and a tiny click as it springs back. Space and Return are the
// bigger keys, a little deeper and longer. Every press varies slightly.
function burst(at, len, freq, q, level, out) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * len));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp((-i / n) * 6);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = level;
  src.connect(f).connect(g).connect(out);
  src.start(at);
}

function tone(at, from, to, len, level, out) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(from, at);
  o.frequency.exponentialRampToValueAtTime(to, at + len);
  g.gain.setValueAtTime(level, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + len + 0.01);
}

export function playKey(key) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ctx ??= new Ctx();
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    const big = key === " " || key === "Enter";
    const out = ctx.createGain();
    out.gain.value = key === "Backspace" ? 0.11 : 0.17;
    out.connect(ctx.destination);
    const v = 0.9 + Math.random() * 0.2;

    // Bottom-out clack: bright and very short.
    burst(now, 0.012, (big ? 3800 : 5600) * v, 2.2, 1, out);
    // The key's body: a quick, high, woody knock.
    tone(now, (big ? 520 : 900) * v, (big ? 300 : 560) * v, big ? 0.05 : 0.03, 0.5, out);
    // A soft low thock underneath, more on the big keys.
    tone(now, big ? 180 : 260, big ? 110 : 170, big ? 0.06 : 0.035, big ? 0.35 : 0.18, out);
    // Spring-back click as the key comes up.
    const up = now + (big ? 0.09 : 0.06) + Math.random() * 0.015;
    burst(up, 0.008, (big ? 4200 : 6400) * v, 2.5, 0.35, out);
    // Big keys rattle a touch (the stabilizer).
    if (big) burst(now + 0.02, 0.03, 2600, 1.4, 0.18, out);
  } catch {
    // no audio here: typing stays silent
  }
}

// The crayon mic: a crisp two-part switch click when it turns dark and
// starts listening, a single softer click when it stops.
export function playMic(on = true) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ctx ??= new Ctx();
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = on ? 0.2 : 0.13;
    out.connect(ctx.destination);
    burst(now, 0.01, 4800, 2.4, 1, out);
    tone(now, 1400, 900, 0.025, 0.35, out);
    if (on) {
      burst(now + 0.055, 0.008, 6200, 2.6, 0.6, out);
      tone(now + 0.055, 1900, 1300, 0.02, 0.25, out);
    }
  } catch {
    // no audio here
  }
}

export function installTypewriter(root = document) {
  const onKey = (e) => {
    const el = e.target;
    if (!el?.closest?.(".phone") || e.metaKey || e.ctrlKey || e.altKey) return;
    const typing = el.matches?.("textarea, input:not([type=range]):not([type=checkbox]), [contenteditable], [contenteditable] *");
    if (!typing) return;
    if (e.key.length === 1 || e.key === "Enter" || e.key === "Backspace") playKey(e.key);
  };
  root.addEventListener("keydown", onKey, true);
  return () => root.removeEventListener("keydown", onKey, true);
}

// Every crayon mark that draws itself in (underlines, the "!", the smiley)
// scratches like chalk as its stroke starts. Tiny follow-up strokes within
// a moment of each other share one sound.
export function installChalkDraw(root = document) {
  let last = 0;
  const onStart = (e) => {
    if (e.animationName !== "penDraw") return;
    if (!(e.target instanceof SVGElement) || !e.target.closest(".phone")) return;
    const now = performance.now();
    if (now - last < 120) return;
    last = now;
    // A long stroke (an underline) scratches for as long as it draws.
    const d = parseFloat(getComputedStyle(e.target).animationDuration) || 0.15;
    playCrayon(Math.min(1.1, Math.max(0.12, d * 0.9)));
  };
  root.addEventListener("animationstart", onStart, true);
  return () => root.removeEventListener("animationstart", onStart, true);
}
