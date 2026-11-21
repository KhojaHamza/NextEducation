import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { platformPrisma } from './src/config/prisma.js';
import { generateTempPassword } from './src/services/platform.service.js';

const host = new URL(process.env.DATABASE_URL).hostname;
const isLocal = ['localhost', '127.0.0.1'].includes(host);
console.log(`Base cible : ${host}`);
if (!isLocal && !process.argv.includes('--allow-remote')) {
  console.error('STOP : base distante. Relance avec --allow-remote si c est voulu.');
  process.exit(1);
}

const email = (process.env.SUPER_ADMIN_EMAIL || 'superadmin@nexteducation.local').trim().toLowerCase();
const password = process.env.SUPER_ADMIN_PASSWORD || generateTempPassword();
const reset = process.argv.includes('--reset');

const existing = await platformPrisma.user.findFirst({ where: { email, role: 'SUPER_ADMIN', schoolId: null } });
if (existing && !reset) {
  console.log(`Le SUPER_ADMIN ${email} existe deja. Utilise --reset pour regenerer son mot de passe.`);
} else {
  const passwordHash = await bcrypt.hash(password, 10);
  if (existing) {
    await platformPrisma.user.update({ where: { id: existing.id }, data: { passwordHash, isActive: true, deletedAt: null } });
  } else {
    await platformPrisma.user.create({
      data: { email, passwordHash, role: 'SUPER_ADMIN', firstName: 'Super', lastName: 'Admin', schoolId: null },
    });
  }
  console.log('\nSUPER_ADMIN pret (note ces valeurs, elles ne seront plus affichees) :');
  console.log(`  e-mail       : ${email}`);
  console.log(`  mot de passe : ${password}`);
}
await platformPrisma.$disconnect();