import prisma from '../../../database/prisma';
// import { AppError } from '../../../errors/AppError';

export class AttendanceReportService {
  async getStudentHistory(studentId: string, schoolId: string, startDate?: string, endDate?: string) {
    const whereClause: any = { studentId, schoolId, deletedAt: null };
    
    if (startDate || endDate) {
      whereClause.attendanceDate = {};
      if (startDate) whereClause.attendanceDate.gte = new Date(startDate);
      if (endDate) whereClause.attendanceDate.lte = new Date(endDate);
    }

    return await prisma.attendanceRecord.findMany({
      where: whereClause,
      orderBy: { attendanceDate: 'desc' },
    });
  }

  async getStudentSummary(studentId: string, schoolId: string, academicSessionId: string) {
    const records = await prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: { studentId, schoolId, academicSessionId, deletedAt: null },
      _count: { status: true },
    });

    let present = 0;
    let absent = 0;
    let holiday = 0;

    records.forEach((record) => {
      if (record.status === 'PRESENT') present = record._count.status;
      if (record.status === 'ABSENT') absent = record._count.status;
      if (record.status === 'HOLIDAY') holiday = record._count.status;
    });

    const totalWorkingDays = present + absent; // Holidays typically don't count towards the attendance denominator
    const percentage = totalWorkingDays > 0 ? ((present / totalWorkingDays) * 100).toFixed(2) : 0;

    return {
      studentId,
      presentDays: present,
      absentDays: absent,
      holidayDays: holiday,
      totalWorkingDays,
      attendancePercentage: Number(percentage),
    };
  }

  async getClassAttendanceSheet(classId: string, schoolId: string, date: string) {
    const attendanceDate = new Date(date);

    // Fetch all active students in the class, along with their attendance for the specific date
    return await prisma.student.findMany({
      where: { classId, schoolId, status: 'ACTIVE', deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true,
        attendanceRecords: {
          where: { attendanceDate },
          select: { status: true, remarks: true, id: true },
        },
      },
      orderBy: { firstName: 'asc' },
    });
  }

  async getDefaulterReport(schoolId: string, academicSessionId: string, threshold: number = 75) {
    // Using Prisma's $queryRaw for high-performance grouped percentage calculations
    const defaulters = await prisma.$queryRaw`
      SELECT 
        "student_id" as "studentId",
        COUNT(CASE WHEN status = 'PRESENT' THEN 1 END)::int as "presentDays",
        COUNT(CASE WHEN status IN ('PRESENT', 'ABSENT') THEN 1 END)::int as "totalWorkingDays",
        ROUND((COUNT(CASE WHEN status = 'PRESENT' THEN 1 END)::numeric / 
               NULLIF(COUNT(CASE WHEN status IN ('PRESENT', 'ABSENT') THEN 1 END), 0)) * 100, 2)::float as "percentage"
      FROM "attendance_records"
      WHERE "school_id" = ${schoolId}::uuid 
        AND "academic_session_id" = ${academicSessionId}::uuid
        AND "deleted_at" IS NULL
      GROUP BY "student_id"
      HAVING (COUNT(CASE WHEN status = 'PRESENT' THEN 1 END)::numeric / 
              NULLIF(COUNT(CASE WHEN status IN ('PRESENT', 'ABSENT') THEN 1 END), 0)) * 100 < ${threshold}
    `;

    // Enrich with student details
    const defaulterIds = (defaulters as any[]).map((d) => d.studentId);
    
    if (defaulterIds.length === 0) return [];

    const students = await prisma.student.findMany({
      where: { id: { in: defaulterIds } },
      select: { id: true, firstName: true, lastName: true, admissionNumber: true, class: { select: { name: true } } }
    });

    // Merge raw aggregations with Prisma strongly-typed student data
    return (defaulters as any[]).map((d) => ({
      ...d,
      student: students.find((s) => s.id === d.studentId)
    }));
  }
}