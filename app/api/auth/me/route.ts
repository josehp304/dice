import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ user: null });

    await connectDB();
    const user = await User.findById(authUser.userId).select('-password');
    if (!user) return NextResponse.json({ user: null });

    return NextResponse.json({
      user: { id: user._id, username: user.username, email: user.email, balance: user.balance },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
