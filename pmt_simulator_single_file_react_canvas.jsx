import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

// ================= UI PRIMITIVES =================
function Label({ htmlFor, children, className = "", ...props }) {
  return (
    <label htmlFor={htmlFor} className={`text-sm font-medium ${className}`} {...props}>
      {children}
    </label>
  );
}

// Click-or-drag slider with keyboard support
function Slider({ value, min = 0, max = 100, step = 1, onValueChange, className = "", ...props }) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  const val = value[0];
  const pct = (val - min) / (max - min);

  const quantize = (raw) => {
    if (!step) return raw;
    const q = Math.round((raw - min) / step) * step + min;
    return Math.min(max, Math.max(min, q));
  };

  const setFromClientX = (clientX) => {
    const el = trackRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const clamped = Math.min(1, Math.max(0, x));
    const raw = min + clamped * (max - min);
    onValueChange && onValueChange([Number(quantize(raw))]);
  };

  const onPointerMove = (e) => { if (dragging) setFromClientX(e.clientX); };
  const onPointerUp = () => {
    setDragging(false);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  };
  const onThumbPointerDown = (e) => {
    e.preventDefault();
    setDragging(true);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };
  const onTrackPointerDown = (e) => {
    e.preventDefault();
    setFromClientX(e.clientX); // set on first click
    setDragging(true);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const onKeyDown = (e) => {
    let delta = 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') delta = step || ((max-min)/100);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') delta = -(step || ((max-min)/100));
    if (delta !== 0) {
      e.preventDefault();
      const next = Math.min(max, Math.max(min, val + delta));
      onValueChange && onValueChange([Number(quantize(next))]);
    }
  };

  return (
    <div className={`w-full select-none ${className}`} {...props}>
      <div ref={trackRef} className="relative h-6 flex items-center" onPointerDown={onTrackPointerDown}>
        <div className="absolute inset-x-0 h-1 rounded bg-slate-700" />
        <div className="absolute left-0 h-1 rounded bg-cyan-400" style={{ right: `${(1 - pct) * 100}%` }} />
        <div
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={val}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onThumbPointerDown}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border border-slate-400 shadow cursor-grab active:cursor-grabbing"
          style={{ left: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}

function Switch({ checked, onCheckedChange, id, className = "", ...props }) {
  const handleChange = (e) => onCheckedChange && onCheckedChange(e.target.checked);
  return (
    <input type="checkbox" role="switch" checked={checked} onChange={handleChange} id={id} className={`w-4 h-4 ${className}`} {...props} />
  );
}

function Button({ children, className = "", ...props }) {
  return (
    <button className={`px-3 py-1.5 rounded-md bg-slate-700 text-white hover:bg-slate-600 ${className}`} {...props}>
      {children}
    </button>
  );
}

function Card({ children, className = "", ...props }) {
  return (
    <div className={`bg-slate-900/70 rounded-2xl border border-slate-700 shadow-sm text-slate-200 ${className}`} {...props}>{children}</div>
  );
}

function CardContent({ children, className = "", ...props }) {
  return (
    <div className={`p-4 ${className}`} {...props}>{children}</div>
  );
}

// Smoothly animated numeric label
function SmoothNumber({ value, format = (v) => String(v), stiffness = 200, damping = 30 }) {
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness, damping });
  const [display, setDisplay] = useState(value);
  useEffect(() => { const unsub = spring.on("change", (v) => setDisplay(v)); return () => unsub(); }, [spring]);
  useEffect(() => { mv.set(value); }, [value]);
  return <>{format(display)}</>;
}

// Number compact formatter for nice labels
function compact(n) {
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n/1e9).toFixed(n < 1e10 ? 1 : 0) + "B";
  if (abs >= 1e6) return (n/1e6).toFixed(n < 1e7 ? 1 : 0) + "M";
  if (abs >= 1e3) return (n/1e3).toFixed(n < 1e4 ? 1 : 0) + "k";
  return Math.round(n).toString();
}

// ================= SIMULATION HELPERS =================
function samplePoisson(lambda) {
  if (lambda <= 0) return 0;
  if (lambda < 30) {
    let L = Math.exp(-lambda), k = 0, p = 1;
    while (p > L) { k++; p *= Math.random(); }
    return k - 1;
  }
  const mean = lambda, std = Math.sqrt(lambda);
  const u1 = Math.random(), u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(0, Math.round(mean + std * z));
}

function randn() {
  const u1 = Math.random() || 1e-12; // avoid log(0)
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function expovariate(rate) {
  return rate > 0 ? -Math.log(1 - Math.random()) / rate : Infinity;
}

// Helper: compute photon launch time so it hits the photocathode at tEvent
function photonLaunchTime(tEvent, vph, xStartP, targetX) {
  const distToPC = Math.max(0, (targetX - xStartP));
  return tEvent - distToPC / Math.max(1e-6, vph);
}

// Create a synchronized visual pair for tests/logic
function makeSyncedVisuals(tEvent, y, vph, velE, xStartP, targetX) {
  return {
    photon: { t0: photonLaunchTime(tEvent, vph, xStartP, targetX), y, v: vph },
    electron: { t0: tEvent, y, v: velE },
  };
}

function pulseShape(t, t0, A, tauRise, tauFall) {
  if (t <= t0) return 0;
  const x = (t - t0);
  const y = Math.exp(-x / tauFall) - Math.exp(-x / tauRise);
  const xPeak = (tauRise * tauFall * Math.log(tauFall / tauRise)) / (tauFall - tauRise);
  const peak = Math.exp(-xPeak / tauFall) - Math.exp(-xPeak / tauRise);
  const norm = peak > 0 ? (y / peak) : 0;
  return A * norm; // volts
}

function computeVoltage(tSample, pulses, tauRise, tauFall, darkNoise) {
  // legacy exact-sum helper (still used by tests)
  let v = 0;
  for (let i = 0; i < pulses.length; i++) {
    const p = pulses[i];
    v += pulseShape(tSample, p.t0, p.A, tauRise, tauFall);
  }
  v += (Math.random() - 0.5) * 2 * darkNoise; // additive noise
  return v;
}

// Peak of the unnormalized double-exponential, used to scale IIR impulses
function doubleExpPeak(tauRise, tauFall) {
  if (tauRise <= 0 || tauFall <= 0 || tauRise === tauFall) return 1; // guard
  const xPeak = (tauRise * tauFall * Math.log(tauFall / tauRise)) / (tauFall - tauRise);
  return Math.exp(-xPeak / tauFall) - Math.exp(-xPeak / tauRise);
}

// ================= PARTICLES & DRAWING =================
// Visuals use lightweight plain objects; no classes needed.

const MAX_ANIMATED_PHOTONS = 500;
const MAX_ELECTRONS = 800;
// Fixed on-screen sprite counts (accurate at low counts; clamp to these at high counts)
const PH_FIXED_COUNT = 80; // photons
const EL_FIXED_COUNT = 80; // electrons

// Dynamic visual capping based on rate and device DPR
function getVisualCaps(rateE, flux, dpr) {
  // Keep electrons and photons visible; thin aggressively as rates grow.
  // rateE: electron event rate (detections + dark), flux: photons/s (info only), dpr: device pixel ratio
  const dprScale = 1 / (1 + Math.max(0, dpr - 1) * 0.7);
  let phot = 300, elec = 300;
  if (rateE >= 2_000 && rateE < 10_000) { phot = 160; elec = 160; }
  else if (rateE >= 10_000 && rateE < 50_000) { phot = 80; elec = 80; }
  else if (rateE >= 50_000 && rateE < 100_000) { phot = 40; elec = 40; }
  else if (rateE >= 100_000) { phot = PH_FIXED_COUNT; elec = EL_FIXED_COUNT; } // at extreme rates, show blurred beams only

  phot = Math.round(phot * dprScale);
  elec = Math.round(elec * dprScale);
  return { photons: Math.max(0, phot), electrons: Math.max(0, elec) };
}

// Thin an array to at most `cap` elements by striding
function thinArray(arr, cap) {
  if (cap <= 0) return [];
  if (arr.length <= cap) return arr;
  const stride = Math.ceil(arr.length / cap);
  const out = [];
  for (let i = 0; i < arr.length; i += stride) out.push(arr[i]);
  return out;
}

function drawPMT(ctx, W, H) {
  const cy = H * 0.5;
  const radius = Math.min(H * 0.22, W * 0.10);
  const tubeLen = Math.min(W * 0.75, W - 40);
  const xLeft = (W - tubeLen) / 2;
  const xRight = xLeft + tubeLen;

  // glass tube
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(148, 163, 184, 0.55)";
  ctx.fillStyle = "rgba(56, 189, 248, 0.08)";
  ctx.beginPath();
  ctx.moveTo(xLeft + radius, cy - radius);
  ctx.lineTo(xRight - radius, cy - radius);
  ctx.arc(xRight - radius, cy, radius, -Math.PI/2, Math.PI/2, false);
  ctx.lineTo(xLeft + radius, cy + radius);
  ctx.arc(xLeft + radius, cy, radius, Math.PI/2, -Math.PI/2, false);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // circular photocathode (brown disc) near left end
  const pcR = radius * 0.65;
  const pcX = xLeft + radius * 0.95; // slightly inside the glass
  const pcY = cy;
  ctx.fillStyle = "#8B5A2B"; // brown
  ctx.beginPath(); ctx.arc(pcX, pcY, pcR, 0, Math.PI * 2); ctx.fill();

  // simple anode ring at right
  ctx.strokeStyle = "#64748b"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(xRight - radius * 0.95, cy, pcR * 0.65, 0, Math.PI * 2); ctx.stroke();

  // beam guide (left to photocathode)
  ctx.strokeStyle = "rgba(250, 204, 21, 0.6)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(xLeft - 20, cy); ctx.lineTo(pcX - pcR, cy); ctx.stroke();
  ctx.restore();
}

function drawPhoton(ctx, pt) {
  ctx.save(); ctx.fillStyle = "#FDE047"; ctx.beginPath(); ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

function drawElectron(ctx, pt) {
  ctx.save(); ctx.fillStyle = "#60A5FA"; ctx.beginPath(); ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

// Strong beam blur for high flux
function drawFluxBlur(ctx, x1, x2, y, thickness, intensity) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const len = Math.max(0, x2 - x1);
  const k = Math.min(1, Math.max(0, Math.pow(intensity, 0.7)));
  const h = thickness * (1 + 0.8 * k);
  const yTop = y - h / 2;
  ctx.filter = `blur(${10 + 22 * k}px)`; ctx.globalAlpha = 0.16 + 0.28 * k; ctx.fillStyle = "#FDE047"; ctx.fillRect(x1, yTop, len, h);
  ctx.filter = `blur(${6 + 14 * k}px)`; ctx.globalAlpha = 0.22 + 0.36 * k; ctx.fillRect(x1 + len * 0.03, yTop + h * 0.12, len * 0.94, h * 0.76);
  ctx.filter = `blur(${3 + 8 * k}px)`; ctx.globalAlpha = 0.30 + 0.45 * k; ctx.fillRect(x1 + len * 0.12, yTop + h * 0.36, len * 0.76, h * 0.28);
  ctx.filter = "none"; ctx.restore();
}

function drawElectronBlur(ctx, x1, x2, y, thickness, intensity) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const len = Math.max(0, x2 - x1);
  const k = Math.min(1, Math.max(0, Math.pow(intensity, 0.7)));
  const h = thickness * (1 + 0.8 * k);
  const yTop = y - h / 2;
  ctx.filter = `blur(${10 + 22 * k}px)`; ctx.globalAlpha = 0.18 + 0.30 * k; ctx.fillStyle = "#60A5FA"; ctx.fillRect(x1, yTop, len, h);
  ctx.filter = `blur(${6 + 14 * k}px)`; ctx.globalAlpha = 0.24 + 0.38 * k; ctx.fillRect(x1 + len * 0.03, yTop + h * 0.12, len * 0.94, h * 0.76);
  ctx.filter = `blur(${3 + 8 * k}px)`; ctx.globalAlpha = 0.32 + 0.46 * k; ctx.fillRect(x1 + len * 0.12, yTop + h * 0.36, len * 0.76, h * 0.28);
  ctx.filter = "none"; ctx.restore();
}

function drawOscilloscope(canvas, samples, timeWindow, thresholdVoltage) {
  const dpr = window.devicePixelRatio || 1;
  const ctx = canvas.getContext("2d");
  const W = canvas.width / dpr, H = canvas.height / dpr;
  ctx.save(); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H);

  const tNow = samples.length ? samples[samples.length - 1].t : 0;
  let minV = 0, maxV = 1;
  for (const s of samples) { minV = Math.min(minV, s.v); maxV = Math.max(maxV, s.v); }
  maxV = Math.max(maxV, thresholdVoltage * 1.2);
  const pad = 0.05 * (maxV - minV || 1);
  minV -= pad; maxV += pad;
  const xForT = (t) => ((t - (tNow - timeWindow)) / timeWindow) * W;
  const yForV = (v) => H - ((v - minV) / (maxV - minV)) * H;

  // grid
  ctx.strokeStyle = "rgba(148,163,184,0.25)"; ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) { const x = (i / 10) * W; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let i = 0; i <= 6; i++) { const y = (i / 6) * H; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // trace
  ctx.strokeStyle = "#22d3ee"; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i < samples.length; i++) { const s = samples[i]; const x = xForT(s.t), y = yForV(s.v); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  ctx.stroke();

  // threshold line
  ctx.strokeStyle = "#fb7185"; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(0, yForV(thresholdVoltage)); ctx.lineTo(W, yForV(thresholdVoltage)); ctx.stroke(); ctx.setLineDash([]);

  // labels
  ctx.fillStyle = "#cbd5e1"; ctx.font = "12px ui-sans-serif, system-ui"; ctx.fillText(`${thresholdVoltage.toFixed(2)} V`, 8, yForV(thresholdVoltage) - 6);
  ctx.restore();
}

function drawTTLOscope(canvas, samples, timeWindow, eventTimes) {
  const dpr = window.devicePixelRatio || 1;
  const ctx = canvas.getContext("2d");
  const W = canvas.width / dpr, H = canvas.height / dpr;
  ctx.save(); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H);

  const tNow = samples.length ? samples[samples.length - 1].t : 0;
  const xForT = (t) => ((t - (tNow - timeWindow)) / timeWindow) * W;
  const yForTTL = (v) => H - (v / 3.3) * H;

  // grid
  ctx.strokeStyle = "rgba(148,163,184,0.25)"; ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) { const x = (i / 10) * W; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }

  // TTL trace
  ctx.strokeStyle = "#10b981"; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i < samples.length; i++) { const s = samples[i]; const x = xForT(s.t), y = yForTTL(s.ttl); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  ctx.stroke();

  // Exact event markers (ticks at the precise threshold-crossing time)
  if (eventTimes && eventTimes.length) {
    ctx.strokeStyle = "rgba(16,185,129,0.7)"; ctx.lineWidth = 1;
    for (let i = 0; i < eventTimes.length; i++) {
      const x = xForT(eventTimes[i]);
      if (x >= 0 && x <= W) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 8); ctx.stroke(); }
    }
  }

  // labels
  ctx.fillStyle = "#cbd5e1"; ctx.font = "12px ui-sans-serif, system-ui"; ctx.fillText("TTL (0 / 3.3V)", 8, 14);
  ctx.restore();
}

// Reusable control wrapper
function Control({ label, value, min, max, step, onValueChange }) {
  return (
    <div className="space-y-2">
      <Label className="text-slate-300">{label}</Label>
      <Slider value={value} min={min} max={max} step={step} onValueChange={onValueChange} />
    </div>
  );
}

// Optional helper retained for tests we added previously
function stepTowards(b, target, dt, tau = 0.15) {
  const a = 1 - Math.exp(-Math.max(0, dt) / tau);
  return b + (target - b) * a;
}

// ================= MAIN COMPONENT =================
export default function PMTSimulator() {
  // --- Controls (state) ---
  const [fluxExp, setFluxExp] = useState(Math.log10(400)); // 1..10,000,000 /s via log slider (0..7)
  const flux = Math.pow(10, fluxExp);
  const [qe, setQe] = useState(0.25);
  const [darkRate, setDarkRate] = useState(20);
  const [darkNoise, setDarkNoise] = useState(0.02); // ±V
  const [gain, setGain] = useState(0.5); // V per photon (peak)
  const [tauRise, setTauRise] = useState(0.010); // 10 ms
  const [tauFall, setTauFall] = useState(0.060); // 60 ms
  const [timeWindow, setTimeWindow] = useState(3);
  const [thresholdVoltage, setThresholdVoltage] = useState(0.2);
  const [ttlWidthMs, setTtlWidthMs] = useState(50);
  const [deadTimeMs, setDeadTimeMs] = useState(100);
  const [running, setRunning] = useState(true);

  // --- Canvases & sim state ---
  const oscCanvasRef = useRef(null);
  const ttlCanvasRef = useRef(null);
  const pmtCanvasRef = useRef(null);

  const lastTsRef = useRef(null);
  const tRef = useRef(0);
  const sampleRateRef = useRef(240); // Hz (adaptive)
  const sampleIntervalRef = useRef(1 / 240);
  const nextSampleTimeRef = useRef(0);
  const samplesRef = useRef([]);
  const photonsRef = useRef([]);
  const electronsRef = useRef([]);
  const pairsRef = useRef([]);
  const arrivalsDetRef = useRef([]);
  const arrivalsDarkRef = useRef([]);

  const nextPhotonVisRef = useRef(null);

  // Event-driven IIR states (unnormalized double-exp states)
  const sRiseRef = useRef(0);
  const sFallRef = useRef(0);
  
  const lastSampleVRef = useRef(0);
  const lastSampleTRef = useRef(0);

  // TTL state
  const ttlActiveUntilRef = useRef(0);
  const nextTriggerReadyRef = useRef(0);
  
  // Live stats
  const eventsRef = useRef([]);
  const [ttlRate, setTtlRate] = useState(0);
  const lastStatsUpdateRef = useRef(0);

  // mirrored params for RAF stability
  const paramsRef = useRef({ flux, qe, darkRate, darkNoise, gain, tauRise, tauFall, timeWindow, thresholdVoltage, ttlWidthMs, deadTimeMs });
  const runningRef = useRef(running);

  // --- Constraints & mirrors ---
  useEffect(() => { if (tauFall <= tauRise) setTauFall(Math.min(0.1, tauRise + 0.001)); }, [tauRise, tauFall]);
  useEffect(() => {
    paramsRef.current = { flux: Math.pow(10, fluxExp), qe, darkRate, darkNoise, gain, tauRise, tauFall, timeWindow, thresholdVoltage, ttlWidthMs, deadTimeMs };
  }, [fluxExp, qe, darkRate, darkNoise, gain, tauRise, tauFall, timeWindow, thresholdVoltage, ttlWidthMs, deadTimeMs]);
  useEffect(() => { runningRef.current = running; }, [running]);
  
  // --- Main RAF loop ---
  useEffect(() => {
    let raf;
    function loop(ts) {
      if (!runningRef.current) { lastTsRef.current = ts; raf = requestAnimationFrame(loop); return; }
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = Math.min(0.05, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;

      const p = paramsRef.current;
      tRef.current += dt;

      // Geometry
      const pmtCanvas = pmtCanvasRef.current;
      const dpr = window.devicePixelRatio || 1;
      const W = pmtCanvas ? pmtCanvas.width / dpr : 0;
      const H = pmtCanvas ? pmtCanvas.height / dpr : 0;
      const beamY = H * 0.5;
      const radius = Math.min(H * 0.22, W * 0.10);
      const tubeLen = Math.min(W * 0.75, W - 40);
      const xLeft = (W - tubeLen) / 2;
      const pcX = xLeft + radius * 0.95;
      const targetX = pcX;
      const xEndAnode = xLeft + tubeLen - radius * 0.95;

      // Rates
      const photonSpeed = W * 0.6; // px/s
      const electronSpeed = W * 1.2; // px/s (faster)
      // Use a single baseline electronSpeed for both the analog model's transit time and the visual electron speed
      const electronTransitTime = Math.max(0, (xEndAnode - (targetX + 2)) / Math.max(1e-6, electronSpeed));
      const detRate = Math.max(0, p.flux * p.qe);
      const dkRate  = Math.max(0, p.darkRate);
      const electronRate = detRate + dkRate;
      const visCaps = getVisualCaps(electronRate, p.flux, dpr); // dynamic caps by rate & DPR
      const pairsCap = Math.min(visCaps.photons, visCaps.electrons);

      // --- Visuals --- (defined as a function so we can render after spawning events this frame)
      const renderVisuals = () => {
        const pmtCanvas = pmtCanvasRef.current;
        if (!pmtCanvas) return;
        const ctx = pmtCanvas.getContext("2d");
        const dpr = window.devicePixelRatio || 1;
        const W = pmtCanvas.width / dpr, H = pmtCanvas.height / dpr;
        const beamY = H * 0.5;
        const radius = Math.min(H * 0.22, W * 0.10);
        const tubeLen = Math.min(W * 0.75, W - 40);
        const xLeft = (W - tubeLen) / 2;
        const pcX = xLeft + radius * 0.95;
        const targetX = pcX;
        const xEndAnode = xLeft + tubeLen - radius * 0.95;

        ctx.save(); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H);
        drawPMT(ctx, W, H);

        // Blurs (guarded; heavy filters disabled on high-DPR or extreme flux)
        const enableBlur = electronRate > 1e3 && dpr <= 1.5;
        if (enableBlur) {
          const xStart = xLeft - 20;
          const xEnd = targetX - 4;
          const intensity = Math.min(1, Math.max(0, (Math.log10(Math.max(1, p.flux)) - 3) / 4)); // 1e3..1e7 -> 0..1
          drawFluxBlur(ctx, xStart, xEnd, beamY, Math.max(4, H * 0.14), intensity);
        }

        if (enableBlur && electronRate > 1e3) {
          const xStartEl = targetX + 2; const xEndEl = xEndAnode;
          const intensityE = Math.min(1, Math.max(0, (Math.log10(Math.max(1, electronRate)) - 3) / 4));
          drawElectronBlur(ctx, xStartEl, xEndEl, beamY, Math.max(3, H * 0.12), intensityE);
        }

        // Draw & cull synchronized photon/electron pairs (analytic positions)
        const xStartP = xLeft - 20;
        const xStartE = targetX + 2;
        const keepPairs = [];
        for (let i = 0; i < pairsRef.current.length; i++) {
          const pair = pairsRef.current[i];
          // photon
          const agePh = tRef.current - pair.ph.t0;
          if (agePh >= 0) {
            const xPh = xStartP + pair.ph.v * agePh;
            if (xPh < targetX) drawPhoton(ctx, { x: xPh, y: pair.ph.y });
          }
          // electron
          const ageEl = tRef.current - pair.el.t0;
          if (ageEl >= 0) {
            const xEl = xStartE + pair.el.v * ageEl;
            if (xEl < xEndAnode) drawElectron(ctx, { x: xEl, y: pair.el.y });
          }
          // keep while either is pending or still inside tube
          const phVisible = agePh < 0 || (agePh >= 0 && (xStartP + pair.ph.v * agePh) < targetX);
          const elVisible = ageEl < 0 || (ageEl >= 0 && (xStartE + pair.el.v * ageEl) < xEndAnode);
          if (phVisible || elVisible) keepPairs.push(pair);
        }
        pairsRef.current = thinArray(keepPairs, Math.min(visCaps.photons, visCaps.electrons));
        ctx.restore();
      };

      // --- Oscilloscope sampling (unified τ-leap IIR with jitter) ---
      while (nextSampleTimeRef.current <= tRef.current) {
        const tSample = nextSampleTimeRef.current;
        const dtS = sampleIntervalRef.current;

        // Exponential decay of states
        const aR = Math.exp(-dtS / p.tauRise);
        const aF = Math.exp(-dtS / p.tauFall);
        sRiseRef.current *= aR;
        sFallRef.current *= aF;

        // Poisson counts within this sample
        const kDet = samplePoisson(Math.max(0, p.flux * p.qe) * dtS);
        const kDark = samplePoisson(Math.max(0, p.darkRate) * dtS);

        // Enqueue arrivals with fixed transit delay; emit visuals at emission time
        function enqueue(type, k, A) {
          if (k <= 0) return;
          const tStartEmit = tSample - dtS;
          const tEndEmit = tSample;
          const tStartArr = tStartEmit + electronTransitTime;
          const tEndArr = tEndEmit + electronTransitTime;

          // push a single bucket per type for this sample; processed when tEndArr is reached
          (type === 'det' ? arrivalsDetRef.current : arrivalsDarkRef.current).push({
            tStart: tStartArr, tEnd: tEndArr, k, A, dt: dtS,
          });

          // visuals: spawn synchronized photon/electron pairs tied to emission time (detections only)
          if (type === 'det' && pairsCap > 0) {
            const xStartP = xLeft - 20;
            const budget = Math.max(0, pairsCap - pairsRef.current.length);
            const nVis = Math.min(k, budget);
            for (let i = 0; i < nVis; i++) {
              const u = Math.random();
              const tEvent = tStartEmit + u * dtS; // emission time at photocathode
              const y = beamY + (Math.random() - 0.5) * (H * 0.2);
              const vph = photonSpeed * (0.8 + 0.4 * Math.random());
              const velE = electronSpeed; // fixed to match IIR transit time so the hit at the anode lines up
              const tPhotonStart = photonLaunchTime(tEvent, vph, xStartP, targetX);
              // Photon hits the photocathode at tEvent, electron starts at tEvent and reaches anode exactly at tEvent + electronTransitTime
              pairsRef.current.push({ ph: { t0: tPhotonStart, y, v: vph }, el: { t0: tEvent, y, v: velE } });
            }
          }
        }

        enqueue('det', kDet, p.gain);
        enqueue('dark', kDark, p.gain * 0.9);

        // Process all arrival buckets that end within this sample (arrivals in (tSample-dtS, tSample])
        function processArrivals(arrList) {
          while (arrList.length && arrList[0].tEnd <= tSample + 1e-12) {
            const b = arrList.shift();
            const dtB = b.dt || (b.tEnd - b.tStart);
            const cR = dtB / p.tauRise, cF = dtB / p.tauFall;
            const k = b.k, A = b.A;
            if (k <= 6) {
              for (let i = 0; i < k; i++) {
                const u = Math.random();
                sRiseRef.current += A * Math.exp(-(1 - u) * cR);
                sFallRef.current += A * Math.exp(-(1 - u) * cF);
              }
            } else if (k > 0) {
              const mR = (1 - Math.exp(-cR)) / cR;
              const mF = (1 - Math.exp(-cF)) / cF;
              const e2R = (1 - Math.exp(-2 * cR)) / (2 * cR);
              const e2F = (1 - Math.exp(-2 * cF)) / (2 * cF);
              const vR = Math.max(0, e2R - mR * mR);
              const vF = Math.max(0, e2F - mF * mF);
              sRiseRef.current += A * (k * mR + Math.sqrt(k * vR) * randn());
              sFallRef.current += A * (k * mF + Math.sqrt(k * vF) * randn());
            }
          }
        }
        processArrivals(arrivalsDetRef.current);
        processArrivals(arrivalsDarkRef.current);

        // Output voltage + noise
        const vPrev = lastSampleVRef.current;
        const vCurr = (sFallRef.current - sRiseRef.current) + (Math.random() - 0.5) * 2 * p.darkNoise;

        // Rising-edge detection with sub-sample interpolation
        const thr = p.thresholdVoltage;
        if (vPrev < thr && vCurr >= thr) {
          const dv = Math.max(1e-9, vCurr - vPrev);
          const frac = (thr - vPrev) / dv; // in (0,1]
          const tCross = lastSampleTRef.current + Math.min(1, Math.max(0, frac)) * (tSample - lastSampleTRef.current);
          const ttlWidth = p.ttlWidthMs / 1000;
          const deadTime = p.deadTimeMs / 1000;
          if (tCross >= nextTriggerReadyRef.current) {
            ttlActiveUntilRef.current = Math.max(ttlActiveUntilRef.current, tCross + ttlWidth);
            nextTriggerReadyRef.current = tCross + deadTime;
            eventsRef.current.push(tCross);
          }
        }

        const ttl = tSample < ttlActiveUntilRef.current ? 3.3 : 0;
        samplesRef.current.push({ t: tSample, v: vCurr, ttl });
        lastSampleVRef.current = vCurr;
        lastSampleTRef.current = tSample;
        nextSampleTimeRef.current += sampleIntervalRef.current;
      }

      // --- Stats & housekeeping ---
      if (tRef.current - lastStatsUpdateRef.current > 0.25) {
        const now = tRef.current; const cutoff5 = now - 5;
        eventsRef.current = eventsRef.current.filter(t => t >= cutoff5);
        const c1 = eventsRef.current.filter(t => t >= now - 1).length;
        setTtlRate(c1); lastStatsUpdateRef.current = now;
      }

      const tMin = tRef.current - p.timeWindow;
      while (samplesRef.current.length && samplesRef.current[0].t < tMin) samplesRef.current.shift();

      // Render synchronized visuals *after* event spawning for this frame
      renderVisuals();

      if (oscCanvasRef.current) drawOscilloscope(oscCanvasRef.current, samplesRef.current, p.timeWindow, p.thresholdVoltage);
      if (ttlCanvasRef.current) drawTTLOscope(ttlCanvasRef.current, samplesRef.current, p.timeWindow, eventsRef.current);

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Fit canvases for DPR
  useEffect(() => {
    function fitCanvas(c) {
      if (!c) return;
      const rect = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.round(rect.width * dpr);
      c.height = Math.round(rect.height * dpr);
    }
    const r = () => { fitCanvas(oscCanvasRef.current); fitCanvas(ttlCanvasRef.current); fitCanvas(pmtCanvasRef.current); };
    r(); window.addEventListener("resize", r); return () => window.removeEventListener("resize", r);
  }, []);

  const reset = () => {
    samplesRef.current = [];
    photonsRef.current = [];
    electronsRef.current = [];
    arrivalsDetRef.current = [];
    arrivalsDarkRef.current = [];
    sRiseRef.current = 0; sFallRef.current = 0;
    tRef.current = 0; nextSampleTimeRef.current = 0; lastTsRef.current = null;
    ttlActiveUntilRef.current = 0; nextTriggerReadyRef.current = 0;
    lastSampleVRef.current = 0; lastSampleTRef.current = 0;
    nextPhotonVisRef.current = null;
    pairsRef.current = []; // reset pairs when clearing scheduler
  };

  const Controls = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <>
        <Control label={<>
          Photon flux (log): <SmoothNumber value={flux} format={(v)=>`${Math.round(v)} /s`} />
        </>} value={[fluxExp]} min={0} max={7} step={0.001} onValueChange={(v) => setFluxExp(v[0])} />

        <Control label={<>
          Quantum efficiency (QE): <SmoothNumber value={qe} format={(v)=>`${(v*100).toFixed(0)} %`} />
        </>} value={[qe]} min={0} max={1} step={0.01} onValueChange={(v) => setQe(v[0])} />

        <Control label={<>
          Dark count: <SmoothNumber value={darkRate} format={(v)=>`${Math.round(v)} cps`} />
        </>} value={[darkRate]} min={0} max={500} step={1} onValueChange={(v) => setDarkRate(v[0])} />

        <Control label={<>
          Dark noise: <SmoothNumber value={darkNoise} format={(v)=>`${(+v).toFixed(3)} V`} />
        </>} value={[darkNoise]} min={0} max={0.1} step={0.001} onValueChange={(v) => setDarkNoise(v[0])} />

        <Control label={<>
          Gain (peak per e¯): <SmoothNumber value={gain} format={(v)=>`${(+v).toFixed(2)} V/pe`} />
        </>} value={[gain]} min={0.05} max={2} step={0.01} onValueChange={(v) => setGain(v[0])} />

        <Control label={<>
          Rise time: <SmoothNumber value={tauRise} format={(v)=>`${(v*1000).toFixed(0)} ms`} />
        </>} value={[tauRise]} min={0.001} max={0.100} step={0.001} onValueChange={(v) => setTauRise(v[0])} />

        <Control label={<>
          Fall time: <SmoothNumber value={tauFall} format={(v)=>`${(v*1000).toFixed(0)} ms`} />
        </>} value={[tauFall]} min={0.001} max={0.100} step={0.001} onValueChange={(v) => setTauFall(v[0])} />

        <Control label={<>
          Timebase: <SmoothNumber value={timeWindow} format={(v)=>`${(+v).toFixed(1)} s window`} />
        </>} value={[timeWindow]} min={1} max={8} step={0.1} onValueChange={(v) => setTimeWindow(v[0])} />

        <Control label={<>
          Threshold voltage: <SmoothNumber value={thresholdVoltage} format={(v)=>`${(+v).toFixed(2)} V`} />
        </>} value={[thresholdVoltage]} min={0} max={2} step={0.01} onValueChange={(v) => setThresholdVoltage(v[0])} />

        <Control label={<>
          TTL pulse width: <SmoothNumber value={ttlWidthMs} format={(v)=>`${Math.round(v)} ms`} />
        </>} value={[ttlWidthMs]} min={1} max={500} step={1} onValueChange={(v) => setTtlWidthMs(Math.round(v[0]))} />

        <Control label={<>
          Dead time: <SmoothNumber value={deadTimeMs} format={(v)=>`${Math.round(v)} ms`} />
        </>} value={[deadTimeMs]} min={0} max={1000} step={1} onValueChange={(v) => setDeadTimeMs(Math.round(v[0]))} />

        <div className="flex items-center gap-4">
          <Switch checked={running} onCheckedChange={setRunning} id="run" />
          <Label htmlFor="run">{running ? "Running" : "Paused"}</Label>
          <Button onClick={reset}>Reset</Button>
        </div>
      </>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 to-slate-900 text-slate-200 p-4 md:p-8">
      <div className="max-w-6xl mx-auto grid gap-4 grid-rows-[auto_auto_1fr]">
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl md:text-3xl font-semibold tracking-tight">
          PMT Live Simulator — unified τ‑leap IIR
        </motion.h1>
        <p className="text-slate-300 max-w-3xl">
          The analog path uses a single, unified τ‑leap IIR: every sample decays the double‑exponential states and adds Poisson shot noise with sub‑sample jitter (exact for low counts, moment‑matched for high counts). No switching between models.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
            <div className="text-xs text-slate-400">TTL count rate</div>
            <div className="text-lg font-semibold">{ttlRate.toFixed(0)} cps</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
            <div className="text-xs text-slate-400">Photon flux</div>
            <div className="text-lg font-semibold">{compact(flux)} /s</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
            <div className="text-xs text-slate-400">Quantum efficiency</div>
            <div className="text-lg font-semibold">{(qe*100).toFixed(0)}%</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
          <Card className="h-[520px]">
            <CardContent className="h-full grid grid-rows-[1fr_auto_0.6fr] gap-3">
              <div className="h-full rounded-md border border-slate-700 bg-slate-800/50">
                <canvas ref={pmtCanvasRef} className="h-full w-full" />
              </div>
              <div className="h-[150px] rounded-md border border-slate-700 bg-slate-800/50">
                <canvas ref={oscCanvasRef} className="h-full w-full" />
              </div>
              <div className="h-[100px] rounded-md border border-slate-700 bg-slate-800/50">
                <canvas ref={ttlCanvasRef} className="h-full w-full" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Controls />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ================= SELF-TESTS (lightweight) =================
function runSelfTests() {
  // Poisson: mean near lambda for moderate lambda
  const lambda = 5, N = 2000; let sum = 0; for (let i = 0; i < N; i++) sum += samplePoisson(lambda);
  console.assert(Math.abs(sum/N - lambda) < 0.5, "Poisson mean off");

  // Pulse shape: zero before t0, positive after
  const A=1, tr=0.01, tf=0.06, t0=1; console.assert(pulseShape(0.5,t0,A,tr,tf)===0, "Pulse before t0 should be 0");
  console.assert(pulseShape(1.01,t0,A,tr,tf)>0, "Pulse after t0 should be >0");

  // Compute voltage continuity for legacy exact-sum helper
  const pulses=[{t0:1, A:0.5},{t0:1.01, A:0.5}]; const t=1.02; const vBridge = computeVoltage(t, pulses, tr, tf, 0);
  console.assert(Number.isFinite(vBridge) && vBridge < 10 && vBridge > 0, "Bridge voltage unreasonable");

  // Additional: voltage near pulse positive
  const vnow = computeVoltage(1.02, pulses, tr, tf, 0); console.assert(vnow>0, "Voltage should be >0 near pulse");

  // Additional: Poisson(0) stability
  console.assert(samplePoisson(0) === 0, "Poisson(0) should be 0");

  // IIR equivalence: single impulse should match pulseShape within tolerance
  const peak = doubleExpPeak(tr, tf); const scale = 1/(peak||1);
  const tRel = 0.02; // 20 ms after event
  const vIIR = (scale*Math.exp(-tRel/tf) - scale*Math.exp(-tRel/tr)) * A; // because we would add scale*A to both states
  const vExact = pulseShape(t0 + tRel, t0, A, tr, tf);
  console.assert(Math.abs(vIIR - vExact) < 1e-6, "IIR vs exact mismatch");

  // Blend helper monotonic/bounded (kept for compatibility)
  const b0 = 0, target = 1, dtb = 0.15; const b1 = stepTowards(b0, target, dtb, 0.15);
  console.assert(b1 > b0 && b1 < 1 && b1 > 0.5 && b1 < 0.9, "Blend step not in expected range");

  // Visual caps should drop at very high rate / flux
  const caps1 = getVisualCaps(1000, 1e3, 1);
  const caps2 = getVisualCaps(60000, 1e7, 3);
  console.assert(caps1.photons >= caps2.photons && caps2.photons === 0, "Caps not dropping at high rate (photons)");
  console.assert(caps1.electrons >= caps2.electrons && caps2.electrons === 0, "Caps not dropping at high rate (electrons)");

  // thinArray stride behavior
  const ta = thinArray([1,2,3,4,5,6,7,8,9,10], 3);
  console.assert(ta.length === 3 && ta[0] === 1 && ta[1] === 5 && ta[2] === 9, "thinArray wrong size or stride");

  // RNG sanity
  const r = randn(); console.assert(Number.isFinite(r), "randn not finite");
  const e = expovariate(10); console.assert(Number.isFinite(e) && e >= 0, "expovariate invalid");

  // Photon/electron sync helpers
  const tEvt = 1.5, vpx = 120, xStartP = 0, targetX = 60; // 60px @120px/s -> 0.5s lead
  const tStart = photonLaunchTime(tEvt, vpx, xStartP, targetX);
  console.assert(Math.abs((tEvt - tStart) - (targetX - xStartP) / vpx) < 1e-9, "photonLaunchTime mismatch");

  // makeSyncedVisuals produces a pair where the photon reaches PC exactly at electron start time
  const pair = makeSyncedVisuals(2.0, 0, 150, 200, 10, 70); // distance=60px, vph=150 -> 0.4s lead
  console.assert(Math.abs((pair.el.t0 - pair.ph.t0) - ((70 - 10) / 150)) < 1e-9, "makeSyncedVisuals photon timing wrong");
  console.assert(pair.el.t0 === 2.0, "makeSyncedVisuals electron start mismatch");

  // End-to-end geometry timing: photon at PC at tEvt, electron reaches anode at tEvt + transit
  (function testEndToEndSync(){
    const W=400, H=200;
    const radius = Math.min(H * 0.22, W * 0.10);
    const tubeLen = Math.min(W * 0.75, W - 40);
    const xLeft = (W - tubeLen) / 2;
    const xEndAnode = xLeft + tubeLen - radius * 0.95;
    const targetX = xLeft + radius * 0.95;
    const xStartP2 = xLeft - 20;
    const vph2 = W * 0.6, vEl2 = W * 1.2;
    const tEvt2 = 2.4;
    const p2 = makeSyncedVisuals(tEvt2, 0, vph2, vEl2, xStartP2, targetX);
    const photonXatEvt = xStartP2 + vph2 * (tEvt2 - p2.ph.t0);
    console.assert(Math.abs(photonXatEvt - targetX) < 1e-6, "Photon not at photocathode at event (sync)");
    const transit = Math.max(0, (xEndAnode - (targetX + 2)) / vEl2);
    const elXAtAnode = (targetX + 2) + vEl2 * transit;
    console.assert(Math.abs(elXAtAnode - xEndAnode) < 1e-6, "Electron transit mismatch to anode");
  })();
}
if (typeof window !== 'undefined' && !window.__PMT_TESTED) { window.__PMT_TESTED = true; try { runSelfTests(); } catch(e) { console.warn('Self-tests failed', e); } }
