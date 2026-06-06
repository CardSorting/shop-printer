'use client';

import { invalidateSeoSnapshotCache } from '@ui/hooks/useSeoSnapshot';

/** Call after saving a listing so hub widget, nav badge, and alerts refresh */
export function notifySeoListingChanged(): void {
  invalidateSeoSnapshotCache();
}
