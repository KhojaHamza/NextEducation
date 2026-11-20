import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { platformPrisma } from './src/config/prisma.js';

if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')) {
  console.error('STOP : DATABASE_URL ne pointe pas vers localhost.');
  process.exit(1);
}

const BASE = process.env.TEST_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
const PASS_A = 'admin1234';
const PASS_B = 'adminB1234';
const EMAIL = 'admin@ecole.local';

let failed = 0;
const ok = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
  if (!cond) failed += 1;
};

const api = async (method, path, token, body) => {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* pas de JSON */ }
  return { status: res.status, json };
};
const tokenOf = (r) => r.json?.data?.token ?? r.json?.token ?? null;
const userOf = (r) => r.json?.data?.user ?? r.json?.user ?? null;
const idOf = (r) => r.json?.data?.id ?? r.json?.id ?? null;
const has = (r, text) => JSON.stringify(r.json ?? {}).includes(text);

let superAdminId = null;

try {
  // 0. Serveur joignable ?
  try {
    const h = await api('GET', '/api/health');
    console.log(`Serveur : ${BASE} (health ${h.status})\n`);
  } catch {
    console.error(`Serveur injoignable sur ${BASE}. Lance "npm run dev" ou definis TEST_BASE_URL.`);
    process.exit(1);
  }

  await platformPrisma.room.deleteMany({ where: { name: { startsWith: 'TEST-HTTP' } } });

  // 1. Connexions
  const loginA = await api('POST', '/api/auth/login', null, { schoolCode: 'ali-slimen', email: EMAIL, password: PASS_A });
  const loginB = await api('POST', '/api/auth/login', null, { schoolCode: 'ecole-b', email: EMAIL, password: PASS_B });
  const tA = tokenOf(loginA);
  const tB = tokenOf(loginB);
  ok('login A (HTTP 200 + jeton)', loginA.status === 200 && !!tA, `status=${loginA.status}`);
  ok('login B (HTTP 200 + jeton)', loginB.status === 200 && !!tB, `status=${loginB.status}`);
  if (!tA || !tB) {
    console.error('\nImpossible de continuer sans les deux jetons. Reponse login A :', JSON.stringify(loginA.json));
    throw new Error('login impossible');
  }
  ok('A et B ont des schoolId differents', userOf(loginA)?.schoolId === 1 && userOf(loginB)?.schoolId === 3,
     `A=${userOf(loginA)?.schoolId} B=${userOf(loginB)?.schoolId}`);

  // 2. Mauvais code d'ecole
  const cross = await api('POST', '/api/auth/login', null, { schoolCode: 'ecole-b', email: EMAIL, password: PASS_A });
  ok('mot de passe de A refuse avec le code de B', cross.status === 401, `status=${cross.status}`);
  const noSchool = await api('POST', '/api/auth/login', null, { schoolCode: 'inexistante', email: EMAIL, password: PASS_A });
  ok('ecole inexistante refusee', noSchool.status === 401, `status=${noSchool.status}`);

  // 3. Sans jeton / faux jeton
  const noTok = await api('GET', '/api/rooms');
  ok('sans jeton = 401', noTok.status === 401, `status=${noTok.status}`);
  const badTok = await api('GET', '/api/rooms', 'abc.def.ghi');
  ok('faux jeton = 401', badTok.status === 401, `status=${badTok.status}`);

  // 4. Creation de salles
  const cA = await api('POST', '/api/rooms', tA, { name: 'TEST-HTTP-A', capacity: 20 });
  const cB = await api('POST', '/api/rooms', tB, { name: 'TEST-HTTP-B', capacity: 20 });
  const idA = idOf(cA);
  const idB = idOf(cB);
  ok('A cree sa salle (201)', cA.status === 201 && !!idA, `status=${cA.status}`);
  ok('B cree sa salle (201)', cB.status === 201 && !!idB, `status=${cB.status}`);
  if (!idA || !idB) throw new Error('creation de salle impossible : ' + JSON.stringify(cA.json));

  // 5. Listes
  const lA = await api('GET', '/api/rooms', tA);
  const lB = await api('GET', '/api/rooms', tB);
  ok('liste A contient sa salle', lA.status === 200 && has(lA, 'TEST-HTTP-A'));
  ok('liste A ne contient PAS la salle de B', !has(lA, 'TEST-HTTP-B'));
  ok('liste B contient sa salle', lB.status === 200 && has(lB, 'TEST-HTTP-B'));
  ok('liste B ne contient PAS la salle de A', !has(lB, 'TEST-HTTP-A'));

  // 6. Acces croises par ID
  const gX = await api('GET', `/api/rooms/${idB}`, tA);
  ok('A ne peut pas lire la salle de B (404)', gX.status === 404, `status=${gX.status}`);
  const pX = await api('PATCH', `/api/rooms/${idB}`, tA, { name: 'TEST-HTTP-HACKED' });
  ok('A ne peut pas modifier la salle de B (404)', pX.status === 404, `status=${pX.status}`);
  const dX = await api('DELETE', `/api/rooms/${idB}`, tA);
  ok('A ne peut pas supprimer la salle de B (404)', dX.status === 404, `status=${dX.status}`);
  const gB = await api('GET', `/api/rooms/${idB}`, tB);
  ok('la salle de B est intacte', gB.status === 200 && has(gB, 'TEST-HTTP-B') && !has(gB, 'HACKED'), `status=${gB.status}`);

  // 7. Injection de schoolId dans le corps
  const forged = await api('POST', '/api/rooms', tA, { name: 'TEST-HTTP-FORGED', capacity: 5, schoolId: 3 });
  const lB2 = await api('GET', '/api/rooms', tB);
  ok('schoolId du corps ignore ou refuse', !has(lB2, 'TEST-HTTP-FORGED'), `creation status=${forged.status}`);

  // 8. SUPER_ADMIN sur une route d'ecole
  const sa = await platformPrisma.user.create({
    data: { email: 'superadmin-test@platform.local', passwordHash: 'x', role: 'SUPER_ADMIN', firstName: 'Test', lastName: 'Super' },
  });
  superAdminId = sa.id;
  const saToken = jwt.sign({ sub: String(sa.id), role: 'SUPER_ADMIN' }, process.env.JWT_SECRET, { expiresIn: '5m' });
  const saRooms = await api('GET', '/api/rooms', saToken);
  ok('SUPER_ADMIN refuse sur /api/rooms (403)', saRooms.status === 403, `status=${saRooms.status}`);
  const saStudents = await api('GET', '/api/students', saToken);
  ok('SUPER_ADMIN ne recoit pas les eleves (pas 200)', saStudents.status !== 200, `status=${saStudents.status}`);

  // 9. Ecole suspendue
  let suspended = true;
  try {
    await platformPrisma.school.update({ where: { code: 'ecole-b' }, data: { status: 'SUSPENDED' } });
  } catch (e) {
    suspended = false;
    console.log('SKIP  suspension : valeur SUSPENDED refusee par l enum :', String(e.message).split('\n').pop());
  }
  if (suspended) {
    const sB = await api('GET', '/api/rooms', tB);
    ok('jeton existant de B bloque apres suspension (403)', sB.status === 403, `status=${sB.status}`);
    const sLogin = await api('POST', '/api/auth/login', null, { schoolCode: 'ecole-b', email: EMAIL, password: PASS_B });
    ok('connexion B refusee apres suspension (401)', sLogin.status === 401, `status=${sLogin.status}`);
    const sA = await api('GET', '/api/rooms', tA);
    ok('A non affecte par la suspension de B', sA.status === 200, `status=${sA.status}`);
    await platformPrisma.school.update({ where: { code: 'ecole-b' }, data: { status: 'ACTIVE' } });
    const back = await api('GET', '/api/rooms', tB);
    ok('B de nouveau accessible apres reactivation', back.status === 200, `status=${back.status}`);
  }
} catch (e) {
  console.error('\nERREUR :', e.message);
  failed += 1;
} finally {
  try { await platformPrisma.school.update({ where: { code: 'ecole-b' }, data: { status: 'ACTIVE' } }); } catch { /* ignore */ }
  try { await platformPrisma.room.deleteMany({ where: { name: { startsWith: 'TEST-HTTP' } } }); } catch { /* ignore */ }
  if (superAdminId) { try { await platformPrisma.user.delete({ where: { id: superAdminId } }); } catch { /* ignore */ } }
  await platformPrisma.$disconnect();
}
console.log(failed === 0 ? '\nTOUS LES TESTS HTTP PASSENT' : `\n${failed} TEST(S) EN ECHEC`);
process.exit(failed === 0 ? 0 : 1);