-- CreateEnum
CREATE TYPE "LeaveApplicantType" AS ENUM ('STUDENT', 'PARENT', 'TEACHER', 'STAFF');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('SICK_LEAVE', 'CASUAL_LEAVE', 'EMERGENCY_LEAVE', 'MEDICAL_LEAVE', 'FAMILY_FUNCTION', 'SPORTS_EVENT', 'EXAMINATION', 'EARNED_LEAVE', 'MATERNITY_LEAVE', 'PATERNITY_LEAVE', 'DUTY_LEAVE', 'OTHER');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LeavePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "HalfType" AS ENUM ('FIRST_HALF', 'SECOND_HALF');

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "applicantType" "LeaveApplicantType" NOT NULL,
    "applicantId" UUID NOT NULL,
    "studentId" UUID,
    "submittedBy" UUID NOT NULL,
    "approverId" UUID,
    "leaveType" "LeaveType" NOT NULL,
    "reason" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "halfDay" BOOLEAN NOT NULL DEFAULT false,
    "halfType" "HalfType",
    "priority" "LeavePriority" NOT NULL DEFAULT 'NORMAL',
    "attachment" TEXT,
    "remarks" TEXT,
    "adminRemarks" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leave_requests_schoolId_idx" ON "leave_requests"("schoolId");

-- CreateIndex
CREATE INDEX "leave_requests_status_idx" ON "leave_requests"("status");

-- CreateIndex
CREATE INDEX "leave_requests_applicantId_idx" ON "leave_requests"("applicantId");

-- CreateIndex
CREATE INDEX "leave_requests_approverId_idx" ON "leave_requests"("approverId");

-- CreateIndex
CREATE INDEX "leave_requests_startDate_idx" ON "leave_requests"("startDate");

-- CreateIndex
CREATE INDEX "leave_requests_createdAt_idx" ON "leave_requests"("createdAt");

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
