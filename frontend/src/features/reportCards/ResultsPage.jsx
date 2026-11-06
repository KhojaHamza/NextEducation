import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users } from 'lucide-react';
import Badge from '../../components/ui/Badge.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import { useAuth } from '../auth/useAuth.js';
import ClassPicker from '../classes/ClassPicker.jsx';
import { useMyClasses } from '../evaluations/hooks.js';
import { classLabel } from '../students/format.js';
import { fmtAverage, mentionTone, termName, termOptions } from './format.js';
import { messageFor } from './errors.js';
import { useClassResults } from './hooks.js';

export default function ResultsPage() {
  const { user } = useAuth();
  const isTeacher = user.role === 'TEACHER';
  const base = isTeacher ? '/enseignant' : '/admin';

  const [schoolClass, setSchoolClass] = useState(null); // administrator's picker
  const [myClassId, setMyClassId] = useState(''); // teacher's picker
  const [term, setTerm] = useState('ANNUAL');

  const mine = useMyClasses(isTeacher);
  const myClasses = mine.data ?? [];
  // A teacher with a single class does not have to pick it
  const classId = isTeacher ? myClassId || (myClasses.length === 1 ? String(myClasses[0].id) : '') : schoolClass?.id;

  const results = useClassResults(classId, term);
  const data = results.data;

  const columns = [
    { key: 'rank', header: 'Rang', render: (r) => r.rank ?? '—' },
    {
      key: 'student',
      header: 'Élève',
      primary: true,
      render: (r) => (
        <Link to={`${base}/bulletins/${r.student.id}?term=${term}`} className="font-bold text-sky hover:underline">
          {r.student.lastName} {r.student.firstName}
        </Link>
      ),
    },
    { key: 'general', header: 'Moyenne générale', render: (r) => fmtAverage(r.general) },
    {
      key: 'mention',
      header: 'Mention',
      render: (r) => (r.mention ? <Badge tone={mentionTone[r.mention] ?? 'neutral'}>{r.mention}</Badge> : '—'),
    },
  ];

  return (
    <>
      <PageHeader
        title="Résultats"
        description="Le classement d’une classe, avec la moyenne générale de chaque élève."
      />

      <div className="mb-6 flex flex-wrap items-end gap-4">
        {isTeacher ? (
          <SelectField
            label="Classe"
            value={classId}
            onChange={(e) => setMyClassId(e.target.value)}
            className="w-full sm:w-64"
          >
            <option value="">Choisir une classe…</option>
            {myClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {classLabel(c)}
                {c.schoolYear && !c.schoolYear.isCurrent ? ` (${c.schoolYear.label})` : ''}
              </option>
            ))}
          </SelectField>
        ) : (
          <ClassPicker value={schoolClass} onChange={setSchoolClass} />
        )}

        <SelectField label="Période" value={term} onChange={(e) => setTerm(e.target.value)} className="w-full sm:w-56">
          {termOptions.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </SelectField>
      </div>

      {!classId ? (
        <EmptyState icon={Trophy} title="Choisis une classe">
          Sélectionne une classe pour voir son classement.
        </EmptyState>
      ) : (
        <>
          {data && (
            <p className="mb-3" aria-live="polite">
              <strong>Classe {classLabel(data.class)}</strong> · {termName(data.term)} · moyenne de la classe{' '}
              <strong>{fmtAverage(data.classAverage)}</strong> / 20 · {data.rankedCount} élève
              {data.rankedCount > 1 ? 's' : ''} classé{data.rankedCount > 1 ? 's' : ''} sur {data.students.length}
            </p>
          )}

          <div
            className={results.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}
            aria-busy={results.isFetching}
          >
            <DataTable
              columns={columns}
              rows={data?.students ?? []}
              loading={results.isPending}
              error={results.error ? { message: messageFor(results.error) } : null}
              onRetry={results.refetch}
              getRowKey={(r) => r.student.id}
              empty={
                <EmptyState icon={Users} title="Aucun élève dans cette classe">
                  Inscris des élèves dans cette classe pour voir leurs résultats.
                </EmptyState>
              }
            />
          </div>

          <p className="mt-4 text-sm text-ink/70">
            Seules les matières qui ont au moins une note comptent dans la moyenne générale : le classement évolue au
            fil des notes saisies.
          </p>
        </>
      )}
    </>
  );
}