import prisma from '../../../database/prisma';
import { AppError } from '../../../errors/AppError';
import crypto from 'crypto'; // Native node module for hashing

export class ReportCardService {
  async generateStudentReportCard(studentId: string, examId: string, schoolId: string) {
    // 1. Fetch Result & Ensure it's published
    const result = await prisma.result.findUnique({
      where: {
        examId_studentId: { examId, studentId }
      },
      include: {
        exam: {
          include: { academicSession: true }
        },
        student: {
          include: {
            class: true,
            section: true
          }
        },
        school: true
      }
    });

    if (!result || result.schoolId !== schoolId) {
      throw new AppError('Result not found or access denied.', 404);
    }
    
    // PRD Rule: Report cards should ideally only be available for published results
    if (!result.publishedAt) {
      throw new AppError('Results for this examination have not been published yet.', 403);
    }

    // 2. Fetch Detailed Subject Marks
    const marks = await prisma.studentMark.findMany({
      where: { examId, studentId, schoolId },
      include: {
        examSubject: {
          include: { subject: true }
        }
      }
    });

    const subjectWiseMarks = marks.map(m => ({
      subjectName: m.examSubject.subject.name,
      subjectCode: m.examSubject.subject.code,
      maxMarks: m.examSubject.maxMarks,
      passMarks: m.examSubject.passMarks,
      obtainedMarks: m.marksObtained,
      remarks: m.remarks
    }));

    // 3. Generate QR Verification Token (Cryptographic hash of key result data)
    // In production, this hash could be embedded in a URL pointing to a public validation endpoint
    const verificationPayload = `${result.id}-${result.studentId}-${result.percentage}-${result.grade}`;
    const qrVerificationToken = crypto.createHash('sha256').update(verificationPayload).digest('hex');

    // 4. Assemble Report Card Payload
    return {
      schoolInformation: {
        name: result.school.name,
        code: result.school.code,
      },
      studentInformation: {
        name: `${result.student.firstName} ${result.student.lastName}`,
        admissionNumber: result.student.admissionNumber,
        dateOfBirth: result.student.dateOfBirth
      },
      academicDetails: {
        className: result.student.class.name,
        sectionName: result.student.section?.name || 'N/A',
        academicSession: result.exam.academicSession.name,
        examName: result.exam.name,
        examType: result.exam.examType
      },
      performance: {
        subjectWiseMarks,
        totalMarks: result.totalMarks,
        obtainedMarks: result.obtainedMarks,
        percentage: result.percentage,
        grade: result.grade,
        rank: result.rank,
        gpa: result.gpa,
        resultStatus: result.resultStatus
      },
      attendanceSummary: {
        attendancePercentage: result.attendancePercentage,
      },
      meta: {
        generatedDate: new Date(),
        publishedDate: result.publishedAt,
        qrVerificationToken,
      }
    };
  }
}