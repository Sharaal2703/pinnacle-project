import { z } from 'zod';
import { PathwayCodeEnum, QuestionTypeEnum, ReviewStatusEnum, VarkTypeEnum } from './enums';

export const QuestionOptionContributionSchema = z.object({
  pathway_code: PathwayCodeEnum,
  contribution: z.literal(1)
});
export type QuestionOptionContribution = z.infer<typeof QuestionOptionContributionSchema>;

export const QuestionOptionDTO = z.object({
  id: z.string().uuid(),
  option_key: z.string(),
  label: z.string(),
  order_index: z.number().int(),
  vark_type: VarkTypeEnum.nullable().optional(),
  pathway_contributions: z.array(QuestionOptionContributionSchema).optional()
});
export type QuestionOption = z.infer<typeof QuestionOptionDTO>;

export const QuestionVersionDTO = z.object({
  id: z.string().uuid(),
  key: z.string(),
  version: z.number().int(),
  type: QuestionTypeEnum,
  prompt: z.string(),
  grade_min: z.number().int().min(6).max(8),
  grade_max: z.number().int().min(6).max(8),
  weight: z.number().min(1.0).max(3.0),
  time_limit_seconds: z.number().int().positive(),
  review_status: ReviewStatusEnum,
  reviewer_name: z.string().nullable().optional(),
  review_notes: z.string().nullable().optional(),
  reviewed_at: z.string().datetime().nullable().optional(),
  is_active: z.boolean(),
  pathway_code: PathwayCodeEnum.nullable().optional(),
  options: z.array(QuestionOptionDTO)
});
export type QuestionVersion = z.infer<typeof QuestionVersionDTO>;

export const CreateQuestionOptionInputSchema = z.object({
  option_key: z.string().min(1),
  label: z.string().min(1),
  order_index: z.number().int().default(0),
  vark_type: VarkTypeEnum.nullable().optional(),
  pathway_contributions: z.array(QuestionOptionContributionSchema).optional().default([])
});

export const CreateQuestionInputSchema = z.object({
  key: z.string().min(1),
  type: QuestionTypeEnum,
  prompt: z.string().min(1),
  grade_min: z.number().int().min(6).max(8).default(6),
  grade_max: z.number().int().min(6).max(8).default(8),
  weight: z.number().min(1.0).max(3.0).default(1.0),
  time_limit_seconds: z.number().int().positive().optional(),
  pathway_code: PathwayCodeEnum.optional(),
  options: z.array(CreateQuestionOptionInputSchema).optional().default([])
});
export type CreateQuestionInput = z.infer<typeof CreateQuestionInputSchema>;

export const UpdateQuestionInputSchema = z.object({
  prompt: z.string().min(1).optional(),
  grade_min: z.number().int().min(6).max(8).optional(),
  grade_max: z.number().int().min(6).max(8).optional(),
  weight: z.number().min(1.0).max(3.0).optional(),
  time_limit_seconds: z.number().int().positive().optional(),
  pathway_code: PathwayCodeEnum.optional(),
  options: z.array(CreateQuestionOptionInputSchema).optional()
});
export type UpdateQuestionInput = z.infer<typeof UpdateQuestionInputSchema>;

export const ReviewQuestionInputSchema = z.object({
  review_status: z.enum(['APPROVED', 'REJECTED']),
  reviewer_name: z.string().min(1),
  review_notes: z.string().optional()
});
export type ReviewQuestionInput = z.infer<typeof ReviewQuestionInputSchema>;
