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
- `.mcp.json` registers the persistent OrbStack-backed `tradingview` MCP server over HTTP.
- `.mcp.local.json` registers the direct local Node server for development.
- `skills/` contains the Codex skills that explain common TradingView workflows.

For a manual MCP client setup, merge this server entry into the client's MCP configuration:

```json
{
  "mcpServers": {
    "tradingview": {
      "type": "http",
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

If the config file already exists and has other servers, merge the `tradingview` entry into the existing `mcpServers` object. Do not overwrite other servers.

### Codex Global Config Option

If the user wants TradingView available from any Codex thread, add it to the global Codex config instead:

File:

```bash
~/.codex/config.toml
```

Block to add:

```toml
[mcp_servers.tradingview]
url = "http://127.0.0.1:3000/mcp"
```

After adding it, fully restart Codex desktop.

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

## Step 4: Start the OrbStack MCP Service

From the repo root:

```bash
npm run tvSetup
```

This will:

1. Launch TradingView Desktop with CDP enabled on port `9222`
2. Build the OrbStack image
3. Start the persistent `tradingview-mcp` container
4. Verify the HTTP MCP service can reach TradingView

If you prefer the manual sequence:

```bash
npm run tvLaunch
npm run tvBuild
npm run tvUp
npm run tvStatus
```

## Step 5: Restart or Reload Codex

Most MCP clients load servers at startup or plugin reload time. After adding the config:

1. Restart or reload Codex/plugin configuration
2. Confirm the `tradingview` MCP server appears in the available tools
3. The tradingview MCP server should connect automatically
4. In Codex global settings, the server should appear under MCP servers

## Step 6: Verify Connection

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

Recommended first test prompt in Codex:

```text
Use tv_health_check and tell me if TradingView is connected.
```

## Step 7: Install CLI (Optional)

To use the `tv` CLI command globally:

```bash
cd ~/tradingview-mcp
npm link
```

Then `tv status`, `tv quote`, `tv pine compile`, etc. work from anywhere.

## Docker Compose / OrbStack

TradingView Desktop must still run on the host machine with CDP enabled. The MCP server itself runs as a persistent container in OrbStack and listens on `http://127.0.0.1:3000/mcp`.

Recommended one-command setup:

```bash
npm run tvSetup
```

Equivalent manual flow:

```bash
npm run tvLaunch
npm run tvBuild
npm run tvUp
npm run tvStatus
```

Useful management commands:

```bash
npm run tvUp
npm run tvDown
npm run tvStatus
```

The compose defaults use `TRADINGVIEW_CDP_HOST=0.250.250.254` and `TRADINGVIEW_CDP_PORT=9222`. `0.250.250.254` is OrbStack's host IP; it avoids TradingView Desktop's Electron CDP rejection of non-localhost hostnames such as `host.docker.internal`.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `cdp_connected: false` | Launch TradingView with `--remote-debugging-port=9222` |
| `ECONNREFUSED` | TradingView isn't running or port 9222 is blocked |
| Compose cannot reach TradingView | Make sure TradingView was launched on the Mac host and `TRADINGVIEW_CDP_HOST=0.250.250.254` |
| `npm run tvStatus` fails with connection refused on port 3000 | Start the persistent service with `npm run tvUp` |
| MCP server not showing in Codex | Check `.mcp.json` syntax, restart or reload Codex/plugin configuration |
| MCP server not showing in Codex global settings | Check `~/.codex/config.toml` contains `[mcp_servers.tradingview]` and fully restart Codex |
| `tv` command not found | Run `npm link` from the project directory |
| Tools return stale data | TradingView may still be loading — wait a few seconds |
| Pine Editor tools fail | Open the Pine Editor panel first (`ui_open_panel pine-editor open`) |

## What to Read Next

- `AGENTS.md` — Codex project instructions and tool decision tree
- `.codex-plugin/plugin.json` — Codex plugin description and integration metadata
- `.mcp.json` — MCP server configuration for Codex/plugin installs
- `README.md` — Full tool reference (78 MCP tools, 30 CLI commands)
- `RESEARCH.md` — Research context and open questions
