import { Link } from 'react-router-dom';
import { FileText, Users } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { classLabel } from '../students/format.js';
import { useMyChildren } from './hooks.js';

export default function StudentReportCardsPage() {
  const me = useMyChildren();

  return (
    <>
      <PageHeader title="Mes bulletins" description="Consulte tes bulletins scolaires." />
      {me.isPending ? (
        <div role="status" aria-label="Chargement" className="h-32 animate-pulse rounded-2xl bg-ink/10" />
      ) : me.error ? (
        <Alert tone="danger" title="Impossible de charger tes informations">
          <p>{me.error.message}</p>
          <Button variant="secondary" onClick={() => me.refetch()} className="mt-3">Réessayer</Button>
        </Alert>
      ) : me.data.length === 0 ? (
        <EmptyState icon={Users} title="Aucun profil élève lié">
          Contacte l’administration de l’école pour lier ton compte élève.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {me.data.map((child) => (
            <li key={child.id} className="rounded-2xl bg-paper p-5">
              <p className="text-2xl font-semibold">{child.lastName} {child.firstName}</p>
              <p className="text-sm text-ink/70">Matricule {child.matricule}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {child.enrollments?.length ? (
                  child.enrollments.map((e) => (
                    <Badge key={e.id} tone="info">{classLabel(e.schoolClass)}</Badge>
                  ))
                ) : (
                  <Badge tone="warning">Sans classe</Badge>
                )}
              </div>
              <Link to={`/eleve/bulletins/${child.id}`} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky px-5 font-bold text-white hover:bg-sky/90">
                <FileText className="size-4" aria-hidden="true" /> Voir mon bulletin
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}