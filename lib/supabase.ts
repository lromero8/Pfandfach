export const RETAILERS = [
    'rewe',
    'lidl',
    'aldi',
    'edeka',
    'norma',
    'kaufland',
] as const;

export type Retailer = (typeof RETAILERS)[number];

export function isRetailer(value: unknown): value is Retailer {
    return RETAILERS.some((retailer) => retailer === value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function normalizeAddress(address: string): string {
    return address
        .trim()
        .normalize('NFC')
        .toLocaleLowerCase('de-DE')
        .replace(/[.,;:#/\\-]+/g, ' ')
        .replace(/\s+/g, ' ');
}

function getEnvironmentVariable(name: string): string | undefined {
    const runtime = globalThis as typeof globalThis & {
        process?: {
            env?: Record<string, string | undefined>;
        };
    };

    return runtime.process?.env?.[name];
}

export function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json',
        },
    });
}

export function optionsResponse(): Response {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}

export async function supabaseRequest(
    path: string,
    options: {
        method: 'GET' | 'POST';
        body?: unknown;
        prefer?: string;
    },
): Promise<Response> {
    const supabaseUrl =
        getEnvironmentVariable('SUPABASE_URL') ??
        getEnvironmentVariable('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseKey =
        getEnvironmentVariable('SUPABASE_SECRET_KEY') ??
        getEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase server environment variables are missing.');
    }

    const headers: Record<string, string> = {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
    };

    if (options.prefer) {
        headers.Prefer = options.prefer;
    }

    return fetch(
        `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/${path}`,
        {
            method: options.method,
            headers,
            ...(options.body === undefined
                ? {}
                : { body: JSON.stringify(options.body) }),
        },
    );
}
