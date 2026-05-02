import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getSignalSnapshot } from '../src/core/data.js';
import { getTickerNews, normalizeTicker, parseRss, scoreHeadlines } from '../src/core/news.js';

describe('news helpers', () => {
  it('normalizeTicker strips exchange prefix', () => {
    assert.equal(normalizeTicker('AMEX:SPY'), 'SPY');
    assert.equal(normalizeTicker('NASDAQ:AAPL'), 'AAPL');
    assert.equal(normalizeTicker('SPY'), 'SPY');
  });

  it('parseRss extracts items', () => {
    const xml = `<?xml version="1.0"?>
      <rss><channel>
      <title>Sample Feed</title>
      <item>
        <title><![CDATA[SPY rises on strong jobs data]]></title>
        <link>https://example.com/story-1</link>
        <pubDate>Fri, 02 May 2026 09:30:00 GMT</pubDate>
        <description><![CDATA[Markets rallied after jobs beat estimates.]]></description>
        <source>Example</source>
      </item>
      </channel></rss>`;
    const parsed = parseRss(xml, 'fallback');
    assert.equal(parsed.channel_title, 'Sample Feed');
    assert.equal(parsed.items.length, 1);
    assert.equal(parsed.items[0].title, 'SPY rises on strong jobs data');
    assert.equal(parsed.items[0].source, 'Example');
  });

  it('scoreHeadlines produces a directional bias', () => {
    const sentiment = scoreHeadlines([
      { title: 'Company beats estimates in strong quarter', description: '' },
      { title: 'Analyst upgrade points to breakout', description: '' },
      { title: 'Tariff risk remains a concern', description: '' },
    ]);
    assert.equal(sentiment.bias, 'positive');
    assert.ok(sentiment.score > 0);
  });

  it('getTickerNews falls back across sources', async () => {
    const rss = `<?xml version="1.0"?><rss><channel><title>Feed</title><item><title>Headline</title><link>https://example.com</link><pubDate>Today</pubDate><description>Desc</description></item></channel></rss>`;
    let calls = 0;
    const result = await getTickerNews({
      symbol: 'AMEX:SPY',
      limit: 5,
      _deps: {
        fetch: async () => {
          calls += 1;
          if (calls === 1) return { ok: false, status: 500, text: async () => '' };
          return { ok: true, text: async () => rss };
        },
      },
    });
    assert.equal(result.success, true);
    assert.equal(result.ticker, 'SPY');
    assert.equal(result.headline_count, 1);
    assert.equal(result.source, 'yahoo_finance');
  });
});

describe('signal snapshot', () => {
  it('builds a compact snapshot from bars and news', async () => {
    const baseTime = 1777600000;
    const bars = Array.from({ length: 30 }, (_, index) => ({
      time: baseTime + (index * 86400),
      open: 100 + index,
      high: 101 + index,
      low: 99 + index,
      close: 100.5 + index,
      volume: 1000 + (index * 10),
    }));

    const snapshot = await getSignalSnapshot({
      headline_limit: 3,
      _deps: {
        getOhlcv: async () => ({ success: true, bars }),
        getQuote: async () => ({ success: true, symbol: 'AMEX:SPY', time: bars.at(-1).time, open: bars.at(-1).open, high: bars.at(-1).high, low: bars.at(-1).low, close: bars.at(-1).close, last: bars.at(-1).close, volume: bars.at(-1).volume }),
        getStudyValues: async () => ({ success: true, indicators: [{ name: 'RSI', values: { RSI: 58.2 } }] }),
        getTickerNews: async () => ({
          success: true,
          source: 'yahoo_finance',
          sentiment: { positive_hits: 2, negative_hits: 0, score: 2, bias: 'positive' },
          headlines: [{ title: 'SPY upgrade sparks rally', link: 'https://example.com/1', published_at: 'Today', description: 'Strong momentum.', source: 'Example' }],
        }),
      },
    });

    assert.equal(snapshot.success, true);
    assert.ok(snapshot.price_action.sma20 > 0);
    assert.ok(snapshot.volume_context.avg_volume_20 > 0);
    assert.equal(snapshot.news_context.available, true);
  });
});
