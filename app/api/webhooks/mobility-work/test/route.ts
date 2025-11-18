import { NextResponse } from "next/server"

// Simple test endpoint to verify the webhook route is accessible
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Webhook endpoint is accessible",
    timestamp: new Date().toISOString(),
    secretConfigured: !!process.env.MOBILITY_WORK_WEBHOOK_SECRET,
  })
}
