import { z } from 'zod';

export const StudentAssessmentAccessDTO = z.object({
  can_take_assessment: z.boolean(),
  has_completed_assessment: z.boolean(),
  has_in_progress_attempt: z.boolean(),
  retake_authorized: z.boolean()
});
export type StudentAssessmentAccess = z.infer<typeof StudentAssessmentAccessDTO>;

export const ManagedAssessmentStudentDTO = z.object({
  student_id: z.string().uuid(),
  name: z.string(),
  username: z.string(),
  grade: z.number().int(),
  class_name: z.string().nullable(),
  has_completed_assessment: z.boolean(),
  has_in_progress_attempt: z.boolean(),
  retake_authorized: z.boolean(),
  latest_attempt_status: z.string().nullable(),
  can_manage_retake: z.boolean()
});
export type ManagedAssessmentStudent = z.infer<typeof ManagedAssessmentStudentDTO>;

export const AssessmentRetakeActionResponseDTO = z.object({
  message: z.string(),
  granted_at: z.string().datetime().optional()
});
