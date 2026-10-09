import { isRecord, jsonResponse, optionsResponse } from '../lib/supabase';

const MAX_BODY_LENGTH = 200_000;

// Stub: no acceptance model yet, so every branch reports "unknown".
export default {
    async fetch(request: Request): Promise<Response> {
        if (request.method === 'OPTIONS') {
            return optionsResponse();
        }

        if (request.method !== 'POST') {
            return jsonResponse({ error: 'Method not allowed' }, 405);
        }

        const contentLength = Number(request.headers.get('content-length') || 0);
        if (contentLength > MAX_BODY_LENGTH) {
            return jsonResponse({ error: 'Anfrage ist zu groß.' }, 413);
        }

        let input: unknown;

        try {
            input = await request.json();
        }
        catch {
            return jsonResponse({ error: 'Ungültige Anfrage.' }, 400);
        }

        if (
            !isRecord(input) ||
            typeof input.barcode !== 'string' ||
            !Array.isArray(input.branches)
        ) {
            return jsonResponse({ error: 'Ungültige Anfrage.' }, 400);
        }

        const acceptances = input.branches.filter(isRecord).map((branch) => ({
            retailer: typeof branch.retailer === 'string' ? branch.retailer : 'unbekannt',
            name: typeof branch.name === 'string' ? branch.name : 'Unbekannt',
            address: typeof branch.address === 'string' ? branch.address : null,
            acceptance: 'unknown',
        }));

        return jsonResponse({ acceptances });
    },
};
