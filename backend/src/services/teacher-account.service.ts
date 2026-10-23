import bcrypt from 'bcryptjs';
import { CreateTeacherAccount } from '@pinnacle/shared';
import { ConflictError, ValidationError } from '../middleware/error.middleware';
import { prisma } from '../utils/prisma';

export class TeacherAccountService {
  static async listTeachers() {
    const teachers = await prisma.user.findMany({
      where: { role: 'TEACHER' },
      select: {
        id: true,
        name: true,
        username: true,
        isActive: true,
        createdAt: true,
        email: true,
        phone: true,
        location: true,
        teacher: { select: { employeeNumber: true, schoolId: true, school: { select: { schoolName: true } } } }
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }]
    });

    return teachers.map((teacher) => ({
      id: teacher.id,
      name: teacher.name,
      username: teacher.username,
      email: teacher.email,
      phone: teacher.phone,
      location: teacher.location,
      school_name: teacher.teacher?.school.schoolName || '',
      school_id: teacher.teacher?.schoolId || '',
      employee_number: teacher.teacher?.employeeNumber || null,
      is_active: teacher.isActive,
      created_at: teacher.createdAt.toISOString()
    }));
  }

  static async createTeacherAccount(data: CreateTeacherAccount) {
    const username = data.username.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (existing) throw new ConflictError(`Username '${username}' is already registered.`);

    const passwordHash = await bcrypt.hash(data.password, 10);
    if (data.school_id && !await prisma.school.findUnique({ where: { id: data.school_id }, select: { id: true } })) {
      throw new ValidationError('Selected school does not exist.');
    }
    if (data.class_id && data.subject_id) {
      const schoolClass = await prisma.schoolClass.findUnique({ where: { id: data.class_id }, select: { id: true, schoolId: true } });
      if (!schoolClass || (data.school_id && schoolClass.schoolId !== data.school_id)) throw new ValidationError('Choose a class from the selected school.');
      if (!await prisma.subject.findUnique({ where: { id: data.subject_id }, select: { id: true } })) throw new ValidationError('Selected subject does not exist.');
    }
    let teacher;
    try {
      teacher = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
        data: {
          name: data.name,
          username,
          passwordHash,
          role: 'TEACHER',
          isActive: true,
          email: data.email || null,
          phone: data.phone?.trim() || null,
          location: data.location?.trim() || null,
          teacher: {
            create: data.school_id
              ? { schoolId: data.school_id, employeeNumber: data.employee_number?.trim() || null }
              : {
                  employeeNumber: data.employee_number?.trim() || null,
                  school: { create: {
                    schoolName: data.new_school!.school_name,
                    address: data.new_school!.address || null,
                    city: data.new_school!.city || null,
                    district: data.new_school!.district || null,
                    state: data.new_school!.state || null,
                    pincode: data.new_school!.pincode || null
                  } }
                }
          }
        },
        select: {
          id: true,
          name: true,
          username: true,
          isActive: true,
          createdAt: true,
          email: true,
          phone: true,
          location: true,
          teacher: { select: { employeeNumber: true, schoolId: true, school: { select: { schoolName: true } } } }
        }
        });
        if (data.class_id && data.subject_id) {
          const profile = await tx.teacher.findUniqueOrThrow({ where: { userId: created.id }, select: { id: true } });
          await tx.teacherClassAssignment.create({ data: { teacherId: profile.id, classId: data.class_id, subjectId: data.subject_id } });
        }
        return created;
      });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictError(`Username '${username}' is already registered.`);
      throw error;
    }

    return {
      id: teacher.id,
      name: teacher.name,
      username: teacher.username,
      email: teacher.email,
      phone: teacher.phone,
      location: teacher.location,
      school_name: teacher.teacher?.school.schoolName || '',
      school_id: teacher.teacher?.schoolId || '',
      employee_number: teacher.teacher?.employeeNumber || null,
      is_active: teacher.isActive,
      created_at: teacher.createdAt.toISOString()
    };
  }
}
