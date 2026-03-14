import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Question from '@/models/Question';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const question = await Question.findById(id);
    if (!question) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ question });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { id } = await params;
    const { outcome } = await req.json();

    const question = await Question.findById(id);
    if (!question) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (question.createdBy.toString() !== authUser.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (question.status === 'resolved') {
      return NextResponse.json({ error: 'Already resolved' }, { status: 400 });
    }

    question.outcome = outcome;
    question.status = 'resolved';

    // Settle all bets: winners get paid out proportionally
    const winnerSide = outcome;
    const totalWinnerAmount = winnerSide === 'yes' ? question.totalYesAmount : question.totalNoAmount;
    const totalPool = question.totalYesAmount + question.totalNoAmount;

    // Import User model here to update balances
    const User = (await import('@/models/User')).default;

    for (const bet of question.bets) {
      bet.settled = true;
      if (bet.side === winnerSide && totalWinnerAmount > 0) {
        // Parimutuel payout: proportional share of total pool (with 5% house cut)
        const share = bet.amount / totalWinnerAmount;
        bet.payout = share * totalPool * 0.95;
        // Update user balance
        await User.findByIdAndUpdate(bet.userId, { $inc: { balance: bet.payout } });
      } else {
        bet.payout = 0;
      }
    }

    await question.save();
    return NextResponse.json({ question });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
