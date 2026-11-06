import { useState } from 'react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import SelectField from '../../components/ui/SelectField.jsx';
import { useToast } from '../../hooks/useToast.js';
import { teacherName, useTeacherOptions } from '../classes/hooks.js';
import { classLabel } from '../students/format.js';
import { useSubjectsOfLevel } from '../subjects/hooks.js';
import { messageFor } from './errors.js';
import { useAssignmentMutations } from './hooks.js';

function AssignmentForm({ schoolClass, onClose }) {
  const toast = useToast();
  const { create } = useAssignmentMutations();
  const subjects = useSubjectsOfLevel(schoolClass.level);
  const teachers = useTeacherOptions();

  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  const failed = subjects.error ?? teachers.error;
  if (failed) {
    return <Alert tone="danger" title="Impossible de charger les données"><p>{failed.message}</p></Alert>;
  }
  if (subjects.isPending || teachers.isPending) {
    return <div role="status" aria-label="Chargement" className="h-40 animate-pulse rounded-xl bg-ink/10" />;
  }

  const subjectOptions = subjects.data;
  const teacherList = teachers.data;

  const submit = async (event) => {
    event.preventDefault();
    setServerError(null);

    const next = {};
    if (!subjectId) next.subject = 'Choisis une matière.';
    if (!teacherId) next.teacher = 'Choisis un enseignant.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await create.mutateAsync({
        classId: schoolClass.id,
        subjectId: Number(subjectId),
        teacherId: Number(teacherId),
      });
      toast.success('Attribution ajoutée.');
      onClose();
    } catch (err) {
      setServerError(messageFor(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {serverError && <Alert tone="danger">{serverError}</Alert>}

      <p>
        <span className="text-ink/70">Classe : </span>
        <strong>{classLabel(schoolClass)}</strong>
      </p>

      {subjectOptions.length === 0 && (
        <Alert tone="info">
          Aucune matière n’existe pour le niveau {schoolClass.level} : crée-en une dans « Matières ».
        </Alert>
      )}

      <SelectField
        label="Matière"
        value={subjectId}
        error={errors.subject}
        onChange={(e) => setSubjectId(e.target.value)}
      >
        <option value="">Choisir…</option>
        {subjectOptions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="Enseignant"
        value={teacherId}
        error={errors.teacher}
        onChange={(e) => setTeacherId(e.target.value)}
      >
        <option value="">Choisir…</option>
        {teacherList.map((t) => (
          <option key={t.id} value={t.id}>
            {teacherName(t)}
          </option>
        ))}
      </SelectField>

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" loading={saving}>
          Attribuer
        </Button>
      </div>
    </form>
  );
}

// The form is mounted only while the window is open, so it always starts empty
export default function AssignmentModal({ open, schoolClass, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Attribuer une matière">
      {schoolClass && <AssignmentForm schoolClass={schoolClass} onClose={onClose} />}
    </Modal>
  );
}