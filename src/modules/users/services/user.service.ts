import { Role } from '@prisma/client';
import { UserRepository } from '../repositories/user.repository';
import { CreateUserDto, UpdateUserDto, QueryUsersDto } from '../dto/user.dto';
import { AppError } from '../../../errors/AppError';
import { ForbiddenError } from '../../../errors/AuthError'; // FIXED: Correct import path
import { hashPassword } from '../../../utils/password.util';
import prisma from '../../../database/prisma';

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private validateCreationPrivileges(creatorRole: Role, targetRole: Role): void {
    // FIXED: Using allowlist logic to entirely avoid TS enum overlap errors
    if (creatorRole !== 'SUPER_ADMIN' && creatorRole !== 'SCHOOL_ADMIN') {
      throw new ForbiddenError('Your role is not authorized to create users.');
    }
    
    if (creatorRole === 'SCHOOL_ADMIN' && targetRole === 'SUPER_ADMIN') {
      throw new ForbiddenError('School Administrators cannot provision Super Administrators.');
    }
  }

  async provisionUser(
    dto: CreateUserDto, 
    creatorId: string, 
    creatorRole: Role, 
    creatorSchoolId: string | null, 
    ipAddress?: string
  ) {
    this.validateCreationPrivileges(creatorRole, dto.role);

    // Tenant Check: School Admins can only create users for their own school
    if (creatorRole === 'SCHOOL_ADMIN' && dto.schoolId !== creatorSchoolId) {
       throw new ForbiddenError('Tenant isolation violation. Cannot provision users for other schools.');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      throw new AppError('A user with this email already exists', 409, 'USER_ALREADY_EXISTS');
    }

    const tempPassword = this.generateTemporaryPassword();
    const hashedPassword = await hashPassword(tempPassword);

    const userData: any = {
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      role: dto.role,
      passwordHash: hashedPassword,
      temporaryPasswordRequired: true,
      createdBy: creatorId,
    };

    // Handle cross-module creation (Super Admin onboarding a new school)
    if (dto.newSchool && creatorRole === 'SUPER_ADMIN') {
      userData.school = {
        create: { name: dto.newSchool.name, code: dto.newSchool.code }
      };
    } else if (dto.schoolId) {
      userData.schoolId = dto.schoolId;
    } else if (creatorSchoolId) {
      userData.schoolId = creatorSchoolId;
    }

    const newUser = await this.userRepository.create(userData);

    // Create Audit Trail
    await prisma.auditLog.create({
      data: { actorId: creatorId, action: 'USER_PROVISIONED', entityType: 'USER', entityId: newUser.id, ipAddress }
    });

    return {
      userId: newUser.id,
      email: newUser.email,
      temporaryPassword: tempPassword, 
      message: 'Securely store this temporary password. It will not be shown again.'
    };
  }

  async listUsers(schoolId: string | null, query: QueryUsersDto) {
    const where: any = {};
    
    if (query.role) where.role = query.role;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    const skip = (query.page - 1) * query.limit;
    
    return this.userRepository.findMany(schoolId, {
      skip,
      take: query.limit,
      where
    });
  }

  async updateUser(id: string, schoolId: string | null, dto: UpdateUserDto) {
    try {
      return await this.userRepository.update(id, schoolId, dto);
    } catch (error: any) {
      if (error.message === 'TENANT_VIOLATION') throw new ForbiddenError('You do not have permission to modify this user.');
      throw error;
    }
  }
}