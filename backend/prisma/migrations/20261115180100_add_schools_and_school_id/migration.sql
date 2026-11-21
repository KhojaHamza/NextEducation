CREATE TYPE "SchoolStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'DISABLED');

CREATE TABLE "schools" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SchoolStatus" NOT NULL DEFAULT 'TRIAL',
    "plan" TEXT NOT NULL DEFAULT 'basic',
    "subscriptionEnd" DATE,
    "currency" TEXT NOT NULL DEFAULT 'TND',
    "address" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "schools_code_key" ON "schools"("code");

INSERT INTO "schools" ("id", "code", "name", "status", "plan", "currency", "updatedAt")
VALUES (1, 'ali-slimen', U&'\00C9cole Ali Slimen', 'ACTIVE', 'basic', 'TND', CURRENT_TIMESTAMP);

SELECT setval(pg_get_serial_sequence('schools', 'id'), 1);
ALTER TABLE "school_years" ADD COLUMN "schoolId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "school_years" ADD CONSTRAINT "school_years_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "school_years_schoolId_idx" ON "school_years"("schoolId");
ALTER TABLE "users" ADD COLUMN "schoolId" INTEGER DEFAULT 1;
ALTER TABLE "users" ADD CONSTRAINT "users_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "users_schoolId_idx" ON "users"("schoolId");
ALTER TABLE "teachers" ADD COLUMN "schoolId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "teachers_schoolId_idx" ON "teachers"("schoolId");
ALTER TABLE "parents" ADD COLUMN "schoolId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "parents" ADD CONSTRAINT "parents_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "parents_schoolId_idx" ON "parents"("schoolId");
ALTER TABLE "students" ADD COLUMN "schoolId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "students" ADD CONSTRAINT "students_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "students_schoolId_idx" ON "students"("schoolId");
ALTER TABLE "student_parents" ADD COLUMN "schoolId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "student_parents" ADD CONSTRAINT "student_parents_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "student_parents_schoolId_idx" ON "student_parents"("schoolId");
ALTER TABLE "classes" ADD COLUMN "schoolId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "classes" ADD CONSTRAINT "classes_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "classes_schoolId_idx" ON "classes"("schoolId");
ALTER TABLE "enrollments" ADD COLUMN "schoolId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "enrollments_schoolId_idx" ON "enrollments"("schoolId");
ALTER TABLE "subjects" ADD COLUMN "schoolId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "subjects_schoolId_idx" ON "subjects"("schoolId");
ALTER TABLE "rooms" ADD COLUMN "schoolId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "rooms_schoolId_idx" ON "rooms"("schoolId");
ALTER TABLE "teaching_assignments" ADD COLUMN "schoolId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "teaching_assignments" ADD CONSTRAINT "teaching_assignments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "teaching_assignments_schoolId_idx" ON "teaching_assignments"("schoolId");
ALTER TABLE "audit_logs" ADD COLUMN "schoolId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "audit_logs_schoolId_idx" ON "audit_logs"("schoolId");
ALTER TABLE "evaluations" ADD COLUMN "schoolId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "evaluations_schoolId_idx" ON "evaluations"("schoolId");
ALTER TABLE "grades" ADD COLUMN "schoolId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "grades" ADD CONSTRAINT "grades_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "grades_schoolId_idx" ON "grades"("schoolId");
ALTER TABLE "absences" ADD COLUMN "schoolId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "absences" ADD CONSTRAINT "absences_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "absences_schoolId_idx" ON "absences"("schoolId");
ALTER TABLE "fee_items" ADD COLUMN "schoolId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "fee_items" ADD CONSTRAINT "fee_items_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "fee_items_schoolId_idx" ON "fee_items"("schoolId");
ALTER TABLE "payments" ADD COLUMN "schoolId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "payments" ADD CONSTRAINT "payments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "payments_schoolId_idx" ON "payments"("schoolId");
ALTER TABLE "notifications" ADD COLUMN "schoolId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "notifications_schoolId_idx" ON "notifications"("schoolId");
ALTER TABLE "messages" ADD COLUMN "schoolId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "messages" ADD CONSTRAINT "messages_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "messages_schoolId_idx" ON "messages"("schoolId");
ALTER TABLE "message_recipients" ADD COLUMN "schoolId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "message_recipients" ADD CONSTRAINT "message_recipients_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "message_recipients_schoolId_idx" ON "message_recipients"("schoolId");
ALTER TABLE "message_attachments" ADD COLUMN "schoolId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "message_attachments_schoolId_idx" ON "message_attachments"("schoolId");
ALTER TABLE "message_access_logs" ADD COLUMN "schoolId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "message_access_logs" ADD CONSTRAINT "message_access_logs_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "message_access_logs_schoolId_idx" ON "message_access_logs"("schoolId");
ALTER TABLE "announcements" ADD COLUMN "schoolId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "announcements_schoolId_idx" ON "announcements"("schoolId");
ALTER TABLE "push_subscriptions" ADD COLUMN "schoolId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "push_subscriptions_schoolId_idx" ON "push_subscriptions"("schoolId");
ALTER TABLE "timetable_slots" ADD COLUMN "schoolId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "timetable_slots_schoolId_idx" ON "timetable_slots"("schoolId");