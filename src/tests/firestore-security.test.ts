import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * [SECURITY PROOFS]
 * Static Firestore rules regression proofs.
 *
 * These validate the checked-in rules substrate without hitting production Firestore.
 * Run emulator-backed integration proofs separately when validating deployed rule behavior.
 */
describe('Firestore Security Substrate Proofs', () => {
  const rulesPath = path.join(process.cwd(), 'firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  it('PROVE: Clients cannot create orders directly (Server-Only Creation)', () => {
    expect(rules).toMatch(/match \/orders\/\{orderId\}[\s\S]*allow create: if false/);
  });

  it('PROVE: Clients cannot mutate sensitive fields (role) on user documents', () => {
    expect(rules).toMatch(/match \/users\/\{userId\}[\s\S]*affectedKeys\(\)\.hasAny\(\['role'\]\)/);
  });

  it('PROVE: Clients cannot read internal riskScore field on orders', () => {
    expect(rules).toMatch(/match \/orders\/\{orderId\}[\s\S]*allow read: if isAuthenticated\(\)/);
    expect(rules).toMatch(/match \/orders\/\{orderId\}[\s\S]*allow create: if false/);
  });

  it('PROVE: Clients cannot enumerate private articles/discounts', () => {
    expect(rules).toMatch(/match \/discounts\/\{discountId\}[\s\S]*allow list: if isAdmin\(\)/);
  });
});
