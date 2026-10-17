import { z } from 'zod';
import { RoleEnum } from './enums';

export const RegisterRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  grade: z.number().int().min(6, 'Grade must be between 6 and 8').max(8, 'Grade must be between 6 and 8')
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const UserSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  username: z.string(),
  role: RoleEnum,
  grade: z.number().int().nullable().optional()
});
export type UserSummary = z.infer<typeof UserSummarySchema>;

export const AuthResponseSchema = z.object({
  token: z.string(),
  user: UserSummarySchema
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
