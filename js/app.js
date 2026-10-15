import { TREE, EDGES } from "./data.js";
import { sfx } from "./audio.js";
import { initBackground } from "./background.js";
import { initSpiders } from "./spiders.js";

const SAVE_KEY = "widows-web-v1";
const SVGNS = "http://www.w3.org/2000/svg";

const el = {
  nodes: document.getElementById("nodes"),
  svg: document.getElementById("lines"),
  tooltip: document.getElementById("tooltip"),
  points: document.getElementById("points"),
  level: document.getElementById("level"),
  xpText: document.getElementById("xpText"),
  xpFill: document.getElementById("xpFill"),
  unlockedCount: document.getElementById("unlockedCount"),
  toast: document.getElementById("toast"),
  burst: document.getElementById("burst"),
  resetBtn: document.getElementById("resetBtn"),
  soundBtn: document.getElementById("soundBtn"),
  subtitle: document.getElementById("subtitle"),
  stage: document.getElementById("stage"),
  levelup: document.getElementById("levelup"),
  luLevel: document.getElementById("luLevel"),
  luPoints: document.getElementById("luPoints"),
  detail: document.getElementById("detail"),
  detailCard: document.getElementById("detailCard"),
  detailIcon: document.getElementById("detailIcon"),
  detailTier: document.getElementById("detailTier"),
  detailName: document.getElementById("detailName"),
  detailDesc: document.getElementById("detailDesc"),
  detailMeta: document.getElementById("detailMeta"),
  detailReqs: document.getElementById("detailReqs"),
  detailClaim: document.getElementById("detailClaim"),
};

const nodeEls = new Map();
const lineEls = new Map();
const byId = new Map(TREE.nodes.map((n) => [n.id, n]));

let state = load() || {
  points: TREE.startPoints,
  xp: 0,
  level: 1,
  unlocked: [],
};

/* ---------------- persistence ---------------- */
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !Array.isArray(s.unlocked)) return null;
    const valid = s.unlocked.filter((id) => byId.has(id));
    return {
      points: Number(s.points) || 0,
      xp: Number(s.xp) || 0,
      level: Number(s.level) || 1,
      unlocked: valid,
    };
  } catch {
    return null;
  }
}

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

/* ---------------- helpers ---------------- */
const isUnlocked = (id) => state.unlocked.includes(id);
const xpNeeded = (lvl) => TREE.levelBase + (lvl - 1) * TREE.levelStep;
const prereqMet = (node) => node.requires.every(isUnlocked);
const canUnlock = (node) =>
  !isUnlocked(node.id) && prereqMet(node) && state.points >= node.cost;

/* ---------------- render tree ---------------- */
function buildNodes() {
  el.subtitle.textContent = TREE.subtitle;
  for (const n of TREE.nodes) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "node";
    btn.dataset.id = n.id;
    btn.style.left = n.x + "%";
    btn.style.top = n.y + "%";
    btn.style.animationDelay = (Math.random() * 4).toFixed(2) + "s";
    btn.setAttribute("aria-label", `${n.name} (cost ${n.cost})`);
    btn.innerHTML = `<span class="node__icon">${n.icon}</span><span class="node__cost">${n.cost}</span><span class="node__name">${n.name}</span>`;

    btn.addEventListener("click", () => openDetail(n));
    btn.addEventListener("mouseenter", () => {
      if (!("ontouchstart" in window)) sfx.hover();
      showTooltip(n, btn);
    });
    btn.addEventListener("mouseleave", hideTooltip);
    btn.addEventListener("focus", () => showTooltip(n, btn));
    btn.addEventListener("blur", hideTooltip);

    el.nodes.appendChild(btn);
    nodeEls.set(n.id, btn);
  }
}

function buildDefs() {
  const defs = document.createElementNS(SVGNS, "defs");
  defs.innerHTML =
    '<linearGradient id="gradLine" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#a855f7"/>' +
    '<stop offset="0.5" stop-color="#ff7a18"/>' +
    '<stop offset="1" stop-color="#ffb020"/></linearGradient>';
  el.svg.appendChild(defs);
}

function buildLines() {
  for (const e of EDGES) {
    const path = document.createElementNS(SVGNS, "path");
    path.dataset.from = e.from;
    path.dataset.to = e.to;
    el.svg.appendChild(path);
    lineEls.set(`${e.from}->${e.to}`, path);
  }
}

function drawLines() {
  const stageRect = el.stage.getBoundingClientRect();
  for (const e of EDGES) {
    const a = nodeEls.get(e.from).getBoundingClientRect();
    const b = nodeEls.get(e.to).getBoundingClientRect();
    const x1 = a.left - stageRect.left + a.width / 2;
    const y1 = a.top - stageRect.top + a.height / 2;
    const x2 = b.left - stageRect.left + b.width / 2;
    const y2 = b.top - stageRect.top + b.height / 2;
    const my = (y1 + y2) / 2;
    const path = lineEls.get(`${e.from}->${e.to}`);
    path.setAttribute("d", `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`);
  }
}

/* ---------------- state refresh ---------------- */
function update() {
  for (const n of TREE.nodes) {
    const node = nodeEls.get(n.id);
    node.classList.remove("node--locked", "node--ready", "node--unlocked");
    if (isUnlocked(n.id)) node.classList.add("node--unlocked");
    else if (canUnlock(n)) node.classList.add("node--ready");
    else node.classList.add("node--locked");
    node.classList.toggle("node--master", n.id === "master");
    node.setAttribute("aria-pressed", isUnlocked(n.id) ? "true" : "false");
  }

  for (const e of EDGES) {
    const path = lineEls.get(`${e.from}->${e.to}`);
    path.classList.remove("line--locked", "line--ready", "line--active");
    if (isUnlocked(e.to)) path.classList.add("line--active");
    else if (isUnlocked(e.from) && canUnlock(byId.get(e.to))) path.classList.add("line--ready");
    else path.classList.add("line--locked");
  }

  el.points.textContent = state.points;
  el.level.textContent = state.level;
  el.xpText.textContent = `${Math.floor(state.xp)} / ${xpNeeded(state.level)}`;
  el.xpFill.style.width = Math.min(100, (state.xp / xpNeeded(state.level)) * 100) + "%";
  el.unlockedCount.textContent = `${state.unlocked.length} / ${TREE.nodes.length}`;

  if (detailId) renderDetail();
}

/* ---------------- interactions ---------------- */
function readyCount() {
  return TREE.nodes.filter(canUnlock).length;
}

function attemptUnlock(n) {
  if (isUnlocked(n.id)) {
    toast(`${n.icon} ${n.name} is already awakened`);
    return;
  }
  if (!prereqMet(n)) {
    deny(n, "🔒 Locked — awaken its ancestors first");
    return;
  }
  if (state.points < n.cost) {
    const short = n.cost - state.points;
    deny(n, `⚠️ Need ${short} more skill point${short > 1 ? "s" : ""}`);
    return;
  }

  const readyBefore = readyCount();

  state.points -= n.cost;
  state.unlocked.push(n.id);
  const xpGain = n.cost * TREE.xpPerCost;
  state.xp += xpGain;

  const node = nodeEls.get(n.id);
  node.classList.add("node--pop");
  setTimeout(() => node.classList.remove("node--pop"), 520);

  const rect = node.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  burstAt(node);
  ringAt(cx, cy, false);
  floatText(cx, cy, `+${xpGain} XP`, "float-reward--xp");
  sfx.unlock();

  let levelsGained = 0;
  while (state.xp >= xpNeeded(state.level)) {
    state.xp -= xpNeeded(state.level);
    state.level += 1;
    state.points += TREE.pointsPerLevel;
    levelsGained += 1;
  }

  update();

  const newReady = Math.max(0, readyCount() - (readyBefore - 1));

  if (levelsGained > 0) {
    const pointsGained = levelsGained * TREE.pointsPerLevel;
    pulse(el.points);
    setTimeout(() => sfx.levelUp(), 170);
    showLevelUp(state.level, pointsGained);
    floatText(cx, cy - 26, `+${pointsGained} SP`, "float-reward--points");
    toast(`⬆️ LEVEL ${state.level} · +${pointsGained} skill points`);
  } else {
    let msg = `${n.icon} ${n.name} awakened · +${xpGain} XP`;
    if (newReady > 0) msg += ` · ⚡ ${newReady} new skill${newReady > 1 ? "s" : ""}`;
    toast(msg);
  }

  if (n.id === "overlord") {
    sfx.master();
    celebrate();
    setTimeout(() => toast("🕷️ TERRITORIAL OVERLORD. The whole map is caught in your web."), 900);
  }

  save();
}

function deny(n, msg) {
  const node = nodeEls.get(n.id);
  node.classList.add("node--shake");
  setTimeout(() => node.classList.remove("node--shake"), 420);
  sfx.deny();
  toast(msg, true);
}

/* ---------------- tooltip ---------------- */
function showTooltip(n, target) {
  const unlocked = isUnlocked(n.id);
  const met = prereqMet(n);
  const afford = state.points >= n.cost;

  let statusPill;
  if (unlocked) statusPill = '<span class="pill pill--ok">Unlocked</span>';
  else if (!met) statusPill = '<span class="pill pill--no">Locked</span>';
  else if (afford) statusPill = '<span class="pill pill--ok">Ready</span>';
  else statusPill = '<span class="pill pill--no">Need points</span>';

  const reqNames = n.requires.map((r) => byId.get(r).name).join(", ") || "None";

  el.tooltip.innerHTML = `
    <div class="tooltip__title">
      <span>${n.icon}</span><span>${n.name}</span>
      <span class="tier">Tier ${n.tier}</span>
    </div>
    <p class="tooltip__desc">${n.desc}</p>
    <div class="tooltip__meta">
      <span class="pill pill--cost">${n.cost} pt${n.cost > 1 ? "s" : ""}</span>
      ${statusPill}
      <span class="pill">Needs: ${reqNames}</span>
    </div>`;

  el.tooltip.classList.add("show");
  el.tooltip.setAttribute("aria-hidden", "false");

  const r = target.getBoundingClientRect();
  const tw = el.tooltip.offsetWidth;
  const th = el.tooltip.offsetHeight;
  let left = r.left + r.width / 2 - tw / 2;
  let top = r.top - th - 14;
  if (top < 10) top = r.bottom + 14;
  left = Math.max(10, Math.min(window.innerWidth - tw - 10, left));
  el.tooltip.style.left = left + "px";
  el.tooltip.style.top = top + "px";
}

function hideTooltip() {
  el.tooltip.classList.remove("show");
  el.tooltip.setAttribute("aria-hidden", "true");
}

/* ---------------- detail panel ---------------- */
let detailId = null;

function openDetail(n) {
  hideTooltip();
  detailId = n.id;
  renderDetail();
  el.detail.classList.add("show");
  el.detail.setAttribute("aria-hidden", "false");
  sfx.hover();
  (el.detailClaim.disabled ? el.detail.querySelector(".detail__close") : el.detailClaim).focus();
}

function closeDetail() {
  if (!detailId) return;
  const prev = nodeEls.get(detailId);
  detailId = null;
  el.detail.classList.remove("show");
  el.detail.setAttribute("aria-hidden", "true");
  prev?.focus();
}

function renderDetail() {
  const n = byId.get(detailId);
  if (!n) return;

  const unlocked = isUnlocked(n.id);
  const met = prereqMet(n);
  const afford = state.points >= n.cost;

  el.detailIcon.textContent = n.icon;
  el.detailTier.textContent = `Tier ${n.tier}`;
  el.detailName.textContent = n.name;
  el.detailDesc.textContent = n.desc;

  let status;
  if (unlocked) status = '<span class="pill pill--ok">Unlocked</span>';
  else if (!met) status = '<span class="pill pill--no">Locked</span>';
  else if (afford) status = '<span class="pill pill--ok">Ready</span>';
  else status = '<span class="pill pill--no">Need points</span>';
  el.detailMeta.innerHTML =
    `<span class="pill pill--cost">${n.cost} pt${n.cost > 1 ? "s" : ""}</span>` + status;

  const reqHtml = n.requires.length
    ? n.requires
        .map((rid) => {
          const r = byId.get(rid);
          const ok = isUnlocked(rid);
          return `<span class="req ${ok ? "req--ok" : "req--no"}">${
            ok ? "✓" : "✕"
          } ${r.name}</span>`;
        })
        .join("")
    : '<span class="req req--ok">✓ No prerequisites</span>';
  el.detailReqs.innerHTML =
    `<span class="reqs__label">Requires</span><div class="reqs__list">${reqHtml}</div>`;

  el.detailClaim.classList.toggle("detail__claim--done", unlocked);
  if (unlocked) {
    el.detailClaim.disabled = true;
    el.detailClaim.textContent = "Awakened ✓";
  } else {
    el.detailClaim.disabled = false;
    if (!met) el.detailClaim.textContent = "🔒 Prerequisites missing";
    else if (!afford)
      el.detailClaim.textContent = `Claim · need ${n.cost - state.points} more`;
    else el.detailClaim.textContent = `Claim · ${n.cost} pt${n.cost > 1 ? "s" : ""}`;
  }
}

function claimDetail() {
  const n = byId.get(detailId);
  if (!n || isUnlocked(n.id)) return;
  if (!canUnlock(n)) {
    el.detailCard.classList.add("detail__card--shake");
    setTimeout(() => el.detailCard.classList.remove("detail__card--shake"), 430);
    sfx.deny();
    if (!prereqMet(n)) toast("🔒 Locked — awaken its ancestors first", true);
    else {
      const short = n.cost - state.points;
      toast(`⚠️ Need ${short} more skill point${short > 1 ? "s" : ""}`, true);
    }
    return;
  }
  closeDetail();
  attemptUnlock(n);
}

el.detail.addEventListener("click", (e) => {
  if (e.target.closest("[data-close]")) closeDetail();
});
el.detailClaim.addEventListener("click", claimDetail);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && detailId) closeDetail();
});

/* ---------------- toast ---------------- */
let toastTimer = null;
function toast(msg, bad = false) {
  el.toast.textContent = msg;
  el.toast.classList.toggle("bad", bad);
  el.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove("show"), 2400);
}

function pulse(node) {
  node.style.transform = "scale(1.35)";
  setTimeout(() => (node.style.transform = ""), 220);
}

/* ---------------- particles ---------------- */
function spark(x, y, hue) {
  const s = document.createElement("i");
  s.className = "spark";
  const size = 4 + Math.random() * 8;
  const c = `hsl(${hue}, 100%, ${55 + Math.random() * 20}%)`;
  s.style.width = size + "px";
  s.style.height = size + "px";
  s.style.left = x + "px";
  s.style.top = y + "px";
  s.style.background = c;
  s.style.boxShadow = `0 0 ${size * 1.6}px ${c}`;
  el.burst.appendChild(s);

  const angle = Math.random() * Math.PI * 2;
  const dist = 40 + Math.random() * 130;
  const dx = Math.cos(angle) * dist;
  const dy = Math.sin(angle) * dist;
  const anim = s.animate(
    [
      { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0)`, opacity: 0 },
    ],
    { duration: 600 + Math.random() * 500, easing: "cubic-bezier(0.22,1,0.36,1)" }
  );
  anim.onfinish = () => s.remove();
}

function burstAt(nodeEl) {
  const r = nodeEl.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const hue = 18 + Math.random() * 30;
  for (let i = 0; i < 20; i++) spark(cx, cy, hue);
}

function ringAt(x, y, alt) {
  const ring = document.createElement("span");
  ring.className = "unlock-ring" + (alt ? " unlock-ring--alt" : "");
  ring.style.left = x + "px";
  ring.style.top = y + "px";
  el.burst.appendChild(ring);
  const anim = ring.animate(
    [
      { transform: "scale(0.2)", opacity: 0.95 },
      { transform: "scale(2.6)", opacity: 0 },
    ],
    { duration: 680, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
  );
  anim.onfinish = () => ring.remove();
}

function floatText(x, y, text, cls) {
  const span = document.createElement("span");
  span.className = "float-reward " + cls;
  span.textContent = text;
  span.style.left = x + "px";
  span.style.top = y + "px";
  el.burst.appendChild(span);
  const anim = span.animate(
    [
      { transform: "translate(-50%, -50%) scale(0.7)", opacity: 0 },
      { transform: "translate(-50%, -120%) scale(1.15)", opacity: 1, offset: 0.25 },
      { transform: "translate(-50%, -240%) scale(1)", opacity: 0 },
    ],
    { duration: 1150, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
  );
  anim.onfinish = () => span.remove();
}

/* ---------------- level up overlay ---------------- */
let levelupTimer = null;
function showLevelUp(level, points) {
  el.luLevel.textContent = level;
  el.luPoints.textContent = points;
  el.levelup.classList.remove("show");
  void el.levelup.offsetWidth; // force reflow to restart the animation
  el.levelup.classList.add("show");
  el.levelup.setAttribute("aria-hidden", "false");
  clearTimeout(levelupTimer);
  levelupTimer = setTimeout(() => {
    el.levelup.classList.remove("show");
    el.levelup.setAttribute("aria-hidden", "true");
  }, 2700);
}

function celebrate() {
  const hues = [20, 45, 280, 130, 330];
  let n = 0;
  const iv = setInterval(() => {
    for (let i = 0; i < 6; i++) {
      spark(
        Math.random() * window.innerWidth,
        Math.random() * window.innerHeight * 0.7,
        hues[(Math.random() * hues.length) | 0]
      );
    }
    if (++n > 14) clearInterval(iv);
  }, 120);
}

/* ---------------- reset / sound ---------------- */
el.resetBtn.addEventListener("click", () => {
  if (!confirm("Banish all progress and start fresh?")) return;
  state = { points: TREE.startPoints, xp: 0, level: 1, unlocked: [] };
  save();
  sfx.reset();
  update();
  toast("🌙 The codex has been reset");
});

el.soundBtn.addEventListener("click", () => {
  const on = sfx.toggle();
  el.soundBtn.textContent = on ? "🔊" : "🔇";
  el.soundBtn.setAttribute("aria-pressed", String(on));
  if (on) sfx.hover();
});

/* ---------------- boot ---------------- */
let lineRaf = 0;
function scheduleLines() {
  if (lineRaf) return;
  lineRaf = requestAnimationFrame(() => {
    lineRaf = 0;
    drawLines();
  });
}

function init() {
  initBackground();
  initSpiders();
  buildNodes();
  buildDefs();
  buildLines();
  update();
  requestAnimationFrame(drawLines);

  const ro = new ResizeObserver(scheduleLines);
  ro.observe(el.stage);
  window.addEventListener("resize", scheduleLines);
  document.fonts?.ready.then(scheduleLines);
}

init();
