import PocketBase from "pocketbase"

const PB_URL = process.env.NEXT_PUBLIC_PB_URL || "http://localhost:8090"

// Singleton — reused across the app
let pb: PocketBase | null = null

export function getPocketBase(): PocketBase {
  if (!pb) {
    pb = new PocketBase(PB_URL)
    // Disable auto-cancellation so concurrent requests work correctly
    pb.autoCancellation(false)
  }
  return pb
}

export default getPocketBase
