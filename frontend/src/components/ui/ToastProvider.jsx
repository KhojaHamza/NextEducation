import { createContext, useCallback, useMemo, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, X } from 'lucide-react';

export const ToastContext = createContext(null);

const tones = {
  success: { box: 'border-meadow', icon: CircleCheck },
  error: { box: 'border-coral', icon: CircleAlert },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone, message) => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, tone, message }]);
      setTimeout(() => dismiss(id), 6000);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Above the phone tab bar, bottom of the screen on computers */}
      <div aria-live="polite" className="fixed inset-x-4 bottom-24 z-50 flex flex-col items-center gap-2 lg:bottom-6">
        {toasts.map(({ id, tone, message }) => {
          const { box, icon: Icon } = tones[tone];
          return (
            <div
              key={id}
              className={`flex w-full max-w-md items-start gap-3 rounded-xl border-s-4 bg-paper p-4 shadow-lg ${box}`}
            >
              <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <p className="flex-1 font-bold">{message}</p>
              <button
                type="button"
                onClick={() => dismiss(id)}
                aria-label="Fermer le message"
                className="grid size-8 place-items-center rounded-lg hover:bg-ink/5"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}