import { assertSupabaseReady } from "@/lib/supabase";

export async function deleteCurrentAccount(): Promise<void> {
  const { client } = assertSupabaseReady();
  const {
    data: { session },
    error: sessionError,
  } = await client.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session?.access_token) {
    throw new Error("Sign in again before deleting your account.");
  }

  const { error } = await client.functions.invoke("delete-account", {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw new Error(error.message || "Account deletion did not complete.");
  }
}
