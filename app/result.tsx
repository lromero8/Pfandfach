import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    parseBranchAcceptances,
    type AcceptanceStatus,
} from '../lib/branch-acceptance';

// TO-DO
// - On openning the app we need to fetch the nearby supermarkets or relevant locations based on the user's current position. Max 3 locations should be retrieved.
// - If possible, the address of the supermarkets should be normalized to the format: "Bonner Str. 211, 50968 Köln"
// - Then, on every scann we send the barcode and the current location to the backend to get the predicted acceptance status for the nearby supermarkets.
// - If no results then display no results.
// - If results are returned, display the predicted acceptance status for each nearby supermarket.
// - Then on the home page, we need to display the previously scanned bottles so that users click on them to record which supermarkets accepted or rejected them. That way we will collect feedback to improve the accuracy of future acceptance predictions.

function confidenceLabel(confidence?: string) {
    if (confidence === 'high') return 'Hoch';
    if (confidence === 'medium') return 'Mittel';
    if (confidence === 'low') return 'Niedrig';
    return null;
}

const acceptanceLabels: Record<AcceptanceStatus, string> = {
    likely_accepted: 'Vermutlich angenommen',
    likely_rejected: 'Vermutlich abgelehnt',
    unknown: 'Unklar',
};

export default function ResultScreen() {
    const {
        barcode,
        found,
        productName,
        brand,
        pfandType,
        evidence,
        confidence,
        acceptances,
    } = useLocalSearchParams<{
        barcode?: string;
        found?: string;
        productName?: string;
        brand?: string;
        pfandType?: string;
        evidence?: string;
        confidence?: string;
        acceptances?: string;
    }>();

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

                <View style={styles.info}>
                    <Text style={styles.infoTitle}>Pfandtyp</Text>
                    <Text style={styles.pfandType}>{pfandType || 'Unbekannt'}</Text>
                    <Text style={styles.infoText}>
                        {evidence || 'Keine eindeutige Markierung erkannt.'}
                    </Text>
                    {confidenceLabel(confidence) ? (
                        <Text style={styles.confidence}>
                            Lesesicherheit: {confidenceLabel(confidence)}
                        </Text>
                    ) : null}
                </View>

                <View style={styles.branches}>
                    <Text style={styles.infoTitle}>Filialen in der Nähe</Text>

                    {branchAcceptances.length === 0 ? (
                        <Text style={styles.infoText}>
                            Keine Filialen zur Vorhersage gefunden.
                        </Text>
                    ) : null}

                    {branchAcceptances.map((branch, index) => (
                        <View key={`${branch.retailer}-${index}`} style={styles.branchRow}>
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
                    ))}
                </View>

                <Text style={styles.note}>
                    Die Fotoanalyse wertet sichtbare Markierungen aus. Sie bestätigt
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
    info: {
        marginTop: 28,
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
    },
    infoTitle: {
        color: '#5D6C64',
        fontSize: 14,
    },
    pfandType: {
        color: '#173B32',
        fontSize: 24,
        fontWeight: '800',
        marginTop: 8,
    },
    infoText: {
        color: '#5D6C64',
        fontSize: 15,
        lineHeight: 21,
        marginTop: 8,
    },
    confidence: {
        color: '#5D6C64',
        fontSize: 14,
        marginTop: 10,
    },
    branches: {
        marginTop: 16,
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
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
