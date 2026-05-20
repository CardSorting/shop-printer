import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { jsonError, requireStepUpAdminSession } from '@infrastructure/server/apiGuards';
import { logger } from '@utils/logger';

async function verify(request: Request) {
    try {
        const user = await requireStepUpAdminSession(request);
        const services = await getServerServices();

        logger.info('[Forensic] Step-up admin audit chain verification starting...', { userId: user.id });
        const result = await services.auditService.verifyChain();

        return NextResponse.json(result);
    } catch (error) {
        return jsonError(error, 'Forensic verification failed');
    }
}

export async function GET(request: Request) {
    return verify(request);
}

export async function POST(request: Request) {
    return verify(request);
}
