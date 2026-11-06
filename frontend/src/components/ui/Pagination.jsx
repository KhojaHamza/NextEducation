import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button.jsx';

export default function Pagination({ meta, onPageChange }) {
  if (!meta) return null;
  const { page, totalPages, total } = meta;

  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p>
        {total} résultat{total > 1 ? 's' : ''}
        {totalPages > 1 && <> · page {page} sur {totalPages}</>}
      </p>

      {totalPages > 1 && (
        <div className="flex gap-2">
          <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
            Précédent
          </Button>
          <Button variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            Suivant
            <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </Button>
        </div>
      )}
    </nav>
  );
}