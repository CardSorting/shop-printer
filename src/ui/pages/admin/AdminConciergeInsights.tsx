'use client';

import { Sparkles } from 'lucide-react';
import { useAdminPageTitle } from '../../components/admin/AdminComponents';

export function AdminConciergeInsights() {
  useAdminPageTitle('Concierge AI');
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-lg border border-gray-100 shadow-sm max-w-2xl mx-auto my-12">
      <div className="p-4 bg-red-50 rounded-full text-red-500 mb-4">
        <Sparkles className="w-12 h-12" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Concierge AI is Disabled</h1>
      <p className="text-gray-500 mb-6">
        The agentic and AI features have been deactivated for this store to eliminate hosting and API costs.
      </p>
    </div>
  );
}
