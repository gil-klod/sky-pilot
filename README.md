# Sky Pilot

A browser-based flight simulator built with Three.js. Fly a prop plane, collect golden rings, and land on the runway.

Good starting point for kids who already play realistic sims — simplified physics with pitch, roll, yaw, throttle, stall warning, and a basic HUD.

## Quick start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## Controls

| Key | Action |
|-----|--------|
| W / S | Pitch up / down |
| A / D | Roll left / right |
| Q / E | Rudder (yaw) left / right |
| Shift / Ctrl | Throttle up / down |
| Space | Brakes (on ground) |
| C | Toggle chase / cockpit camera |
| R | Reset flight |

## Gameplay

- Take off from the runway and follow the golden rings north
- Each ring is worth 100 points
- Watch the HUD: airspeed (knots), altitude (feet AGL), heading, throttle
- Stall warning appears below ~27 kts — add power and lower the nose
- Land gently: keep speed under ~43 kts and wings level

## Ideas for later

- Multiple aircraft (jet, helicopter, glider)
- Weather (wind, rain, clouds you can fly through)
- Mission waypoints and autopilot
- Multiplayer or shared high scores
- Port to Godot or a desktop app for more realism

## Build for production

```bash
npm run build
npm run preview
```

Static files land in `dist/` — host anywhere.
