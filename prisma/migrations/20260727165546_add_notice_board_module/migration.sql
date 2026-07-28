-- CreateEnum
CREATE TYPE "NoticeType" AS ENUM ('NOTICE', 'CIRCULAR');

-- CreateEnum
CREATE TYPE "NoticePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NoticeStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TargetType" AS ENUM ('ALL', 'ROLE', 'CLASS', 'SECTION', 'STUDENT', 'PARENT', 'TEACHER', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "AcknowledgmentStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'DECLINED');

-- CreateTable
CREATE TABLE "notices" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "academic_session_id" UUID,
    "category_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "summary" VARCHAR(500),
    "type" "NoticeType" NOT NULL DEFAULT 'NOTICE',
    "priority" "NoticePriority" NOT NULL DEFAULT 'NORMAL',
    "status" "NoticeStatus" NOT NULL DEFAULT 'DRAFT',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "pin_order" INTEGER NOT NULL DEFAULT 0,
    "publish_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "published_at" TIMESTAMPTZ,
    "archived_at" TIMESTAMPTZ,
    "requires_acknowledgment" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgment_deadline" TIMESTAMPTZ,
    "allow_comments" BOOLEAN NOT NULL DEFAULT true,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "unique_reader_count" INTEGER NOT NULL DEFAULT 0,
    "acknowledgment_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID NOT NULL,
    "updated_by" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notice_categories" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "color" VARCHAR(7),
    "icon" VARCHAR(50),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notice_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notice_targets" (
    "id" UUID NOT NULL,
    "notice_id" UUID NOT NULL,
    "targetType" "TargetType" NOT NULL,
    "target_role" "Role",
    "target_class_id" UUID,
    "target_section_id" UUID,
    "target_student_id" UUID,
    "target_parent_id" UUID,
    "target_teacher_id" UUID,
    "target_user_id" UUID,

    CONSTRAINT "notice_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notice_attachments" (
    "id" UUID NOT NULL,
    "notice_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "file_hash" VARCHAR(64),
    "uploaded_by" UUID NOT NULL,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notice_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notice_read_receipts" (
    "id" UUID NOT NULL,
    "notice_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "read_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,

    CONSTRAINT "notice_read_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notice_acknowledgments" (
    "id" UUID NOT NULL,
    "notice_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "status" "AcknowledgmentStatus" NOT NULL DEFAULT 'PENDING',
    "acknowledged_at" TIMESTAMPTZ,
    "declined_at" TIMESTAMPTZ,
    "remarks" TEXT,
    "signature_url" VARCHAR(500),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,

    CONSTRAINT "notice_acknowledgments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notice_comments" (
    "id" UUID NOT NULL,
    "notice_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "edited_at" TIMESTAMPTZ,
    "parent_comment_id" UUID,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "notice_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notice_audits" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "notice_id" UUID NOT NULL,
    "action" VARCHAR(60) NOT NULL,
    "actor_id" UUID NOT NULL,
    "actor_role" VARCHAR(20) NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "correlationId" UUID NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notice_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_notice_school_status" ON "notices"("school_id", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "idx_notice_pinned" ON "notices"("school_id", "is_pinned", "status", "pin_order");

-- CreateIndex
CREATE INDEX "idx_notice_type_status" ON "notices"("school_id", "type", "status", "priority");

-- CreateIndex
CREATE INDEX "idx_notice_publish" ON "notices"("school_id", "publish_at");

-- CreateIndex
CREATE INDEX "idx_notice_expiry" ON "notices"("school_id", "expires_at");

-- CreateIndex
CREATE INDEX "idx_notice_created" ON "notices"("school_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_notice_session" ON "notices"("school_id", "academic_session_id");

-- CreateIndex
CREATE INDEX "idx_notice_category" ON "notices"("school_id", "category_id");

-- CreateIndex
CREATE INDEX "notice_categories_school_id_is_active_idx" ON "notice_categories"("school_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "notice_categories_school_id_code_key" ON "notice_categories"("school_id", "code");

-- CreateIndex
CREATE INDEX "notice_targets_notice_id_idx" ON "notice_targets"("notice_id");

-- CreateIndex
CREATE INDEX "notice_targets_targetType_idx" ON "notice_targets"("targetType");

-- CreateIndex
CREATE INDEX "notice_targets_target_class_id_idx" ON "notice_targets"("target_class_id");

-- CreateIndex
CREATE INDEX "notice_targets_target_section_id_idx" ON "notice_targets"("target_section_id");

-- CreateIndex
CREATE INDEX "notice_targets_target_student_id_idx" ON "notice_targets"("target_student_id");

-- CreateIndex
CREATE INDEX "notice_targets_target_parent_id_idx" ON "notice_targets"("target_parent_id");

-- CreateIndex
CREATE INDEX "notice_targets_target_teacher_id_idx" ON "notice_targets"("target_teacher_id");

-- CreateIndex
CREATE INDEX "notice_targets_target_user_id_idx" ON "notice_targets"("target_user_id");

-- CreateIndex
CREATE INDEX "notice_attachments_notice_id_idx" ON "notice_attachments"("notice_id");

-- CreateIndex
CREATE INDEX "notice_attachments_school_id_idx" ON "notice_attachments"("school_id");

-- CreateIndex
CREATE INDEX "notice_read_receipts_notice_id_idx" ON "notice_read_receipts"("notice_id");

-- CreateIndex
CREATE INDEX "notice_read_receipts_user_id_idx" ON "notice_read_receipts"("user_id");

-- CreateIndex
CREATE INDEX "notice_read_receipts_school_id_idx" ON "notice_read_receipts"("school_id");

-- CreateIndex
CREATE UNIQUE INDEX "notice_read_receipts_notice_id_user_id_key" ON "notice_read_receipts"("notice_id", "user_id");

-- CreateIndex
CREATE INDEX "notice_acknowledgments_notice_id_idx" ON "notice_acknowledgments"("notice_id");

-- CreateIndex
CREATE INDEX "notice_acknowledgments_user_id_idx" ON "notice_acknowledgments"("user_id");

-- CreateIndex
CREATE INDEX "notice_acknowledgments_school_id_status_idx" ON "notice_acknowledgments"("school_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "notice_acknowledgments_notice_id_user_id_key" ON "notice_acknowledgments"("notice_id", "user_id");

-- CreateIndex
CREATE INDEX "notice_comments_notice_id_is_deleted_created_at_idx" ON "notice_comments"("notice_id", "is_deleted", "created_at");

-- CreateIndex
CREATE INDEX "notice_comments_user_id_idx" ON "notice_comments"("user_id");

-- CreateIndex
CREATE INDEX "notice_audits_school_id_notice_id_created_at_idx" ON "notice_audits"("school_id", "notice_id", "created_at");

-- CreateIndex
CREATE INDEX "notice_audits_school_id_actor_id_created_at_idx" ON "notice_audits"("school_id", "actor_id", "created_at");

-- CreateIndex
CREATE INDEX "notice_audits_correlationId_idx" ON "notice_audits"("correlationId");

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_academic_session_id_fkey" FOREIGN KEY ("academic_session_id") REFERENCES "academic_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "notice_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_categories" ADD CONSTRAINT "notice_categories_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_targets" ADD CONSTRAINT "notice_targets_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_targets" ADD CONSTRAINT "notice_targets_target_class_id_fkey" FOREIGN KEY ("target_class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_targets" ADD CONSTRAINT "notice_targets_target_section_id_fkey" FOREIGN KEY ("target_section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_targets" ADD CONSTRAINT "notice_targets_target_student_id_fkey" FOREIGN KEY ("target_student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_targets" ADD CONSTRAINT "notice_targets_target_parent_id_fkey" FOREIGN KEY ("target_parent_id") REFERENCES "parents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_targets" ADD CONSTRAINT "notice_targets_target_teacher_id_fkey" FOREIGN KEY ("target_teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_targets" ADD CONSTRAINT "notice_targets_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_attachments" ADD CONSTRAINT "notice_attachments_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_read_receipts" ADD CONSTRAINT "notice_read_receipts_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_read_receipts" ADD CONSTRAINT "notice_read_receipts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_acknowledgments" ADD CONSTRAINT "notice_acknowledgments_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_acknowledgments" ADD CONSTRAINT "notice_acknowledgments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_comments" ADD CONSTRAINT "notice_comments_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_comments" ADD CONSTRAINT "notice_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_comments" ADD CONSTRAINT "notice_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "notice_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_audits" ADD CONSTRAINT "notice_audits_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
