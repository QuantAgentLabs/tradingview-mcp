import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { screenerScan, _test } from '../src/core/screener.js';

describe('screener helpers', () => {
  it('parses comma-separated ticker lists', () => {
    assert.deepEqual(_test.parseList('AAPL, MSFT, QQQ'), ['AAPL', 'MSFT', 'QQQ']);
  });

  it('normalizes ETF preset to america screener', () => {
    const preset = _test.normalizeMarket(undefined, 'etf');
    assert.equal(preset.screener, 'america');
    assert.deepEqual(preset.queryTypes, ['fund']);
  });

  it('formats screener rows', () => {
    const row = _test.formatRow({
      s: 'NASDAQ:AAPL',
      d: ['AAPL', 210.5, 1.2, 2.5, 100000, 1000, 'stock', 'common', 'Apple Inc.'],
    }, ['name', 'close', 'change', 'change_abs', 'volume', 'market_cap_basic', 'type', 'subtype', 'description']);
    assert.equal(row.ticker, 'NASDAQ:AAPL');
    assert.equal(row.symbol, 'AAPL');
    assert.equal(row.type, 'stock');
  });

  it('matches preset types when narrowing search results', () => {
    const preset = _test.normalizeMarket(undefined, 'etf');
    assert.equal(_test.matchesPreset({ type: 'fund' }, preset), true);
    assert.equal(_test.matchesPreset({ type: 'stock' }, preset), false);
  });
});

describe('screener scan', () => {
  it('scans a universe with filters', async () => {
    let request;
    const result = await screenerScan({
      market: 'crypto',
      sort_by: 'volume',
      limit: 2,
      min_change_pct: 1,
      _deps: {
        fetch: async (url, init) => {
          request = { url, init };
          return {
            ok: true,
            json: async () => ({
              totalCount: 2,
              data: [
                { s: 'BINANCE:BTCUSDT', d: ['BTCUSDT', 70000, 2.1, 1400, 123456, null, 'spot', 'crypto', 'Bitcoin / TetherUS'] },
                { s: 'BINANCE:ETHUSDT', d: ['ETHUSDT', 3500, 1.5, 52, 654321, null, 'spot', 'crypto', 'Ether / TetherUS'] },
              ],
            }),
          };
        },
      },
    });

    const body = JSON.parse(request.init.body);
    assert.equal(request.url, 'https://scanner.tradingview.com/crypto/scan');
    assert.equal(body.sort.sortBy, 'volume');
    assert.equal(result.row_count, 2);
    assert.equal(result.rows[0].ticker, 'BINANCE:BTCUSDT');
  });

  it('uses symbol search results when a query is provided', async () => {
    const result = await screenerScan({
      market: 'stock',
      query: 'apple',
      limit: 2,
      _deps: {
        symbolSearch: async () => ({
          results: [
            { full_name: 'NASDAQ:AAPL', symbol: 'AAPL', exchange: 'NASDAQ', type: 'stock' },
            { full_name: 'NASDAQ:AAPLW', symbol: 'AAPLW', exchange: 'NASDAQ', type: 'stock' },
          ],
        }),
        fetch: async () => ({
          ok: true,
          json: async () => ({
            totalCount: 1,
            data: [
              { s: 'NASDAQ:AAPL', d: ['AAPL', 200, 0.5, 1.0, 1000, 1000000, 'stock', 'common', 'Apple Inc.'] },
            ],
          }),
        }),
      },
    });

    assert.equal(result.success, true);
    assert.deepEqual(result.requested_tickers, ['NASDAQ:AAPL', 'NASDAQ:AAPLW']);
  });

  it('normalizes explicit tickers to screener symbols', async () => {
    const result = await screenerScan({
      market: 'stock',
      tickers: 'AAPL,MSFT',
      _deps: {
        symbolSearch: async ({ query }) => ({
          results: [
            { full_name: `NASDAQ:${query}`, symbol: query, exchange: 'NASDAQ', type: 'stock' },
          ],
        }),
        fetch: async () => ({
          ok: true,
          json: async () => ({
            totalCount: 2,
            data: [
              { s: 'NASDAQ:AAPL', d: ['AAPL', 200, 0.5, 1.0, 1000, 1000000, 'stock', 'common', 'Apple Inc.'] },
              { s: 'NASDAQ:MSFT', d: ['MSFT', 300, 0.2, 0.6, 2000, 2000000, 'stock', 'common', 'Microsoft Corp.'] },
            ],
          }),
        }),
      },
    });

    assert.deepEqual(result.requested_tickers, ['NASDAQ:AAPL', 'NASDAQ:MSFT']);
    assert.equal(result.row_count, 2);
  });
});
