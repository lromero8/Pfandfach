import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRef, useState } from 'react';
import { useNearbyBranches } from '../lib/nearby-branches';
import { requestBranchAcceptance } from '../lib/branch-acceptance';

const PFAND_API_URL =
    'https://pfandfach.vercel.app/api/pfand-classifier';

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

type PfandClassification = 'Einweg' | 'Mehrweg' | 'Unbekannt';
type Confidence = 'high' | 'medium' | 'low';

type ClassificationResult = {
    classification: PfandClassification;
    evidence: string;
    confidence: Confidence;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isClassificationResult(value: unknown): value is ClassificationResult {
    return (
        isRecord(value) &&
        (value.classification === 'Einweg' ||
            value.classification === 'Mehrweg' ||
            value.classification === 'Unbekannt') &&
        typeof value.evidence === 'string' &&
        (value.confidence === 'high' ||
            value.confidence === 'medium' ||
            value.confidence === 'low')
    );
}

export default function CameraScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [torchEnabled, setTorchEnabled] = useState(false);
    const [scannedCode, setScannedCode] = useState<string | null>(null);
    const [lookupMessage, setLookupMessage] = useState<string | null>(null);
    const [product, setProduct] = useState<ProductInfo | null>(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [isBusy, setIsBusy] = useState(false);
    const cameraRef = useRef<CameraView | null>(null);
    const scannedOnce = useRef(false);
    const { waitForBranches } = useNearbyBranches();

    async function lookupProduct(barcode: string) {
        setIsBusy(true);
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
                throw new Error('Produktabfrage fehlgeschlagen.');
            }

            const result: OpenFoodFactsResponse = await response.json();

            if (result.status !== 'success' || !result.product) {
                setProduct({
                    found: false,
                    name: 'Produkt nicht gefunden',
                    brand: '',
                });
                setLookupMessage(
                    'Richte die Kamera auf das Pfandzeichen und tippe auf Foto.',
                );
                return;
            }

            setProduct({
                found: true,
                name: result.product.product_name || 'Name unbekannt',
                brand: result.product.brands || '',
            });
            setLookupMessage(
                'Richte die Kamera auf das Pfandzeichen und tippe auf Foto.',
            );
        } catch {
            setProduct({
                found: false,
                name: 'Produktdaten nicht verfügbar',
                brand: '',
            });
            setLookupMessage(
                'Produktabfrage fehlgeschlagen. Du kannst das Pfandzeichen trotzdem fotografieren.',
            );
        } finally {
            setIsBusy(false);
        }
    }

    async function classifyPfandMark() {
        if (!cameraRef.current || !scannedCode || isBusy || !cameraReady) {
            return;
        }

        setIsBusy(true);
        setLookupMessage('Pfandzeichen und Filialen werden geprüft ...');

        try {
            const photo = await cameraRef.current.takePictureAsync({
                base64: true,
                quality: 0.5,
            });

            if (!photo.base64) {
                throw new Error('Das Foto enthält keine Bilddaten.');
            }

            if (photo.base64.length > 3_250_000) {
                setLookupMessage(
                    'Das Foto ist zu groß. Bitte näher an das Pfandzeichen gehen und erneut versuchen.',
                );
                return;
            }

            const acceptancePromise = waitForBranches().then((branches) =>
                requestBranchAcceptance(scannedCode, branches),
            );
            acceptancePromise.catch(() => undefined);

            const response = await fetch(PFAND_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    imageBase64: photo.base64,
                    mimeType: 'image/jpeg',
                }),
            });

            let responseBody: unknown;

            try {
                responseBody = await response.json();
            } catch {
                responseBody = null;
            }

            if (!response.ok) {
                const message =
                    isRecord(responseBody) &&
                    typeof responseBody.error === 'string'
                        ? responseBody.error
                        : `Serverfehler (${response.status}).`;

                throw new Error(message);
            }

            if (!isClassificationResult(responseBody)) {
                throw new Error('Ungültige Antwort vom Klassifizierungsserver.');
            }

            setLookupMessage('Filialen und Vorhersage werden abgerufen ...');
            const acceptances = await acceptancePromise;

            router.replace({
                pathname: '/result',
                params: {
                    barcode: scannedCode,
                    found: product?.found ? 'true' : 'false',
                    productName: product?.name || 'Produkt nicht gefunden',
                    brand: product?.brand || '',
                    pfandType: responseBody.classification,
                    evidence: responseBody.evidence,
                    confidence: responseBody.confidence,
                    acceptances: JSON.stringify(acceptances),
                },
            });
        } catch (error) {
            setLookupMessage(
                error instanceof Error
                    ? error.message
                    : 'Fotoanalyse fehlgeschlagen. Verbindung prüfen und erneut versuchen.',
            );
        } finally {
            setIsBusy(false);
        }
    }

    function resetScan() {
        scannedOnce.current = false;
        setScannedCode(null);
        setLookupMessage(null);
        setProduct(null);
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
                ref={cameraRef}
                facing="back"
                enableTorch={torchEnabled}
                onCameraReady={() => setCameraReady(true)}
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
                    <Text style={styles.headerTitle}>
                        {scannedCode ? 'Pfandzeichen prüfen' : 'Flasche scannen'}
                    </Text>
                    <View style={styles.headerSpacer} />
                </View>

                <View style={styles.guideArea}>
                    <View style={styles.bottleGuide}>
                        <Text style={styles.guideText}>
                            {scannedCode ?? 'Barcode mittig halten'}
                        </Text>
                        {product?.name ? (
                            <Text style={styles.guideText}>{product.name}</Text>
                        ) : null}
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
                        accessibilityLabel="Foto vom Pfandzeichen aufnehmen"
                        disabled={!scannedCode || !cameraReady || isBusy}
                        onPress={() => void classifyPfandMark()}
                        style={[
                            styles.shutter,
                            (!scannedCode || !cameraReady || isBusy) &&
                                styles.shutterDisabled,
                        ]}
                    >
                        <View style={styles.shutterCenter}>
                            {scannedCode ? (
                                <Text style={styles.shutterLabel}>Foto</Text>
                            ) : null}
                        </View>
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
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
    },
    shutterLabel: {
        color: '#173B32',
        fontSize: 12,
        fontWeight: '700',
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
