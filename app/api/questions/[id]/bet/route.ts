import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Question from '@/models/Question';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { id } = await params;
    const { side, amount } = await req.json();

    if (!side || !amount || !['yes', 'no'].includes(side)) {
      return NextResponse.json({ error: 'Invalid bet data' }, { status: 400 });
    }
    if (amount < 1) {
      return NextResponse.json({ error: 'Minimum bet is 1' }, { status: 400 });
    }

    const question = await Question.findById(id);
    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    if (question.status !== 'open') {
      return NextResponse.json({ error: 'Betting is closed for this question' }, { status: 400 });
    }
    if (question.expiresAt < new Date()) {
      question.status = 'closed';
      await question.save();
      return NextResponse.json({ error: 'This question has expired' }, { status: 400 });
    }

    const user = await User.findById(authUser.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (user.balance < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Calculate current odds BEFORE adding this bet
    const totalPool = question.totalYesAmount + question.totalNoAmount + amount;
    const sideAmount = (side === 'yes' ? question.totalYesAmount : question.totalNoAmount) + amount;
    const prob = sideAmount / totalPool;
    const odds = Math.max(1.01, (1 / prob) * 0.95);
    const potentialReturn = amount * odds;

    // Deduct from user balance
    user.balance -= amount;
    await user.save();

    // Add bet
    question.bets.push({
      userId: user._id,
      username: user.username,
      side,
      amount,
      potentialReturn,
      odds,
      settled: false,
      payout: 0,
      placedAt: new Date(),
    });

    if (side === 'yes') {
      question.totalYesBets += 1;
      question.totalYesAmount += amount;
    } else {
      question.totalNoBets += 1;
      question.totalNoAmount += amount;
    }

    await question.save();

    return NextResponse.json({
      message: 'Bet placed successfully',
      bet: { side, amount, odds, potentialReturn },
      newBalance: user.balance,
      question: {
        totalYesAmount: question.totalYesAmount,
        totalNoAmount: question.totalNoAmount,
        totalYesBets: question.totalYesBets,
        totalNoBets: question.totalNoBets,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
