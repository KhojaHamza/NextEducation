import { Clock, MapPin } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import RowActions from '../../components/ui/RowActions.jsx';
import { DAYS, dayLabel } from './format.js';

// days: { MONDAY: [slot, ...], ... } as sent by the backend.
// show: what the week belongs to ('class' | 'teacher' | 'room'): it is not repeated on every slot.
// onEdit / onDelete: optional, only the administrator's class view uses them.
export default function WeekGrid({ days, show = 'class', onEdit, onDelete }) {
  const isEmpty = DAYS.every((day) => !days?.[day]?.length);

  return (
    <div className="space-y-4">
      {isEmpty && <Alert tone="info">Aucun cours n’est planifié pour l’instant.</Alert>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DAYS.map((day) => {
          const slots = days?.[day] ?? [];
          return (
            <section key={day} aria-label={dayLabel[day]} className="rounded-2xl bg-paper p-4">
              <h3 className="mb-3 text-lg font-bold">{dayLabel[day]}</h3>

              {slots.length ? (
                <ul className="space-y-3">
                  {slots.map((slot) => {
                    const details = [show !== 'class' && slot.class.name, show !== 'teacher' && slot.teacher.name].filter(Boolean);
                    return (
                      <li key={slot.id} className="rounded-xl bg-sky/10 p-3">
                        <p className="flex items-center gap-1.5 font-bold">
                          <Clock className="size-4" aria-hidden="true" />
                          {slot.start} – {slot.end}
                        </p>
                        <p className="mt-1 text-lg font-semibold">{slot.subject.name}</p>
                        {details.length > 0 && <p className="text-ink/80">{details.join(' · ')}</p>}
                        {show !== 'room' && slot.room && (
                          <p className="flex items-center gap-1.5 text-sm text-ink/70">
                            <MapPin className="size-4" aria-hidden="true" />
                            Salle {slot.room.name}
                          </p>
                        )}
                        {(onEdit || onDelete) && (
                          <div className="mt-2 flex justify-end">
                            <RowActions
                              label={`le cours de ${slot.subject.name} du ${dayLabel[day].toLowerCase()} à ${slot.start}`}
                              onEdit={onEdit ? () => onEdit(slot) : undefined}
                              onDelete={onDelete ? () => onDelete(slot) : undefined}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-ink/70">Aucun cours.</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}