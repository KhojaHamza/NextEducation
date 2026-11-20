import 'dotenv/config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { platformPrisma } from './src/config/prisma.js';

if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')) {
  console.error('STOP : DATABASE_URL ne pointe pas vers localhost.');
  process.exit(1);
}

const BASE = process.env.TEST_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
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
  return { status: res.status, json, cache: res.headers.get('cache-control') || '' };
};
const has = (r, text) => JSON.stringify(r.json ?? {}).includes(text);
const sign = (id, role) => jwt.sign({ sub: String(id), role }, process.env.JWT_SECRET, { expiresIn: '10m' });

const suffix = Math.random().toString(36).slice(2, 8);
const CODE = `test-plat-${suffix}`;
const ADMIN_EMAIL = `admin-${suffix}@test.local`;
let saId = null;
let schoolId = null;

try {
  try {
    const h = await api('GET', '/api/health');
    console.log(`Serveur : ${BASE} (health ${h.status})\n`);
  } catch {
    console.error(`Serveur injoignable sur ${BASE}. Lance "npm run dev" ou definis TEST_BASE_URL.`);
    process.exit(1);
  }

  const sa = await platformPrisma.user.create({
    data: {
      email: `sa-${suffix}@platform.local`, passwordHash: await bcrypt.hash('inutilise', 4),
      role: 'SUPER_ADMIN', firstName: 'Test', lastName: 'Super',
    },
  });
  saId = sa.id;
  const tSA = sign(sa.id, 'SUPER_ADMIN');

  const schoolA = await platformPrisma.school.findFirst({ where: { code: 'ali-slimen' } });
  const adminA = await platformPrisma.user.findFirst({ where: { schoolId: schoolA.id, role: 'ADMIN', deletedAt: null } });
  const tA = sign(adminA.id, 'ADMIN');

  // 1. Acces
  const r1 = await api('GET', '/api/platform/schools');
  ok('sans jeton = 401', r1.status === 401, `status=${r1.status}`);
  const r2 = await api('GET', '/api/platform/schools', tA);
  ok('admin d ecole refuse sur GET /platform/schools (403)', r2.status === 403, `status=${r2.status}`);
  const r3 = await api('POST', '/api/platform/schools', tA, { code: 'pirate', name: 'Pirate', admin: { firstName: 'a', lastName: 'b', email: 'x@y.local' } });
  ok('admin d ecole refuse sur POST /platform/schools (403)', r3.status === 403, `status=${r3.status}`);
  const r4 = await api('GET', '/api/students', tSA);
  ok('SUPER_ADMIN refuse sur les donnees d ecole (403)', r4.status === 403, `status=${r4.status}`);

  // 2. Liste
  const list = await api('GET', '/api/platform/schools', tSA);
  const codes = (list.json?.data ?? []).map((s) => s.code);
  ok('SUPER_ADMIN liste les ecoles (200)', list.status === 200, `status=${list.status}`);
  ok('la liste contient ali-slimen et ecole-b', codes.includes('ali-slimen') && codes.includes('ecole-b'), codes.join(', '));
  ok('la liste ne contient aucune donnee sensible', !has(list, 'passwordHash') && !has(list, 'email'));

  // 3. Creation
  const create = await api('POST', '/api/platform/schools', tSA, {
    code: CODE, name: 'Test Plateforme',
    admin: { firstName: 'Admin', lastName: 'Test', email: `Admin-${suffix}@Test.local` },
  });
  const d = create.json?.data;
  schoolId = d?.school?.id ?? null;
  const tmp = d?.temporaryPassword ?? '';
  ok('creation d ecole (201)', create.status === 201 && !!schoolId, `status=${create.status}`);
  ok('mot de passe temporaire valide (12 car., majuscule, chiffre)', tmp.length === 12 && /[A-Z]/.test(tmp) && /[0-9]/.test(tmp));
  ok('reponse en no-store', /no-store/.test(create.cache), create.cache);
  ok('aucun hash dans la reponse', !has(create, 'passwordHash'));
  ok('e-mail de l admin mis en minuscules', d?.admin?.email === ADMIN_EMAIL, d?.admin?.email);
  if (!schoolId) throw new Error('creation impossible : ' + JSON.stringify(create.json));

  // 4. Validation
  const dup = await api('POST', '/api/platform/schools', tSA, { code: CODE, name: 'Doublon', admin: { firstName: 'a', lastName: 'b', email: 'dup@test.local' } });
  ok('code deja utilise = 409', dup.status === 409, `status=${dup.status}`);
  const reserved = await api('POST', '/api/platform/schools', tSA, { code: 'admin', name: 'Reserve', admin: { firstName: 'a', lastName: 'b', email: 'r@test.local' } });
  ok('code reserve = 400', reserved.status === 400, `status=${reserved.status}`);
  const badCode = await api('POST', '/api/platform/schools', tSA, { code: 'Bad Code', name: 'X', admin: { firstName: 'a', lastName: 'b', email: 'b@test.local' } });
  ok('code invalide = 400', badCode.status === 400, `status=${badCode.status}`);

  // 5. Premier admin de la nouvelle ecole
  const lg = await api('POST', '/api/auth/login', null, { schoolCode: CODE, email: ADMIN_EMAIL, password: tmp });
  const tNew = lg.json?.token;
  ok('login avec le mot de passe temporaire (200)', lg.status === 200 && !!tNew, `status=${lg.status}`);
  ok('mustChangePassword = true', lg.json?.user?.mustChangePassword === true);
  const blocked = await api('GET', '/api/rooms', tNew);
  ok('acces bloque tant que le mot de passe n est pas change (403)', blocked.status === 403, `status=${blocked.status}`);
  const ch = await api('PATCH', '/api/auth/password', tNew, { currentPassword: tmp, newPassword: 'Nouveau1234' });
  ok('changement du mot de passe (200)', ch.status === 200, `status=${ch.status}`);
  const after = await api('GET', '/api/rooms', tNew);
  ok('acces libre apres changement (200)', after.status === 200, `status=${after.status}`);

  // 6. Isolation avec l'ecole A
  await api('POST', '/api/rooms', tA, { name: 'TEST-PLAT-ROOM', capacity: 5 });
  const roomsNew = await api('GET', '/api/rooms', tNew);
  ok('la nouvelle ecole ne voit pas les salles de A', !has(roomsNew, 'TEST-PLAT-ROOM'));

  // 7. Detail, statuts
  const detail = await api('GET', `/api/platform/schools/${schoolId}`, tSA);
  ok('detail : 1 ADMIN compte, sans donnees personnelles', detail.status === 200 && detail.json?.data?.usersByRole?.ADMIN === 1 && !has(detail, ADMIN_EMAIL), `status=${detail.status}`);
  const badId = await api('GET', '/api/platform/schools/abc', tSA);
  ok('id invalide = 400', badId.status === 400, `status=${badId.status}`);
  const unknown = await api('GET', '/api/platform/schools/999999', tSA);
  ok('ecole inconnue = 404', unknown.status === 404, `status=${unknown.status}`);
  const badStatus = await api('PATCH', `/api/platform/schools/${schoolId}/status`, tSA, { status: 'FOO' });
  ok('statut invalide = 400', badStatus.status === 400, `status=${badStatus.status}`);

  const susp = await api('PATCH', `/api/platform/schools/${schoolId}/status`, tSA, { status: 'SUSPENDED' });
  ok('suspension (200)', susp.status === 200 && susp.json?.data?.status === 'SUSPENDED', `status=${susp.status}`);
  const blockedSusp = await api('GET', '/api/rooms', tNew);
  ok('jeton existant bloque apres suspension (403)', blockedSusp.status === 403, `status=${blockedSusp.status}`);
  const react = await api('PATCH', `/api/platform/schools/${schoolId}/status`, tSA, { status: 'ACTIVE' });
  ok('reactivation (200)', react.status === 200 && react.json?.data?.status === 'ACTIVE', `status=${react.status}`);
  const back = await api('GET', '/api/rooms', tNew);
  ok('acces retabli apres reactivation (200)', back.status === 200, `status=${back.status}`);

  // 8. Reinitialisation du mot de passe admin
  const noAdmin = await api('POST', `/api/platform/schools/${schoolId}/admin-password-reset`, tSA, { email: 'inconnu@test.local' });
  ok('reset : admin inconnu = 404', noAdmin.status === 404, `status=${noAdmin.status}`);
  const reset = await api('POST', `/api/platform/schools/${schoolId}/admin-password-reset`, tSA, { email: ADMIN_EMAIL.toUpperCase() });
  const tmp2 = reset.json?.data?.temporaryPassword ?? '';
  ok('reset : nouveau mot de passe different (200)', reset.status === 200 && tmp2.length === 12 && tmp2 !== tmp, `status=${reset.status}`);
  ok('reset : reponse en no-store', /no-store/.test(reset.cache), reset.cache);
  const afterReset = await api('GET', '/api/rooms', tNew);
  ok('apres reset, changement de mot de passe exige a nouveau (403)', afterReset.status === 403, `status=${afterReset.status}`);

  // 9. Journal
  const logs = await api('GET', `/api/platform/audit-logs?schoolId=${schoolId}`, tSA);
  const actions = (logs.json?.data ?? []).map((l) => l.action);
  ok('journal : creation, statut et reset presents',
    ['CREATE_SCHOOL', 'SET_SCHOOL_STATUS', 'RESET_ADMIN_PASSWORD'].every((a) => actions.includes(a)), actions.join(', '));
  ok('journal : aucun mot de passe ni hash', !has(logs, tmp) && !has(logs, tmp2) && !has(logs, 'passwordHash'));
  const logsA = await api('GET', '/api/platform/audit-logs', tA);
  ok('journal : refuse a un admin d ecole (403)', logsA.status === 403, `status=${logsA.status}`);
} catch (e) {
  console.error('\nERREUR :', e.message);
  failed += 1;
} finally {
  try { await platformPrisma.room.deleteMany({ where: { name: { startsWith: 'TEST-PLAT' } } }); } catch { /* ignore */ }
  if (schoolId) {
    try {
      await platformPrisma.platformAuditLog.deleteMany({ where: { targetSchoolId: schoolId } });
      await platformPrisma.user.deleteMany({ where: { schoolId } });
      await platformPrisma.school.delete({ where: { id: schoolId } });
    } catch (e) {
      console.error(`Nettoyage incomplet de l ecole ${CODE} :`, e.message);
    }
  }
  if (saId) { try { await platformPrisma.user.delete({ where: { id: saId } }); } catch { /* ignore */ } }
  await platformPrisma.$disconnect();
}
console.log(failed === 0 ? '\nTOUS LES TESTS PLATEFORME PASSENT' : `\n${failed} TEST(S) EN ECHEC`);
process.exit(failed === 0 ? 0 : 1);