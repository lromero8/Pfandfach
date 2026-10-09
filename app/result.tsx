import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    parseBranchAcceptances,
    type AcceptanceStatus,
    type BranchAcceptance,
} from '../lib/branch-acceptance';

// TO-DO
// - On openning the app we need to fetch the nearby supermarkets or relevant locations based on the user's current position. Max 3 locations should be retrieved.
// - If possible, the address of the supermarkets should be normalized to the format: "Bonner Str. 211, 50968 Köln"
// - Then, on every scann we send the barcode and the current location to the backend to get the predicted acceptance status for the nearby supermarkets.
// - If no results then display no results.
// - If results are returned, display the predicted acceptance status for each nearby supermarket.
// - Then on the home page, we need to display the previously scanned bottles so that users click on them to record which supermarkets accepted or rejected them. That way we will collect feedback to improve the accuracy of future acceptance predictions.

const acceptanceLabels: Record<AcceptanceStatus, string> = {
    likely_accepted: 'Gemeldet: angenommen',
    likely_rejected: 'Gemeldet: abgelehnt',
    unknown: 'Unklar',
};

const statusPriority: Record<AcceptanceStatus, number> = {
    likely_accepted: 0,
    likely_rejected: 1,
    unknown: 2,
};

function bestPriority(items: BranchAcceptance[]): number {
    return Math.min(...items.map((branch) => statusPriority[branch.acceptance]));
}

const retailerLabels: Record<string, string | undefined> = {
    aldi: 'Aldi',
    edeka: 'Edeka',
    kaufland: 'Kaufland',
    lidl: 'Lidl',
    norma: 'Norma',
    rewe: 'REWE',
};

function groupByRetailer(branches: BranchAcceptance[]) {
    const groups = new Map<string, BranchAcceptance[]>();

    for (const branch of branches) {
        const group = groups.get(branch.retailer);

        if (group) {
            group.push(branch);
        }
        else {
            groups.set(branch.retailer, [branch]);
        }
    }

    return Array.from(groups, ([retailer, items]) => ({ retailer, items }))
        .sort((a, b) => bestPriority(a.items) - bestPriority(b.items));
}

export default function ResultScreen() {
    const {
        barcode,
        found,
        productName,
        brand,
        acceptances,
    } = useLocalSearchParams<{
        barcode?: string;
        found?: string;
        productName?: string;
        brand?: string;
        acceptances?: string;
    }>();

    const [expandedChains, setExpandedChains] = useState<Set<string>>(() => new Set());

    function toggleChain(retailer: string) {
        setExpandedChains((current) => {
            const next = new Set(current);

            if (next.has(retailer)) {
                next.delete(retailer);
            }
            else {
                next.add(retailer);
            }

            return next;
        });
    }

    const productFound = found === 'true';
    const branchAcceptances = parseBranchAcceptances(acceptances);

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar style="dark" />

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.label}>Flaschenerkennung</Text>
                <Text style={styles.title}>
                    {productFound
                        ? productName || 'Name unbekannt'
                        : 'Produkt nicht gefunden'}
                </Text>

                {productFound && brand ? (
                    <Text style={styles.description}>{brand}</Text>
                ) : null}

                <Text style={styles.barcode}>Barcode: {barcode || 'unbekannt'}</Text>

                <View style={styles.branches}>
                    <Text style={styles.infoTitle}>Filialen in der Nähe</Text>

                    {branchAcceptances.length === 0 ? (
                        <Text style={styles.infoText}>
                            Keine Filialen zur Vorhersage gefunden.
                        </Text>
                    ) : null}

                    {groupByRetailer(branchAcceptances).map((group) => {
                        const isOpen = expandedChains.has(group.retailer);

                        return (
                            <View key={group.retailer} style={styles.chainGroup}>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityState={{ expanded: isOpen }}
                                    onPress={() => toggleChain(group.retailer)}
                                    style={styles.chainHeader}
                                >
                                    <Text style={styles.chainName}>
                                        {retailerLabels[group.retailer] ?? group.retailer} ({group.items.length})
                                    </Text>
                                    <Text style={styles.chainName}>{isOpen ? '▾' : '▸'}</Text>
                                </Pressable>

                                {isOpen
                                    ? group.items.map((branch, index) => (
                                        <View key={`${branch.name}-${index}`} style={styles.branchRow}>
                                            <View style={styles.branchText}>
                                                <Text style={styles.branchName}>{branch.name}</Text>
                                                <Text style={styles.infoText}>
                                                    {branch.address ?? 'Adresse unbekannt'}
                                                </Text>
                                            </View>
                                            <Text style={styles.branchAcceptance}>
                                                {acceptanceLabels[branch.acceptance]}
                                            </Text>
                                        </View>
                                    ))
                                    : null}
                            </View>
                        );
                    })}
                </View>

                <Text style={styles.note}>
                    Die Vorhersage basiert auf gemeldeten Rückgaben. Sie bestätigt
                    nicht, dass eine bestimmte Supermarktkette die Flasche annimmt.
                </Text>

                <View style={styles.actions}>
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => router.replace('/camera')}
                        style={styles.primaryButton}
                    >
                        <Text style={styles.primaryButtonText}>Noch einmal scannen</Text>
                    </Pressable>

                    <Pressable
                        accessibilityRole="button"
                        onPress={() => router.replace('/')}
                        style={styles.secondaryButton}
                    >
                        <Text style={styles.secondaryButtonText}>Zur Übersicht</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#F1F4EC',
    },
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    label: {
        color: '#64736A',
        fontSize: 14,
        fontWeight: '600',
    },
    title: {
        color: '#173B32',
        fontSize: 30,
        fontWeight: '800',
        marginTop: 12,
    },
    description: {
        color: '#5D6C64',
        fontSize: 16,
        marginTop: 8,
    },
    barcode: {
        color: '#5D6C64',
        fontSize: 14,
        marginTop: 10,
    },
    infoTitle: {
        color: '#5D6C64',
        fontSize: 14,
    },
    infoText: {
        color: '#5D6C64',
        fontSize: 15,
        lineHeight: 21,
        marginTop: 8,
    },
    branches: {
        marginTop: 16,
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
    },
    chainGroup: {
        marginTop: 12,
    },
    chainHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    chainName: {
        color: '#31594B',
        fontSize: 14,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    branchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingVertical: 12,
        borderTopColor: '#D8DED5',
        borderTopWidth: 1,
    },
    branchText: {
        flex: 1,
    },
    branchName: {
        color: '#173B32',
        fontSize: 16,
        fontWeight: '600',
    },
    branchAcceptance: {
        color: '#31594B',
        fontSize: 14,
        fontWeight: '700',
    },
    note: {
        color: '#59675F',
        fontSize: 14,
        lineHeight: 20,
        marginTop: 18,
    },
    actions: {
        gap: 12,
        marginTop: 24,
    },
    primaryButton: {
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#173B32',
        borderRadius: 8,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryButton: {
        alignItems: 'center',
        padding: 14,
    },
    secondaryButtonText: {
        color: '#173B32',
        fontSize: 16,
        fontWeight: '600',
    },
});
