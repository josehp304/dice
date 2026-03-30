import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';

const ALPACA_API_KEY = process.env.ALPACA_API_KEY || '';
const ALPACA_API_SECRET = process.env.ALPACA_API_SECRET || '';

const getHeaders = () => ({
  'APCA-API-KEY-ID': ALPACA_API_KEY,
  'APCA-API-SECRET-KEY': ALPACA_API_SECRET,
  'Accept': 'application/json'
});

async function getAlpacaPrice(symbol: string): Promise<number | null> {
  let formattedSymbol = symbol.toUpperCase();
  const isCrypto = formattedSymbol.includes('/') || formattedSymbol.includes('-') || (formattedSymbol.length > 3 && formattedSymbol.endsWith('USD'));
  
  if (isCrypto) {
    formattedSymbol = formattedSymbol.replace('-', '/');
    if (!formattedSymbol.includes('/')) formattedSymbol = formattedSymbol.replace('USD', '/USD');
  }

  const url = isCrypto 
    ? `https://data.alpaca.markets/v1beta3/crypto/us/latest/quotes?symbols=${formattedSymbol}`
    : `https://data.alpaca.markets/v2/stocks/quotes/latest?symbols=${formattedSymbol}`;

  const res = await fetch(url, { headers: getHeaders(), cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  const quotes = data.quotes || {};
  const quote = quotes[formattedSymbol] || quotes[formattedSymbol.replace('/', '')];
  if (quote && (quote.ap || quote.bp || quote.c)) {
    return quote.ap || quote.bp || quote.c;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let { symbol, sharesToSell } = await req.json();
    
    if (!symbol || !sharesToSell || sharesToSell <= 0) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    symbol = symbol.toUpperCase();
    
    // normalise to stored symbol style
    const isCrypto = symbol.includes('/') || symbol.includes('-') || (symbol.length > 3 && symbol.endsWith('USD'));
    if (isCrypto) {
      symbol = symbol.replace('-', '/');
      if (!symbol.includes('/')) symbol = symbol.replace('USD', '/USD');
    }

    await connectDB();
    const user = await User.findById(authUser.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const assetItemIndex = user.portfolio.findIndex(p => p.symbol === symbol);
    if (assetItemIndex === -1) {
      return NextResponse.json({ error: 'Asset not found in portfolio' }, { status: 400 });
    }

    const assetItem = user.portfolio[assetItemIndex];
    if (assetItem.shares < sharesToSell) {
      return NextResponse.json({ error: 'Not enough shares to sell' }, { status: 400 });
    }

    const price = await getAlpacaPrice(symbol);
    if (!price) {
      return NextResponse.json({ error: 'Could not fetch price from Alpaca' }, { status: 400 });
    }

    const valueEarned = sharesToSell * price;
    user.balance += valueEarned;

    assetItem.shares -= sharesToSell;
    if (assetItem.shares < 0.0001) {
      user.portfolio.splice(assetItemIndex, 1);
    }

    user.markModified('portfolio');
    await user.save();

    return NextResponse.json({ 
      message: 'Sell successful', 
      balance: user.balance,
      portfolio: user.portfolio 
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
