import { ClassRepository } from '../repositories/class.repository';
import { SectionRepository } from '../repositories/section.repository';
import { CreateClassDto, UpdateClassDto, CreateSectionDto, UpdateSectionDto, QueryClassDto, QuerySectionDto, CreateAssignmentDto } from '../dto/academics.dto';
import { AppError } from '../../../errors/AppError';
import prisma from '../../../database/prisma';
import { BulkCreateDto } from '../validators/bulk.validator';

export class AcademicService {
  constructor(
    private readonly classRepo: ClassRepository,
    private readonly sectionRepo: SectionRepository
  ) {}

  // ================= CLASS LOGIC =================

  async createClass(dto: CreateClassDto, schoolId: string, creatorId: string) {
    // PRD Rule: Validate Academic Session
    const session = await prisma.academicSession.findFirst({
      where: { id: dto.academicSessionId, schoolId }
    });
    if (!session) throw new AppError('Invalid Academic Session', 400);

    // PRD Rule: Enforce Unique Name within Session
    const existing = await this.classRepo.findByNameAndSession(dto.name, dto.academicSessionId, schoolId);
    if (existing) throw new AppError(`Class '${dto.name}' already exists in this session`, 409);

    // Log the action in Audit Trail automatically via DB Triggers or manually here if needed
    return this.classRepo.create({ ...dto, schoolId, createdBy: creatorId });
  }

  async getClasses(schoolId: string, query: QueryClassDto) {
    const skip = (query.page - 1) * query.limit;
    return this.classRepo.findMany(schoolId, { ...query, skip, take: query.limit });
  }

  async updateClass(id: string, schoolId: string, dto: UpdateClassDto, updaterId: string) {
    try {
      return await this.classRepo.update(id, schoolId, { ...dto, updatedBy: updaterId });
    } catch {
      throw new AppError('Class not found or unauthorized', 404);
    }
  }

  async archiveClass(id: string, schoolId: string, updaterId: string) {
    // PRD Rule: Soft Delete only
    return this.updateClass(id, schoolId, { status: 'ARCHIVED' }, updaterId);
  }

  // ================= SECTION LOGIC & CAPACITY =================

  async createSection(dto: CreateSectionDto, schoolId: string) {
    const cls = await this.classRepo.findById(dto.classId, schoolId);
    if (!cls) throw new AppError('Invalid Class ID', 400);

    const existing = await this.sectionRepo.findByNameAndClass(dto.name, dto.classId);
    if (existing) throw new AppError(`Section '${dto.name}' already exists for this class`, 409);

    return this.sectionRepo.create(dto);
  }

  async getSections(schoolId: string, query: QuerySectionDto) {
    const skip = (query.page - 1) * query.limit;
    const result = await this.sectionRepo.findMany(schoolId, { ...query, skip, take: query.limit });

    // PRD Rule: Dynamic Capacity Calculation (Available Seats = Capacity - Current Strength)
    const sectionsWithCapacity = await Promise.all(result.data.map(async (sec) => {
      // Calculate how many students are in this class
      const currentStrength = await prisma.student.count({ where: { classId: sec.classId } });
      
      return {
        ...sec,
        currentStrength, // Use the variable
        availableSeats: sec.capacity - currentStrength // Calculate dynamic capacity
      };
    }));

    return { data: sectionsWithCapacity, total: result.total };
  }

  async updateSection(id: string, schoolId: string, dto: UpdateSectionDto) {
    const existing = await this.sectionRepo.findById(id, schoolId);
    if (!existing) throw new AppError('Section not found', 404);
    return this.sectionRepo.update(id, dto);
  }

  async archiveSection(id: string, schoolId: string) {
    const existing = await this.sectionRepo.findById(id, schoolId);
    if (!existing) throw new AppError('Section not found', 404);
    return this.sectionRepo.update(id, { status: 'ARCHIVED' });
  }

  // ================= TEACHER ASSIGNMENT =================

  async assignClassTeacher(dto: CreateAssignmentDto, schoolId: string) {
    // Verify Teacher belongs to this school and has TEACHER role
    const teacher = await prisma.user.findFirst({
      where: { id: dto.teacherId, schoolId, role: 'TEACHER', isActive: true }
    });
    if (!teacher) throw new AppError('Invalid Teacher ID or teacher is not active in this school', 400);

    // Verify Class/Section ownership
    const cls = await this.classRepo.findById(dto.classId, schoolId);
    if (!cls) throw new AppError('Invalid Class ID', 400);

    if (dto.sectionId) {
      const sec = await this.sectionRepo.findById(dto.sectionId, schoolId);
      if (!sec || sec.classId !== dto.classId) throw new AppError('Invalid Section ID for this class', 400);
    }

    return prisma.classTeacherAssignment.create({ data: dto });
  }

  async bulkCreate(dto: BulkCreateDto, schoolId: string, creatorId: string) {
    // Verify Academic Session
    const session = await prisma.academicSession.findFirst({
      where: { id: dto.academicSessionId, schoolId }
    });
    if (!session) throw new AppError('Invalid Academic Session', 400);

    // Use a transaction to ensure atomicity
    return prisma.$transaction(async (tx) => {
      const createdData = [];

      for (const cls of dto.classes) {
        // 1. Check for duplicate class in session
        const existingClass = await tx.class.findFirst({
          where: { name: cls.name, academicSessionId: dto.academicSessionId, schoolId }
        });
        if (existingClass) throw new AppError(`Class '${cls.name}' already exists. Rollback initiated.`, 409);

        // 2. Create the Class
        const newClass = await tx.class.create({
          data: {
            schoolId,
            academicSessionId: dto.academicSessionId,
            name: cls.name,
            code: cls.code,
            displayOrder: cls.displayOrder,
            description: cls.description,
            createdBy: creatorId,
          }
        });

        // 3. Create the Sections
        const sectionsData = cls.sections.map((sec: any) => ({
          classId: newClass.id,
          name: sec.name,
          capacity: sec.capacity,
          roomNumber: sec.roomNumber
        }));

        await tx.section.createMany({ data: sectionsData });

        // Fetch back sections to return in response
        const createdSections = await tx.section.findMany({ where: { classId: newClass.id } });
        createdData.push({ ...newClass, sections: createdSections });
      }

      return createdData;
    });
  }
}