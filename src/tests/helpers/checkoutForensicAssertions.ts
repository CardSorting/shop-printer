import { expect } from 'vitest';

export function expectFencingConflictDiagnostics(correlation: {
  fencingTokenMatches: boolean | null;
  stateAlignment: string;
  diagnoses: string[];
}) {
  expect(correlation.fencingTokenMatches).toBe(false);
  expect(correlation.stateAlignment).toBe('reconciliation_required');
  expect(correlation.diagnoses.some(d => d.includes('CONFLICT: Fencing token mismatch'))).toBe(true);
}

export function expectTimelineRenderedForOperators(markdown: string) {
  expect(markdown).toContain('### Checkout Transition Timeline Stream');
  expect(markdown).toContain('| Timestamp | Actor / Auth | Workflow Transition | Status Change | Reason |');
}
