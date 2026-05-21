# Troubleshooting

## Firebase or Firestore credentials are missing

Observed failure mode: API routes that touch repositories fail during Firebase Admin initialization or Firestore access.

Check:

- Firebase project variables are present in `.env`.
- Server-side Firebase Admin credentials are configured for the current environment.
- Firestore is enabled for the selected project.
- Local seed/setup commands are not pointed at production unless explicitly intended.

Recovery depends on the environment. For local work, verify `.env` first, then rerun:

```bash
npm run build
```

## Dependency/runtime mismatch after Node changes

Observed failure mode: packages compiled or installed under a different Node runtime behave inconsistently.

Recovery:

```bash
npm install
npm run build
```

## Production session errors

`src/infrastructure/server/session.ts` requires `SESSION_SECRET` with at least 32 characters in production. If missing or short, signing/verifying sessions throws.

Recovery:

```bash
SESSION_SECRET='replace-with-at-least-32-random-characters' npm run build
```

For real deployments, configure the secret in the hosting environment rather than shell history.

## Cart/order returns unauthorized

Customer cart/order routes now derive identity from the signed HTTP-only session. Do not pass `userId` in query/body and expect authorization.

Check:
- User has signed in via `/api/auth/sign-in`.
- Browser is retaining the `pm_tcg_session` cookie.
- `SESSION_SECRET` did not rotate unexpectedly between sign-in and API calls.

## Admin product/order mutation returns forbidden

Admin routes call `requireAdminSession()`. The signed session must contain a Domain `User` whose `role` is `admin`.

Check:
- Auth adapter returns `role: 'admin'` for the signed-in user.
- The cookie is signed by the current `SESSION_SECRET`.
- The route has not bypassed centralized guards.

## ESLint scans generated Next output

`eslint.config.js` intentionally ignores `dist`, `.next`, `DreamBees-tcg/.next`, and `next-env.d.ts`. If generated output appears under another nested path, add that generated path to `globalIgnores` rather than editing generated files.

## Tailwind utilities absent in build

Tailwind v4 is configured through `postcss.config.mjs` with `@tailwindcss/postcss`; `tailwind.config.ts` scans `src/app`, `src/ui`, and `src/core`.

Check:

```bash
npm run build
```

Then inspect served pages for generated CSS links and expected utility classes.
