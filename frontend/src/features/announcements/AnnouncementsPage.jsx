import { useState } from 'react';
import { Megaphone, Plus } from 'lucide-react';
import { usePagedList } from '../../api/queries.js';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Modal from '../../components/ui/Modal.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { useAuth } from '../auth/useAuth.js';
import { formatDateTime, roleLabel } from '../messages/format.js';
import AnnouncementFormModal from './AnnouncementFormModal.jsx';

const PAGE_SIZE = 20;

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const isAdmin = user.role === 'ADMIN';
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(false);
  const [detail, setDetail] = useState(null);

  const list = usePagedList('announcements', { page, limit: PAGE_SIZE });

  return (
    <>
      <PageHeader
        title="Annonces"
        description="Les informations publiées par l’administration de l’école."
        actions={
          isAdmin && (
            <Button onClick={() => setForm(true)}>
              <Plus className="size-4" aria-hidden="true" /> Nouvelle annonce
            </Button>
          )
        }
      />

      {list.isPending && <div role="status" aria-label="Chargement" className="h-40 animate-pulse rounded-2xl bg-ink/10" />}
      {list.error && <Alert tone="danger" title="Impossible de charger les annonces"><p>{list.error.message}</p></Alert>}
      {list.isSuccess && (list.data?.data ?? []).length === 0 && (
        <EmptyState icon={Megaphone} title="Aucune annonce pour l’instant"
          action={isAdmin && <Button onClick={() => setForm(true)}>Publier une annonce</Button>}>
          Les annonces de l’administration apparaîtront ici.
        </EmptyState>
      )}
      {list.isSuccess && (list.data?.data ?? []).length > 0 && (
        <ul className="space-y-3">
          {list.data.data.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setDetail(a)}
                className="w-full rounded-2xl bg-paper p-4 text-start transition-shadow hover:shadow-md"
              >
                <p className="font-bold">{a.title}</p>
                <p className="mt-1 text-sm text-ink/70">
                  {a.author} · {formatDateTime(a.publishedAt)}
                </p>
                <p className="mt-2 line-clamp-2 whitespace-pre-wrap">{a.body}</p>
                {a.corrections.length > 0 && (
                  <p className="mt-2 text-sm text-coral">Corrigé plus tard ({a.corrections.length} correction{a.corrections.length > 1 ? 's' : ''})</p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Pagination meta={list.data?.meta} onPageChange={setPage} />

      <AnnouncementFormModal open={form} onClose={() => setForm(false)} />

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={detail?.title ?? ''}>
        {detail && (
          <div className="space-y-3">
            <p className="text-sm text-ink/70">
              {detail.author} · {formatDateTime(detail.publishedAt)}
            </p>
            <p className="whitespace-pre-wrap">{detail.body}</p>
            <div className="flex flex-wrap gap-2">
              {detail.audience.map((r) => (<span key={r} className="rounded-full bg-sky/15 px-3 py-1 text-sm font-bold">{roleLabel[r]}</span>))}
            </div>
            {detail.corrections.length > 0 && (
              <div>
                <p className="mt-4 font-bold">Corrections</p>
                <ul className="mt-1 list-disc space-y-1 ps-5">
                  {detail.corrections.map((c) => (<li key={c.id}>{c.title} ({formatDateTime(c.publishedAt)})</li>))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}