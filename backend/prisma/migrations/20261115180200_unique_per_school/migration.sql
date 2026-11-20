-- Drop the global uniques replaced by per-school uniques
DROP INDEX "users_email_key";
DROP INDEX "school_years_label_key";
DROP INDEX "students_matricule_key";
DROP INDEX "rooms_name_key";
DROP INDEX "subjects_name_level_key";
DROP INDEX "payments_receiptNumber_key";
DROP INDEX "classes_level_section_annee_scolaire_id_key";
DROP INDEX "push_subscriptions_endpoint_key";

-- Create the per-school uniques
CREATE UNIQUE INDEX "users_schoolId_email_key" ON "users"("schoolId", "email");
CREATE UNIQUE INDEX "school_years_schoolId_label_key" ON "school_years"("schoolId", "label");
CREATE UNIQUE INDEX "students_schoolId_matricule_key" ON "students"("schoolId", "matricule");
CREATE UNIQUE INDEX "rooms_schoolId_name_key" ON "rooms"("schoolId", "name");
CREATE UNIQUE INDEX "subjects_schoolId_name_level_key" ON "subjects"("schoolId", "name", "level");
CREATE UNIQUE INDEX "payments_schoolId_receiptNumber_key" ON "payments"("schoolId", "receiptNumber");
CREATE UNIQUE INDEX "classes_schoolId_level_section_annee_scolaire_id_key" ON "classes"("schoolId", "level", "section", "annee_scolaire_id");
CREATE UNIQUE INDEX "push_subscriptions_userId_endpoint_key" ON "push_subscriptions"("userId", "endpoint");

-- SUPER_ADMIN email is unique across the platform (partial index)
CREATE UNIQUE INDEX "users_email_super_admin_key" ON "users"("email") WHERE role = 'SUPER_ADMIN';

-- Remove DEFAULT 1: new rows must carry schoolId explicitly
ALTER TABLE "school_years" ALTER COLUMN "schoolId" DROP DEFAULT;
ALTER TABLE "teachers" ALTER COLUMN "schoolId" DROP DEFAULT;
ALTER TABLE "parents" ALTER COLUMN "schoolId" DROP DEFAULT;
ALTER TABLE "students" ALTER COLUMN "schoolId" DROP DEFAULT;
ALTER TABLE "student_parents" ALTER COLUMN "schoolId" DROP DEFAULT;
ALTER TABLE "classes" ALTER COLUMN "schoolId" DROP DEFAULT;
ALTER TABLE "enrollments" ALTER COLUMN "schoolId" DROP DEFAULT;
ALTER TABLE "subjects" ALTER COLUMN "schoolId" DROP DEFAULT;
ALTER TABLE "rooms" ALTER COLUMN "schoolId" DROP DEFAULT;
ALTER TABLE "teaching_assignments" ALTER COLUMN "schoolId" DROP DEFAULT;
ALTER TABLE "audit_logs" ALTER COLUMN "schoolId" DROP DEFAULT;
ALTER TABLE "evaluations" ALTER COLUMN "schoolId" DROP DEFAULT;
ALTER TABLE "grades" ALTER COLUMN "schoolId" DROP DEFAULT;
ALTER TABLE "absences" ALTER COLUMN "schoolId" DROP DEFAULT;
ALTER TABLE "fee_items" ALTER COLUMN "schoolId" DROP DEFAULT;
ALTER TABLE "payments" ALTER COLUMN "schoolId" DROP DEFAULT;
ALTER TABLE "notifications" ALTER COLUMN "schoolId" DROP DEFAULT;
ALTER TABLE "messages" ALTER COLUMN "schoolId" DROP DEFAULT;
ALTER TABLE "message_recipients" ALTER COLUMN "schoolId" DROP DEFAULT;
ALTER TABLE "message_attachments" ALTER COLUMN "schoolId" DROP DEFAULT;
ALTER TABLE "message_access_logs" ALTER COLUMN "schoolId" DROP DEFAULT;
ALTER TABLE "announcements" ALTER COLUMN "schoolId" DROP DEFAULT;
ALTER TABLE "push_subscriptions" ALTER COLUMN "schoolId" DROP DEFAULT;
ALTER TABLE "timetable_slots" ALTER COLUMN "schoolId" DROP DEFAULT;

-- SUPER_ADMIN must have no school; every other role must have one
ALTER TABLE "users" ADD CONSTRAINT "users_school_required_for_roles"
  CHECK ((role = 'SUPER_ADMIN' AND "schoolId" IS NULL)
      OR (role <> 'SUPER_ADMIN' AND "schoolId" IS NOT NULL));

-- users.schoolId stays nullable (SUPER_ADMIN); no DROP DEFAULT here
ALTER TABLE "users" ALTER COLUMN "schoolId" DROP DEFAULT;