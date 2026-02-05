import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'SUCCESS' | 'ERROR' | 'INFO';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  const styles = {
    SUCCESS: 'bg-green-600 text-white',
    ERROR: 'bg-red-600 text-white',
    INFO: 'bg-blue-600 text-white',
  };

  const icons = {
    SUCCESS: <CheckCircle className="w-5 h-5" />,
    ERROR: <AlertCircle className="w-5 h-5" />,
    INFO: <Info className="w-5 h-5" />,
  };

  return (
    <div className={`${styles[toast.type]} flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl animate-in slide-in-from-right-full duration-300 min-w-[300px]`}>
      {icons[toast.type]}
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button onClick={() => onClose(toast.id)} className="opacity-70 hover:opacity-100 transition-opacity">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<{ toasts: ToastMessage[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => (
  <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
    {toasts.map((t) => (
      <Toast key={t.id} toast={t} onClose={removeToast} />
    ))}
  </div>
);
