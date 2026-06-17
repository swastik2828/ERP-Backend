-- CreateEnum
CREATE TYPE "SubjectType" AS ENUM ('CORE', 'ELECTIVE', 'OPTIONAL');

-- CreateEnum
CREATE TYPE "SubjectCategory" AS ENUM ('ACADEMIC', 'CO_CURRICULAR', 'VOCATIONAL', 'LANGUAGE', 'SPORTS', 'LABORATORY');

-- CreateEnum
CREATE TYPE "SubjectStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "subjects" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "short_name" VARCHAR(50),
    "description" TEXT,
    "subject_type" "SubjectType" NOT NULL,
    "category" "SubjectCategory" NOT NULL,
    "credits" INTEGER,
    "display_order" INTEGER NOT NULL,
    "status" "SubjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_mappings" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "academic_session_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subjects_school_id_idx" ON "subjects"("school_id");

-- CreateIndex
CREATE INDEX "subjects_name_idx" ON "subjects"("name");

-- CreateIndex
CREATE INDEX "subjects_status_idx" ON "subjects"("status");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_school_id_code_key" ON "subjects"("school_id", "code");

-- CreateIndex
CREATE INDEX "curriculum_mappings_school_id_idx" ON "curriculum_mappings"("school_id");

-- CreateIndex
CREATE INDEX "curriculum_mappings_academic_session_id_idx" ON "curriculum_mappings"("academic_session_id");

-- CreateIndex
CREATE INDEX "curriculum_mappings_class_id_idx" ON "curriculum_mappings"("class_id");

-- CreateIndex
CREATE INDEX "curriculum_mappings_subject_id_idx" ON "curriculum_mappings"("subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_mappings_academic_session_id_class_id_subject_id_key" ON "curriculum_mappings"("academic_session_id", "class_id", "subject_id");

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_mappings" ADD CONSTRAINT "curriculum_mappings_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_mappings" ADD CONSTRAINT "curriculum_mappings_academic_session_id_fkey" FOREIGN KEY ("academic_session_id") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_mappings" ADD CONSTRAINT "curriculum_mappings_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_mappings" ADD CONSTRAINT "curriculum_mappings_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
