'use client';

/**
 * Shared admin SEO snapshot fetch — dedupes requests across widget, alerts, and nav badge.
 */
import { useCallback, useEffect, useState } from 'react';
import type { SiteSeoAudit } from '@domain/seo/health';
import type { SeoAdminSnapshot } from '@core/seo/CatalogAuditService';
import type { SeoAdminReport } from '@core/seo/SeoAdminReportService';
import type { SeoGooglePreview } from '@domain/seo/preview';

export interface SeoSnapshotApiResponse {
  site: SiteSeoAudit;
  snapshot: SeoAdminSnapshot;
  report: SeoAdminReport;
  siteHost: string;
  homepagePreview: SeoGooglePreview;
}

const CACHE_TTL_MS = 60_000;

let sharedPromise: Promise<SeoSnapshotApiResponse | null> | null = null;
let cacheExpiresAt = 0;

async function fetchSnapshot(): Promise<SeoSnapshotApiResponse | null> {
  const res = await fetch('/api/admin/seo/snapshot');
  if (!res.ok) return null;
  return res.json();
}

function getSharedSnapshot(force = false): Promise<SeoSnapshotApiResponse | null> {
  const stale = Date.now() > cacheExpiresAt;
  if (force || !sharedPromise || stale) {
    sharedPromise = fetchSnapshot();
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  }
  return sharedPromise;
}

export function invalidateSeoSnapshotCache(): void {
  sharedPromise = null;
  cacheExpiresAt = 0;
}

export function useSeoSnapshot(options?: { refresh?: boolean }) {
  const [data, setData] = useState<SeoSnapshotApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    invalidateSeoSnapshotCache();
    const next = await getSharedSnapshot(true);
    setData(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getSharedSnapshot(options?.refresh)
      .then((payload) => {
        if (active) setData(payload);
      })
      .catch(() => {
        if (active) setData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [options?.refresh]);

  return { data, loading, reload };
}
