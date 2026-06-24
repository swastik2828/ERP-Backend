import { ResultService } from '../services/result.service';
import prisma from '../../../database/prisma';
import { ResultStatus } from '@prisma/client';
import { AppError } from '../../../errors/AppError';

// Mock Prisma
jest.mock('../../../database/prisma', () => ({
  exam: { findUnique: jest.fn() },
  gradeScale: { findMany: jest.fn() },
  examSubject: { findMany: jest.fn() },
  studentMark: { findMany: jest.fn() },
  $transaction: jest.fn((callback) => callback(prisma)),
  result: { deleteMany: jest.fn(), createMany: jest.fn() },
  auditLog: { create: jest.fn() }
}));

describe('ResultService - Generate Class Results', () => {
  let resultService: ResultService;

  const mockSchoolId = 'school-1';
  const mockExamId = 'exam-1';
  const mockClassId = 'class-1';
  const mockUserId = 'user-1';

  beforeEach(() => {
    resultService = new ResultService();
    jest.clearAllMocks();

    // Default Exam Mock
    (prisma.exam.findUnique as jest.Mock).mockResolvedValue({
      id: mockExamId,
      schoolId: mockSchoolId,
      isLocked: false
    });

    // Default Grade Scale Mock (PRD Edge Case: Boundary conditions)
    (prisma.gradeScale.findMany as jest.Mock).mockResolvedValue([
      { minPercentage: 91, maxPercentage: 100, grade: 'A1', gradePoint: 10 },
      { minPercentage: 81, maxPercentage: 90.99, grade: 'A2', gradePoint: 9 },
      { minPercentage: 33, maxPercentage: 80.99, grade: 'PASS', gradePoint: 5 },
      { minPercentage: 0, maxPercentage: 32.99, grade: 'FAIL', gradePoint: 0 }
    ]);

    // Default Subjects Mock
    (prisma.examSubject.findMany as jest.Mock).mockResolvedValue([
      { id: 'sub-math', examId: mockExamId, classId: mockClassId, maxMarks: 100, passMarks: 33 },
      { id: 'sub-sci', examId: mockExamId, classId: mockClassId, maxMarks: 100, passMarks: 33 }
    ]);
  });

  it('should successfully calculate standard passes and rankings', async () => {
    (prisma.studentMark.findMany as jest.Mock).mockResolvedValue([
      { studentId: 'stu-1', examSubjectId: 'sub-math', marksObtained: 95 },
      { studentId: 'stu-1', examSubjectId: 'sub-sci', marksObtained: 90 }, // Total: 185/200 -> 92.5%
      
      { studentId: 'stu-2', examSubjectId: 'sub-math', marksObtained: 85 },
      { studentId: 'stu-2', examSubjectId: 'sub-sci', marksObtained: 80 }  // Total: 165/200 -> 82.5%
    ]);

    (prisma.result.createMany as jest.Mock).mockResolvedValue({ count: 2 });

    await resultService.generateClassResults(mockExamId, mockClassId, mockSchoolId, mockUserId);

    // Verify correct calculations were sent to the database
    const createManyCalls = (prisma.result.createMany as jest.Mock).mock.calls[0][0].data;
    
    // Stu-1 validations
    const stu1Result = createManyCalls.find((r: any) => r.studentId === 'stu-1');
    expect(stu1Result.percentage).toBe(92.5);
    expect(stu1Result.grade).toBe('A1');
    expect(stu1Result.rank).toBe(1);
    expect(stu1Result.resultStatus).toBe(ResultStatus.PASS);

    // Stu-2 validations
    const stu2Result = createManyCalls.find((r: any) => r.studentId === 'stu-2');
    expect(stu2Result.percentage).toBe(82.5);
    expect(stu2Result.grade).toBe('A2');
    expect(stu2Result.rank).toBe(2);
  });

  it('PRD Edge Case: Student absent in one subject should trigger FAIL status', async () => {
    (prisma.studentMark.findMany as jest.Mock).mockResolvedValue([
      { studentId: 'stu-1', examSubjectId: 'sub-math', marksObtained: 95 }
      // Missing sub-sci entirely
    ]);

    await resultService.generateClassResults(mockExamId, mockClassId, mockSchoolId, mockUserId);
    
    const createManyCalls = (prisma.result.createMany as jest.Mock).mock.calls[0][0].data;
    const stu1Result = createManyCalls[0];
    
    expect(stu1Result.resultStatus).toBe(ResultStatus.FAIL);
    expect(stu1Result.totalMarks).toBe(200); // Should still evaluate against total possible marks
    expect(stu1Result.obtainedMarks).toBe(95); 
  });

  it('PRD Edge Case: Percentage rounding and Exact boundary grade handling', async () => {
    (prisma.studentMark.findMany as jest.Mock).mockResolvedValue([
      // 181.99 / 200 = 90.995% -> Rounded to 91.00% -> Should push from A2 to A1
      { studentId: 'stu-1', examSubjectId: 'sub-math', marksObtained: 91.99 },
      { studentId: 'stu-1', examSubjectId: 'sub-sci', marksObtained: 90 }
    ]);

    await resultService.generateClassResults(mockExamId, mockClassId, mockSchoolId, mockUserId);
    
    const createManyCalls = (prisma.result.createMany as jest.Mock).mock.calls[0][0].data;
    const stu1Result = createManyCalls[0];
    
    expect(stu1Result.percentage).toBe(91); // Verifies rounding
    expect(stu1Result.grade).toBe('A1'); // Verifies boundary threshold jump
  });

  it('should throw an error if the exam is locked', async () => {
    (prisma.exam.findUnique as jest.Mock).mockResolvedValue({
      id: mockExamId,
      schoolId: mockSchoolId,
      isLocked: true
    });

    await expect(
      resultService.generateClassResults(mockExamId, mockClassId, mockSchoolId, mockUserId)
    ).rejects.toThrow(AppError);
  });
});