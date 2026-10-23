import { Role } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { ConflictError, ForbiddenError, NotFoundError } from '../middleware/error.middleware';
import { ProfileService } from './profile.service';

export class AssessmentAccessService {
  static async getStudentAccess(studentId: string) {
    const [completedAttempt, inProgressAttempt, activeGrant] = await Promise.all([
      prisma.assessmentAttempt.findFirst({
        where: { studentId, status: 'SCORED' },
        select: { id: true }
      }),
      prisma.assessmentAttempt.findFirst({
        where: { studentId, status: 'IN_PROGRESS' },
        select: { id: true }
      }),
      prisma.assessmentRetakeGrant.findFirst({
        where: { studentId, consumedAt: null, revokedAt: null },
        orderBy: { grantedAt: 'desc' },
        select: { id: true }
      })
    ]);

    const hasCompletedAssessment = !!completedAttempt;
    const hasInProgressAttempt = !!inProgressAttempt;
    const retakeAuthorized = !!activeGrant;

    return {
      can_take_assessment: hasInProgressAttempt || !hasCompletedAssessment || retakeAuthorized,
      has_completed_assessment: hasCompletedAssessment,
      has_in_progress_attempt: hasInProgressAttempt,
      retake_authorized: retakeAuthorized
    };
  }

  /** Returns the active one-use grant required to create a post-completion attempt. */
  static async getGrantForNewAttempt(studentId: string): Promise<string | null> {
    const completedAttempt = await prisma.assessmentAttempt.findFirst({
      where: { studentId, status: 'SCORED' },
      select: { id: true }
    });
    if (!completedAttempt) return null;

    const grant = await prisma.assessmentRetakeGrant.findFirst({
      where: { studentId, consumedAt: null, revokedAt: null },
      orderBy: { grantedAt: 'desc' },
      select: { id: true }
    });
    if (!grant) {
      throw new ForbiddenError('Your assessment is complete. Ask your teacher to authorize another attempt.');
    }
    return grant.id;
  }

  static async createAuthorizedAttempt(
    studentId: string,
    grantId: string | null,
    data: {
      questionOrder: string[];
      startedAt: Date;
      scoringConfigVersion: string;
      totalTimeLimitSec: number;
      expiresAt: Date;
      questionnaireVersionId: string;
    }
  ) {
    return prisma.$transaction(async (tx) => {
      const completedAttempt = await tx.assessmentAttempt.findFirst({
        where: { studentId, status: 'SCORED' },
        select: { id: true }
      });

      if (completedAttempt && !grantId) {
        throw new ForbiddenError('Your assessment is complete. Ask your teacher to authorize another attempt.');
      }

      if (grantId) {
        const consumed = await tx.assessmentRetakeGrant.updateMany({
          where: { id: grantId, studentId, consumedAt: null, revokedAt: null },
          data: { consumedAt: data.startedAt }
        });
        if (consumed.count !== 1) {
          throw new ForbiddenError('Retake authorization is no longer available. Ask your teacher to authorize another attempt.');
        }
      }

      const latestAttempt = await tx.assessmentAttempt.findFirst({
        where: { studentId },
        orderBy: { attemptNo: 'desc' },
        select: { attemptNo: true }
      });

      return tx.assessmentAttempt.create({
        data: {
          studentId,
          attemptNo: (latestAttempt?.attemptNo ?? 0) + 1,
          status: 'IN_PROGRESS',
          questionOrder: data.questionOrder,
          currentIndex: 1,
          startedAt: data.startedAt,
          scoringConfigVersion: data.scoringConfigVersion,
          totalTimeLimitSec: data.totalTimeLimitSec,
          expiresAt: data.expiresAt,
          questionnaireVersionId: data.questionnaireVersionId
        }
      });
    });
  }

  static async listManagedStudents(teacherUserId: string, role: Role) {
    if (role !== 'TEACHER') throw new ForbiddenError('Only teachers can manage student assessment access.');

    const teacher = await prisma.teacher.findUnique({ where: { userId: teacherUserId }, select: { id: true } });
    if (!teacher) throw new ForbiddenError('Teacher profile not found.');
    const assignments = await prisma.teacherClassAssignment.findMany({
      where: { teacherId: teacher.id },
      select: { classId: true },
      distinct: ['classId']
    });
    const assignedClassIds = assignments.map((assignment) => assignment.classId);
    if (!assignedClassIds.length) return [];

    const students = await prisma.student.findMany({
      where: { classId: { in: assignedClassIds } },
      include: {
        user: { select: { name: true, username: true } },
        schoolClass: { select: { grade: true, section: true, academicYear: true } },
        attempts: {
          orderBy: { attemptNo: 'desc' },
          take: 1,
          select: { status: true, attemptNo: true }
        },
        assessmentRetakeGrants: {
          where: { consumedAt: null, revokedAt: null },
          orderBy: { grantedAt: 'desc' },
          take: 1,
          select: { id: true }
        }
      },
      orderBy: [{ grade: 'asc' }, { user: { name: 'asc' } }]
    });

    const scoredStudents = await prisma.assessmentAttempt.findMany({
      where: { status: 'SCORED', studentId: { in: students.map((student) => student.id) } },
      distinct: ['studentId'],
      select: { studentId: true }
    });
    const completedIds = new Set(scoredStudents.map((attempt) => attempt.studentId));

    return students.map((student) => {
      const hasCompletedAssessment = completedIds.has(student.id);
      const hasInProgressAttempt = student.attempts[0]?.status === 'IN_PROGRESS';
      const retakeAuthorized = student.assessmentRetakeGrants.length > 0;
      return {
        student_id: student.id,
        name: student.user.name,
        username: student.user.username,
        grade: student.grade,
        class_name: student.schoolClass
          ? `${student.schoolClass.grade}-${student.schoolClass.section} (${student.schoolClass.academicYear})`
          : null,
        has_completed_assessment: hasCompletedAssessment,
        has_in_progress_attempt: hasInProgressAttempt,
        retake_authorized: retakeAuthorized,
        latest_attempt_status: student.attempts[0]?.status ?? null,
        can_manage_retake: hasCompletedAssessment
      };
    });
  }

  static async getAssignedStudentReport(teacherUserId: string, role: Role, studentId: string) {
    await this.assertCanManageStudent(teacherUserId, role, studentId);
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { name: true, username: true } },
        schoolClass: { select: { grade: true, section: true, academicYear: true } },
        profiles: { where: { isCurrent: true }, select: { id: true }, take: 1 }
      }
    });
    if (!student) throw new NotFoundError('Student not found.');
    const profile = student.profiles.length ? await ProfileService.getCurrentProfile(student.id) : null;
    return {
      student: {
        id: student.id,
        name: student.user.name,
        username: student.user.username,
        grade: student.grade,
        class_name: student.schoolClass
          ? `${student.schoolClass.grade}-${student.schoolClass.section} (${student.schoolClass.academicYear})`
          : null
      },
      profile
    };
  }

  private static async assertCanManageStudent(teacherUserId: string, role: Role, studentId: string): Promise<void> {
    if (role !== 'TEACHER') throw new ForbiddenError('Only teachers can manage student assessment access.');
    const teacher = await prisma.teacher.findUnique({ where: { userId: teacherUserId }, select: { id: true } });
    if (!teacher) throw new ForbiddenError('Teacher profile not found.');
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true, classId: true } });
    if (!student) throw new NotFoundError('Student not found.');
    if (!student.classId) throw new ForbiddenError('This student is not assigned to a class.');
    const assignment = await prisma.teacherClassAssignment.findFirst({
      where: { teacherId: teacher.id, classId: student.classId },
      select: { id: true }
    });
    if (!assignment) throw new ForbiddenError('You can manage students only in your assigned classes.');
  }

  static async grantRetake(teacherId: string, role: Role, studentId: string) {
    await this.assertCanManageStudent(teacherId, role, studentId);
    const completed = await prisma.assessmentAttempt.findFirst({
      where: { studentId, status: 'SCORED' },
      select: { id: true }
    });
    if (!completed) throw new ConflictError('A retake can be authorized only after the student has completed the assessment.');

    return prisma.$transaction(async (tx) => {
      const existing = await tx.assessmentRetakeGrant.findFirst({
        where: { studentId, consumedAt: null, revokedAt: null },
        select: { id: true, grantedAt: true }
      });
      if (existing) return existing;
      return tx.assessmentRetakeGrant.create({
        data: { studentId, grantedById: teacherId },
        select: { id: true, grantedAt: true }
      });
    });
  }

  static async revokeRetake(teacherUserId: string, role: Role, studentId: string): Promise<boolean> {
    await this.assertCanManageStudent(teacherUserId, role, studentId);
    const activeGrant = await prisma.assessmentRetakeGrant.findFirst({
      where: { studentId, consumedAt: null, revokedAt: null },
      orderBy: { grantedAt: 'desc' },
      select: { id: true }
    });
    if (!activeGrant) throw new NotFoundError('No unused retake authorization exists for this student.');

    const result = await prisma.assessmentRetakeGrant.updateMany({
      where: { id: activeGrant.id, consumedAt: null, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    return result.count === 1;
  }
}
