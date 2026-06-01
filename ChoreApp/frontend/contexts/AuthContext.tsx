"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import getPocketBase from "@/lib/pocketbase"
import type { User, Organization } from "@/lib/types"

interface AuthState {
  user: User | null
  token: string | null
  org: Organization | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [org, setOrg] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadOrg = useCallback(async (orgId: string, pbToken: string) => {
    const pb = getPocketBase()
    try {
      const record = await pb.collection("organizations").getOne(orgId, {
        headers: { Authorization: `Bearer ${pbToken}` },
      })
      setOrg({
        id: record.id,
        name: record.name as string,
        owner: record.owner as string,
        members: (record.members as string[]) ?? [],
      })
    } catch {
      // org load failure is non-fatal
    }
  }, [])

  const hydrateFromStore = useCallback(async () => {
    const pb = getPocketBase()
    if (pb.authStore.isValid && pb.authStore.record) {
      const record = pb.authStore.record
      const t = pb.authStore.token
      const u: User = {
        id: record.id,
        email: record.email as string,
        name: (record.name ?? record.email) as string,
        avatar: record.avatar as string | undefined,
        organization: record.organization as string,
        is_admin: record.is_admin as boolean,
      }
      setUser(u)
      setToken(t)
      if (u.organization) await loadOrg(u.organization, t)
    }
    setIsLoading(false)
  }, [loadOrg])

  useEffect(() => {
    hydrateFromStore()
    const pb = getPocketBase()
    const unsub = pb.authStore.onChange(() => {
      hydrateFromStore()
    })
    return () => unsub()
  }, [hydrateFromStore])

  const login = useCallback(
    async (email: string, password: string) => {
      const pb = getPocketBase()
      const authData = await pb
        .collection("users")
        .authWithPassword(email, password)
      const record = authData.record
      const t = pb.authStore.token
      const u: User = {
        id: record.id,
        email: record.email as string,
        name: (record.name ?? record.email) as string,
        avatar: record.avatar as string | undefined,
        organization: record.organization as string,
        is_admin: record.is_admin as boolean,
      }
      setUser(u)
      setToken(t)
      if (u.organization) await loadOrg(u.organization, t)
    },
    [loadOrg]
  )

  const logout = useCallback(() => {
    const pb = getPocketBase()
    pb.authStore.clear()
    setUser(null)
    setToken(null)
    setOrg(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const pb = getPocketBase()
    if (!pb.authStore.isValid) return
    try {
      await pb.collection("users").authRefresh()
      await hydrateFromStore()
    } catch {
      logout()
    }
  }, [hydrateFromStore, logout])

  return (
    <AuthContext.Provider
      value={{ user, token, org, isLoading, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
