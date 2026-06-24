-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('UNIT_TEST', 'MONTHLY_TEST', 'QUARTERLY', 'HALF_YEARLY', 'MID_TERM', 'PRE_BOARD', 'ANNUAL', 'PRACTICAL', 'ORAL', 'ASSIGNMENT', 'PROJECT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('PASS', 'FAIL', 'WITHHELD', 'ABSENT', 'PROMOTED', 'DETENTION');

-- CreateTable
CREATE TABLE "exams" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "academic_session_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "exam_type" "ExamType" NOT NULL,
    "description" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_subjects" (
    "id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "section_id" UUID,
    "max_marks" DOUBLE PRECISION NOT NULL,
    "pass_marks" DOUBLE PRECISION NOT NULL,
    "weightage" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_schedules" (
    "id" UUID NOT NULL,
    "exam_subject_id" UUID NOT NULL,
    "exam_date" DATE NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "room" VARCHAR(50),
    "invigilator_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_marks" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "exam_subject_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "marks_obtained" DOUBLE PRECISION NOT NULL,
    "remarks" TEXT,
    "entered_by" UUID NOT NULL,
    "verified_by" UUID,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_marks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_scales" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "min_percentage" DOUBLE PRECISION NOT NULL,
    "max_percentage" DOUBLE PRECISION NOT NULL,
    "grade" VARCHAR(5) NOT NULL,
    "grade_point" DOUBLE PRECISION NOT NULL,
    "remarks" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_scales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "total_marks" DOUBLE PRECISION NOT NULL,
    "obtained_marks" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "grade" VARCHAR(5) NOT NULL,
    "rank" INTEGER,
    "gpa" DOUBLE PRECISION,
    "attendance_percentage" DOUBLE PRECISION,
    "result_status" "ResultStatus" NOT NULL,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exams_school_id_idx" ON "exams"("school_id");

-- CreateIndex
CREATE INDEX "exams_academic_session_id_idx" ON "exams"("academic_session_id");

-- CreateIndex
CREATE INDEX "exams_exam_type_idx" ON "exams"("exam_type");

-- CreateIndex
CREATE INDEX "exams_is_published_idx" ON "exams"("is_published");

-- CreateIndex
CREATE UNIQUE INDEX "exams_school_id_academic_session_id_name_key" ON "exams"("school_id", "academic_session_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "exam_subjects_exam_id_subject_id_class_id_section_id_key" ON "exam_subjects"("exam_id", "subject_id", "class_id", "section_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_marks_student_id_exam_subject_id_key" ON "student_marks"("student_id", "exam_subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "results_exam_id_student_id_key" ON "results"("exam_id", "student_id");

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_academic_session_id_fkey" FOREIGN KEY ("academic_session_id") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_subjects" ADD CONSTRAINT "exam_subjects_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_subjects" ADD CONSTRAINT "exam_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_subjects" ADD CONSTRAINT "exam_subjects_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_subjects" ADD CONSTRAINT "exam_subjects_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_exam_subject_id_fkey" FOREIGN KEY ("exam_subject_id") REFERENCES "exam_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_invigilator_id_fkey" FOREIGN KEY ("invigilator_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_marks" ADD CONSTRAINT "student_marks_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_marks" ADD CONSTRAINT "student_marks_exam_subject_id_fkey" FOREIGN KEY ("exam_subject_id") REFERENCES "exam_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_marks" ADD CONSTRAINT "student_marks_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_marks" ADD CONSTRAINT "student_marks_entered_by_fkey" FOREIGN KEY ("entered_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_marks" ADD CONSTRAINT "student_marks_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_scales" ADD CONSTRAINT "grade_scales_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
