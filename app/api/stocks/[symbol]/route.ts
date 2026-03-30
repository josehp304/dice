import { NextRequest, NextResponse } from 'next/server';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';

// Simple in-memory cache to mitigate rate-limits for development
interface CacheEntry {
  timestamp: number;
  data: any;
}
const cache: Record<string, CacheEntry> = {};
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

export async function GET(req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  try {
    const p = await params;
    const symbol = p.symbol.toUpperCase();

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'quote'; // 'quote' or 'history'

    const cacheKey = `${symbol}-${type}`;
    const now = Date.now();

    if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_TTL) {
      return NextResponse.json(cache[cacheKey].data);
    }

    if (type === 'quote') {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data['Note'] || data['Information']) {
        // Rate limit reached or demo key restriction
        const errorMsg = data['Note'] || data['Information'];
        return NextResponse.json({ error: `Alpha Vantage API Error: ${errorMsg}` }, { status: 429 });
      }
      
      const quote = data['Global Quote'];
      if (!quote || Object.keys(quote).length === 0) {
        return NextResponse.json({ error: 'Stock not found or invalid response' }, { status: 404 });
      }

      const result = {
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: quote['10. change percent'],
        latestTradingDay: quote['07. latest trading day'],
        open: parseFloat(quote['02. open']),
        high: parseFloat(quote['03. high']),
        low: parseFloat(quote['04. low']),
        previousClose: parseFloat(quote['08. previous close']),
      };

      cache[cacheKey] = { timestamp: now, data: result };
      return NextResponse.json(result);
    } 
    else if (type === 'history') {
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data['Note'] || data['Information']) {
        const errorMsg = data['Note'] || data['Information'];
        return NextResponse.json({ error: `Alpha Vantage API Error: ${errorMsg}` }, { status: 429 });
      }

      const timeSeries = data['Time Series (Daily)'];
      if (!timeSeries) {
        return NextResponse.json({ error: 'Stock history not found' }, { status: 404 });
      }

      const history = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
        date,
        price: parseFloat(values['4. close']),
      })).slice(0, 30).reverse(); // Last 30 trading days

      const result = { symbol, history };
      cache[cacheKey] = { timestamp: now, data: result };
      return NextResponse.json(result);
    }
    
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}