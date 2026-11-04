import { NextRequest, NextResponse } from 'next/server';
import { submissionsRepo } from '@/lib/repositories';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const submission = await submissionsRepo.getById(params.id);
    if (!submission) {
      return NextResponse.json({ success: false, error: 'Submission not found' }, { status: 404 });
    }

    let parsedAnswers = [];
    try {
      parsedAnswers = typeof submission.answers === 'string' ? JSON.parse(submission.answers) : submission.answers;
    } catch {
      parsedAnswers = [];
    }

    return NextResponse.json({
      success: true,
      submission: {
        ...submission,
        parsedAnswers
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { status, notes } = body;

    if (status && !['pending', 'reviewed', 'completed'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Status must be pending, reviewed, or completed' },
        { status: 400 }
      );
    }

    const updated = await submissionsRepo.updateStatus(params.id, status, notes);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Submission not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      submission: updated
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deleted = await submissionsRepo.delete(params.id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Submission not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Submission deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
