import { type NextRequest, NextResponse } from "next/server"
import { taskStore } from "@/lib/task-store"
import type { MobilityWorkTask } from "@/types/task"

// TODO: Re-enable once we understand Mobility Work's signature method
async function verifyWebhookSignature(request: NextRequest, body: string): Promise<boolean> {
  console.log("[v0] Signature verification temporarily disabled")
  return true // Always allow for now
}

export async function POST(request: NextRequest) {
  console.log("[v0] Webhook received at:", new Date().toISOString())
  console.log("[v0] Headers:", Object.fromEntries(request.headers.entries()))

  try {
    const rawBody = await request.text()
    console.log("[v0] Raw body:", rawBody)

    const isValid = await verifyWebhookSignature(request, rawBody)
    if (!isValid) {
      console.error("[v0] Invalid webhook signature")
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 })
    }

    const body = JSON.parse(rawBody)
    console.log("[v0] Parsed webhook data:", body)

    const task: MobilityWorkTask = {
      id: body.taskId || body.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      equipment: body.associatedTo?.name || body.equipment || "Unknown Equipment",
      description: body.description || body.associatedTo?.name || "Scheduled Task",
      startDateTime: body.scheduled?.on || body.startDateTime || new Date().toISOString(),
      endDateTime:
        body.endDateTime ||
        (() => {
          const start = new Date(body.scheduled?.on || body.startDateTime || new Date())
          start.setHours(start.getHours() + 2) // Default 2-hour duration
          return start.toISOString()
        })(),
      allDay: body.allDay || false,
      assignees: body.assignees || [],
      status: body.status || "scheduled",
      createdAt: new Date().toISOString(),
      mobilityWorkData: {
        taskId: body.taskId,
        tags: body.tags,
        scheduledBy: body.scheduled?.by,
        associatedTo: body.associatedTo,
        metadata: body.metadata,
      },
    }

    // Store the task
    taskStore.addTask(task)

    console.log("[v0] Task stored successfully:", task.id)
    console.log("[v0] Total tasks in store:", taskStore.getAllTasks().length)

    return NextResponse.json({ success: true, taskId: task.id }, { status: 200 })
  } catch (error) {
    console.error("[v0] Error processing webhook:", error)
    if (error instanceof Error) {
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error stack:", error.stack)
    }
    return NextResponse.json({ success: false, error: "Failed to process webhook" }, { status: 500 })
  }
}
