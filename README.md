# Sky Pilot

Two flight games in one site — hosted together on Vercel.

| Game | URL path | Stack |
|------|----------|-------|
| **Hub** | `/` | Static landing page — pick a game |
| **Sky Rings** (arcade) | `/arcade/` | Three.js + Vite — rings, coins, prop/jet/helicopter |
| **747 & A380** (airliner sim) | `/sim/` | Godot 4 web export — real FR24 models |

Live site: **https://sky-pilot-alpha.vercel.app**

## Local development

```bash
npm install
npm run dev
```

- Hub: http://localhost:5173/
- Arcade: http://localhost:5173/arcade/
- Sim: run `npm run build && npm run preview`, then open `/sim/` (Godot WASM needs a production-style server)

## Production build

```bash
npm run build    # Vite arcade + copy sim/ → dist/
npm run preview  # test dist/ locally
```

## Updating the airliner sim

Edit the Godot project in `../sky-pilot-godot`, then re-export into this repo:

```bash
npm run export:sim   # requires ~/bin/godot
npm run build
```

Or manually copy `sky-pilot-godot/export/web/` → `sim/`.

## Deploy to Vercel

Connected to the `sky-pilot` Vercel project. Push to GitHub or:

```bash
npx vercel --prod
```

`vercel.json` sets the build command, WASM headers for `/sim/`, and clean URLs for both games.

## Arcade controls

| Key | Action |
|-----|--------|
| W / S | Pitch up / down |
| A / D | Roll left / right |
| Q / E | Rudder |
| Shift / Ctrl | Throttle |
| Space | Brakes (on ground) |
| 1 / 2 / 3 | Switch aircraft |
| M | Cycle missions |
| F | Autopilot |
| C | Chase / cockpit camera |
| H | Controls panel |
| R | Reset |

## Project layout

```
sky-pilot/
├── index.html          # Hub landing page
├── arcade/             # Browser arcade game (Three.js)
├── sim/                # Godot web export (747 & A380)
├── scripts/export-sim.sh
├── vercel.json
└── vite.config.js
```

Godot source project: `/home/gil/MyCode/sky-pilot-godot`

## Credits

Airliner 3D models © [Flightradar24](https://github.com/Flightradar24/fr24-3d-models) (GPLv2). See `CREDITS.md` in the Godot project.
