ALTER TABLE "timetable_slots"
  ADD CONSTRAINT "timetable_slots_time_check"
  CHECK ("startMinute" >= 0 AND "endMinute" <= 1440 AND "endMinute" > "startMinute");