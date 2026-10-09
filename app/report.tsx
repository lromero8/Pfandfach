import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNearbyBranches } from '../lib/nearby-branches';
import { submitAcceptedReport } from '../lib/return-reports';
import type { Supermarket } from '../lib/supermarkets';

function branchKey(branch: Supermarket): string {
    return `${branch.type}/${branch.id}`;
}

export default function ReportScreen() {
    const { barcode, productName, brand } = useLocalSearchParams<{
        barcode: string;
        productName: string;
        brand: string;
    }>();
    const { status, branches, message } = useNearbyBranches();
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    function toggleBranch(branch: Supermarket) {
        const key = branchKey(branch);

        setSelectedKeys((current) => {
            const next = new Set(current);

            if (next.has(key)) {
                next.delete(key);
            }
            else {
                next.add(key);
            }

            return next;
        });
    }

    async function saveReport() {
        const selected = branches.filter((branch) => selectedKeys.has(branchKey(branch)));

        setIsSaving(true);
        setSaveError(null);

        try {
            await Promise.all(selected.map((branch) => submitAcceptedReport(barcode, branch)));
            router.back();
        }
        catch (error) {
            setSaveError(
                error instanceof Error ? error.message : 'Meldung konnte nicht gespeichert werden.',
            );
        }
        finally {
            setIsSaving(false);
        }
    }

    const hasSelection = selectedKeys.size > 0;

    return (
        <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
            <StatusBar style="dark" />

            <View style={styles.header}>
                <Pressable
                    accessibilityRole="button"
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Text style={styles.backText}>Zurück</Text>
                </Pressable>
            </View>

            <View style={styles.intro}>
                <Text style={styles.title}>Wo wurde angenommen?</Text>
                <Text style={styles.subtitle}>{productName}</Text>
                {brand ? <Text style={styles.brand}>{brand}</Text> : null}
            </View>

            {status === 'loading' ? (
                <Text style={styles.info}>Filialen werden geladen ...</Text>
            ) : null}
            {status === 'error' ? (
                <Text style={styles.info}>{message ?? 'Filialen konnten nicht geladen werden.'}</Text>
            ) : null}
            {status === 'ready' && branches.length === 0 ? (
                <Text style={styles.info}>Keine Filialen in der Nähe gefunden.</Text>
            ) : null}

            <ScrollView contentContainerStyle={styles.list}>
                {branches.map((branch) => {
                    const selected = selectedKeys.has(branchKey(branch));
                    const disabled = branch.address === null;

                    return (
                        <Pressable
                            key={branchKey(branch)}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: selected, disabled }}
                            disabled={disabled}
                            onPress={() => toggleBranch(branch)}
                            style={({ pressed }) => [
                                styles.branchRow,
                                selected && styles.branchRowSelected,
                                disabled && styles.branchRowDisabled,
                                pressed && !disabled && styles.pressed,
                            ]}
                        >
                            <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                                {selected ? <Text style={styles.checkmark}>✓</Text> : null}
                            </View>
                            <View style={styles.branchText}>
                                <Text style={styles.branchName}>{branch.name}</Text>
                                <Text style={styles.branchAddress}>
                                    {branch.address ?? 'Adresse unbekannt'}
                                </Text>
                            </View>
                        </Pressable>
                    );
                })}
            </ScrollView>

            <View style={styles.footer}>
                {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
                <Pressable
                    accessibilityRole="button"
                    disabled={!hasSelection || isSaving}
                    onPress={() => void saveReport()}
                    style={({ pressed }) => [
                        styles.saveButton,
                        (!hasSelection || isSaving) && styles.saveButtonDisabled,
                        pressed && hasSelection && !isSaving && styles.pressed,
                    ]}
                >
                    <Text style={styles.saveText}>
                        {isSaving ? 'Speichern ...' : 'Speichern'}
                    </Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#F1F4EC',
    },
    header: {
        paddingHorizontal: 22,
        paddingTop: 8,
    },
    backButton: {
        alignSelf: 'flex-start',
        paddingVertical: 8,
    },
    backText: {
        color: '#31594B',
        fontSize: 16,
        fontWeight: '700',
    },
    intro: {
        paddingHorizontal: 22,
        marginTop: 16,
        marginBottom: 16,
    },
    title: {
        color: '#173B32',
        fontSize: 26,
        fontWeight: '800',
    },
    subtitle: {
        color: '#173B32',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 8,
    },
    brand: {
        color: '#66736C',
        fontSize: 14,
        marginTop: 2,
    },
    info: {
        color: '#5D6C64',
        fontSize: 15,
        paddingHorizontal: 22,
        marginBottom: 12,
    },
    list: {
        paddingHorizontal: 22,
        paddingBottom: 16,
        gap: 8,
    },
    branchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        backgroundColor: '#FFFFFF',
        borderColor: '#D8DED5',
        borderWidth: 1,
        borderRadius: 8,
    },
    branchRowSelected: {
        borderColor: '#173B32',
    },
    branchRowDisabled: {
        opacity: 0.5,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#9AA79F',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#173B32',
        borderColor: '#173B32',
    },
    checkmark: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
    branchText: {
        flex: 1,
    },
    branchName: {
        color: '#173B32',
        fontSize: 15,
        fontWeight: '600',
    },
    branchAddress: {
        color: '#66736C',
        fontSize: 13,
        marginTop: 2,
    },
    footer: {
        paddingHorizontal: 22,
        paddingVertical: 12,
        gap: 8,
    },
    error: {
        color: '#9B2C2C',
        fontSize: 14,
    },
    saveButton: {
        minHeight: 56,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#173B32',
        borderRadius: 8,
    },
    saveButtonDisabled: {
        opacity: 0.4,
    },
    saveText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    },
    pressed: {
        opacity: 0.72,
    },
});
