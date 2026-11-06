import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

  const passwordHash = await bcrypt.hash('Admin@12345', 10);

  await prisma.user.upsert({
    where: { email: 'admin@ecole.local' },
    update: {},
    create: {
      email: 'admin@ecole.local',
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