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
        teacher: { select: { employeeNumber: true, school: { select: { schoolName: true } } } }
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
    let teacher;
    try {
      teacher = await prisma.user.create({
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
          teacher: { select: { employeeNumber: true, school: { select: { schoolName: true } } } }
        }
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
      employee_number: teacher.teacher?.employeeNumber || null,
      is_active: teacher.isActive,
      created_at: teacher.createdAt.toISOString()
    };
  }
}
