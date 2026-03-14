import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Question from '@/models/Question';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    // Find all questions where the user has placed a bet
    const questions = await Question.find({
      'bets.userId': authUser.userId,
    }).lean();

    // Extract just the user's bets from each question
    const myBets = questions.flatMap((q) => {
      const userBets = q.bets.filter((b) => b.userId.toString() === authUser.userId);
      return userBets.map((b) => ({
        ...b,
        questionId: q._id,
        questionTitle: q.title,
        questionStatus: q.status,
        questionOutcome: q.outcome,
        questionExpiresAt: q.expiresAt,
        totalYesAmount: q.totalYesAmount,
        totalNoAmount: q.totalNoAmount,
      }));
    });

    myBets.sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());

    return NextResponse.json({ bets: myBets });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
