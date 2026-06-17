import { Role, AccountStatus, TeacherStatus, Prisma } from '@prisma/client';
import prisma from '../../../database/prisma';
import { teacherRepository } from '../repositories/teacher.repository';
import { hashPassword } from '../../../utils/password.util';
import { AppError } from '../../../errors/AppError';
import crypto from 'crypto';
import { 
  CreateTeacherDto, 
  UpdateTeacherDto, 
  AssignClassTeacherDto 
} from '../validators/teacher.validator';

export class TeacherService {
  
  // FR-01 & FR-02: Auto User Account Creation + Transaction
  async createTeacher(schoolId: string, adminId: string, dto: CreateTeacherDto) {
    // Check if Employee ID is already in use in this school
    const existingEmp = await prisma.teacher.findFirst({
      where: { schoolId, employeeId: dto.employeeId }
    });
    if (existingEmp) {
      throw new AppError('Employee ID already exists in this school', 400);
    }

    // Generate random temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const passwordHash = await hashPassword(tempPassword);

    // Reliable Transaction: Rollback on any failure
    const newTeacher = await prisma.$transaction(async (tx) => {
      let addressId: string | undefined;

      // 1. Create Address if provided
      if (dto.address) {
        const address = await tx.address.create({ data: dto.address });
        addressId = address.id;
      }

      // 2. Create Authentication User
      const user = await tx.user.create({
        data: {
          school: { connect: { id: schoolId } },
          email: dto.email,
          passwordHash,
          role: Role.TEACHER,
          accountStatus: AccountStatus.INACTIVE, // PRD specifies PENDING_ACTIVATION, using INACTIVE as alias
          isActive: false,
          fullName: `${dto.firstName} ${dto.lastName}`.trim(),
          phone: dto.phone,
          temporaryPasswordRequired: true,
          createdBy: adminId,
        }
      });

      // 3. Create Teacher Profile
      const teacher = await teacherRepository.createWithUserTx(tx, {
        school: { connect: { id: schoolId } },
        user: { connect: { id: user.id } },
        address: addressId ? { connect: { id: addressId } } : undefined,
        employeeId: dto.employeeId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        gender: dto.gender,
        email: dto.email,
        phone: dto.phone,
        alternatePhone: dto.alternatePhone,
        bloodGroup: dto.bloodGroup,
        maritalStatus: dto.maritalStatus,
        photoUrl: dto.photoUrl,
        qualification: dto.qualification,
        experienceYears: dto.experienceYears,
        department: dto.department,
        designation: dto.designation,
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null,
        employmentType: dto.employmentType,
        createdBy: adminId
      });

      // 4. Create Audit Log
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'TEACHER_CREATED',
          entityType: 'TEACHER',
          entityId: teacher.id,
        }
      });

      return teacher;
    });

    // In a real scenario, trigger an email service here with `tempPassword`
    return { teacher: newTeacher, tempPassword }; 
  }

  // FR-04 & FR-07: Teacher Retrieval & Search
  async getTeachers(schoolId: string, filters: any) {
    const { page, limit, search, department, designation, status, sortBy, sortOrder } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.TeacherWhereInput = {};
    
    if (department) where.department = department;
    if (designation) where.designation = designation;
    if (status) where.status = status;
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const { data, total } = await teacherRepository.findAll(schoolId, {
      skip,
      take: limit,
      where,
      orderBy: { [sortBy]: sortOrder },
    });

    return {
      metadata: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data,
    };
  }

  async getTeacherById(schoolId: string, id: string) {
    const teacher = await teacherRepository.findById(schoolId, id);
    if (!teacher) throw new AppError('Teacher not found', 404);
    
    // Fetch active assignments (FR-10 Dashboard Summary requirement)
    const activeAssignments = await prisma.classTeacherAssignment.findMany({
      where: { teacherId: teacher.userId, endDate: null },
      include: { class: true, section: true }
    });

    return { ...teacher, activeAssignments };
  }

  // FR-05: Update Teacher
  async updateTeacher(schoolId: string, id: string, dto: UpdateTeacherDto, adminId: string) {
    const existing = await teacherRepository.findById(schoolId, id);
    if (!existing) throw new AppError('Teacher not found', 404);

    const data: Prisma.TeacherUpdateInput = {
      phone: dto.phone,
      alternatePhone: dto.alternatePhone,
      email: dto.email,
      qualification: dto.qualification,
      experienceYears: dto.experienceYears,
      designation: dto.designation,
      department: dto.department,
      photoUrl: dto.photoUrl,
      updatedBy: adminId,
    };

    if (dto.address) {
      if (existing.addressId) {
        data.address = { update: dto.address };
      } else {
        // Enforce required fields if creating a new address during an update
        const { addressLine1, city, state, zipCode } = dto.address;
        if (!addressLine1 || !city || !state || !zipCode) {
          throw new AppError('AddressLine1, city, state, and zipCode are required to add a new address.', 400);
        }
        data.address = { 
          create: { 
            addressLine1, 
            city, 
            state, 
            zipCode,
            addressLine2: dto.address.addressLine2,
            country: dto.address.country ?? 'India'
          } 
        };
      }
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.teacher.update({ where: { id }, data });
      
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'TEACHER_UPDATED',
          entityType: 'TEACHER',
          entityId: updated.id,
        }
      });
      return updated;
    });
  }

  // FR-06: Soft Delete / Status Update
  async updateStatus(schoolId: string, id: string, status: TeacherStatus, adminId: string) {
    if (status === TeacherStatus.INACTIVE) {
      return teacherRepository.softDelete(schoolId, id, adminId);
    }
    
    return prisma.$transaction(async (tx) => {
      const updated = await tx.teacher.update({
        where: { id },
        data: { status, updatedBy: adminId }
      });
      await tx.auditLog.create({
        data: { actorId: adminId, action: 'TEACHER_STATUS_CHANGED', entityType: 'TEACHER', entityId: id }
      });
      return updated;
    });
  }

  // FR-08: Assign Class Teacher
  async assignClassTeacher(schoolId: string, teacherId: string, dto: AssignClassTeacherDto, adminId: string) {
    const teacher = await teacherRepository.findById(schoolId, teacherId);
    if (!teacher || teacher.status !== TeacherStatus.ACTIVE) {
      throw new AppError('Active teacher not found', 404);
    }

    // Check if section already has a primary class teacher
    const existingAssignment = await prisma.classTeacherAssignment.findFirst({
      where: {
        classId: dto.classId,
        sectionId: dto.sectionId || null,
        endDate: null,
        assignmentType: 'PRIMARY'
      }
    });

    if (existingAssignment && dto.assignmentType === 'PRIMARY') {
      throw new AppError('This class/section already has an active primary teacher', 400);
    }

    return prisma.$transaction(async (tx) => {
      const assignment = await teacherRepository.assignClassTeacher(tx, {
        class: { connect: { id: dto.classId } },
        ...(dto.sectionId && { section: { connect: { id: dto.sectionId } } }),
        teacher: { connect: { id: teacher.userId } }, // Links to the Auth User ID
        assignmentType: dto.assignmentType,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      });

      await tx.auditLog.create({
        data: { actorId: adminId, action: 'CLASS_TEACHER_ASSIGNED', entityType: 'TEACHER', entityId: teacher.id }
      });

      return assignment;
    });
  }
}

export const teacherService = new TeacherService();