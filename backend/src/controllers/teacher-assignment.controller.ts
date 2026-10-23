import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { ConflictError, NotFoundError, ValidationError } from '../middleware/error.middleware';

const paramsSchema = z.object({ teacher_id: z.string().uuid() });
const assignmentParamsSchema = paramsSchema.extend({ assignment_id: z.string().uuid() });
const assignmentBodySchema = z.object({ class_id: z.string().uuid(), subject_id: z.string().uuid() });

export class TeacherAssignmentController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { teacher_id: userId } = paramsSchema.parse(req.params);
      const teacher = await prisma.teacher.findUnique({ where: { userId }, select: { id: true } });
      if (!teacher) throw new NotFoundError('Teacher account not found');
      const assignments = await prisma.teacherClassAssignment.findMany({
        where: { teacherId: teacher.id }, include: { subject: { select: { id: true, code: true, name: true } }, schoolClass: { select: { id: true, schoolId: true, grade: true, section: true, academicYear: true } } },
        orderBy: [{ schoolClass: { grade: 'asc' } }, { subject: { name: 'asc' } }]
      });
      res.status(200).json(assignments.map(({ id, subject, schoolClass }) => ({
        id, subject: { id: subject.id, code: subject.code, name: subject.name },
        class: { id: schoolClass.id, school_id: schoolClass.schoolId, grade: schoolClass.grade, section: schoolClass.section, academic_year: schoolClass.academicYear }
      })));
    } catch (err) { next(err); }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { teacher_id: userId } = paramsSchema.parse(req.params);
      const { class_id, subject_id } = assignmentBodySchema.parse(req.body);
      const teacher = await prisma.teacher.findUnique({ where: { userId }, select: { id: true, schoolId: true } });
      if (!teacher) throw new NotFoundError('Teacher account not found');
      const schoolClass = await prisma.schoolClass.findUnique({ where: { id: class_id } });
      if (!schoolClass || schoolClass.schoolId !== teacher.schoolId) throw new ValidationError('Choose a class from the teacher’s school.');
      if (!await prisma.subject.findUnique({ where: { id: subject_id }, select: { id: true } })) throw new ValidationError('Selected subject does not exist.');
      try {
        const assignment = await prisma.teacherClassAssignment.create({
          data: { teacherId: teacher.id, classId: class_id, subjectId: subject_id },
          include: { subject: { select: { id: true, code: true, name: true } }, schoolClass: { select: { id: true, schoolId: true, grade: true, section: true, academicYear: true } } }
        });
        res.status(201).json({ id: assignment.id, subject: assignment.subject, class: { id: assignment.schoolClass.id, school_id: assignment.schoolClass.schoolId, grade: assignment.schoolClass.grade, section: assignment.schoolClass.section, academic_year: assignment.schoolClass.academicYear } });
      } catch (err: any) {
        if (err?.code === 'P2002') throw new ConflictError('This teacher is already assigned to that class and subject.');
        throw err;
      }
    } catch (err) { next(err); }
  }

  static async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { teacher_id: userId, assignment_id: assignmentId } = assignmentParamsSchema.parse(req.params);
      const teacher = await prisma.teacher.findUnique({ where: { userId }, select: { id: true } });
      if (!teacher) throw new NotFoundError('Teacher account not found');
      const result = await prisma.teacherClassAssignment.deleteMany({ where: { id: assignmentId, teacherId: teacher.id } });
      if (result.count === 0) throw new NotFoundError('Teacher assignment not found');
      res.status(204).send();
    } catch (err) { next(err); }
  }
}
