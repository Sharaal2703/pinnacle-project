import { z } from 'zod';

export const PathwayCodeEnum = z.enum([
  'LING',
  'LOGI',
  'VIS',
  'MUSI',
  'BODY',
  'NAT',
  'INTER',
  'INTRA'
]);
export type PathwayCode = z.infer<typeof PathwayCodeEnum>;

export const VarkTypeEnum = z.enum(['V', 'A', 'R', 'K']);
export type VarkType = z.infer<typeof VarkTypeEnum>;

export const RoleEnum = z.enum(['STUDENT', 'TEACHER', 'ADMIN']);
export type Role = z.infer<typeof RoleEnum>;

export const QuestionTypeEnum = z.enum(['SELF_REPORT', 'SCENARIO']);
export type QuestionType = z.infer<typeof QuestionTypeEnum>;

export const ReviewStatusEnum = z.enum(['DRAFT', 'APPROVED', 'REJECTED']);
export type ReviewStatus = z.infer<typeof ReviewStatusEnum>;

export const AttemptStatusEnum = z.enum(['IN_PROGRESS', 'SUBMITTED', 'SCORED', 'INCOMPLETE', 'EXPIRED']);
export type AttemptStatus = z.infer<typeof AttemptStatusEnum>;
