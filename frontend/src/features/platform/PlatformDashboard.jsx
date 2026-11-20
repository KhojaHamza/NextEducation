import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Button from '../../components/ui/Button.jsx';
import TextField from '../../components/ui/TextField.jsx';
import Alert from '../../components/ui/Alert.jsx';
import { useAuth } from '../auth/useAuth.js';
import * as platformApi from './platformApi.js';

const STATUS_LABEL = { ACTIVE: 'Active', TRIAL: 'Essai', SUSPENDED: 'Suspendue', DISABLED: 'Désactivée' };
const STATUS_STYLE = {
  ACTIVE: 'bg-meadow text-white',
  TRIAL: 'bg-sun text-ink',
  SUSPENDED: 'bg-coral text-white',
  DISABLED: 'bg-ink text-white',
};
const ACTION_LABEL = {
  CREATE_SCHOOL: 'Création d’école',
  UPDATE_SCHOOL: 'Modification',
  SET_SCHOOL_STATUS: 'Changement de statut',
  RESET_ADMIN_PASSWORD: 'Nouveau mot de passe admin',
};

const primaryBtn = 'min-h-11 rounded-xl bg-sky px-4 py-2 font-bold text-white disabled:opacity-60';
const secondaryBtn = 'min-h-11 rounded-xl border-2 border-sky px-4 py-2 font-bold text-sky disabled:opacity-60';

const createSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, 'Au moins 3 caractères.')
    .max(40, 'Maximum 40 caractères.')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, 'Lettres, chiffres et tirets simples uniquement.'),
  name: z.string().trim().min(2, 'Saisis le nom de l’école.').max(120),
  firstName: z.string().trim().min(1, 'Saisis le prénom.').max(60),
  lastName: z.string().trim().min(1, 'Saisis le nom.').max(60),
  email: z.string().trim().email('Adresse e-mail invalide.'),
});

export default function PlatformDashboard() {
  const { user, status } = useAuth();
  if (status === 'loading') return <p className="p-6 text-lg">Chargement…</p>;
  if (status !== 'authenticated' || user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/plateforme/connexion" replace />;
  }
  return <PlatformConsole user={user} />;
}

function PlatformConsole({ user }) {
  const { logout } = useAuth();
  const [schools, setSchools] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [secret, setSecret] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const loadSchools = useCallback(async () => {
    try {
      const res = await platformApi.listSchools({ search, status: statusFilter });
      setSchools(res.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  const loadLogs = useCallback(async () => {
    try {
      const res = await platformApi.listAuditLogs();
      setLogs(res.data);
    } catch {
      /* le journal est secondaire */
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(loadSchools, 250);
    return () => clearTimeout(t);
  }, [loadSchools]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const refresh = () => Promise.all([loadSchools(), loadLogs()]);

  const changeStatus = async (school, next) => {
    const question = next === 'SUSPENDED'
      ? `Veux-tu vraiment suspendre « ${school.name} » ? Ses utilisateurs ne pourront plus se connecter.`
      : `Veux-tu réactiver « ${school.name} » ?`;
    if (!window.confirm(question)) return;
    setBusyId(school.id);
    try {
      await platformApi.setSchoolStatus(school.id, next);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const resetPassword = async (school) => {
    const email = window.prompt(`E-mail de l’administrateur de « ${school.name} » :`);
    if (!email || !email.trim()) return;
    setBusyId(school.id);
    try {
      const res = await platformApi.resetAdminPassword(school.id, email.trim());
      setSecret({
        title: 'Nouveau mot de passe temporaire',
        schoolCode: school.code,
        email: res.data.admin.email,
        password: res.data.temporaryPassword,
      });
      await loadLogs();
    } catch (err) {
      setError(err.status === 404 ? 'Aucun administrateur avec cet e-mail dans cette école.' : err.message);
    } finally {
      setBusyId(null);
    }
  };

  const onCreated = async (data) => {
    setSecret({
      title: 'École créée',
      schoolCode: data.school.code,
      email: data.admin.email,
      password: data.temporaryPassword,
    });
    setShowCreate(false);
    await refresh();
  };

  const schoolCodeOf = (id) => schools.find((s) => s.id === id)?.code ?? (id ?? '—');

  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between gap-4 bg-sky px-6 py-4 text-white">
        <div>
          <p className="font-display text-2xl font-semibold">NextEducation</p>
          <p className="text-sm">Espace plateforme</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline">{user.firstName} {user.lastName}</span>
          <Link to="/mot-de-passe" className="min-h-11 rounded-xl border-2 border-white px-4 py-2 font-bold">
            Mon mot de passe
          </Link>
          <button type="button" onClick={logout} className="min-h-11 rounded-xl border-2 border-white px-4 py-2 font-bold">
            Se déconnecter
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-6">
        {error && <Alert tone="danger">{error}</Alert>}
        {secret && <SecretCard secret={secret} onClose={() => setSecret(null)} />}

        <section className="flex flex-wrap items-end gap-3">
          <h1 className="mr-auto text-3xl font-semibold">Écoles</h1>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (nom ou code)"
            aria-label="Rechercher une école"
            className="min-h-11 rounded-xl border-2 border-ink/20 bg-paper px-3"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtrer par statut"
            className="min-h-11 rounded-xl border-2 border-ink/20 bg-paper px-3"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button type="button" className={primaryBtn} onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? 'Annuler' : '+ Nouvelle école'}
          </button>
        </section>

        {showCreate && <CreateSchoolForm onCreated={onCreated} />}

        <div className="overflow-x-auto rounded-2xl bg-paper">
          <table className="w-full min-w-[44rem] text-left">
            <thead>
              <tr className="border-b-2 border-ink/10">
                <th className="p-3">Code</th>
                <th className="p-3">Nom</th>
                <th className="p-3">Statut</th>
                <th className="p-3">Utilisateurs</th>
                <th className="p-3">Élèves</th>
                <th className="p-3">Abonnement</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="p-4">Chargement…</td></tr>
              )}
              {!loading && schools.length === 0 && (
                <tr><td colSpan={7} className="p-4">Aucune école trouvée.</td></tr>
              )}
              {schools.map((s) => (
                <tr key={s.id} className="border-b border-ink/10">
                  <td className="p-3 font-mono">{s.code}</td>
                  <td className="p-3 font-bold">{s.name}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-3 py-1 text-sm font-bold ${STATUS_STYLE[s.status] ?? ''}`}>
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </td>
                  <td className="p-3">{s._count?.users ?? 0}</td>
                  <td className="p-3">{s._count?.students ?? 0}</td>
                  <td className="p-3">
                    {s.subscriptionEnd ? new Date(s.subscriptionEnd).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {s.status === 'ACTIVE' || s.status === 'TRIAL' ? (
                        <button type="button" className={secondaryBtn} disabled={busyId === s.id} onClick={() => changeStatus(s, 'SUSPENDED')}>
                          Suspendre
                        </button>
                      ) : (
                        <button type="button" className={secondaryBtn} disabled={busyId === s.id} onClick={() => changeStatus(s, 'ACTIVE')}>
                          Réactiver
                        </button>
                      )}
                      <button type="button" className={secondaryBtn} disabled={busyId === s.id} onClick={() => resetPassword(s)}>
                        Mot de passe admin
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section>
          <h2 className="text-2xl font-semibold">Journal de la plateforme</h2>
          <div className="mt-3 overflow-x-auto rounded-2xl bg-paper">
            <table className="w-full min-w-[34rem] text-left">
              <thead>
                <tr className="border-b-2 border-ink/10">
                  <th className="p-3">Date</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">École</th>
                  <th className="p-3">Détail</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr><td colSpan={4} className="p-4">Aucune action enregistrée.</td></tr>
                )}
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-ink/10">
                    <td className="p-3">{new Date(l.createdAt).toLocaleString('fr-FR')}</td>
                    <td className="p-3">{ACTION_LABEL[l.action] ?? l.action}</td>
                    <td className="p-3 font-mono">{schoolCodeOf(l.targetSchoolId)}</td>
                    <td className="p-3">
                      {l.details?.from && l.details?.to
                        ? `${STATUS_LABEL[l.details.from] ?? l.details.from} → ${STATUS_LABEL[l.details.to] ?? l.details.to}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function SecretCard({ secret, onClose }) {
  const [copied, setCopied] = useState(false);
  const loginUrl = `${window.location.origin}/e/${secret.schoolCode}/connexion`;
  const text = `Lien : ${loginUrl}\nE-mail : ${secret.email}\nMot de passe temporaire : ${secret.password}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="rounded-2xl border-2 border-sun bg-paper p-5" role="status">
      <h2 className="text-xl font-semibold">{secret.title}</h2>
      <p className="mt-1">
        Ce mot de passe n’est affiché qu’une seule fois. Transmets-le à l’administrateur de l’école :
        il devra le changer dès sa première connexion.
      </p>
      <dl className="mt-4 grid gap-2 sm:grid-cols-[11rem_1fr]">
        <dt className="font-bold">Lien de connexion</dt>
        <dd className="break-all">{loginUrl}</dd>
        <dt className="font-bold">E-mail</dt>
        <dd>{secret.email}</dd>
        <dt className="font-bold">Mot de passe</dt>
        <dd className="font-mono text-lg">{secret.password}</dd>
      </dl>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className={primaryBtn} onClick={copy}>
          {copied ? 'Copié ✓' : 'Tout copier'}
        </button>
        <button type="button" className={secondaryBtn} onClick={onClose}>
          J’ai noté, fermer
        </button>
      </div>
    </section>
  );
}

function CreateSchoolForm({ onCreated }) {
  const [serverError, setServerError] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createSchema),
    defaultValues: { code: '', name: '', firstName: '', lastName: '', email: '' },
  });

  const onSubmit = async (v) => {
    setServerError(null);
    try {
      const res = await platformApi.createSchool({
        code: v.code.toLowerCase(),
        name: v.name,
        admin: { firstName: v.firstName, lastName: v.lastName, email: v.email },
      });
      await onCreated(res.data);
    } catch (err) {
      if (err.status === 409) setServerError('Ce code d’école est déjà utilisé.');
      else if (err.status === 400 && /reserved/i.test(err.message)) setServerError('Ce code est réservé, choisis-en un autre.');
      else setServerError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 rounded-2xl bg-paper p-5">
      <h2 className="text-xl font-semibold">Nouvelle école</h2>
      {serverError && <Alert tone="danger">{serverError}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Code de l'école" placeholder="ex: ecole-ibn-sina" autoComplete="off"
          error={errors.code?.message} {...register('code')} />
        <TextField label="Nom de l'école" autoComplete="off"
          error={errors.name?.message} {...register('name')} />
        <TextField label="Prénom de l'administrateur" autoComplete="off"
          error={errors.firstName?.message} {...register('firstName')} />
        <TextField label="Nom de l'administrateur" autoComplete="off"
          error={errors.lastName?.message} {...register('lastName')} />
        <TextField label="E-mail de l'administrateur" type="email" inputMode="email" autoComplete="off"
          error={errors.email?.message} {...register('email')} />
      </div>
      <Button type="submit" loading={isSubmitting}>Créer l’école</Button>
    </form>
  );
}