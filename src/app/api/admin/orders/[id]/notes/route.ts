import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { jsonError, readJsonObject, requireAdminSession, requireString } from '@infrastructure/server/apiGuards';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAdminSession(request);
        const { id } = await params;
        const body = await readJsonObject(request);
        const text = requireString(body.text, 'text');

        const services = await getServerServices();
        const note = await services.orderService.addOrderNote(id, text, { id: user.id, email: user.email });
        return NextResponse.json(note);
    } catch (error) {
        return jsonError(error, 'Failed to add order note');
    }
}
