import { TREE, EDGES, CONFIG } from "./data.js";
import { sfx } from "./audio.js";
import { initBackground } from "./background.js";
import { initSpiders } from "./spiders.js";

const PROGRESS_KEY = "widows-web-progress-v1";
const OVERRIDES_KEY = "widows-web-challenges-v1";
const ADMIN_KEY = "widows-web-admin";
const SVGNS = "http://www.w3.org/2000/svg";

const el = {
  nodes: document.getElementById("nodes"),
  svg: document.getElementById("lines"),
  tooltip: document.getElementById("tooltip"),
  gold: document.getElementById("gold"),
  level: document.getElementById("level"),
  xpText: document.getElementById("xpText"),
  xpFill: document.getElementById("xpFill"),
  completedCount: document.getElementById("completedCount"),
  toast: document.getElementById("toast"),
  burst: document.getElementById("burst"),
  resetBtn: document.getElementById("resetBtn"),
  soundBtn: document.getElementById("soundBtn"),
  subtitle: document.getElementById("subtitle"),
  stage: document.getElementById("stage"),
  levelup: document.getElementById("levelup"),
  luLevel: document.getElementById("luLevel"),
  luGold: document.getElementById("luGold"),

  adminBtn: document.getElementById("adminBtn"),
  adminTools: document.getElementById("adminTools"),
  exportBtn: document.getElementById("exportBtn"),
  importInput: document.getElementById("importInput"),
  exitAdminBtn: document.getElementById("exitAdminBtn"),

  detail: document.getElementById("detail"),
  detailCard: document.getElementById("detailCard"),
  detailIcon: document.getElementById("detailIcon"),
  detailTier: document.getElementById("detailTier"),
  detailName: document.getElementById("detailName"),
  detailDesc: document.getElementById("detailDesc"),
  detailHow: document.getElementById("detailHow"),
  detailRewards: document.getElementById("detailRewards"),
  detailReqs: document.getElementById("detailReqs"),
  detailClaim: document.getElementById("detailClaim"),

  editor: document.getElementById("editor"),
  editHeading: document.getElementById("editHeading"),
  editIcon: document.getElementById("editIcon"),
  editIconPreview: document.getElementById("editIconPreview"),
  editName: document.getElementById("editName"),
  editDesc: document.getElementById("editDesc"),
  editHow: document.getElementById("editHow"),
  editGold: document.getElementById("editGold"),
  editXp: document.getElementById("editXp"),
  editRevert: document.getElementById("editRevert"),
  editSave: document.getElementById("editSave"),

  gate: document.getElementById("gate"),
  gateInput: document.getElementById("gateInput"),
  gateSubmit: document.getElementById("gateSubmit"),
};

/* ---------------- challenges (defaults + my edits) ---------------- */
const clone = (v) => JSON.parse(JSON.stringify(v));
const challenges = TREE.nodes.map(clone);
const byId = new Map(challenges.map((c) => [c.id, c]));
const nodeEls = new Map();
const lineEls = new Map();
let overrides = loadOverrides();

function loadOverrides() {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function applyOverrides() {
  for (const [id, o] of Object.entries(overrides)) {
    const c = byId.get(id);
    if (!c) continue;
    if (o.name != null) c.name = o.name;
    if (o.icon != null) c.icon = o.icon;
    if (o.desc != null) c.desc = o.desc;
    if (o.how != null) c.how = o.how;
    if (o.reward) c.reward = { gold: o.reward.gold, xp: o.reward.xp };
  }
}
applyOverrides();

function saveOverrides() {
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    /* ignore */
  }
}

/* ---------------- player progress ---------------- */
const DEFAULT_STATE = { gold: 0, xp: 0, level: 1, completed: [] };
let state = loadProgress() || clone(DEFAULT_STATE);

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !Array.isArray(s.completed)) return null;
    return {
      gold: Number(s.gold) || 0,
      xp: Number(s.xp) || 0,
      level: Math.max(1, Number(s.level) || 1),
      completed: s.completed.filter((id) => byId.has(id)),
    };
  } catch {
    return null;
  }
}

function saveProgress() {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

/* ---------------- admin ---------------- */
let admin = localStorage.getItem(ADMIN_KEY) === "1";

/* ---------------- helpers ---------------- */
const esc = (s) => {
  const d = document.createElement("div");
  d.textContent = String(s == null ? "" : s);
  return d.innerHTML;
};

function iconHTML(icon) {
  const t = String(icon == null ? "" : icon).trim();
  if (/^(https?:\/\/|data:image)/i.test(t)) {
    return `<img class="logo-img" src="${t.replace(/"/g, "&quot;")}" alt="" />`;
  }
  return esc(t);
}

const isCompleted = (id) => state.completed.includes(id);
const xpNeeded = (lvl) => CONFIG.levelXpBase + (lvl - 1) * CONFIG.levelXpStep;
const levelGold = (lvl) => CONFIG.levelGoldBase * (lvl - 1);
const prereqMet = (c) => c.requires.every(isCompleted);
const canComplete = (c) => !isCompleted(c.id) && prereqMet(c);

/* ---------------- render challenges ---------------- */
function buildNodes() {
  el.subtitle.textContent = TREE.subtitle;
  el.nodes.innerHTML = "";
  nodeEls.clear();
  for (const c of challenges) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "node";
    btn.dataset.id = c.id;
    btn.style.left = c.x + "%";
    btn.style.top = c.y + "%";
    btn.style.animationDelay = (Math.random() * 4).toFixed(2) + "s";
    btn.setAttribute("aria-label", `${c.name} (rewards ${c.reward.gold} gold)`);
    btn.innerHTML =
      `<span class="node__icon">${iconHTML(c.icon)}</span>` +
      `<span class="node__reward">💰${c.reward.gold}</span>` +
      `<span class="node__name">${esc(c.name)}</span>`;

    btn.addEventListener("click", () => (admin ? openEditor(c) : openDetail(c)));
    btn.addEventListener("mouseenter", () => {
      if (!("ontouchstart" in window)) sfx.hover();
      showTooltip(c, btn);
    });
    btn.addEventListener("mouseleave", hideTooltip);
    btn.addEventListener("focus", () => showTooltip(c, btn));
    btn.addEventListener("blur", hideTooltip);

    el.nodes.appendChild(btn);
    nodeEls.set(c.id, btn);
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
  el.svg.querySelectorAll("path").forEach((p) => p.remove());
  lineEls.clear();
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
    lineEls
      .get(`${e.from}->${e.to}`)
      .setAttribute("d", `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`);
  }
}

function renderNodes() {
  buildNodes();
  update();
  scheduleLines();
}

/* ---------------- state refresh ---------------- */
function update() {
  for (const c of challenges) {
    const node = nodeEls.get(c.id);
    if (!node) continue;
    node.classList.remove("node--locked", "node--ready", "node--unlocked");
    if (isCompleted(c.id)) node.classList.add("node--unlocked");
    else if (canComplete(c)) node.classList.add("node--ready");
    else node.classList.add("node--locked");
    node.classList.toggle("node--master", c.id === "overlord");
    node.setAttribute("aria-pressed", isCompleted(c.id) ? "true" : "false");
  }

  for (const e of EDGES) {
    const path = lineEls.get(`${e.from}->${e.to}`);
    if (!path) continue;
    path.classList.remove("line--locked", "line--ready", "line--active");
    if (isCompleted(e.to)) path.classList.add("line--active");
    else if (isCompleted(e.from) && canComplete(byId.get(e.to))) path.classList.add("line--ready");
    else path.classList.add("line--locked");
  }

  el.gold.textContent = state.gold.toLocaleString();
  el.level.textContent = state.level;
  el.xpText.textContent = `${Math.floor(state.xp)} / ${xpNeeded(state.level)}`;
  el.xpFill.style.width = Math.min(100, (state.xp / xpNeeded(state.level)) * 100) + "%";
  el.completedCount.textContent = `${state.completed.length} / ${challenges.length}`;

  el.adminBtn.classList.toggle("icon-btn--active", admin);
  el.adminTools.hidden = !admin;
  document.body.classList.toggle("admin", admin);

  if (detailId) renderDetail();
}

/* ---------------- interactions ---------------- */
function completeChallenge(c) {
  if (isCompleted(c.id)) {
    toast(`${c.name} is already completed`);
    return;
  }
  if (!prereqMet(c)) {
    deny(c, "🔒 Locked — complete its ancestors first");
    return;
  }

  const readyBefore = challenges.filter(canComplete).length;

  state.completed.push(c.id);
  state.gold += c.reward.gold;
  state.xp += c.reward.xp;

  const node = nodeEls.get(c.id);
  node.classList.add("node--pop");
  setTimeout(() => node.classList.remove("node--pop"), 520);

  const rect = node.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  burstAt(node);
  ringAt(cx, cy, false);
  floatText(cx, cy, `+${c.reward.gold} gold`, "float-reward--gold");
  sfx.unlock();

  let levelsGained = 0;
  let levelGoldTotal = 0;
  while (state.xp >= xpNeeded(state.level)) {
    state.xp -= xpNeeded(state.level);
    state.level += 1;
    const g = levelGold(state.level);
    state.gold += g;
    levelGoldTotal += g;
    levelsGained += 1;
  }

  update();

  const newReady = Math.max(0, challenges.filter(canComplete).length - (readyBefore - 1));

  if (levelsGained > 0) {
    pulse(el.gold);
    setTimeout(() => sfx.levelUp(), 170);
    showLevelUp(state.level, levelGoldTotal);
    floatText(cx, cy - 26, `+${levelGoldTotal} gold`, "float-reward--gold");
    toast(`⬆️ LEVEL ${state.level} · +${levelGoldTotal} gold bounty`);
  } else {
    let msg = `${c.name} complete · +${c.reward.gold} gold +${c.reward.xp} XP`;
    if (newReady > 0) msg += ` · ⚡ ${newReady} new challenge${newReady > 1 ? "s" : ""}`;
    toast(msg);
  }

  if (c.id === "overlord") {
    sfx.master();
    celebrate();
    setTimeout(() => toast("🕷️ TERRITORIAL OVERLORD. The whole map is caught in your web."), 900);
  }

  saveProgress();
}

function deny(c, msg) {
  const node = nodeEls.get(c.id);
  if (node) {
    node.classList.add("node--shake");
    setTimeout(() => node.classList.remove("node--shake"), 420);
  }
  sfx.deny();
  toast(msg, true);
}

/* ---------------- tooltip ---------------- */
function showTooltip(c, target) {
  const done = isCompleted(c.id);
  const met = prereqMet(c);

  let statusPill;
  if (done) statusPill = '<span class="pill pill--ok">Completed</span>';
  else if (!met) statusPill = '<span class="pill pill--no">Locked</span>';
  else statusPill = '<span class="pill pill--ok">Ready</span>';

  const reqNames = c.requires.map((r) => byId.get(r).name).join(", ") || "None";

  el.tooltip.innerHTML = `
    <div class="tooltip__title">
      <span>${iconHTML(c.icon)}</span><span>${esc(c.name)}</span>
      <span class="tier">Tier ${c.tier}</span>
    </div>
    <p class="tooltip__desc">${esc(c.desc)}</p>
    <div class="tooltip__meta">
      <span class="pill pill--gold">💰 ${c.reward.gold}</span>
      <span class="pill">✨ ${c.reward.xp} XP</span>
      ${statusPill}
      <span class="pill">Needs: ${esc(reqNames)}</span>
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

function openDetail(c) {
  hideTooltip();
  detailId = c.id;
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
  const c = byId.get(detailId);
  if (!c) return;

  const done = isCompleted(c.id);
  const met = prereqMet(c);

  el.detailIcon.innerHTML = iconHTML(c.icon);
  el.detailTier.textContent = `Tier ${c.tier}`;
  el.detailName.textContent = c.name;
  el.detailDesc.textContent = c.desc;
  el.detailHow.textContent = c.how || "—";

  el.detailRewards.innerHTML =
    `<span class="reward reward--gold">💰 +${c.reward.gold} gold</span>` +
    `<span class="reward reward--xp">✨ +${c.reward.xp} XP</span>`;

  const reqHtml = c.requires.length
    ? c.requires
        .map((rid) => {
          const r = byId.get(rid);
          const ok = isCompleted(rid);
          return `<span class="req ${ok ? "req--ok" : "req--no"}">${
            ok ? "✓" : "✕"
          } ${esc(r.name)}</span>`;
        })
        .join("")
    : '<span class="req req--ok">✓ No prerequisites</span>';
  el.detailReqs.innerHTML =
    `<span class="reqs__label">Requires</span><div class="reqs__list">${reqHtml}</div>`;

  el.detailClaim.classList.toggle("detail__claim--done", done);
  if (done) {
    el.detailClaim.disabled = true;
    el.detailClaim.textContent = "Completed ✓";
  } else {
    el.detailClaim.disabled = false;
    if (!met) el.detailClaim.textContent = "🔒 Prerequisites missing";
    else el.detailClaim.textContent = `Complete · +${c.reward.gold} gold`;
  }
}

function claimDetail() {
  const c = byId.get(detailId);
  if (!c || isCompleted(c.id)) return;
  if (!canComplete(c)) {
    el.detailCard.classList.add("detail__card--shake");
    setTimeout(() => el.detailCard.classList.remove("detail__card--shake"), 430);
    sfx.deny();
    toast("🔒 Locked — complete its ancestors first", true);
    return;
  }
  closeDetail();
  completeChallenge(c);
}

/* ---------------- admin: gate ---------------- */
function openGate() {
  if (admin) return;
  el.gateInput.value = "";
  el.gate.classList.add("show");
  el.gate.setAttribute("aria-hidden", "false");
  el.gateInput.focus();
}

function closeGate() {
  el.gate.classList.remove("show");
  el.gate.setAttribute("aria-hidden", "true");
}

function tryUnlockGate() {
  if (el.gateInput.value === CONFIG.adminCode) {
    setAdmin(true);
    closeGate();
    toast("⚙️ Edit mode on — click a challenge to edit it");
  } else {
    el.gate.querySelector(".detail__card").classList.add("detail__card--shake");
    setTimeout(() => el.gate.querySelector(".detail__card").classList.remove("detail__card--shake"), 430);
    sfx.deny();
    el.gateInput.select();
  }
}

function setAdmin(on) {
  admin = on;
  try {
    on ? localStorage.setItem(ADMIN_KEY, "1") : localStorage.removeItem(ADMIN_KEY);
  } catch {
    /* ignore */
  }
  update();
}

/* ---------------- admin: editor ---------------- */
let editId = null;

function openEditor(c) {
  hideTooltip();
  editId = c.id;
  el.editHeading.textContent = `Edit · ${c.name}`;
  el.editIcon.value = c.icon;
  el.editIconPreview.innerHTML = iconHTML(c.icon);
  el.editName.value = c.name;
  el.editDesc.value = c.desc || "";
  el.editHow.value = c.how || "";
  el.editGold.value = c.reward.gold;
  el.editXp.value = c.reward.xp;
  el.editor.classList.add("show");
  el.editor.setAttribute("aria-hidden", "false");
  el.editName.focus();
}

function closeEditor() {
  editId = null;
  el.editor.classList.remove("show");
  el.editor.setAttribute("aria-hidden", "true");
}

function saveEditor() {
  const c = byId.get(editId);
  if (!c) return;
  const patch = {
    name: el.editName.value.trim() || c.name,
    icon: el.editIcon.value.trim() || c.icon,
    desc: el.editDesc.value.trim(),
    how: el.editHow.value.trim(),
    reward: {
      gold: Math.max(0, Math.floor(Number(el.editGold.value) || 0)),
      xp: Math.max(0, Math.floor(Number(el.editXp.value) || 0)),
    },
  };
  overrides[c.id] = patch;
  Object.assign(c, patch);
  saveOverrides();
  closeEditor();
  renderNodes();
  if (detailId === c.id) renderDetail();
  toast(`✏️ ${c.name} updated`);
}

function revertEditor() {
  const c = byId.get(editId);
  if (!c) return;
  delete overrides[c.id];
  const base = TREE.nodes.find((n) => n.id === c.id);
  if (base) Object.assign(c, clone(base));
  saveOverrides();
  closeEditor();
  renderNodes();
  toast(`↩️ ${c.name} reverted to default`);
}

/* ---------------- admin: export / import ---------------- */
function exportData() {
  const tree = {
    title: TREE.title,
    subtitle: TREE.subtitle,
    nodes: challenges,
  };
  const text =
    `// The Widow's Web — exported ${new Date().toISOString()}\n` +
    `// Drop this file in as js/data.js and commit to publish your edits.\n` +
    `export const CONFIG = ${JSON.stringify(CONFIG, null, 2)};\n\n` +
    `export const TREE = ${JSON.stringify(tree, null, 2)};\n\n` +
    `export const EDGES = TREE.nodes.flatMap((n) =>\n` +
    `  n.requires.map((r) => ({ from: r, to: n.id }))\n` +
    `);\n`;

  const blob = new Blob([text], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "data.js";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast("⬇️ data.js exported — commit it to /js/data.js to publish");
}

function extractObject(text, name) {
  const m = new RegExp(name + "\\s*=").exec(text);
  if (!m) return null;
  const start = text.indexOf("{", m.index);
  if (start < 0) return null;
  let depth = 0;
  let end = -1;
  let inStr = false;
  let q = "";
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === "\\") i++;
      else if (ch === q) inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inStr = true;
      q = ch;
    } else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return null;
  return new Function("return (" + text.slice(start, end + 1) + ")")();
}

function parseImported(text) {
  const t = text.trim();
  if (t.startsWith("{")) {
    const o = JSON.parse(t);
    return { config: o.CONFIG || null, tree: o.nodes ? o : o.TREE || o };
  }
  return { config: extractObject(t, "CONFIG"), tree: extractObject(t, "TREE") };
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = parseImported(String(reader.result));
      const tree = parsed.tree;
      const nodes = tree && tree.nodes;
      if (!Array.isArray(nodes)) throw new Error("No challenges found");
      const cfg = parsed.config;
      if (cfg && typeof cfg === "object") {
        if (Number(cfg.levelXpBase) > 0) CONFIG.levelXpBase = Number(cfg.levelXpBase);
        if (Number(cfg.levelXpStep) >= 0) CONFIG.levelXpStep = Number(cfg.levelXpStep);
        if (Number(cfg.levelGoldBase) >= 0) CONFIG.levelGoldBase = Number(cfg.levelGoldBase);
      }
      for (const n of nodes) {
        if (!n || !byId.has(n.id)) continue;
        overrides[n.id] = {
          name: n.name,
          icon: n.icon,
          desc: n.desc,
          how: n.how,
          reward: { gold: n.reward?.gold ?? 0, xp: n.reward?.xp ?? 0 },
        };
      }
      saveOverrides();
      for (const c of challenges) {
        const o = overrides[c.id];
        if (o) Object.assign(c, { ...o, reward: { ...o.reward } });
      }
      renderNodes();
      update();
      toast("📥 Challenges imported");
    } catch (err) {
      toast("⚠️ Could not read that file", true);
    } finally {
      el.importInput.value = "";
    }
  };
  reader.readAsText(file);
}

/* ---------------- toast ---------------- */
let toastTimer = null;
function toast(msg, bad = false) {
  el.toast.textContent = msg;
  el.toast.classList.toggle("bad", bad);
  el.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove("show"), 2600);
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
  const hue = 42 + Math.random() * 20;
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
function showLevelUp(level, gold) {
  el.luLevel.textContent = level;
  el.luGold.textContent = gold;
  el.levelup.classList.remove("show");
  void el.levelup.offsetWidth;
  el.levelup.classList.add("show");
  el.levelup.setAttribute("aria-hidden", "false");
  clearTimeout(levelupTimer);
  levelupTimer = setTimeout(() => {
    el.levelup.classList.remove("show");
    el.levelup.setAttribute("aria-hidden", "true");
  }, 2700);
}

function celebrate() {
  const hues = [42, 20, 45, 280, 330];
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

/* ---------------- wiring ---------------- */
el.resetBtn.addEventListener("click", () => {
  if (!confirm("Banish all progress and start fresh?")) return;
  state = clone(DEFAULT_STATE);
  saveProgress();
  sfx.reset();
  update();
  toast("🌙 Progress reset");
});

el.soundBtn.addEventListener("click", () => {
  const on = sfx.toggle();
  el.soundBtn.textContent = on ? "🔊" : "🔇";
  el.soundBtn.setAttribute("aria-pressed", String(on));
  if (on) sfx.hover();
});

el.adminBtn.addEventListener("click", () => (admin ? setAdmin(false) : openGate()));
el.exitAdminBtn.addEventListener("click", () => setAdmin(false));
el.exportBtn.addEventListener("click", exportData);
el.importInput.addEventListener("change", (e) => {
  const f = e.target.files && e.target.files[0];
  if (f) importData(f);
});

el.gateSubmit.addEventListener("click", tryUnlockGate);
el.gateInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") tryUnlockGate();
});

el.detail.addEventListener("click", (e) => {
  if (e.target.closest("[data-close]")) closeDetail();
});
el.detailClaim.addEventListener("click", claimDetail);

el.editor.addEventListener("click", (e) => {
  if (e.target.closest("[data-editor-close]")) closeEditor();
});
el.editIcon.addEventListener("input", () => {
  el.editIconPreview.innerHTML = iconHTML(el.editIcon.value);
});
el.editSave.addEventListener("click", saveEditor);
el.editRevert.addEventListener("click", revertEditor);

el.gate.addEventListener("click", (e) => {
  if (e.target.closest("[data-gate-close]")) closeGate();
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (editId) closeEditor();
  else if (detailId) closeDetail();
  else if (el.gate.classList.contains("show")) closeGate();
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
