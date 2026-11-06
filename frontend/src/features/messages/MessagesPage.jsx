import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Inbox, Plus } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { useToast } from '../../hooks/useToast.js';
import { messageFor } from './errors.js';
import { formatShortDate } from './format.js';
import { useDrafts, useMessageMutations, useThreads } from './hooks.js';
import MessageFormModal from './MessageFormModal.jsx';

export default function MessagesPage() {
  const toast = useToast();
  const [tab, setTab] = useState('inbox');
  const [form, setForm] = useState({ open: false, record: null });
  const [deleting, setDeleting] = useState(null);

  const threads = useThreads();
  const drafts = useDrafts();
  const { deleteDraft } = useMessageMutations();

  const confirmDelete = async () => {
    try {
      await deleteDraft.mutateAsync(deleting.id);
      toast.success('Brouillon supprimé.');
    } catch (err) { toast.error(messageFor(err)); }
    setDeleting(null);
  };

  return (
    <>
      <PageHeader
        title="Messages"
        description="Échange avec l’administration, les enseignants et les parents."
        actions={
          <Button onClick={() => setForm({ open: true, record: null })}>
            <Plus className="size-4" aria-hidden="true" /> Nouveau message
          </Button>
        }
      />

      <div className="mb-4 flex gap-2 border-b border-ink/10">
        <button
          type="button"
          onClick={() => setTab('inbox')}
          className={`min-h-11 border-b-2 px-4 font-bold ${tab === 'inbox' ? 'border-sky text-sky' : 'border-transparent'}`}
        >
          <Inbox className="me-2 inline size-4" aria-hidden="true" /> Boîte de réception
        </button>
        <button
          type="button"
          onClick={() => setTab('drafts')}
          className={`min-h-11 border-b-2 px-4 font-bold ${tab === 'drafts' ? 'border-sky text-sky' : 'border-transparent'}`}
        >
          <FileText className="me-2 inline size-4" aria-hidden="true" /> Brouillons
        </button>
      </div>

      {tab === 'inbox' && (
        <>
          {threads.isPending && <div role="status" aria-label="Chargement" className="h-40 animate-pulse rounded-2xl bg-ink/10" />}
          {threads.error && <Alert tone="danger" title="Impossible de charger les messages"><p>{threads.error.message}</p></Alert>}
          {threads.isSuccess && (threads.data ?? []).length === 0 && (
            <EmptyState icon={Inbox} title="Boîte de réception vide" action={<Button onClick={() => setForm({ open: true, record: null })}>Écrire un message</Button>}>
              Les messages reçus apparaîtront ici.
            </EmptyState>
          )}
          {threads.isSuccess && (threads.data ?? []).length > 0 && (
            <ul className="space-y-3">
              {threads.data.map((t) => (
                <li key={t.threadId}>
                  <Link to={`/messages/${t.threadId}`} className="block rounded-2xl bg-paper p-4 transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{t.subject || '(sans objet)'}</p>
                        <p className="text-sm text-ink/70">
                          {t.lastMessage.from} · {formatShortDate(t.lastMessage.sentAt)}
                        </p>
                      </div>
                      {t.unreadCount > 0 && <Badge tone="danger">{t.unreadCount}</Badge>}
                    </div>
                    <p className="mt-2 line-clamp-2">{t.lastMessage.preview}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {t.student && <Badge tone="info">{t.student.name}</Badge>}
                      {t.important && <Badge tone="warning">Important</Badge>}
                      <Badge tone="neutral">{t.messageCount} message{t.messageCount > 1 ? 's' : ''}</Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {tab === 'drafts' && (
        <>
          {drafts.isPending && <div role="status" aria-label="Chargement" className="h-40 animate-pulse rounded-2xl bg-ink/10" />}
          {drafts.error && <Alert tone="danger" title="Impossible de charger les brouillons"><p>{drafts.error.message}</p></Alert>}
          {drafts.isSuccess && (drafts.data ?? []).length === 0 && (
            <EmptyState icon={FileText} title="Aucun brouillon">
              Les messages non envoyés s’enregistrent ici.
            </EmptyState>
          )}
          {drafts.isSuccess && (drafts.data ?? []).length > 0 && (
            <ul className="space-y-3">
              {drafts.data.map((d) => (
                <li key={d.id} className="rounded-2xl bg-paper p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{d.subject || '(sans objet)'}</p>
                      <p className="text-sm text-ink/70">
                        {d.recipients.length ? `À : ${d.recipients.map((r) => r.name).join(', ')}` : 'Aucun destinataire'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setForm({ open: true, record: d })}>Modifier</Button>
                      <Button variant="danger" onClick={() => setDeleting(d)}>Supprimer</Button>
                    </div>
                  </div>
                  {d.body && <p className="mt-2 line-clamp-2">{d.body}</p>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <MessageFormModal
        open={form.open}
        record={form.record}
        onClose={() => setForm({ open: false, record: null })}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Supprimer ce brouillon ?"
        confirmLabel="Supprimer"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      >
        <p>Le brouillon sera définitivement supprimé.</p>
      </ConfirmDialog>
    </>
  );
}