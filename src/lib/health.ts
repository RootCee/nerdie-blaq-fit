import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import AppleHealthKit, {
  HealthInputOptions,
  HealthKitPermissions,
  HealthObserver,
  HealthStatusCode,
  HealthStatusResult,
  HealthUnit,
  HealthValue,
  HKWorkoutQueriedSampleType,
} from "react-native-health";

const HEALTH_AUTH_STORAGE_KEY = "healthkit-authorized";

const HEALTHKIT_PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.StepCount,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.RestingHeartRate,
      AppleHealthKit.Constants.Permissions.Weight,
      AppleHealthKit.Constants.Permissions.Workout,
    ],
    write: [],
  },
};

const HEALTHKIT_UNAVAILABLE_MESSAGE = "Apple Health is unavailable on this device. Use a real iPhone with Apple Health; HealthKit is not available in Expo Go, simulator-only builds, or unsupported iPad installs.";
let lastHealthKitDebugReason: string | null = null;

function formatHealthKitError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    raw: error,
    message: typeof error === "string" ? error : null,
  };
}

function stringifyHealthKitError(error: unknown) {
  if (!error) {
    return "none";
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(formatHealthKitError(error));
  } catch {
    return String(error);
  }
}

function setHealthKitDebugReason(reason: string | null) {
  lastHealthKitDebugReason = reason;
}

function getPermissionDebugList() {
  return {
    read: HEALTHKIT_PERMISSIONS.permissions.read,
    write: HEALTHKIT_PERMISSIONS.permissions.write,
  };
}

function hasNativeHealthKitModule() {
  return typeof AppleHealthKit.isAvailable === "function"
    && typeof AppleHealthKit.initHealthKit === "function"
    && typeof AppleHealthKit.getAuthStatus === "function";
}

function isIosHealthSupported() {
  return Platform.OS === "ios";
}

function getTodayRange(): Required<Pick<HealthInputOptions, "startDate" | "endDate">> {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  return {
    startDate: startOfDay.toISOString(),
    endDate: now.toISOString(),
  };
}

function isHealthStatusAuthorized(status: HealthStatusResult | null | undefined) {
  return Boolean(status?.permissions.read.some((permissionCode) => permissionCode === HealthStatusCode.SharingAuthorized));
}

function isHealthStatusPermissionDenied(status: HealthStatusResult | null | undefined) {
  return Boolean(status?.permissions.read.some((permissionCode) => permissionCode === HealthStatusCode.SharingDenied));
}

async function setStoredAuthorization(isAuthorized: boolean) {
  try {
    if (isAuthorized) {
      await AsyncStorage.setItem(HEALTH_AUTH_STORAGE_KEY, "true");
      return;
    }

    await AsyncStorage.removeItem(HEALTH_AUTH_STORAGE_KEY);
  } catch {
    // Ignore persistence failures so HealthKit access never blocks UI behavior.
  }
}

async function getStoredAuthorization() {
  try {
    return (await AsyncStorage.getItem(HEALTH_AUTH_STORAGE_KEY)) === "true";
  } catch {
    return false;
  }
}

function checkAvailability() {
  return new Promise<boolean>((resolve) => {
    if (!isIosHealthSupported()) {
      const reason = `Apple Health is only available on iOS. Current platform: ${Platform.OS}.`;
      setHealthKitDebugReason(reason);
      console.warn("[HealthKit] Availability check skipped because platform is not iOS.", {
        platform: Platform.OS,
        reason,
        permissions: getPermissionDebugList(),
      });
      resolve(false);
      return;
    }

    if (!hasNativeHealthKitModule()) {
      const reason = "react-native-health native module is not available in this binary. Install a fresh dev/prod build that includes the react-native-health config plugin and HealthKit entitlement.";
      setHealthKitDebugReason(reason);
      console.error("[HealthKit] Native module missing.", {
        platform: Platform.OS,
        reason,
        permissions: getPermissionDebugList(),
      });
      resolve(false);
      return;
    }

    AppleHealthKit.isAvailable((error, results) => {
      if (error) {
        const reason = `AppleHealthKit.isAvailable error: ${stringifyHealthKitError(error)}`;
        setHealthKitDebugReason(reason);
        console.error("[HealthKit] isAvailable failed.", {
          platform: Platform.OS,
          error: formatHealthKitError(error),
          reason,
          permissions: getPermissionDebugList(),
        });
      }

      if (!error) {
        setHealthKitDebugReason(
          results ? null : "AppleHealthKit.isAvailable returned false because iOS reported Health data is not available on this device/runtime.",
        );
      }

      console.log("[HealthKit] Availability result.", {
        platform: Platform.OS,
        available: Boolean(results),
        rawResult: results,
        permissions: getPermissionDebugList(),
      });
      resolve(Boolean(results));
    });
  });
}

export async function isHealthKitAvailable() {
  return checkAvailability();
}

function getAuthStatus() {
  return new Promise<HealthStatusResult | null>((resolve) => {
    if (!isIosHealthSupported()) {
      resolve(null);
      return;
    }

    AppleHealthKit.getAuthStatus(HEALTHKIT_PERMISSIONS, (error, results) => {
      if (error) {
        const reason = `AppleHealthKit.getAuthStatus error: ${stringifyHealthKitError(error)}`;
        setHealthKitDebugReason(reason);
        console.error("[HealthKit] getAuthStatus failed.", {
          platform: Platform.OS,
          error: formatHealthKitError(error),
          reason,
          permissions: getPermissionDebugList(),
        });
        resolve(null);
        return;
      }

      console.log("[HealthKit] getAuthStatus result.", {
        platform: Platform.OS,
        status: results,
        permissions: getPermissionDebugList(),
      });
      resolve(results);
    });
  });
}

function initHealthKit() {
  return new Promise<boolean>((resolve) => {
    if (!isIosHealthSupported()) {
      console.warn("[HealthKit] initHealthKit skipped because platform is not iOS.", {
        platform: Platform.OS,
      });
      resolve(false);
      return;
    }

    console.log("[HealthKit] initHealthKit requested.", {
      platform: Platform.OS,
      permissions: getPermissionDebugList(),
    });

    AppleHealthKit.initHealthKit(HEALTHKIT_PERMISSIONS, async (error) => {
      const isAuthorized = !error;

      if (error) {
        const reason = `AppleHealthKit.initHealthKit error: ${stringifyHealthKitError(error)}`;
        setHealthKitDebugReason(reason);
        console.error("[HealthKit] initHealthKit failed.", {
          platform: Platform.OS,
          error: formatHealthKitError(error),
          reason,
          permissions: getPermissionDebugList(),
        });
      } else {
        setHealthKitDebugReason(null);
        console.log("[HealthKit] initHealthKit success.", {
          platform: Platform.OS,
          permissions: getPermissionDebugList(),
        });
      }

      await setStoredAuthorization(isAuthorized);
      resolve(isAuthorized);
    });
  });
}

function getStepCount(options: HealthInputOptions) {
  return new Promise<number>((resolve) => {
    AppleHealthKit.getStepCount(options, (error, results) => {
      if (error || typeof results?.value !== "number") {
        console.log("[HealthKit] getStepCount result.", {
          value: 0,
          error: error ? formatHealthKitError(error) : null,
          rawResult: results,
        });
        resolve(0);
        return;
      }

      console.log("[HealthKit] getStepCount result.", {
        value: Math.round(results.value),
        error: null,
      });
      resolve(Math.round(results.value));
    });
  });
}

function getActiveEnergySamples(options: HealthInputOptions) {
  return new Promise<HealthValue[]>((resolve) => {
    AppleHealthKit.getActiveEnergyBurned(options, (error, results) => {
      if (error || !Array.isArray(results)) {
        console.log("[HealthKit] getActiveEnergyBurned result.", {
          sampleCount: 0,
          error: error ? formatHealthKitError(error) : null,
          rawResult: results,
        });
        resolve([]);
        return;
      }

      console.log("[HealthKit] getActiveEnergyBurned result.", {
        sampleCount: results.length,
        error: null,
      });
      resolve(results);
    });
  });
}

function getWorkoutSamples(options: HealthInputOptions) {
  return new Promise<HKWorkoutQueriedSampleType[]>((resolve) => {
    AppleHealthKit.getSamples(
      {
        ...options,
        type: HealthObserver.Workout,
      },
      (error, results) => {
        if (error || !Array.isArray(results)) {
          console.log("[HealthKit] getWorkoutSamples result.", {
            sampleCount: 0,
            error: error ? formatHealthKitError(error) : null,
            rawResult: results,
          });
          resolve([]);
          return;
        }

        console.log("[HealthKit] getWorkoutSamples result.", {
          sampleCount: results.length,
          error: null,
        });
        resolve(results as unknown as HKWorkoutQueriedSampleType[]);
      },
    );
  });
}

export interface HealthKitWeightSample {
  value: number;
  startDate: string;
  endDate: string;
}

export interface HealthKitSyncSnapshot {
  available: boolean;
  authorized: boolean;
  permissionDenied: boolean;
  steps: number;
  activeCalories: number;
  workoutsCompleted: number;
  latestWeight: HealthKitWeightSample | null;
  hasAnyData: boolean;
  debugReason: string | null;
}

function getLatestWeightSample() {
  return new Promise<HealthKitWeightSample | null>((resolve) => {
    AppleHealthKit.getLatestWeight({ unit: HealthUnit.pound }, (error, results) => {
      if (error) {
        console.error("[HealthKit] getLatestWeight failed.", {
          platform: Platform.OS,
          error: formatHealthKitError(error),
        });
        resolve(null);
        return;
      }

      if (!results || typeof results.value !== "number") {
        resolve(null);
        return;
      }

      resolve({
        value: Number(results.value.toFixed(1)),
        startDate: results.startDate,
        endDate: results.endDate,
      });
    });
  });
}

export async function getHealthKitAuthorizationStatus() {
  const isAvailable = await checkAvailability();

  if (!isAvailable) {
    return false;
  }

  return getStoredAuthorization();
}

export async function initializeHealthKit() {
  const isAvailable = await checkAvailability();

  if (!isAvailable) {
    console.warn("[HealthKit] initializeHealthKit aborted because HealthKit is unavailable.", {
      platform: Platform.OS,
      available: false,
      reason: lastHealthKitDebugReason,
      permissions: getPermissionDebugList(),
    });
    return false;
  }

  return initHealthKit();
}

export function getHealthKitUnavailableMessage() {
  return lastHealthKitDebugReason
    ? `${HEALTHKIT_UNAVAILABLE_MESSAGE} Reason: ${lastHealthKitDebugReason}`
    : HEALTHKIT_UNAVAILABLE_MESSAGE;
}

export function getHealthKitPermissionDeniedMessage() {
  return "Apple Health permissions were denied. Enable access in the Health app and try again.";
}

export function getHealthKitNoDataMessage() {
  return "No Apple Health data was found yet. Add data in Apple Health and try Recalibrate again.";
}

export function getHealthKitDebugReason() {
  return lastHealthKitDebugReason;
}

export async function getHealthKitSyncSnapshot(): Promise<HealthKitSyncSnapshot> {
  const isAvailable = await checkAvailability();

  if (!isAvailable) {
    return {
      available: false,
      authorized: false,
      permissionDenied: false,
      steps: 0,
      activeCalories: 0,
      workoutsCompleted: 0,
      latestWeight: null,
      hasAnyData: false,
      debugReason: lastHealthKitDebugReason,
    };
  }

  const authStatus = await getAuthStatus();
  const authorized = await getStoredAuthorization();
  const permissionDenied = !authorized && isHealthStatusPermissionDenied(authStatus);
  setHealthKitDebugReason(authorized ? null : "Apple Health has not been connected yet.");

  if (!authorized) {
    return {
      available: true,
      authorized: false,
      permissionDenied,
      steps: 0,
      activeCalories: 0,
      workoutsCompleted: 0,
      latestWeight: null,
      hasAnyData: false,
      debugReason: lastHealthKitDebugReason,
    };
  }

  const [steps, activeCalories, workoutsCompleted, latestWeight] = await Promise.all([
    getStepCount(getTodayRange()),
    getActiveEnergySamples({
      ...getTodayRange(),
      ascending: false,
    }).then((samples) =>
      Math.round(
        samples.reduce((sum, sample) => {
          return sum + (typeof sample.value === "number" ? sample.value : 0);
        }, 0),
      ),
    ),
    getWorkoutSamples({
      ...getTodayRange(),
      ascending: false,
    }).then((workouts) => workouts.length),
    getLatestWeightSample(),
  ]);

  return {
    available: true,
    authorized: true,
    permissionDenied: false,
    steps,
    activeCalories,
    workoutsCompleted,
    latestWeight,
    hasAnyData: steps > 0 || activeCalories > 0 || workoutsCompleted > 0 || latestWeight !== null,
    debugReason: lastHealthKitDebugReason,
  };
}

export async function getTodaySteps() {
  const isAuthorized = await getHealthKitAuthorizationStatus();

  if (!isAuthorized) {
    return 0;
  }

  return getStepCount(getTodayRange());
}

export async function getTodayActiveCalories() {
  const isAuthorized = await getHealthKitAuthorizationStatus();

  if (!isAuthorized) {
    return 0;
  }

  const samples = await getActiveEnergySamples({
    ...getTodayRange(),
    ascending: false,
  });

  const totalCalories = samples.reduce((sum, sample) => {
    return sum + (typeof sample.value === "number" ? sample.value : 0);
  }, 0);

  return Math.round(totalCalories);
}

export async function getTodayWorkouts() {
  const isAuthorized = await getHealthKitAuthorizationStatus();

  if (!isAuthorized) {
    return 0;
  }

  const workouts = await getWorkoutSamples({
    ...getTodayRange(),
    ascending: false,
  });

  return workouts.length;
}
