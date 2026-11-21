import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SCHOOL_ID = 1;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error('ADMIN_EMAIL et ADMIN_PASSWORD sont obligatoires.');
  process.exit(1);
}
if (password.length < 12) {
  console.error('ADMIN_PASSWORD doit contenir au moins 12 caractères.');
  process.exit(1);
}

async function main() {
  await prisma.schoolYear.upsert({
    where: { schoolId_label: { schoolId: SCHOOL_ID, label: '2026-2027' } },
    update: {},
    create: {
      schoolId: SCHOOL_ID,
      label: '2026-2027',
      startDate: new Date('2026-09-15'),
      endDate: new Date('2027-06-30'),
      isCurrent: true,
    },
  });

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { schoolId_email: { schoolId: SCHOOL_ID, email } },
    update: {},
    create: {
      schoolId: SCHOOL_ID,
      email, passwordHash, role: 'ADMIN',
      firstName: 'Admin', lastName: 'Ecole',
    },
  });

  console.log('Seed completed');

  // Optional SUPER_ADMIN (no school). Skip if env not set.
  const superEmail = process.env.PLATFORM_ADMIN_EMAIL;
  const superPassword = process.env.PLATFORM_ADMIN_PASSWORD;
  if (superEmail && superPassword) {
    const exists = await prisma.user.findFirst({
      where: { email: superEmail, role: 'SUPER_ADMIN' },
    });
    if (!exists) {
      await prisma.user.create({
        data: {
          email: superEmail, passwordHash: await bcrypt.hash(superPassword, 10),
          role: 'SUPER_ADMIN', firstName: 'Platform', lastName: 'Admin',
          schoolId: null,
        },
      });
      console.log('SUPER_ADMIN created');
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());