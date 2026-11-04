import { z } from 'zod';

export const WebhookAnswerSchema = z.object({
  question: z.string().min(1, 'Question title is required'),
  answer: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.null()
  ]),
  type: z.string().optional()
});

export const WebhookSubmissionSchema = z.object({
  secret: z.string().optional(),
  formId: z.string().min(1, 'formId is required'),
  formName: z.string().optional(),
  formUrl: z.string().optional(),
  sheetUrl: z.string().optional(),
  externalSubmissionId: z.string().min(1, 'externalSubmissionId is required'),
  submittedAt: z.string().optional(),
  submitterEmail: z.string().email().optional().or(z.literal('')).nullable(),
  submitterName: z.string().optional().nullable(),
  submitterPhone: z.string().optional().nullable(),
  answers: z.array(WebhookAnswerSchema).or(z.record(z.any())),
  metadata: z.record(z.any()).optional()
});

export type WebhookPayload = z.infer<typeof WebhookSubmissionSchema>;
