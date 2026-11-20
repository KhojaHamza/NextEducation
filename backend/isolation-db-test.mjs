import 'dotenv/config';
import { prisma, platformPrisma, schoolContext } from './src/config/prisma.js';

if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')) {
  console.error('STOP : DATABASE_URL ne pointe pas vers localhost.');
  process.exit(1);
}

const A = 1;
const B = 3;
const inCtx = (schoolId, fn) => schoolContext.run({ schoolId, userId: 0, role: 'ADMIN' }, async () => await fn());

let failed = 0;
const ok = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
  if (!cond) failed += 1;
};
const throws = async (fn) => { try { await fn(); return null; } catch (e) { return e; } };

try {
  // Nettoyage preventif
  await platformPrisma.room.deleteMany({ where: { name: { startsWith: 'TEST-ISOL' } } });

  // 1. Creation : schoolId injecte automatiquement
  const roomA = await inCtx(A, () => prisma.room.create({ data: { name: 'TEST-ISOL-A', capacity: 10 } }));
  const roomB = await inCtx(B, () => prisma.room.create({ data: { name: 'TEST-ISOL-B', capacity: 10 } }));
  ok('create injecte schoolId (A)', roomA.schoolId === A, `schoolId=${roomA.schoolId}`);
  ok('create injecte schoolId (B)', roomB.schoolId === B, `schoolId=${roomB.schoolId}`);

  // 2. Lectures de liste
  const listA = await inCtx(A, () => prisma.room.findMany({ where: { name: { startsWith: 'TEST-ISOL' } } }));
  const listB = await inCtx(B, () => prisma.room.findMany({ where: { name: { startsWith: 'TEST-ISOL' } } }));
  ok('A ne voit que ses salles', listA.length === 1 && listA[0].id === roomA.id, `${listA.length} resultat(s)`);
  ok('B ne voit que ses salles', listB.length === 1 && listB[0].id === roomB.id, `${listB.length} resultat(s)`);
  const cntA = await inCtx(A, () => prisma.room.count({ where: { name: { startsWith: 'TEST-ISOL' } } }));
  ok('count isole', cntA === 1, `count=${cntA}`);

  // 3. Acces direct par ID a une donnee de l'autre ecole
  const cross = await inCtx(A, () => prisma.room.findFirst({ where: { id: roomB.id } }));
  ok('A ne peut pas lire la salle de B par ID', cross === null);

  // 4. Modification croisee
  await throws(() => inCtx(A, () => prisma.room.update({ where: { id: roomB.id }, data: { name: 'TEST-ISOL-HACKED' } })));
  const afterUpd = await platformPrisma.room.findFirst({ where: { id: roomB.id } });
  ok('A ne peut pas modifier la salle de B', afterUpd && afterUpd.name === 'TEST-ISOL-B', `nom=${afterUpd?.name}`);

  const um = await inCtx(A, () => prisma.room.updateMany({ where: { id: roomB.id }, data: { name: 'TEST-ISOL-HACKED' } }));
  ok('updateMany croise = 0 ligne', um.count === 0, `count=${um.count}`);

  // 5. Suppression croisee
  await throws(() => inCtx(A, () => prisma.room.delete({ where: { id: roomB.id } })));
  const dm = await inCtx(A, () => prisma.room.deleteMany({ where: { id: roomB.id } }));
  const stillThere = await platformPrisma.room.findFirst({ where: { id: roomB.id } });
  ok('A ne peut pas supprimer la salle de B', !!stillThere && dm.count === 0, `deleteMany.count=${dm.count}`);

  // 6. Dans une transaction (comme les routes)
  const txCross = await inCtx(A, () => prisma.$transaction(async (tx) => tx.room.findFirst({ where: { id: roomB.id } })));
  ok('isolation dans $transaction', txCross === null);

  // 7. Tentative d'ecrire dans une autre ecole via data.schoolId
  let forged = null;
  const forgedErr = await throws(async () => {
    forged = await inCtx(A, () => prisma.room.create({ data: { name: 'TEST-ISOL-FORGED', capacity: 5, schoolId: B } }));
  });
  ok('schoolId force a B refuse ou ecrase', forgedErr !== null || (forged && forged.schoolId === A),
     forgedErr ? 'rejete' : `schoolId=${forged?.schoolId}`);

  // 8. Operations interdites et contexte manquant
  const e1 = await throws(() => inCtx(A, () => prisma.room.findUnique({ where: { id: roomA.id } })));
  ok('findUnique rejete', e1 !== null);
  const e2 = await throws(() => prisma.room.findMany());
  ok('requete sans contexte rejetee', e2 !== null);

  // 9. Utilisateurs : meme e-mail dans A et B
  const uA = await inCtx(A, () => prisma.user.findMany({ where: { email: 'admin@ecole.local' } }));
  const uB = await inCtx(B, () => prisma.user.findMany({ where: { email: 'admin@ecole.local' } }));
  ok('users : A ne voit que son admin', uA.length === 1 && uA[0].schoolId === A, `${uA.length} / schoolId=${uA[0]?.schoolId}`);
  ok('users : B ne voit que son admin', uB.length === 1 && uB[0].schoolId === B, `${uB.length} / schoolId=${uB[0]?.schoolId}`);
  const allA = await inCtx(A, () => prisma.user.findMany({ select: { schoolId: true } }));
  ok('users : aucune ligne d une autre ecole', allA.every((u) => u.schoolId === A), `${allA.length} users`);
} catch (e) {
  console.error('ERREUR INATTENDUE :', e);
  failed += 1;
} finally {
  await platformPrisma.room.deleteMany({ where: { name: { startsWith: 'TEST-ISOL' } } });
  await platformPrisma.$disconnect();
}
console.log(failed === 0 ? '\nTOUS LES TESTS PASSENT' : `\n${failed} TEST(S) EN ECHEC`);
process.exit(failed === 0 ? 0 : 1);