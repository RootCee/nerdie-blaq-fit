import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

import {
  emptyOnboardingProfile,
  mapProfileToSupabaseRow,
  mapSupabaseRowToProfile,
} from "@/lib/onboarding-persistence";
import { ensureSupabaseSession, getOnboardingPersistenceConfig, supabase } from "@/lib/supabase";
import { OnboardingProfile, OnboardingState, SupabaseProfileRow } from "@/types/onboarding";

interface OnboardingStoreValue extends OnboardingState {
  updateProfile: (updates: Partial<OnboardingProfile>) => void;
  resetProfile: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const OnboardingStoreContext = createContext<OnboardingStoreValue | null>(null);

export function OnboardingStoreProvider({ children }: PropsWithChildren) {
  const persistenceConfig = getOnboardingPersistenceConfig();
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(null);
  const [state, setState] = useState<OnboardingState>({
    isComplete: false,
    profile: emptyOnboardingProfile,
    isHydrated: false,
    isSaving: false,
    storageMode: persistenceConfig.mode,
    error: null,
  });

  const refreshProfile = async () => {
    if (!persistenceConfig.isConfigured || !supabase) {
      setState((current) => ({
        ...current,
        isHydrated: true,
        storageMode: "local",
        error: null,
      }));
      return;
    }

    let sessionUserId: string;

    try {
      const session = await ensureSupabaseSession();

      if (!session?.user?.id) {
        throw new Error("Supabase authentication is configured, but no authenticated user was found.");
      }

      sessionUserId = session.user.id;
      setAuthenticatedUserId(sessionUserId);
    } catch (error) {
      setState((current) => ({
        ...current,
        isHydrated: true,
        storageMode: "supabase",
        error: error instanceof Error ? error.message : "Unable to authenticate with Supabase.",
      }));
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", sessionUserId)
      .maybeSingle();

    if (error) {
      setState((current) => ({
        ...current,
        isHydrated: true,
        storageMode: "supabase",
        error: error.message,
      }));
      return;
    }

    const profileRow = data as SupabaseProfileRow | null;

    if (!profileRow) {
      setState((current) => ({
        ...current,
        isHydrated: true,
        storageMode: "supabase",
        error: null,
      }));
      return;
    }

    setState({
      isComplete: profileRow.onboarding_completed,
      profile: mapSupabaseRowToProfile(profileRow),
      isHydrated: true,
      isSaving: false,
      storageMode: "supabase",
      error: null,
    });
  };

  useEffect(() => {
    void refreshProfile();
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticatedUserId(session?.user?.id ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<OnboardingStoreValue>(
    () => ({
      ...state,
      updateProfile: (updates) =>
        setState((current) => ({
          ...current,
          profile: {
            ...current.profile,
            ...updates,
          },
        })),
      resetProfile: async () => {
        if (persistenceConfig.isConfigured && supabase) {
          const session = await ensureSupabaseSession();
          const userId = session?.user?.id ?? authenticatedUserId;

          if (!userId) {
            throw new Error("Unable to resolve the authenticated Supabase user.");
          }

          const { error } = await supabase
            .from("profiles")
            .upsert(
              mapProfileToSupabaseRow(
                userId,
                emptyOnboardingProfile,
                false,
              ) as Record<string, unknown>,
              { onConflict: "id" },
            );

          if (error) {
            setState((current) => ({
              ...current,
              error: error.message,
            }));
            throw error;
          }
        }

        setState((current) => ({
          ...current,
          isComplete: false,
          profile: emptyOnboardingProfile,
          error: null,
        }));
      },
      completeOnboarding: async () => {
        if (!persistenceConfig.isConfigured || !supabase) {
          setState((current) => ({
            ...current,
            isComplete: true,
            storageMode: "local",
            error: null,
          }));
          return;
        }

        const session = await ensureSupabaseSession();
        const userId = session?.user?.id ?? authenticatedUserId;

        if (!userId) {
          throw new Error("Unable to resolve the authenticated Supabase user.");
        }

        setState((current) => ({
          ...current,
          isSaving: true,
          storageMode: "supabase",
          error: null,
        }));

        const payload = mapProfileToSupabaseRow(
          userId,
          state.profile,
          true,
        );

        const { error } = await supabase
          .from("profiles")
          .upsert(payload as Record<string, unknown>, { onConflict: "id" });

        if (error) {
          setState((current) => ({
            ...current,
            isSaving: false,
            storageMode: "supabase",
            error: "We couldn't save your setup right now. Please try again in a moment.",
          }));
          throw error;
        }

        setState((current) => ({
          ...current,
          isComplete: true,
          isSaving: false,
          storageMode: "supabase",
          error: null,
        }));
      },
      refreshProfile,
    }),
    [authenticatedUserId, persistenceConfig.isConfigured, state],
  );

  return <OnboardingStoreContext.Provider value={value}>{children}</OnboardingStoreContext.Provider>;
}

export function useOnboardingStore() {
  const context = useContext(OnboardingStoreContext);

  if (!context) {
    throw new Error("useOnboardingStore must be used within OnboardingStoreProvider");
  }

  return context;
}
