import { Pencil, Trash2 } from 'lucide-react';

const base = 'grid size-11 place-items-center rounded-xl hover:bg-ink/5';

export default function RowActions({ label, onEdit, onDelete }) {
  return (
    <div className="flex justify-end gap-1">
      {onEdit && (
        <button type="button" onClick={onEdit} aria-label={`Modifier ${label}`} className={base}>
          <Pencil className="size-5" aria-hidden="true" />
        </button>
      )}
      {onDelete && (
        <button type="button" onClick={onDelete} aria-label={`Supprimer ${label}`} className={base}>
          <Trash2 className="size-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}