import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ResultScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />

      <View style={styles.content}>
        <Text style={styles.label}>Beispielscan</Text>
        <Text style={styles.title}>Mineralwasserflasche</Text>
        <Text style={styles.description}>Mehrwegflasche · 0,75 l</Text>

        <View style={styles.destination}>
          <Text style={styles.destinationLabel}>
            Wahrscheinliches Rückgabeziel
          </Text>
          <Text style={styles.destinationName}>REWE</Text>
        </View>

        <View style={styles.confidence}>
          <Text style={styles.confidenceTitle}>Hohe Sicherheit</Text>
          <Text style={styles.confidenceText}>
            Demo: 2 erfolgreiche Rückgaben wurden erfasst.
          </Text>
        </View>

        <Text style={styles.note}>
          Die Annahme kann je nach Filiale abweichen.
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
  destination: {
    marginTop: 28,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  destinationLabel: {
    color: '#5D6C64',
    fontSize: 14,
  },
  destinationName: {
    color: '#173B32',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
  },
  confidence: {
    marginTop: 14,
    padding: 18,
    backgroundColor: '#DCE9DD',
    borderRadius: 8,
  },
  confidenceTitle: {
    color: '#173B32',
    fontSize: 17,
    fontWeight: '700',
  },
  confidenceText: {
    color: '#3F5C4D',
    fontSize: 14,
    marginTop: 6,
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
