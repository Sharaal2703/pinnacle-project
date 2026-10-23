import { z } from 'zod';
import { PathwayIdentityDTO, PathwayScoreRowDTO } from './attempts';

export const PreferenceProfileDTO = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  attempt_id: z.string().uuid(),
  is_current: z.boolean(),
  created_at: z.string().datetime(),
  scoring_version: z.string(),
  tie: z.boolean(),
  dominant: PathwayIdentityDTO,
  secondary: PathwayIdentityDTO,
  scores: z.array(PathwayScoreRowDTO)
});
export type PreferenceProfile = z.infer<typeof PreferenceProfileDTO>;

export const PreferenceProfileHistoryItemDTO = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  attempt_id: z.string().uuid(),
  is_current: z.boolean(),
  created_at: z.string().datetime(),
  scoring_version: z.string(),
  tie: z.boolean(),
  dominant: PathwayIdentityDTO,
  secondary: PathwayIdentityDTO
});
export type PreferenceProfileHistoryItem = z.infer<typeof PreferenceProfileHistoryItemDTO>;
