"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { TaskSection } from "@/components/task-section"
import { StatsCard } from "@/components/stats-card"
import { NewTaskNotification } from "@/components/new-task-notification"
import { Button } from "@/components/ui/button"
import { AlertCircle, Calendar, Clock, RefreshCw } from "lucide-react"
import type { TaskStats, MobilityWorkTask } from "@/types/task"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DashboardPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/tasks", fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
  })

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [newTasks, setNewTasks] = useState<MobilityWorkTask[]>([])
  const [previousTaskIds, setPreviousTaskIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!data?.stats) return

    const allCurrentTasks = [...(data.stats.late || []), ...(data.stats.next || []), ...(data.stats.upcoming48h || [])]

    const currentTaskIds = new Set(allCurrentTasks.map((t: MobilityWorkTask) => t.id))

    // Find tasks that are in current but not in previous
    const newlyAddedTasks = allCurrentTasks.filter((task: MobilityWorkTask) => !previousTaskIds.has(task.id))

    // Only show notifications if we have previous data (not on first load)
    if (previousTaskIds.size > 0 && newlyAddedTasks.length > 0) {
      setNewTasks((prev) => [...prev, ...newlyAddedTasks])
    }

    setPreviousTaskIds(currentTaskIds)
  }, [data])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await mutate()
    setIsRefreshing(false)
  }

  const dismissNotification = (taskId: string) => {
    setNewTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-lg font-semibold">Failed to load tasks</h2>
          <p className="mt-2 text-sm text-muted-foreground">Please try again later</p>
        </div>
      </div>
    )
  }

  const stats: TaskStats = data?.stats || { late: [], next: [], upcoming48h: [] }
  const totalTasks = data?.total || 0

  return (
    <div className="min-h-screen px-4 py-10">
      {newTasks.map((task, index) => (
        <div key={task.id} style={{ top: `${4 + index * 8}rem` }}>
          <NewTaskNotification task={task} onDismiss={() => dismissNotification(task.id)} />
        </div>
      ))}

      <div className="mx-auto max-w-6xl space-y-8 rounded-3xl border border-white/20 bg-white/10 p-6 text-foreground shadow-[0_35px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mobility Work Dashboard</h1>
            <p className="text-muted-foreground">Monitor and track your scheduled tasks</p>
          </div>
          <Button onClick={handleRefresh} disabled={isRefreshing || isLoading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Total Tasks" value={totalTasks} icon={Calendar} description="All scheduled tasks" />
          <StatsCard
            title="Late Tasks"
            value={stats.late.length}
            icon={AlertCircle}
            description="Overdue and pending"
            variant="destructive"
          />
          <StatsCard
            title="Next 48 Hours"
            value={stats.upcoming48h.length}
            icon={Clock}
            description="Tasks starting soon"
          />
          <StatsCard title="Upcoming" value={stats.next.length} icon={Calendar} description="Next 5 tasks" />
        </div>

        {/* Late Tasks Section */}
        {stats.late.length > 0 && (
          <TaskSection
            title="Late Tasks"
            description="Tasks that are overdue and need immediate attention"
            tasks={stats.late}
            emptyMessage="No late tasks"
          />
        )}

        {/* Next 48 Hours Section */}
        <TaskSection
          title="Next 48 Hours"
          description="Tasks scheduled to start within the next 48 hours"
          tasks={stats.upcoming48h}
          emptyMessage="No tasks scheduled in the next 48 hours"
        />

        {/* Next Tasks Section */}
        <TaskSection
          title="Upcoming Tasks"
          description="Next 5 tasks scheduled to start"
          tasks={stats.next}
          emptyMessage="No upcoming tasks"
        />

        {/* Setup Instructions */}
        {totalTasks === 0 && !isLoading && (
          <div className="rounded-lg border bg-card p-8">
            <h3 className="text-lg font-semibold mb-4">Setup Instructions</h3>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>To start monitoring tasks from Mobility Work:</p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>
                  Make sure your <strong className="text-foreground">MOBILITY_WORK_API_KEY</strong> is configured in the{" "}
                  <strong className="text-foreground">"Vars"</strong> section (left sidebar)
                </li>
                <li>
                  Click <strong className="text-foreground">"Publish"</strong> in the top right to deploy this app
                </li>
                <li>The dashboard will automatically fetch and display your tasks from Mobility Work</li>
              </ol>
              <p className="mt-4">
                Tasks are fetched every 30 seconds automatically. Click the Refresh button to update immediately.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
