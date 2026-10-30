import { z } from 'zod';

export const explanationLevelSchema = z.enum(['simple', 'standard', 'detailed']);
export const difficultyLevelSchema = z.enum(['easy', 'medium', 'difficult']);

export const tutorQuerySchema = z.object({
  message: z.string().min(1, 'Please enter a question').max(2000, 'Question cannot exceed 2000 characters'),
  level: explanationLevelSchema.default('standard'),
  history: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().max(4000),
    })
  ).max(20).optional().default([]),
});

export const explainConceptSchema = z.object({
  topic: z.string().min(1, 'Please enter a topic').max(300, 'Topic cannot exceed 300 characters'),
  level: explanationLevelSchema.default('standard'),
});

export const educationalFileSchema = z.object({
  base64: z.string(),
  mimeType: z.string(),
  fileName: z.string().optional(),
});

export const quizGenerateSchema = z.object({
  topic: z.string().max(300, 'Topic cannot exceed 300 characters').optional().default('Course Revision'),
  notes: z.string().max(150000, 'Notes cannot exceed 150,000 characters').optional().default(''),
  questionCount: z.coerce.number().int().min(1).max(25).default(5),
  difficulty: difficultyLevelSchema.default('medium'),
  fileData: educationalFileSchema.optional(),
});

export const flashcardsGenerateSchema = z.object({
  topic: z.string().max(300, 'Topic cannot exceed 300 characters').optional().default('Course Revision'),
  notes: z.string().max(150000, 'Notes cannot exceed 150,000 characters').optional().default(''),
  count: z.coerce.number().int().min(1).max(25).default(6),
  fileData: educationalFileSchema.optional(),
});

export const brainBlitzGenerateSchema = z.object({
  topic: z.string().max(300).optional().default(''),
  notes: z.string().max(150000, 'Notes cannot exceed 150,000 characters').optional().default(''),
  questionCount: z.coerce.number().int().min(5).max(35).default(15),
  fileData: educationalFileSchema.optional(),
});

export const emailSendSchema = z.object({
  to: z.string().email('Please enter a valid email'),
  subject: z.string().min(1, 'Subject is required').max(150),
  content: z.string().min(1, 'Email content is required').max(5000),
});

export const reportAiSchema = z.object({
  query: z.string().max(2000),
  response: z.string().max(5000),
  reason: z.string().min(1).max(1000),
});

export const loginNotificationSchema = z.object({
  email: z.string().min(1, 'Email is required').max(150),
  displayName: z.string().max(100).optional(),
  event: z.enum(['login', 'signup', 'demo_access']).default('login'),
  userAgent: z.string().max(500).optional(),
});

export const summarizeDocumentSchema = z.object({
  text: z.string().max(50000, 'Document text exceeds 50,000 characters').optional().default(''),
  pdfBase64: z.string().optional(),
  fileName: z.string().max(255).optional(),
}).refine((data) => data.text.trim().length > 0 || Boolean(data.pdfBase64), {
  message: 'Please provide document text or upload a file.',
});
