import { ThemeProvider } from "@react-navigation/native";
import { useEffect } from "react";
import { Linking } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { handleAuthCallbackUrl } from "@/lib/social-auth";
import { OnboardingStoreProvider } from "@/store/onboarding-store";
import { appTheme } from "@/theme";

export default function RootLayout() {
  useEffect(() => {
    const processUrl = (url: string | null) => {
      if (url) {
        void handleAuthCallbackUrl(url);
      }
    };

    void Linking.getInitialURL().then(processUrl);

    const subscription = Linking.addEventListener("url", ({ url }) => {
      processUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

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
