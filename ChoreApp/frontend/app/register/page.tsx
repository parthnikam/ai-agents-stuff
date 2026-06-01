"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import getPocketBase from "@/lib/pocketbase"
import { useAuth } from "@/contexts/AuthContext"

type Step = "account" | "org"
type OrgMode = "create" | "join"

export default function RegisterPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState<Step>("account")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Account fields
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")

  // Org fields
  const [orgName, setOrgName] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [orgMode, setOrgMode] = useState<OrgMode>("create")

  function handleAccount(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }
    setError("")
    setStep("org")
  }

  async function handleOrg(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    const pb = getPocketBase()

    try {
      // 1. Create the user — PocketBase hook fires automatically and creates an
      //    org named "{name}'s Org", sets user.organization and user.is_admin
      await pb.collection("users").create({
        name,
        email,
        password,
        passwordConfirm: password,
      })

      // 2. Login to get an auth token
      await login(email, password)

      const authRecord = pb.authStore.record
      if (!authRecord) throw new Error("Auth failed after registration")

      if (orgMode === "create") {
        // The hook already created the org. Rename it if the user gave a name.
        const autoOrgId = authRecord.get("organization") as string | undefined
        if (autoOrgId && orgName.trim()) {
          try {
            await pb.collection("organizations").update(autoOrgId, {
              name: orgName.trim(),
            })
          } catch {
            // If rules aren't set yet (migration 002 not run), skip silently.
            // The org will keep its default name and can be managed later.
          }
        }
      } else {
        // Join an existing org by ID:
        // - Update the org's members list to include this user
        // - Point user.organization at the joined org
        const targetOrgId = joinCode.trim()
        if (!targetOrgId) throw new Error("Please enter an organization ID")

        // Fetch org to get current members list
        const org = await pb.collection("organizations").getOne(targetOrgId)
        const currentMembers: string[] = Array.isArray(org.members) ? org.members : []

        if (!currentMembers.includes(authRecord.id)) {
          await pb.collection("organizations").update(targetOrgId, {
            members: [...currentMembers, authRecord.id],
          })
        }

        await pb.collection("users").update(authRecord.id, {
          organization: targetOrgId,
        })
      }

      router.replace("/board")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ChoreApp</h1>
          <p className="mt-2 text-gray-500">
            {step === "account" ? "Create your account" : "Set up your organization"}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center mb-6">
          {(["account", "org"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                  step === s
                    ? "bg-indigo-600 text-white"
                    : s === "account" && step === "org"
                    ? "bg-indigo-100 text-indigo-600"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {i + 1}
              </div>
              {i === 0 && <div className="h-0.5 flex-1 bg-gray-200 mx-1" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-5">
              {error}
            </div>
          )}

          {step === "account" ? (
            <form onSubmit={handleAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Min. 8 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors mt-2"
              >
                Continue
              </button>
            </form>
          ) : (
            <form onSubmit={handleOrg} className="space-y-4">
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                {(["create", "join"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setOrgMode(m)}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      orgMode === m
                        ? "bg-indigo-600 text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {m === "create" ? "Create org" : "Join existing"}
                  </button>
                ))}
              </div>

              {orgMode === "create" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization name
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="My Household"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Leave blank to use the default name (can rename in Settings later).
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization ID
                  </label>
                  <input
                    type="text"
                    required
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Paste the org ID from Settings"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setStep("account"); setError("") }}
                  className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {submitting ? "Creating…" : "Get started"}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
