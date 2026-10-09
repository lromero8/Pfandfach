import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { getCurrentCoordinates } from './location';
import {
    distanceInMeters,
    findNearbySupermarkets,
    type Coordinates,
    type Supermarket,
} from './supermarkets';

type BranchStatus = 'loading' | 'ready' | 'error';

interface NearbyBranchesValue {
    status: BranchStatus;
    branches: Supermarket[];
    message: string | null;
    waitForBranches: () => Promise<Supermarket[]>;
};

interface LoadResult {
    status: 'ready' | 'error';
    branches: Supermarket[];
    message: string | null;
};

const NearbyBranchesContext = createContext<NearbyBranchesValue | null>(null);

const CACHE_KEY = 'nearby-branches';
// 7 days
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_REUSE_METERS = 300;

interface CachedBranches extends Coordinates {
    savedAt: number;
    branches: Supermarket[];
}

function isCachedBranches(value: unknown): value is CachedBranches {
    return typeof value === 'object' && value !== null
        && 'latitude' in value && typeof value.latitude === 'number'
        && 'longitude' in value && typeof value.longitude === 'number'
        && 'savedAt' in value && typeof value.savedAt === 'number'
        && 'branches' in value && Array.isArray(value.branches);
}

async function readCachedBranches(coordinates: Coordinates): Promise<Supermarket[] | null> {
    try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        const cached: unknown = raw === null ? null : JSON.parse(raw);

        if (!isCachedBranches(cached)) return null;

        const isFresh = Date.now() - cached.savedAt < CACHE_MAX_AGE_MS;
        const isNearby = distanceInMeters(coordinates, cached) < CACHE_REUSE_METERS;

        return isFresh && isNearby ? cached.branches : null;
    }
    catch {
        return null;
    }
}

async function loadNearbyBranches(): Promise<LoadResult> {
    try {
        const coordinates = await getCurrentCoordinates();
        const cached = await readCachedBranches(coordinates);

        if (cached) return { status: 'ready', branches: cached, message: null };

        const branches = await findNearbySupermarkets(coordinates.latitude, coordinates.longitude);
        await AsyncStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ ...coordinates, savedAt: Date.now(), branches }),
        );

        return { status: 'ready', branches, message: null };
    }
    catch (error) {
        return {
            status: 'error',
            branches: [],
            message:
                error instanceof Error
                    ? error.message
                    : 'Supermärkte konnten nicht geladen werden.',
        };
    }
}

export function NearbyBranchesProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<BranchStatus>('loading');
    const [branches, setBranches] = useState<Supermarket[]>([]);
    const [message, setMessage] = useState<string | null>(null);
    const pendingLoad = useRef<Promise<LoadResult>>(
        Promise.resolve({ status: 'ready', branches: [], message: null }),
    );

    useEffect(() => {
        pendingLoad.current = loadNearbyBranches().then((result) => {
            setStatus(result.status);
            setBranches(result.branches);
            setMessage(result.message);

            return result;
        });
    }, []);

    const waitForBranches = useCallback(async () => {
        const result = await pendingLoad.current;

        if (result.status === 'error') {
            throw new Error(result.message ?? 'Supermärkte konnten nicht geladen werden.');
        }

        return result.branches;
    }, []);

    const value = useMemo(
        () => ({ status, branches, message, waitForBranches }),
        [status, branches, message, waitForBranches],
    );

    return (
        <NearbyBranchesContext.Provider value={value}>
            {children}
        </NearbyBranchesContext.Provider>
    );
}

export function useNearbyBranches() {
    const value = useContext(NearbyBranchesContext);

    if (!value) {
        throw new Error('useNearbyBranches must be used inside NearbyBranchesProvider.');
    }

    return value;
}
