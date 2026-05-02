import { register } from '../router.js';
import * as core from '../../core/data.js';
import { getTickerNews } from '../../core/news.js';
import { screenerScan } from '../../core/screener.js';

register('quote', {
  description: 'Get real-time price quote',
  handler: (opts, positionals) => core.getQuote({ symbol: positionals[0] }),
});

register('news', {
  description: 'Get ticker-specific news headlines for the current chart or a provided ticker',
  options: {
    limit: { type: 'string', short: 'n', description: 'Max headlines to return (default 10, max 25)' },
  },
  handler: (opts, positionals) => getTickerNews({
    symbol: positionals[0],
    limit: opts.limit ? Number(opts.limit) : undefined,
  }),
});

register('signal', {
  description: 'Get a compact trading signal snapshot (quote, price action, volume, indicators, news)',
  options: {
    headlines: { type: 'string', short: 'n', description: 'How many news headlines to include (default 5)' },
  },
  handler: (opts) => core.getSignalSnapshot({
    headline_limit: opts.headlines ? Number(opts.headlines) : undefined,
  }),
});

register('screener', {
  description: 'Scan TradingView screeners for stocks, ETFs, crypto, forex, futures, or indices',
  options: {
    market: { type: 'string', short: 'm', description: 'Market preset: stock, etf, crypto, forex, futures, index, america, global, cfd' },
    asset: { type: 'string', short: 'a', description: 'Optional asset class override: stock, etf, crypto, forex, futures, index' },
    query: { type: 'string', short: 'q', description: 'Search keyword to narrow the universe' },
    tickers: { type: 'string', short: 't', description: 'Comma-separated or JSON array of tickers to hydrate' },
    exchange: { type: 'string', short: 'e', description: 'Exchange filter for query lookup' },
    sort: { type: 'string', short: 's', description: 'Sort by: symbol, price, change_pct, change_abs, volume, market_cap' },
    order: { type: 'string', short: 'o', description: 'Sort order: asc or desc' },
    limit: { type: 'string', short: 'n', description: 'Max rows to return (default 20, max 100)' },
    minPrice: { type: 'string', description: 'Minimum last price' },
    maxPrice: { type: 'string', description: 'Maximum last price' },
    minVolume: { type: 'string', description: 'Minimum volume' },
    minChangePct: { type: 'string', description: 'Minimum daily % change' },
    maxChangePct: { type: 'string', description: 'Maximum daily % change' },
  },
  handler: (opts) => screenerScan({
    market: opts.market,
    asset_type: opts.asset,
    query: opts.query,
    tickers: opts.tickers,
    exchange: opts.exchange,
    sort_by: opts.sort,
    sort_order: opts.order,
    limit: opts.limit ? Number(opts.limit) : undefined,
    min_price: opts.minPrice ? Number(opts.minPrice) : undefined,
    max_price: opts.maxPrice ? Number(opts.maxPrice) : undefined,
    min_volume: opts.minVolume ? Number(opts.minVolume) : undefined,
    min_change_pct: opts.minChangePct ? Number(opts.minChangePct) : undefined,
    max_change_pct: opts.maxChangePct ? Number(opts.maxChangePct) : undefined,
  }),
});

register('ohlcv', {
  description: 'Get OHLCV bar data',
  options: {
    count: { type: 'string', short: 'n', description: 'Number of bars (default 100, max 500)' },
    summary: { type: 'boolean', short: 's', description: 'Return summary stats instead of all bars' },
  },
  handler: (opts) => core.getOhlcv({
    count: opts.count ? Number(opts.count) : undefined,
    summary: opts.summary,
  }),
});

register('values', {
  description: 'Get current indicator values from data window',
  handler: () => core.getStudyValues(),
});

register('data', {
  description: 'Advanced data tools (lines, labels, tables, boxes, strategy, trades, equity, depth)',
  subcommands: new Map([
    ['lines', {
      description: 'Get Pine Script line.new() price levels',
      options: {
        filter: { type: 'string', short: 'f', description: 'Filter by study name substring' },
        verbose: { type: 'boolean', short: 'v', description: 'Include raw line data' },
      },
      handler: (opts) => core.getPineLines({ study_filter: opts.filter, verbose: opts.verbose }),
    }],
    ['labels', {
      description: 'Get Pine Script label.new() annotations',
      options: {
        filter: { type: 'string', short: 'f', description: 'Filter by study name substring' },
        max: { type: 'string', short: 'n', description: 'Max labels per study (default 50)' },
        verbose: { type: 'boolean', short: 'v', description: 'Include raw label data' },
      },
      handler: (opts) => core.getPineLabels({ study_filter: opts.filter, max_labels: opts.max ? Number(opts.max) : undefined, verbose: opts.verbose }),
    }],
    ['tables', {
      description: 'Get Pine Script table.new() data',
      options: {
        filter: { type: 'string', short: 'f', description: 'Filter by study name substring' },
      },
      handler: (opts) => core.getPineTables({ study_filter: opts.filter }),
    }],
    ['boxes', {
      description: 'Get Pine Script box.new() price zones',
      options: {
        filter: { type: 'string', short: 'f', description: 'Filter by study name substring' },
        verbose: { type: 'boolean', short: 'v', description: 'Include raw box data' },
      },
      handler: (opts) => core.getPineBoxes({ study_filter: opts.filter, verbose: opts.verbose }),
    }],
    ['strategy', {
      description: 'Get strategy performance metrics',
      handler: () => core.getStrategyResults(),
    }],
    ['trades', {
      description: 'Get strategy trade list',
      options: {
        max: { type: 'string', short: 'n', description: 'Max trades to return' },
      },
      handler: (opts) => core.getTrades({ max_trades: opts.max ? Number(opts.max) : undefined }),
    }],
    ['equity', {
      description: 'Get strategy equity curve',
      handler: () => core.getEquity(),
    }],
    ['depth', {
      description: 'Get order book / DOM data',
      handler: () => core.getDepth(),
    }],
    ['indicator', {
      description: 'Get indicator info and inputs by entity ID',
      handler: (opts, positionals) => {
        if (!positionals[0]) throw new Error('Entity ID required. Usage: tv data indicator eFu1Ot');
        return core.getIndicator({ entity_id: positionals[0] });
      },
    }],
  ]),
});
