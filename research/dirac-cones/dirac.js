import { canvasPainter, decimal } from "./graphics.js";
import { cone, dos, grapheneBands, lattice, mass, pseudospin, zone } from "./band-plots.js";
import { conductivity, phase, potential, shear, slab, spin, surfaceBands, thermal, thermalFactor } from "./surface-plots.js";

const get = id => document.getElementById(id);
const energyInput = get("energy-slice");
const massInput = get("dirac-mass");
const tuningInput = get("tuning");
const thermalInput = get("thermal-ratio");
const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
const state = {
  energy: Number(energyInput.value),
  mass: Number(massInput.value),
  r: Number(tuningInput.value),
  ratio: Number(thermalInput.value),
  valley: 1,
  band: 1
};

const drawers = {
  cone: (ctx, w, h) => cone(ctx, w, h, state.energy),
  mass: (ctx, w, h) => mass(ctx, w, h, state.mass),
  dos: (ctx, w, h) => dos(ctx, w, h, state.mass),
  lattice,
  zone: (ctx, w, h) => zone(ctx, w, h, state.valley),
  "graphene-bands": (ctx, w, h) => grapheneBands(ctx, w, h, state.valley),
  pseudo: (ctx, w, h) => pseudospin(ctx, w, h, state.valley),
  slab,
  "surface-bands": surfaceBands,
  spin: (ctx, w, h) => spin(ctx, w, h, state.band),
  phase: (ctx, w, h) => phase(ctx, w, h, state.r),
  potential: (ctx, w, h) => potential(ctx, w, h, state.r),
  conductivity,
  shear,
  thermal: (ctx, w, h) => thermal(ctx, w, h, state.ratio)
};

document.documentElement.classList.add("has-plots");
const canvases = [...document.querySelectorAll("canvas[data-plot]")];
const painters = Object.fromEntries(canvases.map(canvas => [canvas.dataset.plot, canvasPainter(canvas, drawers[canvas.dataset.plot])]));
const paintAll = () => Object.values(painters).forEach(paint => paint());

if ("ResizeObserver" in window) {
  const observer = new ResizeObserver(entries => {
    for (const { target } of entries) painters[target.dataset.plot]();
  });
  canvases.forEach(canvas => observer.observe(canvas));
} else {
  window.addEventListener("resize", paintAll);
}

function setEnergy(energy) {
  state.energy = energy;
  energyInput.value = String(energy);
  get("slice-value").value = decimal(energy);
  painters.cone();
}

function updateMass() {
  state.mass = Number(massInput.value);
  get("mass-value").value = decimal(state.mass);
  get("gap-value").value = decimal(2 * state.mass);
  painters.mass();
  painters.dos();
}

function updateTuning() {
  state.r = Number(tuningInput.value);
  get("tuning-value").value = decimal(state.r);
  get("phase-status").textContent = state.r < 0 ? "Superconducting ground state"
    : state.r > 0 ? "Dirac semimetal ground state" : "Quantum critical point at T = 0";
  painters.phase();
  painters.potential();
}

function updateThermal() {
  state.ratio = Number(thermalInput.value);
  get("ratio-value").value = String(state.ratio);
  get("factor-value").value = thermalFactor(state.ratio).toFixed(3);
  painters.thermal();
}

function choose(key, update) {
  const buttons = [...document.querySelectorAll("[data-" + key + "]")];
  for (const button of buttons) {
    button.addEventListener("click", () => {
      state[key] = Number(button.dataset[key]);
      for (const other of buttons) other.setAttribute("aria-pressed", String(other === button));
      update();
    });
  }
}

choose("valley", () => {
  get("pseudo-readout").textContent = state.valley === 1
    ? "At K, pseudospin winds counterclockwise as momentum circles counterclockwise."
    : "At K′, pseudospin winds clockwise as momentum circles counterclockwise.";
  painters.zone();
  painters["graphene-bands"]();
  painters.pseudo();
});
choose("band", () => painters.spin());
massInput.addEventListener("input", updateMass);
tuningInput.addEventListener("input", updateTuning);
thermalInput.addEventListener("input", updateThermal);

let frameId = 0;
const sweepButton = get("sweep");
function stopSweep() {
  if (frameId) cancelAnimationFrame(frameId);
  frameId = 0;
  sweepButton.textContent = "Animate slice";
}

energyInput.addEventListener("input", () => {
  stopSweep();
  setEnergy(Number(energyInput.value));
});
sweepButton.addEventListener("click", () => {
  if (frameId) {
    stopSweep();
    return;
  }
  if (motion.matches) return;
  sweepButton.textContent = "Pause slice";
  const original = state.energy;
  const amplitude = Number(energyInput.max);
  const angle = Math.asin(original / amplitude);
  const start = performance.now();
  let lastPaint = start;
  function animate(now) {
    const progress = Math.min(1, (now - start) / 6900);
    if (now - lastPaint >= 32) {
      setEnergy(Math.round(100 * amplitude * Math.sin(angle + progress * 2 * Math.PI)) / 100);
      lastPaint = now;
    }
    if (progress < 1) frameId = requestAnimationFrame(animate);
    else {
      setEnergy(original);
      stopSweep();
    }
  }
  frameId = requestAnimationFrame(animate);
});

document.addEventListener("visibilitychange", () => { if (document.hidden) stopSweep(); });
motion.addEventListener("change", () => { if (motion.matches) stopSweep(); });
if ("IntersectionObserver" in window) {
  const visibility = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) stopSweep(); });
  visibility.observe(get("fig-cone"));
}

paintAll();
