import { NextResponse } from 'next/server';
import { getAppSeoEngine } from '@infrastructure/seo';
import { jsonError, readJsonObject, requireAdminSession, requireString } from '@infrastructure/server/apiGuards';

/** Live listing audit for product/blog editors — Yoast real-time pattern */
export async function POST(req: Request) {
  try {
    await requireAdminSession(req);
    const body = await readJsonObject(req);
    const kind = (body.kind as string) || 'product';
    const validKind = ['product', 'blog', 'collection', 'homepage'].includes(kind) ? kind : 'product';

    const input = {
      name: requireString(body.name, 'name'),
      description: typeof body.description === 'string' ? body.description : undefined,
      seoTitle: typeof body.seoTitle === 'string' ? body.seoTitle : typeof body.metaTitle === 'string' ? body.metaTitle : undefined,
      seoDescription:
        typeof body.seoDescription === 'string'
          ? body.seoDescription
          : typeof body.metaDescription === 'string'
            ? body.metaDescription
            : undefined,
      handle: typeof body.handle === 'string' ? body.handle : typeof body.slug === 'string' ? body.slug : undefined,
      imageUrl: typeof body.imageUrl === 'string' ? body.imageUrl : undefined,
    };

    const seo = getAppSeoEngine();
    const result = seo.adminReport.auditListingForKind(input, validKind as 'product' | 'blog' | 'collection' | 'homepage');

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error, 'Failed to audit listing');
  }
}
