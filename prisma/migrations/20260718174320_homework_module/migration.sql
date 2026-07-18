-- CreateEnum
CREATE TYPE "RecurringType" AS ENUM ('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FeeAssignmentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('FEE_ASSIGNED', 'PAYMENT', 'DISCOUNT', 'FINE', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'DD', 'ONLINE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ACTIVE', 'CLOSED', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "SubmissionType" AS ENUM ('TEXT', 'FILE', 'TEXT_AND_FILE', 'NONE');

-- CreateEnum
CREATE TYPE "AssignmentSubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'LATE_SUBMITTED', 'RETURNED', 'GRADED', 'LOCKED');

-- CreateEnum
CREATE TYPE "CommentVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateTable
CREATE TABLE "fee_categories" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "recurring_type" "RecurringType" NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_structures" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "academic_session_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "fee_category_id" UUID NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "due_date" DATE NOT NULL,
    "recurrence" "RecurringType" NOT NULL,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_fee_assignments" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "fee_structure_id" UUID NOT NULL,
    "assigned_amount" DOUBLE PRECISION NOT NULL,
    "assigned_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "FeeAssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_fee_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_ledgers" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balance_after" DOUBLE PRECISION NOT NULL,
    "reference_id" UUID,
    "remarks" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "payment_number" VARCHAR(50) NOT NULL,
    "school_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "amount_paid" DOUBLE PRECISION NOT NULL,
    "payment_mode" "PaymentMode" NOT NULL,
    "transaction_reference" VARCHAR(100),
    "remarks" TEXT,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'SUCCESS',
    "collected_by" UUID,
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" UUID NOT NULL,
    "receipt_number" VARCHAR(50) NOT NULL,
    "payment_id" UUID NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generated_by" UUID,
    "pdf_url" VARCHAR(500),

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discounts" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "type" "DiscountType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "approved_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fines" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "academicSessionId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "sectionId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "clarificationNote" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "submissionType" "SubmissionType" NOT NULL DEFAULT 'TEXT_AND_FILE',
    "maxScore" DECIMAL(6,2) NOT NULL DEFAULT 100.00,
    "dueDate" TIMESTAMPTZ NOT NULL,
    "publishAt" TIMESTAMPTZ,
    "publishedAt" TIMESTAMPTZ,
    "gracePeriodHours" SMALLINT NOT NULL DEFAULT 0,
    "allowLateSubmission" BOOLEAN NOT NULL DEFAULT true,
    "lateSubmissionPenaltyPercent" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "allowResubmission" BOOLEAN NOT NULL DEFAULT true,
    "maxAttempts" SMALLINT NOT NULL DEFAULT 1,
    "allowStudentComments" BOOLEAN NOT NULL DEFAULT true,
    "instructionsAttachmentRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,
    "deletedBy" UUID,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_submissions" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "submissionGroupId" UUID NOT NULL,
    "attemptNumber" SMALLINT NOT NULL DEFAULT 1,
    "status" "AssignmentSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "textResponse" TEXT,
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMPTZ,
    "viewedByTeacherAt" TIMESTAMPTZ,
    "score" DECIMAL(6,2),
    "latePenaltyApplied" DECIMAL(5,2),
    "finalScore" DECIMAL(6,2),
    "gradedBy" UUID,
    "gradedAt" TIMESTAMPTZ,
    "returnedAt" TIMESTAMPTZ,
    "lockedAt" TIMESTAMPTZ,
    "idempotencyKey" VARCHAR(128),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,
    "deletedBy" UUID,

    CONSTRAINT "assignment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_audits" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" UUID NOT NULL,
    "action" VARCHAR(60) NOT NULL,
    "actorId" UUID NOT NULL,
    "actorRole" VARCHAR(20) NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "correlationId" UUID NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(500),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignment_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fee_categories_school_id_idx" ON "fee_categories"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_categories_school_id_code_key" ON "fee_categories"("school_id", "code");

-- CreateIndex
CREATE INDEX "fee_structures_school_id_idx" ON "fee_structures"("school_id");

-- CreateIndex
CREATE INDEX "fee_structures_academic_session_id_idx" ON "fee_structures"("academic_session_id");

-- CreateIndex
CREATE INDEX "fee_structures_class_id_idx" ON "fee_structures"("class_id");

-- CreateIndex
CREATE INDEX "student_fee_assignments_student_id_idx" ON "student_fee_assignments"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_fee_assignments_student_id_fee_structure_id_key" ON "student_fee_assignments"("student_id", "fee_structure_id");

-- CreateIndex
CREATE INDEX "fee_ledgers_student_id_idx" ON "fee_ledgers"("student_id");

-- CreateIndex
CREATE INDEX "fee_ledgers_transaction_type_idx" ON "fee_ledgers"("transaction_type");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_number_key" ON "payments"("payment_number");

-- CreateIndex
CREATE INDEX "payments_school_id_idx" ON "payments"("school_id");

-- CreateIndex
CREATE INDEX "payments_student_id_idx" ON "payments"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_receipt_number_key" ON "receipts"("receipt_number");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_payment_id_key" ON "receipts"("payment_id");

-- CreateIndex
CREATE INDEX "receipts_receipt_number_idx" ON "receipts"("receipt_number");

-- CreateIndex
CREATE INDEX "discounts_student_id_idx" ON "discounts"("student_id");

-- CreateIndex
CREATE INDEX "fines_student_id_idx" ON "fines"("student_id");

-- CreateIndex
CREATE INDEX "idx_assignment_school_status" ON "assignments"("schoolId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "idx_assignment_class_section_subject" ON "assignments"("schoolId", "classId", "sectionId", "subjectId", "academicSessionId");

-- CreateIndex
CREATE INDEX "idx_assignment_teacher" ON "assignments"("schoolId", "teacherId", "status");

-- CreateIndex
CREATE INDEX "idx_assignment_due_date" ON "assignments"("schoolId", "dueDate");

-- CreateIndex
CREATE INDEX "idx_assignment_publish_at" ON "assignments"("schoolId", "publishAt");

-- CreateIndex
CREATE INDEX "idx_submission_group" ON "assignment_submissions"("submissionGroupId", "attemptNumber");

-- CreateIndex
CREATE INDEX "idx_submission_status" ON "assignment_submissions"("schoolId", "assignmentId", "status");

-- CreateIndex
CREATE INDEX "idx_submission_student_school" ON "assignment_submissions"("schoolId", "studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_submissions_assignmentId_studentId_attemptNumber_key" ON "assignment_submissions"("assignmentId", "studentId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_submissions_schoolId_idempotencyKey_key" ON "assignment_submissions"("schoolId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "idx_audit_entity" ON "assignment_audits"("schoolId", "entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_audit_actor" ON "assignment_audits"("schoolId", "actorId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_audit_correlation" ON "assignment_audits"("correlationId");

-- AddForeignKey
ALTER TABLE "fee_categories" ADD CONSTRAINT "fee_categories_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_academic_session_id_fkey" FOREIGN KEY ("academic_session_id") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_fee_category_id_fkey" FOREIGN KEY ("fee_category_id") REFERENCES "fee_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_assignments" ADD CONSTRAINT "student_fee_assignments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_assignments" ADD CONSTRAINT "student_fee_assignments_fee_structure_id_fkey" FOREIGN KEY ("fee_structure_id") REFERENCES "fee_structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_ledgers" ADD CONSTRAINT "fee_ledgers_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_ledgers" ADD CONSTRAINT "fee_ledgers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_collected_by_fkey" FOREIGN KEY ("collected_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
