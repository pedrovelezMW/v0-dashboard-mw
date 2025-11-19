"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import useSWR from "swr"
import { AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  buildDashboardMetrics,
  calculateDaysLate,
  formatDate,
  formatTime,
  resolveTaskState,
} from "@/lib/dashboard-metrics"
import type { MobilityWorkTask } from "@/types/task"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const formatTimeSince = (date: Date | null, now: number) => {
  if (!date) return "Synchronisation en cours…"

  const diffSeconds = Math.max(0, Math.floor((now - date.getTime()) / 1000))

  if (diffSeconds < 5) return "Actualisé à l'instant"
  if (diffSeconds < 60) return `Actualisé il y a ${diffSeconds}s`

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `Actualisé il y a ${diffMinutes} min`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `Actualisé il y a ${diffHours} h`

  const diffDays = Math.floor(diffHours / 24)
  return `Actualisé il y a ${diffDays} j`
}

const stateLabels: Record<string, string> = {
  planned: "Planifiée",
  scheduled: "Planifiée",
  ongoing: "En cours",
  "in-progress": "En cours",
  completed: "Terminée",
  canceled: "Annulée",
  pending: "À traiter",
}

const truncate = (text: string, max = 60) => {
  if (!text) return "-"
  return text.length > max ? `${text.slice(0, max)}…` : text
}

const getCreatedAt = (task: MobilityWorkTask) =>
  task.createdAt || task.mobilityWorkData?.createdAt || task.startDateTime

const getScheduledAt = (task: MobilityWorkTask) =>
  task.scheduledAt ||
  task.mobilityWorkData?.scheduledAt ||
  task.mobilityWorkData?.schedule?.from ||
  task.startDateTime

export default function DashboardPage() {
  const { data, error } = useSWR("/api/tasks", fetcher, {
    refreshInterval: 30000,
  })
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [relativeNow, setRelativeNow] = useState(Date.now())
  const [taskNotifications, setTaskNotifications] = useState<MobilityWorkTask[]>([])
  const seenTaskIds = useRef<Set<string>>(new Set())
  const hasInitializedTasks = useRef(false)

  const tasks: MobilityWorkTask[] = data?.tasks || []

  const metrics = useMemo(() => buildDashboardMetrics(tasks), [tasks])

  const lateTasks = metrics.lateTasks.slice(0, 20)
  const newTasksToday = [...metrics.createdToday]
    .sort((a, b) => {
      const dateA = new Date(getCreatedAt(a)).getTime()
      const dateB = new Date(getCreatedAt(b)).getTime()
      return dateB - dateA
    })
    .slice(0, 10)
  const ongoingTasks = metrics.ongoingTasks.slice(0, 8)
  const todaysTasks = useMemo(() => {
    const relevantStates = new Set(["planned", "scheduled", "ongoing", "in-progress"])
    return [...metrics.scheduledToday]
      .filter((task) => relevantStates.has(resolveTaskState(task)))
      .sort((a, b) => {
        const dateA = new Date(getScheduledAt(a) || "").getTime()
        const dateB = new Date(getScheduledAt(b) || "").getTime()
        return dateA - dateB
      })
      .slice(0, 12)
  }, [metrics.scheduledToday])
  const plannedAndCompletedToday = metrics.plannedAndCompletedToday.length

  useEffect(() => {
    if (data?.tasks) {
      setLastUpdatedAt(new Date())
    }
  }, [data])

  useEffect(() => {
    const interval = setInterval(() => {
      setRelativeNow(Date.now())
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!tasks.length) return

    const seen = seenTaskIds.current
    const newlyCreated: MobilityWorkTask[] = []

    tasks.forEach((task) => {
      const rawId =
        task.id || task.mobilityWorkData?.id || `${task.equipmentName || task.equipment || "unknown"}-${getCreatedAt(task)}`
      const taskId = String(rawId)

      if (!seen.has(taskId)) {
        seen.add(taskId)
        if (hasInitializedTasks.current) {
          newlyCreated.push(task)
        }
      }
    })

    if (!hasInitializedTasks.current) {
      hasInitializedTasks.current = true
      return
    }

    if (newlyCreated.length > 0) {
      setTaskNotifications((prev) => [...prev, ...newlyCreated])
    }
  }, [tasks])

  useEffect(() => {
    if (taskNotifications.length === 0) return

    const timeout = setTimeout(() => {
      setTaskNotifications((prev) => prev.slice(1))
    }, 15000)

    return () => clearTimeout(timeout)
  }, [taskNotifications])

  const activeNotification = taskNotifications[0]
  const activeNotificationCreatedAt = activeNotification ? getCreatedAt(activeNotification) : undefined
  const lastUpdatedLabel = formatTimeSince(lastUpdatedAt, relativeNow)

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#EEF7FF] text-[#4D5870]">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-[#FF9D9D]" />
          <h2 className="mt-4 text-xl font-semibold">Impossible de charger les tâches</h2>
          <p className="mt-2 text-sm text-[#4D5870]/70">Veuillez réessayer ultérieurement.</p>
        </div>
      </div>
    )
  }

  const kpiItems = [
    {
      label: "Nouvelles tâches aujourd'hui",
      value: metrics.createdToday.length,
      helper: "Créées",
    },
    {
      label: "Tâches prévues aujourd'hui",
      value: metrics.scheduledToday.length,
      helper: "Planifiées",
    },
    {
      label: "Planifiées & réalisées aujourd'hui",
      value: plannedAndCompletedToday,
      helper: "Clôturées",
    },
    {
      label: "Tâches en retard",
      value: metrics.lateTasks.length,
      helper: "À traiter",
    },
  ]

  return (
    <div className="relative min-h-screen bg-[#EEF7FF] px-4 py-8 text-[#4D5870]">
      {activeNotification && (
        <div className="pointer-events-none fixed inset-x-0 top-8 z-50 flex justify-center px-4">
          <div className="w-full max-w-3xl rounded-3xl border-4 border-[#FF9D9D] bg-[#FFCECE] p-6 text-[#4D5870] shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.6em] text-[#4D5870]/70">Nouvelle tâche</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#2C7AF2]">
              {activeNotification.equipmentName || activeNotification.equipment || "Équipement"}
            </h2>
            <p className="mt-2 text-base font-medium text-[#4D5870]">
              {truncate(activeNotification.description, 120)}
            </p>
            <div className="mt-4 flex flex-col gap-2 text-sm font-semibold sm:flex-row sm:items-center sm:justify-between">
              <span>
                Créée le {activeNotificationCreatedAt ? formatDate(activeNotificationCreatedAt) : "-"} à{" "}
                {activeNotificationCreatedAt ? formatTime(activeNotificationCreatedAt) : "-"}
              </span>
              <span>Assignée à : {activeNotification.assigneeName || "Non assignée"}</span>
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#4D5870]/60">Shopfloor</p>
            <h1 className="text-4xl font-semibold leading-tight text-[#2C7AF2]">Tableau de pilotage</h1>
            <p className="text-sm text-[#4D5870]/70">Vue synthétique des interventions Mobility Work</p>
          </div>
          <div className="rounded-2xl border border-white/60 bg-white/70 px-5 py-3 text-sm text-[#4D5870]/80 shadow">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4D5870]/60">Synchronisation</p>
            <p className="text-base font-semibold text-[#2C7AF2]">{lastUpdatedLabel}</p>
            <p className="text-xs text-[#4D5870]/60">Rafraîchi automatiquement toutes les 30 s</p>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpiItems.map((item) => (
            <Card key={item.label} className="border-[#DDE7F0] bg-white text-[#4D5870]">
              <CardHeader className="space-y-2">
                <CardTitle className="text-sm uppercase tracking-wide text-[#4D5870]/70">{item.label}</CardTitle>
                <p className="text-5xl font-bold tracking-tight text-[#2C7AF2]">{item.value.toLocaleString("fr-FR")}</p>
                <p className="text-xs text-[#4D5870]/60">{item.helper}</p>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="flex flex-col gap-6">
            <Card className="border-[#DDE7F0] bg-white text-[#4D5870]">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold">Tâches du jour</CardTitle>
                <p className="text-sm text-[#4D5870]/70">Tâches planifiées ou en cours pour la plage « shift » du jour.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {todaysTasks.length === 0 ? (
                  <p className="text-center text-sm text-[#4D5870]/70">Aucune tâche prévue aujourd'hui.</p>
                ) : (
                  todaysTasks.map((task) => {
                    const scheduledDate = getScheduledAt(task)
                    return (
                      <div key={task.id} className="rounded-xl border border-[#EEF2FB] bg-[#F7F8FA] p-4">
                        <div className="flex items-center justify-between text-xs text-[#4D5870]/70">
                          <span>{formatDate(scheduledDate)}</span>
                          <span>{formatTime(scheduledDate)}</span>
                        </div>
                        <p className="mt-2 text-base font-semibold text-[#2C7AF2]">
                          {task.equipmentName || task.equipment || "Équipement"}
                        </p>
                        <p className="text-sm text-[#4D5870]">{truncate(task.description, 80)}</p>
                        <div className="mt-3 flex items-center justify-between text-xs">
                          <span className="inline-flex rounded-full bg-[#DDF6E6] px-3 py-1 font-semibold uppercase tracking-wide text-[#00DB2B]">
                            {stateLabels[resolveTaskState(task)] || "Autre"}
                          </span>
                          <span className="font-semibold text-[#57D2A5]">{task.assigneeName || "Non assignée"}</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            <Card className="border-[#DDE7F0] bg-white text-[#4D5870]">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold">Nouvelles tâches</CardTitle>
                <p className="text-sm text-[#4D5870]/70">Créées aujourd'hui</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {newTasksToday.length === 0 ? (
                  <p className="text-center text-sm text-[#4D5870]/70">Aucune nouvelle tâche aujourd'hui.</p>
                ) : (
                  newTasksToday.map((task) => (
                    <div key={task.id} className="rounded-xl border border-[#EEF2FB] bg-[#F7F8FA] p-4">
                      <div className="flex items-center justify-between text-xs text-[#4D5870]/70">
                        <span>{formatDate(getCreatedAt(task))}</span>
                        <span>{formatTime(getCreatedAt(task))}</span>
                      </div>
                      <p className="mt-2 text-lg font-semibold text-[#2C7AF2]">
                        {task.equipmentName || task.equipment || "Équipement"}
                      </p>
                      <p className="text-sm text-[#4D5870]">{truncate(task.description, 80)}</p>
                      <p className="mt-3 inline-flex rounded-full bg-[#DDF6E6] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#00DB2B]">
                        {stateLabels[resolveTaskState(task)] || "Autre"}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {ongoingTasks.length > 0 && (
              <Card className="border-[#DDE7F0] bg-white text-[#4D5870]">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">Tâches en cours</CardTitle>
                  <p className="text-sm text-[#4D5870]/70">Suivi rapide des interventions démarrées</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ongoingTasks.map((task) => (
                    <div key={task.id} className="rounded-lg border border-[#EEF2FB] bg-[#F7F8FA] px-4 py-3">
                      <p className="text-base font-semibold text-[#2C7AF2]">{task.equipmentName || task.equipment || "-"}</p>
                      <p className="text-sm text-[#4D5870]/80">{truncate(task.description, 70)}</p>
                      <p className="mt-2 text-xs text-[#4D5870]/70">Démarrée : {formatTime(task.startedAt || task.startDateTime)}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
          <Card className="border-[#DDE7F0] bg-white text-[#4D5870]">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">Tâches en retard</CardTitle>
              <p className="text-sm text-[#4D5870]/70">
                Planifiées mais non réalisées. Suivez le nombre de jours de retard accumulés.
              </p>
            </CardHeader>
            <CardContent className="px-0">
              {lateTasks.length === 0 ? (
                <div className="px-6 pb-6 text-center text-sm text-[#4D5870]/70">Aucune tâche en retard 🎉</div>
              ) : (
                <div className="overflow-hidden">
                  <div className="hidden grid-cols-[1.1fr_1.5fr_0.8fr_0.8fr_0.9fr_0.7fr] gap-3 px-6 pb-3 text-xs uppercase tracking-wide text-[#4D5870]/60 lg:grid">
                    <span>Équipement</span>
                    <span>Description</span>
                    <span>Date planifiée</span>
                    <span className="text-center">Retard</span>
                    <span>Assigné à</span>
                    <span>État</span>
                  </div>
                  <div className="divide-y divide-[#EEF2FB]">
                    {lateTasks.map((task) => {
                      const daysLate = calculateDaysLate(task)
                      const scheduledDate = getScheduledAt(task)

                      return (
                        <div
                          key={task.id}
                          className="grid grid-cols-1 gap-4 px-6 py-4 text-sm text-[#4D5870] lg:grid-cols-[1.1fr_1.5fr_0.8fr_0.8fr_0.9fr_0.7fr]"
                        >
                          <span className="font-semibold text-[#2C7AF2]">{task.equipmentName || task.equipment || "-"}</span>
                          <span className="text-[#4D5870]/80">{truncate(task.description)}</span>
                          <span className="text-[#4D5870]/80">{formatDate(scheduledDate)}</span>
                          <div className="flex flex-col items-center justify-center gap-1 text-center" title={`Planifiée le ${formatDate(scheduledDate)} à ${formatTime(scheduledDate)} • ${daysLate} jours de retard`}>
                            <span className="text-xs uppercase tracking-wide text-[#4D5870]/60">Jours</span>
                            <span className="text-2xl font-bold text-[#FF9D9D]">{daysLate}</span>
                          </div>
                          <span>{task.assigneeName || "Non assignée"}</span>
                          <span>
                            <span className="rounded-full bg-[#F7F8FA] px-3 py-1 text-xs font-semibold uppercase text-[#4D5870]">
                              {stateLabels[resolveTaskState(task)] || "Autre"}
                            </span>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
