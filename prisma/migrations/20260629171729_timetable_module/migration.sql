-- CreateEnum
CREATE TYPE "TimetableStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('LECTURE', 'BREAK', 'LUNCH', 'ASSEMBLY', 'PRACTICAL');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('LECTURE_HALL', 'LABORATORY', 'SPORTS_ROOM', 'AUDITORIUM', 'LIBRARY');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateTable
CREATE TABLE "periods" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "type" "PeriodType" NOT NULL DEFAULT 'LECTURE',
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classrooms" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "building" VARCHAR(100),
    "floor" VARCHAR(20),
    "capacity" INTEGER NOT NULL,
    "room_type" "RoomType" NOT NULL DEFAULT 'LECTURE_HALL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetables" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "academic_session_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "TimetableStatus" NOT NULL DEFAULT 'DRAFT',
    "published_by" UUID,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "timetables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timetable_slots" (
    "id" UUID NOT NULL,
    "timetable_id" UUID NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "period_id" UUID NOT NULL,
    "subject_id" UUID,
    "teacher_id" UUID,
    "classroom_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetable_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "periods_school_id_idx" ON "periods"("school_id");

-- CreateIndex
CREATE INDEX "classrooms_school_id_idx" ON "classrooms"("school_id");

-- CreateIndex
CREATE INDEX "timetables_school_id_idx" ON "timetables"("school_id");

-- CreateIndex
CREATE INDEX "timetables_status_idx" ON "timetables"("status");

-- CreateIndex
CREATE UNIQUE INDEX "timetables_school_id_academic_session_id_class_id_section_i_key" ON "timetables"("school_id", "academic_session_id", "class_id", "section_id", "version");

-- CreateIndex
CREATE INDEX "timetable_slots_timetable_id_idx" ON "timetable_slots"("timetable_id");

-- CreateIndex
CREATE INDEX "timetable_slots_teacher_id_day_of_week_idx" ON "timetable_slots"("teacher_id", "day_of_week");

-- CreateIndex
CREATE INDEX "timetable_slots_classroom_id_day_of_week_idx" ON "timetable_slots"("classroom_id", "day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "timetable_slots_timetable_id_day_of_week_period_id_key" ON "timetable_slots"("timetable_id", "day_of_week", "period_id");

-- AddForeignKey
ALTER TABLE "periods" ADD CONSTRAINT "periods_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_academic_session_id_fkey" FOREIGN KEY ("academic_session_id") REFERENCES "academic_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_timetable_id_fkey" FOREIGN KEY ("timetable_id") REFERENCES "timetables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
