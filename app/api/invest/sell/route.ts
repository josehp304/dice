import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';

async function getStockPrice(symbol: string): Promise<number | null> {
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const quote = data['Global Quote'];
  if (quote && quote['05. price']) {
    return parseFloat(quote['05. price']);
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { symbol, sharesToSell } = await req.json(); // number of shares
    
    if (!symbol || !sharesToSell || sharesToSell <= 0) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
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

    const price = await getStockPrice(symbol);
    if (!price) {
      return NextResponse.json({ error: 'Could not fetch stock price or rate limit exceeded' }, { status: 400 });
    }

    const valueEarned = sharesToSell * price;

    // Add balance
    user.balance += valueEarned;

    // Deduct shares or completely remove if very close to 0 due to float math
    assetItem.shares -= sharesToSell;
    if (assetItem.shares < 0.0001) {
      user.portfolio.splice(assetItemIndex, 1);
    } // Mongoose arrays can use spice directly on the doc instance if typed correctly, or we pull and reassign

    // Since it's a mongoose DocumentArray it might require markModified
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