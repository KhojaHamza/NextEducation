import { useEffect, useState } from 'react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import TextField from '../../components/ui/TextField.jsx';
import { useToast } from '../../hooks/useToast.js';
import { teacherName, useTeacherOptions } from '../classes/hooks.js';
import { classLabel } from '../students/format.js';
import { messageFor } from './errors.js';
import { conflictText, dayOptions } from './format.js';
import { checkSlot, useRoomOptions, useSlotMutations, useSubjectOptions } from './hooks.js';

// record = null -> new slot; record = {...} -> edit (record comes from the week sent by the backend)
function SlotForm({ schoolClass, record, onClose }) {
  const isEdit = Boolean(record);
  const toast = useToast();
  const { create, update } = useSlotMutations();
  const subjects = useSubjectOptions();
  const teachers = useTeacherOptions();
  const rooms = useRoomOptions();

  const [values, setValues] = useState({
    subjectId: record ? String(record.subject.id) : '',
    teacherId: record ? String(record.teacher.id) : '',
    roomId: record?.room ? String(record.room.id) : '',
    dayOfWeek: record?.dayOfWeek ?? 'MONDAY',
    start: record?.start ?? '08:00',
    end: record?.end ?? '09:00',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [checking, setChecking] = useState(false);

  const change = (key) => (event) => {
    setValues((v) => ({ ...v, [key]: event.target.value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setServerError(null);
  };

  const buildBody = () => ({
    classId: schoolClass.id,
    subjectId: Number(values.subjectId),
    teacherId: Number(values.teacherId),
    roomId: values.roomId ? Number(values.roomId) : null,
    dayOfWeek: values.dayOfWeek,
    startMinute: values.start, // the backend accepts "HH:MM"
    endMinute: values.end,
  });

  // Live check while the form is filled in: the answer is advice, the server decides when saving
  const complete = Boolean(values.subjectId && values.teacherId && values.start && values.end && values.end > values.start);
  const bodyKey = complete ? JSON.stringify(buildBody()) : '';

  useEffect(() => {
    if (!bodyKey) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const result = await checkSlot({ ...JSON.parse(bodyKey), ...(record ? { slotId: record.id } : {}) });
        if (!cancelled) setCheckResult(result);
      } catch {
        if (!cancelled) setCheckResult(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [bodyKey, record]);

  const conflicts = bodyKey && checkResult ? checkResult.conflicts : [];
  const isFree = Boolean(bodyKey && checkResult?.ok && !checking);

  const subjectOptions = (subjects.data ?? []).filter((s) => s.level === schoolClass.level);
  const roomOptions = (rooms.data ?? []).filter((r) => r.isAvailable || r.id === record?.room?.id);

  const submit = async (event) => {
    event.preventDefault();
    setServerError(null);

    const next = {};
    if (!values.subjectId) next.subjectId = 'Choisis une matière.';
    if (!values.teacherId) next.teacherId = 'Choisis un enseignant.';
    if (!values.start) next.start = 'Choisis l’heure de début.';
    if (!values.end) next.end = 'Choisis l’heure de fin.';
    else if (values.start && values.end <= values.start) next.end = 'L’heure de fin doit être après l’heure de début.';
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await update.mutateAsync({ id: record.id, body: buildBody() });
        toast.success('Créneau modifié.');
      } else {
        await create.mutateAsync(buildBody());
        toast.success('Créneau ajouté.');
      }
      onClose();
    } catch (err) {
      setServerError(messageFor(err));
    } finally {
      setSaving(false);
    }
  };

  const loadError = subjects.error || teachers.error || rooms.error;

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <p>
        Classe : <strong>{classLabel(schoolClass)}</strong>
      </p>

      {serverError && <Alert tone="danger">{serverError}</Alert>}
      {loadError && <Alert tone="danger">{loadError.message}</Alert>}

      <SelectField label="Jour" value={values.dayOfWeek} onChange={change('dayOfWeek')}>
        {dayOptions.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </SelectField>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Début" type="time" value={values.start} onChange={change('start')} error={errors.start} />
        <TextField label="Fin" type="time" value={values.end} onChange={change('end')} error={errors.end} />
      </div>

      <SelectField
        label="Matière"
        value={values.subjectId}
        disabled={subjects.isPending}
        error={errors.subjectId}
        onChange={change('subjectId')}
      >
        <option value="">{subjects.isPending ? 'Chargement…' : 'Choisir…'}</option>
        {subjectOptions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </SelectField>

      {!subjects.isPending && !subjects.error && subjectOptions.length === 0 && (
        <Alert tone="info">Aucune matière pour le niveau {schoolClass.level} : crée-en une dans « Matières ».</Alert>
      )}

      <SelectField
        label="Enseignant"
        value={values.teacherId}
        disabled={teachers.isPending}
        error={errors.teacherId}
        onChange={change('teacherId')}
      >
        <option value="">{teachers.isPending ? 'Chargement…' : 'Choisir…'}</option>
        {(teachers.data ?? []).map((t) => (
          <option key={t.id} value={t.id}>
            {teacherName(t)}
          </option>
        ))}
      </SelectField>

      <SelectField label="Salle (facultatif)" value={values.roomId} disabled={rooms.isPending} onChange={change('roomId')}>
        <option value="">Sans salle</option>
        {roomOptions.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name} ({r.capacity} places)
          </option>
        ))}
      </SelectField>

      <div aria-live="polite" className="min-h-6">
        {checking && <p className="text-sm text-ink/70">Vérification des conflits…</p>}
        {!checking && conflicts.length > 0 && (
          <Alert tone="danger" title="Ce créneau pose un problème">
            <ul className="list-disc space-y-1 ps-5">
              {conflicts.map((c, index) => (
                <li key={`${c.type}-${c.slotId ?? index}`}>{conflictText(c.message)}</li>
              ))}
            </ul>
          </Alert>
        )}
        {isFree && <p className="font-bold">Ce créneau est libre.</p>}
      </div>

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" loading={saving}>
          {isEdit ? 'Enregistrer' : 'Ajouter le créneau'}
        </Button>
      </div>
    </form>
  );
}

// Mounted only while open: the form always starts from the slot being edited
export default function SlotFormModal({ open, schoolClass, record, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={record ? 'Modifier le créneau' : 'Nouveau créneau'}>
      {schoolClass && <SlotForm schoolClass={schoolClass} record={record} onClose={onClose} />}
    </Modal>
  );
}