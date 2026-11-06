import Modal from '../../components/ui/Modal.jsx';
import { actionLabel, entityLabel, formatDateTime, prettyJson } from './format.js';

export default function AuditLogDetailModal({ log, onClose }) {
  if (!log) return null;
  const user = log.user
    ? `${log.user.firstName ?? ''} ${log.user.lastName ?? ''} (${log.user.email})`.trim()
    : log.userId
      ? `Utilisateur #${log.userId}`
      : '—';

  return (
    <Modal open onClose={onClose} title="Détail de l’action" size="lg">
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-ink/70">Date</dt>
          <dd className="font-bold">{formatDateTime(log.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink/70">Utilisateur</dt>
          <dd className="font-bold">{user}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink/70">Action</dt>
          <dd className="font-bold">{actionLabel[log.action] ?? log.action}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink/70">Entité</dt>
          <dd className="font-bold">
            {entityLabel[log.entity] ?? log.entity}
            {log.entityId ? ` #${log.entityId}` : ''}
          </dd>
        </div>
      </dl>

      {log.oldValues && (
        <details className="mt-4 rounded-xl bg-paper p-3">
          <summary className="cursor-pointer font-bold">Avant</summary>
          <pre className="mt-2 overflow-x-auto text-sm">{prettyJson(log.oldValues)}</pre>
        </details>
      )}
      {log.newValues && (
        <details className="mt-2 rounded-xl bg-paper p-3" open>
          <summary className="cursor-pointer font-bold">Après</summary>
          <pre className="mt-2 overflow-x-auto text-sm">{prettyJson(log.newValues)}</pre>
        </details>
      )}
    </Modal>
  );
}