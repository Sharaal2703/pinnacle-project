import { z } from 'zod';

export const ErrorDetailSchema = z.object({
  field: z.string().optional(),
  issue: z.string(),
  message: z.string().optional()
});

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(ErrorDetailSchema).optional()
  })
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
