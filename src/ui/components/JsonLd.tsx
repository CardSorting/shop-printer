import { headers } from 'next/headers';

type JsonLdProps = {
    data: Record<string, unknown> | Record<string, unknown>[];
    /** Prefer passing nonce from layout/page to avoid hydration drift */
    nonce?: string;
};

/** CSP-safe JSON-LD script tag (uses request nonce from middleware). */
export async function JsonLd({ data, nonce: nonceProp }: JsonLdProps) {
    const nonce = nonceProp ?? (await headers()).get('x-nonce') ?? undefined;

    return (
        <script
            type="application/ld+json"
            {...(nonce ? { nonce } : {})}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
    );
}
