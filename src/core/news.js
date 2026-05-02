import { evaluate } from '../connection.js';

const NEWS_SOURCES = [
  {
    name: 'nasdaq',
    buildUrl: ({ ticker }) => `https://www.nasdaq.com/feed/rssoutbound?symbol=${encodeURIComponent(ticker)}`,
  },
  {
    name: 'yahoo_finance',
    buildUrl: ({ ticker }) => `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(ticker)}&region=US&lang=en-US`,
  },
];

const NEWS_SYMBOL_ALIASES = new Map([
  ['SP:SPX', 'SPY'],
  ['SPX', 'SPY'],
  ['NASDAQ:NDX', 'QQQ'],
  ['NDX', 'QQQ'],
  ['DJ:DJI', 'DIA'],
  ['DJI', 'DIA'],
  ['CBOE:VIX', 'VIXY'],
  ['RUSSELL:RUT', 'IWM'],
  ['RUT', 'IWM'],
]);

const POSITIVE_KEYWORDS = [
  'beat', 'beats', 'upgrade', 'upgrades', 'bullish', 'rally', 'surge', 'growth',
  'strong', 'record', 'expands', 'approval', 'buyback', 'breakout', 'profit',
];

const NEGATIVE_KEYWORDS = [
  'miss', 'misses', 'downgrade', 'downgrades', 'bearish', 'selloff', 'drop',
  'slump', 'weak', 'lawsuit', 'probe', 'cut', 'cuts', 'warning', 'recession',
  'inflation', 'tariff', 'risk',
];

function stripCdata(value = '') {
  return value.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
}

function decodeHtml(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(value = '') {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? stripTags(decodeHtml(stripCdata(match[1].trim()))) : '';
}

export function normalizeTicker(symbol = '') {
  const base = String(symbol).trim();
  if (!base) return '';
  const last = base.split(':').pop();
  return last.replace(/^=/, '').trim();
}

export function parseRss(xml, sourceName) {
  const channelTitle = extractTag(xml, 'title');
  const items = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map(match => {
    const block = match[0];
    return {
      title: extractTag(block, 'title'),
      link: extractTag(block, 'link'),
      published_at: extractTag(block, 'pubDate'),
      description: extractTag(block, 'description'),
      source: extractTag(block, 'source') || sourceName,
    };
  }).filter(item => item.title && item.link);

  return { channel_title: channelTitle, items };
}

export function scoreHeadlines(items = []) {
  let positive = 0;
  let negative = 0;

  for (const item of items) {
    const haystack = `${item.title || ''} ${item.description || ''}`.toLowerCase();
    for (const keyword of POSITIVE_KEYWORDS) {
      if (haystack.includes(keyword)) positive += 1;
    }
    for (const keyword of NEGATIVE_KEYWORDS) {
      if (haystack.includes(keyword)) negative += 1;
    }
  }

  const score = positive - negative;
  const bias = score > 1 ? 'positive' : score < -1 ? 'negative' : 'mixed';
  return { positive_hits: positive, negative_hits: negative, score, bias };
}

async function resolveSymbolAndTicker(symbol) {
  if (symbol) {
    return { symbol, ticker: NEWS_SYMBOL_ALIASES.get(symbol) || normalizeTicker(symbol) };
  }

  const current = await evaluate(`
    (function() {
      try {
        var chart = window.TradingViewApi._activeChartWidgetWV.value();
        var ext = {};
        try { ext = chart.symbolExt() || {}; } catch(e) {}
        return {
          symbol: chart.symbol(),
          type: ext.type || '',
          description: ext.description || '',
          exchange: ext.exchange || ''
        };
      } catch(e) {
        return { symbol: '', type: '', description: '', exchange: '' };
      }
    })()
  `);

  const currentSymbol = current?.symbol || '';
  return {
    symbol: currentSymbol,
    ticker: NEWS_SYMBOL_ALIASES.get(currentSymbol) || normalizeTicker(currentSymbol),
    type: current?.type || '',
    description: current?.description || '',
    exchange: current?.exchange || '',
  };
}

export async function getTickerNews({ symbol, limit, _deps } = {}) {
  const fetchImpl = _deps?.fetch || fetch;
  const maxItems = Math.min(Math.max(Number(limit || 10), 1), 25);
  const resolved = await resolveSymbolAndTicker(symbol);

  if (!resolved.ticker) {
    throw new Error('Could not determine ticker for news lookup.');
  }

  const errors = [];
  for (const source of NEWS_SOURCES) {
    try {
      const response = await fetchImpl(source.buildUrl(resolved), {
        headers: {
          'Accept': 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
          'User-Agent': 'tradingview-mcp/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const xml = await response.text();
      const parsed = parseRss(xml, source.name);
      const items = parsed.items.slice(0, maxItems);

      if (items.length === 0) {
        throw new Error('Feed returned no news items');
      }

      return {
        success: true,
        symbol: resolved.symbol || resolved.ticker,
        ticker: resolved.ticker,
        requested_symbol: resolved.symbol || resolved.ticker,
        news_symbol: resolved.ticker,
        source: source.name,
        channel_title: parsed.channel_title,
        headline_count: items.length,
        sentiment: scoreHeadlines(items),
        headlines: items,
      };
    } catch (error) {
      errors.push(`${source.name}: ${error.message}`);
    }
  }

  throw new Error(`Could not fetch ticker news for ${resolved.ticker}. Tried ${errors.join('; ')}`);
}
