import {
    jsonResponse,
    optionsResponse,
    supabaseRequest,
} from '../lib/supabase';

export default {
    async fetch(request: Request): Promise<Response> {
        if (request.method === 'OPTIONS') {
            return optionsResponse();
        }

        if (request.method !== 'GET') {
            return jsonResponse({ error: 'Method not allowed' }, 405);
        }

        try {
            const response = await supabaseRequest(
                'branches?select=id,retailer,normalized_address&order=retailer.asc,normalized_address.asc',
                { method: 'GET' },
            );

            if (!response.ok) {
                console.error('[PFAND_BRANCHES]', response.status);
                return jsonResponse(
                    { error: 'Filialen konnten nicht geladen werden.' },
                    502,
                );
            }

            const branches: unknown = await response.json();
            return jsonResponse(branches);
        } catch (error) {
            console.error(
                '[PFAND_BRANCHES]',
                error instanceof Error ? error.message : 'Unknown error',
            );
            return jsonResponse(
                { error: 'Filialen konnten nicht geladen werden.' },
                502,
            );
        }
    },
};
