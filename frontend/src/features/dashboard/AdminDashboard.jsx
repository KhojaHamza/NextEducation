import { Link } from 'react-router-dom';
import { CalendarDays, GraduationCap, Plus, Presentation, School, TriangleAlert, Users } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import { useAuth } from '../auth/useAuth.js';
import { useSchoolYears } from '../classes/hooks.js';
import { useCount } from './useCount.js';

function StatCard({ to, icon: Icon, label, query, tone = 'bg-sky/15' }) {
  const value = query.isPending ? '…' : query.error ? '—' : query.data;

  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-2xl bg-paper p-5 transition-shadow hover:shadow-md focus-visible:shadow-md"
    >
      <span className={`grid size-14 shrink-0 place-items-center rounded-full ${tone}`}>
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-4xl font-semibold" aria-live="polite">
          {value}
        </span>
        <span className="block font-bold">{label}</span>
      </span>
    </Link>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const years = useSchoolYears();
  const current = (years.data ?? []).find((y) => y.isCurrent);
  const yearReady = !years.isPending;

  const enrolled = useCount('students', { schoolYearId: current?.id }, Boolean(current));
  const unassigned = useCount('students', { unassigned: 'true' });
  const classes = useCount('classes', { schoolYearId: current?.id }, Boolean(current));
  const teachers = useCount('teachers');
  const parents = useCount('parents');

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-semibold">Bonjour {user.firstName} !</h1>
        <p className="mt-1 text-lg">
          {current ? `Année scolaire en cours : ${current.label}.` : 'Voici un aperçu de l’école.'}
        </p>
      </header>

      {yearReady && !years.error && !current && (
        <Alert tone="info" title="Aucune année scolaire en cours">
          <p>Définis une année en cours pour inscrire des élèves et suivre les classes.</p>
          <Link to="/admin/annees" className="mt-2 inline-block font-bold text-sky hover:underline">
            Gérer les années scolaires
          </Link>
        </Alert>
      )}

      <section aria-label="Chiffres clés" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {current && (
          <StatCard to="/admin/eleves" icon={GraduationCap} label={`Élèves inscrits en ${current.label}`} query={enrolled} />
        )}
        <StatCard
          to="/admin/eleves"
          icon={TriangleAlert}
          label="Élèves sans classe"
          query={unassigned}
          tone={unassigned.data > 0 ? 'bg-sun/50' : 'bg-meadow/25'}
        />
        {current && <StatCard to="/admin/classes" icon={School} label="Classes de l’année" query={classes} />}
        <StatCard to="/admin/enseignants" icon={Presentation} label="Enseignants" query={teachers} />
        <StatCard to="/admin/parents" icon={Users} label="Parents" query={parents} />
      </section>

      <section aria-label="Actions rapides">
        <h2 className="mb-3 text-xl font-semibold">Actions rapides</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/eleves/nouveau">
            <Button>
              <Plus className="size-4" aria-hidden="true" />
              Nouvel élève
            </Button>
          </Link>
          <Link to="/admin/classes">
            <Button variant="secondary">
              <School className="size-4" aria-hidden="true" />
              Classes
            </Button>
          </Link>
          <Link to="/admin/annees">
            <Button variant="secondary">
              <CalendarDays className="size-4" aria-hidden="true" />
              Années scolaires
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}