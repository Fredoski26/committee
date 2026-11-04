import { NextRequest, NextResponse } from 'next/server';
import { webhookLogsRepo } from '@/lib/repositories';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await webhookLogsRepo.list({ status, page, limit });
    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
