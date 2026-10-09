import * as Crypto from 'expo-crypto';
import type { Supermarket } from './supermarkets';

export const RETURN_REPORTS_URL = 'https://pfandfach.vercel.app/api/return-reports';

export async function submitAcceptedReport(barcode: string, branch: Supermarket): Promise<void> {
    if (branch.address === null) {
        throw new Error('Für diese Filiale ist keine Adresse bekannt.');
    }

    const response = await fetch(RETURN_REPORTS_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            requestId: Crypto.randomUUID(),
            barcode,
            retailer: branch.chain,
            address: branch.address,
            outcome: 'accepted',
        }),
    });

    if (!response.ok) {
        throw new Error(`Meldung konnte nicht gespeichert werden (HTTP ${response.status}).`);
    }
}
