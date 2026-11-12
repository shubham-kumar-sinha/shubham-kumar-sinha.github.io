export const color = {
  mint: "#83e3bf",
  amber: "#ffc08c",
  bright: "#e4f8ac",
  pale: "#e5f3e9",
  muted: "#bdd3c6",
  grid: "#3c5d50",
  ink: "#112d26",
  blue: "#a2dce7"
};

function begin(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
}

export function line(ctx, points, stroke, width = 1, dash = []) {
  begin(ctx, points);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function area(ctx, points, fill, stroke, width = 1) {
  begin(ctx, points);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

export function circle(ctx, [x, y], radius, fill, stroke, width = 1) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

export function label(ctx, text, [x, y], options = {}) {
  const { fill = color.pale, align = "left", size = 11, weight = 500 } = options;
  ctx.font = weight + " " + size + "px system-ui, sans-serif";
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

export function arrow(ctx, from, to, stroke, width = 1.2, head = 6) {
  const [x, y] = to;
  const angle = Math.atan2(y - from[1], x - from[0]);
  const left = [x - head * Math.cos(angle - .48), y - head * Math.sin(angle - .48)];
  const right = [x - head * Math.cos(angle + .48), y - head * Math.sin(angle + .48)];
  line(ctx, [from, to], stroke, width);
  line(ctx, [left, to, right], stroke, width);
}

export function points(from, to, n, sample) {
  return Array.from({ length: n + 1 }, (_, i) => sample(from + (to - from) * i / n));
}

export function decimal(value, digits = 2) {
  return value.toFixed(digits).replace("-", "−");
}

function tickInfo(entry) {
  return Array.isArray(entry) ? entry : [entry, String(entry).replace("-", "−")];
}

export function axes(ctx, w, h, options) {
  const {
    xRange, yRange, xTicks = [], yTicks = [], xTitle = "", yTitle = "",
    left = w < 300 ? 48 : 54, right = 13, top = 15, bottom = 41
  } = options;
  const box = { l: left, r: w - right, t: top, b: h - bottom };
  const at = (x, y) => [
    box.l + (box.r - box.l) * (x - xRange[0]) / (xRange[1] - xRange[0]),
    box.b - (box.b - box.t) * (y - yRange[0]) / (yRange[1] - yRange[0])
  ];
  for (const entry of xTicks) {
    const [x, name] = tickInfo(entry);
    const px = at(x, yRange[0])[0];
    line(ctx, [[px, box.t], [px, box.b]], color.grid, .75);
    label(ctx, name, [px, box.b + 11], { align: "center", fill: color.muted, size: 10 });
  }
  for (const entry of yTicks) {
    const [y, name] = tickInfo(entry);
    const py = at(xRange[0], y)[1];
    line(ctx, [[box.l, py], [box.r, py]], color.grid, .75);
    label(ctx, name, [box.l - 6, py], { align: "right", fill: color.muted, size: 10 });
  }
  line(ctx, [[box.l, box.t], [box.l, box.b], [box.r, box.b]], "#92aea0", .85);
  label(ctx, xTitle, [(box.l + box.r) / 2, h - 9], { align: "center", size: 10 });
  if (yTitle) {
    ctx.save();
    ctx.translate(10, (box.t + box.b) / 2);
    ctx.rotate(-Math.PI / 2);
    label(ctx, yTitle, [0, 0], { align: "center", size: 10 });
    ctx.restore();
  }
  return { at, box };
}

export function clip(ctx, box, draw) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t);
  ctx.clip();
  draw();
  ctx.restore();
}

export function backdrop(ctx, w, h, center = "#2b5846") {
  const gradient = ctx.createRadialGradient(w * .53, h * .43, 0, w * .53, h * .43, Math.max(w, h) * .64);
  gradient.addColorStop(0, center);
  gradient.addColorStop(1, "#0f2721");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

export function canvasPainter(canvas, draw) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  function paint() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.round(width * ratio);
    const py = Math.round(height * ratio);
    if (canvas.width !== px || canvas.height !== py) {
      canvas.width = px;
      canvas.height = py;
    }
    ctx.setTransform(px / width, 0, 0, py / height, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    draw(ctx, width, height);
  }
  return paint;
}

export function texture(ctx, w, h, vector, tint, vectorName) {
  backdrop(ctx, w, h, "#244637");
  const cx = w * .46;
  const cy = h * .50;
  const radius = Math.min(w * .25, h * .29);
  line(ctx, [[cx - radius * 1.46, cy], [cx + radius * 1.42, cy]], "#adcab269", .8, [3, 4]);
  line(ctx, [[cx, cy - radius * 1.39], [cx, cy + radius * 1.39]], "#adcab269", .8, [3, 4]);
  circle(ctx, [cx, cy], radius, "#adcab211", "#aacbbb", 1.15);

  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    const p = [cx + radius * x, cy - radius * y];
    const [dx, dy] = vector(x, y);
    const length = i === 0 ? 28 : Math.min(23, radius * .34);
    const from = [p[0] - length * dx * .35, p[1] + length * dy * .35];
    const to = [p[0] + length * dx * .65, p[1] - length * dy * .65];
    if (i === 0) {
      arrow(ctx, [cx, cy], p, color.pale, 1.2, 6);
      label(ctx, "q", [cx + radius * .54, cy + 12], { align: "center", size: 11 });
      circle(ctx, p, 7.5, "#dff8ad2d");
    }
    arrow(ctx, from, to, tint, i === 0 ? 2.3 : 1.45, i === 0 ? 7 : 5);
    circle(ctx, p, i === 0 ? 2.6 : 1.8, i === 0 ? color.bright : tint);
    if (i === 0) {
      label(ctx, vectorName, [Math.min(w - 7, to[0] + 24), to[1] - 13], { align: "right", fill: tint, size: 10, weight: 700 });
    }
  }
}
