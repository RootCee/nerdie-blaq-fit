import { Text } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { colors } from "@/theme";

export default function ProgressScreen() {
  return (
    <Screen title="Progress" subtitle="This is the future home for measurements, streaks, PRs, adherence, and visual trends.">
      <SectionCard title="Metrics pipeline" eyebrow="Coming next">
        <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
          The app structure is ready for local logs first, then Supabase-backed analytics and progress history.
        </Text>
      </SectionCard>
    </Screen>
  );
}
