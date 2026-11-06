import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, SearchX } from 'lucide-react';
import { api } from '../../api/client.js';
import { saveFile } from '../../api/download.js';
import { buildQuery } from '../../api/queries.js';
import Alert from '../../components/ui/Alert.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import { useToast } from '../../hooks/useToast.js';
import { useAuth } from '../auth/useAuth.js';
import { useSchoolYears } from '../classes/hooks.js';
import { classLabel } from '../students/format.js';
import { isNoEnrollment, messageFor } from './errors.js';
import { TERMS, fmtAverage, mentionTone, termName, termOptions } from './format.js';
import { useReportCard } from './hooks.js';

const columns = [
  { key: 'name', header: 'Matière', primary: true, render: (s) => <strong>{s.name}</strong> },
  { key: 'coefficient', header: 'Coef.', render: (s) => String(s.coefficient).replace('.', ',') },
  { key: 'average', header: 'Moyenne /20', render: (s) => fmtAverage(s.average) },
  { key: 'classAverage', header: 'Moyenne de la classe', render: (s) => fmtAverage(s.classAverage) },
];

function Stat({ label, children }) {
  return (
    <div className="rounded-2xl bg-paper p-5">
      <p className="text-ink/70">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{children}</p>
    </div>
  );
}

export default function ReportCardPage() {
  const { studentId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [downloading, setDownloading] = useState(false);

  const isParent = user.role === 'PARENT';
  const base = { ADMIN: '/admin', TEACHER: '/enseignant', PARENT: '/parent' }[user.role];
  const backTo = isParent ? '/parent/bulletins' : `${base}/resultats`;

  // The period and the year live in the address, so a bulletin can be shared or reloaded as is
  const term = TERMS.includes(params.get('term')) ? params.get('term') : 'ANNUAL';
  const schoolYearId = params.get('schoolYearId') ?? '';

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const years = useSchoolYears();
  const card = useReportCard(studentId, { term, schoolYearId });
  const data = card.data;

  const download = async () => {
    setDownloading(true);
    try {
      saveFile(
        await api(`/report-cards/${studentId}/pdf${buildQuery({ term, schoolYearId })}`, { asBlob: true }),
        'bulletin.pdf',
      );
    } catch (err) {
      toast.error(messageFor(err));
    } finally {
      setDownloading(false);
    }
  };

  const back = (
    <Link to={backTo} className="mb-4 inline-flex min-h-11 items-center gap-1.5 font-bold text-sky hover:underline">
      <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
      {isParent ? 'Retour aux bulletins' : 'Retour aux résultats'}
    </Link>
  );

  let body;
  if (card.isPending) {
    body = <div role="status" aria-label="Chargement du bulletin" className="h-64 animate-pulse rounded-2xl bg-ink/10" />;
  } else if (card.error) {
    body = isNoEnrollment(card.error) ? (
      <EmptyState icon={SearchX} title="Pas de bulletin pour cette année">
        Cet élève n’est inscrit dans aucune classe pour cette année scolaire. Essaie une autre année.
      </EmptyState>
    ) : (
      <Alert tone="danger" title="Impossible de charger le bulletin">
        <p>{messageFor(card.error)}</p>
        {card.error.status !== 403 && card.error.status !== 404 && (
          <Button variant="secondary" onClick={() => card.refetch()} className="mt-3">
            Réessayer
          </Button>
        )}
      </Alert>
    );
  } else {
    const noGrades = data.subjects.every((s) => s.average === null);
    body = (
      <div className={card.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined} aria-busy={card.isFetching}>
        <section aria-label="Résumé" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Moyenne générale">
            {fmtAverage(data.general)}
            {data.general !== null && <span className="text-lg font-bold"> / 20</span>}
          </Stat>
          <Stat label="Rang">{data.rank ? `${data.rank} / ${data.rankedCount}` : '—'}</Stat>
          <Stat label="Moyenne de la classe">{fmtAverage(data.classAverage)}</Stat>
          <Stat label="Mention">
            {data.mention ? <Badge tone={mentionTone[data.mention] ?? 'neutral'}>{data.mention}</Badge> : '—'}
          </Stat>
        </section>

        {noGrades && (
          <div className="mb-6">
            <Alert tone="info">Aucune note n’a encore été saisie pour cette période.</Alert>
          </div>
        )}

        <DataTable
          columns={columns}
          rows={data.subjects}
          getRowKey={(s) => s.subjectId}
          empty={
            <EmptyState icon={SearchX} title="Aucune matière pour ce niveau">
              Les matières de la classe apparaîtront ici.
            </EmptyState>
          }
        />

        <section aria-label="Absences" className="mt-6 rounded-2xl bg-paper p-6">
          <h2 className="mb-3 text-xl font-semibold">Absences</h2>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-ink/70">Total (demi-journées)</dt>
              <dd className="text-2xl font-bold">{data.absences.total}</dd>
            </div>
            <div>
              <dt className="text-ink/70">Justifiées</dt>
              <dd className="text-2xl font-bold">{data.absences.justified}</dd>
            </div>
            <div>
              <dt className="text-ink/70">Non justifiées</dt>
              <dd className="text-2xl font-bold">{data.absences.unjustified}</dd>
            </div>
          </dl>
        </section>
      </div>
    );
  }

  const otherYears = (years.data ?? []).filter((y) => !y.isCurrent);

  return (
    <>
      {back}
      <PageHeader
        title={data ? `${data.student.lastName} ${data.student.firstName}` : 'Bulletin'}
        description={
          data
            ? `Matricule ${data.student.matricule} · classe ${classLabel(data.class)} · ${data.schoolYear.label} · ${termName(data.term)}`
            : undefined
        }
        actions={
          data && (
            <Button variant="secondary" onClick={download} loading={downloading}>
              <Download className="size-4" aria-hidden="true" />
              Télécharger le PDF
            </Button>
          )
        }
      />

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <SelectField
          label="Période"
          value={term}
          onChange={(e) => setParam('term', e.target.value === 'ANNUAL' ? '' : e.target.value)}
          className="w-full sm:w-56"
        >
          {termOptions.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </SelectField>

        {otherYears.length > 0 && (
          <SelectField
            label="Année scolaire"
            value={schoolYearId}
            onChange={(e) => setParam('schoolYearId', e.target.value)}
            className="w-full sm:w-56"
          >
            <option value="">Année en cours</option>
            {otherYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.label}
              </option>
            ))}
          </SelectField>
        )}
      </div>

      {body}
    </>
  );
}