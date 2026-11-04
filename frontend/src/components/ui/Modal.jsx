import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };

// Built on the native <dialog>: the browser handles the focus trap, the Escape key and the dark backdrop
export default function Modal({ open, onClose, title, children, size = 'md' }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // A click on the dark backdrop reaches the <dialog> itself, not its content
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`m-auto max-h-[90dvh] w-[calc(100%-2rem)] ${widths[size]} overflow-y-auto rounded-2xl bg-paper p-0 text-ink shadow-xl backdrop:bg-ink/50`}
    >
      {open && (
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="text-2xl font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="grid size-11 shrink-0 place-items-center rounded-xl hover:bg-ink/5"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}