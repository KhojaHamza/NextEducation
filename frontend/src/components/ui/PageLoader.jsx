import { LoaderCircle } from 'lucide-react';

export default function PageLoader() {
  return (
    <div role="status" className="grid min-h-dvh place-items-center">
      <div className="flex items-center gap-3 text-lg">
        <LoaderCircle className="size-6 animate-spin text-sky" aria-hidden="true" />
        Chargement…
      </div>
    </div>
  );
}