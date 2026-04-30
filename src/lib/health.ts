import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import AppleHealthKit, {
  HealthInputOptions,
  HealthKitPermissions,
  HealthObserver,
  HealthStatusCode,
  HealthStatusResult,
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
      AppleHealthKit.Constants.Permissions.Workout,
    ],
    write: [],
  },
};

const HEALTHKIT_UNAVAILABLE_MESSAGE = "HealthKit is not available in this build. Rebuild the app after enabling HealthKit.";

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
  return Boolean(
    status?.permissions.write.some((permissionCode) => permissionCode === HealthStatusCode.SharingAuthorized),
  );
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
      console.warn("[HealthKit] Availability check skipped because platform is not iOS.", {
        platform: Platform.OS,
      });
      resolve(false);
      return;
    }

    AppleHealthKit.isAvailable((error, results) => {
      if (error) {
        console.error("[HealthKit] isAvailable failed.", {
          platform: Platform.OS,
          error: formatHealthKitError(error),
        });
      }

      console.log("[HealthKit] Availability result.", {
        platform: Platform.OS,
        available: Boolean(results),
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
        console.error("[HealthKit] getAuthStatus failed:", error);
        resolve(null);
        return;
      }

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
      permissions: HEALTHKIT_PERMISSIONS.permissions,
    });

    AppleHealthKit.initHealthKit(HEALTHKIT_PERMISSIONS, async (error) => {
      const isAuthorized = !error;

      if (error) {
        console.error("[HealthKit] initHealthKit failed.", {
          platform: Platform.OS,
          error: formatHealthKitError(error),
          permissions: HEALTHKIT_PERMISSIONS.permissions,
        });
      } else {
        console.log("[HealthKit] initHealthKit succeeded.", {
          platform: Platform.OS,
          permissions: HEALTHKIT_PERMISSIONS.permissions,
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
        resolve(0);
        return;
      }

      resolve(Math.round(results.value));
    });
  });
}

function getActiveEnergySamples(options: HealthInputOptions) {
  return new Promise<HealthValue[]>((resolve) => {
    AppleHealthKit.getActiveEnergyBurned(options, (error, results) => {
      if (error || !Array.isArray(results)) {
        resolve([]);
        return;
      }

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
          resolve([]);
          return;
        }

        resolve(results as unknown as HKWorkoutQueriedSampleType[]);
      },
    );
  });
}

export async function getHealthKitAuthorizationStatus() {
  const isAvailable = await checkAvailability();

  if (!isAvailable) {
    return false;
  }

  const [storedAuthorized, authStatus] = await Promise.all([getStoredAuthorization(), getAuthStatus()]);
  return storedAuthorized || isHealthStatusAuthorized(authStatus);
}

export async function initializeHealthKit() {
  const isAvailable = await checkAvailability();

  if (!isAvailable) {
    console.warn("[HealthKit] initializeHealthKit aborted because HealthKit is unavailable.", {
      platform: Platform.OS,
      available: false,
      permissions: HEALTHKIT_PERMISSIONS.permissions,
    });
    return false;
  }

  return initHealthKit();
}

export function getHealthKitUnavailableMessage() {
  return HEALTHKIT_UNAVAILABLE_MESSAGE;
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
