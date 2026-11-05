import { NextRequest, NextResponse } from 'next/server';
import { WebhookSubmissionSchema } from '@/lib/validations';
import { formsRepo, submissionsRepo, webhookLogsRepo } from '@/lib/repositories';
import { SubmissionAnswer } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || 'Unknown';
  let rawBodyText = '';

  try {
    rawBodyText = await req.text();
    let body: any;
    try {
      body = JSON.parse(rawBodyText);
    } catch (e) {
      await webhookLogsRepo.create({
        status: 'error',
        status_code: 400,
        message: 'Invalid JSON payload',
        error_message: 'Failed to parse JSON body',
        payload: rawBodyText.slice(0, 5000),
        ip,
        user_agent: userAgent
      });
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    // 1. Authenticate Request
    const expectedSecret = process.env.GOOGLE_FORMS_WEBHOOK_SECRET || 'gforms_sec_7f9a8d4c2b1e0f3a5e8c';
    const headerSecret = req.headers.get('x-webhook-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
    const bodySecret = body.secret;

    const providedSecret = headerSecret || bodySecret;

    if (!providedSecret || providedSecret !== expectedSecret) {
      await webhookLogsRepo.create({
        form_id: body.formId || null,
        external_submission_id: body.externalSubmissionId || null,
        status: 'unauthorized',
        status_code: 401,
        message: 'Unauthorized webhook attempt',
        error_message: 'Invalid or missing webhook secret',
        payload: JSON.stringify({ ...body, secret: '***REDACTED***' }).slice(0, 5000),
        headers: JSON.stringify({
          'user-agent': userAgent,
          'content-type': req.headers.get('content-type')
        }),
        ip,
        user_agent: userAgent
      });

      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid webhook secret' },
        { status: 401 }
      );
    }

    // 2. Validate with Zod
    const parseResult = WebhookSubmissionSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
      await webhookLogsRepo.create({
        form_id: body.formId || null,
        external_submission_id: body.externalSubmissionId || null,
        status: 'error',
        status_code: 422,
        message: 'Validation failed',
        error_message: issues,
        payload: JSON.stringify({ ...body, secret: '***REDACTED***' }).slice(0, 5000),
        ip,
        user_agent: userAgent
      });

      return NextResponse.json(
        { success: false, error: 'Unprocessable Entity', details: issues },
        { status: 422 }
      );
    }

    const data = parseResult.data;

    // 3. Normalize answers into Array<SubmissionAnswer>
    let formattedAnswers: SubmissionAnswer[] = [];
    if (Array.isArray(data.answers)) {
      formattedAnswers = data.answers.map(item => ({
        question: String(item.question).trim(),
        answer: item.answer,
        type: item.type || 'text'
      }));
    } else if (typeof data.answers === 'object' && data.answers !== null) {
      formattedAnswers = Object.entries(data.answers).map(([question, answer]) => ({
        question: question.trim(),
        answer: answer as any,
        type: Array.isArray(answer) ? 'checkboxes' : typeof answer === 'number' ? 'number' : 'text'
      }));
    }

    // 4. Auto-extract Submitter Name, Email, Phone if not explicitly set
    let submitterName = data.submitterName || null;
    let submitterEmail = data.submitterEmail || null;
    let submitterPhone = data.submitterPhone !== undefined && data.submitterPhone !== null ? String(data.submitterPhone) : null;

    for (const item of formattedAnswers) {
      const q = item.question.toLowerCase();
      const val = item.answer ? String(item.answer).trim() : '';

      if (!submitterName && (q.includes('full name') || q.includes('your name') || q.includes("contestant's name") || q === 'name')) {
        submitterName = val;
      }
      if (!submitterEmail && (q.includes('email') || q.includes('e-mail'))) {
        submitterEmail = val;
      }
      if (!submitterPhone && (q.includes('phone') || q.includes('mobile') || q.includes('whatsapp') || q.includes('contact number'))) {
        submitterPhone = val;
      }
    }

    // 5. Check for Duplicate Submission
    const existing = await submissionsRepo.getByExternalId(data.formId, data.externalSubmissionId);
    if (existing) {
      await webhookLogsRepo.create({
        form_id: data.formId,
        external_submission_id: data.externalSubmissionId,
        status: 'duplicate',
        status_code: 200,
        message: 'Duplicate submission safely ignored',
        payload: JSON.stringify({ ...body, secret: '***REDACTED***' }).slice(0, 5000),
        ip,
        user_agent: userAgent
      });

      return NextResponse.json({
        success: true,
        duplicate: true,
        message: 'Submission already processed previously',
        submissionId: existing.id
      }, { status: 200 });
    }

    // 6. Ensure Form Exists
    const formName = data.formName || (data.formId === 'class-of-1990-electoral' ? 'CLASS OF 1990 - ELECTORAL COMMITTEE APPLICATION FORM' : data.formId);
    const form = await formsRepo.ensureForm(
      data.formId,
      formName,
      formattedAnswers.length,
      data.formUrl,
      data.sheetUrl
    );

    // 7. Save Submission
    const submittedAt = data.submittedAt || new Date().toISOString();
    const createdSubmission = await submissionsRepo.create({
      form_id: form.form_id,
      external_submission_id: data.externalSubmissionId,
      submitter_name: submitterName,
      submitter_email: submitterEmail,
      submitter_phone: submitterPhone,
      answers: JSON.stringify(formattedAnswers),
      raw_payload: JSON.stringify(data),
      status: 'pending',
      submitted_at: submittedAt
    });

    // 8. Log Success
    await webhookLogsRepo.create({
      form_id: data.formId,
      external_submission_id: data.externalSubmissionId,
      status: 'success',
      status_code: 201,
      message: `Successfully processed submission for ${formName}`,
      payload: JSON.stringify({ ...body, secret: '***REDACTED***' }).slice(0, 5000),
      ip,
      user_agent: userAgent
    });

    return NextResponse.json({
      success: true,
      submission: {
        id: createdSubmission.id,
        formId: createdSubmission.form_id,
        externalSubmissionId: createdSubmission.external_submission_id,
        submitterName: createdSubmission.submitter_name,
        submittedAt: createdSubmission.submitted_at
      }
    }, { status: 201 });

  } catch (err: any) {
    console.error('Webhook error:', err);
    await webhookLogsRepo.create({
      status: 'error',
      status_code: 500,
      message: 'Internal server error while processing webhook',
      error_message: err?.message || String(err),
      payload: rawBodyText.slice(0, 5000),
      ip,
      user_agent: userAgent
    });

    return NextResponse.json(
      { success: false, error: 'Internal server error', message: err?.message },
      { status: 500 }
    );
  }
}
