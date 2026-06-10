'use client';

import React from 'react';

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="aspect-4/5 rounded-3xl border border-gray-100 honey-shimmer" />
      <div className="mt-4 space-y-3 px-1">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-16 rounded-full honey-shimmer" />
          <div className="h-2.5 w-20 rounded-full honey-shimmer" />
        </div>
        <div className="h-4 w-3/4 rounded-lg honey-shimmer" />
        <div className="h-4 w-1/2 rounded-lg honey-shimmer" />
        <div className="h-5 w-24 rounded-lg honey-shimmer" />
        <div className="h-6 w-1/4 rounded-lg honey-shimmer" />
      </div>
    </div>
  );
}
