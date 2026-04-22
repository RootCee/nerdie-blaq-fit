import { Text } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { SectionCard } from "@/components/ui/SectionCard";
import { colors } from "@/theme";

export default function LearnScreen() {
  return (
    <Screen title="Learn" subtitle="Education can live here as explainers, short-form lessons, and habit coaching.">
      <SectionCard title="Content shelf" eyebrow="Knowledge">
        <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
          This section is positioned for lessons on form, recovery, nutrition basics, and mindset.
        </Text>
      </SectionCard>
    </Screen>
  );
}
