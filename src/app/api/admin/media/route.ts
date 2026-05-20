import { NextRequest } from 'next/server';
import { requireAdminSession, jsonError, readJsonObject } from '@infrastructure/server/apiGuards';
import { StorageFolder, StorageService } from '@infrastructure/services/StorageService';
import { DomainError } from '@domain/errors';

export const dynamic = 'force-dynamic';
const PUBLIC_MEDIA_FOLDERS = new Set<StorageFolder>(['products', 'collections', 'general']);

function parseFolder(value: string | null): StorageFolder | undefined {
  if (!value) return undefined;
  if (!PUBLIC_MEDIA_FOLDERS.has(value as StorageFolder)) {
    throw new DomainError('Invalid media folder');
  }
  return value as StorageFolder;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession(request);
    const folder = parseFolder(request.nextUrl.searchParams.get('folder'));
    const limit = Number(request.nextUrl.searchParams.get('limit') ?? 500);
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
      throw new DomainError('limit must be an integer between 1 and 1000');
    }

    const files = await StorageService.listFiles({
      folders: folder ? [folder] : Array.from(PUBLIC_MEDIA_FOLDERS),
      limit,
    });

    return Response.json({ files });
  } catch (error) {
    return jsonError(error, 'Failed to list media');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdminSession(req);
    const body = await readJsonObject(req);
    const storedPath = typeof body.url === 'string' ? body.url : body.path;
    
    if (!storedPath || typeof storedPath !== 'string') throw new DomainError('URL or path required');

    const deletedPath = await StorageService.deleteFileStrict(storedPath);

    return Response.json({ success: true, deletedPath });
  } catch (error) {
    return jsonError(error, 'Failed to delete media');
  }
}
