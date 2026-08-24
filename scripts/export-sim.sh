#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GODOT="${GODOT:-$HOME/bin/godot}"
GODOT_PROJECT="${GODOT_PROJECT:-$ROOT/../sky-pilot-godot}"
OUT="$ROOT/sim"

if [[ ! -x "$GODOT" ]]; then
  echo "Godot not found at $GODOT" >&2
  exit 1
fi

if [[ ! -f "$GODOT_PROJECT/project.godot" ]]; then
  echo "Godot project not found at $GODOT_PROJECT" >&2
  exit 1
fi

mkdir -p "$OUT"
"$GODOT" --headless --path "$GODOT_PROJECT" \
  --export-release "Web" "$OUT/index.html"

echo "Exported airliner sim to $OUT"
