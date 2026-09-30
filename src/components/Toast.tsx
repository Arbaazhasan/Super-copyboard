import React from 'react';
import { ToastMessage } from '../lib/types';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';

interface ToastProps {
  toast: ToastMessage | null;
}

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  if (!toast) return null;

  return (
    <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 pointer-events-none">
      <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-yaru-darkBg/95 border border-white/15 text-white shadow-xl text-xs font-medium backdrop-blur-md">
        {toast.type === 'warning' ? (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        ) : toast.type === 'info' ? (
          <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
        )}
        <span>{toast.text}</span>
      </div>
    </div>
  );
};
