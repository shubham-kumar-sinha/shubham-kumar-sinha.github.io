(() => {
  const $ = (id) => document.getElementById(id);
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  document.documentElement.classList.add("has-js");

  function canvasPainter(id, draw) {
    const canvas = $(id);
    const ctx = canvas.getContext("2d");
    if (!ctx) return () => {};

    function paint() {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      const pixelWidth = Math.round(width * ratio);
      const pixelHeight = Math.round(height * ratio);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      ctx.setTransform(pixelWidth / width, 0, 0, pixelHeight / height, 0, 0);
      ctx.clearRect(0, 0, width, height);
      draw(ctx, width, height);
    }

    if ("ResizeObserver" in window) new ResizeObserver(paint).observe(canvas);
    else addEventListener("resize", paint);
    return paint;
  }

  function line(ctx, points, color, width = 1, dash = []) {
    ctx.beginPath();
    points.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function dot(ctx, [x, y], radius, color) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function ring(ctx, [x, y], radius, color, width = 1) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function text(ctx, label, [x, y], color, align = "left", font = "500 11px system-ui, sans-serif") {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y);
  }

  const palette = {
    grid: "#46645a", muted: "#c4d8cb", ink: "#e9f3e8",
    stable: "#d4f696", saddle: "#ffbe90", lower: "#99dbe1", field: "#87b5a2"
  };
  const hStar = 4 / Math.sqrt(5);
  const aStable = .2;
  const bStable = -.2;
  const bSaddle = -.3;
  const aLower = -.05;
  const bPlus = (5 - Math.sqrt(46)) / 20;
  const bMinus = (5 + Math.sqrt(46)) / 20;

  let tilt = 1;
  let flat = false;
  let tiltFrame = 0;

  const paintProjection = canvasPainter("projection", (ctx, w, h) => {
    const project = (x, y, z = 0) => [
      w * (.48 + .358 * (x - .30 * tilt * y + .035 * tilt * z)),
      h * (.62 + .255 * (.32 * tilt * x - (1 - .50 * tilt) * y - 1.48 * tilt * z))
    ];
    const plane = (extent, z, fill, stroke) => {
      const corners = [[-extent, -extent], [extent, -extent], [extent, extent], [-extent, extent]];
      ctx.beginPath();
      corners.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(...project(x, y, z));
        else ctx.lineTo(...project(x, y, z));
      });
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    for (let row = 0; row < 29; row++) {
      for (let col = 0; col < 46; col++) {
        const weight = ((col * 29 + row * 71 + row * col * 9) % 131) / 131;
        dot(ctx, [w * (.027 + col * .021), h * (.035 + row * .033)], .5 + .29 * weight,
          "rgba(198,225,194," + (.04 + .10 * weight) + ")");
      }
    }

    plane(1, 0, "#84ab9b16", "#a3c6b68c");
    for (let i = -4; i <= 4; i++) {
      const s = i / 5;
      line(ctx, [project(s, -1), project(s, 1)], "#adcabb47", .7);
      line(ctx, [project(-1, s), project(1, s)], "#adcabb47", .7);
    }
    line(ctx, [project(-1, -1), project(1.08, -1)], "#c3e0c8", 1.2);
    line(ctx, [project(-1, -1), project(-1, 1.08)], "#c3e0c8", 1.2);
    const [hx, hy] = project(1.08, -1);
    const [ax, ay] = project(-1, 1.05);
    text(ctx, "h", [Math.min(w - 7, hx - 4), hy + 12], palette.ink, "right", "italic 15px Georgia, serif");
    text(ctx, "a", [Math.max(7, ax + 5), ay - 11], palette.ink, "left", "italic 15px Georgia, serif");

    const x = .19;
    const y = .23;
    const bHeight = (b) => (b + .4) / .2;
    const footprint = project(x, y);
    line(ctx, [project(x, -1), footprint, project(-1, y)], "#d4f6968a", 1, [3, 4]);

    if (tilt > .025) {
      ctx.globalAlpha = tilt;
      const axisFrom = project(-1, -1);
      const axisTo = project(-1, -1, 1.18);
      line(ctx, [axisFrom, axisTo], "#c3e0c89c", 1.2);
      text(ctx, "b", [axisTo[0] - 8, axisTo[1] - 7], palette.ink, "right", "italic 15px Georgia, serif");

      const saddle = project(x, y, bHeight(bSaddle));
      const stable = project(x, y, bHeight(bStable));
      plane(.68, bHeight(bSaddle), "#edb78013", "#dca98262");
      plane(.68, bHeight(bStable), "#d4f69613", "#d4f69680");
      line(ctx, [footprint, stable], "#e1edc5a5", 1.1, [4, 5]);
      line(ctx, [project(-.68, .68), project(-.68, .68, bHeight(bStable))], "#cadccd52", 1, [3, 5]);
      line(ctx, [project(.68, -.68), project(.68, -.68, bHeight(bStable))], "#cadccd52", 1, [3, 5]);
      const glow = ctx.createRadialGradient(stable[0], stable[1], 3, stable[0], stable[1], 49);
      glow.addColorStop(0, "#d4f69664");
      glow.addColorStop(1, "#d4f69600");
      dot(ctx, stable, 49, glow);
      ring(ctx, stable, 12, "#d4f696b8");
      dot(ctx, stable, 5.5, palette.stable);
      dot(ctx, saddle, 5.5, "#21392c");
      ring(ctx, saddle, 6, palette.saddle, 2);
      for (const [position, label, value, color] of [
        [stable, "[susy]", "b = −0.20", palette.stable],
        [saddle, "[ns₂]", "b = −0.30", palette.saddle]
      ]) {
        const [px, py] = position;
        const labelX = px + (w > 400 ? 32 : 21);
        line(ctx, [[px + 10, py], [labelX - 5, py]], color, .8);
        text(ctx, label, [labelX, py - 7], color, "left", "700 12px system-ui, sans-serif");
        text(ctx, value, [labelX, py + 9], palette.ink);
      }
      ctx.globalAlpha = 1;
    }

    ring(ctx, footprint, 7, palette.stable, 1.2);
    dot(ctx, footprint, 2.7, palette.stable);
    if (tilt < .2) {
      ctx.globalAlpha = 1 - tilt / .2;
      dot(ctx, footprint, 6.5, palette.stable);
      text(ctx, "[susy] + [ns₂]", [footprint[0] + 13, footprint[1] - 11], palette.stable,
        "left", "700 12px system-ui, sans-serif");
      ctx.globalAlpha = 1;
    }
    text(ctx, "h–a plane", [w * .47, h * .95], palette.muted, "center");
  });

  $("projection-toggle").addEventListener("click", () => {
    flat = !flat;
    $("projection-toggle").setAttribute("aria-pressed", String(flat));
    $("projection-toggle").textContent = flat ? "Tilt to reveal both points" : "Show flat view";
    $("projection-view").textContent = flat ? "Flat view" : "Tilted view";
    $("projection-caption").textContent = flat ? "Both fixed points land on one dot." : "Same h and a. Different b.";
    $("projection").setAttribute("aria-label", flat
      ? "The supersymmetric point and the saddle project onto a single dot on the plane of h and a."
      : "A tilted schematic shows the supersymmetric point and the saddle at different values of b. They cast the same projection onto the plane of h and a.");
    cancelAnimationFrame(tiltFrame);
    const from = tilt;
    const to = flat ? 0 : 1;
    if (motion.matches) {
      tilt = to;
      paintProjection();
      return;
    }
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / 650);
      tilt = from + (to - from) * (t * t * (3 - 2 * t));
      paintProjection();
      if (t < 1) tiltFrame = requestAnimationFrame(frame);
    }
    tiltFrame = requestAnimationFrame(frame);
  });
  paintProjection();

  // The infrared time τ increases as μ decreases. The paper uses Nf = 1/2.
  function da(h, a) {
    return a - 4 * a * a - a * h * h / 8 + h ** 4 / 256;
  }

  function projectedFlow(h, a) {
    return [h / 2 - 5 * h ** 3 / 32, da(h, a)];
  }

  function quarticFlow(b, a) {
    return [.6 * b - 6 * a * a - 8 * a * b - 2 * b * b + .12, .6 * a - 4 * a * a + .04];
  }

  const panelA = {
    field: projectedFlow,
    domain: [0, 2.78, -.16, .31],
    xTicks: [0, .5, 1, 1.5, 2, 2.5],
    xLabel: "h · Yukawa",
    seed: [[.16,.29],[.55,.29],[1.02,.29],[1.54,.29],[2.04,.29],[2.53,.29],[.07,.12],[.08,.04],
      [.24,-.075],[.62,-.14],[1.14,-.14],[1.48,-.14],[2.20,-.14],[2.59,-.14],[2.71,.01],[2.70,.15]]
  };
  const panelB = {
    field: quarticFlow,
    domain: [-.48, .73, -.16, .31],
    xTicks: [-.4, -.2, 0, .2, .4, .6],
    xLabel: "b · double trace",
    seed: [[-.44,.29],[-.34,.29],[-.23,.29],[-.05,.29],[.13,.29],[.31,.29],[.51,.29],[.69,.29],
      [-.45,.07],[-.43,-.12],[-.30,-.14],[-.12,-.14],[.04,-.14],[.30,-.14],[.54,-.14],[.70,.08]]
  };

  // Trace integral curves in both directions with a normalized arc-length step.
  // The field's direction, rather than its magnitude, sets the visible arrows.
  function traceStream(spec, origin, sign) {
    const [xMin, xMax, yMin, yMax] = spec.domain;
    const sx = xMax - xMin;
    const sy = yMax - yMin;
    const points = [origin];
    let [x, y] = origin;
    const direction = (u, v) => {
      const [dx, dy] = spec.field(u, v);
      const speed = Math.hypot(dx / sx, dy / sy);
      return speed > 1e-5 ? [sign * dx / speed, sign * dy / speed] : null;
    };
    for (let i = 0; i < 150; i++) {
      const d = direction(x, y);
      if (!d) break;
      const delta = .009;
      const mid = direction(x + delta * d[0] / 2, y + delta * d[1] / 2);
      if (!mid || (d[0] * mid[0] / (sx * sx) + d[1] * mid[1] / (sy * sy)) < .25) break;
      x += delta * mid[0];
      y += delta * mid[1];
      if (x < xMin || x > xMax || y < yMin || y > yMax) break;
      points.push([x, y]);
    }
    return points;
  }

  function streams(spec) {
    return spec.seed.map((origin) => traceStream(spec, origin, -1).slice(1).reverse().concat(traceStream(spec, origin, 1)));
  }

  const streamsA = streams(panelA);
  const streamsB = streams(panelB);
  const controls = [...document.querySelectorAll("[data-story]")];
  const notes = [...document.querySelectorAll("[data-note]")];
  const playback = $("playback");
  const slider = $("rg-time");
  const maxTime = Number(slider.max);
  const dt = .04;
  let stage = 0;
  let time = 0;
  let playing = false;
  let flowFrame = 0;
  let previous = 0;

  function integrate(origin) {
    const points = [origin];
    let [x, y] = origin;
    for (let i = 0; i < Math.round(maxTime / dt); i++) {
      const [x1, y1] = quarticFlow(x, y);
      const [x2, y2] = quarticFlow(x + dt * x1 / 2, y + dt * y1 / 2);
      const [x3, y3] = quarticFlow(x + dt * x2 / 2, y + dt * y2 / 2);
      const [x4, y4] = quarticFlow(x + dt * x3, y + dt * y3);
      x += dt * (x1 + 2 * x2 + 2 * x3 + x4) / 6;
      y += dt * (y1 + 2 * y2 + 2 * y3 + y4) / 6;
      points.push([x, y]);
    }
    return points;
  }

  const paths = [
    { color: "#b6f4e9", points: integrate([.035, .083]) },
    { color: "#edfaab", points: integrate([.056, .278]) }
  ];

  function chart(ctx, w, h, spec, curves) {
    const area = { left: w < 350 ? 43 : 49, right: w - 14, top: 12, bottom: h - 43 };
    const [xMin, xMax, yMin, yMax] = spec.domain;
    const at = (x, y) => [
      area.left + (x - xMin) / (xMax - xMin) * (area.right - area.left),
      area.bottom - (y - yMin) / (yMax - yMin) * (area.bottom - area.top)
    ];
    for (const x of spec.xTicks) {
      const bottom = at(x, yMin);
      line(ctx, [at(x, yMax), bottom], "#344f45");
      text(ctx, String(x).replace("-", "−"), [bottom[0], bottom[1] + 12], palette.muted, "center");
    }
    for (const y of [-.1, 0, .1, .2, .3]) {
      const left = at(xMin, y);
      line(ctx, [left, at(xMax, y)], "#344f45");
      text(ctx, y.toFixed(1).replace("-", "−"), [left[0] - 6, left[1]], palette.muted, "right");
    }
    line(ctx, [[area.left, area.top], [area.left, area.bottom], [area.right, area.bottom]], "#88a494");
    text(ctx, spec.xLabel, [(area.left + area.right) / 2, h - 8], palette.ink, "center");
    ctx.save();
    ctx.translate(8, (area.top + area.bottom) / 2);
    ctx.rotate(-Math.PI / 2);
    text(ctx, "a · single trace", [0, 0], palette.ink, "center");
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(area.left, area.top, area.right - area.left, area.bottom - area.top);
    ctx.clip();
    ctx.lineCap = "round";
    for (const curve of curves) {
      line(ctx, curve.map(([x, y]) => at(x, y)), "#86b2a168", .9);
    }

    const columns = w < 350 ? 8 : 13;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < columns; col++) {
        const x = xMin + (col + .5) / columns * (xMax - xMin);
        const y = yMin + (row + .5) / 9 * (yMax - yMin);
        const [dx, dy] = spec.field(x, y);
        const [px, py] = at(x, y);
        const [qx, qy] = at(x + dx, y + dy);
        if (Math.hypot(qx - px, qy - py) < 2) continue;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(Math.atan2(qy - py, qx - px));
        line(ctx, [[-4, 0], [4, 0], [1.5, -2.3]], "#a2cfb6b0", .9);
        line(ctx, [[4, 0], [1.5, 2.3]], "#a2cfb6b0", .9);
        ctx.restore();
      }
    }
    ctx.restore();
    return at;
  }

  function fixedMarker(ctx, point, label, color, { left = false, hollow = false, lifted = false, highlight = false } = {}) {
    const [x, y] = point;
    if (highlight) {
      dot(ctx, point, 13, color + "36");
      ring(ctx, point, 10, color + "aa");
    }
    if (hollow) {
      dot(ctx, point, 5.2, "#15332a");
      ring(ctx, point, 5.2, color, 1.8);
    } else {
      dot(ctx, point, 6.5, "#102720");
      dot(ctx, point, 4.9, color);
    }
    const align = left ? "right" : "left";
    const position = [x + (left ? -9 : 9), y - (lifted ? 12 : 5)];
    ctx.save();
    ctx.shadowColor = "#102720";
    ctx.shadowBlur = 4;
    text(ctx, label, position, color, align, "700 11px system-ui, sans-serif");
    ctx.restore();
  }

  const paintA = canvasPainter("plot-a", (ctx, w, h) => {
    const at = chart(ctx, w, h, panelA, streamsA);
    if (stage > 0) line(ctx, [at(hStar, -.16), at(hStar, .31)], "#d4f696a0", 1.15, [4, 4]);
    fixedMarker(ctx, at(0, 0), "[free] + [vec]", palette.ink);
    fixedMarker(ctx, at(hStar, aLower), "[ns+] + [ns−]", palette.lower, { left: w < 390 });
    fixedMarker(ctx, at(hStar, aStable), "[susy] + [ns₂]", palette.stable, {
      left: w < 390, lifted: true, highlight: stage < 2
    });
  });

  const paintB = canvasPainter("plot-b", (ctx, w, h) => {
    const at = chart(ctx, w, h, panelB, streamsB);
    if (stage === 1) {
      const lineY = aStable - .028;
      line(ctx, [at(bSaddle, aStable), at(bSaddle, lineY), at(bStable, lineY), at(bStable, aStable)],
        "#f5d5a3", 1, [2, 3]);
    }
    if (stage === 2) {
      for (const { color, points } of paths) {
        const i = Math.min(points.length - 2, Math.floor(time / dt));
        const t = time / dt - i;
        const current = points[i].map((p, axis) => p + t * (points[i + 1][axis] - p));
        const full = points.filter((_, j) => j % 4 === 0).map(([x, y]) => at(x, y));
        line(ctx, full, color + "9c", 1.2, [3, 4]);
        const past = points.slice(0, i + 1).filter((_, j) => j % 4 === 0).map(([x, y]) => at(x, y));
        line(ctx, past.concat([at(...current)]), color, 2.25);
        dot(ctx, at(...current), 6.6, "#102720");
        dot(ctx, at(...current), 4.3, color);
      }
    }
    fixedMarker(ctx, at(bPlus, aLower), "[ns+]", palette.lower, { hollow: true });
    fixedMarker(ctx, at(bMinus, aLower), "[ns−]", palette.lower, { left: true, hollow: true });
    fixedMarker(ctx, at(bSaddle, aStable), "[ns₂]", palette.saddle, { left: true, hollow: true, highlight: stage === 1 });
    fixedMarker(ctx, at(bStable, aStable), "[susy]", palette.stable, { highlight: stage > 0 });
  });

  function showTime(value) {
    time = value;
    slider.value = String(time);
    $("rg-readout").value = "τ = " + time.toFixed(1);
    paintB();
  }

  function syncPlayButton() {
    $("play").dataset.playing = String(playing);
    $("play-label").textContent = playing ? "Pause" : time >= maxTime ? "Replay the paths" : "Play the paths";
  }

  function stop() {
    cancelAnimationFrame(flowFrame);
    flowFrame = 0;
    playing = false;
    syncPlayButton();
  }

  function chooseStage(index) {
    stage = index;
    stop();
    controls.forEach((button, i) => button.setAttribute("aria-pressed", String(i === stage)));
    notes.forEach((note, i) => { note.hidden = i !== stage; });
    playback.hidden = stage !== 2;
    $("panel-a").toggleAttribute("data-active", stage === 0);
    $("panel-b").toggleAttribute("data-active", stage > 0);
    paintA();
    paintB();
  }

  controls.forEach((button) => button.addEventListener("click", () => chooseStage(Number(button.dataset.story))));
  function advance(now) {
    const elapsed = Math.min(80, now - previous) / 1000;
    previous = now;
    showTime(Math.min(maxTime, time + elapsed * (1.25 + .12 * time)));
    if (time < maxTime) flowFrame = requestAnimationFrame(advance);
    else stop();
  }

  $("play").addEventListener("click", () => {
    if (playing) {
      stop();
      return;
    }
    if (time >= maxTime) showTime(0);
    if (motion.matches) {
      showTime(maxTime);
      syncPlayButton();
      return;
    }
    playing = true;
    syncPlayButton();
    previous = performance.now();
    flowFrame = requestAnimationFrame(advance);
  });
  $("reset").addEventListener("click", () => { showTime(0); stop(); });
  slider.addEventListener("input", () => { time = Number(slider.value); stop(); showTime(time); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && playing) stop(); });
  chooseStage(0);
})();
