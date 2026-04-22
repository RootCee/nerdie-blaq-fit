import { DarkTheme, Theme } from "@react-navigation/native";

export const colors = {
  background: "#050505",
  surface: "#111216",
  surfaceAlt: "#17191E",
  border: "#272A31",
  text: "#F4F4F5",
  textMuted: "#A1A1AA",
  primary: "#F97316",
  primarySoft: "#FDBA74",
  accent: "#14B8A6",
  accentSoft: "#5EEAD4",
  danger: "#FB7185",
  overlay: "rgba(0,0,0,0.35)",
};

export const appTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};
