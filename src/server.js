import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { registerHealthTools } from './tools/health.js';
import { registerChartTools } from './tools/chart.js';
import { registerPineTools } from './tools/pine.js';
import { registerDataTools } from './tools/data.js';
import { registerCaptureTools } from './tools/capture.js';
import { registerDrawingTools } from './tools/drawing.js';
import { registerAlertTools } from './tools/alerts.js';
import { registerBatchTools } from './tools/batch.js';
import { registerReplayTools } from './tools/replay.js';
import { registerIndicatorTools } from './tools/indicators.js';
import { registerWatchlistTools } from './tools/watchlist.js';
import { registerUiTools } from './tools/ui.js';
import { registerPaneTools } from './tools/pane.js';
import { registerTabTools } from './tools/tab.js';
import { healthCheck } from './core/health.js';

const SERVER_INFO = {
  name: 'tradingview',
  version: '2.0.0',
  description: 'Codex-ready TradingView chart analysis and Pine Script development via Chrome DevTools Protocol',
};

const SERVER_INSTRUCTIONS = `TradingView MCP — 81 tools for reading and controlling a live TradingView Desktop chart.

TOOL SELECTION GUIDE — use this to pick the right tool:

Reading your chart:
- chart_get_state → get symbol, timeframe, all indicator names + entity IDs (call first)
- data_get_study_values → get current numeric values from ALL visible indicators (RSI, MACD, BB, EMA, etc.)
- quote_get → get real-time price snapshot (last, OHLC, volume)
- news_get_ticker → get latest ticker-specific headlines with compact sentiment scoring
- signal_get_snapshot → combine quote, price action, volume, visible indicators, and headlines
- screener_scan → find lists of tickers across stocks, ETFs, crypto, forex, futures, and indices
- data_get_ohlcv → get price bars. ALWAYS pass summary=true unless you need individual bars

Reading custom Pine indicator output (line.new/label.new/table.new/box.new drawings):
- data_get_pine_lines → horizontal price levels from custom indicators (deduplicated, sorted)
- data_get_pine_labels → text annotations with prices ("PDH 24550", "Bias Long", etc.)
- data_get_pine_tables → table data as formatted rows (session stats, analytics dashboards)
- data_get_pine_boxes → price zones as {high, low} pairs
- ALWAYS pass study_filter to target a specific indicator by name (e.g., study_filter="Profiler")
- Indicators must be VISIBLE on chart for these to work

Changing the chart:
- chart_set_symbol, chart_set_timeframe, chart_set_type → change ticker/resolution/style
- chart_manage_indicator → add/remove studies. USE FULL NAMES: "Relative Strength Index" not "RSI"
- chart_scroll_to_date → jump to a date (ISO format)
- indicator_set_inputs → change indicator settings (length, source, etc.)

Pine Script development:
- pine_set_source → inject code, pine_smart_compile → compile + check errors
- pine_get_errors → read errors, pine_get_console → read log output
- WARNING: pine_get_source can return 200KB+ for complex scripts — avoid unless editing

Screenshots: capture_screenshot → regions: "full", "chart", "strategy_tester"
Replay: replay_start → replay_step → replay_trade → replay_status → replay_stop
Batch: batch_run → run action across multiple symbols/timeframes
Drawing: draw_shape → horizontal_line, trend_line, rectangle, text
Alerts: alert_create, alert_list, alert_delete
Launch: tv_launch → auto-detect and start TradingView with CDP on any platform
Panes: pane_list, pane_set_layout (s, 2h, 2v, 4, 6, 8), pane_focus, pane_set_symbol
Tabs: tab_list, tab_new, tab_close, tab_switch

CONTEXT MANAGEMENT:
- ALWAYS use summary=true on data_get_ohlcv
- ALWAYS use study_filter on pine tools when you know which indicator you want
- NEVER use verbose=true unless user specifically asks for raw data
- Prefer capture_screenshot for visual context over pulling large datasets
- Call chart_get_state ONCE at start, reuse entity IDs`;

function writeStartupNotice() {
  process.stderr.write('⚠  tradingview-mcp  |  Unofficial tool. Not affiliated with TradingView Inc.\n');
  process.stderr.write('   Ensure your usage complies with TradingView\'s Terms of Use.\n\n');
}

function createTradingViewServer() {
  const server = new McpServer(SERVER_INFO, {
    instructions: SERVER_INSTRUCTIONS,
  });

  registerHealthTools(server);
  registerChartTools(server);
  registerPineTools(server);
  registerDataTools(server);
  registerCaptureTools(server);
  registerDrawingTools(server);
  registerAlertTools(server);
  registerBatchTools(server);
  registerReplayTools(server);
  registerIndicatorTools(server);
  registerWatchlistTools(server);
  registerUiTools(server);
  registerPaneTools(server);
  registerTabTools(server);

  return server;
}

function getTransportMode() {
  const arg = process.argv.find((value) => value.startsWith('--transport='));
  if (arg) return arg.split('=')[1];
  return process.env.MCP_TRANSPORT || 'stdio';
}

function getHttpHost() {
  return process.env.MCP_HTTP_HOST || process.env.HOST || '0.0.0.0';
}

function getHttpPort() {
  return Number(process.env.MCP_HTTP_PORT || process.env.PORT || 3000);
}

function getAllowedHosts() {
  const raw = process.env.MCP_ALLOWED_HOSTS;
  if (!raw) return ['127.0.0.1', 'localhost', '[::1]'];
  return raw.split(',').map((value) => value.trim()).filter(Boolean);
}

async function startStdioServer() {
  writeStartupNotice();
  const server = createTradingViewServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function jsonRpcMethodNotAllowed(res) {
  res.status(405).json({
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message: 'Method not allowed.',
    },
    id: null,
  });
}

async function startHttpServer() {
  writeStartupNotice();

  const host = getHttpHost();
  const port = getHttpPort();
  const app = createMcpExpressApp({
    host,
    allowedHosts: getAllowedHosts(),
  });

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      name: SERVER_INFO.name,
      version: SERVER_INFO.version,
      transport: 'streamable-http',
      endpoint: '/mcp',
      ready: '/ready',
      health: '/health',
    });
  });

  app.get('/ready', (_req, res) => {
    res.json({
      success: true,
      name: SERVER_INFO.name,
      version: SERVER_INFO.version,
      transport: 'streamable-http',
      status: 'ready',
    });
  });

  app.get('/health', async (_req, res) => {
    try {
      const tradingView = await healthCheck();
      res.json({
        success: true,
        name: SERVER_INFO.name,
        version: SERVER_INFO.version,
        transport: 'streamable-http',
        tradingview: tradingView,
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        name: SERVER_INFO.name,
        version: SERVER_INFO.version,
        transport: 'streamable-http',
        error: error.message,
        hint: 'Launch TradingView Desktop with CDP enabled, then keep a chart open.',
      });
    }
  });

  app.post('/mcp', async (req, res) => {
    const server = createTradingViewServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    const closeResources = async () => {
      try {
        await transport.close();
      } catch {}

      try {
        await server.close();
      } catch {}
    };

    try {
      await server.connect(transport);
      res.on('close', () => {
        void closeResources();
      });
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      await closeResources();
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
            data: error.message,
          },
          id: null,
        });
      }
    }
  });

  app.get('/mcp', (_req, res) => {
    jsonRpcMethodNotAllowed(res);
  });

  app.delete('/mcp', (_req, res) => {
    jsonRpcMethodNotAllowed(res);
  });

  const listener = app.listen(port, host, () => {
    process.stderr.write(`tradingview-mcp http server listening on http://${host}:${port}/mcp\n`);
  });

  const shutdown = () => {
    listener.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

const mode = getTransportMode();

if (mode === 'http') {
  await startHttpServer();
} else {
  await startStdioServer();
}
