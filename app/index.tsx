import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

export default function IndexScreen() {
  const { isComplete, isHydrated } = useOnboardingStore();

  if (!isHydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <Redirect href={isComplete ? "/(tabs)" : "/onboarding"} />;
}
