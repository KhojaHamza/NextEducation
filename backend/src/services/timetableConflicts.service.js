// 510 -> "08:30"
export const toHHMM = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/**
 * Looks for slots that overlap `slot` on the same day, in the same school year,
 * and that share its class, its teacher or its room.
 * `slot.schoolYearId` must be filled by the caller. `ignoreId` lets a slot being edited skip itself.
 * Returns a list of conflicts (empty list = no conflict).
 */
export async function findConflicts(tx, slot, ignoreId) {
  const sharedResource = [{ classId: slot.classId }, { teacherId: slot.teacherId }];
  if (slot.roomId != null) sharedResource.push({ roomId: slot.roomId });

  const overlapping = await tx.timetableSlot.findMany({
    where: {
      deletedAt: null,
      dayOfWeek: slot.dayOfWeek,
      // overlap rule: new.start < other.end AND new.end > other.start
      startMinute: { lt: slot.endMinute },
      endMinute: { gt: slot.startMinute },
      // slots of other school years never conflict with this one
      schoolClass: { deletedAt: null, schoolYearId: slot.schoolYearId },
      ...(ignoreId ? { id: { not: ignoreId } } : {}),
      OR: sharedResource,
    },
    include: {
      schoolClass: true,
      subject: true,
      teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
      room: true,
    },
  });

  const conflicts = [];
  for (const other of overlapping) {
    const when = `${toHHMM(other.startMinute)}-${toHHMM(other.endMinute)}`;
    const teacherName = `${other.teacher.user.firstName} ${other.teacher.user.lastName}`;
    const className = `${other.schoolClass.level} ${other.schoolClass.section}`;

    if (other.classId === slot.classId) {
      conflicts.push({
        type: 'CLASS', slotId: other.id,
        message: `The class already has ${other.subject.name} with ${teacherName} (${when})`,
      });
    }
    if (other.teacherId === slot.teacherId) {
      conflicts.push({
        type: 'TEACHER', slotId: other.id,
        message: `${teacherName} already teaches ${className} (${when})`,
      });
    }
    if (slot.roomId != null && other.roomId === slot.roomId) {
      conflicts.push({
        type: 'ROOM', slotId: other.id,
        message: `Room ${other.room.name} is already used by ${className} (${when})`,
      });
    }
  }
  return conflicts;
}