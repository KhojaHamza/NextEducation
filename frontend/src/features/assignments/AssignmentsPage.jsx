import { useState } from 'react';
import { Plus, UserCheck } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import RowActions from '../../components/ui/RowActions.jsx';
import { useToast } from '../../hooks/useToast.js';
import ClassPicker from '../classes/ClassPicker.jsx';
import { teacherName } from '../classes/hooks.js';
import { classLabel } from '../students/format.js';
import AssignmentModal from './AssignmentModal.jsx';
import { messageFor } from './errors.js';
import { useAssignmentMutations, useAssignments } from './hooks.js';

export default function AssignmentsPage() {
  const toast = useToast();
  const { remove } = useAssignmentMutations();
  const [schoolClass, setSchoolClass] = useState(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const list = useAssignments(schoolClass?.id);

  const columns = [
    { key: 'subject', header: 'Matière', primary: true, render: (a) => <strong>{a.subject.name}</strong> },
    { key: 'coefficient', header: 'Coefficient', render: (a) => Number(a.subject.coefficient) },
    { key: 'teacher', header: 'Enseignant', render: (a) => teacherName(a.teacher) },
    {
      key: 'actions',
      header: 'Actions',
      render: (a) => <RowActions label={`l’attribution de ${a.subject.name}`} onDelete={() => setDeleting(a)} />,
    },
  ];

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(deleting.id);
      toast.success('Attribution retirée.');
    } catch (err) {
      toast.error(messageFor(err));
    }
    setDeleting(null);
  };

  const empty = (
    <EmptyState
      icon={UserCheck}
      title="Aucune matière attribuée"
      action={<Button onClick={() => setAdding(true)}>Attribuer une matière</Button>}
    >
      Un enseignant ne peut saisir des notes que dans les matières et les classes qui lui sont attribuées (le titulaire
      d’une classe peut tout saisir).
    </EmptyState>
  );

  return (
    <>
      <PageHeader
        title="Attributions"
        description="Quel enseignant enseigne quelle matière dans quelle classe."
        actions={
          <Button onClick={() => setAdding(true)} disabled={!schoolClass}>
            <Plus className="size-4" aria-hidden="true" />
            Attribuer une matière
          </Button>
        }
      />

      <div className="mb-6">
        <ClassPicker value={schoolClass} onChange={setSchoolClass} />
      </div>

      {!schoolClass ? (
        <EmptyState icon={UserCheck} title="Choisis une classe">
          Sélectionne une année puis une classe pour voir ses attributions.
        </EmptyState>
      ) : (
        <>
          <h2 className="mb-3 text-xl font-semibold">Classe {classLabel(schoolClass)}</h2>
          <DataTable
            columns={columns}
            rows={list.data ?? []}
            loading={list.isPending}
            error={list.error}
            onRetry={list.refetch}
            empty={empty}
          />
        </>
      )}

      <AssignmentModal open={adding} schoolClass={schoolClass} onClose={() => setAdding(false)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Retirer cette attribution ?"
        confirmLabel="Retirer"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      >
        <p>
          {deleting ? teacherName(deleting.teacher) : ''} n’enseignera plus {deleting?.subject.name} dans cette classe.
          Les évaluations déjà créées restent en place.
        </p>
      </ConfirmDialog>
    </>
  );
}