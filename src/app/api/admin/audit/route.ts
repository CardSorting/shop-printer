import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { logger } from '@utils/logger';
import { jsonError, optionalString, parseBoundedLimit, requireAdminSession, requireStepUpAdminSession } from '@infrastructure/server/apiGuards';

export async function GET(request: Request) {
    try {
        await requireAdminSession(request);
        const { searchParams } = new URL(request.url);
        const services = await getServerServices();
        const logs = await services.auditService.getRecentLogs({
            limit: parseBoundedLimit(searchParams.get('limit'), 50, 200),
            query: optionalString(searchParams.get('query'), 'query'),
            action: optionalString(searchParams.get('action'), 'action'),
            targetId: optionalString(searchParams.get('targetId'), 'targetId'),
            userId: optionalString(searchParams.get('userId'), 'userId'),
        });
        return NextResponse.json(logs);
    } catch (error) {
        return jsonError(error, 'Failed to load audit logs');
    }
}

export async function POST(request: Request) {
    try {
        await requireStepUpAdminSession(request);
        const services = await getServerServices();
        
        logger.info('[Forensic] Admin-initiated audit chain verification starting...');
        const result = await services.auditService.verifyChain();
        
        return NextResponse.json(result);
    } catch (error) {
        return jsonError(error, 'Forensic verification failed');
    }
}
