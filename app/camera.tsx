import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRef, useState } from 'react';
import { useNearbyBranches } from '../lib/nearby-branches';
import { requestBranchAcceptance } from '../lib/branch-acceptance';
import { addScanToHistory } from '../lib/scan-history';

type OpenFoodFactsResponse = {
    status: string;
    product?: {
        product_name?: string;
        brands?: string;
    };
};

type ProductInfo = {
    found: boolean;
    name: string;
    brand: string;
};

export default function CameraScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [torchEnabled, setTorchEnabled] = useState(false);
    const [scannedCode, setScannedCode] = useState<string | null>(null);
    const [lookupMessage, setLookupMessage] = useState<string | null>(null);
    const [isBusy, setIsBusy] = useState(false);
    const scannedOnce = useRef(false);
    const { waitForBranches } = useNearbyBranches();

    async function fetchProduct(barcode: string): Promise<ProductInfo> {
        try {
            const response = await fetch(
                `https://world.openfoodfacts.org/api/v3.6/product/${encodeURIComponent(barcode)}.json`,
                {
                    headers: {
                        Accept: 'application/json',
                        'User-Agent': 'Pfandfach/1.0 (your-email@example.com)',
                    },
                },
            );

            if (!response.ok) {
                throw new Error('Produktabfrage fehlgeschlagen.');
            }

            const result: OpenFoodFactsResponse = await response.json();

            if (result.status !== 'success' || !result.product) {
                return { found: false, name: 'Produkt nicht gefunden', brand: '' };
            }

            return {
                found: true,
                name: result.product.product_name || 'Name unbekannt',
                brand: result.product.brands || '',
            };
        } catch {
            return { found: false, name: 'Produktdaten nicht verfügbar', brand: '' };
        }
    }

    async function checkBarcode(barcode: string) {
        setIsBusy(true);
        setLookupMessage('Filialen werden geprüft ...');

        try {
            const [productInfo, branches] = await Promise.all([
                fetchProduct(barcode),
                waitForBranches(),
            ]);
            void addScanToHistory({
                barcode,
                productName: productInfo.name,
                brand: productInfo.brand,
                scannedAt: Date.now(),
            });
            const acceptances = await requestBranchAcceptance(barcode, branches);

            router.replace({
                pathname: '/result',
                params: {
                    barcode,
                    found: productInfo.found ? 'true' : 'false',
                    productName: productInfo.name,
                    brand: productInfo.brand,
                    acceptances: JSON.stringify(acceptances),
                },
            });
        } catch (error) {
            setLookupMessage(
                error instanceof Error
                    ? error.message
                    : 'Vorhersage fehlgeschlagen. Verbindung prüfen und erneut versuchen.',
            );
        } finally {
            setIsBusy(false);
        }
    }

    function resetScan() {
        scannedOnce.current = false;
        setScannedCode(null);
        setLookupMessage(null);
    }

    if (!permission) {
        return (
            <View style={styles.permissionScreen}>
                <Text style={styles.permissionText}>Kamera wird vorbereitet ...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.permissionScreen}>
                <Text style={styles.permissionTitle}>Kamerazugriff erforderlich</Text>
                <Text style={styles.permissionText}>
                    Erlaube den Kamerazugriff, um eine Flasche zu scannen.
                </Text>
                {permission.canAskAgain ? (
                    <Pressable
                        accessibilityRole="button"
                        onPress={requestPermission}
                        style={styles.permissionButton}
                    >
                        <Text style={styles.permissionButtonText}>Zugriff erlauben</Text>
                    </Pressable>
                ) : null}
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.screen}>
            <CameraView
                facing="back"
                enableTorch={torchEnabled}
                barcodeScannerSettings={{
                    barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
                }}
                onBarcodeScanned={({ data }) => {
                    if (scannedOnce.current) return;
                    scannedOnce.current = true;
                    setScannedCode(data);
                    void checkBarcode(data);
                }}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.overlay}>
                <View style={styles.header}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Kamera schließen"
                        onPress={() => router.back()}
                        style={styles.headerButton}
                    >
                        <Text style={styles.headerButtonText}>Schließen</Text>
                    </Pressable>
                    <Text style={styles.headerTitle}>
                        {scannedCode ? 'Filialen prüfen' : 'Flasche scannen'}
                    </Text>
                    <View style={styles.headerSpacer} />
                </View>

                <View style={styles.guideArea}>
                    <View style={styles.bottleGuide}>
                        <Text style={styles.guideText}>
                            {scannedCode ?? 'Barcode mittig halten'}
                        </Text>
                        {lookupMessage ? (
                            <Text style={styles.guideText}>{lookupMessage}</Text>
                        ) : null}
                    </View>
                </View>

                <View style={styles.controls}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                            torchEnabled ? 'Blitz ausschalten' : 'Blitz einschalten'
                        }
                        onPress={() => setTorchEnabled((enabled) => !enabled)}
                        style={styles.sideButton}
                    >
                        <Text style={styles.flashText}>
                            Blitz {torchEnabled ? 'an' : 'aus'}
                        </Text>
                    </Pressable>

                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Neuen Barcode scannen"
                        disabled={!scannedCode || isBusy}
                        onPress={resetScan}
                        style={styles.sideButton}
                    >
                        <Text style={styles.flashText}>Neu</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#101613',
    },
    overlay: {
        flex: 1,
        paddingHorizontal: 22,
    },
    header: {
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerButton: {
        minWidth: 88,
        paddingVertical: 10,
    },
    headerButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    headerSpacer: {
        width: 88,
    },
    guideArea: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottleGuide: {
        width: 190,
        height: 330,
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
        paddingHorizontal: 10,
        paddingBottom: 18,
        borderColor: '#FFFFFF',
        borderWidth: 2,
        borderRadius: 90,
    },
    guideText: {
        color: '#FFFFFF',
        fontSize: 14,
        textAlign: 'center',
    },
    controls: {
        minHeight: 112,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 12,
    },
    sideButton: {
        width: 88,
        minHeight: 44,
        justifyContent: 'center',
        paddingVertical: 10,
    },
    flashText: {
        color: '#FFFFFF',
        fontSize: 14,
    },
    permissionScreen: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
        backgroundColor: '#173B32',
    },
    permissionTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '700',
    },
    permissionText: {
        color: '#E3EAE5',
        fontSize: 16,
        marginTop: 12,
    },
    permissionButton: {
        alignSelf: 'flex-start',
        marginTop: 22,
        paddingHorizontal: 18,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
    },
    permissionButtonText: {
        color: '#173B32',
        fontSize: 16,
        fontWeight: '600',
    },
});
