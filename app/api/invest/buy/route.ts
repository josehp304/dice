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

    const { symbol, amount } = await req.json(); // amount is dollars to invest
    
    if (!symbol || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(authUser.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (user.balance < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const price = await getStockPrice(symbol);
    if (!price) {
      return NextResponse.json({ error: 'Could not fetch stock price or rate limit exceeded' }, { status: 400 });
    }

    const sharesToBuy = amount / price;

    // Deduct balance
    user.balance -= amount;

    // Add to portfolio
    const existingAsset = user.portfolio.find(p => p.symbol === symbol);
    if (existingAsset) {
      const totalCost = (existingAsset.shares * existingAsset.averagePrice) + amount;
      existingAsset.shares += sharesToBuy;
      existingAsset.averagePrice = totalCost / existingAsset.shares;
    } else {
      user.portfolio.push({
        symbol,
        shares: sharesToBuy,
        averagePrice: price
      });
    }

    await user.save();

    return NextResponse.json({ 
      message: 'Buy successful', 
      balance: user.balance,
      portfolio: user.portfolio 
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}