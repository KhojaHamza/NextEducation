import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CircleCheck, Pencil, SearchX, Trash2, UserPlus } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { useToast } from '../../hooks/useToast.js';
import CreateAccountModal from './CreateAccountModal.jsx';
import { messageFor } from './errors.js';
import { classLabel, formatDate, genderLabel, relationLabel } from './format.js';
import { useStudent, useStudentMutations } from './hooks.js';

function Section({ title, children }) {
  return (
    <section className="rounded-2xl bg-paper p-6">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <dt className="text-ink/70">{label}</dt>
      <dd className="text-end font-bold">{children}</dd>
    </div>
  );
}

export default function StudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: student, error, isPending, refetch } = useStudent(id);
  const { remove } = useStudentMutations();

  const [deleteStep, setDeleteStep] = useState(null); // null | 'ask' | 'unpaid'
  const [accountOpen, setAccountOpen] = useState(false);

  const back = (
    <Link
      to="/admin/eleves"
      className="mb-4 inline-flex min-h-11 items-center gap-1.5 font-bold text-sky hover:underline"
    >
      <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
      Retour aux élèves
    </Link>
  );

  if (isPending) {
    return (
      <>
        {back}
        <div role="status" aria-label="Chargement de la fiche" className="h-64 animate-pulse rounded-2xl bg-ink/10" />
      </>
    );
  }

  if (error) {
    return (
      <>
        {back}
        {error.status === 404 ? (
          <EmptyState icon={SearchX} title="Élève introuvable">
            Cet élève n’existe pas ou a été supprimé.
          </EmptyState>
        ) : (
          <Alert tone="danger" title="Impossible de charger la fiche">
            <p>{error.message}</p>
            <Button variant="secondary" onClick={() => refetch()} className="mt-3">
              Réessayer
            </Button>
          </Alert>
        )}
      </>
    );
  }

  const enrollments = student.enrollments ?? [];
  const parents = student.parents ?? [];

  const handleDelete = async (confirm) => {
    try {
      await remove.mutateAsync({ id: student.id, confirm });
      toast.success('Élève supprimé.');
      navigate('/admin/eleves', { replace: true });
    } catch (err) {
      // The backend refuses once when a balance is unpaid: we ask a second, explicit confirmation
      if (!confirm && err.status === 409 && /unpaid/i.test(err.message)) {
        setDeleteStep('unpaid');
        return;
      }
      setDeleteStep(null);
      toast.error(messageFor(err));
    }
  };

  return (
    <>
      {back}
      <PageHeader
        title={`${student.lastName} ${student.firstName}`}
        description={`Matricule ${student.matricule}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(`/admin/eleves/${student.id}/modifier`)}>
              <Pencil className="size-4" aria-hidden="true" />
              Modifier
            </Button>
            <Button variant="danger" onClick={() => setDeleteStep('ask')}>
              <Trash2 className="size-4" aria-hidden="true" />
              Supprimer
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Informations">
          <dl className="space-y-3">
            <Field label="Genre">
              <Badge>{genderLabel(student.gender)}</Badge>
            </Field>
            <Field label="Date de naissance">{formatDate(student.birthDate)}</Field>
          </dl>
          <div className="mt-4 border-t border-ink/10 pt-4">
            <h3 className="font-bold">Notes médicales</h3>
            <p className="mt-1 whitespace-pre-line">{student.medicalNotes || 'Aucune note.'}</p>
          </div>
        </Section>

        <Section title="Scolarité">
          {enrollments.length ? (
            <ul className="flex flex-wrap gap-2">
              {enrollments.map((e) => (
                <li key={e.id}>
                  <Badge tone="info">{classLabel(e.schoolClass)}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p>Cet élève n’est inscrit dans aucune classe.</p>
          )}
        </Section>

        <Section title="Parents">
          {parents.length ? (
            <ul className="space-y-3">
              {parents.map((link) => {
                const user = link.parent?.user;
                return (
                  <li key={link.parentId} className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-bold">{user ? `${user.lastName} ${user.firstName}` : 'Parent'}</p>
                      <p className="text-sm text-ink/70">{[user?.email, user?.phone].filter(Boolean).join(' · ')}</p>
                    </div>
                    <Badge tone="info">{relationLabel[link.relationship] ?? link.relationship}</Badge>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>Aucun parent n’est lié à cet élève.</p>
          )}
        </Section>

        <Section title="Compte de connexion">
          {student.userId ? (
            <Badge tone="success" icon={CircleCheck}>
              Compte créé
            </Badge>
          ) : (
            <div>
              <p>Cet élève n’a pas encore de compte de connexion.</p>
              <Button variant="secondary" className="mt-3" onClick={() => setAccountOpen(true)}>
                <UserPlus className="size-4" aria-hidden="true" />
                Créer un compte
              </Button>
            </div>
          )}
        </Section>
      </div>

      <CreateAccountModal student={student} open={accountOpen} onClose={() => setAccountOpen(false)} />

      <ConfirmDialog
        open={deleteStep === 'ask'}
        title="Supprimer cet élève ?"
        confirmLabel="Supprimer"
        danger
        onConfirm={() => handleDelete(false)}
        onCancel={() => setDeleteStep(null)}
      >
        <p>
          {student.lastName} {student.firstName} sera retiré de la liste et de sa classe
          {student.userId ? ', et son compte de connexion sera désactivé' : ''}.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={deleteStep === 'unpaid'}
        title="Solde impayé"
        confirmLabel="Supprimer quand même"
        danger
        onConfirm={() => handleDelete(true)}
        onCancel={() => setDeleteStep(null)}
      >
        <p>Cet élève a encore un solde impayé. Veux-tu le supprimer malgré tout ?</p>
      </ConfirmDialog>
    </>
  );
}