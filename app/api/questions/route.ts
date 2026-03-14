import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Question from '@/models/Question';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'newest';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 12;

    const filter: any = {};
    if (category && category !== 'All') filter.category = category;
    if (status) filter.status = status;

    // Auto-close expired questions
    await Question.updateMany(
      { status: 'open', expiresAt: { $lt: new Date() } },
      { $set: { status: 'closed' } }
    );

    const sortObj: any =
      sort === 'popular'
        ? { totalYesAmount: -1, totalNoAmount: -1 }
        : sort === 'closing'
        ? { expiresAt: 1 }
        : { createdAt: -1 };

    const questions = await Question.find(filter)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-bets')
      .lean();

    const total = await Question.countDocuments(filter);

    return NextResponse.json({ questions, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { title, description, category, expiresAt } = await req.json();

    if (!title || !description || !category || !expiresAt) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (new Date(expiresAt) <= new Date()) {
      return NextResponse.json({ error: 'Expiry date must be in the future' }, { status: 400 });
    }

    const question = await Question.create({
      title,
      description,
      category,
      expiresAt: new Date(expiresAt),
      createdBy: authUser.userId,
      creatorUsername: authUser.username,
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
