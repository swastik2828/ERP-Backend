import prisma from '../../../database/prisma';
import { AppError } from '../../../errors/AppError';
import { ResultStatus } from '@prisma/client';

export class ResultService {
  /**
   * Generates results for all students in a specific class for a given exam
   */
  async generateClassResults(examId: string, classId: string, schoolId: string, userId: string, ipAddress?: string) {
    // 1. Validate Exam & Fetch Grade Scales
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam || exam.schoolId !== schoolId) throw new AppError('Exam not found', 404);
    if (exam.isLocked) throw new AppError('Cannot regenerate results for a locked exam', 403);

    const gradeScales = await prisma.gradeScale.findMany({
      where: { schoolId },
      orderBy: { minPercentage: 'desc' }
    });

    if (!gradeScales.length) throw new AppError('Grade scales not configured for this school', 400);

    // 2. Fetch all mapped subjects for this class in this exam
    const examSubjects = await prisma.examSubject.findMany({
      where: { examId, classId }
    });
    if (!examSubjects.length) throw new AppError('No subjects mapped for this class in this exam', 400);

    // 3. Fetch all verified marks for these subjects
    const subjectIds = examSubjects.map(es => es.id);
    const marks = await prisma.studentMark.findMany({
      where: { examSubjectId: { in: subjectIds }, verifiedAt: { not: null } }
    });

    // Group marks by student
    const studentMarksMap = new Map<string, typeof marks>();
    for (const mark of marks) {
      if (!studentMarksMap.has(mark.studentId)) studentMarksMap.set(mark.studentId, []);
      studentMarksMap.get(mark.studentId)!.push(mark);
    }

    // 4. Calculate Individual Metrics
    const resultsData: any[] = [];

    for (const [studentId, studentMarks] of studentMarksMap.entries()) {
      let totalMaxMarks = 0;
      let totalObtainedMarks = 0;
      let hasFailedSubject = false;
    //   let totalGradePoints = 0;

      for (const es of examSubjects) {
        const markEntry = studentMarks.find(m => m.examSubjectId === es.id);
        totalMaxMarks += es.maxMarks;

        if (!markEntry) {
           // Student absent or marks not entered
           hasFailedSubject = true; 
           continue; 
        }

        totalObtainedMarks += markEntry.marksObtained;
        if (markEntry.marksObtained < es.passMarks) {
          hasFailedSubject = true;
        }
      }

      // Percentage & Grade Calculation
      const percentage = (totalObtainedMarks / totalMaxMarks) * 100;
      const roundedPercentage = Math.round(percentage * 100) / 100;

      const gradeScale = gradeScales.find(g => roundedPercentage >= g.minPercentage && roundedPercentage <= g.maxPercentage);
      const grade = gradeScale ? gradeScale.grade : 'F';
      const gpa = gradeScale ? gradeScale.gradePoint : 0; // Simplified GPA computation

      // Result Status
      const resultStatus = hasFailedSubject ? ResultStatus.FAIL : ResultStatus.PASS;

      // 5. Cross-Module: Fetch Attendance (Simplified for this scope)
      // In production, query AttendanceRecord between academic session start and exam end date.
      const attendancePercentage = 85.5; // Placeholder: Replace with actual attendance aggregation logic

      resultsData.push({
        schoolId,
        examId,
        studentId,
        totalMarks: totalMaxMarks,
        obtainedMarks: totalObtainedMarks,
        percentage: roundedPercentage,
        grade,
        gpa,
        attendancePercentage,
        resultStatus
      });
    }

    // 6. Calculate Ranks (Sort by Percentage Descending)
    resultsData.sort((a, b) => b.percentage - a.percentage);
    let currentRank = 1;
    resultsData.forEach((res, index) => {
      // Handle ties
      if (index > 0 && res.percentage === resultsData[index - 1].percentage) {
        res.rank = resultsData[index - 1].rank;
      } else {
        res.rank = currentRank;
      }
      currentRank++;
    });

    // 7. Transaction: Save Results & Audit
    const result = await prisma.$transaction(async (tx) => {
      // Clear existing unpublished results for this class/exam to prevent duplicates
      const studentIds = Array.from(studentMarksMap.keys());
      await tx.result.deleteMany({
        where: { examId, studentId: { in: studentIds }, publishedAt: null }
      });

      // Insert fresh computed results
      const createdResults = await tx.result.createMany({ data: resultsData });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'RESULT_GENERATED',
          entityType: 'EXAM',
          entityId: examId,
          ipAddress: ipAddress || null,
        }
      });

      return createdResults;
    });

    return result;
  }
}