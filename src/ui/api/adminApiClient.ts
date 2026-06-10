const DATE_FIELD_KEYS = new Set([
  'createdAt',
  'updatedAt',
  'publishedAt',
  'scheduledAt',
  'subscribedAt',
  'joined',
  'lastOrder',
  'startsAt',
  'endsAt',
  'expectedAt',
  'estimatedDeliveryDate',
  'at',
  'occurredAt',
]);

export class AdminApiError extends Error {
  readonly code?: string;
  readonly retryable?: boolean;
  readonly status?: number;

  constructor(message: string, options?: { code?: string; retryable?: boolean; status?: number }) {
    super(message);
    this.name = 'AdminApiError';
    this.code = options?.code;
    this.retryable = options?.retryable;
    this.status = options?.status;
  }
}

export function formatAdminApiError(error: unknown): string {
  if (error instanceof AdminApiError) {
    return error.retryable ? `${error.message} Try again shortly.` : error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Request failed';
}

function reviveDates(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reviveDates);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = DATE_FIELD_KEYS.has(key) && typeof val === 'string' ? new Date(val) : reviveDates(val);
    }
    return out;
  }
  return value;
}

export async function adminApiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    if (!response.ok) {
      throw new AdminApiError(`Request failed (${response.status})`, { status: response.status });
    }
    return (await response.text()) as T;
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const payload = data && typeof data === 'object' ? data as Record<string, unknown> : null;
    throw new AdminApiError(
      typeof payload?.error === 'string' ? payload.error : `Request failed (${response.status})`,
      {
        code: typeof payload?.code === 'string' ? payload.code : undefined,
        retryable: payload?.retryable === true,
        status: response.status,
      },
    );
  }

  return reviveDates(data) as T;
}
