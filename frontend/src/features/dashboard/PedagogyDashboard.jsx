import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import { useSchoolYears } from '../classes/hooks.js';
import { messageFor } from '../reportCards/errors.js';
import { fmtAverage, mentionTone, termName, termOptions } from '../reportCards/format.js';
import { classLabel } from '../students/format.js';
import { useClassRanking, usePedagogyDashboard } from './pedagogyHooks.js';

const avg = (n) => (n === null || n === undefined ? '—' : fmtAverage(n));
const pct = (n) => (n === null || n === undefined ? '—' : `${String(n).replace('.', ',')} %`);
const studentName = (s) => `${s.lastName} ${s.firstName}`;
const barColor = (value) => (value >= 14 ? 'bg-meadow' : value >= 10 ? 'bg-sky' : 'bg-coral');

function Stat({ label, hint, children }) {
  return (
    <div className="rounded-2xl bg-paper p-5">
      <p className="text-ink/70">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{children}</p>
      {hint && <p className="mt-1 text-sm text-ink/70">{hint}</p>}
    </div>
  );
}

// Les chiffres sont toujours écrits à côté : la couleur ne porte jamais seule l'information
function Bar({ percent, className }) {
  const width = Math.max(0, Math.min(100, percent ?? 0));
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-ink/10" aria-hidden="true">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${width}%` }} />
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="rounded-2xl bg-paper p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink/70">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ClassPanel({ schoolClass, term, onClose }) {
  const ranking = useClassRanking(schoolClass.id, term);
  const rows = ranking.data?.students ?? [];

  const columns = [
    { key: 'rank', header: 'Rang', render: (r) => r.rank ?? '—' },
    {
      key: 'name',
      header: 'Élève',
      primary: true,
      render: (r) => (
        <Link to={`/admin/bulletins/${r.student.id}?term=${term}`} className="font-bold text-sky hover:underline">
          {studentName(r.student)}
        </Link>
      ),
    },
    { key: 'general', header: 'Moyenne /20', render: (r) => avg(r.general) },
    {
      key: 'mention',
      header: 'Mention',
      render: (r) =>
        r.general === null ? '—' : <Badge tone={mentionTone[r.mention] ?? 'neutral'}>{r.mention}</Badge>,
    },
  ];

  return (
    <Section
      title={`Moyennes des élèves — ${classLabel(schoolClass)}`}
      description={`${termName(term)} · du meilleur au plus faible.`}
    >
      <div className="mb-4">
        <Button variant="secondary" onClick={onClose}>
          Fermer le détail
        </Button>
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        loading={ranking.isPending}
        error={ranking.error ? { message: messageFor(ranking.error) } : null}
        onRetry={ranking.refetch}
        getRowKey={(r) => r.student.id}
        empty={<p>Aucun élève dans cette classe.</p>}
      />
    </Section>
  );
}

function Dashboard({ data, term }) {
  const [selectedClass, setSelectedClass] = useState(null);
  const t = data.totals;
  const maxCount = Math.max(1, ...data.distribution.map((b) => b.count));

  if (t.graded === 0) {
    return (
      <EmptyState icon={ClipboardList} title="Aucune note pour cette période">
        Les statistiques apparaîtront dès que des notes auront été saisies pour {termName(term).toLowerCase()}.
      </EmptyState>
    );
  }

  const classColumns = [
    { key: 'label', header: 'Classe', primary: true, render: (c) => <strong>{classLabel(c)}</strong> },
    { key: 'graded', header: 'Élèves notés', render: (c) => `${c.graded} / ${c.enrolled}` },
    { key: 'average', header: 'Moyenne /20', render: (c) => avg(c.average) },
    { key: 'passRate', header: 'Réussite', render: (c) => pct(c.passRate) },
    { key: 'failRate', header: 'Échec', render: (c) => pct(c.failRate) },
    {
      key: 'actions',
      header: 'Élèves',
      render: (c) => (
        <Button variant="ghost" onClick={() => setSelectedClass(c)} disabled={c.graded === 0}>
          Voir les moyennes
        </Button>
      ),
    },
  ];

  const strugglingColumns = [
    {
      key: 'name',
      header: 'Élève',
      primary: true,
      render: (r) => (
        <Link to={`/admin/bulletins/${r.student.id}?term=${term}`} className="font-bold text-sky hover:underline">
          {studentName(r.student)}
        </Link>
      ),
    },
    { key: 'class', header: 'Classe', render: (r) => classLabel(r.schoolClass) },
    { key: 'general', header: 'Moyenne /20', render: (r) => <strong>{avg(r.general)}</strong> },
    {
      key: 'weak',
      header: 'Matières à renforcer',
      render: (r) =>
        r.weakSubjects.length ? (
          <span className="flex flex-wrap justify-end gap-1 md:justify-start">
            {r.weakSubjects.map((s) => (
              <Badge key={s.name} tone="warning">
                {s.name} {avg(s.average)}
              </Badge>
            ))}
          </span>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <section aria-label="Chiffres clés" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Moyenne générale de l’école" hint={`${t.graded} élèves notés`}>
          {avg(t.schoolAverage)} <span className="text-lg font-bold">/ 20</span>
        </Stat>
        <Stat label="Taux de réussite" hint={`${t.passed} élèves avec au moins ${data.passMark} / 20`}>
          {pct(t.passRate)}
        </Stat>
        <Stat label="Taux d’échec" hint={`${t.failed} élèves sous ${data.passMark} / 20`}>
          {pct(t.failRate)}
        </Stat>
        <Stat label="Élèves en difficulté" hint={t.withoutGrades > 0 ? `${t.withoutGrades} élèves sans aucune note` : undefined}>
          {data.struggling.total}
        </Stat>
      </section>

      <Section
        title="Réussite et échec"
        description={`Un élève réussit quand sa moyenne générale est d’au moins ${data.passMark} / 20.`}
      >
        <div
          className="flex h-6 w-full overflow-hidden rounded-full bg-ink/10"
          role="img"
          aria-label={`Réussite ${pct(t.passRate)}, échec ${pct(t.failRate)}`}
        >
          <div className="h-full bg-meadow" style={{ width: `${t.passRate ?? 0}%` }} />
          <div className="h-full bg-coral" style={{ width: `${t.failRate ?? 0}%` }} />
        </div>
        <p className="mt-2 flex flex-wrap gap-x-6 gap-y-1 font-bold">
          <span>Réussite : {pct(t.passRate)}</span>
          <span>Échec : {pct(t.failRate)}</span>
        </p>

        <h3 className="mt-6 font-bold">Répartition des moyennes générales</h3>
        <ul className="mt-2 space-y-2">
          {data.distribution.map((b) => (
            <li key={b.label} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3">
              <span>{b.label}</span>
              <Bar percent={(b.count / maxCount) * 100} className={b.passing ? 'bg-meadow' : 'bg-coral'} />
              <span className="text-end font-bold">{b.count}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Résultats par classe" description="Clique sur « Voir les moyennes » pour le détail de chaque élève.">
        <DataTable
          columns={classColumns}
          rows={data.classes}
          getRowKey={(c) => c.id}
          empty={<p>Aucune classe pour cette année scolaire.</p>}
        />
      </Section>

      {selectedClass && (
        <ClassPanel schoolClass={selectedClass} term={term} onClose={() => setSelectedClass(null)} />
      )}

      <Section
        title="Classement des matières"
        description="Moyenne de tous les élèves dans chaque matière, de la mieux réussie à la plus difficile."
      >
        {data.subjects.length === 0 ? (
          <p>Aucune matière notée pour cette période.</p>
        ) : (
          <ol className="space-y-3">
            {data.subjects.map((s, i) => (
              <li key={s.name}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-bold">
                    {i + 1}. {s.name}
                  </span>
                  <span>
                    <strong>{avg(s.average)} / 20</strong> · réussite {pct(s.passRate)}
                  </span>
                </div>
                <Bar percent={(s.average / 20) * 100} className={barColor(s.average)} />
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section
        title="Élèves en difficulté"
        description={`Moyenne générale sous ${data.passMark} / 20, des plus faibles aux moins faibles.`}
      >
        {data.struggling.total === 0 ? (
          <Alert tone="success">Aucun élève sous la moyenne pour cette période.</Alert>
        ) : (
          <>
            <DataTable columns={strugglingColumns} rows={data.struggling.students} getRowKey={(r) => r.student.id} />
            {data.struggling.total > data.struggling.students.length && (
              <p className="mt-3 text-sm text-ink/70">
                Les {data.struggling.students.length} plus faibles sur {data.struggling.total}. Utilise le détail par
                classe pour voir les autres.
              </p>
            )}
          </>
        )}
      </Section>

      {data.topStudents.length > 0 && (
        <Section title="Meilleurs élèves" description="Les cinq meilleures moyennes générales de l’école.">
          <ol className="space-y-2">
            {data.topStudents.map((r, i) => (
              <li key={r.student.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {i + 1}.{' '}
                  <Link to={`/admin/bulletins/${r.student.id}?term=${term}`} className="font-bold text-sky hover:underline">
                    {studentName(r.student)}
                  </Link>{' '}
                  <span className="text-ink/70">· {classLabel(r.schoolClass)}</span>
                </span>
                <Badge tone="success">{avg(r.general)} / 20</Badge>
              </li>
            ))}
          </ol>
        </Section>
      )}
    </div>
  );
}

export default function PedagogyDashboard() {
  const years = useSchoolYears();
  const yearList = years.data ?? [];
  const defaultYear = yearList.find((y) => y.isCurrent) ?? yearList[0];

  const [pickedYear, setPickedYear] = useState(null);
  const [term, setTerm] = useState('ANNUAL');
  const yearId = pickedYear ?? (defaultYear ? String(defaultYear.id) : '');

  const dash = usePedagogyDashboard({ term, schoolYearId: yearId }, !years.isPending);

  let body;
  if (years.isPending || dash.isPending) {
    body = <div role="status" aria-label="Chargement" className="h-64 animate-pulse rounded-2xl bg-ink/10" />;
  } else if (dash.error) {
    body = (
      <Alert tone="danger" title="Impossible de charger le tableau de bord">
        <p>{messageFor(dash.error)}</p>
        <Button variant="secondary" onClick={() => dash.refetch()} className="mt-3">
          Réessayer
        </Button>
      </Alert>
    );
  } else {
    body = (
      <div className={dash.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined} aria-busy={dash.isFetching}>
        {/* key: on change d'année ou de période, le détail d'une classe précédente disparaît */}
        <Dashboard key={`${dash.data.schoolYear.id}-${term}`} data={dash.data} term={term} />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Tableau de bord pédagogique"
        description="Les résultats scolaires de l’école : moyennes, réussite, matières et élèves en difficulté."
      />

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <SelectField
          label="Année scolaire"
          value={yearId}
          disabled={years.isPending || yearList.length === 0}
          onChange={(e) => setPickedYear(e.target.value)}
          className="w-full sm:w-56"
        >
          {yearList.map((y) => (
            <option key={y.id} value={y.id}>
              {y.label}
              {y.isCurrent ? ' (en cours)' : ''}
            </option>
          ))}
        </SelectField>

        <SelectField label="Période" value={term} onChange={(e) => setTerm(e.target.value)} className="w-full sm:w-56">
          {termOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>
      </div>

      {body}
    </>
  );
}
