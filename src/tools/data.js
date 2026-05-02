import { z } from 'zod';
import { jsonResult } from './_format.js';
import * as core from '../core/data.js';
import { getTickerNews } from '../core/news.js';
import { screenerScan } from '../core/screener.js';

export function registerDataTools(server) {
  server.tool('data_get_ohlcv', 'Get OHLCV bar data from the chart. Use summary=true for compact stats instead of all bars (saves context).', {
    count: z.coerce.number().optional().describe('Number of bars to retrieve (max 500, default 100)'),
    summary: z.coerce.boolean().optional().describe('Return summary stats (high, low, open, close, avg volume, range) instead of all bars — much smaller output'),
  }, async ({ count, summary }) => {
    try { return jsonResult(await core.getOhlcv({ count, summary })); }
    catch (err) { return jsonResult({ success: false, error: err.message }, true); }
  });

  server.tool('data_get_indicator', 'Get indicator/study info and input values', {
    entity_id: z.string().describe('Study entity ID (from chart_get_state)'),
  }, async ({ entity_id }) => {
    try { return jsonResult(await core.getIndicator({ entity_id })); }
    catch (err) { return jsonResult({ success: false, error: err.message }, true); }
  });

  server.tool('data_get_strategy_results', 'Get strategy performance metrics from Strategy Tester', {}, async () => {
    try { return jsonResult(await core.getStrategyResults()); }
    catch (err) { return jsonResult({ success: false, error: err.message }, true); }
  });

  server.tool('data_get_trades', 'Get trade list from Strategy Tester', {
    max_trades: z.coerce.number().optional().describe('Maximum trades to return'),
  }, async ({ max_trades }) => {
    try { return jsonResult(await core.getTrades({ max_trades })); }
    catch (err) { return jsonResult({ success: false, error: err.message }, true); }
  });

  server.tool('data_get_equity', 'Get equity curve data from Strategy Tester', {}, async () => {
    try { return jsonResult(await core.getEquity()); }
    catch (err) { return jsonResult({ success: false, error: err.message }, true); }
  });

  server.tool('quote_get', 'Get real-time quote data for a symbol (price, OHLC, volume)', {
    symbol: z.string().optional().describe('Symbol to quote (blank = current chart symbol)'),
  }, async ({ symbol }) => {
    try { return jsonResult(await core.getQuote({ symbol })); }
    catch (err) { return jsonResult({ success: false, error: err.message }, true); }
  });

  server.tool('news_get_ticker', 'Get the latest ticker-specific news headlines for the current chart symbol or a provided ticker. Useful for adding fresh fundamental context to a trading view.', {
    symbol: z.string().optional().describe('Ticker or TradingView symbol (blank = current chart symbol)'),
    limit: z.coerce.number().optional().describe('Max headlines to return (default 10, max 25)'),
  }, async ({ symbol, limit }) => {
    try { return jsonResult(await getTickerNews({ symbol, limit })); }
    catch (err) { return jsonResult({ success: false, error: err.message }, true); }
  });

  server.tool('signal_get_snapshot', 'Build a compact trading snapshot from the current chart: quote, price action, volume context, visible indicator values, and latest ticker news.', {
    headline_limit: z.coerce.number().optional().describe('How many news headlines to include (default 5)'),
  }, async ({ headline_limit }) => {
    try { return jsonResult(await core.getSignalSnapshot({ headline_limit })); }
    catch (err) { return jsonResult({ success: false, error: err.message }, true); }
  });

  server.tool('screener_scan', 'Scan TradingView market screeners for stocks, ETFs, crypto, forex, futures, or indices. Useful for finding lists of tickers by market type, exchange, liquidity, price, or daily change.', {
    market: z.string().optional().describe('Universe or market preset: stock, etf, crypto, forex, futures, index, america, global, or cfd'),
    asset_type: z.string().optional().describe('Optional asset class override: stock, etf, crypto, forex, futures, index'),
    query: z.string().optional().describe('Search keyword to narrow the universe before scanning (e.g., "bitcoin", "semiconductor", "gold")'),
    tickers: z.string().optional().describe('Comma-separated symbols or JSON array to hydrate specific tickers (e.g., "AAPL,MSFT,QQQ" or ["NASDAQ:AAPL","NASDAQ:MSFT"])'),
    exchange: z.string().optional().describe('Exchange filter for query-based lookup (e.g., NASDAQ, NYSE, BINANCE)'),
    sort_by: z.enum(['symbol', 'price', 'change_pct', 'change_abs', 'volume', 'market_cap']).optional().describe('Sort field'),
    sort_order: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
    limit: z.coerce.number().optional().describe('Max rows to return (default 20, max 100)'),
    min_price: z.coerce.number().optional().describe('Minimum last price'),
    max_price: z.coerce.number().optional().describe('Maximum last price'),
    min_volume: z.coerce.number().optional().describe('Minimum volume'),
    min_change_pct: z.coerce.number().optional().describe('Minimum daily % change'),
    max_change_pct: z.coerce.number().optional().describe('Maximum daily % change'),
  }, async (args) => {
    try { return jsonResult(await screenerScan(args)); }
    catch (err) { return jsonResult({ success: false, error: err.message }, true); }
  });

  server.tool('depth_get', 'Get order book / DOM (Depth of Market) data from the chart', {}, async () => {
    try { return jsonResult(await core.getDepth()); }
    catch (err) { return jsonResult({ success: false, error: err.message, hint: 'Open the DOM panel in TradingView before using this tool.' }, true); }
  });

  server.tool('data_get_pine_lines', 'Read horizontal price levels drawn by Pine Script indicators (line.new). Returns deduplicated price levels per study. Use study_filter to target a specific indicator.', {
    study_filter: z.string().optional().describe('Substring to match study name (e.g., "Profiler", "NY Levels"). Omit for all.'),
    verbose: z.coerce.boolean().optional().describe('Return raw line data with IDs, coordinates, colors (default false — returns only unique price levels)'),
  }, async ({ study_filter, verbose }) => {
    try { return jsonResult(await core.getPineLines({ study_filter, verbose })); }
    catch (err) { return jsonResult({ success: false, error: err.message }, true); }
  });

  server.tool('data_get_pine_labels', 'Read text labels drawn by Pine Script indicators (label.new). Returns text and price pairs. Use study_filter to target a specific indicator.', {
    study_filter: z.string().optional().describe('Substring to match study name. Omit for all.'),
    max_labels: z.coerce.number().optional().describe('Max labels per study (default 50). Set higher if you need all.'),
    verbose: z.coerce.boolean().optional().describe('Return raw label data with IDs, colors, positions (default false — returns only text + price)'),
  }, async ({ study_filter, max_labels, verbose }) => {
    try { return jsonResult(await core.getPineLabels({ study_filter, max_labels, verbose })); }
    catch (err) { return jsonResult({ success: false, error: err.message }, true); }
  });

  server.tool('data_get_pine_tables', 'Read table data drawn by Pine Script indicators (table.new). Returns formatted text rows per table. Use study_filter to target a specific indicator.', {
    study_filter: z.string().optional().describe('Substring to match study name. Omit for all.'),
  }, async ({ study_filter }) => {
    try { return jsonResult(await core.getPineTables({ study_filter })); }
    catch (err) { return jsonResult({ success: false, error: err.message }, true); }
  });

  server.tool('data_get_pine_boxes', 'Read box/zone boundaries drawn by Pine Script indicators (box.new). Returns deduplicated {high, low} price zones. Use study_filter to target a specific indicator.', {
    study_filter: z.string().optional().describe('Substring to match study name. Omit for all.'),
    verbose: z.coerce.boolean().optional().describe('Return all boxes with IDs and coordinates (default false — returns unique price zones)'),
  }, async ({ study_filter, verbose }) => {
    try { return jsonResult(await core.getPineBoxes({ study_filter, verbose })); }
    catch (err) { return jsonResult({ success: false, error: err.message }, true); }
  });

  server.tool('data_get_study_values', 'Get current indicator values from the data window for all visible studies (RSI, MACD, Bollinger Bands, EMAs, custom indicators with plot()).', {}, async () => {
    try { return jsonResult(await core.getStudyValues()); }
    catch (err) { return jsonResult({ success: false, error: err.message }, true); }
  });
}
