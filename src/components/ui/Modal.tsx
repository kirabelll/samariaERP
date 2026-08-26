'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  body?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  closeOnBackdropClick?: boolean;
  closeOnEscapeKey?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-4xl',
};

function Modal({
  isOpen,
  onClose,
  title,
  description,
  body,
  footer,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscapeKey = true,
  children,
  className,
}: ModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (closeOnEscapeKey && e.key === 'Escape') {
        onClose();
      }
    };

    const handleBackdropClick = (e: MouseEvent) => {
      if (
        closeOnBackdropClick &&
        modalRef.current &&
        e.target === modalRef.current
      ) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    document.addEventListener('mousedown', handleBackdropClick);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('mousedown', handleBackdropClick);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose, closeOnBackdropClick, closeOnEscapeKey]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
    >
      <div
        className={cn(
          'w-full rounded-xl border border-border bg-card text-card-foreground shadow-lg duration-200 animate-in fade-in-0 zoom-in-95 overflow-hidden flex flex-col max-h-[90vh]',
          sizeClasses[size] || sizeClasses.md,
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1 text-sm text-foreground">
          {body || children}
        </div>

        {footer && (
          <div className="flex items-center justify-end gap-2.5 p-4 border-t border-border bg-muted/30">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

Modal.displayName = 'Modal';

function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  isLoading = false,
}: ConfirmDialogProps) {
  const [loading, setLoading] = React.useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      body={<p className="text-muted-foreground text-sm leading-relaxed">{message}</p>}
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading || isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={isDangerous ? 'destructive' : 'default'}
            onClick={handleConfirm}
            isLoading={loading || isLoading}
          >
            {confirmText}
          </Button>
        </>
      }
      closeOnBackdropClick={!loading && !isLoading}
      closeOnEscapeKey={!loading && !isLoading}
    />
  );
}

ConfirmDialog.displayName = 'ConfirmDialog';

export { ConfirmDialog };
export default Modal;
