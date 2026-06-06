import { NextResponse } from 'next/server';
import { getInitialServices } from '@core/container';
import { jsonError, readJsonObject, requireAdminSession, requireString } from '@infrastructure/server/apiGuards';
import type { KnowledgebaseCategory } from '@domain/models';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export async function POST(req: Request) {
  try {
    await requireAdminSession(req);
    const services = getInitialServices();
    const body = await readJsonObject(req);

    const name = requireString(body.name, 'name');
    const slug = slugify(requireString(body.slug ?? name, 'slug'));
    const description = typeof body.description === 'string' ? body.description.trim() : '';

    const category: KnowledgebaseCategory = {
      id: requireString(body.id, 'id'),
      name,
      slug,
      description,
      icon: typeof body.icon === 'string' ? body.icon : undefined,
      articleCount: typeof body.articleCount === 'number' ? body.articleCount : 0,
    };

    await services.knowledgebaseRepository.saveCategory(category);
    return NextResponse.json(category);
  } catch (err) {
    return jsonError(err, 'Failed to save help category');
  }
}
