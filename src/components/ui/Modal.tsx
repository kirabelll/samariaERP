'use client';

import React, { ReactNode, useEffect, useRef } from 'react';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  body: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdropClick?: boolean;
  closeOnEscapeKey?: boolean;
  children?: ReactNode;
}

interface ConfirmDialogProps {
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
};

function Modal({
  isOpen,
  onClose,
  title,
  body,
  footer,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscapeKey = true,
  children,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div className={`w-full ${sizeClasses[size]} bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] scale-in-95 animate-in`}>
        {(title || children) && (
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#F5F5F7]">
            {title && <h2 className="text-lg font-semibold text-[#1D1D1F]">{title}</h2>}
            {children}
            <button
              onClick={onClose}
              className="ml-auto w-8 h-8 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] flex items-center justify-center transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5 text-[#86868B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        <div className="px-6 py-5">{body}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#F5F5F7] bg-[#FAFAFA]/50">
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
      body={<p className="text-[#86868B]">{message}</p>}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading || isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={isDangerous ? 'danger' : 'primary'}
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
