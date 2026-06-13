import { StudentRepository } from '../repositories/student.repository';
import { AdmissionDto } from '../dto/student.dto'; // Importing from our new dedicated DTO file
import { AppError } from '../../../errors/AppError';
import { hashPassword } from '../../../utils/password.util';
import prisma from '../../../database/prisma';

export class StudentService {
  constructor(private readonly studentRepository: StudentRepository) {}

  /**
   * Generates a simple, secure temporary password for new parent accounts
   */
  private generateTempPassword(): string {
    return Math.random().toString(36).slice(-8) + 'A1!'; 
  }

  /**
   * Handles the complete, atomic admission flow for a new student.
   */
  async admitStudent(dto: AdmissionDto, schoolId: string, creatorId: string) {
    
    // ==========================================
    // 1. PRE-FLIGHT VALIDATION CHECKS
    // ==========================================
    
    // Check for duplicate enrollment number within this specific school
    const existingStudent = await this.studentRepository.findByEnrollmentNumber(dto.student.enrollmentNumber, schoolId);
    if (existingStudent) {
      throw new AppError('A student with this enrollment number already exists', 409, 'DUPLICATE_ENROLLMENT');
    }

    // Check for duplicate Aadhaar (globally across the database to prevent Prisma crashes)
    if (dto.student.aadharNumber) {
      const existingAadhaar = await prisma.student.findUnique({ 
        where: { aadharNumber: dto.student.aadharNumber } 
      });
      if (existingAadhaar) {
        throw new AppError('A student with this Aadhaar number is already registered', 409, 'DUPLICATE_AADHAAR');
      }
    }

    // Verify the provided Class UUID actually exists and belongs to this specific school tenant
    const validClass = await prisma.academicClass.findFirst({
      where: { id: dto.student.classId, schoolId }
    });
    if (!validClass) {
      throw new AppError('Invalid Academic Class selected or class does not belong to this school', 400, 'INVALID_CLASS');
    }

    // ==========================================
    // 2. ATOMIC DATABASE TRANSACTION
    // ==========================================
    // If any of these steps fail, the entire transaction rolls back, preventing orphaned data.
    
    return prisma.$transaction(async (tx) => {
      let parentId = dto.parent.existingParentId;
      let addressId: string | undefined;

      // --- A. Address Creation ---
      if (dto.address) {
        const newAddress = await tx.address.create({ data: dto.address });
        addressId = newAddress.id;
      }

      // --- B. Parent & User Profile Creation ---
      if (!parentId) {
        // Ensure email isn't already used in the Identity Provider (Auth)
        if (dto.parent.email) {
          const existingUser = await tx.user.findUnique({ where: { email: dto.parent.email } });
          if (existingUser) throw new AppError('Parent email already registered. Please use existing parent ID.', 409);
        }

        const tempPassword = this.generateTempPassword();
        const hashedPassword = await hashPassword(tempPassword);

        // 1. Create the Auth User (so the parent can log in)
        const newUser = await tx.user.create({
          data: {
            schoolId,
            email: dto.parent.email || `parent_${Date.now()}@no-email.com`, // Fallback if email is omitted
            passwordHash: hashedPassword,
            role: 'PARENT',
            fullName: `${dto.parent.firstName} ${dto.parent.lastName}`,
            phone: dto.parent.primaryPhone,
            createdBy: creatorId,
            temporaryPasswordRequired: true
          }
        });

        // 2. Create the real-world Parent Profile mapping
        const newParent = await tx.parent.create({
          data: {
            schoolId,
            userId: newUser.id,
            firstName: dto.parent.firstName!,
            lastName: dto.parent.lastName!,
            primaryPhone: dto.parent.primaryPhone!,
            alternatePhone: dto.parent.alternatePhone,
            occupation: dto.parent.occupation,
            addressId
          }
        });

        parentId = newParent.id;
      } else {
        // If existing parent, verify they belong to this school tenant
        const parentRecord = await tx.parent.findFirst({ where: { id: parentId, schoolId } });
        if (!parentRecord) throw new AppError('Parent record not found for this school', 404);
        
        // Inherit sibling's address if a new one wasn't explicitly provided
        if (!addressId) addressId = parentRecord.addressId || undefined; 
      }

      // --- C. Student Creation ---
      const newStudent = await tx.student.create({
        data: {
          schoolId,
          parentId,
          addressId,
          classId: dto.student.classId, // The strictly verified UUID
          enrollmentNumber: dto.student.enrollmentNumber,
          firstName: dto.student.firstName,
          lastName: dto.student.lastName,
          dateOfBirth: dto.student.dateOfBirth,
          gender: dto.student.gender,
          bloodGroup: dto.student.bloodGroup,
          medicalBrief: dto.student.medicalBrief,
          
          // Indian Standards
          fatherName: dto.student.fatherName,
          motherName: dto.student.motherName,
          aadharNumber: dto.student.aadharNumber,
        }
      });

      return newStudent;
    });
  }

  /**
   * Retrieves a paginated list of students isolated to the requesting school.
   */
  async getStudents(schoolId: string, page: number, limit: number, classId?: string, search?: string) {
    const skip = (page - 1) * limit;
    return this.studentRepository.getStudents(schoolId, { skip, take: limit, classId, search });
  }
}