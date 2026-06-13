/*
  Warnings:

  - A unique constraint covering the columns `[aadhar_number]` on the table `students` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `father_name` to the `students` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mother_name` to the `students` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "students" ADD COLUMN     "aadhar_number" VARCHAR(12),
ADD COLUMN     "father_name" VARCHAR(100) NOT NULL,
ADD COLUMN     "mother_name" VARCHAR(100) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "students_aadhar_number_key" ON "students"("aadhar_number");

-- CreateIndex
CREATE INDEX "students_aadhar_number_idx" ON "students"("aadhar_number");
