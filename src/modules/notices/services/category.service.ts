import prisma from '../../../database/prisma';
import { CreateCategoryDto } from '../dtos/notices.dto';
import { AppError } from '../../../errors/AppError';

export class CategoryService {
  async createCategory(schoolId: string, dto: CreateCategoryDto) {
    const existing = await prisma.noticeCategory.findUnique({
      where: { schoolId_code: { schoolId, code: dto.code } }
    });
    if (existing) throw new AppError('Category code already exists', 409);

    return prisma.noticeCategory.create({
      data: { ...dto, schoolId }
    });
  }

  async getCategories(schoolId: string) {
    return prisma.noticeCategory.findMany({
      where: { schoolId, isActive: true },
      orderBy: { displayOrder: 'asc' }
    });
  }

  async updateCategory(schoolId: string, id: string, dto: Partial<CreateCategoryDto>) {
    const category = await prisma.noticeCategory.findFirst({ where: { id, schoolId } });
    if (!category) throw new AppError('Category not found', 404);

    return prisma.noticeCategory.update({
      where: { id },
      data: dto
    });
  }

  async deleteCategory(schoolId: string, id: string) {
    const category = await prisma.noticeCategory.findFirst({ where: { id, schoolId } });
    if (!category) throw new AppError('Category not found', 404);

    return prisma.noticeCategory.update({
      where: { id },
      data: { isActive: false }
    });
  }
}