import { useMemo, useState } from 'react';
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday,
  parseISO, startOfMonth, startOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { useToast } from '../../hooks/useToast.js';
import { useAuth } from '../auth/useAuth.js';
import { messageFor } from '../homeworks/errors.js';
import EventFormModal from './EventFormModal.jsx';
import { useCalendar, useEventMutations } from './hooks.js';

const WEEK = { weekStartsOn: 1 };
const KEY = 'yyyy-MM-dd';
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const TYPES = {
  HOMEWORK: { label: 'Devoir', dot: 'bg-sky' },
  TEST: { label: 'Contrôle', dot: 'bg-sun' },
  EXAM: { label: 'Examen', dot: 'bg-coral' },
  EVENT: { label: 'Événement', dot: 'bg-ink' },
  DEADLINE: { label: 'Échéance', dot: 'bg-ink/50' },
};

export default function CalendarPage() {
  const { user } = useAuth();
  const isAdmin = user.role === 'ADMIN';
  const toast = useToast();
  const { remove } = useEventMutations();

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => format(new Date(), KEY));
  const [form, setForm] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const days = eachDayOfInterval({ start: startOfWeek(month, WEEK), end: endOfWeek(endOfMonth(month), WEEK) });
  const query = useCalendar(format(days[0], KEY), format(days[days.length - 1], KEY));

  const byDay = useMemo(() => {
    const map = {};
    for (const item of query.data ?? []) {
      const start = parseISO(item.date);
      const end = item.endDate ? parseISO(item.endDate) : start;
      for (const d of eachDayOfInterval({ start, end })) (map[format(d, KEY)] ??= []).push(item);
    }
    return map;
  }, [query.data]);

  const goTo = (next) => {
    setMonth(next);
    setSelected(format(isSameMonth(next, new Date()) ? new Date() : next, KEY));
  };

  const selectedItems = byDay[selected] ?? [];

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(deleting.id);
      toast.success('Événement supprimé.');
    } catch (err) {
      toast.error(messageFor(err));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Calendrier scolaire"
        description="Devoirs, contrôles, examens, événements et échéances au même endroit."
        actions={
          isAdmin && (
            <Button onClick={() => setForm(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Nouvel événement
            </Button>
          )
        }
      />

      {query.error && (
        <div className="mb-4">
          <Alert tone="danger" title="Impossible de charger le calendrier">
            <p>{query.error.message}</p>
          </Alert>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Mois précédent"
            onClick={() => goTo(addMonths(month, -1))}
            className="grid size-11 place-items-center rounded-xl hover:bg-ink/5"
          >
            <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
          </button>
          <h2 className="min-w-40 text-center font-display text-xl font-semibold capitalize" aria-live="polite">
            {format(month, 'LLLL yyyy', { locale: fr })}
          </h2>
          <button
            type="button"
            aria-label="Mois suivant"
            onClick={() => goTo(addMonths(month, 1))}
            className="grid size-11 place-items-center rounded-xl hover:bg-ink/5"
          >
            <ChevronRight className="size-5 rtl:rotate-180" aria-hidden="true" />
          </button>
        </div>
        <Button variant="secondary" onClick={() => goTo(startOfMonth(new Date()))}>
          Aujourd’hui
        </Button>
      </div>

      <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {Object.values(TYPES).map((t) => (
          <li key={t.label} className="flex items-center gap-1.5">
            <span className={`size-3 rounded-full ${t.dot}`} aria-hidden="true" />
            {t.label}
          </li>
        ))}
      </ul>

      <div className={`rounded-2xl bg-paper p-2 sm:p-4 ${query.isPlaceholderData ? 'opacity-60 transition-opacity' : ''}`}>
        <div className="grid grid-cols-7 gap-1 text-center text-sm font-bold text-ink/70" aria-hidden="true">
          {WEEKDAYS.map((d) => (
            <span key={d} className="py-1">{d}</span>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((d) => {
            const key = format(d, KEY);
            const items = byDay[key] ?? [];
            const isSelected = key === selected;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                aria-pressed={isSelected}
                aria-label={`${format(d, 'EEEE d MMMM', { locale: fr })} : ${items.length} élément${items.length > 1 ? 's' : ''}`}
                className={`flex min-h-14 flex-col items-center gap-1 rounded-xl border-2 p-1 sm:min-h-20 sm:items-start sm:p-2 ${
                  isSelected ? 'border-sky bg-sky/15' : 'border-transparent hover:bg-ink/5'
                } ${isSameMonth(d, month) ? '' : 'text-ink/40'} ${isToday(d) ? 'ring-2 ring-sun' : ''}`}
              >
                <span className={isToday(d) ? 'font-bold' : ''}>{format(d, 'd')}</span>
                <span className="flex flex-wrap justify-center gap-0.5" aria-hidden="true">
                  {items.slice(0, 4).map((it) => (
                    <span key={it.key} className={`size-2 rounded-full ${TYPES[it.type].dot}`} />
                  ))}
                </span>
                {items.length > 4 && (
                  <span className="hidden text-xs sm:block" aria-hidden="true">+{items.length - 4}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <section className="mt-6" aria-live="polite">
        <h3 className="mb-3 font-display text-lg font-semibold capitalize">
          {format(parseISO(selected), 'EEEE d MMMM yyyy', { locale: fr })}
        </h3>

        {query.isPending && <div role="status" aria-label="Chargement" className="h-20 animate-pulse rounded-2xl bg-ink/10" />}
        {query.isSuccess && selectedItems.length === 0 && (
          <p className="rounded-2xl bg-paper p-4 text-ink/70">Rien de prévu ce jour-là.</p>
        )}

        {selectedItems.length > 0 && (
          <ul className="space-y-2">
            {selectedItems.map((it) => (
              <li key={it.key} className="flex items-start gap-3 rounded-2xl bg-paper p-4">
                <span className={`mt-1.5 size-3 shrink-0 rounded-full ${TYPES[it.type].dot}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    <span className="text-ink/70">{TYPES[it.type].label} · </span>
                    {it.title}
                  </p>
                  {it.subtitle && <p className="mt-1 whitespace-pre-wrap text-sm text-ink/70">{it.subtitle}</p>}
                  {it.endDate && (
                    <p className="mt-1 text-sm text-ink/70">
                      Du {format(parseISO(it.date), 'd MMM', { locale: fr })} au{' '}
                      {format(parseISO(it.endDate), 'd MMM yyyy', { locale: fr })}
                    </p>
                  )}
                </div>
                {isAdmin && it.type === 'EVENT' && (
                  <button
                    type="button"
                    onClick={() => setDeleting(it)}
                    className="min-h-11 rounded-xl px-3 font-bold text-coral hover:bg-coral/10"
                  >
                    Supprimer
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <EventFormModal open={form} initialDate={selected} onClose={() => setForm(false)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Supprimer cet événement ?"
        confirmLabel="Supprimer"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      >
        <p>L’événement « {deleting?.title} » sera retiré du calendrier de l’école.</p>
      </ConfirmDialog>
    </>
  );
}