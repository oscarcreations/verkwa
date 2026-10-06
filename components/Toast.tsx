"use client";

import { useEffect, useState, useCallback } from "react";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

let toastListeners: ((toast: Toast) => void)[] = [];

export function showToast(message: string, type: "success" | "error" | "info" = "success") {
  const toast: Toast = { id: Date.now().toString(), message, type };
  toastListeners.forEach((listener) => listener(toast));
}

// Confirm dialog
interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  resolve: (val: boolean) => void;
}

let confirmListeners: ((state: ConfirmState) => void)[] = [];

export function showConfirm(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const state: ConfirmState = { open: true, title, message, resolve };
    confirmListeners.forEach((listener) => listener(state));
  });
}

export function ToastContainer({ className }: { className?: string } = {}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  useEffect(() => {
    const toastListener = (toast: Toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 4000);
    };
    const confirmListener = (state: ConfirmState) => {
      setConfirm(state);
    };
    toastListeners.push(toastListener);
    confirmListeners.push(confirmListener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== toastListener);
      confirmListeners = confirmListeners.filter((l) => l !== confirmListener);
    };
  }, []);

  const handleConfirm = (val: boolean) => {
    confirm?.resolve(val);
    setConfirm(null);
  };

  return (
    <div className={className}>
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-sm transform transition-all duration-300 animate-slide-in ${
              toast.type === "success"
                ? "bg-emerald-50/95 border-emerald-200 text-emerald-800"
                : toast.type === "error"
                ? "bg-red-50/95 border-red-200 text-red-800"
                : "bg-blue-50/95 border-blue-200 text-blue-800"
            }`}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
              toast.type === "success"
                ? "bg-emerald-100"
                : toast.type === "error"
                ? "bg-red-100"
                : "bg-blue-100"
            }`}>
              {toast.type === "success" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : toast.type === "error" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              )}
            </div>
            <span className="text-sm font-semibold pr-2">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Confirm Dialog */}
      {confirm?.open && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => handleConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 space-y-6 animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-slate-900">{confirm.title}</h3>
                <p className="text-[13px] text-slate-500 mt-1">{confirm.message}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button onClick={(e) => { e.stopPropagation(); handleConfirm(false); }}
                className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-600 hover:bg-slate-50 transition-all">
                Cancel
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleConfirm(true); }}
                className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-[13px] font-bold hover:bg-amber-600 transition-all shadow-sm">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
