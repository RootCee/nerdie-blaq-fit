import { Platform } from "react-native";

export const REVENUECAT_ENTITLEMENT_ID = "pro";
export const REVENUECAT_PRODUCT_ID = "nerdie_blaq_fit_pro_monthly";

export function getRevenueCatApiKeyName() {
  if (Platform.OS === "android") {
    return "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY";
  }

  return "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY";
}

export function getRevenueCatApiKey() {
  if (Platform.OS === "ios") {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() ?? "";
  }

  if (Platform.OS === "android") {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() ?? "";
  }

  return "";
}

export function getRevenueCatConfig() {
  const apiKey = getRevenueCatApiKey();

  return {
    apiKey,
    isConfigured: Boolean(apiKey),
  };
}
