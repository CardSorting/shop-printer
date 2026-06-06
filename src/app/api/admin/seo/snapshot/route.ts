import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { jsonError, requireAdminSession } from '@infrastructure/server/apiGuards';
import { loadAdminSeoBundle } from '@core/seo/loadAdminSeoBundle';

export async function GET(req: Request) {
  try {
    await requireAdminSession(req);
    const services = await getServerServices();
    const bundle = await loadAdminSeoBundle(services);

    return NextResponse.json({
      site: bundle.audit,
      snapshot: bundle.snapshot,
      report: bundle.report,
      siteHost: bundle.siteHost,
      homepagePreview: bundle.homepagePreview,
    });
  } catch (error) {
    return jsonError(error, 'Failed to load SEO snapshot');
  }
}
