/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import clsx from "clsx";

type ToastType = "success" | "error" | "info" | "warning";

type Toast = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  icon?: ReactNode;
};

type ToastContextType = {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

const toastIcons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const toastColors: Record<ToastType, string> = {
  success: "bg-green-500/10 border-green-500/30 text-green-400",
  error: "bg-red-500/10 border-red-500/30 text-red-400",
  info: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  warning: "bg-amber-500/10 border-amber-500/30 text-amber-400",
};

const toastIconColors: Record<ToastType, string> = {
  success: "text-green-400",
  error: "text-red-400",
  info: "text-blue-400",
  warning: "text-amber-400",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2, 9);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    const duration = toast.duration || 5000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (title: string, message?: string) => {
      addToast({ type: "success", title, message });
    },
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string) => {
      addToast({ type: "error", title, message });
    },
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string) => {
      addToast({ type: "info", title, message });
    },
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string) => {
      addToast({ type: "warning", title, message });
    },
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, info, warning }}
    >
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-sm">
      {toasts.map((toast) => {
        const DefaultIcon = toastIcons[toast.type];
        return (
          <div
            key={toast.id}
            className={clsx(
              "flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-lg",
              "animate-in slide-in-from-right-full duration-300",
              toastColors[toast.type]
            )}
          >
            {toast.icon ? (
              <span className={toastIconColors[toast.type]}>{toast.icon}</span>
            ) : (
              <DefaultIcon size={20} className={toastIconColors[toast.type]} />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white text-sm">{toast.title}</p>
              {toast.message && (
                <p className="text-sm text-slate-400 mt-0.5">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 text-slate-500 hover:text-white transition-colors"
              title="Dismiss notification"
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
