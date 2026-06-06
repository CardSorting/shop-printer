/**
 * [LAYER: DOMAIN — SEO]
 * Maps site-health audit items to deployment env vars — for merchant-facing local tab.
 */

import { WOODBINE_LOCAL_BUSINESS_DEFAULTS as D } from './local-business-defaults';

export interface LocalEnvField {
  auditId: string;
  envKey: string;
  label: string;
  example: string;
  defaultValue: string;
  priority: 'high' | 'medium' | 'low';
}

/** Env vars that power local search, maps, and structured data (set at deploy time) */
export const LOCAL_ENV_FIELDS: readonly LocalEnvField[] = [
  {
    auditId: 'site-url',
    envKey: 'NEXT_PUBLIC_SITE_URL',
    label: 'Production website URL (HTTPS)',
    example: D.siteUrl,
    defaultValue: D.siteUrl,
    priority: 'high',
  },
  {
    auditId: 'street',
    envKey: 'NEXT_PUBLIC_BUSINESS_STREET',
    label: 'Street address',
    example: D.street,
    defaultValue: D.street,
    priority: 'high',
  },
  {
    auditId: 'locality',
    envKey: 'NEXT_PUBLIC_BUSINESS_CITY',
    label: 'City',
    example: D.city,
    defaultValue: D.city,
    priority: 'high',
  },
  {
    auditId: 'locality',
    envKey: 'NEXT_PUBLIC_BUSINESS_REGION',
    label: 'State / region',
    example: D.region,
    defaultValue: D.region,
    priority: 'high',
  },
  {
    auditId: 'locality',
    envKey: 'NEXT_PUBLIC_BUSINESS_NEIGHBORHOOD',
    label: 'Neighborhood label',
    example: D.neighborhood,
    defaultValue: D.neighborhood,
    priority: 'low',
  },
  {
    auditId: 'street',
    envKey: 'NEXT_PUBLIC_BUSINESS_POSTAL',
    label: 'Postal code',
    example: D.postal,
    defaultValue: D.postal,
    priority: 'medium',
  },
  {
    auditId: 'geo',
    envKey: 'NEXT_PUBLIC_BUSINESS_LAT',
    label: 'Latitude',
    example: String(D.lat),
    defaultValue: String(D.lat),
    priority: 'medium',
  },
  {
    auditId: 'geo',
    envKey: 'NEXT_PUBLIC_BUSINESS_LNG',
    label: 'Longitude',
    example: String(D.lng),
    defaultValue: String(D.lng),
    priority: 'medium',
  },
  {
    auditId: 'phone',
    envKey: 'NEXT_PUBLIC_BUSINESS_PHONE',
    label: 'Public phone number',
    example: D.phone,
    defaultValue: D.phone,
    priority: 'medium',
  },
  {
    auditId: 'hours',
    envKey: 'NEXT_PUBLIC_BUSINESS_OPENS',
    label: 'Opens (24h)',
    example: D.opens,
    defaultValue: D.opens,
    priority: 'medium',
  },
  {
    auditId: 'hours',
    envKey: 'NEXT_PUBLIC_BUSINESS_CLOSES',
    label: 'Closes (24h)',
    example: D.closes,
    defaultValue: D.closes,
    priority: 'medium',
  },
] as const;

export function localEnvHintForAudit(auditId: string): LocalEnvField | undefined {
  return LOCAL_ENV_FIELDS.find((field) => field.auditId === auditId);
}

function envLine(field: LocalEnvField, useDefault: boolean): string {
  return `${field.envKey}=${useDefault ? field.defaultValue : ''}`;
}

/** Build a copy-paste .env block for audit items that are not yet configured */
export function buildLocalEnvSnippet(incompleteAuditIds: readonly string[]): string {
  const missing = new Set(incompleteAuditIds);
  const lines: string[] = ['# WoodBine local SEO — add to your deployment environment'];
  const seen = new Set<string>();

  for (const field of LOCAL_ENV_FIELDS) {
    if (!missing.has(field.auditId) || seen.has(field.envKey)) continue;
    seen.add(field.envKey);
    lines.push(envLine(field, true));
  }

  return lines.join('\n');
}

/** Full production template with WoodBine defaults — for setup wizard */
export function buildProductionEnvTemplate(): string {
  const lines = [
    '# WoodBine — local search & structured data (production)',
    '# Verify street address and phone before launch.',
    ...LOCAL_ENV_FIELDS.filter(
      (field, index, arr) => arr.findIndex((f) => f.envKey === field.envKey) === index
    ).map((field) => envLine(field, true)),
  ];
  return lines.join('\n');
}
