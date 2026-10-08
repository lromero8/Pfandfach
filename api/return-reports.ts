import {
    isRecord,
    isRetailer,
    jsonResponse,
    normalizeAddress,
    optionsResponse,
    supabaseRequest,
} from '../lib/supabase';

function isUuid(value: unknown): value is string {
    return (
        typeof value === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            value,
        )
    );
}

export default {
    async fetch(request: Request): Promise<Response> {
        if (request.method === 'OPTIONS') {
            return optionsResponse();
        }

        if (request.method !== 'POST') {
            return jsonResponse({ error: 'Method not allowed' }, 405);
        }

        const contentLength = Number(request.headers.get('content-length') || 0);
        if (contentLength > 10_000) {
            return jsonResponse({ error: 'Anfrage ist zu groß.' }, 413);
        }

        let input: unknown;

        try {
            input = await request.json();
        } catch {
            return jsonResponse({ error: 'Ungültige Anfrage.' }, 400);
        }

        if (!isRecord(input)) {
            return jsonResponse({ error: 'Ungültige Anfrage.' }, 400);
        }

        const retailerInput =
            typeof input.retailer === 'string'
                ? input.retailer.trim().toLowerCase()
                : '';
        const address =
            typeof input.address === 'string' ? input.address.trim() : '';
        const normalizedAddress = normalizeAddress(address);
        const barcode =
            typeof input.barcode === 'string' ? input.barcode.trim() : '';
        const outcome = input.outcome;
        const requestId = input.requestId;

        if (
            !isUuid(requestId) ||
            !isRetailer(retailerInput) ||
            address.length < 5 ||
            address.length > 240 ||
            normalizedAddress.length < 5 ||
            !/^[0-9]{8,14}$/.test(barcode) ||
            (outcome !== 'accepted' && outcome !== 'rejected')
        ) {
            return jsonResponse({ error: 'Ungültige Meldedaten.' }, 400);
        }

        let observedAt = new Date().toISOString();

        if (input.observedAt !== undefined) {
            if (
                typeof input.observedAt !== 'string' ||
                !Number.isFinite(Date.parse(input.observedAt))
            ) {
                return jsonResponse(
                    { error: 'Ungültiger Beobachtungszeitpunkt.' },
                    400,
                );
            }

            observedAt = new Date(input.observedAt).toISOString();
        }

        try {
            const branchResponse = await supabaseRequest(
                'branches?on_conflict=retailer,normalized_address&select=id',
                {
                    method: 'POST',
                    body: {
                        retailer: retailerInput,
                        normalized_address: normalizedAddress,
                    },
                    prefer: 'resolution=merge-duplicates,return=representation',
                },
            );

            if (!branchResponse.ok) {
                console.error('[PFAND_BRANCH_UPSERT]', branchResponse.status);
                return jsonResponse(
                    { error: 'Filiale konnte nicht gespeichert werden.' },
                    502,
                );
            }

            const branchRows: unknown = await branchResponse.json();
            const branch =
                Array.isArray(branchRows) && branchRows.length > 0
                    ? branchRows[0]
                    : null;

            if (!isRecord(branch) || typeof branch.id !== 'string') {
                return jsonResponse(
                    { error: 'Filiale konnte nicht gespeichert werden.' },
                    502,
                );
            }

            const reportResponse = await supabaseRequest(
                'return_reports?on_conflict=request_id&select=id',
                {
                    method: 'POST',
                    body: {
                        request_id: requestId,
                        barcode,
                        branch_id: branch.id,
                        outcome,
                        observed_at: observedAt,
                    },
                    prefer: 'resolution=ignore-duplicates,return=representation',
                },
            );

            if (!reportResponse.ok) {
                console.error('[PFAND_REPORT_INSERT]', reportResponse.status);
                return jsonResponse(
                    { error: 'Meldung konnte nicht gespeichert werden.' },
                    502,
                );
            }

            const reportRows: unknown = await reportResponse.json();
            const report =
                Array.isArray(reportRows) && reportRows.length > 0
                    ? reportRows[0]
                    : null;

            return jsonResponse({
                saved: true,
                duplicate: report === null,
                reportId:
                    isRecord(report) && typeof report.id === 'string'
                        ? report.id
                        : null,
            });
        } catch (error) {
            console.error(
                '[PFAND_REPORT]',
                error instanceof Error ? error.message : 'Unknown error',
            );
            return jsonResponse(
                { error: 'Meldung konnte nicht gespeichert werden.' },
                502,
            );
        }
    },
};
