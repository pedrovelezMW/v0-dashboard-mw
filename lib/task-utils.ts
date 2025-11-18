import type { MobilityWorkTask, TaskStats } from "@/types/task"

export function isTaskLate(task: MobilityWorkTask): boolean {
  const now = new Date()
  const endDate = new Date(task.endDateTime)
  const startDate = new Date(task.startDateTime)

  // A task is late if its end time has passed, OR if it has started but not completed
  return (endDate < now || (startDate < now && task.status !== "completed")) && task.status !== "completed"
}

export function isTaskInNext48Hours(task: MobilityWorkTask): boolean {
  const now = new Date()
  const startDate = new Date(task.startDateTime)
  const hours48FromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000)
  return startDate >= now && startDate <= hours48FromNow
}

export function getNextTasks(tasks: MobilityWorkTask[], limit = 5): MobilityWorkTask[] {
  const now = new Date()
  return tasks
    .filter((task) => new Date(task.startDateTime) >= now && task.status !== "completed")
    .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
    .slice(0, limit)
}

export function categorizeTasksStats(tasks: MobilityWorkTask[]): TaskStats {
  const late = tasks.filter(isTaskLate)
  const next = getNextTasks(tasks)
  const upcoming48h = tasks.filter(isTaskInNext48Hours)

  return { late, next, upcoming48h }
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function getTimeUntil(dateString: string): string {
  const now = new Date()
  const target = new Date(dateString)
  const diffMs = target.getTime() - now.getTime()

  if (diffMs < 0) {
    const absDiffMs = Math.abs(diffMs)
    const hours = Math.floor(absDiffMs / (1000 * 60 * 60))
    if (hours < 24) return `${hours}h overdue`
    const days = Math.floor(hours / 24)
    return `${days}d overdue`
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  if (hours < 24) return `in ${hours}h`
  const days = Math.floor(hours / 24)
  return `in ${days}d`
}
