'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, variant: ToastVariant, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant, duration = 5000) => {
      const id = `${Date.now()}-${Math.random()}`;
      const newToast: Toast = { id, message, variant, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const variantConfig = {
    success: {
      bg: 'bg-white/80 backdrop-blur-xl',
      borderColor: 'border-l-4 border-l-[#34C759]',
      icon: '✓',
      iconColor: 'text-[#34C759]',
      textColor: 'text-[#1D1D1F]',
    },
    error: {
      bg: 'bg-white/80 backdrop-blur-xl',
      borderColor: 'border-l-4 border-l-[#FF3B30]',
      icon: '✕',
      iconColor: 'text-[#FF3B30]',
      textColor: 'text-[#1D1D1F]',
    },
    warning: {
      bg: 'bg-white/80 backdrop-blur-xl',
      borderColor: 'border-l-4 border-l-[#FF9500]',
      icon: '⚠',
      iconColor: 'text-[#FF9500]',
      textColor: 'text-[#1D1D1F]',
    },
    info: {
      bg: 'bg-white/80 backdrop-blur-xl',
      borderColor: 'border-l-4 border-l-[#007AFF]',
      icon: 'ℹ',
      iconColor: 'text-[#007AFF]',
      textColor: 'text-[#1D1D1F]',
    },
  };

  const config = variantConfig[toast.variant];

  return (
    <div
      className={`pointer-events-auto ${config.bg} ${config.borderColor} rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] p-4 flex items-start gap-3 transition-all duration-300 ${
        isExiting
          ? 'opacity-0 translate-y-full'
          : 'opacity-100 translate-y-0 animate-in slide-in-from-bottom'
      }`}
    >
      <div className={`flex-shrink-0 text-lg font-semibold ${config.iconColor}`}>
        {config.icon}
      </div>
      <p className={`flex-1 text-sm font-medium ${config.textColor}`}>
        {toast.message}
      </p>
      <button
        onClick={handleClose}
        className={`flex-shrink-0 ${config.iconColor} hover:opacity-70 transition-opacity`}
        aria-label="Close toast"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}

export default ToastProvider;
