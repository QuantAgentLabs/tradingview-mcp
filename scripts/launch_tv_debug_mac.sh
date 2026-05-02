#!/bin/bash
# Launch TradingView Desktop on macOS with Chrome DevTools Protocol enabled
# Usage: ./scripts/launch_tv_debug_mac.sh [port]

PORT="${1:-9222}"

check_cdp() {
  curl -s "http://localhost:$PORT/json/version"
}

is_tradingview_cdp() {
  check_cdp | grep -qi "TradingView\|TVDesktop"
}

# Auto-detect TradingView install location
APP=""
LOCATIONS=(
  "/Applications/TradingView.app/Contents/MacOS/TradingView"
  "$HOME/Applications/TradingView.app/Contents/MacOS/TradingView"
)

for loc in "${LOCATIONS[@]}"; do
  if [ -f "$loc" ]; then
    APP="$loc"
    break
  fi
done

# Fallback: search with mdfind (Spotlight)
if [ -z "$APP" ]; then
  APP=$(mdfind "kMDItemCFBundleIdentifier == 'com.niceincontact.TradingView'" 2>/dev/null | head -1)
  if [ -n "$APP" ]; then
    APP="$APP/Contents/MacOS/TradingView"
  fi
fi

# Fallback: find any TradingView.app
if [ -z "$APP" ] || [ ! -f "$APP" ]; then
  APP=$(find /Applications "$HOME/Applications" -name "TradingView.app" -maxdepth 2 2>/dev/null | head -1)
  if [ -n "$APP" ]; then
    APP="$APP/Contents/MacOS/TradingView"
  fi
fi

if [ -z "$APP" ] || [ ! -f "$APP" ]; then
  echo "Error: TradingView not found."
  echo "Checked: /Applications/TradingView.app, ~/Applications/TradingView.app"
  echo ""
  echo "If installed elsewhere, run manually:"
  echo "  /path/to/TradingView.app/Contents/MacOS/TradingView --remote-debugging-port=$PORT"
  exit 1
fi

# If CDP is already live for TradingView, do not relaunch.
if is_tradingview_cdp; then
  echo "TradingView CDP is already running at http://localhost:$PORT"
  check_cdp | python3 -m json.tool 2>/dev/null || check_cdp
  exit 0
fi

# If some other process owns the port, stop before launching.
if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Error: port $PORT is already in use by a non-TradingView process."
  echo "Resolve that process or choose another port."
  exit 1
fi

# If TradingView is already open but without CDP, restart it once cleanly.
if pgrep -f "TradingView" >/dev/null 2>&1; then
  echo "TradingView is already open without CDP on port $PORT. Restarting it once..."
  osascript -e 'tell application "TradingView" to quit' >/dev/null 2>&1 || pkill -f "TradingView" 2>/dev/null
  sleep 2
fi

echo "Found TradingView at: $APP"
echo "Launching with --remote-debugging-port=$PORT ..."
"$APP" --remote-debugging-port=$PORT &
TV_PID=$!
echo "PID: $TV_PID"

# Wait for CDP to be ready
echo "Waiting for CDP..."
for i in $(seq 1 15); do
  if check_cdp > /dev/null 2>&1; then
    echo "CDP ready at http://localhost:$PORT"
    check_cdp | python3 -m json.tool 2>/dev/null || check_cdp
    exit 0
  fi
  sleep 1
done

echo "Warning: CDP not responding after 15s. TradingView may still be loading."
echo "Check manually: curl http://localhost:$PORT/json/version"
