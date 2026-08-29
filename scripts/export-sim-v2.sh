#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GODOT="${GODOT:-$HOME/bin/godot}"
GODOT_PROJECT="${GODOT_PROJECT_V2:-$ROOT/../sky-pilot-godot-v2}"
OUT="$ROOT/sim/fly-v2"
ASSETS="$ROOT/sim/assets"

if [[ ! -x "$GODOT" ]]; then
  echo "Godot not found at $GODOT" >&2
  exit 1
fi

if [[ ! -f "$GODOT_PROJECT/project.godot" ]]; then
  echo "Godot V2 project not found at $GODOT_PROJECT" >&2
  exit 1
fi

mkdir -p "$OUT" "$ASSETS"
cp "$GODOT_PROJECT/assets/aircraft/b744.glb" "$ASSETS/"
cp "$GODOT_PROJECT/assets/aircraft/a380.glb" "$ASSETS/"

"$GODOT" --headless --path "$GODOT_PROJECT" \
  --export-release "Web" "$OUT/index.html"

echo "Exported V2 flight sim to $OUT"
echo "Hangar page: $ROOT/sim/v2/index.html"
echo "Classic (frozen) sim: $ROOT/sim/fly/"
