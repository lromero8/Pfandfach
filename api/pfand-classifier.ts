const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

const MAX_IMAGE_BASE64_LENGTH = 3_250_000;
const ALLOWED_MIME_TYPES: string[] = ['image/jpeg', 'image/png', 'image/webp'];

type PfandClassification = 'Einweg' | 'Mehrweg' | 'Unbekannt';
type Confidence = 'high' | 'medium' | 'low';

type ClassificationResult = {
    classification: PfandClassification;
    evidence: string;
    confidence: Confidence;
};

type GeminiResponse = {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: unknown;
            }>;
        };
    }>;
};

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
        },
    });
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function unknownResult(
    evidence = 'Keine eindeutige Markierung erkannt.',
): ClassificationResult {
    return {
        classification: 'Unbekannt',
        evidence,
        confidence: 'low',
    };
}

function isPfandClassification(value: unknown): value is PfandClassification {
    return value === 'Einweg' || value === 'Mehrweg' || value === 'Unbekannt';
}

function isConfidence(value: unknown): value is Confidence {
    return value === 'high' || value === 'medium' || value === 'low';
}

function validateResult(value: unknown): ClassificationResult {
    if (!isRecord(value)) {
        return unknownResult();
    }

    const evidence =
        typeof value.evidence === 'string'
            ? value.evidence.trim().slice(0, 240)
            : '';

    if (
        !isPfandClassification(value.classification) ||
        !isConfidence(value.confidence) ||
        !evidence
    ) {
        return unknownResult();
    }

    if (value.classification !== 'Unbekannt' && value.confidence === 'low') {
        return unknownResult(evidence);
    }

    return {
        classification: value.classification,
        evidence,
        confidence: value.confidence,
    };
}

function getGeminiApiKey(): string | undefined {
    const runtime = globalThis as typeof globalThis & {
        process?: {
            env?: Record<string, string | undefined>;
        };
    };

    return runtime.process?.env?.GEMINI_API_KEY;
}

function getGeminiResponseText(value: unknown): string | null {
    if (!isRecord(value) || !Array.isArray(value.candidates)) {
        return null;
    }

    const candidate = value.candidates[0];
    if (!isRecord(candidate) || !isRecord(candidate.content)) {
        return null;
    }

    const parts = candidate.content.parts;
    if (!Array.isArray(parts)) {
        return null;
    }

    const text = parts
        .filter(isRecord)
        .map((part) => (typeof part.text === 'string' ? part.text : ''))
        .join('')
        .trim();

    return text || null;
}

export default {
    async fetch(request: Request): Promise<Response> {
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: CORS_HEADERS });
        }

        if (request.method !== 'POST') {
            return jsonResponse({ error: 'Method not allowed' }, 405);
        }

        const apiKey = getGeminiApiKey();

        if (!apiKey) {
            return jsonResponse({ error: 'Gemini key is not configured' }, 500);
        }

        const contentLength = Number(request.headers.get('content-length') || 0);
        if (contentLength > 3_500_000) {
            return jsonResponse({ error: 'Image is too large' }, 413);
        }

        let input: unknown;
        try {
            input = await request.json();
        }
        catch {
            return jsonResponse({ error: 'Invalid JSON body' }, 400);
        }

        const imageBase64 =
            isRecord(input) && typeof input.imageBase64 === 'string'
                ? input.imageBase64
                : null;

        const mimeType =
            isRecord(input) &&
            typeof input.mimeType === 'string' &&
            ALLOWED_MIME_TYPES.includes(input.mimeType)
                ? input.mimeType
                : null;

        if (
            !imageBase64 ||
            imageBase64.length > MAX_IMAGE_BASE64_LENGTH ||
            imageBase64.length % 4 !== 0 ||
            !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64) ||
            !mimeType
        ) {
            return jsonResponse({ error: 'Invalid or oversized image' }, 400);
        }

//         const prompt = `
// Inspect this image for a German bottle or can deposit marking.

// Classify it as Einweg only if a DPG one-way deposit mark or explicit Einweg text is clearly visible.
// Classify it as Mehrweg only if explicit Mehrweg text or a clearly identifiable reusable-container mark is visible.
// Do not guess based on the brand, product, container material, or shape.
// If the marking is missing, blurry, obscured, or ambiguous, classify it as Unbekannt.
// In evidence, quote or briefly describe only the visible mark. Never invent evidence.
// Confidence describes how clearly the mark can be read, not the probability that a retailer accepts the container.
// Return the evidence in German.
// `;
        const prompt = `
Return a JSON classification with classification "Unbekannt",
evidence "Text connection test", and confidence "low".
`;

        const schema = {
            type: 'OBJECT',
            properties: {
                classification: {
                    type: 'STRING',
                    enum: ['Einweg', 'Mehrweg', 'Unbekannt'],
                },
                evidence: { type: 'STRING' },
                confidence: {
                    type: 'STRING',
                    enum: ['high', 'medium', 'low'],
                },
            },
            required: ['classification', 'evidence', 'confidence'],
        };

        let geminiResponse: Response;

        try {
            geminiResponse = await fetch(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-goog-api-key': apiKey,
                    },
                    body: JSON.stringify({
                        contents: [
                            {
                                // parts: [
                                //     { text: prompt },
                                //     {
                                //         inlineData: {
                                //             mimeType,
                                //             data: imageBase64,
                                //         },
                                //     },
                                // ],
                                parts: [{ text: prompt }],
                            },
                        ],
                        generationConfig: {
                            temperature: 0,
                            responseFormat: {
                                text: {
                                    mimeType: 'APPLICATION_JSON',
                                    schema,
                                },
                            },
                        },
                    }),
                    signal: AbortSignal.timeout(20_000),
                },
            );
        }
        catch (error) {
            console.error(
                '[PFAND_GEMINI_FETCH]',
                error instanceof Error ? error.name : 'UnknownError',
                error instanceof Error ? error.message : '',
            );
            return jsonResponse({ error: 'Gemini request failed' }, 502);
        }

        if (!geminiResponse.ok) {
            const errorBody = await geminiResponse.text();
            console.error(
                '[PFAND_GEMINI_HTTP]',
                geminiResponse.status,
                errorBody.slice(0, 1000),
            );
            return jsonResponse({ error: 'Gemini rejected the request' }, 502);
        }

        let geminiData: GeminiResponse;

        try {
            geminiData = await geminiResponse.json();
        }
        catch {
            return jsonResponse({ error: 'Invalid Gemini response' }, 502);
        }

        const responseText = getGeminiResponseText(geminiData);

        if (!responseText) {
            return jsonResponse({ error: 'Gemini returned no result' }, 502);
        }

        try {
            const parsedResult: unknown = JSON.parse(responseText);
            return jsonResponse(validateResult(parsedResult));
        }
        catch {
            return jsonResponse(
                unknownResult(
                    'Die Markierung konnte nicht zuverlässig ausgewertet werden.',
                ),
            );
        }
    },
};
