import { useState } from 'react';
import { Eye, ScrollText } from 'lucide-react';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import TextField from '../../components/ui/TextField.jsx';
import { fullName } from '../users/format.js';
import AuditLogDetailModal from './AuditLogDetailModal.jsx';
import {
  actionLabel,
  actionOptions,
  actionTone,
  entityLabel,
  entityOptions,
  formatDateTime,
} from './format.js';
import { useAuditLogs, useUsersOptions } from './hooks.js';

const PAGE_SIZE = 30;
const emptyFilters = { userId: '', action: '', entity: '', dateFrom: '', dateTo: '' };

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(emptyFilters);
  const [detail, setDetail] = useState(null);

  const users = useUsersOptions();
  const list = useAuditLogs({ page, limit: PAGE_SIZE, ...filters });

  const update = (key) => (e) => {
    setFilters((f) => ({ ...f, [key]: e.target.value }));
    setPage(1);
  };
  const resetFilters = () => {
    setFilters(emptyFilters);
    setPage(1);
  };

  const columns = [
    {
      key: 'date',
      header: 'Date',
      primary: true,
      render: (l) => <strong>{formatDateTime(l.createdAt)}</strong>,
    },
    {
      key: 'user',
      header: 'Utilisateur',
      render: (l) =>
        l.user ? fullName(l.user) : l.userId ? `Utilisateur #${l.userId}` : '—',
    },
    {
      key: 'action',
      header: 'Action',
      render: (l) => (
        <Badge tone={actionTone[l.action] ?? 'neutral'}>
          {actionLabel[l.action] ?? l.action}
        </Badge>
      ),
    },
    {
      key: 'entity',
      header: 'Entité',
      render: (l) =>
        `${entityLabel[l.entity] ?? l.entity}${l.entityId ? ` #${l.entityId}` : ''}`,
    },
    {
      key: 'details',
      header: '',
      render: (l) => (
        <Button variant="ghost" onClick={() => setDetail(l)} aria-label="Voir le détail">
          <Eye className="size-4" aria-hidden="true" /> Détail
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Journal d’audit"
        description="Toutes les actions faites dans l’application, les plus récentes d’abord."
      />

      <div className="mb-4 grid gap-4 rounded-2xl bg-paper p-4 sm:grid-cols-2 lg:grid-cols-5">
        <SelectField label="Utilisateur" value={filters.userId} onChange={update('userId')}>
          <option value="">Tous</option>
          {(users.data ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {fullName(u)}
            </option>
          ))}
        </SelectField>

        <SelectField label="Action" value={filters.action} onChange={update('action')}>
          <option value="">Toutes</option>
          {actionOptions.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </SelectField>

        <SelectField label="Entité" value={filters.entity} onChange={update('entity')}>
          <option value="">Toutes</option>
          {entityOptions.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </SelectField>

        <TextField label="Du" type="date" value={filters.dateFrom} onChange={update('dateFrom')} />
        <TextField label="Au" type="date" value={filters.dateTo} onChange={update('dateTo')} />
      </div>

      <div className="mb-4 flex justify-end">
        <Button variant="ghost" onClick={resetFilters}>
          Réinitialiser les filtres
        </Button>
      </div>

      <div
        className={list.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}
        aria-busy={list.isFetching}
      >
        <DataTable
          columns={columns}
          rows={list.data?.data ?? []}
          loading={list.isPending}
          error={list.error}
          onRetry={list.refetch}
          empty={
            <EmptyState icon={ScrollText} title="Aucune action trouvée">
              Change les filtres ou attends que des actions soient faites.
            </EmptyState>
          }
        />
      </div>

      <Pagination meta={list.data?.meta} onPageChange={setPage} />

      <AuditLogDetailModal log={detail} onClose={() => setDetail(null)} />
    </>
  );
}