import { Text } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { useOnboardingStore } from "@/store/onboarding-store";
import { colors } from "@/theme";

export default function MealsScreen() {
  const { profile } = useOnboardingStore();

  return (
    <Screen title="Meals" subtitle="Nutrition modules can evolve from preferences into plans, grocery lists, and coaching.">
      <SectionCard title="Nutrition profile" eyebrow="Personalized">
        <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
          Current dietary direction: {profile.dietaryPreference?.replace("-", " ") ?? "not selected yet"}.
        </Text>
      </SectionCard>
    </Screen>
  );
}
