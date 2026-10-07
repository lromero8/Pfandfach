const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

const MAX_IMAGE_BASE64_LENGTH = 3_250_000;

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
        },
    });
}

function isRecord(value) {
    return typeof value === 'object' && value !== null;
}

function unknownResult(evidence = 'Keine eindeutige Markierung erkannt.') {
    return {
        classification: 'Unbekannt',
        evidence,
        confidence: 'low',
    };
}

function validateResult(value) {
    if (!isRecord(value)) {
        return unknownResult();
    }

    const evidence =
        typeof value.evidence === 'string'
            ? value.evidence.trim().slice(0, 240)
            : '';

    const validClassification =
        value.classification === 'Einweg' ||
        value.classification === 'Mehrweg' ||
        value.classification === 'Unbekannt';

    const validConfidence =
        value.confidence === 'high' ||
        value.confidence === 'medium' ||
        value.confidence === 'low';

    if (!validClassification || !validConfidence || !evidence) {
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

export default {
    async fetch(request) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: CORS_HEADERS });
        }

        if (request.method !== 'POST') {
            return jsonResponse({ error: 'Method not allowed' }, 405);
        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return jsonResponse({ error: 'Gemini key is not configured' }, 500);
        }

        const contentLength = Number(request.headers.get('content-length') || 0);
        if (contentLength > 3_500_000) {
            return jsonResponse({ error: 'Image is too large' }, 413);
        }

        let input;
        try {
            input = await request.json();
        } catch {
            return jsonResponse({ error: 'Invalid JSON body' }, 400);
        }

        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

        if (
            !isRecord(input) ||
            typeof input.imageBase64 !== 'string' ||
            input.imageBase64.length === 0 ||
            input.imageBase64.length > MAX_IMAGE_BASE64_LENGTH ||
            input.imageBase64.length % 4 !== 0 ||
            !/^[A-Za-z0-9+/]+={0,2}$/.test(input.imageBase64) ||
            !allowedMimeTypes.includes(input.mimeType)
        ) {
            return jsonResponse({ error: 'Invalid or oversized image' }, 400);
        }

        const prompt = `
Inspect this image for a German bottle or can deposit marking.

Classify it as Einweg only if a DPG one-way deposit mark or explicit Einweg text is clearly visible.
Classify it as Mehrweg only if explicit Mehrweg text or a clearly identifiable reusable-container mark is visible.
Do not guess based on the brand, product, container material, or shape.
If the marking is missing, blurry, obscured, or ambiguous, classify it as Unbekannt.
In evidence, quote or briefly describe only the visible mark. Never invent evidence.
Confidence describes how clearly the mark can be read, not the probability that a retailer accepts the container.
Return the evidence in German.
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

        let geminiResponse;

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
                                parts: [
                                    { text: prompt },
                                    {
                                        inlineData: {
                                            mimeType: input.mimeType,
                                            data: input.imageBase64,
                                        },
                                    },
                                ],
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
                    signal: AbortSignal.timeout(45_000),
                },
            );
        } catch {
            return jsonResponse({ error: 'Gemini request failed' }, 502);
        }

        if (!geminiResponse.ok) {
            return jsonResponse({ error: 'Gemini request failed' }, 502);
        }

        let geminiData;
        try {
            geminiData = await geminiResponse.json();
        } catch {
            return jsonResponse({ error: 'Invalid Gemini response' }, 502);
        }

        const responseText = geminiData.candidates?.[0]?.content?.parts
            ?.map((part) => (typeof part.text === 'string' ? part.text : ''))
            .join('')
            .trim();

        if (!responseText) {
            return jsonResponse({ error: 'Gemini returned no result' }, 502);
        }

        try {
            return jsonResponse(validateResult(JSON.parse(responseText)));
        } catch {
            return jsonResponse(
                unknownResult('Die Markierung konnte nicht zuverlässig ausgewertet werden.'),
            );
        }
    },
};
