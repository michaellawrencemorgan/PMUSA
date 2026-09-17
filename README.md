# HOSE 31 — Camarillo Tutorial 0

Pixel-art live-fire training game. Sixty-second lane at the Camarillo Airport Live Fire Training Complex.

G-31 California experiment for PrayerMapUSA. This repo is the **game**, not the prayermapusa.com site.

Built with Phaser 3, React, TanStack Start, Vite, and Tailwind.

## Play locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (port 8080). Requires Node 22+.

## Controls

| Input | Action |
|---|---|
| WASD or arrow keys | Move |
| Space, click, or tap | Stream water |
| Hydrant on the right | Refill the tank |
| Tap **START LANE** | Begin the round |

Knock down sparks and embers before the lane clock hits zero. Run dry and the hydrant is your only refill.

## Project layout

```
src/game/                  Phaser game
  Hose31Game.ts            384×256 pixel-art canvas
  scenes/Boot.ts           boot
  scenes/Preload.ts        sprites + map
  scenes/Play.ts           round, hose, hydrant, win/fail
  hud.ts                   React overlay state
  input.ts                 keyboard + pointer + on-screen pad
  bridge.ts                Phaser ↔ overlay
src/components/
  GameView.tsx             mounts Phaser
  GameOverlay.tsx          HUD, title, win/fail, touch controls
public/game/               runtime sprites and yard map
assets/                    source sprite sheets
```

## Design notes

- Design resolution is 384×256, pixel art, FIT scale.
- Round is 60 seconds. Tank starts at 70%. Hydrant is on the right edge.
- Psalms 1–56 / desk / vault / 7s content are not in this package.

## Keep going

1. More Camarillo lanes (Class A / Class B / engine props are already placed).
2. Ember split behavior and spark HP already live in `src/game/scenes/Play.ts`.
3. Touch pad is in `GameOverlay.tsx`.

Have fun. Open the gates.
