import {
    isRecord,
    isRetailer,
    jsonResponse,
    normalizeAddress,
    optionsResponse,
    supabaseRequest,
} from '../lib/supabase';

const MAX_BODY_LENGTH = 200_000;
const MAX_BRANCHES = 20;

type Outcome = 'accepted' | 'rejected';
type AcceptanceStatus = 'likely_accepted' | 'likely_rejected' | 'unknown';

function isBarcode(value: string): boolean {
    return /^[0-9]{8,14}$/.test(value);
}

function branchKey(retailer: unknown, address: unknown): string | null {
    if (typeof retailer !== 'string' || typeof address !== 'string') {
        return null;
    }

    const normalizedRetailer = retailer.trim().toLowerCase();
    const normalizedAddress = normalizeAddress(address);

    if (!isRetailer(normalizedRetailer) || normalizedAddress.length < 5) {
        return null;
    }

    return `${normalizedRetailer}|${normalizedAddress}`;
}

function statusFor(outcome: Outcome | undefined): AcceptanceStatus {
    if (outcome === 'accepted') return 'likely_accepted';
    if (outcome === 'rejected') return 'likely_rejected';
    return 'unknown';
}

// The latest report per branch decides.
async function latestOutcomesByBranchKey(barcode: string): Promise<Map<string, Outcome>> {
    const reportResponse = await supabaseRequest(
        `return_reports?barcode=eq.${barcode}&select=branch_id,outcome&order=observed_at.desc&limit=500`,
        { method: 'GET' },
    );

    if (!reportResponse.ok) {
        throw new Error(`Meldungen konnten nicht geladen werden (${reportResponse.status}).`);
    }

    const reports: unknown = await reportResponse.json();

    if (!Array.isArray(reports)) {
        throw new Error('Ungültige Antwort von Supabase.');
    }

    const latestByBranchId = new Map<string, Outcome>();

    for (const report of reports) {
        if (!isRecord(report)) continue;

        const branchId = report.branch_id;
        const outcome = report.outcome;

        if (typeof branchId !== 'string') continue;
        if (outcome !== 'accepted' && outcome !== 'rejected') continue;
        if (!latestByBranchId.has(branchId)) latestByBranchId.set(branchId, outcome);
    }

    if (latestByBranchId.size === 0) {
        return new Map();
    }

    const branchResponse = await supabaseRequest(
        `branches?id=in.(${[...latestByBranchId.keys()].join(',')})&select=id,retailer,normalized_address`,
        { method: 'GET' },
    );

    if (!branchResponse.ok) {
        throw new Error(`Filialen konnten nicht geladen werden (${branchResponse.status}).`);
    }

    const branchRows: unknown = await branchResponse.json();

    if (!Array.isArray(branchRows)) {
        throw new Error('Ungültige Antwort von Supabase.');
    }

    const outcomeByKey = new Map<string, Outcome>();

    for (const row of branchRows) {
        if (!isRecord(row)) continue;

        const id = row.id;
        const retailer = row.retailer;
        const normalizedAddress = row.normalized_address;

        if (
            typeof id !== 'string' ||
            typeof retailer !== 'string' ||
            typeof normalizedAddress !== 'string'
        ) {
            continue;
        }

        const outcome = latestByBranchId.get(id);

        if (outcome) outcomeByKey.set(`${retailer}|${normalizedAddress}`, outcome);
    }

    return outcomeByKey;
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
            !Array.isArray(input.branches) ||
            input.branches.length > MAX_BRANCHES
        ) {
            return jsonResponse({ error: 'Ungültige Anfrage.' }, 400);
        }

        const barcode = typeof input.barcode === 'string' ? input.barcode.trim() : '';

        if (!isBarcode(barcode)) {
            return jsonResponse({ error: 'Ungültige Anfrage.' }, 400);
        }

        const branches = input.branches.filter(isRecord).map((branch) => ({
            retailer: typeof branch.retailer === 'string' ? branch.retailer : 'unbekannt',
            name: typeof branch.name === 'string' ? branch.name : 'Unbekannt',
            address: typeof branch.address === 'string' ? branch.address : null,
            key: branchKey(branch.retailer, branch.address),
        }));

        try {
            const outcomes = await latestOutcomesByBranchKey(barcode);

            const acceptances = branches.map((branch) => ({
                retailer: branch.retailer,
                name: branch.name,
                address: branch.address,
                acceptance: branch.key ? statusFor(outcomes.get(branch.key)) : 'unknown',
            }));

            return jsonResponse({ acceptances });
        }
        catch (error) {
            console.error(
                '[PFAND_BRANCH_ACCEPTANCE]',
                error instanceof Error ? error.message : 'Unknown error',
            );
            return jsonResponse({ error: 'Filialen konnten nicht geprüft werden.' }, 502);
        }
    },
};
