'use client';

import { AlertCircle } from 'lucide-react';

type CatalogErrorBannerProps = {
  message: string;
  onRetry: () => void;
};

export function CatalogErrorBanner({ message, onRetry }: CatalogErrorBannerProps) {
  return (
    <div
      role="alert"
      className="mb-8 flex flex-col gap-4 rounded-2xl border border-red-100 bg-red-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3 text-red-800">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 rounded-xl bg-red-800 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-red-900"
      >
        Try Again
      </button>
    </div>
  );
}
