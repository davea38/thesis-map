#!/usr/bin/env bash
# ============================================================
# RALPH Loop - The Engine
# ============================================================
# Usage:
#   ./loop.sh plan        Run planning mode (analyzes specs, creates task list)
#   ./loop.sh build       Run building mode (implements one task per loop)
#   ./loop.sh build 10    Run building mode, max 10 iterations
# ============================================================

set -euo pipefail

MODE="${1:-build}"
MAX_ITERATIONS="${2:-0}"
COUNT=0

if [[ "$MODE" != "plan" && "$MODE" != "build" ]]; then
  echo "Usage: ./loop.sh [plan|build] [max_iterations]"
  exit 1
fi

PROMPT_FILE="PROMPT_${MODE}.md"

if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "Error: $PROMPT_FILE not found"
  exit 1
fi

echo "=== RALPH Loop ==="
echo "Mode: $MODE"
echo "Prompt: $PROMPT_FILE"
if [[ "$MAX_ITERATIONS" -gt 0 ]]; then
  echo "Max iterations: $MAX_ITERATIONS"
fi
echo "==================="
echo ""

while true; do
  COUNT=$((COUNT + 1))
  echo ""
  echo "--- Iteration $COUNT ---"
  echo ""

  # Feed the prompt to Claude and let it work
  cat "$PROMPT_FILE" | claude -p --verbose

  # Check iteration limit
  if [[ "$MAX_ITERATIONS" -gt 0 && "$COUNT" -ge "$MAX_ITERATIONS" ]]; then
    echo ""
    echo "=== Reached max iterations ($MAX_ITERATIONS). Stopping. ==="
    break
  fi

  echo ""
  echo "--- Iteration $COUNT complete. Starting next... ---"
done
