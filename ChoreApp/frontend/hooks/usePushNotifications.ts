"use client"

import { useState, useEffect, useCallback } from "react"
import { subscribePush, unsubscribePush } from "@/lib/api"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer as ArrayBuffer
}

export function usePushNotifications(token: string | null) {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setSupported("serviceWorker" in navigator && "PushManager" in window)
  }, [])

  useEffect(() => {
    if (!supported) return
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {})
  }, [supported])

  const subscribe = useCallback(async () => {
    if (!token || !supported) return
    if (!VAPID_PUBLIC_KEY) {
      setError("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY")
      return
    }
    setLoading(true)
    setError("")
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      await subscribePush(token, sub.toJSON())
      setSubscribed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to subscribe")
    } finally {
      setLoading(false)
    }
  }, [token, supported])

  const unsubscribe = useCallback(async () => {
    if (!token || !supported) return
    setLoading(true)
    setError("")
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
      await unsubscribePush(token, sub?.endpoint)
      setSubscribed(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unsubscribe")
    } finally {
      setLoading(false)
    }
  }, [token, supported])

  return { supported, subscribed, loading, error, subscribe, unsubscribe }
}
