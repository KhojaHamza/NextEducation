import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const url = process.env.DATABASE_URL || '';
if (!/localhost|127\.0\.0\.1/.test(url)) {
  console.error('STOP : DATABASE_URL ne pointe pas vers localhost. Rien n a ete fait.');
  process.exit(1);
}

const prisma = new PrismaClient();
const school = await prisma.school.upsert({
  where: { code: 'ecole-b' },
  update: { status: 'ACTIVE' },
  create: { code: 'ecole-b', name: '\u00c9cole B (test)', status: 'ACTIVE', currency: 'TND' },
});
const passwordHash = await bcrypt.hash('adminB1234', 10);
await prisma.user.upsert({
  where: { schoolId_email: { schoolId: school.id, email: 'admin@ecole.local' } },
  update: { passwordHash, isActive: true, deletedAt: null },
  create: {
    schoolId: school.id, email: 'admin@ecole.local', passwordHash,
    role: 'ADMIN', firstName: 'Admin', lastName: 'Ecole B',
  },
});
const schools = await prisma.school.findMany({ select: { id: true, code: true, name: true, status: true } });
console.table(schools);
const users = await prisma.user.findMany({ select: { id: true, schoolId: true, email: true, role: true } });
console.table(users);
await prisma.$disconnect();