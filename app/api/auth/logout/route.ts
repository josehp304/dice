import { NextResponse } from 'next/server';

export async function POST() {
  const resp = NextResponse.json({ message: 'Logged out' });
  resp.cookies.delete('auth_token');
  return resp;
}
