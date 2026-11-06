import { z } from 'zod';
import { parse } from 'csv-parse/sync';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { allocateMatricules, createStudentRecord } from './students.service.js';

// ---------- Export ----------

// Prefixes risky cells so Excel never runs them as formulas (CSV injection)
const cell = (value) => {
  let s = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const exportStudentsCsv = async (query) => {
  const where = { isCurrent: true, deletedAt: null };
  const year = query.schoolYearId
    ? await prisma.schoolYear.findFirst({ where: { id: Number(query.schoolYearId), deletedAt: null } })
    : await prisma.schoolYear.findFirst({ where });

  const students = await prisma.student.findMany({
    where: { deletedAt: null },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    include: {
      parents: { include: { parent: { include: { user: { select: { email: true } } } } } },
      enrollments: { where: { deletedAt: null, ...(year && { schoolYearId: year.id }) }, include: { schoolClass: true } },
    },
  });

  const header = ['matricule', 'lastName', 'firstName', 'birthDate', 'gender', 'class', 'parentEmails'];
  const lines = students.map((s) => {
    const cls = s.enrollments[0]?.schoolClass;
    return [
      s.matricule, s.lastName, s.firstName, s.birthDate.toISOString().slice(0, 10), s.gender,
      cls ? `${cls.level} ${cls.section}` : '',
      s.parents.map((p) => p.parent.user.email).join(' | '),
    ].map(cell).join(';');
  });

  return {
    filename: `students-${year?.label ?? 'all'}.csv`,
    // BOM + semicolon so Excel (French locale) opens it correctly
    content: `\uFEFF${[header.join(';'), ...lines].join('\r\n')}\r\n`,
  };
};

// ---------- Import ----------

const rowSchema = z.object({
  lastName: z.string().trim().min(1, 'lastName is required').max(60),
  firstName: z.string().trim().min(1, 'firstName is required').max(60),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  gender: z.enum(['MALE', 'FEMALE']),
  class: z.string().trim().optional(),
  parentEmail: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
});

const normalize = (raw) => {
  const g = String(raw.gender ?? '').trim().toUpperCase();
  return {
    lastName: raw.lastname ?? '',
    firstName: raw.firstname ?? '',
    birthDate: raw.birthdate ?? '',
    gender: { M: 'MALE', F: 'FEMALE' }[g] ?? g,
    class: raw.class ?? '',
    parentEmail: raw.parentemail ?? '',
  };
};

const dupKey = (last, first, date) => `${last}|${first}|${date}`.toLowerCase();

export const importStudentsCsv = async (buffer, userId) => {
  let rows;
  try {
    rows = parse(buffer, {
      columns: (h) => h.map((x) => x.trim().toLowerCase()),
      bom: true, skip_empty_lines: true, trim: true, delimiter: [',', ';'],
    });
  } catch (e) {
    throw new AppError(`Invalid CSV file: ${e.message}`, 400);
  }
  if (!rows.length) throw new AppError('The file has no data rows', 400);
  if (rows.length > 1000) throw new AppError('Maximum 1000 rows per import', 400);

  const year = await prisma.schoolYear.findFirst({ where: { isCurrent: true, deletedAt: null } });
  if (!year) throw new AppError('No current school year: set one first', 400);

  const [classes, counts, parents, existing] = await Promise.all([
    prisma.schoolClass.findMany({ where: { schoolYearId: year.id, deletedAt: null } }),
    prisma.enrollment.groupBy({
      by: ['classId'], where: { schoolYearId: year.id, deletedAt: null }, _count: { _all: true },
    }),
    prisma.parent.findMany({ where: { deletedAt: null }, include: { user: { select: { email: true } } } }),
    prisma.student.findMany({ where: { deletedAt: null }, select: { firstName: true, lastName: true, birthDate: true } }),
  ]);

  const classByKey = new Map(classes.map((c) => [`${c.level} ${c.section}`.toUpperCase(), c]));
  const free = new Map(classes.map((c) => [
    c.id, c.capacity - (counts.find((x) => x.classId === c.id)?._count._all ?? 0),
  ]));
  const parentByEmail = new Map(parents.map((p) => [p.user.email, p.id]));
  const seen = new Set(existing.map((s) => dupKey(s.lastName, s.firstName, s.birthDate.toISOString().slice(0, 10))));

  const errors = [];
  const valid = [];

  rows.forEach((raw, i) => {
    const line = i + 2; // line 1 is the header
    const fail = (field, message) => errors.push({ line, field, message });

    const parsed = rowSchema.safeParse(normalize(raw));
    if (!parsed.success) {
      parsed.error.issues.forEach((is) => fail(is.path.join('.'), is.message));
      return;
    }
    const r = parsed.data;

    const date = new Date(r.birthDate);
    if (Number.isNaN(date.getTime()) || date >= new Date()) return fail('birthDate', 'Invalid or future date');

    const key = dupKey(r.lastName, r.firstName, r.birthDate);
    if (seen.has(key)) return fail('lastName', 'Possible duplicate student');
    seen.add(key);

    let cls = null;
    if (r.class) {
      cls = classByKey.get(r.class.replace(/\s+/g, ' ').toUpperCase());
      if (!cls) return fail('class', `Unknown class "${r.class}" for ${year.label}`);
      if (free.get(cls.id) <= 0) return fail('class', `Class ${r.class} is full`);
      free.set(cls.id, free.get(cls.id) - 1);
    }

    let parentId = null;
    if (r.parentEmail) {
      parentId = parentByEmail.get(r.parentEmail);
      if (!parentId) return fail('parentEmail', `No parent with email ${r.parentEmail}`);
    }

    valid.push({ r, date, cls, parentId });
  });

  if (errors.length) {
    throw new AppError(
      `Import rejected: ${errors.length} problem(s) found, nothing was imported`, 400, errors.slice(0, 50),
    );
  }

  await prisma.$transaction(
    async (tx) => {
      const matricules = await allocateMatricules(tx, year.id, valid.length);
      for (const [i, v] of valid.entries()) {
        await createStudentRecord(tx, {
          data: {
            firstName: v.r.firstName, lastName: v.r.lastName, birthDate: v.date, gender: v.r.gender,
            entryYearId: year.id, classId: v.cls?.id,
            parents: v.parentId ? [{ parentId: v.parentId, relationship: 'guardian' }] : [],
          },
          matricule: matricules[i],
          userId,
        });
      }
    },
    { timeout: 60000, maxWait: 10000 }, // the default 5 s is too short for large files
  );

  return { imported: valid.length };
};