import { NextRequest, NextResponse } from 'next/server';
import { submissionsRepo } from '@/lib/repositories';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const formId = searchParams.get('formId') || undefined;
    const status = searchParams.get('status') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const format = (searchParams.get('format') || 'csv').toLowerCase();

    const items = submissionsRepo.getAllForExport({
      formId,
      status,
      startDate,
      endDate
    });

    // Collect all unique questions across submissions for standard column alignment
    const allQuestions = new Set<string>();
    const preparedRows = items.map(sub => {
      let answers: any[] = [];
      try {
        answers = JSON.parse(sub.answers);
      } catch {
        answers = [];
      }

      const rowObj: Record<string, any> = {
        'Submission ID': sub.id,
        'Form Name': sub.form_name || sub.form_id,
        'External Submission ID': sub.external_submission_id,
        'Submitter Name': sub.submitter_name || 'Anonymous',
        'Submitter Email': sub.submitter_email || 'N/A',
        'Submitter Phone': sub.submitter_phone || 'N/A',
        'Status': sub.status,
        'Submission Date': new Date(sub.submitted_at).toLocaleString(),
        'Notes': sub.notes || ''
      };

      for (const a of answers) {
        if (a && a.question) {
          allQuestions.add(a.question);
          const val = Array.isArray(a.answer) ? a.answer.join('; ') : a.answer ?? '';
          rowObj[a.question] = val;
        }
      }

      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(preparedRows);

    if (format === 'xlsx') {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Responses');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="form_responses_${new Date().toISOString().slice(0, 10)}.xlsx"`
        }
      });
    }

    // Default: CSV
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="form_responses_${new Date().toISOString().slice(0, 10)}.csv"`
      }
    });

  } catch (err: any) {
    console.error('Export error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
