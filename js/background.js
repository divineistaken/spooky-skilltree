export function initBackground() {
  const canvas = document.getElementById("bg");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let w = 0;
  let h = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let running = true;

  // Pre-rendered glow sprites (one per hue bucket) — avoids creating a
  // radial gradient for every ember on every frame, which was the main CPU cost.
  const SPRITE = 64;
  const sprites = [22, 28, 34, 40, 46, 52].map((hue) => {
    const c = document.createElement("canvas");
    c.width = c.height = SPRITE;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2);
    grd.addColorStop(0, `hsla(${hue}, 100%, 68%, 0.95)`);
    grd.addColorStop(0.35, `hsla(${hue}, 100%, 56%, 0.5)`);
    grd.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
    g.fillStyle = grd;
    g.fillRect(0, 0, SPRITE, SPRITE);
    return c;
  });

  const stars = [];
  const embers = [];
  const bats = [];
  let t = 0;
  let batTimer = 2;

  function resize() {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    stars.length = 0;
    embers.length = 0;
    bats.length = 0;
    const starCount = Math.min(180, Math.round((w * h) / 20000));
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.92,
        r: Math.random() * 1.4 + 0.4,
        p: Math.random() * Math.PI * 2,
        s: Math.random() * 0.02 + 0.006,
      });
    }
    const emberCount = Math.min(70, Math.round((w * h) / 34000));
    for (let i = 0; i < emberCount; i++) embers.push(newEmber(true));
  }

  function newEmber(anywhere) {
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 14,
      r: Math.random() * 2.4 + 1,
      vy: -(Math.random() * 0.45 + 0.16),
      vx: (Math.random() - 0.5) * 0.26,
      p: Math.random() * Math.PI * 2,
      si: (Math.random() * sprites.length) | 0,
      life: 0,
      max: Math.random() * 320 + 220,
    };
  }

  function spawnBat() {
    const dir = Math.random() > 0.5 ? 1 : -1;
    bats.push({
      x: dir === 1 ? -60 : w + 60,
      y: h * (0.12 + Math.random() * 0.5),
      vx: dir * (1.1 + Math.random() * 1.4),
      size: 8 + Math.random() * 10,
      flap: Math.random() * Math.PI * 2,
      bob: Math.random() * Math.PI * 2,
    });
  }

  function draw(dt) {
    t += dt;
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = 1;

    // twinkling stars (fillRect is cheaper than arc)
    ctx.fillStyle = "#ffe9c9";
    for (const s of stars) {
      const a = 0.35 + Math.sin(t * s.s * 60 + s.p) * 0.35;
      ctx.globalAlpha = a < 0.06 ? 0.06 : a;
      const d = s.r * 2;
      ctx.fillRect(s.x - s.r, s.y - s.r, d, d);
    }

    // rising embers — fast sprite blit, no per-frame gradient allocation
    for (const e of embers) {
      e.life += dt * 60;
      e.y += e.vy;
      e.x += e.vx + Math.sin(t * 2 + e.p) * 0.15;
      const fade = Math.min(1, e.life / 60) * Math.max(0, 1 - e.life / e.max);
      if (fade <= 0.01 || e.y < -30 || e.life > e.max) {
        Object.assign(e, newEmber(false));
        continue;
      }
      const size = e.r * 9;
      ctx.globalAlpha = fade * 0.9;
      ctx.drawImage(sprites[e.si], e.x - size / 2, e.y - size / 2, size, size);
    }

    // bats
    if (!reduced) {
      batTimer -= dt;
      if (batTimer <= 0) {
        spawnBat();
        batTimer = 6 + Math.random() * 8;
      }
    }
    for (let i = bats.length - 1; i >= 0; i--) {
      const b = bats[i];
      b.x += b.vx;
      b.flap += dt * 9;
      b.bob += dt * 2;
      const y = b.y + Math.sin(b.bob) * 10;
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "#0b0512";
      ctx.strokeStyle = "rgba(168,85,247,0.35)";
      ctx.lineWidth = 1;
      const wf = Math.sin(b.flap) * b.size * 0.75;
      ctx.beginPath();
      ctx.moveTo(b.x, y);
      ctx.quadraticCurveTo(b.x - b.size, y - wf, b.x - b.size * 1.7, y + b.size * 0.25);
      ctx.quadraticCurveTo(b.x - b.size * 0.8, y + wf * 0.3, b.x, y + b.size * 0.25);
      ctx.quadraticCurveTo(b.x + b.size * 0.8, y + wf * 0.3, b.x + b.size * 1.7, y + b.size * 0.25);
      ctx.quadraticCurveTo(b.x + b.size, y - wf, b.x, y);
      ctx.fill();
      ctx.stroke();
      if (b.x < -90 || b.x > w + 90) bats.splice(i, 1);
    }

    ctx.globalAlpha = 1;
  }

  let last = performance.now();
  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    draw(dt);
    requestAnimationFrame(loop);
  }

  // Stop burning CPU while the tab is hidden.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      running = false;
    } else {
      running = true;
      last = performance.now();
      requestAnimationFrame(loop);
    }
  });

  let rzRaf = 0;
  const onResize = () => {
    if (rzRaf) return;
    rzRaf = requestAnimationFrame(() => {
      rzRaf = 0;
      resize();
      if (reduced) draw(0);
    });
  };

  window.addEventListener("resize", onResize);
  resize();
  if (reduced) {
    draw(0);
  } else {
    requestAnimationFrame(loop);
  }
}
