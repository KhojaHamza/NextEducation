import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, SearchX, Users } from 'lucide-react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { useToast } from '../../hooks/useToast.js';
import { useAuth } from '../auth/useAuth.js';
import { classLabel, formatDate } from '../students/format.js';
import { messageFor } from './errors.js';
import { termLabel } from './format.js';
import { useEvaluationMutations, useGradeSheet } from './hooks.js';

const fmtScore = (n) => (n === null ? '' : String(n).replace('.', ','));
const fmtAverage = (n) => n.toFixed(2).replace('.', ',');

// "14,5" and "14.5" are both accepted; an empty field means "no grade"
const parseScore = (text) => {
  const t = text.trim().replace(',', '.');
  if (t === '') return { value: null };
  if (!/^\d+(\.\d*)?$/.test(t)) return { error: 'Saisis un nombre (par exemple 14,5).' };
  return { value: Number(t) };
};

const inputClass = (error) =>
  `min-h-11 rounded-xl border-2 bg-paper px-3 ${error ? 'border-coral' : 'border-ink/15 focus:border-sky'}`;

function GradeForm({ id, data }) {
  const { evaluation, sheet } = data;
  const toast = useToast();
  const { saveGrades } = useEvaluationMutations();
  const max = Number(evaluation.maxScore);

  const initial = () =>
    Object.fromEntries(sheet.map((r) => [r.student.id, { score: fmtScore(r.score), comment: r.comment ?? '' }]));
  const [baseline, setBaseline] = useState(initial); // what the server holds
  const [values, setValues] = useState(initial); // what is typed
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  const rows = sheet.map(({ student }) => {
    const v = values[student.id];
    const b = baseline[student.id];
    const parsed = parseScore(v.score);
    let error = parsed.error;
    if (!error && parsed.value !== null && parsed.value > max) error = `La note maximale est ${max}.`;
    if (!error && parsed.value === null && v.comment.trim()) error = 'Saisis une note, ou efface le commentaire.';
    const commentChanged = v.comment.trim() !== b.comment.trim();
    const dirty = Boolean(parsed.error) || parsed.value !== parseScore(b.score).value || commentChanged;
    return { student, v, error, score: parsed.value, dirty, commentChanged };
  });

  const changed = rows.filter((r) => r.dirty);
  const hasError = rows.some((r) => r.error);
  const entered = rows.filter((r) => !r.error && r.score !== null);
  const average = entered.length ? entered.reduce((sum, r) => sum + r.score, 0) / entered.length : null;

  // Leaving the page (or closing the tab) with unsaved grades asks for confirmation
  useEffect(() => {
    if (changed.length === 0) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [changed.length]);

  const edit = (studentId, field, value) =>
    setValues((current) => ({ ...current, [studentId]: { ...current[studentId], [field]: value } }));

  // Enter jumps to the next student's grade, to type a whole class without the mouse
  const nextOnEnter = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const inputs = [...event.currentTarget.closest('ul').querySelectorAll('input[data-score]')];
    inputs[inputs.indexOf(event.currentTarget) + 1]?.focus();
  };

  const save = async () => {
    setServerError(null);
    setSaving(true);
    try {
      // Only the changed rows are sent: the others are not touched on the server
      const grades = changed.map((r) => ({
        studentId: r.student.id,
        score: r.score,
        ...(r.commentChanged && { comment: r.v.comment.trim() }),
      }));
      const result = await saveGrades.mutateAsync({ id, grades });
      setBaseline(values);

      const parts = [
        result.created && `${result.created} ajoutée${result.created > 1 ? 's' : ''}`,
        result.updated && `${result.updated} modifiée${result.updated > 1 ? 's' : ''}`,
        result.deleted && `${result.deleted} retirée${result.deleted > 1 ? 's' : ''}`,
      ].filter(Boolean);
      toast.success(`Notes enregistrées${parts.length ? ` (${parts.join(', ')})` : ''}.`);
    } catch (err) {
      setServerError(messageFor(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {serverError && (
        <div className="mb-4">
          <Alert tone="danger" title="Enregistrement impossible">
            <p>{serverError}</p>
          </Alert>
        </div>
      )}

      <ul className="divide-y divide-ink/10 rounded-2xl bg-paper">
        {rows.map(({ student, v, error }) => (
          <li key={student.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 p-4">
            <div className="min-w-0 basis-full sm:basis-64">
              <p className="font-bold">
                {student.lastName} {student.firstName}
              </p>
              <p className="text-sm text-ink/70">{student.matricule}</p>
            </div>

            <div>
              <label htmlFor={`score-${student.id}`} className="sr-only">
                Note de {student.firstName} {student.lastName} sur {max}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={`score-${student.id}`}
                  data-score
                  inputMode="decimal"
                  autoComplete="off"
                  value={v.score}
                  onChange={(e) => edit(student.id, 'score', e.target.value)}
                  onKeyDown={nextOnEnter}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `score-error-${student.id}` : undefined}
                  className={`${inputClass(error)} w-24 text-end`}
                />
                <span aria-hidden="true">/ {max}</span>
              </div>
              {error && (
                <p id={`score-error-${student.id}`} role="alert" className="mt-1 text-sm font-bold">
                  {error}
                </p>
              )}
            </div>

            <div className="min-w-48 flex-1">
              <label htmlFor={`comment-${student.id}`} className="sr-only">
                Commentaire pour {student.firstName} {student.lastName}
              </label>
              <input
                id={`comment-${student.id}`}
                maxLength={300}
                autoComplete="off"
                placeholder="Commentaire (facultatif)"
                value={v.comment}
                onChange={(e) => edit(student.id, 'comment', e.target.value)}
                className={`${inputClass(false)} w-full`}
              />
            </div>
          </li>
        ))}
      </ul>

      {/* Stays visible while scrolling a long class; above the tab bar on a phone */}
      <div className="sticky bottom-24 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-paper p-4 shadow-lg lg:bottom-4">
        <p aria-live="polite">
          {entered.length} / {sheet.length} notes saisies
          {average !== null && (
            <>
              {' '}
              · moyenne {fmtAverage(average)} / {max}
            </>
          )}
          {hasError ? (
            <strong> · Corrige les erreurs signalées</strong>
          ) : changed.length > 0 ? (
            <strong>
              {' '}
              · {changed.length} modification{changed.length > 1 ? 's' : ''} non enregistrée
              {changed.length > 1 ? 's' : ''}
            </strong>
          ) : null}
        </p>
        <Button onClick={save} loading={saving} disabled={changed.length === 0 || hasError}>
          Enregistrer
        </Button>
      </div>
    </>
  );
}

export default function GradeEntryPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const base = user.role === 'TEACHER' ? '/enseignant' : '/admin';
  const query = useGradeSheet(id);

  const back = (
    <Link
      to={`${base}/evaluations`}
      className="mb-4 inline-flex min-h-11 items-center gap-1.5 font-bold text-sky hover:underline"
    >
      <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
      Retour aux évaluations
    </Link>
  );

  if (query.isPending) {
    return (
      <>
        {back}
        <div role="status" aria-label="Chargement des notes" className="h-64 animate-pulse rounded-2xl bg-ink/10" />
      </>
    );
  }

  if (query.error) {
    return (
      <>
        {back}
        {query.error.status === 404 ? (
          <EmptyState icon={SearchX} title="Évaluation introuvable">
            Cette évaluation n’existe pas ou a été supprimée.
          </EmptyState>
        ) : (
          <Alert tone="danger" title="Impossible de charger les notes">
            <p>{messageFor(query.error)}</p>
            <Button variant="secondary" onClick={() => query.refetch()} className="mt-3">
              Réessayer
            </Button>
          </Alert>
        )}
      </>
    );
  }

  const { evaluation, sheet } = query.data;

  return (
    <>
      {back}
      <PageHeader
        title={evaluation.title}
        description={`${classLabel(evaluation.schoolClass)} · ${evaluation.subject.name} · ${termLabel[evaluation.term]} · ${formatDate(evaluation.date)} · sur ${Number(evaluation.maxScore)}`}
      />
      {sheet.length === 0 ? (
        <EmptyState icon={Users} title="Aucun élève dans cette classe">
          Inscris d’abord des élèves dans cette classe pour pouvoir saisir leurs notes.
        </EmptyState>
      ) : (
        <GradeForm key={id} id={id} data={query.data} />
      )}
    </>
  );
}