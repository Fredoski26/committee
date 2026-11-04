import { NextRequest, NextResponse } from 'next/server';
import { submissionsRepo } from '@/lib/repositories';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const formId = searchParams.get('formId') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const result = submissionsRepo.list({
      formId,
      status,
      search,
      startDate,
      endDate,
      page,
      limit
    });

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (err: any) {
    console.error('Error fetching submissions:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
