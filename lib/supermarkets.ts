import { normalizeAddress } from './supabase';

interface Element {
    id: number;
    type: string;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
};

export interface Supermarket {
    id: number;
    type: string;
    name: string;
    chain: string;
    address: string | null;
    normalizedAddress: string | null;
    distanceMeters: number;
};

const chains = ['rewe', 'lidl', 'aldi', 'kaufland', 'edeka', 'norma'];

export type Coordinates = { latitude: number; longitude: number };

export function distanceInMeters(a: Coordinates, b: Coordinates) {
    const radians = (degrees: number) => (degrees * Math.PI) / 180;
    const latDifference = radians(b.latitude - a.latitude);
    const lonDifference = radians(b.longitude - a.longitude);
    const value =
        Math.sin(latDifference / 2) ** 2 +
        Math.cos(radians(a.latitude)) *
        Math.cos(radians(b.latitude)) *
        Math.sin(lonDifference / 2) ** 2;

    return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function formatAddress(tags: Record<string, string>): string | null {
    const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
    const city = [tags['addr:postcode'], tags['addr:city']].filter(Boolean).join(' ');

    return [street, city].filter(Boolean).join(', ') || null;
}

function coordinatesOf(element: Element): Coordinates | null {
    const latitude = element.lat ?? element.center?.lat;
    const longitude = element.lon ?? element.center?.lon;

    return latitude === undefined || longitude === undefined ? null : { latitude, longitude };
}

const RADIUS = 1500;
const ADDRESS_RADIUS = 50;
const MAX_ATTEMPTS = 3;

async function fetchOverpass(query: string) {
    for (let attempt = 1; ; attempt += 1) {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Pfandfach/1.0 (lromerorsx@gmail.com)',
            },
            body: `data=${encodeURIComponent(query)}`,
        });

        const retryable = response.status === 429 || response.status >= 500;
        if (response.ok || !retryable || attempt === MAX_ATTEMPTS) return response;

        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
}

export async function findNearbySupermarkets(latitude: number, longitude: number) {
    const query = `
    [out:json][timeout:25];
    nwr["shop"="supermarket"](around:${RADIUS},${latitude},${longitude})->.shops;
    way["building"]["addr:street"]["addr:housenumber"](around.shops:${ADDRESS_RADIUS})->.addresses;
    (.shops; .addresses;);
    out center tags;
  `;

    const response = await fetchOverpass(query);

    if (!response.ok) {
        throw new Error(`Supermärkte konnten nicht geladen werden (HTTP ${response.status}).`);
    }

    const data = (await response.json()) as { elements: Element[] };

    const addressSources = data.elements.flatMap((element) => {
        const coordinates = coordinatesOf(element);
        const tags = element.tags ?? {};

        return coordinates && tags['addr:street'] && tags['addr:housenumber']
            ? [{ coordinates, tags }]
            : [];
    });

    // Shared buildings (e.g. malls) give the same address to every shop in them.
    const nearestAddressTags = (point: Coordinates): Record<string, string> => addressSources
        .map((source) => ({ tags: source.tags, distance: distanceInMeters(point, source.coordinates) }))
        .filter((candidate) => candidate.distance <= ADDRESS_RADIUS)
        .sort((a, b) => a.distance - b.distance)[0]?.tags ?? {};

    return data.elements.flatMap((element): Supermarket[] => {
        const tags = element.tags ?? {};
        const searchableName = [
            tags.brand,
            tags.name,
            tags['brand:en'],
            tags['name:en'],
        ].filter(Boolean).join(' ').toLowerCase();

        const chain = chains.find((item) => searchableName.includes(item));
        const lat = element.lat ?? element.center?.lat;
        const lon = element.lon ?? element.center?.lon;

        if (tags.shop !== 'supermarket' || !chain || lat === undefined || lon === undefined) return [];

        const addressTags = tags['addr:street'] && tags['addr:housenumber']
            ? tags
            : nearestAddressTags({ latitude: lat, longitude: lon });
        const address = formatAddress(addressTags);

        return [{
            id: element.id,
            type: element.type,
            name: tags.name ?? tags.brand ?? chain,
            chain,
            address,
            normalizedAddress: address === null ? null : normalizeAddress(address),
            distanceMeters: distanceInMeters(
                { latitude, longitude },
                { latitude: lat, longitude: lon },
            ),
        }];
    }).sort((a, b) => a.distanceMeters - b.distanceMeters);
}
