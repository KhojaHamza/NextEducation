import { Link } from 'react-router-dom';
import { Bell, BellOff, BellRing, CheckCheck } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { useToast } from '../../hooks/useToast.js';
import { formatDateTime } from '../messages/format.js';
import { useNotificationMutations, useNotifications } from './hooks.js';
import { usePush } from './usePush.js';

const typeLabel = {
  ANNOUNCEMENT: 'Annonce',
  MESSAGE_RECEIVED: 'Message',
  PAYMENT_RECEIVED: 'Paiement',
  PAYMENT_REMINDER: 'Rappel de paiement',
  PAYMENT_CANCELLED: 'Paiement annulé',
  ABSENCE_JUSTIFIED: 'Absence justifiée',
  ABSENCE_PENDING: 'Absence à valider',
};

function PushToggle() {
  const { state, error, subscribe, unsubscribe } = usePush();

  if (state === 'loading') return null;
  if (state === 'unsupported') {
    return (
      <Alert tone="info">
        Ton navigateur ne prend pas en charge les notifications push. Tu recevras les notifications dans l’application.
      </Alert>
    );
  }
  if (state === 'disabled') return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-paper p-4">
      <div>
        <p className="font-bold">Notifications sur cet appareil</p>
        <p className="text-sm text-ink/70">
          {state === 'subscribed'
            ? 'Tu recevras une alerte même quand l’application est fermée.'
            : state === 'denied'
              ? 'Tu as refusé la permission. Autorise les notifications dans les réglages du navigateur.'
              : 'Active les alertes pour ne rien manquer.'}
        </p>
        {error && <p className="mt-1 text-sm text-coral">{error}</p>}
      </div>
      {state === 'ready' && <Button onClick={subscribe}>Activer</Button>}
      {state === 'subscribed' && <Button variant="secondary" onClick={unsubscribe}>Désactiver</Button>}
    </div>
  );
}

export default function NotificationsPage() {
  const toast = useToast();
  const list = useNotifications();
  const { markAllRead, markRead } = useNotificationMutations();

  const handleMarkAll = async () => {
    try {
      await markAllRead.mutateAsync();
      toast.success('Toutes les notifications sont marquées comme lues.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleClick = async (n) => {
    if (!n.readAt) {
      try { await markRead.mutateAsync(n.id); } catch { /* ignore */ }
    }
    if (n.data?.threadId) return `/messages/${n.data.threadId}`;
    if (n.data?.announcementId) return '/annonces';
    return null;
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Tout ce qui s’est passé récemment."
        actions={
          <Button variant="secondary" onClick={handleMarkAll}>
            <CheckCheck className="size-4" aria-hidden="true" /> Tout marquer comme lu
          </Button>
        }
      />

      <PushToggle />

      {list.isPending && <div role="status" aria-label="Chargement" className="h-40 animate-pulse rounded-2xl bg-ink/10" />}
      {list.error && <Alert tone="danger" title="Impossible de charger les notifications"><p>{list.error.message}</p></Alert>}
      {list.isSuccess && (list.data ?? []).length === 0 && (
        <EmptyState icon={BellOff} title="Aucune notification">
          Tu recevras une alerte pour les nouveaux messages, annonces et événements de l’école.
        </EmptyState>
      )}
      {list.isSuccess && (list.data ?? []).length > 0 && (
        <ul className="space-y-2">
          {list.data.map((n) => {
            const Item = n.data?.threadId ? Link : 'div';
            const props = n.data?.threadId ? { to: `/messages/${n.data.threadId}` } : {};
            return (
              <li key={n.id}>
                <Item {...props} className={`block rounded-2xl p-4 transition-colors ${n.readAt ? 'bg-paper' : 'bg-sky/10 hover:bg-sky/15'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Bell className="size-4" aria-hidden="true" />
                        <Badge tone="neutral">{typeLabel[n.type] ?? n.type}</Badge>
                        {!n.readAt && <Badge tone="danger">Nouveau</Badge>}
                      </div>
                      <p className="mt-1 font-bold">{n.title}</p>
                      <p className="mt-1 line-clamp-2">{n.body}</p>
                    </div>
                    <span className="text-sm text-ink/70">{formatDateTime(n.createdAt)}</span>
                  </div>
                </Item>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}