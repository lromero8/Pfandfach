import { useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { readScanHistory, type ScanHistoryItem } from './lib/scan-history';

export default function App() {
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      void readScanHistory().then(setHistory);
    }, []),
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>Pfandfach</Text>

        <View style={styles.intro}>
          <Text style={styles.title}>Wo gehört diese Flasche hin?</Text>
          <Text style={styles.subtitle}>
            Scanne dein Pfand, bevor du es in die richtige Tasche legst.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/camera')}
            style={({ pressed }) => [
              styles.scanButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.scanTitle}>Flasche scannen</Text>
            <Text style={styles.scanHint}>Mit der Kamera erfassen</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() =>
              setMessage('Die Fotoauswahl richten wir als Nächstes ein.')
            }
            style={({ pressed }) => [
              styles.uploadButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.uploadTitle}>Foto hochladen</Text>
            <Text style={styles.uploadHint}>Bild aus der Galerie wählen</Text>
          </Pressable>
        </View>

        {history.length > 0 ? (
          <View style={styles.history}>
            <Text style={styles.historyTitle}>Zuletzt gescannt</Text>
            {history.map((item) => (
              <Pressable
                key={item.barcode}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/report',
                    params: {
                      barcode: item.barcode,
                      productName: item.productName,
                      brand: item.brand,
                    },
                  })
                }
                style={({ pressed }) => [
                  styles.historyItem,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.historyText}>
                  <Text style={styles.historyName}>{item.productName}</Text>
                  {item.brand ? (
                    <Text style={styles.historyBrand}>{item.brand}</Text>
                  ) : null}
                </View>
                <Text style={styles.historyAction}>Melden</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {message ? <Text style={styles.message}>{message}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F1F4EC',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 54,
    paddingBottom: 32,
  },
  brand: {
    color: '#173B32',
    fontSize: 18,
    fontWeight: '800',
  },
  intro: {
    marginTop: 42,
    marginBottom: 24,
  },
  title: {
    color: '#173B32',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
  },
  subtitle: {
    color: '#5D6C64',
    fontSize: 16,
    marginTop: 10,
  },
  actions: {
    gap: 12,
  },
  scanButton: {
    minHeight: 88,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#173B32',
    borderRadius: 8,
  },
  scanTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  scanHint: {
    color: '#D7E7D2',
    fontSize: 14,
    marginTop: 4,
  },
  uploadButton: {
    minHeight: 76,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderColor: '#D8DED5',
    borderWidth: 1,
    borderRadius: 8,
  },
  uploadTitle: {
    color: '#173B32',
    fontSize: 17,
    fontWeight: '700',
  },
  uploadHint: {
    color: '#66736C',
    fontSize: 14,
    marginTop: 4,
  },
  history: {
    marginTop: 32,
  },
  historyTitle: {
    color: '#173B32',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
  },
  historyText: {
    flex: 1,
  },
  historyName: {
    color: '#173B32',
    fontSize: 15,
    fontWeight: '600',
  },
  historyBrand: {
    color: '#66736C',
    fontSize: 13,
    marginTop: 2,
  },
  historyAction: {
    color: '#31594B',
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
  message: {
    color: '#31594B',
    fontSize: 14,
    marginTop: 14,
  },
});
