import { NextResponse } from "next/server"
import { categorizeTasksStats } from "@/lib/task-utils"
import type { MobilityWorkTask } from "@/types/task"

export async function GET() {
  try {
    const apiKey = process.env.MOBILITY_WORK_API_KEY

    if (!apiKey) {
      console.error("[v0] MOBILITY_WORK_API_KEY not configured")
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    const now = new Date()
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const formatDateForAPI = (date: Date, isEndDate = false) => {
      const year = date.getUTCFullYear()
      const month = String(date.getUTCMonth() + 1).padStart(2, "0")
      const day = String(date.getUTCDate()).padStart(2, "0")
      const time = isEndDate ? "23:59:59" : "00:00:00"
      return `${year}-${month}-${day}T${time}+00:00`
    }

    const scheduledFrom = formatDateForAPI(lastWeek, false)
    const scheduledTo = formatDateForAPI(nextWeek, true)

    // Build API URL with query parameters
    const apiUrl = new URL("https://api.mobility-work.com/partners/v1/tasks/search")
    apiUrl.searchParams.set("page", "0")
    apiUrl.searchParams.set("size", "100") // Get more results per page
    apiUrl.searchParams.set("sort", "createdAt.desc")
    apiUrl.searchParams.set("scheduledFrom", scheduledFrom)
    apiUrl.searchParams.set("scheduledTo", scheduledTo)

    console.log("[v0] Fetching tasks from Mobility Work API...")
    console.log(`[v0] Date range: ${scheduledFrom} to ${scheduledTo}`)
    console.log(`[v0] API URL: ${apiUrl.toString()}`)

    let allTasks: any[] = []
    let nextUrl: string | null = apiUrl.toString()
    let pageCount = 0
    const maxPages = 50

    while (nextUrl && pageCount < maxPages) {
      const response = await fetch(nextUrl, {
        method: "GET",
        headers: {
          "Api-Key": apiKey,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        console.error("[v0] Mobility Work API error:", response.status, response.statusText)
        const errorText = await response.text()
        console.error("[v0] Error details:", errorText)
        return NextResponse.json(
          { error: `Mobility Work API error: ${response.statusText}` },
          { status: response.status },
        )
      }

      const data = await response.json()
      const pageTasks = data._items || []

      if (Array.isArray(pageTasks)) {
        allTasks = allTasks.concat(pageTasks)
        console.log(`[v0] Fetched page ${pageCount + 1}: ${pageTasks.length} tasks (total: ${allTasks.length})`)
      }

      nextUrl = data._links?.next?.href || null
      pageCount++
    }

    console.log(`[v0] Finished fetching ${allTasks.length} tasks across ${pageCount} pages`)

    const tasks: MobilityWorkTask[] = allTasks.map((task: any) => {
      const primaryAssignee = task.assignees?.individuals?.[0]
      const scheduledDate =
        task.schedule?.from ||
        task.scheduled?.on ||
        task.scheduledAt ||
        task.scheduledOn ||
        task.startDateTime ||
        task.createdAt ||
        new Date().toISOString()

      const endDate =
        task.schedule?.to ||
        task.endDateTime ||
        task.dueDateTime ||
        task.completedAt ||
        new Date(new Date(scheduledDate).getTime() + 2 * 60 * 60 * 1000).toISOString()

      console.log(`[v0] Task "${task.description}" scheduled: ${scheduledDate}`)

      return {
        id: task.taskId || task.taskShortId,
        title: task.description || "Untitled Task",
        description: task.description || "",
        status: task.taskState || task.status || "scheduled",
        taskState: task.taskState || task.status,
        startDateTime: scheduledDate,
        endDateTime: endDate,
        scheduledAt: scheduledDate,
        createdAt: task.createdAt,
        completedAt: task.completedAt || task.completed?.at,
        startedAt: task.startedAt || task.started?.at,
        assigneeName:
          task.assignedTo?.name ||
          (primaryAssignee ? `${primaryAssignee.firstName ?? ""} ${primaryAssignee.lastName ?? ""}`.trim() : undefined),
        assignees: task.assignees?.individuals || [],
        priority: task.priority || "medium",
        tags: task.tags || [],
        equipment: task.equipment?.id || task.associatedTo?.id,
        equipmentName: task.equipment?.name || task.associatedTo?.name,
        mobilityWorkData: task,
      }
    })

    console.log(`[v0] Mapped ${tasks.length} tasks`)

    const stats = categorizeTasksStats(tasks)

    return NextResponse.json({
      tasks,
      stats,
      total: tasks.length,
    })
  } catch (error) {
    console.error("[v0] Error fetching tasks:", error)
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}
