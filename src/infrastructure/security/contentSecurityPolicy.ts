/**
 * Single source of truth for Content-Security-Policy directives.
 * Used by middleware (dynamic nonce) — do not duplicate CSP in next.config.
 */
export function buildContentSecurityPolicy(nonce: string, isDevelopment: boolean): string {
    const scriptSrc = [
        "'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        'https://js.stripe.com',
        ...(isDevelopment ? ["'unsafe-eval'"] : []),
    ];

    const directives: Record<string, string[]> = {
        'default-src': ["'self'"],
        'script-src': scriptSrc,
        // Framer Motion / React inline styles require unsafe-inline for styles.
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': [
            "'self'",
            'blob:',
            'data:',
            'https://firebasestorage.googleapis.com',
            'https://*.stripe.com',
            'https://images.unsplash.com',
            'https://api.dicebear.com',
            'https://ui-avatars.com',
            'https://www.transparenttextures.com',
            'https://m.media-amazon.com',
        ],
        'connect-src': [
            "'self'",
            'https://vitals.vercel-insights.com',
            'https://*.firebaseio.com',
            'wss://*.firebaseio.com',
            'https://*.googleapis.com',
            'https://*.google-analytics.com',
            'https://*.analytics.google.com',
            'https://api.stripe.com',
            'https://woodbine-8c8ee.firebaseapp.com',
            'https://woodbine-8c8ee.firebasestorage.app',
        ],
        'frame-src': ['https://js.stripe.com', 'https://www.openstreetmap.org'],
        'worker-src': ["'self'", 'blob:'],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
    };

    if (!isDevelopment) {
        directives['upgrade-insecure-requests'] = [];
    }

    return Object.entries(directives)
        .map(([key, values]) => (values.length ? `${key} ${values.join(' ')}` : key))
        .join('; ');
}
