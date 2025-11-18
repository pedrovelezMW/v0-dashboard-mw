import type { MobilityWorkTask } from "@/types/task"

const DAY_IN_MS = 24 * 60 * 60 * 1000

const getTodayRange = () => {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

const parseDate = (value?: string): Date | null => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

const getTaskDate = (task: MobilityWorkTask, key: "scheduledAt" | "createdAt" | "completedAt" | "startedAt"): string | undefined => {
  const direct = task[key]
  if (direct) return direct

  const fallback = task.mobilityWorkData?.[key]
  if (fallback) return fallback

  if (key === "scheduledAt") {
    return task.startDateTime
  }

  return undefined
}

const isWithinRange = (value: Date | null, start: Date, end: Date) => {
  if (!value) return false
  return value >= start && value <= end
}

export const resolveTaskState = (task: MobilityWorkTask) => {
  return (task.taskState || task.status || task.mobilityWorkData?.taskState || "").toString().toLowerCase()
}

export const calculateDaysLate = (task: MobilityWorkTask, now = new Date()) => {
  const scheduledDate = parseDate(getTaskDate(task, "scheduledAt"))
  if (!scheduledDate) return 0
  const diff = now.getTime() - scheduledDate.getTime()
  return diff > 0 ? Math.floor(diff / DAY_IN_MS) : 0
}

export const getLateTasks = (tasks: MobilityWorkTask[]) => {
  const now = new Date()
  return tasks
    .filter((task) => {
      const state = resolveTaskState(task)
      if (state === "completed" || state === "canceled") return false
      const scheduled = parseDate(getTaskDate(task, "scheduledAt"))
      if (!scheduled) return false
      return scheduled.getTime() < now.getTime()
    })
    .sort((a, b) => {
      const dateA = parseDate(getTaskDate(a, "scheduledAt"))?.getTime() ?? 0
      const dateB = parseDate(getTaskDate(b, "scheduledAt"))?.getTime() ?? 0
      return dateA - dateB
    })
}

export const getTasksScheduledToday = (tasks: MobilityWorkTask[]) => {
  const { start, end } = getTodayRange()
  return tasks.filter((task) => isWithinRange(parseDate(getTaskDate(task, "scheduledAt")), start, end))
}

export const getTasksCompletedToday = (tasks: MobilityWorkTask[]) => {
  const { start, end } = getTodayRange()
  return tasks.filter((task) => isWithinRange(parseDate(getTaskDate(task, "completedAt")), start, end))
}

export const getTasksCreatedToday = (tasks: MobilityWorkTask[]) => {
  const { start, end } = getTodayRange()
  return tasks.filter((task) => isWithinRange(parseDate(getTaskDate(task, "createdAt")), start, end))
}

export const getOngoingTasks = (tasks: MobilityWorkTask[]) => {
  return tasks.filter((task) => resolveTaskState(task) === "ongoing")
}

export const buildDashboardMetrics = (tasks: MobilityWorkTask[]) => {
  const lateTasks = getLateTasks(tasks)
  const scheduledToday = getTasksScheduledToday(tasks)
  const completedToday = getTasksCompletedToday(tasks)
  const createdToday = getTasksCreatedToday(tasks)
  const ongoingTasks = getOngoingTasks(tasks)

  return {
    lateTasks,
    scheduledToday,
    completedToday,
    createdToday,
    ongoingTasks,
  }
}

export const formatDate = (date?: string) => {
  const parsed = parseDate(date ?? "")
  if (!parsed) return "-"
  return parsed.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export const formatTime = (date?: string) => {
  const parsed = parseDate(date ?? "")
  if (!parsed) return "-"
  return parsed.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}
