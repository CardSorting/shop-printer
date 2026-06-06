/**
 * [LAYER: UI — SEO]
 * Client-side SEO bridge — hooks and cache helpers for admin surfaces.
 */

export { useSeoSnapshot, invalidateSeoSnapshotCache, type SeoSnapshotApiResponse } from '../hooks/useSeoSnapshot';
export { useSeoListingAudit, type SeoListingKind } from '../hooks/useSeoListingAudit';
export { notifySeoListingChanged } from '../hooks/useSeoCacheInvalidation';
