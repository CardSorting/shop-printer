import type { ShippingRateType } from '@domain/models';
import { DomainError } from '@domain/errors';
import { optionalInteger, optionalString, requireInteger, requireString } from '@infrastructure/server/apiGuards';

const RATE_TYPES = new Set<ShippingRateType>(['flat', 'weight_based', 'price_based']);

export function parseShippingClass(body: Record<string, unknown>) {
    const isDefault = body.isDefault === undefined ? false : body.isDefault;
    if (typeof isDefault !== 'boolean') throw new DomainError('isDefault must be true or false.');

    return {
        id: optionalString(body.id, 'id'),
        name: requireString(body.name, 'name'),
        description: optionalString(body.description, 'description'),
        isDefault,
    };
}

export function parseShippingZone(body: Record<string, unknown>) {
    const countries = body.countries;
    if (!Array.isArray(countries) || countries.length === 0) {
        throw new DomainError('countries must be a non-empty list.');
    }
    const normalizedCountries = countries.map((country, index) => {
        const value = requireString(country, `countries[${index}]`).toUpperCase();
        if (!/^[A-Z]{2}$/.test(value)) throw new DomainError(`countries[${index}] must be an ISO 2-letter country code.`);
        return value;
    });

    return {
        id: optionalString(body.id, 'id'),
        name: requireString(body.name, 'name'),
        countries: [...new Set(normalizedCountries)],
    };
}

export function parseShippingRate(body: Record<string, unknown>) {
    const type = requireString(body.type, 'type') as ShippingRateType;
    if (!RATE_TYPES.has(type)) throw new DomainError('Shipping rate type is invalid.');
    const minLimit = optionalInteger(body.minLimit, 'minLimit');
    const maxLimit = optionalInteger(body.maxLimit, 'maxLimit');
    if (minLimit !== undefined && minLimit < 0) throw new DomainError('minLimit must be non-negative.');
    if (maxLimit !== undefined && maxLimit < 0) throw new DomainError('maxLimit must be non-negative.');
    if (minLimit !== undefined && maxLimit !== undefined && minLimit > maxLimit) {
        throw new DomainError('minLimit cannot be greater than maxLimit.');
    }
    const amount = requireInteger(body.amount, 'amount');
    if (amount < 0) throw new DomainError('amount must be non-negative.');

    return {
        id: optionalString(body.id, 'id'),
        shippingZoneId: requireString(body.shippingZoneId, 'shippingZoneId'),
        shippingClassId: requireString(body.shippingClassId, 'shippingClassId'),
        name: requireString(body.name, 'name'),
        type,
        minLimit,
        maxLimit,
        amount,
        carrier: optionalString(body.carrier, 'carrier'),
        serviceCode: optionalString(body.serviceCode, 'serviceCode'),
    };
}
