import { area, arrow, axes, backdrop, circle, clip, color, label, line, points, texture } from "./graphics.js";

export const sigmaCritical = 5 * (16 * Math.PI - 9 * Math.sqrt(3)) / (243 * Math.PI);
export const sigmaFree = 1 / 16;
export const thermalFactor = x => (10 / x) ** 1.91;
const sigmaComparison = .226;
const shearComparison = .00368;

export function slab(ctx, w, h) {
  backdrop(ctx, w, h, "#315747");
  const at = (u, v, z) => [w * (.49 + .31 * u - .139 * v), h * (.62 + .087 * u + .127 * v - .30 * z)];
  const face = (a, b, c, d, fill, stroke) => area(ctx, [a, b, c, d].map(p => at(...p)), fill, stroke, 1.15);
  face([-1, 1, 0], [1, 1, 0], [1, 1, 1], [-1, 1, 1], "#27483c", "#87ad99");
  face([1, 1, 0], [1, -1, 0], [1, -1, 1], [1, 1, 1], "#1c3c30", "#87ad99");
  for (let i = 1; i < 6; i++) {
    const z = i / 6;
    line(ctx, [at(-1, 1, z), at(1, 1, z), at(1, -1, z)], "#abcdb164", .65);
  }
  face([-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1], "#3e806568", color.mint);
  for (let i = -4; i <= 4; i++) {
    const s = i / 5;
    line(ctx, [at(-1, s, 1), at(1, s, 1)], "#9be6c281", .65);
    line(ctx, [at(s, -1, 1), at(s, 1, 1)], "#9be6c281", .65);
  }

  ctx.save();
  ctx.shadowColor = "#8af9c8";
  ctx.shadowBlur = 10;
  line(ctx, [at(-1, 1, 1), at(1, 1, 1), at(1, -1, 1)], color.mint, 2.3);
  line(ctx, [at(-1, 1, 0), at(1, 1, 0), at(1, -1, 0)], "#83e3bfba", 2);
  ctx.restore();
  arrow(ctx, at(-.6, .2, 1), at(.61, .2, 1), color.bright, 1.65, 6);
  arrow(ctx, at(-.22, .64, 1), at(-.22, -.64, 1), color.bright, 1.5, 6);

  const surfaceNote = [w * .13, h * .15];
  line(ctx, [[surfaceNote[0], surfaceNote[1] + 11], at(-.65, -.7, 1)], "#c5ebd2a8");
  label(ctx, "Top surface", surfaceNote, { fill: color.mint, weight: 700, size: 11 });
  label(ctx, "Gapped bulk", at(.18, 1, .47), { align: "center", weight: 700, size: 10 });
  const bottom = at(.65, 1, 0);
  line(ctx, [bottom, [bottom[0], h * .91]], "#a2dbb4a8");
  label(ctx, "Bottom surface", [bottom[0], h * .945], { align: "center", fill: color.mint, weight: 700, size: 10 });
}

export function surfaceBands(ctx, w, h) {
  const minQ = -1.24;
  const maxQ = 1.24;
  const bulkGap = .77;
  const bulkVelocity = .48;
  const crossing = bulkGap / Math.sqrt(1 - bulkVelocity ** 2);
  const { at, box } = axes(ctx, w, h, {
    xRange: [minQ, maxQ], yRange: [-1.43, 1.43], xTicks: [-1, 0, 1], yTicks: [-1, 0, 1],
    xTitle: "Surface momentum q", yTitle: "Energy E"
  });
  clip(ctx, box, () => {
    for (const sign of [-1, 1]) {
      const boundary = points(minQ, maxQ, 85, q => at(q, sign * Math.hypot(bulkGap, bulkVelocity * q)));
      area(ctx, [at(minQ, sign * 1.43), ...boundary, at(maxQ, sign * 1.43)], "#8fb5a640");
      line(ctx, boundary, "#a6c6b4ac", 1, [3, 3]);
      line(ctx, points(-crossing, crossing, 110, q => at(q, sign * Math.abs(q))),
        sign > 0 ? color.mint : color.amber, 2.15);
      label(ctx, sign > 0 ? "Bulk conduction" : "Bulk valence", at(0, sign * 1.14),
        { align: "center", size: 10, fill: color.pale, weight: 600 });
    }
  });
  circle(ctx, at(0, 0), 3.4, color.bright);
  label(ctx, "Dirac point", at(.17, .06), { fill: color.bright, weight: 700, size: 10 });
}

export function spin(ctx, w, h, band) {
  const tint = band === 1 ? color.mint : color.amber;
  texture(ctx, w, h, (x, y) => [-band * y, band * x], tint, "spin");
  label(ctx, band === 1 ? "Upper band" : "Lower band", [13, 15], { fill: tint, weight: 700 });
}

export function phase(ctx, w, h, r) {
  const { at, box } = axes(ctx, w, h, {
    xRange: [-1.12, 1.12], yRange: [0, 1.12], xTicks: [-1, 0, 1],
    xTitle: "Tuning parameter r", yTitle: "Temperature T", left: 34
  });
  const limit = 1.12;
  const edge = sign => points(0, limit, 70, t => at(sign * .99 * (t / limit) ** 1.35, t));
  const left = edge(-1);
  const right = edge(1);
  const scLine = points(-1.12, 0, 82, x => at(x, .69 * Math.abs(x) ** .78));
  clip(ctx, box, () => {
    area(ctx, [...left, ...right.slice().reverse()], "#b0dc9b47");
    area(ctx, [at(-1.12, 0), ...scLine, at(0, 0)], "#ffc08c2b");
    for (const side of [left, right]) line(ctx, side, "#c0e6b5cc", 1.2, [4, 4]);
    line(ctx, scLine, color.amber, 1.7);
    line(ctx, [at(r, 0), at(r, 1.12)], "#f1f5c363", 1, [3, 4]);
  });
  const small = w < 340;
  label(ctx, "Quantum critical fan", at(0, .84), { align: "center", weight: 700, size: small ? 10 : 12 });
  label(ctx, "Superconductor", at(-.60, .16), { align: "center", fill: color.amber, size: small ? 9 : 11, weight: 700 });
  label(ctx, "Dirac semimetal", at(.62, .16), { align: "center", fill: color.mint, size: small ? 9 : 11, weight: 700 });
  circle(ctx, at(0, 0), 3.9, color.pale);
  circle(ctx, at(r, 0), 8, "#e4f8ac42", color.bright, 1);
  circle(ctx, at(r, 0), 3.7, color.bright);
  label(ctx, "QCP", at(0, .065), { align: "center", size: 10, weight: 700, fill: color.bright });
}

export function potential(ctx, w, h, r) {
  const { at, box } = axes(ctx, w, h, {
    xRange: [-1.16, 1.16], yRange: [-.21, 1.62], xTicks: [-1, 0, 1], yTicks: [-.2, 0, .5, 1, 1.5],
    xTitle: "Real component of φ", yTitle: "Potential V(φ)"
  });
  const f = x => (r * x * x + x ** 4) / 2;
  const tint = r < 0 ? color.amber : r > 0 ? color.mint : color.bright;
  clip(ctx, box, () => {
    if (r !== 0) line(ctx, points(-1.16, 1.16, 110, x => at(x, x ** 4 / 2)), "#acc3b67d", 1, [4, 4]);
    line(ctx, points(-1.16, 1.16, 130, x => at(x, f(x))), tint, 2.45);
  });
  const s = r < 0 ? Math.sqrt(-r / 2) : 0;
  for (const x of s > 0 ? [-s, s] : [0]) {
    const p = at(x, f(x));
    circle(ctx, p, 8, tint + "39");
    circle(ctx, p, 3.75, tint, color.ink);
  }
  const title = r < 0 ? "Two minima in this cut" : r > 0 ? "One minimum at φ = 0" : "Quartic at r = 0";
  label(ctx, title, at(0, 1.37), { align: "center", fill: tint, size: 11, weight: 700 });
}

export function conductivity(ctx, w, h) {
  const { at } = axes(ctx, w, h, {
    xRange: [0, 1], yRange: [0, .275], yTicks: [0, [.05, ".05"], [.1, ".10"], [.15, ".15"], [.2, ".20"], [.25, ".25"]],
    xTitle: "Positive frequency ω", yTitle: "Conductivity ℏσ/e²"
  });
  for (const [value, title, tint] of [[sigmaCritical, "Surface critical point · 0.2271", color.mint],
    [sigmaFree, "Free single cone · 0.0625", color.amber]]) {
    line(ctx, [at(.03, value), at(.98, value)], tint, 2.45);
    const [x, y] = at(.08, value);
    label(ctx, title, [x, y - 13], { fill: tint, size: w < 300 ? 9 : 11, weight: 700 });
  }
}

export function shear(ctx, w, h) {
  const { at } = axes(ctx, w, h, {
    xRange: [0, .283], yRange: [0, 7.75], xTicks: [0, .1, .2], yTicks: [0, 2, 4, 6],
    xTitle: "Optical conductivity σ∞", yTitle: "Shear coefficient 10³η∞"
  });
  line(ctx, [at(0, 0), at(.283, .283 * 25)], "#b1d6bdac", 1.25, [5, 4]);
  label(ctx, "η∞ = σ∞/40", at(.031, 1.45), { size: 10, fill: color.pale });
  for (const [x, y, title, tint] of [
    [sigmaCritical, sigmaCritical / 40, "SUSY surface QCP", color.mint],
    [sigmaComparison, shearComparison, "SC–insulator QCP", color.amber]
  ]) {
    const [px, py] = at(x, 1000 * y);
    circle(ctx, [px, py], 8, tint + "32", tint, 1.05);
    circle(ctx, [px, py], 4.2, tint);
    label(ctx, title, [px - 11, py - 10], { align: "right", fill: tint, size: w < 300 ? 9 : 11, weight: 700 });
  }
}

export function thermal(ctx, w, h, ratio) {
  const { at } = axes(ctx, w, h, {
    xRange: [0, 3], yRange: [-.12, 1.13], xTicks: [[0, "10"], [1, "20"], [2, "40"], [3, "80"]],
    yTicks: [0, .5, 1], xTitle: "Ratio x = ℏω/kBT · log scale", yTitle: "Relative magnitude"
  });
  line(ctx, points(0, 3, 125, t => at(t, thermalFactor(10 * 2 ** t))), color.mint, 2.3);
  line(ctx, [at(0, 0), at(3, 0)], color.amber, 1.65);
  const x = Math.log2(ratio / 10);
  line(ctx, [at(x, 0), at(x, thermalFactor(ratio))], "#e2f3cebc", 1, [3, 3]);
  circle(ctx, at(x, thermalFactor(ratio)), 4.3, color.bright, color.ink);
  label(ctx, "Scalar power law", at(.98, .71), { fill: color.mint, weight: 700, size: 11 });
  const [px, py] = at(2.94, 0);
  label(ctx, "Stress term = 0", [px, py + 9], { align: "right", fill: color.amber, size: 9, weight: 700 });
}
