import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const school = await prisma.school.upsert({
    where: { code: 'ali-slimen' },
    update: { status: 'ACTIVE' },
    create: { code: 'ali-slimen', name: 'École Ali Slimen', status: 'ACTIVE', currency: 'TND' }
  });

  const passwordHash = await bcrypt.hash('admin1234', 10);
  await prisma.user.upsert({
    where: { schoolId_email: { schoolId: school.id, email: 'admin@ecole.local' } },
    update: { passwordHash, isActive: true, deletedAt: null },
    create: {
      schoolId: school.id, email: 'admin@ecole.local', passwordHash,
      role: 'ADMIN', firstName: 'Admin', lastName: 'Local',
    }
  });
  console.log('Compte cree : admin@ecole.local / admin1234');
}
main().finally(() => prisma.$disconnect());