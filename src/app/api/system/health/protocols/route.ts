import { NextResponse } from 'next/server';
import { getInitialServices } from '@core/container';
import { jsonError } from '@infrastructure/server/apiGuards';
import {
  ProductionNotReadyError,
  validateProductionEnv,
} from '@infrastructure/server/productionEnv';
import { runProtocolHealthChecks } from '@infrastructure/server/protocolHealth';
import { FirestoreCommerceEventStore } from '@infrastructure/commerce/FirestoreCommerceEventStore';

export async function GET() {
  try {
    const envValidation = validateProductionEnv();
    if (process.env.NODE_ENV === 'production' && !envValidation.ok) {
      return NextResponse.json(
        {
          ok: false,
          checks: {},
          env: {
            ok: false,
            issueCount: envValidation.issues.length,
          },
          issues: envValidation.issues.map((issue) => ({
            variable: issue.variable,
            message: issue.message,
            severity: issue.severity,
          })),
        },
        { status: 503 },
      );
    }

    const services = getInitialServices();
    const report = await runProtocolHealthChecks({
      checkout: services.checkout,
      refunds: services.refunds,
      inventory: services.inventory,
      admin: services.admin,
      crm: services.crm,
      support: services.support,
      commerceEventStore: new FirestoreCommerceEventStore(),
    });

    return NextResponse.json(report, { status: report.ok ? 200 : 503 });
  } catch (error) {
    if (error instanceof ProductionNotReadyError) {
      return NextResponse.json(
        {
          ok: false,
          checks: {},
          env: {
            ok: false,
            issueCount: error.validation.issues.length,
          },
          issues: error.validation.issues.map((issue) => ({
            variable: issue.variable,
            message: issue.message,
            severity: issue.severity,
          })),
        },
        { status: 503 },
      );
    }
    return jsonError(error, 'Protocol health check failed');
  }
}
