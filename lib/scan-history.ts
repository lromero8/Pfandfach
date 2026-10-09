import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ScanHistoryItem {
    barcode: string;
    productName: string;
    brand: string;
    imageUrl?: string | null;
    scannedAt: number;
}

const HISTORY_KEY = 'scan-history';
const HISTORY_MAX_ITEMS = 20;

function isScanHistoryItem(value: unknown): value is ScanHistoryItem {
    return (
        typeof value === 'object' && value !== null
        && 'barcode' in value && typeof value.barcode === 'string'
        && 'productName' in value && typeof value.productName === 'string'
        && 'brand' in value && typeof value.brand === 'string'
        && (!('imageUrl' in value) || value.imageUrl === null || typeof value.imageUrl === 'string')
        && 'scannedAt' in value && typeof value.scannedAt === 'number'
    );
}

export async function readScanHistory(): Promise<ScanHistoryItem[]> {
    try {
        const raw = await AsyncStorage.getItem(HISTORY_KEY);
        const parsed: unknown = raw === null ? [] : JSON.parse(raw);

        return Array.isArray(parsed) ? parsed.filter(isScanHistoryItem) : [];
    }
    catch {
        return [];
    }
}

export async function addScanToHistory(item: ScanHistoryItem): Promise<void> {
    try {
        const history = await readScanHistory();
        const next = [item, ...history.filter((entry) => entry.barcode !== item.barcode)]
            .slice(0, HISTORY_MAX_ITEMS);

        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    }
    catch {
        // History is best-effort and must not block the scan.
    }
}
