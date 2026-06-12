import { Role } from '@prisma/client';
import prisma from '../../../database/prisma';
import { ForbiddenError } from '../../../errors/AuthError';
import { hashPassword } from '../../../utils/password.util';

export class UserService {
  private generateTemporaryPassword(): string {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+';
    const all = upper + lower + numbers + special;

    let password = upper[Math.floor(Math.random() * upper.length)] +
                   lower[Math.floor(Math.random() * lower.length)] +
                   numbers[Math.floor(Math.random() * numbers.length)] +
                   special[Math.floor(Math.random() * special.length)];

    for (let i = 4; i < 12; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  }

  private validateCreationPrivileges(creatorRole: Role, targetRole: Role): void {
    if (creatorRole === 'DATA_ENTRY_ADMIN' || creatorRole === 'TEACHER' || creatorRole === 'PARENT') {
      throw new ForbiddenError('Your role is not authorized to create users.');
    }
    if (creatorRole === 'SCHOOL_ADMIN' && targetRole === 'SUPER_ADMIN') {
      throw new ForbiddenError('School Administrators cannot create Super Administrators.');
    }
  }

  async provisionUser(data: any, creatorId: string, creatorRole: Role, creatorSchoolId: string | null, ipAddress?: string) {
    this.validateCreationPrivileges(creatorRole, data.role);

    if (creatorRole === 'SCHOOL_ADMIN' && data.schoolId !== creatorSchoolId) {
       throw new ForbiddenError('Tenant isolation violation. Cannot provision users for other schools.');
    }

    const tempPassword = this.generateTemporaryPassword();
    const hashedPassword = await hashPassword(tempPassword);

    const userData: any = {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      role: data.role,
      passwordHash: hashedPassword,
      temporaryPasswordRequired: true,
      createdBy: creatorId,
    };

    if (data.newSchool && creatorRole === 'SUPER_ADMIN') {
      userData.school = {
        create: {
          name: data.newSchool.name,
          schoolCode: data.newSchool.schoolCode
        }
      };
    } else if (data.schoolId) {
      userData.schoolId = data.schoolId;
    }

    const newUser = await prisma.user.create({ data: userData });

    await prisma.auditLog.create({
      data: { actorId: creatorId, action: 'USER_CREATION', entityType: 'USER', entityId: newUser.id, ipAddress }
    });

    return {
      userId: newUser.id,
      email: newUser.email,
      temporaryPassword: tempPassword 
    };
  }
}