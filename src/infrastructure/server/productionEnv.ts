export const DEV_SESSION_SECRET_PLACEHOLDER = 'change_this_to_a_secure_32_character_string';

export type EnvIssue = {
  variable: string;
  message: string;
  severity: 'required' | 'recommended';
};

export type EnvValidationResult = {
  ok: boolean;
  issues: EnvIssue[];
};

function envValue(name: string): string | undefined {
  const value = process.env[name]?.trim();
  if (!value || value === 'undefined') return undefined;
  return value;
}

export function validateProductionEnv(options?: { productionOnly?: boolean }): EnvValidationResult {
  const strict = options?.productionOnly ?? process.env.NODE_ENV === 'production';
  if (!strict) {
    return { ok: true, issues: [] };
  }

  const issues: EnvIssue[] = [];

  const requiredVars = [
    'SESSION_SECRET',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_SITE_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'SYSTEM_JOB_TOKEN',
  ] as const;

  for (const variable of requiredVars) {
    if (!envValue(variable)) {
      issues.push({ variable, message: 'Required in production', severity: 'required' });
    }
  }

  if (!envValue('FIREBASE_SERVICE_ACCOUNT_JSON')) {
    issues.push({
      variable: 'FIREBASE_SERVICE_ACCOUNT_JSON',
      message: 'Required in production unless ADC is guaranteed on the host',
      severity: 'required',
    });
  }

  const sessionSecret = envValue('SESSION_SECRET');
  if (sessionSecret && (sessionSecret.length < 32 || sessionSecret === DEV_SESSION_SECRET_PLACEHOLDER)) {
    issues.push({
      variable: 'SESSION_SECRET',
      message: 'Must be at least 32 characters and not the dev placeholder',
      severity: 'required',
    });
  }

  const stripeSecret = envValue('STRIPE_SECRET_KEY');
  if (stripeSecret && !stripeSecret.startsWith('sk_')) {
    issues.push({
      variable: 'STRIPE_SECRET_KEY',
      message: 'Invalid format (expected sk_ prefix)',
      severity: 'required',
    });
  }

  const webhookSecret = envValue('STRIPE_WEBHOOK_SECRET');
  if (webhookSecret && !webhookSecret.startsWith('whsec_')) {
    issues.push({
      variable: 'STRIPE_WEBHOOK_SECRET',
      message: 'Invalid format (expected whsec_ prefix)',
      severity: 'required',
    });
  }

  const systemJobToken = envValue('SYSTEM_JOB_TOKEN');
  if (systemJobToken && systemJobToken.length < 32) {
    issues.push({
      variable: 'SYSTEM_JOB_TOKEN',
      message: 'Must be at least 32 characters',
      severity: 'required',
    });
  }

  if (process.env.ALLOW_PRODUCTION_SEEDING === 'true') {
    issues.push({
      variable: 'ALLOW_PRODUCTION_SEEDING',
      message: 'Must be false in production',
      severity: 'required',
    });
  }

  return {
    ok: issues.filter((issue) => issue.severity === 'required').length === 0,
    issues,
  };
}

export class ProductionNotReadyError extends Error {
  readonly validation: EnvValidationResult;

  constructor(validation: EnvValidationResult) {
    super('Production environment is not ready');
    this.name = 'ProductionNotReadyError';
    this.validation = validation;
  }
}

export function assertProductionReadiness(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const validation = validateProductionEnv({ productionOnly: true });
  if (!validation.ok) {
    throw new ProductionNotReadyError(validation);
  }
}
