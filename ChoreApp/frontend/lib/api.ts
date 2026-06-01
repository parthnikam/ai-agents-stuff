import type {
  AIParseResponse,
  Chore,
  ChoreCompletion,
  Project,
  Subtask,
  User,
} from "./types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const DEFAULT_CACHE_TTL_MS = 15_000

interface ApiCacheEntry {
  expiresAt: number
  value: unknown
}

interface ApiCacheOptions {
  force?: boolean
  ttlMs?: number
}

interface PBListResponse<T> {
  items: T[]
}

const apiCache = new Map<string, ApiCacheEntry>()
const inFlightGetRequests = new Map<string, Promise<unknown>>()

function createCacheKey(token: string, path: string) {
  return `${token}::${path}`
}

function invalidateApiCache(predicate?: (cacheKey: string) => boolean) {
  if (!predicate) {
    apiCache.clear()
    inFlightGetRequests.clear()
    return
  }

  for (const key of apiCache.keys()) {
    if (predicate(key)) {
      apiCache.delete(key)
    }
  }

  for (const key of inFlightGetRequests.keys()) {
    if (predicate(key)) {
      inFlightGetRequests.delete(key)
    }
  }
}

function invalidateApiByPathPrefixes(prefixes: string[]) {
  invalidateApiCache((key) => prefixes.some((prefix) => key.includes(`::${prefix}`)))
}

function unwrapPBList<T>(data: T[] | PBListResponse<T>): T[] {
  if (Array.isArray(data)) return data
  return data.items ?? []
}

async function apiFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {},
  cacheOptions: ApiCacheOptions = {}
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase()
  const shouldCache = method === "GET" && !cacheOptions.force
  const cacheKey = createCacheKey(token, path)
  const ttlMs = cacheOptions.ttlMs ?? DEFAULT_CACHE_TTL_MS

  if (shouldCache) {
    const cached = apiCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T
    }
    const inFlight = inFlightGetRequests.get(cacheKey)
    if (inFlight) {
      return inFlight as Promise<T>
    }
  }

  const requestPromise = (async () => {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })

    if (!res.ok) {
      let msg = `Request failed: ${res.status}`
      try {
        const body = await res.json()
        msg = body.detail ?? body.message ?? JSON.stringify(body)
      } catch {
        msg = await res.text()
      }
      throw new Error(msg)
    }

    if (res.status === 204) {
      return undefined as T
    }

    const contentType = res.headers.get("content-type") ?? ""
    const payload = contentType.includes("application/json")
      ? ((await res.json()) as T)
      : ((await res.text()) as T)

    if (shouldCache) {
      apiCache.set(cacheKey, {
        value: payload,
        expiresAt: Date.now() + ttlMs,
      })
    }

    return payload
  })()

  if (shouldCache) {
    inFlightGetRequests.set(cacheKey, requestPromise as Promise<unknown>)
  }

  try {
    return await requestPromise
  } finally {
    if (shouldCache) {
      inFlightGetRequests.delete(cacheKey)
    }
  }
}

// ── Chores ────────────────────────────────────────────────────────────────────

export interface ChoreFilters {
  project?: string
  assignee?: string
  status?: string
  column?: string
}

export function getChores(
  token: string,
  filters: ChoreFilters = {},
  options: ApiCacheOptions = {}
) {
  const params = new URLSearchParams()
  if (filters.project) params.set("project", filters.project)
  if (filters.assignee) params.set("assignee", filters.assignee)
  if (filters.status) params.set("status", filters.status)
  if (filters.column) params.set("column", filters.column)
  const qs = params.toString()
  return apiFetch<PBListResponse<Chore> | Chore[]>(
    `/chores${qs ? `?${qs}` : ""}`,
    token,
    {},
    options
  ).then(unwrapPBList)
}

export function getChore(token: string, id: string) {
  return apiFetch<Chore>(`/chores/${id}`, token)
}

export async function createChore(token: string, data: Partial<Chore>) {
  const chore = await apiFetch<Chore>("/chores", token, {
    method: "POST",
    body: JSON.stringify(data),
  })
  invalidateApiByPathPrefixes(["/chores", "/history"])
  return chore
}

export async function updateChore(token: string, id: string, data: Partial<Chore>) {
  const chore = await apiFetch<Chore>(`/chores/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
  invalidateApiByPathPrefixes(["/chores", "/history"])
  return chore
}

export async function deleteChore(token: string, id: string) {
  const result = await apiFetch<{ ok: boolean }>(`/chores/${id}`, token, { method: "DELETE" })
  invalidateApiByPathPrefixes(["/chores", "/history"])
  return result
}

export async function completeChore(token: string, id: string, notes?: string) {
  const result = await apiFetch<{ ok: boolean }>(`/chores/${id}/complete`, token, {
    method: "PATCH",
    body: JSON.stringify({ notes: notes ?? "" }),
  })
  invalidateApiByPathPrefixes(["/chores", "/history"])
  return result
}

export async function moveChore(token: string, id: string, column: string) {
  const result = await apiFetch<Chore>(`/chores/${id}/move`, token, {
    method: "PATCH",
    body: JSON.stringify({ column }),
  })
  invalidateApiByPathPrefixes(["/chores", "/history"])
  return result
}

// ── Subtasks ──────────────────────────────────────────────────────────────────

export function getSubtasks(
  token: string,
  choreId: string,
  options: ApiCacheOptions = {}
) {
  return apiFetch<PBListResponse<Subtask> | Subtask[]>(
    `/chores/${choreId}/subtasks`,
    token,
    {},
    options
  ).then(unwrapPBList)
}

export async function createSubtask(
  token: string,
  choreId: string,
  data: { title: string; order?: number }
) {
  const subtask = await apiFetch<Subtask>(`/chores/${choreId}/subtasks`, token, {
    method: "POST",
    body: JSON.stringify(data),
  })
  invalidateApiByPathPrefixes([`/chores/${choreId}/subtasks`, "/chores"])
  return subtask
}

export async function updateSubtask(
  token: string,
  choreId: string,
  subtaskId: string,
  data: Partial<Subtask>
) {
  const subtask = await apiFetch<Subtask>(`/chores/${choreId}/subtasks/${subtaskId}`, token, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
  invalidateApiByPathPrefixes([`/chores/${choreId}/subtasks`, "/chores"])
  return subtask
}

export async function deleteSubtask(
  token: string,
  choreId: string,
  subtaskId: string
) {
  const result = await apiFetch<{ ok: boolean }>(
    `/chores/${choreId}/subtasks/${subtaskId}`,
    token,
    { method: "DELETE" }
  )
  invalidateApiByPathPrefixes([`/chores/${choreId}/subtasks`, "/chores"])
  return result
}

// ── AI ────────────────────────────────────────────────────────────────────────

export function parseChoreAI(token: string, prompt: string) {
  return apiFetch<AIParseResponse>("/ai/parse-chore", token, {
    method: "POST",
    body: JSON.stringify({ prompt }),
  })
}

// ── History ───────────────────────────────────────────────────────────────────

export interface HistoryStats {
  by_day: Record<string, number>
  by_user: Record<string, number>
}

export function getHistory(
  token: string,
  range: "daily" | "weekly" | "monthly" = "weekly",
  options: ApiCacheOptions = {}
) {
  return apiFetch<PBListResponse<ChoreCompletion> | ChoreCompletion[]>(
    `/history?range=${range}`,
    token,
    {},
    options
  ).then(unwrapPBList)
}

export function getHistoryStats(token: string, options: ApiCacheOptions = {}) {
  return apiFetch<HistoryStats>("/history/stats", token, {}, options)
}

// ── Projects ──────────────────────────────────────────────────────────────────

export function getProjects(token: string, orgId: string) {
  return apiFetch<PBListResponse<Project> | Project[]>(
    `/projects?organization=${orgId}`,
    token
  ).then(unwrapPBList)
}

export async function createProject(token: string, data: Partial<Project>) {
  const project = await apiFetch<Project>("/projects", token, {
    method: "POST",
    body: JSON.stringify(data),
  })
  invalidateApiByPathPrefixes(["/projects"])
  return project
}

export async function updateProject(
  token: string,
  id: string,
  data: Partial<Project>
) {
  const project = await apiFetch<Project>(`/projects/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
  invalidateApiByPathPrefixes(["/projects"])
  return project
}

export async function deleteProject(token: string, id: string) {
  const result = await apiFetch<{ ok: boolean }>(`/projects/${id}`, token, { method: "DELETE" })
  invalidateApiByPathPrefixes(["/projects"])
  return result
}

// ── Notifications ─────────────────────────────────────────────────────────────

export function subscribePush(token: string, subscription: PushSubscriptionJSON) {
  const keys = subscription.keys ?? {}
  return apiFetch<void>("/notifications/subscribe", token, {
    method: "POST",
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: keys.p256dh ?? "",
        auth: keys.auth ?? "",
      },
      user_agent: navigator.userAgent,
    }),
  })
}

export function unsubscribePush(token: string, endpoint?: string) {
  const qs = endpoint ? `?endpoint=${encodeURIComponent(endpoint)}` : ""
  return apiFetch<void>(`/notifications/unsubscribe${qs}`, token, {
    method: "DELETE",
  })
}

export function sendTestPush(token: string) {
  return apiFetch<void>("/notifications/test", token, { method: "POST" })
}

// ── System/Admin ──────────────────────────────────────────────────────────────

export interface ApiHealthResponse {
  status: string
  pocketbase: string
}

export interface SchedulerJob {
  id: string
  next_run: string
  trigger: string
}

export function getApiHealth(token: string, options: ApiCacheOptions = {}) {
  return apiFetch<ApiHealthResponse>("/health", token, {}, options)
}

export function getSchedulerJobs(token: string, options: ApiCacheOptions = {}) {
  return apiFetch<SchedulerJob[]>("/scheduler/jobs", token, {}, options)
}

export async function triggerSchedulerJob(token: string, jobId: string) {
  const result = await apiFetch<{ ok: boolean; job_id: string }>(
    `/scheduler/trigger/${jobId}`,
    token,
    { method: "POST" }
  )
  invalidateApiByPathPrefixes(["/scheduler/jobs"])
  return result
}

// ── Users (via PocketBase direct) ────────────────────────────────────────────
// These use PocketBase REST API directly since FastAPI doesn't proxy user list.
const orgUsersCache = new Map<string, ApiCacheEntry>()
const orgUsersInFlight = new Map<string, Promise<User[]>>()

export async function getOrgUsers(
  pbUrl: string,
  token: string,
  orgId: string,
  options: ApiCacheOptions = {}
): Promise<User[]> {
  const cacheKey = `${token}::org-users::${orgId}`
  const shouldCache = !options.force
  const ttlMs = options.ttlMs ?? 30_000

  if (shouldCache) {
    const cached = orgUsersCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as User[]
    }
    const inFlight = orgUsersInFlight.get(cacheKey)
    if (inFlight) {
      return inFlight
    }
  }

  const requestPromise = (async () => {
    const res = await fetch(
      `${pbUrl}/api/collections/users/records?filter=(organization="${orgId}")&perPage=200`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) return []
    const data = await res.json()
    const users = (data.items ?? []).map((u: Record<string, unknown>) => ({
      id: u.id as string,
      email: u.email as string,
      name: (u.name ?? u.email) as string,
      avatar: u.avatar as string | undefined,
      organization: u.organization as string,
      is_admin: u.is_admin as boolean,
    }))

    if (shouldCache) {
      orgUsersCache.set(cacheKey, {
        value: users,
        expiresAt: Date.now() + ttlMs,
      })
    }

    return users
  })()

  if (shouldCache) {
    orgUsersInFlight.set(cacheKey, requestPromise)
  }

  try {
    return await requestPromise
  } finally {
    if (shouldCache) {
      orgUsersInFlight.delete(cacheKey)
    }
  }
}
