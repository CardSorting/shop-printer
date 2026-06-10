const DEV_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const MAX_ATTEMPTS = 5;
const RETRY_MS = 1000;
const TIMEOUT_MS = 5000;

export default async function globalSetup() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(DEV_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (response.status > 0) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
  }

  throw new Error(
    [
      `Dev server not reachable at ${DEV_URL} (timed out after ${TIMEOUT_MS}ms per attempt).`,
      'If port 3000 is stuck, run: npm run cleanup',
      'Then either:',
      '  npm run test:e2e:checkout-smoke   # auto-starts dev with E2E mock checkout',
      'or:',
      '  npm run dev:e2e                 # manual dev with mock checkout button',
      '  npm run test:e2e:checkout-smoke',
    ].join('\n'),
  );
}
