// Sonido de proyector de diapositivas ("ka-chunk") al pasar de imagen.
// Se sintetiza con Web Audio. Para usar una grabación real, poner la ruta en FILE
// (ej. "assets/sounds/projector.mp3") y se usará en lugar del sintetizado.
window.ProjectorSound = (function () {
  const FILE = "";
  const STORE_KEY = "bb-sound";
  const MIN_GAP = 70; // ms entre clacks al scrollear rápido

  let ctx = null;
  let master = null;
  let noise = null;
  let sample = null;
  let last = 0;
  let enabled = true;
  try {
    enabled = localStorage.getItem(STORE_KEY) !== "off";
  } catch (e) {}

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    // buffer de ruido blanco reutilizable
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (FILE) {
      fetch(FILE)
        .then((r) => r.arrayBuffer())
        .then((b) => ctx.decodeAudioData(b))
        .then((buf) => (sample = buf))
        .catch(() => {});
    }
  }

  // El navegador solo permite audio después de un gesto del usuario (click / tecla / touch).
  function unlock() {
    init();
    if (ctx && ctx.state === "suspended") ctx.resume();
  }
  ["pointerdown", "keydown", "touchstart"].forEach((ev) =>
    addEventListener(ev, unlock, { passive: true })
  );

  // ráfaga de ruido filtrado = click mecánico
  function click(t, freq, q, gain, dur) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = freq;
    bp.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.0015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(master);
    src.start(t, Math.random() * 0.1, dur + 0.02);
  }

  // golpe grave = cuerpo del proyector
  function thump(t, from, to, gain, dur) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function play() {
    if (!enabled || !ctx || ctx.state !== "running") return;
    const now = performance.now();
    if (now - last < MIN_GAP) return;
    last = now;
    const t = ctx.currentTime + 0.005;

    if (sample) {
      const s = ctx.createBufferSource();
      s.buffer = sample;
      s.playbackRate.value = 0.97 + Math.random() * 0.06;
      s.connect(master);
      s.start(t);
      return;
    }

    const j = () => 0.94 + Math.random() * 0.12; // leve variación en cada clack
    // "ka" — el solenoide saca la diapositiva
    click(t, 3200 * j(), 1.2, 0.6, 0.018);
    click(t + 0.004, 900 * j(), 2, 0.35, 0.03);
    thump(t, 160 * j(), 70, 0.35, 0.06);
    // "chunk" — la nueva diapositiva cae en su lugar
    const t2 = t + 0.085 + Math.random() * 0.015;
    click(t2, 2200 * j(), 1, 0.45, 0.025);
    click(t2 + 0.006, 600 * j(), 1.5, 0.3, 0.05);
    thump(t2, 120 * j(), 45, 0.5, 0.09);
  }

  function setEnabled(v) {
    enabled = v;
    try {
      localStorage.setItem(STORE_KEY, v ? "on" : "off");
    } catch (e) {}
    if (v) unlock();
  }

  return {
    play,
    setEnabled,
    get enabled() {
      return enabled;
    },
  };
})();
