import { z } from 'zod';
import { AttemptStatusEnum, PathwayCodeEnum, QuestionTypeEnum } from './enums';

export const SafeQuestionOptionDTO = z.object({
  id: z.string().uuid(),
  label: z.string()
});
export type SafeQuestionOption = z.infer<typeof SafeQuestionOptionDTO>;

export const SafeQuestionResponseDTO = z.object({
  attempt_id: z.string().uuid(),
  question_id: z.string().uuid(),
  index: z.number().int().positive(),
  total: z.number().int().positive(),
  type: QuestionTypeEnum,
  prompt: z.string(),
  rating_scale: z.array(z.number().int()).optional(),
  options: z.array(SafeQuestionOptionDTO),
  time_limit_seconds: z.number().int().positive(),
  question_remaining_seconds: z.number().int().nonnegative(),
  assessment_remaining_seconds: z.number().int().nonnegative()
});
export type SafeQuestionResponse = z.infer<typeof SafeQuestionResponseDTO>;

export const AnswerPayloadSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  option_id: z.string().uuid().optional()
}).refine(
  (data) => (data.rating !== undefined && data.option_id === undefined) ||
            (data.option_id !== undefined && data.rating === undefined),
  { message: "Answer must specify either rating (for self-report) or option_id (for scenario), but not both." }
);
export type AnswerPayload = z.infer<typeof AnswerPayloadSchema>;

export const SubmitAnswerRequestSchema = z.object({
  question_id: z.string().uuid(),
  answer: AnswerPayloadSchema
});
export type SubmitAnswerRequest = z.infer<typeof SubmitAnswerRequestSchema>;

export const SubmitAnswerResponseDTO = z.object({
  message: z.string(),
  next_index: z.number().int(),
  is_completed: z.boolean(),
  timed_out: z.boolean().default(false)
});
export type SubmitAnswerResponse = z.infer<typeof SubmitAnswerResponseDTO>;

export const PathwayScoreRowDTO = z.object({
  pathway_code: PathwayCodeEnum,
  pathway_name: z.string(),
  raw_score: z.number(),
  max_score: z.number(),
  score_0_100: z.number().nullable(),
  available: z.boolean(),
  rank: z.number().int()
});
export type PathwayScoreRow = z.infer<typeof PathwayScoreRowDTO>;

export const PathwayIdentityDTO = z.object({
  id: z.string().uuid(),
  code: PathwayCodeEnum,
  name: z.string(),
  score_0_100: z.number().nullable()
});
export type PathwayIdentity = z.infer<typeof PathwayIdentityDTO>;

export const SubmitAttemptResponseDTO = z.object({
  attempt_id: z.string().uuid(),
  status: AttemptStatusEnum,
  message: z.string(),
  primary: PathwayIdentityDTO.nullable(),
  secondary: PathwayIdentityDTO.nullable(),
  near_tie: z.boolean(),
  scoring_version: z.string(),
  answered_count: z.number().int(),
  timed_out_count: z.number().int(),
  scores: z.array(PathwayScoreRowDTO)
});
export type SubmitAttemptResponse = z.infer<typeof SubmitAttemptResponseDTO>;

export const StartAttemptResponseDTO = z.object({
  attempt_id: z.string().uuid(),
  attempt_no: z.number().int(),
  status: AttemptStatusEnum,
  current_index: z.number().int(),
  total_questions: z.number().int(),
  started_at: z.string().datetime(),
  assessment_remaining_seconds: z.number().int().nonnegative()
});
export type StartAttemptResponse = z.infer<typeof StartAttemptResponseDTO>;
