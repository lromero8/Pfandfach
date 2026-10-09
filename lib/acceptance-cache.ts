import { requestBranchAcceptance, type BranchAcceptance } from './branch-acceptance';
import type { Supermarket } from './supermarkets';

const cache = new Map<string, Promise<BranchAcceptance[]>>();

export function loadAcceptance(barcode: string, branches: Supermarket[]): Promise<BranchAcceptance[]> {
    const cached = cache.get(barcode);

    if (cached) return cached;

    const request = requestBranchAcceptance(barcode, branches);

    cache.set(barcode, request);
    request.catch(() => {
        cache.delete(barcode);
    });

    return request;
}

export function forgetAcceptance(barcode: string): void {
    cache.delete(barcode);
}
