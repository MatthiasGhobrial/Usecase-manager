import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function requireEnv(name: string): string {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`Missing required secret: ${name}`)
  return v
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  let token: string
  let owner: string
  let repo: string
  let branch: string
  let path: string
  try {
    token = requireEnv("GITHUB_TOKEN")
    owner = requireEnv("GITHUB_OWNER")
    repo = requireEnv("GITHUB_REPO")
    branch = Deno.env.get("GITHUB_BRANCH") || "main"
    path = Deno.env.get("GITHUB_FILE_PATH") || "data/usecases.json"
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }

  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "bluedolphin-usecase-editor",
  }
  const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`

  let body: { action?: string; data?: unknown; sha?: string | null }
  try {
    body = await req.json()
  } catch {
    return json({ error: "Invalid JSON body" }, 400)
  }

  if (body.action === "load") {
    const res = await fetch(`${contentsUrl}?ref=${encodeURIComponent(branch)}`, { headers: ghHeaders })
    if (res.status === 404) {
      return json({ data: null, sha: null })
    }
    if (!res.ok) {
      return json({ error: `GitHub load failed: ${res.status} ${await res.text()}` }, 502)
    }
    const file = await res.json()
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(file.content.replace(/\n/g, "")), (c) => c.charCodeAt(0))
    )
    let parsed: unknown
    try {
      parsed = JSON.parse(decoded)
    } catch {
      return json({ error: "File in repo is not valid JSON" }, 502)
    }
    return json({ data: parsed, sha: file.sha })
  }

  if (body.action === "save") {
    const content = btoa(
      String.fromCharCode(...new TextEncoder().encode(JSON.stringify(body.data, null, 2)))
    )
    const putBody: Record<string, unknown> = {
      message: `Update usecases (${new Date().toISOString()})`,
      content,
      branch,
    }
    if (body.sha) putBody.sha = body.sha

    const res = await fetch(contentsUrl, {
      method: "PUT",
      headers: { ...ghHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(putBody),
    })

    if (res.status === 409) {
      return json({ error: "conflict", message: "The file was changed by someone else. Reload and try again." }, 409)
    }
    if (!res.ok) {
      return json({ error: `GitHub save failed: ${res.status} ${await res.text()}` }, 502)
    }
    const result = await res.json()
    return json({ sha: result.content.sha, commitUrl: result.commit.html_url })
  }

  return json({ error: "Unknown action. Use 'load' or 'save'." }, 400)
})
