import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { config } from '../config/env';
import { ConflictError, UnauthorizedError, NotFoundError, ValidationError } from '../middleware/error.middleware';
import { RegisterRequest, LoginRequest, AuthResponse, UserSummary } from '@pinnacle/shared';

export class AuthService {
  static async getRegistrationOptions() {
    const [schools, classes] = await Promise.all([
      prisma.school.findMany({ select: { id: true, schoolName: true }, orderBy: { schoolName: 'asc' } }),
      prisma.schoolClass.findMany({
        select: { id: true, schoolId: true, grade: true, section: true, academicYear: true },
        orderBy: [{ grade: 'asc' }, { section: 'asc' }]
      })
    ]);
    return {
      schools: schools.map(({ id, schoolName }) => ({ id, name: schoolName })),
      classes: classes.map(({ id, schoolId, grade, section, academicYear }) => ({
        id, school_id: schoolId, grade, section, academic_year: academicYear
      }))
    };
  }

  static async registerStudent(data: RegisterRequest): Promise<AuthResponse> {
    const existing = await prisma.user.findUnique({
      where: { username: data.username.toLowerCase() }
    });

    if (existing) {
      throw new ConflictError(`Username '${data.username}' is already registered.`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    if (data.school_id && !await prisma.school.findUnique({ where: { id: data.school_id }, select: { id: true } })) {
      throw new ValidationError('Selected school does not exist.');
    }
    if (data.class_id) {
      const schoolClass = await prisma.schoolClass.findUnique({ where: { id: data.class_id } });
      if (!schoolClass || schoolClass.grade !== data.grade || (data.school_id && schoolClass.schoolId !== data.school_id)) {
        throw new ValidationError('Selected class must belong to the selected school and grade.');
      }
      if (!data.school_id) data.school_id = schoolClass.schoolId;
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          username: data.username.toLowerCase(),
          passwordHash,
          role: 'STUDENT',
          isActive: true,
          email: data.email || null,
          phone: data.phone?.trim() || null,
          location: data.location?.trim() || null
        }
      });

      const student = await tx.student.create({
        data: {
          userId: user.id,
          grade: data.grade,
          schoolId: data.school_id,
          classId: data.class_id,
          admissionNumber: data.admission_number?.trim() || null
        }
      });

      return { user, student };
    });

    const token = jwt.sign(
      { id: result.user.id, username: result.user.username, role: result.user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    const userSummary: UserSummary = {
      id: result.user.id,
      name: result.user.name,
      username: result.user.username,
      role: 'STUDENT',
      grade: result.student.grade
    };

    return { token, user: userSummary };
  }

  static async login(data: LoginRequest): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { username: data.username.toLowerCase() },
      include: { student: true }
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid username or password');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid username or password');
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    const userSummary: UserSummary = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role as any,
      grade: user.student ? user.student.grade : null
    };

    return { token, user: userSummary };
  }

  static async getCurrentUser(userId: string): Promise<UserSummary> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { student: true }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role as any,
      grade: user.student ? user.student.grade : null
    };
  }
}
