# 🕷️ The Widow's Web

A **haunted, animated challenge board for territorial.io** — built with plain
HTML, CSS and vanilla JS (ES modules). No build step, no dependencies.

![theme](https://img.shields.io/badge/theme-Halloween-8b5cf6) ![made with](https://img.shields.io/badge/made%20with-vanilla%20JS-f7df1e)

## ✨ Features

- 🕸️ **Interactive challenge tree** — click any challenge to open a **details panel** (logo, tier, description, **how to complete**, gold & XP rewards, prerequisites) and **Complete** it from there.
- 💰 **Gold + XP economy** — challenges are free to complete. Each one pays out gold and XP; XP levels you up and every new level pays a **gold bounty** (100 for the first level, 200 for the next, …). HUD tracks Gold, Level and Completed.
- 🏷️ **Every challenge is labelled** — its name sits right under its logo on the tree, and the gold reward floats on the badge.
- 🔐 **Overseer edit mode** — enter the passcode to unlock editing: change any challenge's **logo (emoji or image URL), name, description, how-to and gold/XP rewards**. Edits save instantly in your browser.
- ⬇️ **Export to publish** — hit Export to download an updated `data.js`, drop it in `/js/data.js` and commit; every visitor then sees your challenges. Import a saved file to restore.
- 🗺️ **territorial.io themed** — Land Grab, Blood Tithe, Ghost Fleet, Dread Fleet, Curse Bombs… all the way to **Territorial Overlord**.
- 🕷️ **Crawling spiders** — spiders wander the whole screen and **scurry away when you touch or move near them**; corner cobwebs sway in the corner of your eye.
- 🎃 **Halloween atmosphere** — glowing embers, drifting fog, twinkling stars and flapping bats on a live `<canvas>`.
- ⚡ **Smooth animations** — floating nodes, pulsing halos, animated connection flows, unlock rings, burst particles and floating reward text.
- 🔥 **Holy level-up sequence** — rotating god-rays, expanding rings and a giant **LEVEL n** burst with the gold bounty.
- 🔊 **Atmospheric sound** — reverb-drenched drones, tolling bells and dusty impacts via the Web Audio API.
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

## 🎮 How to play

1. Every challenge is **free** to complete (prerequisites still gate order).
2. Click a challenge, read **how to complete** it, then hit **Complete**.
3. Earn **gold + XP**; XP levels you up and each level pays a **gold bounty**.
4. Reach **Territorial Overlord** 👑 to finish the board.
5. Click **Reset** to wipe progress.

## 🔐 Editing challenges (Overseer mode)

1. Click the **⚙️** button and enter the passcode (default `widow-web`).
2. Click any challenge to open the editor and change its **logo, name,
   description, how-to, gold reward and XP reward**.
3. Changes save in your browser immediately. Use **Revert** to restore a
   challenge's defaults.
4. When happy, press **Export** to download `data.js`, replace `js/data.js`
   with it, and commit — now everyone sees your edits. **Import** restores a
   previously exported file.

> The passcode is checked in the browser, so it deters casual editing but is
> **not** real security. Change `CONFIG.adminCode` in `js/data.js`.

Level formulas live in `CONFIG` (`levelXpBase`, `levelXpStep`, `levelGoldBase`).

## 🗂️ Structure

```
├── index.html
├── css/style.css
├── js/
│   ├── app.js         # state, rendering, economy, edit mode
│   ├── data.js        # challenge definitions + CONFIG (edit me!)
│   ├── background.js  # canvas embers / fog / bats
│   ├── spiders.js     # cobwebs + interactive crawling spiders
│   └── audio.js       # Web Audio sound effects
└── .github/workflows/deploy.yml
```

Want your own board? Tweak `js/data.js` (or use edit mode). Each node needs
`x`/`y` (percentages), `icon`, `desc`, `how`, `reward: { gold, xp }` and
`requires`.
