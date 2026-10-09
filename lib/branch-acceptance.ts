import type { Supermarket } from './supermarkets';

export const BRANCH_ACCEPTANCE_URL = 'https://pfandfach.vercel.app/api/branch-acceptance';

export type AcceptanceStatus = 'likely_accepted' | 'likely_rejected' | 'unknown';

export interface BranchAcceptance {
    retailer: string;
    name: string;
    address: string | null;
    acceptance: AcceptanceStatus;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isAcceptanceStatus(value: unknown): value is AcceptanceStatus {
    return (
        value === 'likely_accepted' ||
        value === 'likely_rejected' ||
        value === 'unknown'
    );
}

function isBranchAcceptance(value: unknown): value is BranchAcceptance {
    return (
        isRecord(value) &&
        typeof value.retailer === 'string' &&
        typeof value.name === 'string' &&
        (value.address === null || typeof value.address === 'string') &&
        isAcceptanceStatus(value.acceptance)
    );
}

export async function requestBranchAcceptance(
    barcode: string,
    branches: Supermarket[],
): Promise<BranchAcceptance[]> {
    const response = await fetch(BRANCH_ACCEPTANCE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            barcode,
            branches: branches.map((branch) => ({
                id: `${branch.type}/${branch.id}`,
                retailer: branch.chain,
                name: branch.name,
                address: branch.address,
                normalizedAddress: branch.normalizedAddress,
            })),
        }),
    });

    let body: unknown;

    try {
        body = await response.json();
    }
    catch {
        body = null;
    }

    if (!response.ok) {
        const message =
            isRecord(body) && typeof body.error === 'string'
                ? body.error
                : `Vorhersage fehlgeschlagen (${response.status}).`;

        throw new Error(message);
    }

    const acceptances = isRecord(body) ? body.acceptances : undefined;

    if (!Array.isArray(acceptances) || !acceptances.every(isBranchAcceptance)) {
        throw new Error('Ungültige Antwort vom Vorhersageserver.');
    }

    return acceptances;
}

export function parseBranchAcceptances(value: string | undefined): BranchAcceptance[] {
    if (!value) {
        return [];
    }

    try {
        const parsed: unknown = JSON.parse(value);

        return Array.isArray(parsed) && parsed.every(isBranchAcceptance)
            ? parsed
            : [];
    }
    catch {
        return [];
    }
}
