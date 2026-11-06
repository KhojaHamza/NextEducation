import { Link } from 'react-router-dom';
import { FileText, Users } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { classLabel } from '../students/format.js';
import { useMyChildren } from './hooks.js';

export default function ParentReportCardsPage() {
  const children = useMyChildren();

  return (
    <>
      <PageHeader title="Bulletins" description="Choisis un enfant pour voir son bulletin." />

      {children.isPending ? (
        <div role="status" aria-label="Chargement" className="h-32 animate-pulse rounded-2xl bg-ink/10" />
      ) : children.error ? (
        <Alert tone="danger" title="Impossible de charger tes enfants">
          <p>{children.error.message}</p>
          <Button variant="secondary" onClick={() => children.refetch()} className="mt-3">
            Réessayer
          </Button>
        </Alert>
      ) : children.data.length === 0 ? (
        <EmptyState icon={Users} title="Aucun enfant lié à ton compte">
          Contacte l’administration de l’école pour qu’elle lie tes enfants à ton compte.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {children.data.map((child) => (
            <li key={child.id} className="rounded-2xl bg-paper p-5">
              <p className="text-2xl font-semibold">
                {child.lastName} {child.firstName}
              </p>
              <p className="text-sm text-ink/70">Matricule {child.matricule}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {child.enrollments?.length ? (
                  child.enrollments.map((e) => (
                    <Badge key={e.id} tone="info">
                      {classLabel(e.schoolClass)}
                    </Badge>
                  ))
                ) : (
                  <Badge tone="warning">Sans classe</Badge>
                )}
              </div>
              <Link
                to={`/parent/bulletins/${child.id}`}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky px-5 font-bold text-white hover:bg-sky/90"
              >
                <FileText className="size-4" aria-hidden="true" />
                Voir le bulletin
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}