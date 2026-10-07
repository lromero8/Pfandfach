import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRef, useState } from 'react';

type OpenFoodFactsResponse = {
    status: string;
    product?: {
        product_name?: string;
        brands?: string;
    };
};

export default function CameraScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [torchEnabled, setTorchEnabled] = useState(false);
    const [scannedCode, setScannedCode] = useState<string | null>(null);
    const [lookupMessage, setLookupMessage] = useState<string | null>(null);
    const scannedOnce = useRef(false);

    async function lookupProduct(barcode: string) {
        setLookupMessage('Produkt wird gesucht ...');

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
                throw new Error('Request failed');
            }

            const result: OpenFoodFactsResponse = await response.json();

            if (result.status !== 'success' || !result.product) {
                setLookupMessage('Produkt nicht in Open Food Facts gefunden');
                return;
            }

            const name = result.product.product_name || 'Name unbekannt';
            const brand = result.product.brands;

            setLookupMessage(brand ? `${name} · ${brand}` : name);
        }
        catch {
            setLookupMessage('Lookup fehlgeschlagen. Verbindung prüfen.');
        }
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
                    void lookupProduct(data);
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
                    <Text style={styles.headerTitle}>Flasche scannen</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <View style={styles.guideArea}>
                    <View style={styles.bottleGuide}>
                        <Text style={styles.guideText}>
                            {scannedCode ?? 'Flasche mittig halten'}
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
                        style={styles.flashButton}
                    >
                        <Text style={styles.flashText}>
                            Blitz {torchEnabled ? 'an' : 'aus'}
                        </Text>
                    </Pressable>

                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Barcode erneut scannen"
                        disabled={!scannedCode}
                        onPress={() => {
                            scannedOnce.current = false;
                            setScannedCode(null);
                            setLookupMessage(null);
                        }}
                        style={[
                            styles.shutter,
                            !scannedCode && styles.shutterDisabled,
                        ]}
                    >
                        <View style={styles.shutterCenter} />
                    </Pressable>

                    <View style={styles.controlSpacer} />
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
        paddingBottom: 18,
        borderColor: '#FFFFFF',
        borderWidth: 2,
        borderRadius: 90,
    },
    guideText: {
        color: '#FFFFFF',
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    controls: {
        minHeight: 112,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 12,
    },
    flashButton: {
        minWidth: 88,
        paddingVertical: 12,
    },
    flashText: {
        color: '#FFFFFF',
        fontSize: 14,
    },
    shutter: {
        width: 76,
        height: 76,
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: '#FFFFFF',
        borderWidth: 4,
        borderRadius: 38,
    },
    shutterDisabled: {
        opacity: 0.5,
    },
    shutterCenter: {
        width: 56,
        height: 56,
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
    },
    controlSpacer: {
        width: 88,
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
