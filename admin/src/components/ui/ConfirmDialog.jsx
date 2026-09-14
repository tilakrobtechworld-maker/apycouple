import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

/**
 * ConfirmDialog — modal with warning icon for destructive confirmation.
 *
 * Props:
 *  isOpen       bool
 *  onClose      () => void
 *  onConfirm    () => void
 *  title        string
 *  description  string
 *  confirmLabel string   — label for confirm button (default: 'Confirm')
 *  dangerous    bool     — if true, confirm button is red
 *  loading      bool     — shows spinner on confirm button
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  dangerous = true,
  loading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="text-center py-2">
        {/* Icon */}
        <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4 ${dangerous ? 'bg-red-100' : 'bg-amber-100'}`}>
          {dangerous
            ? <Trash2 size={26} className="text-red-600" />
            : <AlertTriangle size={26} className="text-amber-600" />
          }
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>

        {/* Description */}
        <p className="text-sm text-slate-500 mb-6">{description}</p>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={dangerous ? 'danger' : 'warning'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
