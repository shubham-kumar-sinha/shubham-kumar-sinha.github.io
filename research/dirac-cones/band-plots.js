import { area, arrow, axes, backdrop, circle, clip, color, decimal, label, line, points, texture } from "./graphics.js";

const turn = 2 * Math.PI;
const sqrt3 = Math.sqrt(3);
const bonds = [[0, 1], [sqrt3 / 2, -.5], [-sqrt3 / 2, -.5]];
const zoneRadius = 4 * Math.PI / (3 * sqrt3);
const zoneCorners = Array.from({ length: 6 }, (_, i) => [zoneRadius * Math.cos(i * turn / 6), zoneRadius * Math.sin(i * turn / 6)]);
const [k, kPrime] = zoneCorners;
const mPoint = k.map((x, i) => (x + kPrime[i]) / 2);
const highSymmetry = [[0, 0], k, mPoint, kPrime, [0, 0]];

export function grapheneEnergy(kx, ky) {
  const c = Math.cos(sqrt3 * kx / 2);
  return Math.hypot(Math.cos(ky) + 2 * c * Math.cos(ky / 2), Math.sin(ky) - 2 * c * Math.sin(ky / 2));
}

const pathDistance = [0];
for (let i = 1; i < highSymmetry.length; i++) {
  const [x, y] = highSymmetry[i];
  const [a, b] = highSymmetry[i - 1];
  pathDistance.push(pathDistance[i - 1] + Math.hypot(x - a, y - b));
}
const pathEnergy = highSymmetry.slice(1).flatMap(([x, y], i) => {
  const [a, b] = highSymmetry[i];
  return points(0, 1, 65, t => [
    pathDistance[i] + t * (pathDistance[i + 1] - pathDistance[i]),
    grapheneEnergy(a + t * (x - a), b + t * (y - b))
  ]);
});

export function cone(ctx, w, h, energy) {
  backdrop(ctx, w, h, "#2c5946");
  const cx = w * .5;
  const cy = h * .50;
  const s = Math.min(w * .277, h * .40);
  const vertical = h * .29;
  const at = (x, y, z = 0) => [cx + s * (.87 * x - .61 * y), cy + s * (.33 * x + .29 * y) - z * vertical];
  const plane = (z, extent) => [[-extent, -extent], [extent, -extent], [extent, extent], [-extent, extent]]
    .map(([x, y]) => at(x, y, z));
  const ring = (radius, z) => points(0, turn, 88, t => at(radius * Math.cos(t), radius * Math.sin(t), z));
  const center = at(0, 0);
  for (let i = 1; i < 26; i++) {
    for (let j = 1; j < 40; j++) {
      const value = ((i * 17 + j * 29 + i * j * 7) % 127) / 127;
      circle(ctx, [j * w / 40, i * h / 26], .42 + value * .28, "rgba(186,223,202," + (.05 + value * .09) + ")");
    }
  }

  area(ctx, plane(0, 1.08), "#9cd3b812", "#9dcbb469");
  for (let i = -5; i <= 5; i++) {
    const p = i / 5;
    line(ctx, [at(p, -1.08), at(p, 1.08)], "#8ab69f3b", .7);
    line(ctx, [at(-1.08, p), at(1.08, p)], "#8ab69f3b", .7);
  }
  const eEnd = at(0, 0, 1.49);
  arrow(ctx, at(0, 0, -1.33), eEnd, "#e4efde94", 1);
  label(ctx, "E", [eEnd[0] + 10, eEnd[1]], { size: 12, weight: 700 });

  for (const [sign, tint, rgb] of [[-1, color.amber, "255,178,120"], [1, color.mint, "128,244,196"]]) {
    const rim = ring(1, sign);
    for (let i = 0; i < rim.length - 1; i++) {
      const alpha = .045 + .14 * (Math.sin(i / 88 * turn + .45) + 1) / 2;
      area(ctx, [center, rim[i], rim[i + 1]], "rgba(" + rgb + "," + alpha + ")");
    }
    for (let n = 1; n <= 9; n++) {
      const r = n / 9;
      line(ctx, ring(r, sign * r), tint + (n === 9 ? "e8" : "65"), n === 9 ? 1.55 : .7);
    }
    for (let n = 0; n < 28; n++) {
      const angle = n / 28 * turn;
      line(ctx, [center, at(Math.cos(angle), Math.sin(angle), sign)], tint + (n % 7 === 0 ? "b9" : "48"), .72);
    }
  }

  const xEnd = at(1.22, 0);
  const yEnd = at(0, 1.22);
  arrow(ctx, center, xEnd, "#d5e8d4b0", 1);
  arrow(ctx, center, yEnd, "#d5e8d4b0", 1);
  label(ctx, "qₓ", [xEnd[0] + 7, xEnd[1] + 8], { size: 11 });
  label(ctx, "qᵧ", [yEnd[0] - 6, yEnd[1] + 9], { size: 11, align: "right" });

  const radius = Math.abs(energy);
  area(ctx, plane(energy, 1.01), "#e1f6ab20", "#e1f6ab78");
  ctx.save();
  ctx.shadowColor = "#e9ffb7";
  ctx.shadowBlur = 10;
  if (radius >= .015) {
    line(ctx, ring(radius, energy), color.bright, 2.6);
    circle(ctx, at(radius, 0, energy), 3.3, color.bright);
  } else {
    circle(ctx, center, 6, color.bright);
  }
  ctx.restore();

  const anchor = at(-1.04, 1.04, energy);
  label(ctx, "Slice E = " + decimal(energy), [Math.max(12, anchor[0]), Math.max(14, Math.min(h - 12, anchor[1] - 11))],
    { fill: color.bright, weight: 700 });
  circle(ctx, center, 3.6, "#f1fad7");
  const note = [Math.max(14, cx - s * 1.20), cy + h * .105];
  line(ctx, [center, [note[0] + 57, note[1]]], "#f1fad79b", .8, [3, 3]);
  label(ctx, "Dirac point", note, { size: 10, weight: 700 });
}

export function mass(ctx, w, h, gapMass) {
  const { at, box } = axes(ctx, w, h, {
    xRange: [-1.25, 1.25], yRange: [-1.65, 1.65], xTicks: [-1, 0, 1], yTicks: [-1, 0, 1],
    xTitle: "Momentum q", yTitle: "Energy E"
  });
  clip(ctx, box, () => {
    const yTop = at(0, gapMass)[1];
    ctx.fillStyle = "#e5f6a922";
    ctx.fillRect(box.l, yTop, box.r - box.l, at(0, -gapMass)[1] - yTop);
    for (const sign of [-1, 1]) {
      const tint = sign > 0 ? color.mint : color.amber;
      if (gapMass > .005) line(ctx, points(-1.25, 1.25, 80, q => at(q, sign * Math.abs(q))), "#abc5b476", 1, [4, 4]);
      line(ctx, points(-1.25, 1.25, 100, q => at(q, sign * Math.hypot(q, gapMass))), tint, 2.3);
      circle(ctx, at(0, sign * gapMass), 3.4, tint);
    }
  });
  if (gapMass > .16) {
    const [x, y] = at(0, 0);
    label(ctx, "Gap " + decimal(2 * gapMass), [x + 9, y], { fill: color.bright, weight: 700 });
  }
}

export function dos(ctx, w, h, gapMass) {
  const { at, box } = axes(ctx, w, h, {
    xRange: [-1.34, 1.34], yRange: [-.09, 1.42], xTicks: [-1, 0, 1], yTicks: [0, .5, 1],
    xTitle: "Energy E", yTitle: "Scaled density of states"
  });
  clip(ctx, box, () => {
    const left = at(-gapMass, 0)[0];
    const right = at(gapMass, 0)[0];
    ctx.fillStyle = "#e5f6a922";
    ctx.fillRect(left, box.t, right - left, box.b - box.t);
    area(ctx, [at(-1.34, 0), at(-1.34, 1.34), at(-gapMass, gapMass), at(-gapMass, 0)], "#ffc08c29");
    area(ctx, [at(gapMass, 0), at(gapMass, gapMass), at(1.34, 1.34), at(1.34, 0)], "#83e3bf28");
    line(ctx, [at(-1.34, 1.34), at(-gapMass, gapMass)], color.amber, 2.3);
    line(ctx, [at(gapMass, gapMass), at(1.34, 1.34)], color.mint, 2.3);
    line(ctx, [at(-gapMass, 0), at(gapMass, 0)], color.bright, 2.2);
    for (const sign of [-1, 1]) {
      if (gapMass > .005) line(ctx, [at(sign * gapMass, 0), at(sign * gapMass, gapMass)], "#e4f8ac95", 1, [3, 3]);
    }
  });
  if (gapMass > .17) {
    label(ctx, "Zero states", at(0, .73), { align: "center", fill: color.bright, weight: 700, size: 10 });
  }
}

export function lattice(ctx, w, h) {
  backdrop(ctx, w, h, "#264e40");
  const scale = Math.min(w / 9.0, h / 7.4);
  const at = (x, y) => [w * .50 + x * scale, h * .52 - y * scale];
  const sitesA = [];
  const sitesB = [];
  const box = { l: 10, t: 9, r: w - 10, b: h - 9 };
  clip(ctx, box, () => {
    const n = Math.ceil(w / (scale * sqrt3)) + 3;
    for (let i = -n; i <= n; i++) {
      for (let j = -n; j <= n; j++) {
        const x = (i - j) * sqrt3 / 2;
        const y = (i + j) * 1.5;
        const p = at(x, y);
        if (p[0] < -scale || p[0] > w + scale || p[1] < -scale || p[1] > h + scale) continue;
        sitesA.push(p);
        sitesB.push(at(x, y + 1));
        for (const [dx, dy] of bonds) line(ctx, [p, at(x + dx, y + dy)], "#91b2a2b0", 1.15);
      }
    }
    area(ctx, [at(0, 0), at(sqrt3 / 2, 1.5), at(0, 3), at(-sqrt3 / 2, 1.5)], "#d9f69f22", color.bright, 1.35);
    for (const [sites, tint] of [[sitesA, color.mint], [sitesB, color.amber]]) {
      for (const site of sites) circle(ctx, site, scale * .135, tint, "#14372b", 1.25);
    }
    circle(ctx, at(0, 0), scale * .23, null, color.bright);
    circle(ctx, at(0, 1), scale * .23, null, color.bright);
  });
  const p = at(-sqrt3 / 2, 1.5);
  const labelEnd = Math.max(79, p[0] - 24);
  const labelY = p[1] - 15;
  line(ctx, [p, [p[0] - 10, labelY], [labelEnd + 3, labelY]], color.bright, .85);
  label(ctx, "Primitive cell", [labelEnd, labelY], { fill: color.bright, align: "right", size: 10, weight: 700 });
}

export function zone(ctx, w, h, valley) {
  backdrop(ctx, w, h, "#284b40");
  const radius = Math.min(w * .33, h * .35);
  const at = (x, y) => [w * .5 + radius * x / zoneRadius, h * .49 - radius * y / zoneRadius];
  const corners = zoneCorners.map(p => at(...p));
  area(ctx, corners, "#87cfad18", "#b1d5c0", 1.35);
  for (const p of corners) line(ctx, [at(0, 0), p], "#82b99d54", .75, [3, 5]);
  line(ctx, highSymmetry.map(p => at(...p)), "#e7f4d7", 2.05, [4, 4]);
  circle(ctx, at(0, 0), 3.3, color.pale);
  label(ctx, "Γ", [w * .5 - 9, h * .49 + 13], { align: "center", weight: 700, size: 12 });
  const mid = at(...mPoint);
  circle(ctx, mid, 3.6, color.pale);
  label(ctx, "M", [mid[0] + 12, mid[1] - 8], { size: 11, weight: 700 });
  corners.forEach(([x, y], i) => {
    const isK = i % 2 === 0;
    const tint = isK ? color.mint : color.amber;
    if ((isK ? 1 : -1) === valley) circle(ctx, [x, y], 10, tint + "37", tint, 1.1);
    circle(ctx, [x, y], 4.3, tint);
    const angle = i * turn / 6;
    label(ctx, isK ? "K" : "K′", [x + 16 * Math.cos(angle), y - 15 * Math.sin(angle)],
      { align: "center", size: 11, fill: tint, weight: 700 });
  });
}

export function grapheneBands(ctx, w, h, valley) {
  const end = pathDistance.at(-1);
  const { at, box } = axes(ctx, w, h, {
    xRange: [0, end], yRange: [-3.28, 3.28],
    xTicks: pathDistance.map((x, i) => [x, ["Γ", "K", "M", "K′", "Γ"][i]]), yTicks: [-3, -1, 0, 1, 3],
    xTitle: "Path through the Brillouin zone", yTitle: "Energy E/t"
  });
  const x = pathDistance[valley === 1 ? 1 : 3];
  const tint = valley === 1 ? color.mint : color.amber;
  clip(ctx, box, () => {
    const left = at(x - end * .033, 0)[0];
    const right = at(x + end * .033, 0)[0];
    ctx.fillStyle = tint + "24";
    ctx.fillRect(left, box.t, right - left, box.b - box.t);
    line(ctx, pathEnergy.map(([p, e]) => at(p, e)), color.mint, 2.3);
    line(ctx, pathEnergy.map(([p, e]) => at(p, -e)), color.amber, 2.3);
  });
  for (const i of [1, 3]) {
    const pos = at(pathDistance[i], 0);
    circle(ctx, pos, 4.8, color.ink, i === 1 ? color.mint : color.amber, 1.8);
  }
  circle(ctx, at(x, 0), 10.5, tint + "30", tint, 1.0);
}

export function pseudospin(ctx, w, h, valley) {
  const tint = valley === 1 ? color.mint : color.amber;
  texture(ctx, w, h, (x, y) => [valley * x, y], tint, "pseudospin");
  label(ctx, valley === 1 ? "Valley K" : "Valley K′", [13, 15], { fill: tint, weight: 700 });
}
