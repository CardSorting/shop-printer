import { getServerServices } from '@infrastructure/server/services';
import { jsonError, requireAdminSession, readJsonObject } from '@infrastructure/server/apiGuards';
import { parseDiscountDraft } from './parsers';

export async function GET(request: Request) {
    try {
        await requireAdminSession(request);
        const services = await getServerServices();
        const discounts = await services.discountService.getAllDiscounts();
        return Response.json(discounts);
    } catch (error) {
        return jsonError(error, 'Failed to fetch discounts');
    }
}

export async function POST(request: Request) {
    try {
        const user = await requireAdminSession(request);
        const data = parseDiscountDraft(await readJsonObject(request));
        const services = await getServerServices();

        const discount = await services.discountService.createDiscount(data, { id: user.id, email: user.email });
        return Response.json(discount);
    } catch (error) {
        return jsonError(error, 'Failed to create discount');
    }
}
