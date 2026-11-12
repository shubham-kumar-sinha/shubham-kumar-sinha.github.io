import { area, arrow, backdrop, canvasPainter, circle, color, label, line, points } from "./graphics.js";

const turn = 2 * Math.PI;
const gapSize = .53;
const initialAngle = .56;

function dispersion(ctx, { x, y, w, h }, gap, mode) {
  const cx = x + w * .46;
  const cy = y + h * .54;
  const scale = Math.min(w * .267, h * .38);
  const at = (kx, ky, energy = 0) => [
    cx + scale * (.89 * kx - .57 * ky),
    cy + scale * (.26 * kx + .29 * ky) - h * .26 * energy
  ];
  const origin = at(0, 0);
  const floor = [[-1.07, -1.07], [1.07, -1.07], [1.07, 1.07], [-1.07, 1.07]].map(p => at(...p));
  area(ctx, floor, "#88a99a19", color.grid, .8);
  for (let i = -4; i <= 4; i++) {
    const k = i / 4;
    line(ctx, [at(k, -1.07), at(k, 1.07)], color.grid, .75);
    line(ctx, [at(-1.07, k), at(1.07, k)], color.grid, .75);
  }

  const top = at(0, 0, 1.52);
  arrow(ctx, at(0, 0, -1.42), top, color.muted, .9);
  label(ctx, "Energy", [top[0] + 9, top[1] - 3], { fill: color.muted });

  for (const [sign, tint] of [[-1, color.amber], [1, color.mint]]) {
    const band = (r, angle) => at(r * Math.cos(angle), r * Math.sin(angle), sign * Math.hypot(r, gap));
    const ring = r => points(0, turn, 56, angle => band(r, angle));
    const strand = angle => points(0, 1, 14, r => band(r, angle));
    for (let i = 0; i < 40; i++) {
      const a = turn * i / 40;
      const b = turn * (i + 1) / 40;
      ctx.globalAlpha = .049 + .074 * (.5 + .5 * Math.sin(a + .7));
      area(ctx, [...strand(a), ...strand(b).reverse()], tint);
    }
    for (let i = 1; i <= 11; i++) {
      ctx.globalAlpha = i === 11 ? .95 : .62;
      line(ctx, ring(i / 11), tint, i === 11 ? 1.55 : .8);
    }
    for (let i = 0; i < 30; i++) {
      ctx.globalAlpha = i % 5 === 0 ? .82 : .45;
      line(ctx, strand(i * turn / 30), tint, .8);
    }
    ctx.globalAlpha = 1;
    circle(ctx, at(0, 0, sign * gap), 3, color.bright);
  }

  const kx = at(1.22, 0);
  const ky = at(0, 1.23);
  arrow(ctx, origin, kx, color.muted, .9);
  arrow(ctx, origin, ky, color.muted, .9);
  label(ctx, "kₓ", [kx[0] + 7, kx[1] + 7], { fill: color.muted });
  label(ctx, "kᵧ", [ky[0] - 7, ky[1] + 8], { align: "right", fill: color.muted });

  if (gap > .08) {
    const upper = at(0, 0, gap);
    const lower = at(0, 0, -gap);
    const edge = x + w - 15;
    line(ctx, [upper, [edge - 4, upper[1]]], "#b8d7c2a8", .85, [3, 4]);
    line(ctx, [lower, [edge - 4, lower[1]]], "#b8d7c2a8", .85, [3, 4]);
    line(ctx, [[edge - 5, upper[1]], [edge, upper[1]], [edge, lower[1]], [edge - 5, lower[1]]], color.pale, 1.1);
    const gapLabel = mode === "mass" ? "2|m|" : mode === "pair" ? "2|Δ|" : "Gap";
    label(ctx, gapLabel, [edge - 7, (upper[1] + lower[1]) / 2], { align: "right", size: 12 });
  } else {
    circle(ctx, origin, 7, null, color.bright, 1);
    const tag = [x + 11, cy + 20];
    line(ctx, [origin, [tag[0] + 61, tag[1]]], "#b8d7c2a8", .85, [3, 4]);
    label(ctx, "Dirac point", tag);
  }
  label(ctx, "Dispersion", [x + 12, y + 13], { size: 13, weight: 700 });
}

function phaseDials(ctx, { x, y, w, h }, phase, previousPhase) {
  const radius = Math.min(w * .146, h * .24, 46);
  const cy = y + h * .48;
  const dials = [
    { column: .27, multiplier: 1, name: "Electron phase", change: "+90°" },
    { column: .73, multiplier: 2, name: "Cooper-pair phase", change: "+180°" }
  ];
  for (const { column, multiplier, name, change } of dials) {
    const cx = x + column * w;
    const at = (angle, r = radius) => [cx + r * Math.cos(angle), cy - r * Math.sin(angle)];
    circle(ctx, [cx, cy], radius, "#a1c8b212", color.muted, 1);
    for (let i = 0; i < 12; i++) {
      const angle = i * turn / 12;
      line(ctx, [at(angle, radius - 4), at(angle, radius + 3)], "#b8d7c2a0", .85);
    }
    const from = multiplier * previousPhase;
    const to = multiplier * phase;
    line(ctx, points(from, to, 32, angle => at(angle, radius * .72)), "#e4f8ac9e", 1.5);
    arrow(ctx, [cx, cy], at(from, radius * .88), "#bdd3c680", 1.05, 5);
    arrow(ctx, [cx, cy], at(to, radius * .88), color.bright, 2.3, 7);
    circle(ctx, [cx, cy], 3, color.bright);
    label(ctx, name, [cx, cy + radius + 17], { align: "center", size: 11 });
    label(ctx, change, [cx, cy + radius + 33], { align: "center", fill: color.bright });
  }
  label(ctx, "Charge rotation", [x + w / 2, y + 13], { align: "center", size: 13, weight: 700 });
}

function spinLens(ctx, { x, y, w, h }, view, mode, action) {
  const radius = Math.min(w * .31, h * .35);
  const cx = x + w / 2;
  const cy = y + h * .53;
  const at = (kx, ky, z = 0) => [
    cx + radius * (.94 * kx - .34 * ky),
    cy + radius * (.19 * kx + .40 * ky - .91 * z)
  ];
  const momentum = angle => [Math.cos(angle), Math.sin(angle)];
  const ring = points(0, turn, 60, angle => at(...momentum(angle)));
  area(ctx, ring, "#a1c8b218", "#a9cabcaa", .95);
  line(ctx, [at(-1.13, 0), at(1.13, 0)], "#a9cabc88", .85, [3, 4]);
  line(ctx, [at(0, -1.18), at(0, 1.18)], "#a9cabc88", .85, [3, 4]);
  if (action === "mirror") {
    line(ctx, [at(0, -1.18), at(0, 1.18)], color.bright, 1.15, [4, 3]);
  }

  const title = mode === "pair" ? "Time-reversed partners" : "Upper-band spin";
  label(ctx, title, [cx, y + 13], { align: "center", size: 13, weight: 700 });

  function spinAt(angle, length, tint) {
    const [kx, ky] = momentum(angle);
    const z = mode === "mass" ? view.sign * view.gap : 0;
    const scale = length / Math.hypot(1, z);
    const start = at(kx, ky);
    const end = at(kx - ky * scale, ky + kx * scale, z * scale);
    arrow(ctx, start, end, tint || "#bdd3c6b0", tint ? 1.9 : 1.05, tint ? 6 : 4);
    if (tint) circle(ctx, start, 3.2, tint);
    return start;
  }

  let note = "Spin winds around the cone";
  if (mode === "pair") {
    const p = at(...momentum(view.angle));
    const q = at(...momentum(view.angle + Math.PI));
    ctx.strokeStyle = "#a2dce7a0";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    for (const bend of [-.44, .44]) {
      ctx.moveTo(...p);
      ctx.quadraticCurveTo(cx, cy + radius * bend, ...q);
    }
    ctx.stroke();
    spinAt(view.angle, .42, color.bright);
    spinAt(view.angle + Math.PI, .42, color.blue);
    label(ctx, "k", [p[0], p[1] + 15], { align: "center", fill: color.bright });
    label(ctx, "−k", [q[0], q[1] + 15], { align: "center", fill: color.blue });
    note = "Real pair field";
  } else {
    for (let i = 0; i < 10; i++) spinAt(turn * i / 10 + .18, .32);
    spinAt(view.angle, .46, color.bright);
    if (mode === "mass") {
      const start = at(0, 0);
      const end = at(0, 0, .81 * view.sign);
      if (Math.abs(view.sign) > .12) {
        arrow(ctx, start, end, color.bright, 2.7, 8);
        label(ctx, view.sign > 0 ? "+m" : "−m", [end[0] + 10, end[1]], { fill: color.bright, size: 13 });
      }
      circle(ctx, start, 3, color.bright);
      note = "Spin at k = 0";
    }
  }
  label(ctx, note, [cx, y + h - 13], { align: "center", fill: color.muted });
}

const figure = document.getElementById("fig-symmetry");
const canvas = document.getElementById("symmetry-canvas");
const status = document.getElementById("symmetry-status");
const modes = [...figure.querySelectorAll("[data-symmetry-mode]")];
const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
const initial = { gap: gapSize, sign: 1, angle: initialAngle, phase: 0 };
const target = { ...initial };
let view = { ...initial };
let mode = "mass";
let action = "";
let frame = 0;

const paint = canvasPainter(canvas, (ctx, w, h) => {
  backdrop(ctx, w, h, "#234638");
  let lens;
  if (w >= 560) {
    const split = w * .6;
    dispersion(ctx, { x: 6, y: 10, w: split - 15, h: h - 20 }, view.gap, mode);
    line(ctx, [[split, 20], [split, h - 20]], color.grid, 1);
    lens = { x: split + 9, y: 20, w: w - split - 18, h: h - 40 };
  } else {
    const split = h * .55;
    dispersion(ctx, { x: 2, y: 6, w: w - 4, h: split - 12 }, view.gap, mode);
    line(ctx, [[9, split], [w - 9, split]], color.grid, 1);
    lens = { x: 0, y: split + 7, w, h: h - split - 13 };
  }
  if (mode === "pair" && action === "charge") {
    phaseDials(ctx, lens, view.phase, target.phase - Math.PI / 2);
  } else {
    spinLens(ctx, lens, view, mode, action);
  }
});

function settle() {
  cancelAnimationFrame(frame);
  view = { ...target };
  paint();
}

function animate(message) {
  status.textContent = message;
  if (motion.matches) {
    settle();
    return;
  }
  cancelAnimationFrame(frame);
  const from = { ...view };
  const to = { ...target };
  const start = performance.now();
  const duration = action === "charge" ? 560 : 490;
  function step(now) {
    const progress = Math.min(1, (now - start) / duration);
    const ease = progress ** 2 * (3 - 2 * progress);
    for (const key of Object.keys(to)) view[key] = from[key] + (to[key] - from[key]) * ease;
    paint();
    if (progress < 1) frame = requestAnimationFrame(step);
  }
  frame = requestAnimationFrame(step);
}

const introductions = {
  gapless: "The two bands touch at zero momentum.",
  mass: "With positive mass, the upper-band spin at zero momentum points out of the surface.",
  pair: "A real singlet pair field opens a gap while preserving time reversal."
};
for (const button of modes) {
  button.addEventListener("click", () => {
    if (mode === button.dataset.symmetryMode) return;
    mode = button.dataset.symmetryMode;
    action = "";
    Object.assign(target, initial, { gap: mode === "gapless" ? 0 : gapSize });
    for (const other of modes) other.setAttribute("aria-pressed", String(other === button));
    animate(introductions[mode]);
  });
}

for (const button of figure.querySelectorAll("[data-symmetry-action]")) {
  button.addEventListener("click", () => {
    action = button.dataset.symmetryAction;
    if (action === "charge") {
      if (mode === "pair") {
        target.phase += Math.PI / 2;
        animate("The electron phase turns 90° and the Cooper-pair phase turns 180°. The gap stays open.");
      } else {
        status.textContent = mode === "mass"
          ? "Charge rotation preserves the Dirac mass."
          : "Charge rotation preserves the gapless cone.";
        paint();
      }
      return;
    }

    const reverseTime = action === "time";
    if (reverseTime) target.angle += Math.PI;
    else {
      const change = Math.PI - 2 * target.angle;
      target.angle += Math.atan2(Math.sin(change), Math.cos(change));
    }
    if (mode === "mass") {
      target.sign *= -1;
      const transform = reverseTime ? "Time reversal" : "Reflection";
      animate(transform + " flips the Dirac mass to " + (target.sign > 0 ? "+m" : "−m") + ". The gap stays 2|m|.");
    } else if (mode === "pair") {
      animate(reverseTime
        ? "Time reversal exchanges the two partners and preserves the real pair field."
        : "Reflection preserves the singlet pair field.");
    } else {
      animate(reverseTime
        ? "Time reversal flips both momentum and spin. The cone stays gapless."
        : "Reflection flips kₓ and the spin component Sᵧ. The cone stays gapless.");
    }
  });
}

if ("ResizeObserver" in window) new ResizeObserver(paint).observe(canvas);
else window.addEventListener("resize", paint);
motion.addEventListener("change", () => { if (motion.matches) settle(); });
paint();
