const SVGNS = "http://www.w3.org/2000/svg";

/* ---- cobwebs: generated quarter-webs tucked into the corners ---- */
function webPath(size, spokes, rings) {
  const maxA = Math.PI / 2;
  const angs = [];
  for (let i = 0; i <= spokes; i++) angs.push((maxA * i) / spokes);

  let d = "";
  for (const a of angs) {
    d += `M0 0L${(Math.cos(a) * size).toFixed(1)} ${(Math.sin(a) * size).toFixed(1)}`;
  }
  for (let r = 1; r <= rings; r++) {
    const rad = (size * r) / rings;
    const pts = angs.map((a) => [Math.cos(a) * rad, Math.sin(a) * rad]);
    d += `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const cx = (((x0 + x1) / 2) * 0.8).toFixed(1);
      const cy = (((y0 + y1) / 2) * 0.8).toFixed(1);
      d += `Q${cx} ${cy} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    }
  }
  return d;
}

function buildWebs(host) {
  if (!host) return;
  const corners = ["tl", "tr", "bl"];
  for (const corner of corners) {
    const size = 190 + Math.random() * 90;
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    svg.setAttribute("class", `web web--${corner}`);
    svg.setAttribute("aria-hidden", "true");
    svg.style.width = size + "px";
    svg.style.height = size + "px";
    const path = document.createElementNS(SVGNS, "path");
    path.setAttribute("d", webPath(size, 6, 5));
    svg.appendChild(path);
    host.appendChild(svg);
  }
}

/* ---- spiders: crawl the whole screen, scurry away from pointers/taps ---- */
export function initSpiders() {
  buildWebs(document.getElementById("webs"));

  const canvas = document.getElementById("spiders");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let w = 0;
  let h = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pointer = { x: -9999, y: -9999, active: false };
  let startleAt = -9999;
  const spiders = [];

  function resize() {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function makeSpider(anywhere) {
    const size = 6 + Math.random() * 6;
    return {
      x: anywhere ? Math.random() * w : Math.random() * w,
      y: Math.random() * h,
      angle: Math.random() * Math.PI * 2,
      speed: 8 + Math.random() * 8,
      turn: (Math.random() - 0.5) * 0.5,
      legPhase: Math.random() * Math.PI * 2,
      size,
      fleeUntil: 0,
      dirTimer: Math.random() * 3,
      alpha: 0.35 + Math.random() * 0.35,
    };
  }

  function seed() {
    spiders.length = 0;
    const n = Math.max(3, Math.min(7, Math.round(w / 340)));
    for (let i = 0; i < n; i++) spiders.push(makeSpider(true));
  }

  function setPointer(x, y) {
    pointer.x = x;
    pointer.y = y;
    pointer.active = true;
  }

  window.addEventListener("pointermove", (e) => setPointer(e.clientX, e.clientY), { passive: true });
  window.addEventListener("pointerdown", (e) => {
    setPointer(e.clientX, e.clientY);
    startleAt = performance.now();
  }, { passive: true });
  window.addEventListener("touchmove", (e) => {
    const t = e.touches[0];
    if (t) setPointer(t.clientX, t.clientY);
  }, { passive: true });
  window.addEventListener("pointerleave", () => (pointer.active = false));

  function step(dt, now) {
    for (const s of spiders) {
      s.dirTimer -= dt;
      if (s.dirTimer <= 0) {
        s.turn = (Math.random() - 0.5) * 0.9;
        s.dirTimer = 1 + Math.random() * 3;
      }
      s.angle += s.turn * dt;

      const dx = s.x - pointer.x;
      const dy = s.y - pointer.y;
      const dist = Math.hypot(dx, dy) || 1;
      const near = pointer.active && dist < 130;
      const startled = now - startleAt < 850 && dist < 280;

      let target = 12; // calm crawl
      if (near || startled) s.fleeUntil = now + 950;
      if (now < s.fleeUntil) {
        s.angle = Math.atan2(dy, dx); // run directly away
        target = 300;
      }

      s.speed += (target - s.speed) * Math.min(1, dt * 6);
      s.x += Math.cos(s.angle) * s.speed * dt;
      s.y += Math.sin(s.angle) * s.speed * dt;

      if (s.x < -24) s.x = w + 24;
      else if (s.x > w + 24) s.x = -24;
      if (s.y < -24) s.y = h + 24;
      else if (s.y > h + 24) s.y = -24;

      s.legPhase += dt * (s.speed > 70 ? 24 : 9);
    }
  }

  function drawSpider(s) {
    const sz = s.size;
    ctx.save();
    ctx.globalAlpha = s.alpha;
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle + Math.PI / 2);

    ctx.strokeStyle = "rgba(190, 170, 225, 0.8)";
    ctx.lineWidth = 1.3;
    ctx.lineCap = "round";
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 4; i++) {
        const baseY = -sz * 0.55 + i * sz * 0.42;
        const swing = Math.sin(s.legPhase + i * 1.1 + (side > 0 ? 0 : Math.PI)) * 0.3;
        const kx = side * sz * (1.0 + swing);
        const ky = baseY - sz * 0.5;
        const fx = side * sz * (1.75 + swing * 0.6);
        const fy = baseY + sz * 0.95;
        ctx.beginPath();
        ctx.moveTo(0, baseY);
        ctx.quadraticCurveTo(kx, ky, fx, fy);
        ctx.stroke();
      }
    }

    ctx.fillStyle = "#170e21";
    ctx.strokeStyle = "rgba(200, 180, 230, 0.55)";
    ctx.beginPath();
    ctx.ellipse(0, sz * 0.55, sz * 0.55, sz * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -sz * 0.45, sz * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 90, 90, 0.9)";
    ctx.beginPath();
    ctx.arc(-sz * 0.15, -sz * 0.6, sz * 0.09, 0, Math.PI * 2);
    ctx.arc(sz * 0.15, -sz * 0.6, sz * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, w, h);
    step(dt, now);
    for (const s of spiders) drawSpider(s);
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", resize);
  resize();

  if (reduced) {
    ctx.clearRect(0, 0, w, h);
    for (const s of spiders) drawSpider(s);
  } else {
    requestAnimationFrame(loop);
  }
}
