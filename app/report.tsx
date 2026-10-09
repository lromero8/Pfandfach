import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { forgetAcceptance, loadAcceptance } from '../lib/acceptance-cache';
import { useNearbyBranches } from '../lib/nearby-branches';
import type { AcceptanceStatus } from '../lib/branch-acceptance';
import { submitReport, type ReportOutcome } from '../lib/return-reports';
import type { Supermarket } from '../lib/supermarkets';

function branchKey(branch: Supermarket): string {
    return `${branch.type}/${branch.id}`;
}

function outcomeFromAcceptance(acceptance: AcceptanceStatus | undefined): ReportOutcome | null {
    if (acceptance === 'likely_accepted') return 'accepted';
    if (acceptance === 'likely_rejected') return 'rejected';

    return null;
}

const answerOptions: { outcome: ReportOutcome; label: string }[] = [
    { outcome: 'accepted', label: 'Ja' },
    { outcome: 'rejected', label: 'Nein' },
];

const reportedLabels: Record<ReportOutcome, string> = {
    accepted: 'Gemeldet: angenommen',
    rejected: 'Gemeldet: abgelehnt',
};

export default function ReportScreen() {
    const { barcode, productName, brand } = useLocalSearchParams<{
        barcode: string;
        productName: string;
        brand: string;
    }>();
    const { status, branches, message } = useNearbyBranches();
    const [answers, setAnswers] = useState<Map<string, ReportOutcome>>(() => new Map());
    const [savedAnswers, setSavedAnswers] = useState<Map<string, ReportOutcome>>(() => new Map());
    const [reportedError, setReportedError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        if (status !== 'ready' || branches.length === 0) return;

        let cancelled = false;

        loadAcceptance(barcode, branches)
            .then((acceptances) => {
                if (cancelled) return;

                const saved = new Map<string, ReportOutcome>();

                branches.forEach((branch, index) => {
                    const outcome = outcomeFromAcceptance(acceptances[index]?.acceptance);

                    if (outcome) saved.set(branchKey(branch), outcome);
                });

                setSavedAnswers(saved);
            })
            .catch(() => {
                if (!cancelled) setReportedError('Bereits gemeldete Filialen konnten nicht geladen werden.');
            });

        return () => {
            cancelled = true;
        };
    }, [barcode, branches, status]);

    function answerFor(branch: Supermarket): ReportOutcome | undefined {
        const key = branchKey(branch);

        return answers.get(key) ?? savedAnswers.get(key);
    }

    function hasPendingChange(branch: Supermarket): boolean {
        const key = branchKey(branch);
        const answer = answers.get(key);

        return answer !== undefined && answer !== savedAnswers.get(key);
    }

    function answerBranch(branch: Supermarket, outcome: ReportOutcome) {
        setAnswers((current) => new Map(current).set(branchKey(branch), outcome));
    }

    async function saveReport() {
        const pending = branches.flatMap((branch) => {
            const outcome = answers.get(branchKey(branch));

            return outcome !== undefined && hasPendingChange(branch) ? [{ branch, outcome }] : [];
        });

        setIsSaving(true);
        setSaveError(null);

        try {
            await Promise.all(pending.map(({ branch, outcome }) => submitReport(barcode, branch, outcome)));
            forgetAcceptance(barcode);
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

    const hasChanges = branches.some(hasPendingChange);

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
                <Text style={styles.title}>Hat die Filiale angenommen?</Text>
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
            {reportedError ? <Text style={styles.info}>{reportedError}</Text> : null}

            <ScrollView contentContainerStyle={styles.list}>
                {branches.map((branch) => {
                    const key = branchKey(branch);
                    const answer = answerFor(branch);
                    const saved = savedAnswers.get(key);
                    const disabled = branch.address === null;

                    return (
                        <View
                            key={key}
                            style={[styles.branchRow, disabled && styles.branchRowDisabled]}
                        >
                            <View style={styles.branchText}>
                                <Text style={styles.branchName}>{branch.name}</Text>
                                <Text style={styles.branchAddress}>
                                    {branch.address ?? 'Adresse unbekannt'}
                                </Text>
                                {saved ? <Text style={styles.reportedHint}>{reportedLabels[saved]}</Text> : null}
                            </View>
                            <View style={styles.answerRow}>
                                {answerOptions.map((option) => {
                                    const selected = answer === option.outcome;

                                    return (
                                        <Pressable
                                            key={option.outcome}
                                            accessibilityRole="button"
                                            accessibilityState={{ selected, disabled }}
                                            disabled={disabled}
                                            onPress={() => answerBranch(branch, option.outcome)}
                                            style={({ pressed }) => [
                                                styles.answerButton,
                                                selected && styles.answerButtonSelected,
                                                pressed && !disabled && styles.pressed,
                                            ]}
                                        >
                                            <Text style={[styles.answerText, selected && styles.answerTextSelected]}>
                                                {option.label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                    );
                })}
            </ScrollView>

            <View style={styles.footer}>
                {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
                <Pressable
                    accessibilityRole="button"
                    disabled={!hasChanges || isSaving}
                    onPress={() => void saveReport()}
                    style={({ pressed }) => [
                        styles.saveButton,
                        (!hasChanges || isSaving) && styles.saveButtonDisabled,
                        pressed && hasChanges && !isSaving && styles.pressed,
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
        gap: 12,
        padding: 14,
        backgroundColor: '#FFFFFF',
        borderColor: '#D8DED5',
        borderWidth: 1,
        borderRadius: 8,
    },
    branchRowDisabled: {
        opacity: 0.5,
    },
    answerRow: {
        flexDirection: 'row',
        gap: 8,
    },
    answerButton: {
        flex: 1,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#9AA79F',
        backgroundColor: '#FFFFFF',
    },
    answerButtonSelected: {
        backgroundColor: '#173B32',
        borderColor: '#173B32',
    },
    answerText: {
        color: '#173B32',
        fontSize: 15,
        fontWeight: '700',
    },
    answerTextSelected: {
        color: '#FFFFFF',
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
    reportedHint: {
        color: '#31594B',
        fontSize: 13,
        fontWeight: '700',
        marginTop: 4,
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
