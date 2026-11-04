import { useState } from 'react';
import Button from './Button.jsx';
import Modal from './Modal.jsx';

// onConfirm must handle its own errors (for example with a toast): this dialog only shows the loading state
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirmer',
  danger = false,
  onConfirm,
  onCancel,
}) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <div>{children}</div>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={handleConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}