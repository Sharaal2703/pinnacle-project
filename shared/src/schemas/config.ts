import { z } from 'zod';

export const AssessmentConfigDTO = z.object({
  id: z.string().uuid(),
  version: z.string(),
  total_limit_seconds: z.number().int().positive(),
  self_report_limit_seconds: z.number().int().positive(),
  scenario_limit_seconds: z.number().int().positive(),
  grace_period_seconds: z.number().int().nonnegative(),
  min_answered_count: z.number().int().positive(),
  default_question_weight: z.number().positive(),
  scoring_formula_version: z.string(),
  is_active: z.boolean(),
  created_at: z.string().datetime().optional()
});
export type AssessmentConfig = z.infer<typeof AssessmentConfigDTO>;

export const UpdateAssessmentConfigSchema = z.object({
  version: z.string().min(1),
  total_limit_seconds: z.number().int().positive().optional(),
  self_report_limit_seconds: z.number().int().positive().optional(),
  scenario_limit_seconds: z.number().int().positive().optional(),
  grace_period_seconds: z.number().int().nonnegative().optional(),
  min_answered_count: z.number().int().positive().optional(),
  default_question_weight: z.number().positive().optional(),
  scoring_formula_version: z.string().optional()
});
export type UpdateAssessmentConfig = z.infer<typeof UpdateAssessmentConfigSchema>;
