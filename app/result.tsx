import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ResultScreen() {
    const { barcode, found, productName, brand } = useLocalSearchParams<{
        barcode?: string;
        found?: string;
        productName?: string;
        brand?: string;
    }>();

    const productFound = found === 'true';

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar style="dark" />

            <View style={styles.content}>
                <Text style={styles.label}>Open Food Facts</Text>
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
                    <Text style={styles.infoTitle}>Rückgabeorte</Text>
                    <Text style={styles.infoText}>
                        Filialdaten sind noch nicht verfügbar.
                    </Text>
                </View>

                <Text style={styles.note}>
                    Produktdaten können unvollständig sein. Pfandstatus und
                    Filialannahme sind nicht bestätigt.
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
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#F1F4EC',
    },
    content: {
        flex: 1,
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
        color: '#173B32',
        fontSize: 18,
        fontWeight: '700',
    },
    infoText: {
        color: '#5D6C64',
        fontSize: 15,
        marginTop: 8,
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