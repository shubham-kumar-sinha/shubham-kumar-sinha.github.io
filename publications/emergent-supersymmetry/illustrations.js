(() => {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function setupCanvas(canvas, draw) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return () => {};

    function paint() {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.round(width * ratio);
      const pixelHeight = Math.round(height * ratio);
      const resized = canvas.width !== pixelWidth || canvas.height !== pixelHeight;
      if (resized) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      ctx.setTransform(pixelWidth / width, 0, 0, pixelHeight / height, 0, 0);
      ctx.clearRect(0, 0, width, height);
      draw(ctx, width, height, resized);
    }

    if ("ResizeObserver" in window) new ResizeObserver(paint).observe(canvas);
    else window.addEventListener("resize", paint);
    return paint;
  }

  function circle(ctx, x, y, radius, color) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function ribbonPoint(t, strand, family, w, h) {
    const shape = t * 5.45 - .46;
    const envelope = Math.sin(Math.PI * Math.min(1, Math.max(0, t))) ** 2;
    const separation = .125 + .111 * envelope;
    const bend = Math.cos(shape) * separation * (1 - .61 * t);
    const spread = .067 + .105 * envelope;
    const pleat = .7 * strand * Math.cos(t * 6.6 + family * .72)
      + .36 * strand ** 2 * Math.sin(t * 12.7 - family * .8)
      + .19 * Math.sin(t * 12 + strand * 5 + family);
    const x = .013 + .96 * t + .056 * strand * Math.sin(t * 7.4 + family) * envelope;
    const y = .49 + .043 * Math.sin(t * 6.2 - .55) + family * bend + spread * pleat;
    return [x * w, y * h];
  }

  function paintCoverBase(ctx, w, h) {
    const field = ctx.createRadialGradient(.59 * w, .47 * h, .04 * w, .57 * w, .5 * h, .79 * w);
    field.addColorStop(0, "#335b45");
    field.addColorStop(.48, "#1e3e32");
    field.addColorStop(1, "#102620");
    ctx.fillStyle = field;
    ctx.fillRect(0, 0, w, h);

    // A deterministic texture keeps the static artwork identical across frames.
    for (let row = 0, y = 15; y < h; row++, y += 8) {
      for (let col = 0, x = 15; x < w; col++, x += 8) {
        const hash = ((row * 197 + col * 103 + row * col * 31) % 233) / 233;
        circle(ctx, x + 3 * hash, y, .4 + hash * .46, "rgba(210,235,191," + (.042 + .11 * hash) + ")");
      }
    }

    const cx = w * .62;
    const cy = h * .49;
    ctx.lineWidth = .65;
    ctx.strokeStyle = "rgba(212,234,207,.15)";
    ctx.setLineDash([2, 5]);
    for (const factor of [.16, .245, .34, .43, .525]) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, w * factor, h * factor * .83, -.21, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(220,239,219,.15)";
    ctx.beginPath();
    ctx.moveTo(w * .065, cy);
    ctx.lineTo(w * .935, cy);
    ctx.moveTo(cx, h * .16);
    ctx.lineTo(cx, h * .81);
    ctx.stroke();

    for (const family of [-1, 1]) {
      const hue = family < 0 ? "244,186,129" : "184,242,157";
      for (let line = 0; line <= 39; line++) {
        const strand = line / 39 * 2 - 1;
        ctx.beginPath();
        for (let step = 0; step <= 145; step++) {
          const [x, y] = ribbonPoint(step / 145 * 1.14 - .07, strand, family, w, h);
          if (step === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const accent = line === 7 || line === 20 || line === 33;
        ctx.lineWidth = accent ? 1.4 : .74;
        ctx.strokeStyle = "rgba(" + hue + "," + (accent ? .79 : .19 + .26 * Math.sin(line * .89) ** 2) + ")";
        ctx.stroke();
      }
    }

    // A line and labels indicate the direction of coarse graining in the illustration.
    const lineY = h * .80;
    ctx.lineWidth = .8;
    ctx.strokeStyle = "rgba(219,238,216,.46)";
    ctx.beginPath();
    ctx.moveTo(w * .082, lineY);
    ctx.lineTo(w * .918, lineY);
    ctx.lineTo(w * .902, lineY - 4);
    ctx.moveTo(w * .918, lineY);
    ctx.lineTo(w * .902, lineY + 4);
    ctx.stroke();
    ctx.fillStyle = "#d9e9d7";
    ctx.font = "500 " + (w < 360 ? 10 : 11) + "px system-ui, sans-serif";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText("Short distance", w * .082, lineY + 9);
    ctx.textAlign = "right";
    ctx.fillText("Long distance", w * .918, lineY + 9);
  }

  const cover = document.getElementById("cover-art");
  const toggle = document.getElementById("cover-toggle");
  const coverBase = document.createElement("canvas");
  let phase = .16;
  let frameId = 0;
  let previous = 0;
  let visible = true;
  let playing = !motion.matches;

  const paintCover = setupCanvas(cover, (ctx, w, h, resized) => {
    if (resized || coverBase.width !== cover.width || coverBase.height !== cover.height) {
      coverBase.width = cover.width;
      coverBase.height = cover.height;
      const baseCtx = coverBase.getContext("2d");
      baseCtx.setTransform(cover.width / w, 0, 0, cover.height / h, 0, 0);
      paintCoverBase(baseCtx, w, h);
    }
    ctx.drawImage(coverBase, 0, 0, w, h);
    for (const family of [-1, 1]) {
      for (let n = 0; n < 4; n++) {
        const t = .025 + (phase + n * .236 + (family < 0 ? .103 : 0)) % .95;
        const [x, y] = ribbonPoint(t, (n - 1.5) / 3, family, w, h);
        const fade = Math.min(1, t * 15, (1 - t) * 15);
        ctx.globalAlpha = fade;
        ctx.shadowColor = family < 0 ? "#f6bf83" : "#c6ffab";
        ctx.shadowBlur = 12;
        circle(ctx, x, y, n === 1 ? 2.6 : 1.65, family < 0 ? "#ffdbad" : "#e0ffd0");
      }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  });

  function updateCoverFrame(now) {
    if (now - previous >= 32) {
      phase = (phase + Math.min(now - previous, 70) / 17000) % .95;
      previous = now;
      paintCover();
    }
    frameId = requestAnimationFrame(updateCoverFrame);
  }

  function syncCoverPlayback() {
    toggle.textContent = playing ? "Pause animation" : "Play animation";
    if (playing && visible && !document.hidden) {
      if (!frameId) {
        previous = performance.now();
        frameId = requestAnimationFrame(updateCoverFrame);
      }
    } else {
      cancelAnimationFrame(frameId);
      frameId = 0;
      if (visible) paintCover();
    }
  }

  toggle.addEventListener("click", () => {
    playing = !playing;
    syncCoverPlayback();
  });
  motion.addEventListener("change", (event) => {
    if (event.matches) {
      playing = false;
      syncCoverPlayback();
    }
  });
  document.addEventListener("visibilitychange", syncCoverPlayback);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncCoverPlayback();
    }).observe(cover);
  }
  syncCoverPlayback();

  function drawPairing(ctx, w, h, crossed, progress) {
    const boxWidth = Math.min(w * .63, 278);
    const boxHeight = h * .55;
    const l = (w - boxWidth) / 2;
    const r = l + boxWidth;
    const t = (h - boxHeight) / 2;
    const b = t + boxHeight;
    const mx = w / 2;
    const my = h / 2;
    const upper = [mx, t];
    const right = [r, my];
    const lower = [mx, b];
    const left = [l, my];

    ctx.lineWidth = 1;
    ctx.strokeStyle = "#adbbae";
    ctx.strokeRect(l, t, boxWidth, boxHeight);
    ctx.fillStyle = "#3a4d41";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "italic 15px Georgia, serif";
    ctx.fillText("Mᵢⱼ", mx, t - 18);
    ctx.fillText("Mⱼₖ", r + (w - r) / 2, my);
    ctx.fillText("Mₖℓ", mx, b + 19);
    ctx.fillText("Mℓᵢ", l / 2, my);

    const pairings = crossed
      ? [[upper, [mx, my], lower], [left, [mx, my], right]]
      : [[upper, [mx, my], right], [lower, [mx, my], left]];

    pairings.forEach(([start, control, end], n) => {
      const color = n === 0 ? "#527e57" : "#a76d44";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(...start);
      for (let i = 1; i <= 45; i++) {
        const p = i / 45 * progress;
        const q = 1 - p;
        ctx.lineTo(q * q * start[0] + 2 * q * p * control[0] + p * p * end[0],
          q * q * start[1] + 2 * q * p * control[1] + p * p * end[1]);
      }
      ctx.strokeStyle = color;
      ctx.stroke();
      circle(ctx, ...start, 4, color);
      circle(ctx, ...end, 4, color);
    });

    const cornerColors = crossed ? ["#356445", "#356445", "#356445", "#356445"]
      : ["#356445", "#955c31", "#356445", "#585f91"];
    [[l, t], [r, t], [r, b], [l, b]].forEach(([x, y], i) => {
      circle(ctx, x, y, 12, cornerColors[i]);
      ctx.fillStyle = "#fffdf6";
      ctx.font = "italic 15px Georgia, serif";
      ctx.fillText(["i", "j", "k", "ℓ"][i], x, y);
    });
  }

  window.explainerCanvas = { setupCanvas, circle, drawPairing, motion };
})();
