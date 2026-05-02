# Setup Guide for Codex and MCP Clients

This file is a step-by-step guide for Codex, Codex MCP, or any MCP-capable LLM client to install and configure the TradingView MCP server. If a user asks you to install or set up this project, follow these steps exactly.

## Step 1: Clone and Install

```bash
git clone https://github.com/QuantAgentLabs/tradingview-mcp.git ~/tradingview-mcp
cd ~/tradingview-mcp
npm install
```

If the user specifies a different install path, use that instead of `~/tradingview-mcp`.

## Step 2: Add to Codex MCP

For Codex plugin installs, use the repo metadata:

- `.codex-plugin/plugin.json` describes the plugin and points Codex at the bundled skills.
- `.mcp.json` registers the local `tradingview` MCP server.
- `skills/` contains the Codex skills that explain common TradingView workflows.

For a manual MCP client setup, merge this server entry into the client's MCP configuration:

```json
{
  "mcpServers": {
    "tradingview": {
      "command": "node",
      "args": ["<INSTALL_PATH>/src/server.js"],
      "cwd": "<INSTALL_PATH>"
    }
  }
}
```

Replace `<INSTALL_PATH>` with the actual path where the repo was cloned (e.g., `/Users/username/tradingview-mcp`).

If the config file already exists and has other servers, merge the `tradingview` entry into the existing `mcpServers` object. Do not overwrite other servers.

## Step 3: Launch TradingView Desktop

TradingView Desktop must be running with Chrome DevTools Protocol enabled.

**Auto-detect and launch (recommended):**
After the MCP server is connected, use the `tv_launch` tool — it auto-detects TradingView on Mac, Windows, and Linux.

**Manual launch by platform:**

Mac:
```bash
/Applications/TradingView.app/Contents/MacOS/TradingView --remote-debugging-port=9222
```

Windows:
```bash
%LOCALAPPDATA%\TradingView\TradingView.exe --remote-debugging-port=9222
```

Linux:
```bash
/opt/TradingView/tradingview --remote-debugging-port=9222
# or: tradingview --remote-debugging-port=9222
```

## Step 4: Restart or Reload Codex

Most MCP clients load servers at startup or plugin reload time. After adding the config:

1. Restart or reload Codex/plugin configuration
2. Confirm the `tradingview` MCP server appears in the available tools
3. The tradingview MCP server should connect automatically

## Step 5: Verify Connection

Use the `tv_health_check` tool. Expected response:

```json
{
  "success": true,
  "cdp_connected": true,
  "chart_symbol": "...",
  "api_available": true
}
```

If `cdp_connected: false`, TradingView is not running with `--remote-debugging-port=9222`.

## Step 6: Install CLI (Optional)

To use the `tv` CLI command globally:

```bash
cd ~/tradingview-mcp
npm link
```

Then `tv status`, `tv quote`, `tv pine compile`, etc. work from anywhere.

## Docker Compose / OrbStack (Optional)

TradingView Desktop must still run on the host machine with CDP enabled:

```bash
./scripts/launch_tv_debug_mac.sh
```

Build the container:

```bash
npm run orb:build
```

Run CLI commands through Compose:

```bash
npm run orb:status
npm run orb:quote
npm run orb:tv -- screenshot -r chart
```

Run the MCP server over stdio:

```bash
npm run orb:mcp
```

Use `npm run orb:setup` to launch TradingView on macOS and build the container in one command.

The compose defaults use `TRADINGVIEW_CDP_HOST=host.docker.internal` and `TRADINGVIEW_CDP_PORT=9222`, which is the normal OrbStack path back to a service running on the Mac host.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `cdp_connected: false` | Launch TradingView with `--remote-debugging-port=9222` |
| `ECONNREFUSED` | TradingView isn't running or port 9222 is blocked |
| Compose cannot reach TradingView | Make sure TradingView was launched on the Mac host and `TRADINGVIEW_CDP_HOST=host.docker.internal` |
| MCP server not showing in Codex | Check `.mcp.json` syntax, restart or reload Codex/plugin configuration |
| `tv` command not found | Run `npm link` from the project directory |
| Tools return stale data | TradingView may still be loading — wait a few seconds |
| Pine Editor tools fail | Open the Pine Editor panel first (`ui_open_panel pine-editor open`) |

## What to Read Next

- `AGENTS.md` — Codex project instructions and tool decision tree
- `.codex-plugin/plugin.json` — Codex plugin description and integration metadata
- `.mcp.json` — MCP server configuration for Codex/plugin installs
- `README.md` — Full tool reference (78 MCP tools, 30 CLI commands)
- `RESEARCH.md` — Research context and open questions
