const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function initBackground() {
  const canvas = document.getElementById("bg");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let w = 0;
  let h = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  const stars = [];
  const embers = [];
  const bats = [];
  let t = 0;

  function resize() {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    stars.length = 0;
    embers.length = 0;
    const starCount = Math.round((w * h) / 14000);
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.9,
        r: Math.random() * 1.3 + 0.3,
        p: Math.random() * Math.PI * 2,
        s: Math.random() * 0.02 + 0.006,
      });
    }
    const emberCount = Math.round((w * h) / 26000);
    for (let i = 0; i < emberCount; i++) {
      embers.push(newEmber(true));
    }
  }

  function newEmber(anywhere) {
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 12,
      r: Math.random() * 2.2 + 0.8,
      vy: -(Math.random() * 0.5 + 0.18),
      vx: (Math.random() - 0.5) * 0.28,
      p: Math.random() * Math.PI * 2,
      hue: 20 + Math.random() * 28,
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

  let batTimer = 0;

  function draw(dt) {
    t += dt;
    ctx.clearRect(0, 0, w, h);

    // twinkling stars
    for (const s of stars) {
      const a = 0.35 + Math.sin(t * s.s * 60 + s.p) * 0.35;
      ctx.globalAlpha = Math.max(0.05, a);
      ctx.fillStyle = "#ffe9c9";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // rising embers
    for (const e of embers) {
      e.life += dt * 60;
      e.y += e.vy;
      e.x += e.vx + Math.sin(t * 2 + e.p) * 0.15;
      const fade = Math.min(1, e.life / 60) * Math.max(0, 1 - e.life / e.max);
      ctx.globalAlpha = Math.max(0, fade) * 0.9;
      const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 4);
      g.addColorStop(0, `hsla(${e.hue}, 100%, 62%, 0.95)`);
      g.addColorStop(1, `hsla(${e.hue}, 100%, 50%, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * 4, 0, Math.PI * 2);
      ctx.fill();
      if (e.y < -20 || e.life > e.max) {
        Object.assign(e, newEmber(false));
      }
    }

    // bats
    if (!prefersReduced) {
      batTimer -= dt;
      if (batTimer <= 0) {
        spawnBat();
        batTimer = 5 + Math.random() * 7;
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
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    draw(dt);
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(loop);
}
