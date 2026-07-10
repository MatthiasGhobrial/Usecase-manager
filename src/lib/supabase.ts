const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export interface GithubSyncResult<T = unknown> {
  status: number
  body: T & { error?: string; message?: string }
}

/**
 * Calls the save-to-github edge function directly (rather than
 * supabase.functions.invoke) so the real HTTP status code — in
 * particular 409 on a save conflict — is available to the caller.
 */
export async function callGithubSync<T = unknown>(
  body: Record<string, unknown>
): Promise<GithubSyncResult<T>> {
  const res = await fetch(`${supabaseUrl}/functions/v1/save-to-github`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, body: json }
}
