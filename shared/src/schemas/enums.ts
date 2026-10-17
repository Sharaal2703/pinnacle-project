import { z } from 'zod';

export const PathwayCodeEnum = z.enum([
  'LING',
  'LOGI',
  'SPAT',
  'MUSI',
  'BODY',
  'NATU'
]);
export type PathwayCode = z.infer<typeof PathwayCodeEnum>;

export const RoleEnum = z.enum(['STUDENT', 'ADMIN']);
export type Role = z.infer<typeof RoleEnum>;

export const QuestionTypeEnum = z.enum(['SELF_REPORT', 'SCENARIO']);
export type QuestionType = z.infer<typeof QuestionTypeEnum>;

export const ReviewStatusEnum = z.enum(['DRAFT', 'APPROVED', 'REJECTED']);
export type ReviewStatus = z.infer<typeof ReviewStatusEnum>;

export const AttemptStatusEnum = z.enum(['IN_PROGRESS', 'SCORED', 'INCOMPLETE']);
export type AttemptStatus = z.infer<typeof AttemptStatusEnum>;
