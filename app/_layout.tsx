import { Stack } from 'expo-router';
import { NearbyBranchesProvider } from '../lib/nearby-branches';

export default function RootLayout() {
  return (
    <NearbyBranchesProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </NearbyBranchesProvider>
  );
}
