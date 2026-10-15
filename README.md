# 🎃 The Pumpkin Codex

A **haunted, animated skill tree** for a JavaScript project — built with plain
HTML, CSS and vanilla JS (ES modules). No build step, no dependencies.

![theme](https://img.shields.io/badge/theme-Halloween-ff7a18) ![made with](https://img.shields.io/badge/made%20with-vanilla%20JS-f7df1e)

## ✨ Features

- 🕸️ **Interactive skill tree** — unlock nodes by spending skill points, gated by prerequisites.
- 🎃 **Halloween theme** — glowing embers, drifting fog, twinkling stars and flapping bats on a live `<canvas>`.
- ⚡ **Working animations** — floating nodes, pulsing "ready" states, animated connection flows, unlock bursts, screen shake on denied unlocks.
- 🔊 **Spooky sound effects** generated with the Web Audio API (mute toggle included).
- 📈 **XP + leveling** — every unlock grants XP; leveling up refunds more skill points.
- 💾 **Auto-save** to `localStorage`, plus a Reset button.
- 📱 **Responsive** and honors `prefers-reduced-motion`.

## 🚀 Run locally

Any static server works (ES modules need HTTP, not `file://`):

```bash
npm start
# or
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## 🌐 Deploy

Pushing to `main` triggers the GitHub Actions workflow in
`.github/workflows/deploy.yml` and publishes to **GitHub Pages**.

> Make sure **Settings → Pages → Build and deployment → Source** is set to
> **GitHub Actions**.

## 🧠 How to play

1. Start with **10 skill points**.
2. Unlock nodes whose prerequisites are met by clicking them.
3. Earn XP → level up → gain more points.
4. Reach the **Pumpkin King** 🎃 to beat the tree.
5. Click **Reset** to respec.

## 🗂️ Structure

```
├── index.html
├── css/style.css
├── js/
│   ├── app.js         # state, rendering, interactions
│   ├── data.js        # the skill tree definition (edit me!)
│   ├── background.js  # canvas embers / fog / bats
│   └── audio.js       # Web Audio sound effects
└── .github/workflows/deploy.yml
```

Want your own tree? Just tweak `js/data.js` — add nodes with `x`/`y`
(percentages), `cost`, `icon`, `desc` and `requires`.
