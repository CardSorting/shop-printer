import type { NextConfig } from 'next';

const isDevelopment = process.env.NODE_ENV !== 'production';

const nextConfig: NextConfig = {
    cleanDistDir: true,
    reactStrictMode: true,
    poweredByHeader: false,
    typescript: {
        // Typecheck via `npm run typecheck` — avoids a second full-project tsc pass during deploy.
        ignoreBuildErrors: true,
    },
    eslint: {
        // Lint via `npm run lint` — skipping here speeds prod builds and deploys.
        ignoreDuringBuilds: true,
    },

    // Keep heavy server-only deps out of the SSR bundle (smaller deploy, faster cold starts).
    serverExternalPackages: [
        'firebase-admin',
        '@google-cloud/vertexai',
        '@google/generative-ai',
        '@getbrevo/brevo',
        'sharp',
        'stripe',
    ],

    // Speed up "Collecting build traces" — exclude static media and dev tooling from SSR trace.
    outputFileTracingExcludes: {
        '*': [
            './public/videos/**',
            './public/images/landing/counters/**',
            './public/assets/generated/**',
            './node_modules/@swc/**',
            './node_modules/webpack/**',
            './node_modules/esbuild/**',
            './node_modules/terser/**',
        ],
    },

    experimental: {
        optimizePackageImports: [
            'lucide-react',
            'date-fns',
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage',
            '@stripe/stripe-js',
            '@stripe/react-stripe-js',
        ],
    },
    compiler: {
        removeConsole: !isDevelopment,
    },
    images: {
        formats: ['image/avif', 'image/webp'],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 'firebasestorage.googleapis.com',
            },
            {
                protocol: 'https',
                hostname: 'www.transparenttextures.com',
            },
            {
                protocol: 'https',
                hostname: 'm.media-amazon.com',
            },
            {
                protocol: 'https',
                hostname: 'api.dicebear.com',
            },
            {
                protocol: 'https',
                hostname: 'ui-avatars.com',
            }
        ],
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    ...(isDevelopment
                        ? []
                        : [
                              {
                                  key: 'Strict-Transport-Security',
                                  value: 'max-age=31536000; includeSubDomains; preload',
                              },
                          ]),
                ],
            },
        ];
    },
    webpack: (config, { dev }) => {
        // Keep webpack cache for fast rebuilds; disable only on Firebase deploy to avoid shipping cache.
        if (!dev && process.env.FIREBASE_DEPLOY === '1') {
            config.cache = false;
        }
        config.ignoreWarnings = [
            { module: /@protobufjs\/inquire/ },
            { module: /protobufjs/ }
        ];
        return config;
    },
};

export default nextConfig;
