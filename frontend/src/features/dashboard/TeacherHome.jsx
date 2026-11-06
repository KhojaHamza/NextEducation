import { Link } from 'react-router-dom';
import { ClipboardList, School } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { useAuth } from '../auth/useAuth.js';
import { useMyClasses } from '../evaluations/hooks.js';
import { classLabel } from '../students/format.js';

export default function TeacherHome() {
  const { user } = useAuth();
  const mine = useMyClasses();

  const all = mine.data ?? [];
  const current = all.filter((c) => c.schoolYear?.isCurrent);
  const classes = current.length ? current : all;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-semibold">Bonjour {user.firstName} !</h1>
        <p className="mt-1 text-lg">Voici tes classes. Choisis une évaluation pour saisir les notes.</p>
      </header>

      <section aria-label="Mes classes">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Mes classes</h2>
          <Link
            to="/enseignant/evaluations"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky px-5 font-bold text-white hover:bg-sky/90"
          >
            <ClipboardList className="size-4" aria-hidden="true" />
            Évaluations
          </Link>
        </div>

        {mine.isPending ? (
          <div role="status" aria-label="Chargement des classes" className="h-32 animate-pulse rounded-2xl bg-ink/10" />
        ) : mine.error ? (
          <Alert tone="danger" title="Impossible de charger tes classes">
            <p>{mine.error.message}</p>
            <Button variant="secondary" onClick={() => mine.refetch()} className="mt-3">
              Réessayer
            </Button>
          </Alert>
        ) : classes.length === 0 ? (
          <EmptyState icon={School} title="Aucune classe attribuée">
            L’administration doit t’attribuer une classe ou une matière avant que tu puisses saisir des notes.
          </EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {classes.map((c) => (
              <li key={c.id} className="rounded-2xl bg-paper p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-2xl font-semibold">{classLabel(c)}</p>
                  {c.homeroom && <Badge tone="success">Titulaire</Badge>}
                </div>
                <p className="mt-1 text-sm text-ink/70">{c.schoolYear?.label}</p>
                {c.subjects.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {c.subjects.map((s) => (
                      <li key={s.id}>
                        <Badge tone="info">{s.name}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3">Aucune matière attribuée.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}