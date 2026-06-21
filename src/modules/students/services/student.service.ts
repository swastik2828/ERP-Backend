import {  StudentStatus, AcademicEventType } from '@prisma/client';
import { prisma } from '../../../database/prisma';
import { AppError } from '../../../errors/AppError'; // Assuming custom error class

export class StudentService {
  /**
   * Promotes a student to the next class/section[cite: 93].
   */
  async promoteStudent(
    studentId: string,
    schoolId: string,
    payload: { newClassId: string; newSectionId?: string; academicSessionId: string; reason?: string },
    auditUserId: string
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch current student state
      const student = await tx.student.findFirst({
        where: { id: studentId, schoolId, deletedAt: null }
      });

      if (!student) throw new AppError('Student not found', 404);
      if (student.status !== StudentStatus.ACTIVE) throw new AppError('Only active students can be promoted', 400);

      // 2. Update Student Record
      const updatedStudent = await tx.student.update({
        where: { id: studentId },
        data: {
          classId: payload.newClassId,
          sectionId: payload.newSectionId,
        }
      });

      // 3. Generate Immutable Academic History 
      await tx.academicHistory.create({
        data: {
          studentId,
          academicSessionId: payload.academicSessionId,
          previousClassId: student.classId,
          newClassId: payload.newClassId,
          previousSectionId: student.sectionId,
          newSectionId: payload.newSectionId,
          eventType: AcademicEventType.PROMOTION,
          notes: payload.reason || 'Standard Academic Promotion',
          createdBy: auditUserId
        }
      });

      // 4. Generate Enterprise Audit Log 
      await tx.auditLog.create({
        data: {
          actorId: auditUserId,
          action: 'PROMOTE',
          entityType: 'STUDENT',
          entityId: studentId,
        }
      });

      return updatedStudent;
    });
  }

  /**
   * Transfers a student (Internal/External)[cite: 108].
   */
  async transferStudent(
    studentId: string,
    schoolId: string,
    payload: { transferType: 'INTERNAL' | 'EXTERNAL'; destinationSchool?: string; tcNumber?: string; reason: string },
    auditUserId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const updatedStudent = await tx.student.update({
        where: { id: studentId, schoolId },
        data: { status: StudentStatus.TRANSFERRED } // Enforces PRD Status Engine [cite: 254]
      });

      await tx.academicHistory.create({
        data: {
          studentId,
          eventType: AcademicEventType.TRANSFER,
          notes: `Transfer Type: ${payload.transferType}. Dest: ${payload.destinationSchool || 'N/A'}. TC: ${payload.tcNumber || 'N/A'}. Reason: ${payload.reason}`,
          createdBy: auditUserId
        }
      });

      await tx.auditLog.create({
        data: { actorId: auditUserId, action: 'TRANSFER', entityType: 'STUDENT', entityId: studentId }
      });

      return updatedStudent;
    });
  }

  /**
   * Withdraws a student[cite: 120].
   */
  async withdrawStudent(
    studentId: string,
    schoolId: string,
    payload: { reason: string; supportingNotes?: string },
    auditUserId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const updatedStudent = await tx.student.update({
        where: { id: studentId, schoolId },
        data: { status: StudentStatus.WITHDRAWN }
      });

      await tx.academicHistory.create({
        data: {
          studentId,
          eventType: AcademicEventType.WITHDRAWN,
          notes: `Reason: ${payload.reason}. Notes: ${payload.supportingNotes || ''}`,
          createdBy: auditUserId
        }
      });

      await tx.auditLog.create({
        data: { actorId: auditUserId, action: 'WITHDRAW', entityType: 'STUDENT', entityId: studentId }
      });

      return updatedStudent;
    });
  }

  /**
   * Graduates a student[cite: 129].
   */
  async graduateStudent(studentId: string, schoolId: string, finalSessionId: string, auditUserId: string) {
    return prisma.$transaction(async (tx) => {
      const student = await tx.student.findUnique({ where: { id: studentId } });
      
      const updatedStudent = await tx.student.update({
        where: { id: studentId, schoolId },
        data: { status: StudentStatus.GRADUATED }
      });

      await tx.academicHistory.create({
        data: {
          studentId,
          academicSessionId: finalSessionId,
          previousClassId: student?.classId,
          eventType: AcademicEventType.GRADUATION,
          notes: 'Student officially graduated',
          createdBy: auditUserId
        }
      });

      await tx.auditLog.create({
        data: { actorId: auditUserId, action: 'GRADUATE', entityType: 'STUDENT', entityId: studentId }
      });

      return updatedStudent;
    });
  }

  /**
   * New Student Admission
   */
  async createStudent(schoolId: string, payload: any, auditUserId: string) {
    const dob = new Date(payload.dateOfBirth);
    if (dob > new Date()) {
      throw new AppError('Date of Birth cannot be a future date', 400); // PRD Rule Validation
    }

    // Check for unique constraints within the school
    const existingStudent = await prisma.student.findFirst({
      where: {
        OR: [
          { admissionNumber: payload.admissionNumber, schoolId },
          { aadharNumber: payload.aadharNumber }
        ]
      }
    });

    if (existingStudent) {
      throw new AppError('Admission Number or Aadhaar already exists', 400);
    }

    return prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          schoolId,
          classId: payload.classId,
          sectionId: payload.sectionId,
          admissionNumber: payload.admissionNumber,
          firstName: payload.firstName,
          lastName: payload.lastName,
          dateOfBirth: dob,
          gender: payload.gender,
          createdBy: auditUserId,
          status: StudentStatus.ACTIVE
        }
      });

      await tx.academicHistory.create({
        data: {
          studentId: student.id,
          academicSessionId: payload.academicSessionId,
          newClassId: payload.classId,
          newSectionId: payload.sectionId,
          eventType: AcademicEventType.ADMISSION,
          notes: 'Initial Admission',
          createdBy: auditUserId
        }
      });

      await tx.auditLog.create({
        data: { actorId: auditUserId, action: 'CREATE', entityType: 'STUDENT', entityId: student.id }
      });

      return student;
    });
  }

  /**
   * Update Student Profile
   */
  async updateStudent(studentId: string, schoolId: string, payload: any, auditUserId: string) {
    // PRD: Restrictions on immutable fields without special permissions
    const forbiddenKeys = ['admissionNumber', 'schoolId', 'createdBy'];
    const hasForbiddenUpdate = forbiddenKeys.some(key => Object.keys(payload).includes(key));
    
    if (hasForbiddenUpdate) {
      throw new AppError('Cannot update immutable fields (admissionNumber, schoolId, createdBy)', 403);
    }

    return prisma.$transaction(async (tx) => {
      const student = await tx.student.update({
        where: { id: studentId, schoolId },
        data: payload
      });

      await tx.auditLog.create({
        data: { actorId: auditUserId, action: 'UPDATE', entityType: 'STUDENT', entityId: studentId }
      });

      return student;
    });
  }

  /**
   * Reactivate Student
   */
  async reactivateStudent(studentId: string, schoolId: string, auditUserId: string) {
    return prisma.$transaction(async (tx) => {
      const student = await tx.student.findUnique({ where: { id: studentId } });
      
      if (student?.status === StudentStatus.ARCHIVED) {
        throw new AppError('Cannot reactivate permanently archived students', 400);
      }

      const updatedStudent = await tx.student.update({
        where: { id: studentId, schoolId },
        data: { status: StudentStatus.ACTIVE }
      });

      await tx.academicHistory.create({
        data: {
          studentId,
          eventType: AcademicEventType.REACTIVATED,
          notes: 'Student account reactivated',
          createdBy: auditUserId
        }
      });

      await tx.auditLog.create({
        data: { actorId: auditUserId, action: 'REACTIVATE', entityType: 'STUDENT', entityId: studentId }
      });

      return updatedStudent;
    });
  }
}