(() => {
  const { setupCanvas, circle, drawPairing, motion } = window.explainerCanvas;
  document.documentElement.classList.add("has-js");

  const $ = (id) => document.getElementById(id);
  const numberFormat = new Intl.NumberFormat("en");
  const signed = (n, digits) => n.toFixed(digits).replace("-", "−");

  const representation = {
    hermitian: {
      count: (n) => n ** 2 - 1,
      rule: "Hermitian and traceless. Each off-diagonal pair contributes two real components."
    },
    symmetric: {
      count: (n) => n * (n + 1) / 2 - 1,
      rule: "Symmetric and traceless. Mirrored entries agree."
    },
    antisymmetric: {
      count: (n) => n * (n - 1) / 2,
      rule: "Antisymmetric. Mirrored entries have opposite signs, and the diagonal is zero."
    }
  };
  const models = {
    unitary: ["hermitian", "hermitian"],
    symmetric: ["symmetric", "symmetric"],
    mixed: ["symmetric", "antisymmetric"]
  };

  const matrixSize = $("matrix-size");
  const modelButtons = [...document.querySelectorAll("[data-model]")];
  let model = "mixed";

  function renderMatrix(target, kind, n) {
    const displayed = Math.min(n, 10);
    const cells = document.createDocumentFragment();
    target.style.setProperty("--n", displayed);
    for (let row = 0; row < displayed; row++) {
      for (let col = 0; col < displayed; col++) {
        const cell = document.createElement("span");
        cell.className = "matrix-cell";
        if (row > col) cell.classList.add("is-mirror");
        if (row === col && kind === "antisymmetric") cell.classList.add("is-zero");
        if (row === n - 1 && col === n - 1 && kind !== "antisymmetric") cell.classList.add("is-dependent");
        cells.append(cell);
      }
    }
    target.replaceChildren(cells);
  }

  function renderModel() {
    const n = Number(matrixSize.value);
    $("size-value").value = String(n);
    const [scalar, fermion] = models[model];
    const scalarCount = representation[scalar].count(n);
    const fermionCount = representation[fermion].count(n);
    for (const [field, kind, count] of [["scalar", scalar, scalarCount], ["fermion", fermion, fermionCount]]) {
      $(field + "-count").textContent = numberFormat.format(count);
      $(field + "-rule").textContent = representation[kind].rule;
      renderMatrix($(field + "-matrix"), kind, n);
    }
    $("matrix-window").textContent = n > 10 ? "Showing a 10 × 10 corner" : n + " × " + n + " display";
    const difference = scalarCount - fermionCount;
    $("matrix-summary").textContent = difference
      ? "The mixed model has " + numberFormat.format(difference) + " more scalar components than fermion components."
      : "Both fields have " + numberFormat.format(scalarCount) + " independent internal components.";
    $("matrix-detail").textContent = difference
      ? "The difference is " + (100 * difference / scalarCount).toFixed(1) + "% of the scalar count. Spinor indices are separate."
      : "The counts refer to internal field components. Spinor indices are separate.";
    $("pair-numbers").textContent = "At N = " + n + ", the crossed pairing has 1/" + numberFormat.format(n ** 2)
      + " of the weight of an adjacent pairing.";
  }

  for (const button of modelButtons) {
    button.addEventListener("click", () => {
      model = button.dataset.model;
      for (const item of modelButtons) item.setAttribute("aria-pressed", String(item === button));
      renderModel();
    });
  }
  matrixSize.addEventListener("input", renderModel);
  renderModel();

  const pairPlot = $("pair-plot");
  const pairButtons = [...document.querySelectorAll("[data-pair]")];
  let crossed = false;
  let pairingProgress = 1;
  let pairingFrame = 0;
  const paintPairing = setupCanvas(pairPlot, (ctx, w, h) => drawPairing(ctx, w, h, crossed, pairingProgress));

  for (const button of pairButtons) {
    button.addEventListener("click", () => {
      const nextCrossed = button.dataset.pair === "crossed";
      if (nextCrossed === crossed) return;
      crossed = nextCrossed;
      for (const item of pairButtons) item.setAttribute("aria-pressed", String(item === button));
      $("pair-sums").textContent = crossed ? "1" : "3";
      $("pair-weight").textContent = crossed ? "1/N²" : "1";
      const explanation = crossed
        ? "All four labels share one index, leaving one free sum."
        : "This pairing identifies i with k. The labels j and ℓ can still vary independently.";
      $("pair-summary").textContent = explanation;
      pairPlot.setAttribute("aria-label", (crossed ? "Crossed pairing. " : "Adjacent pairing. ") + explanation);
      cancelAnimationFrame(pairingFrame);
      if (motion.matches) {
        pairingProgress = 1;
        paintPairing();
        return;
      }
      const start = performance.now();
      function frame(now) {
        const t = Math.min((now - start) / 460, 1);
        pairingProgress = 1 - (1 - t) ** 3;
        paintPairing();
        if (t < 1) pairingFrame = requestAnimationFrame(frame);
      }
      pairingFrame = requestAnimationFrame(frame);
    });
  }
  paintPairing();

  const flowPlot = $("flow-plot");
  const flowTime = $("flow-time");
  const flowPlay = $("flow-play");
  const flowReset = $("flow-reset");
  const duration = Number(flowTime.max);
  const step = .05;
  const starts = [
    { name: "A", color: "#a9e594", point: [.105, .020] },
    { name: "B", color: "#ffc58f", point: [.312, .045] },
    { name: "C", color: "#92dcd8", point: [.170, -.150] }
  ];

  // Infrared time increases as μ decreases. These are Eqs. (3.17–3.18)
  // with Nf = 1/2 and the rescaled Yukawa coupling u fixed at 16/5.
  function irVelocity(a, b) {
    return [
      .6 * a - 4 * a * a + .04,
      .6 * b - 6 * a * a - 8 * a * b - 2 * b * b + .12
    ];
  }

  function rk4([a, b]) {
    const [a1, b1] = irVelocity(a, b);
    const [a2, b2] = irVelocity(a + step * a1 / 2, b + step * b1 / 2);
    const [a3, b3] = irVelocity(a + step * a2 / 2, b + step * b2 / 2);
    const [a4, b4] = irVelocity(a + step * a3, b + step * b3);
    return [
      a + step * (a1 + 2 * a2 + 2 * a3 + a4) / 6,
      b + step * (b1 + 2 * b2 + 2 * b3 + b4) / 6
    ];
  }

  function integrate(point) {
    const path = [point];
    for (let i = 0; i < Math.round(duration / step); i++) path.push(rk4(path[i]));
    return path;
  }

  const paths = starts.map(({ name, color, point }) => ({ name, color, points: integrate(point) }));
  let time = 0;
  let flowFrame = 0;
  let flowPrevious = 0;
  let flowPlaying = false;

  function pointAt(points, t) {
    const index = Math.min(points.length - 2, Math.floor(t / step));
    const fraction = t / step - index;
    return points[index].map((value, axis) => value + (points[index + 1][axis] - value) * fraction);
  }

  function axes(ctx, w, h, spec) {
    const area = { left: 53, right: w - 14, top: 11, bottom: h - 43 };
    const x = (v) => area.left + (v - spec.xRange[0]) / (spec.xRange[1] - spec.xRange[0]) * (area.right - area.left);
    const y = (v) => area.bottom - (v - spec.yRange[0]) / (spec.yRange[1] - spec.yRange[0]) * (area.bottom - area.top);
    const muted = spec.dark ? "#c5d8cb" : "#4c6156";
    const grid = spec.dark ? "#355447" : "#dce5db";
    ctx.font = "11px system-ui, sans-serif";
    ctx.lineWidth = 1;
    ctx.strokeStyle = grid;
    ctx.fillStyle = muted;
    ctx.textBaseline = "middle";
    for (const tick of spec.yTicks) {
      ctx.beginPath();
      ctx.moveTo(area.left, y(tick));
      ctx.lineTo(area.right, y(tick));
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.fillText(signed(tick, spec.yDigits), area.left - 7, y(tick));
    }
    for (const tick of spec.xTicks) {
      ctx.beginPath();
      ctx.moveTo(x(tick), area.top);
      ctx.lineTo(x(tick), area.bottom);
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillText(signed(tick, spec.xDigits), x(tick), area.bottom + 12);
    }
    ctx.strokeStyle = spec.dark ? "#658474" : "#a5b8aa";
    ctx.beginPath();
    ctx.moveTo(area.left, area.top);
    ctx.lineTo(area.left, area.bottom);
    ctx.lineTo(area.right, area.bottom);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillText(spec.xLabel, (area.left + area.right) / 2, h - 7);
    ctx.save();
    ctx.translate(9, (area.top + area.bottom) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(spec.yLabel, 0, 0);
    ctx.restore();
    return { x, y, area };
  }

  function flowArrow(ctx, x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(6, 0);
    ctx.lineTo(3, -2.7);
    ctx.moveTo(6, 0);
    ctx.lineTo(3, 2.7);
    ctx.stroke();
    ctx.restore();
  }

  const paintFlow = setupCanvas(flowPlot, (ctx, w, h) => {
    const { x, y, area } = axes(ctx, w, h, {
      dark: true,
      xRange: [.078, .338], xTicks: [.10, .15, .20, .25, .30], xDigits: 2,
      yRange: [-.345, .080], yTicks: [-.30, -.20, -.10, 0], yDigits: 2,
      xLabel: "a · single-trace quartic", yLabel: "b · double-trace quartic"
    });
    ctx.save();
    ctx.beginPath();
    ctx.rect(area.left, area.top, area.right - area.left, area.bottom - area.top);
    ctx.clip();

    ctx.strokeStyle = "#82a99182";
    ctx.lineWidth = 1;
    const columns = w < 380 ? 8 : 12;
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < columns; col++) {
        const a = .088 + col / (columns - 1) * .236;
        const b = -.322 + row / 9 * .383;
        const [da, db] = irVelocity(a, b);
        if (Math.hypot(da, db) > .005) {
          flowArrow(ctx, x(a), y(b), Math.atan2(y(b + db) - y(b), x(a + da) - x(a)));
        }
      }
    }

    for (const path of paths) {
      function strokePath(until, dashed) {
        ctx.beginPath();
        ctx.moveTo(x(path.points[0][0]), y(path.points[0][1]));
        for (let i = 1; i < Math.min(path.points.length, until / step); i += 3) {
          ctx.lineTo(x(path.points[i][0]), y(path.points[i][1]));
        }
        const [a, b] = pointAt(path.points, until);
        ctx.lineTo(x(a), y(b));
        ctx.setLineDash(dashed ? [3, 5] : []);
        ctx.globalAlpha = dashed ? .66 : .95;
        ctx.strokeStyle = path.color;
        ctx.lineWidth = dashed ? 1.65 : 2.3;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
      }
      strokePath(duration, true);
      if (time > 0) strokePath(time, false);
    }

    for (const path of paths) {
      const [a0, b0] = path.points[0];
      const [a, b] = pointAt(path.points, time);
      circle(ctx, x(a), y(b), 6.9, "#18342c");
      circle(ctx, x(a), y(b), 4.5, path.color);
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillStyle = path.color;
      ctx.textAlign = "center";
      ctx.fillText(path.name, x(a0), y(b0) - 12);
    }
    circle(ctx, x(.2), y(-.2), 8.5, "#d6fac455");
    circle(ctx, x(.2), y(-.2), 3.8, "#f0f9db");
    circle(ctx, x(.2), y(-.3), 5.1, "#f6cfaa");
    circle(ctx, x(.2), y(-.3), 3.7, "#18342c");

    ctx.font = "600 11px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#e3f1e4";
    ctx.fillText("Stable point", x(.2) + 11, y(-.2) + 9);
    ctx.fillStyle = "#f6cfaa";
    ctx.fillText("Saddle", x(.2) + 10, y(-.3));
    ctx.restore();
  });

  function renderTime() {
    $("time-value").value = time.toFixed(1);
    paths.forEach((path, i) => {
      const [a, b] = pointAt(path.points, time);
      $("flow-a-" + i).textContent = signed(a, 3);
      $("flow-b-" + i).textContent = signed(b, 3);
    });
    paintFlow();
  }

  function syncFlowButton() {
    const label = flowPlaying ? "Pause flow" : time >= duration ? "Replay flow" : "Play flow";
    $("flow-play-label").textContent = label;
    flowPlay.dataset.playing = String(flowPlaying);
  }

  function stopFlow() {
    cancelAnimationFrame(flowFrame);
    flowFrame = 0;
    flowPlaying = false;
    syncFlowButton();
  }

  function showTime(value) {
    time = value;
    flowTime.value = String(time);
    renderTime();
  }

  function advanceFlow(now) {
    const elapsed = Math.min(100, now - flowPrevious) / 1000;
    flowPrevious = now;
    showTime(Math.min(duration, time + elapsed * (1.2 + .12 * time)));
    if (time < duration) flowFrame = requestAnimationFrame(advanceFlow);
    else stopFlow();
  }

  flowPlay.addEventListener("click", () => {
    if (flowPlaying) {
      stopFlow();
      return;
    }
    if (time >= duration) showTime(0);
    flowPlaying = true;
    syncFlowButton();
    flowPrevious = performance.now();
    flowFrame = requestAnimationFrame(advanceFlow);
  });
  flowReset.addEventListener("click", () => {
    showTime(0);
    stopFlow();
  });
  flowTime.addEventListener("input", () => {
    time = Number(flowTime.value);
    stopFlow();
    renderTime();
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopFlow(); });
  renderTime();

  const epsilon = $("epsilon");
  let e = Number(epsilon.value);
  const deltaScalar = (value) => 1 - 2 * value / 5 + 2 * value ** 2 / 125 + 27 * value ** 3 / 6250;

  const paintDimensions = setupCanvas($("dimensions-plot"), (ctx, w, h) => {
    const { x, y, area } = axes(ctx, w, h, {
      dark: false,
      xRange: [0, 1], xTicks: [0, .25, .5, .75, 1], xDigits: 2,
      yRange: [.55, 1.59], yTicks: [.6, .9, 1.2, 1.5], yDigits: 1,
      xLabel: "ε", yLabel: "Scaling dimension Δ"
    });
    const scalar = "#3d7950";
    const fermion = "#ad572f";
    ctx.lineWidth = 2.5;
    for (const [offset, color] of [[0, scalar], [.5, fermion]]) {
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(x(0), y(1 + offset));
      for (let i = 1; i <= 100; i++) ctx.lineTo(x(i / 100), y(deltaScalar(i / 100) + offset));
      ctx.stroke();
    }
    const guide = x(e);
    const lower = y(deltaScalar(e));
    const upper = y(deltaScalar(e) + .5);
    ctx.strokeStyle = "#65766a";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(guide, area.top);
    ctx.lineTo(guide, area.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    const sign = e > .84 ? -1 : 1;
    const bracket = guide + sign * 13;
    ctx.beginPath();
    ctx.moveTo(bracket + sign * 4, upper);
    ctx.lineTo(bracket, upper);
    ctx.lineTo(bracket, lower);
    ctx.lineTo(bracket + sign * 4, lower);
    ctx.stroke();
    ctx.fillStyle = "#415348";
    ctx.font = "15px Georgia, serif";
    ctx.textAlign = sign > 0 ? "left" : "right";
    ctx.fillText("½", bracket + sign * 6, (lower + upper) / 2);
    circle(ctx, guide, lower, 6.5, "#fffdf6");
    circle(ctx, guide, upper, 6.5, "#fffdf6");
    circle(ctx, guide, lower, 4.5, scalar);
    circle(ctx, guide, upper, 4.5, fermion);
  });

  function renderDimensions() {
    e = Number(epsilon.value);
    const scalar = deltaScalar(e);
    $("epsilon-value").value = e.toFixed(2);
    $("dimension-scalar").textContent = scalar.toFixed(3);
    $("dimension-fermion").textContent = (scalar + .5).toFixed(3);
    paintDimensions();
  }

  epsilon.addEventListener("input", renderDimensions);
  renderDimensions();
})();
