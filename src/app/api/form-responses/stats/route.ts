import { NextResponse } from 'next/server';
import { submissionsRepo } from '@/lib/repositories';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await submissionsRepo.getStats();
    return NextResponse.json({
      success: true,
      stats
    });
  } catch (err: any) {
    console.error('Error getting stats:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
