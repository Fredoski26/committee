import { NextRequest, NextResponse } from 'next/server';
import { webhookLogsRepo } from '@/lib/repositories';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const log = await webhookLogsRepo.getById(params.id);
    if (!log) {
      return NextResponse.json({ success: false, error: 'Log entry not found' }, { status: 404 });
    }

    let payload: any;
    try {
      payload = JSON.parse(log.payload);
    } catch {
      return NextResponse.json({ success: false, error: 'Cannot parse payload JSON for retry' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const secret = process.env.GOOGLE_FORMS_WEBHOOK_SECRET || 'gforms_sec_7f9a8d4c2b1e0f3a5e8c';

    const webhookRes = await fetch(`${appUrl}/api/webhooks/google-forms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': secret
      },
      body: JSON.stringify(payload)
    });

    const result = await webhookRes.json();
    return NextResponse.json({
      success: webhookRes.ok,
      result
    }, { status: webhookRes.status });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
