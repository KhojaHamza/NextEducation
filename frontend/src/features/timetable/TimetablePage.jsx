import { useState } from 'react';
import { CalendarClock, Plus } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import { useToast } from '../../hooks/useToast.js';
import ClassPicker from '../classes/ClassPicker.jsx';
import { teacherName, useTeacherOptions } from '../classes/hooks.js';
import { messageFor } from './errors.js';
import { dayLabel } from './format.js';
import { useRoomOptions, useSlotMutations, useWeek } from './hooks.js';
import SlotFormModal from './SlotFormModal.jsx';
import WeekGrid from './WeekGrid.jsx';

const viewOptions = [
  { value: 'class', label: 'Par classe' },
  { value: 'teacher', label: 'Par enseignant' },
  { value: 'room', label: 'Par salle' },
];

const prompts = {
  class: ['Choisis une classe', 'Sélectionne une classe pour voir et modifier son emploi du temps.'],
  teacher: ['Choisis un enseignant', 'Sélectionne un enseignant pour voir sa semaine (année en cours).'],
  room: ['Choisis une salle', 'Sélectionne une salle pour voir quand elle est utilisée (année en cours).'],
};

export default function TimetablePage() {
  const toast = useToast();
  const { remove } = useSlotMutations();
  const teachers = useTeacherOptions();
  const rooms = useRoomOptions();

  const [view, setView] = useState('class');
  const [schoolClass, setSchoolClass] = useState(null);
  const [teacherId, setTeacherId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [form, setForm] = useState({ open: false, record: null });
  const [deleting, setDeleting] = useState(null);

  const id = view === 'class' ? schoolClass?.id : view === 'teacher' ? teacherId : roomId;
  const week = useWeek(view, id);
  const data = week.data;
  const canEdit = view === 'class' && Boolean(schoolClass);

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(deleting.id);
      toast.success('Créneau supprimé.');
    } catch (err) {
      toast.error(messageFor(err));
    }
    setDeleting(null);
  };

  const summary = !data
    ? null
    : view === 'class'
      ? `Classe ${data.class.name} · ${data.class.schoolYear}`
      : view === 'teacher'
        ? `${data.teacher.name} · année en cours`
        : `Salle ${data.room.name} · année en cours`;

  let body;
  if (!id) {
    body = (
      <EmptyState icon={CalendarClock} title={prompts[view][0]}>
        {prompts[view][1]}
      </EmptyState>
    );
  } else if (week.isPending) {
    body = <div role="status" aria-label="Chargement de l’emploi du temps" className="h-64 animate-pulse rounded-2xl bg-ink/10" />;
  } else if (week.error) {
    body = (
      <Alert tone="danger" title="Impossible de charger l’emploi du temps">
        <p>{messageFor(week.error)}</p>
        <Button variant="secondary" onClick={() => week.refetch()} className="mt-3">
          Réessayer
        </Button>
      </Alert>
    );
  } else {
    body = (
      <div aria-busy={week.isFetching}>
        <p className="mb-3 font-bold" aria-live="polite">
          {summary}
        </p>
        <WeekGrid
          days={data.days}
          show={view}
          onEdit={canEdit ? (slot) => setForm({ open: true, record: slot }) : undefined}
          onDelete={canEdit ? setDeleting : undefined}
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Emploi du temps"
        description="Les conflits (classe, enseignant, salle) sont détectés avant l’enregistrement."
        actions={
          canEdit && (
            <Button onClick={() => setForm({ open: true, record: null })}>
              <Plus className="size-4" aria-hidden="true" />
              Nouveau créneau
            </Button>
          )
        }
      />

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <SelectField label="Vue" value={view} onChange={(e) => setView(e.target.value)} className="w-full sm:w-56">
          {viewOptions.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </SelectField>

        {view === 'class' && <ClassPicker value={schoolClass} onChange={setSchoolClass} />}

        {view === 'teacher' && (
          <SelectField
            label="Enseignant"
            value={teacherId}
            disabled={teachers.isPending}
            onChange={(e) => setTeacherId(e.target.value)}
            className="w-full sm:w-64"
          >
            <option value="">Choisir un enseignant…</option>
            {(teachers.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {teacherName(t)}
              </option>
            ))}
          </SelectField>
        )}

        {view === 'room' && (
          <SelectField
            label="Salle"
            value={roomId}
            disabled={rooms.isPending}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full sm:w-64"
          >
            <option value="">Choisir une salle…</option>
            {(rooms.data ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </SelectField>
        )}
      </div>

      {body}

      <SlotFormModal
        open={form.open}
        schoolClass={schoolClass}
        record={form.record}
        onClose={() => setForm({ open: false, record: null })}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Supprimer ce créneau ?"
        confirmLabel="Supprimer"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      >
        <p>
          Le cours de {deleting?.subject.name} du {deleting ? dayLabel[deleting.dayOfWeek].toLowerCase() : ''} (
          {deleting?.start} – {deleting?.end}) sera retiré de l’emploi du temps.
        </p>
      </ConfirmDialog>
    </>
  );
}