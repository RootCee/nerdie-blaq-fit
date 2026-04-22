import { ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { OnboardingStoreProvider } from "@/store/onboarding-store";
import { appTheme } from "@/theme";

export default function RootLayout() {
  return (
    <OnboardingStoreProvider>
      <ThemeProvider value={appTheme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="learn/[slug]" />
          <Stack.Screen name="exercise/[slug]" />
          <Stack.Screen name="workout-history/[dayId]" />
          <Stack.Screen name="workout-session/[dayId]" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </ThemeProvider>
    </OnboardingStoreProvider>
  );
}
