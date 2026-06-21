import {  Prisma } from '@prisma/client';
import { prisma } from '../../../database/prisma';

export class StudentSearchRepository {
  /**
   * Global & Advanced Student Search Engine
   */
  async search(schoolId: string, queryParams: any) {
    const { 
      search, // Global text search
      classId, sectionId, gender, status, bloodGroup 
    } = queryParams;

    const whereClause: Prisma.StudentWhereInput = {
      schoolId,
      deletedAt: null, // Always exclude soft-deleted records [cite: 33]
    };

    // Advanced Filters [cite: 245-251]
    if (classId) whereClause.classId = classId;
    if (sectionId) whereClause.sectionId = sectionId;
    if (gender) whereClause.gender = gender;
    if (status) whereClause.status = status;
    if (bloodGroup) whereClause.bloodGroup = bloodGroup;

    // Global Search (Admission No, Name, Aadhaar) [cite: 238-244]
    if (search) {
      whereClause.OR = [
        { admissionNumber: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { aadharNumber: { contains: search, mode: 'insensitive' } },
        // Parent Name Search using relational filtering
        {
          parents: {
            some: {
              parent: {
                OR: [
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } }
                ]
              }
            }
          }
        }
      ];
    }

    return prisma.student.findMany({
      where: whereClause,
      include: { class: true, section: true },
      orderBy: { firstName: 'asc' },
      take: 50 // Pagination essential for performance [cite: 375]
    });
  }
}