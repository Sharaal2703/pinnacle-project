import { z } from 'zod';
import { RoleEnum } from './enums';

export const RegisterRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  email: z.string().email().max(254).optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  location: z.string().max(200).optional(),
  grade: z.number().int().min(6, 'Grade must be between 6 and 8').max(8, 'Grade must be between 6 and 8'),
  school_id: z.string().uuid().optional(),
  class_id: z.string().uuid().optional(),
  admission_number: z.string().trim().max(50).optional()
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const CreateTeacherAccountSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  username: z.string().trim().min(3, 'Username must be at least 3 characters').max(50),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  email: z.string().email().max(254).optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  location: z.string().max(200).optional(),
  school_id: z.string().uuid().optional(),
  class_id: z.string().uuid().optional(),
  subject_id: z.string().uuid().optional(),
  new_school: z.object({
    school_name: z.string().trim().min(1, 'School name is required').max(150),
    address: z.string().trim().max(250).optional(),
    city: z.string().trim().max(100).optional(),
    district: z.string().trim().max(100).optional(),
    state: z.string().trim().max(100).optional(),
    pincode: z.string().trim().max(20).optional()
  }).optional(),
  employee_number: z.string().trim().max(50).optional()
}).refine((data) => Boolean(data.school_id) !== Boolean(data.new_school), {
  message: 'Choose an existing school or provide details for a new school',
  path: ['school_id']
}).refine((data) => Boolean(data.class_id) === Boolean(data.subject_id), {
  message: 'Choose both a class and subject to create an assignment',
  path: ['class_id']
});
export type CreateTeacherAccount = z.infer<typeof CreateTeacherAccountSchema>;

export const RegistrationOptionsDTO = z.object({
  schools: z.array(z.object({ id: z.string().uuid(), name: z.string() })),
  classes: z.array(z.object({
    id: z.string().uuid(), school_id: z.string().uuid(), grade: z.number().int(),
    section: z.string(), academic_year: z.string()
  }))
});
export type RegistrationOptions = z.infer<typeof RegistrationOptionsDTO>;

export const TeacherAccountDTO = z.object({
  id: z.string().uuid(),
  name: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  school_name: z.string(),
  school_id: z.string().uuid(),
  employee_number: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string().datetime()
});
export type TeacherAccount = z.infer<typeof TeacherAccountDTO>;

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
