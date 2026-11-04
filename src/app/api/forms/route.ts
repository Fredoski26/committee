import { NextRequest, NextResponse } from 'next/server';
import { formsRepo } from '@/lib/repositories';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const forms = await formsRepo.getAll();
    return NextResponse.json({
      success: true,
      forms
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { formId, name, description, sheetUrl, formUrl, status, fieldsCount } = body;

    if (!formId || !name) {
      return NextResponse.json(
        { success: false, error: 'formId and name are required' },
        { status: 400 }
      );
    }

    const existing = await formsRepo.getByFormId(formId);
    let form;
    if (existing) {
      form = await formsRepo.update(formId, {
        name,
        description,
        sheet_url: sheetUrl,
        form_url: formUrl,
        status: status || existing.status,
        fields_count: fieldsCount !== undefined ? fieldsCount : existing.fields_count
      });
    } else {
      form = await formsRepo.create({
        form_id: formId,
        name,
        description,
        sheet_url: sheetUrl,
        form_url: formUrl,
        status: status || 'Active',
        fields_count: fieldsCount || 0
      });
    }

    return NextResponse.json({
      success: true,
      form
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
