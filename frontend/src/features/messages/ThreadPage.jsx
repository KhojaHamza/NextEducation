import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { saveFile } from '../../api/download.js';
import { api } from '../../api/client.js';
import Alert from '../../components/ui/Alert.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import TextAreaField from '../../components/ui/TextAreaField.jsx';
import { useToast } from '../../hooks/useToast.js';
import { messageFor } from './errors.js';
import { formatBytes, formatDateTime } from './format.js';
import { useMessageMutations, useThread } from './hooks.js';

export default function ThreadPage() {
  const { threadId } = useParams();
  const toast = useToast();
  const thread = useThread(threadId);
  const { send } = useMessageMutations();
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState(null);

  const downloadAttachment = async (messageId, attachment) => {
    try {
      const { blob, filename } = await api(
        `/messages/${messageId}/attachments/${attachment.id}`,
        { asBlob: true },
      );
      saveFile({ blob, filename: filename ?? attachment.fileName }, attachment.fileName);
    } catch (err) {
      toast.error(messageFor(err));
    }
  };

  const submitReply = async (event) => {
    event.preventDefault();
    if (!reply.trim()) return;
    setServerError(null);
    setSending(true);
    try {
      const messages = thread.data ?? [];
      const last = messages[messages.length - 1];
      await send.mutateAsync({ replyToId: last.id, body: reply.trim(), draft: false });
      setReply('');
    } catch (err) {
      setServerError(messageFor(err));
    } finally {
      setSending(false);
    }
  };

  if (thread.isPending) {
    return <div role="status" aria-label="Chargement" className="h-64 animate-pulse rounded-2xl bg-ink/10" />;
  }
  if (thread.error) {
    return (
      <Alert tone="danger" title="Impossible de charger la conversation">
        <p>{messageFor(thread.error)}</p>
        <Link to="/messages" className="mt-3 inline-block font-bold text-sky hover:underline">← Retour aux messages</Link>
      </Alert>
    );
  }

  const messages = thread.data ?? [];
  const head = messages[0];

  return (
    <>
      <Link to="/messages" className="mb-3 inline-flex items-center gap-1 text-sky hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> Boîte de réception
      </Link>

      <PageHeader
        title={head?.subject || '(sans objet)'}
        description={
          <>
            {head?.student && <span>Élève : {head.student.name} · </span>}
            <span>{messages.length} message{messages.length > 1 ? 's' : ''}</span>
            {head?.important && <> · <Badge tone="warning">Important</Badge></>}
          </>
        }
      />

      <ul className="space-y-3">
        {messages.map((m) => (
          <li key={m.id} className={`rounded-2xl p-4 ${m.mine ? 'ms-6 bg-sky/10' : 'me-6 bg-paper'}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <strong>{m.sender.name}{m.mine && ' (toi)'}</strong>
              <span className="text-sm text-ink/70">{formatDateTime(m.sentAt)}</span>
            </div>
            {m.recipients.length > 0 && (
              <p className="mt-1 text-sm text-ink/70">
                À : {m.recipients.map((r) => r.name).join(', ')}
                {m.mine && m.recipients.some((r) => r.readAt) && (
                  <span className="ms-2">· lu</span>
                )}
              </p>
            )}
            <p className="mt-2 whitespace-pre-wrap">{m.body}</p>
            {m.attachments.length > 0 && (
              <ul className="mt-3 space-y-1">
                {m.attachments.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => downloadAttachment(m.id, a)}
                      className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-sky hover:bg-sky/10"
                    >
                      <Download className="size-4" aria-hidden="true" />
                      {a.fileName} <span className="text-sm text-ink/70">({formatBytes(a.size)})</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={submitReply} className="mt-6 space-y-3">
        {serverError && <Alert tone="danger">{serverError}</Alert>}
        <TextAreaField
          label="Répondre"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={4}
          maxLength={5000}
        />
        <div className="flex justify-end">
          <Button type="submit" loading={sending} disabled={!reply.trim()}>Envoyer</Button>
        </div>
      </form>
    </>
  );
}