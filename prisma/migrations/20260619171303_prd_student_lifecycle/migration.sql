/*
  Warnings:

  - You are about to drop the column `enrollment_number` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `father_name` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `mother_name` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `parent_id` on the `students` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[admission_number]` on the table `students` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `admission_number` to the `students` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TRANSFERRED', 'WITHDRAWN', 'GRADUATED', 'ALUMNI', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN', 'RELATIVE', 'LEGAL_CUSTODIAN');

-- CreateEnum
CREATE TYPE "DocumentVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AcademicEventType" AS ENUM ('ADMISSION', 'CLASS_CHANGE', 'SECTION_CHANGE', 'PROMOTION', 'TRANSFER', 'GRADUATION', 'WITHDRAWN', 'REACTIVATED');

-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT "students_parent_id_fkey";

-- DropIndex
DROP INDEX "students_enrollment_number_idx";

-- DropIndex
DROP INDEX "students_enrollment_number_key";

-- DropIndex
DROP INDEX "students_parent_id_idx";

-- AlterTable
ALTER TABLE "parents" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "students" DROP COLUMN "enrollment_number",
DROP COLUMN "father_name",
DROP COLUMN "is_active",
DROP COLUMN "mother_name",
DROP COLUMN "parent_id",
ADD COLUMN     "admission_number" VARCHAR(50) NOT NULL,
ADD COLUMN     "created_by" UUID,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "nationality" VARCHAR(50) DEFAULT 'Indian',
ADD COLUMN     "parentId" UUID,
ADD COLUMN     "religion" VARCHAR(50),
ADD COLUMN     "section_id" UUID,
ADD COLUMN     "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "parent_students" (
    "id" UUID NOT NULL,
    "parent_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "relationship_type" "RelationshipType" NOT NULL,
    "is_primary_guardian" BOOLEAN NOT NULL DEFAULT false,
    "is_emergency_contact" BOOLEAN NOT NULL DEFAULT false,
    "can_receive_notifications" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "parent_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_documents" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "document_name" VARCHAR(255) NOT NULL,
    "document_type" VARCHAR(100) NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "verification_status" "DocumentVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "expiry_date" DATE,
    "uploaded_by" UUID NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_history" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "academic_session_id" UUID,
    "previous_class_id" UUID,
    "new_class_id" UUID,
    "previous_section_id" UUID,
    "new_section_id" UUID,
    "event_type" "AcademicEventType" NOT NULL,
    "event_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_by" UUID NOT NULL,

    CONSTRAINT "academic_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parent_students_parent_id_student_id_key" ON "parent_students"("parent_id", "student_id");

-- CreateIndex
CREATE INDEX "student_documents_student_id_idx" ON "student_documents"("student_id");

-- CreateIndex
CREATE INDEX "academic_history_student_id_idx" ON "academic_history"("student_id");

-- CreateIndex
CREATE INDEX "academic_history_event_type_idx" ON "academic_history"("event_type");

-- CreateIndex
CREATE UNIQUE INDEX "students_admission_number_key" ON "students"("admission_number");

-- CreateIndex
CREATE INDEX "students_admission_number_idx" ON "students"("admission_number");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_students" ADD CONSTRAINT "parent_students_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_students" ADD CONSTRAINT "parent_students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_history" ADD CONSTRAINT "academic_history_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
