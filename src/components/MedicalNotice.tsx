import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/theme";

const CDC_BMI_URL = "https://www.cdc.gov/bmi/";
const WHO_BMI_URL = "https://www.who.int/tools/body-mass-index";

export const MEDICAL_DISCLAIMER =
  "This app provides fitness and wellness information for educational purposes only and is not medical advice. Consult a qualified healthcare professional before making health decisions.";

interface MedicalNoticeProps {
  includeBmiSources?: boolean;
}

export function MedicalNotice({ includeBmiSources = false }: MedicalNoticeProps) {
  const [linkError, setLinkError] = useState<string | null>(null);

  const openSource = async (url: string) => {
    setLinkError(null);

    try {
      await Linking.openURL(url);
    } catch {
      setLinkError("Source link could not be opened right now.");
    }
  };

  return (
    <View style={styles.notice}>
      <Text style={styles.noticeTitle}>Health information notice</Text>
      <Text style={styles.noticeText}>{MEDICAL_DISCLAIMER}</Text>
      {includeBmiSources ? (
        <View style={styles.sourceBlock}>
          <Text style={styles.noticeTitle}>BMI sources</Text>
          <View style={styles.sourceRow}>
            <Pressable onPress={() => void openSource(CDC_BMI_URL)} hitSlop={8}>
              <Text style={styles.sourceLink}>CDC BMI</Text>
            </Pressable>
            <Pressable onPress={() => void openSource(WHO_BMI_URL)} hitSlop={8}>
              <Text style={styles.sourceLink}>WHO BMI</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {linkError ? <Text style={styles.errorText}>{linkError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  noticeTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  noticeText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  sourceBlock: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  sourceRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  sourceLink: {
    color: colors.primarySoft,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 22,
    textDecorationLine: "underline",
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 18,
  },
});
