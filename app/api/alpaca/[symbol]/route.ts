import { NextRequest, NextResponse } from 'next/server';

const ALPACA_API_KEY = process.env.ALPACA_API_KEY || '';
const ALPACA_API_SECRET = process.env.ALPACA_API_SECRET || '';

const getHeaders = () => ({
  'APCA-API-KEY-ID': ALPACA_API_KEY,
  'APCA-API-SECRET-KEY': ALPACA_API_SECRET,
  'Accept': 'application/json'
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  try {
    const p = await params;
    let symbol = p.symbol.toUpperCase();
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'quote'; // 'quote' or 'history'
    
    // Simple heuristic for crypto vs stock
    const isCrypto = symbol.includes('/') || symbol.includes('-') || (symbol.length > 3 && symbol.endsWith('USD'));
    
    if (isCrypto) {
      symbol = symbol.replace('-', '/');
      if (!symbol.includes('/')) {
        symbol = symbol.replace('USD', '/USD');
      }
    }

    if (type === 'quote') {
      let url = '';
      if (isCrypto) {
        url = `https://data.alpaca.markets/v1beta3/crypto/us/latest/quotes?symbols=${symbol}`;
      } else {
        url = `https://data.alpaca.markets/v2/stocks/quotes/latest?symbols=${symbol}`;
      }

      const res = await fetch(url, { headers: getHeaders(), cache: 'no-store' });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: `Alpaca Error: ${text}` }, { status: res.status });
      }

      const data = await res.json();
      const quotes = data.quotes || {};
      const quote = quotes[symbol] || quotes[symbol.replace('/', '')] || quotes[symbol.replace('/USD', 'USD')];

      if (!quote) {
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
      }

      // We typically get ask price (ap) and bid price (bp).
      const price = quote.ap || quote.bp || quote.c || 0;
      
      const result = {
        symbol: symbol,
        price: price,
        change: 0,
        changePercent: '0%',
        latestTradingDay: quote.t,
        open: price,
        high: price,
        low: price,
      };

      return NextResponse.json(result);
    } else if (type === 'history') {
      let url = '';
      const to = new Date();
      const from = new Date();
      from.setFullYear(from.getFullYear() - 1); // 1 year data

      const toStr = to.toISOString();
      const fromStr = from.toISOString();

      if (isCrypto) {
        url = `https://data.alpaca.markets/v1beta3/crypto/us/bars?symbols=${symbol}&timeframe=1Day&start=${fromStr}&end=${toStr}&limit=1000`;
      } else {
        url = `https://data.alpaca.markets/v2/stocks/bars?symbols=${symbol}&timeframe=1Day&feed=iex&start=${fromStr}&end=${toStr}&limit=1000`;
      }

      const res = await fetch(url, { headers: getHeaders(), cache: 'no-store' });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: `Alpaca Error: ${text}` }, { status: res.status });
      }

      const data = await res.json();
      const rawBars = data.bars && (data.bars[symbol] || data.bars[symbol.replace('/', '')]) ? (data.bars[symbol] || data.bars[symbol.replace('/', '')]) : [];

      const history = rawBars.map((b: any) => ({
        time: b.t.split('T')[0],
        open: b.o,
        high: b.h,
        low: b.l,
        close: b.c,
      }));

      // Sort chronological
      history.sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());

      return NextResponse.json({ symbol, history });
    }
    
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
