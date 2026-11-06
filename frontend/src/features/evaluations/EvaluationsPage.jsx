import { useState } from 'react';
import { ClipboardList, SearchX } from 'lucide-react';
import Badge from '../../components/ui/Badge.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import ClassPicker from '../classes/ClassPicker.jsx';
import { classLabel, formatDate } from '../students/format.js';
import { termLabel, typeLabel } from './format.js';
import { useEvaluations } from './hooks.js';

const columns = [
  { key: 'title', header: 'Évaluation', primary: true, render: (e) => <strong>{e.title}</strong> },
  { key: 'class', header: 'Classe', render: (e) => classLabel(e.schoolClass) },
  { key: 'subject', header: 'Matière', render: (e) => e.subject.name },
  { key: 'term', header: 'Trimestre', render: (e) => termLabel[e.term] },
  { key: 'date', header: 'Date', render: (e) => formatDate(e.date) },
  {
    key: 'type',
    header: 'Type',
    render: (e) => <Badge tone={e.type === 'EXAM' ? 'warning' : 'info'}>{typeLabel[e.type]}</Badge>,
  },
  { key: 'max', header: 'Note maximale', render: (e) => `/ ${Number(e.maxScore)}` },
];

export default function EvaluationsPage() {
  const [schoolClass, setSchoolClass] = useState(null);
  const [term, setTerm] = useState('');

  const list = useEvaluations({ classId: schoolClass?.id, term });
  const filtered = Boolean(schoolClass || term);

  const empty = filtered ? (
    <EmptyState icon={SearchX} title="Aucune évaluation trouvée">
      Change la classe ou le trimestre.
    </EmptyState>
  ) : (
    <EmptyState icon={ClipboardList} title="Aucune évaluation pour l’instant">
      Les contrôles et examens créés par les enseignants apparaîtront ici.
    </EmptyState>
  );

  return (
    <>
      <PageHeader title="Évaluations" description="Les contrôles et examens de l’école, les plus récents d’abord." />

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <ClassPicker value={schoolClass} onChange={setSchoolClass} allLabel="Toutes les classes" />
        <SelectField label="Trimestre" value={term} onChange={(e) => setTerm(e.target.value)} className="w-full sm:w-56">
          <option value="">Tous les trimestres</option>
          {Object.entries(termLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
      </div>

      <div className={list.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined} aria-busy={list.isFetching}>
        <DataTable
          columns={columns}
          rows={list.data ?? []}
          loading={list.isPending}
          error={list.error}
          onRetry={list.refetch}
          empty={empty}
        />
      </div>
    </>
  );
}