import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

/**
 * Zod Validation Middleware Factory
 *
 * Creates Express middleware that validates req.body against a Zod schema.
 * On success, attaches the parsed (type-safe) body to req.validatedBody.
 * On failure, returns 422 with structured field-level errors.
 */
export function validate<T extends z.ZodTypeAny>(schema: T) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const errors = result.error.flatten().fieldErrors;
            res.status(422).json({
                error: 'Validation failed',
                details: errors,
            });
            return;
        }

        req.validatedBody = result.data;
        next();
    };
}

// ═══════════════════════════════════════════
// Generate Content Schema
// ═══════════════════════════════════════════

export const generateContentSchema = z.object({
    topic: z.string().min(1, 'Topic is required').max(500),
    description: z.string().min(1, 'Description is required').max(5000),
    source_url: z.string().url().optional().nullable(),
    hook_text: z.string().optional().nullable(),
    angle: z.string().optional().nullable(),
    keywords: z.array(z.string()).max(20).default([]),
    voice_samples: z.array(z.string().max(3000)).max(10).default([]),
    content_type: z.enum(['linkedin_short', 'linkedin_long']).default('linkedin_short'),
});

export type GenerateContentInput = z.infer<typeof generateContentSchema>;

// ═══════════════════════════════════════════
// Publish Content Schema
// ═══════════════════════════════════════════

export const publishContentSchema = z.object({
    content: z.string().min(1, 'Content is required').max(3000),
    draft_id: z.string().uuid().optional().nullable(),
});

export type PublishContentInput = z.infer<typeof publishContentSchema>;

// ═══════════════════════════════════════════
// Schedule Post Schema
// ═══════════════════════════════════════════

export const schedulePostSchema = z.object({
    content: z.string().min(1, 'Content is required').max(3000),
    scheduled_at: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid date/time format',
    }).refine((val) => new Date(val) > new Date(), {
        message: 'Scheduled time must be in the future',
    }),
});

export type SchedulePostInput = z.infer<typeof schedulePostSchema>;
