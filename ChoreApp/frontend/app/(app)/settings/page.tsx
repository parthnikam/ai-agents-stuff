"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { usePushNotifications } from "@/hooks/usePushNotifications"
import {
  getApiHealth,
  getOrgUsers,
  getSchedulerJobs,
  sendTestPush,
  triggerSchedulerJob,
  type ApiHealthResponse,
  type SchedulerJob,
} from "@/lib/api"
import getPocketBase from "@/lib/pocketbase"
import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const PB_URL = process.env.NEXT_PUBLIC_PB_URL || "http://localhost:8090"

export default function SettingsPage() {
  const { user, org, token, refreshUser } = useAuth()
  const {
    supported,
    subscribed,
    loading: pushLoading,
    error: pushError,
    subscribe,
    unsubscribe,
  } = usePushNotifications(token)

  const [name, setName] = useState(user?.name ?? "")
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState("")

  const [orgUsers, setOrgUsers] = useState<User[]>([])
  const [testLoading, setTestLoading] = useState(false)
  const [testMsg, setTestMsg] = useState("")

  const [apiHealth, setApiHealth] = useState<ApiHealthResponse | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [jobs, setJobs] = useState<SchedulerJob[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [jobsMsg, setJobsMsg] = useState("")

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }
  }, [])

  useEffect(() => {
    setName(user?.name ?? "")
  }, [user?.name])

  useEffect(() => {
    if (!token || !org) return
    getOrgUsers(PB_URL, token, org.id).then(setOrgUsers).catch(() => {})
  }, [token, org])

  const loadHealth = useCallback(async () => {
    if (!token) return
    setHealthLoading(true)
    try {
      const status = await getApiHealth(token, { force: true, ttlMs: 5_000 })
      setApiHealth(status)
    } catch {
      setApiHealth(null)
    } finally {
      setHealthLoading(false)
    }
  }, [token])

  const loadSchedulerJobs = useCallback(async () => {
    if (!token || !user?.is_admin) return
    setJobsLoading(true)
    try {
      const data = await getSchedulerJobs(token, { force: true, ttlMs: 5_000 })
      setJobs(data)
    } catch {
      setJobs([])
    } finally {
      setJobsLoading(false)
    }
  }, [token, user?.is_admin])

  useEffect(() => {
    loadHealth()
  }, [loadHealth])

  useEffect(() => {
    loadSchedulerJobs()
  }, [loadSchedulerJobs])

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setSaveMsg("")
    const pb = getPocketBase()
    try {
      await pb.collection("users").update(user.id, { name: name.trim() })
      await refreshUser()
      setSaveMsg("Profile updated!")
    } catch {
      setSaveMsg("Update failed.")
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(""), 3000)
    }
  }

  async function handleTestPush() {
    if (!token) return
    setTestLoading(true)
    setTestMsg("")
    try {
      await sendTestPush(token)
      setTestMsg("Test notification sent!")
    } catch {
      setTestMsg("Failed to send test.")
    } finally {
      setTestLoading(false)
      setTimeout(() => setTestMsg(""), 4000)
    }
  }

  async function handleRunJob(jobId: string) {
    if (!token) return
    setJobsMsg("")
    try {
      await triggerSchedulerJob(token, jobId)
      setJobsMsg(`Triggered ${jobId}`)
      await loadSchedulerJobs()
    } catch (err) {
      setJobsMsg(err instanceof Error ? err.message : "Failed to trigger job")
    } finally {
      setTimeout(() => setJobsMsg(""), 4000)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <header className="px-6 py-5 border-b border-gray-200 bg-white">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </header>

      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="max-w-3xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveName} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={user?.email ?? ""}
                    disabled
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                  {saveMsg && (
                    <span className="text-sm text-emerald-600 font-medium">{saveMsg}</span>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Push notifications</CardTitle>
              <CardDescription>Get notified about upcoming and overdue chores.</CardDescription>
            </CardHeader>
            <CardContent>
              {!supported ? (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 text-sm">
                  Push notifications are not supported in this browser.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {subscribed ? "Notifications enabled" : "Notifications disabled"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {subscribed
                          ? "You'll receive push notifications for due chores."
                          : "Enable to get reminded about due chores."}
                      </p>
                    </div>
                    <button
                      onClick={subscribed ? unsubscribe : subscribe}
                      disabled={pushLoading}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                        subscribed ? "bg-indigo-600" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          subscribed ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  {pushError && (
                    <p className="text-xs text-red-600">{pushError}</p>
                  )}
                  {subscribed && (
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleTestPush}
                        disabled={testLoading}
                        variant="outline"
                        size="sm"
                      >
                        {testLoading ? "Sending…" : "Send test notification"}
                      </Button>
                      {testMsg && (
                        <span className="text-sm text-emerald-600 font-medium">{testMsg}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>System status</CardTitle>
                <CardDescription>Backend health and service availability.</CardDescription>
              </div>
              <Button onClick={loadHealth} variant="outline" size="sm" disabled={healthLoading}>
                {healthLoading ? "Refreshing…" : "Refresh"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="text-sm text-muted-foreground">API</span>
                <span className={`text-sm font-medium ${apiHealth ? "text-emerald-500" : "text-red-500"}`}>
                  {apiHealth ? apiHealth.status : "unreachable"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="text-sm text-muted-foreground">PocketBase</span>
                <span
                  className={`text-sm font-medium ${
                    apiHealth?.pocketbase === "reachable" ? "text-emerald-500" : "text-amber-500"
                  }`}
                >
                  {apiHealth?.pocketbase ?? "unknown"}
                </span>
              </div>
            </CardContent>
          </Card>

          {user?.is_admin && (
            <Card>
              <CardHeader>
                <CardTitle>Scheduler jobs</CardTitle>
                <CardDescription>Run backend scheduler jobs manually for troubleshooting.</CardDescription>
              </CardHeader>
              <CardContent>
                {jobsLoading ? (
                  <p className="text-sm text-gray-500">Loading jobs…</p>
                ) : jobs.length === 0 ? (
                  <p className="text-sm text-gray-500">No jobs found.</p>
                ) : (
                  <div className="space-y-2">
                    {jobs.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{job.id}</p>
                          <p className="text-xs text-gray-500 truncate">Next run: {job.next_run}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRunJob(job.id)}
                        >
                          Run now
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {jobsMsg && <p className="mt-3 text-sm text-indigo-500">{jobsMsg}</p>}
              </CardContent>
            </Card>
          )}

          {org && (
            <Card>
              <CardHeader>
                <CardTitle>Organization</CardTitle>
                <CardDescription>
                  <span className="font-medium">{org.name}</span> — {orgUsers.length}{" "}
                  {orgUsers.length === 1 ? "member" : "members"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Invite link
                  </p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={org.id}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-gray-50 text-gray-600 font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(org.id)}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Members</p>
                  <div className="space-y-2">
                    {orgUsers.map((u) => (
                      <div key={u.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm font-bold flex-shrink-0">
                          {u.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {u.name}
                            {u.is_admin && (
                              <span className="ml-2 text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">
                                Admin
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{u.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
