import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    where: { label: '2026-2027' },
    update: {},
    create: {
      label: '2026-2027',
      startDate: new Date('2026-09-15'),
      endDate: new Date('2027-06-30'),
      isCurrent: true,
    },
  });

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      role: 'ADMIN',
      firstName: 'Admin',
      lastName: 'Ecole',
    },
  });

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());