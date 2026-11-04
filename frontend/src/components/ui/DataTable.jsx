import Alert from './Alert.jsx';
import Button from './Button.jsx';

// columns: [{ key, header, render?: (row) => node, primary?: boolean }]
// On a phone the table becomes one card per row; the "primary" column is the card's title.
export default function DataTable({
  columns,
  rows,
  loading = false,
  error = null,
  onRetry,
  empty = null,
  getRowKey = (row) => row.id,
}) {
  if (error) {
    return (
      <Alert tone="danger" title="Impossible de charger la liste">
        <p>{error.message}</p>
        {onRetry && (
          <Button variant="secondary" onClick={onRetry} className="mt-3">
            Réessayer
          </Button>
        )}
      </Alert>
    );
  }

  if (loading) {
    return (
      <div role="status" aria-label="Chargement de la liste" className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-ink/10" />
        ))}
      </div>
    );
  }

  if (!rows.length) return empty;

  const cell = (col, row) => (col.render ? col.render(row) : (row[col.key] ?? '—'));
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const others = columns.filter((c) => c !== primary);

  return (
    <>
      {/* Computer: a real table */}
      <div className="hidden overflow-x-auto rounded-2xl bg-paper md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-ink/10">
              {columns.map((col) => (
                <th key={col.key} scope="col" className="px-4 py-3 text-start font-bold">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getRowKey(row)} className="border-b border-ink/10 last:border-0 hover:bg-sky/5">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    {cell(col, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone: one card per row */}
      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li key={getRowKey(row)} className="rounded-2xl bg-paper p-4">
            <p className="text-lg font-bold">{cell(primary, row)}</p>
            <dl className="mt-2 space-y-1">
              {others.map((col) => (
                <div key={col.key} className="flex items-center justify-between gap-4">
                  <dt className="text-ink/70">{col.header}</dt>
                  <dd className="text-end font-bold">{cell(col, row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}