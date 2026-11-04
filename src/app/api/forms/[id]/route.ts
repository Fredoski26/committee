import { NextRequest, NextResponse } from 'next/server';
import { formsRepo } from '@/lib/repositories';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const updated = await formsRepo.update(params.id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Form not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, form: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deleted = await formsRepo.delete(params.id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Form not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Form deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
