"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { AlertCircle, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
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

export default function DashboardPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/tasks", fetcher, {
    refreshInterval: 30000,
  })
  const [isRefreshing, setIsRefreshing] = useState(false)

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

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await mutate()
    setIsRefreshing(false)
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-50">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h2 className="mt-4 text-xl font-semibold">Impossible de charger les tâches</h2>
          <p className="mt-2 text-sm text-slate-400">Veuillez réessayer ultérieurement.</p>
        </div>
      </div>
    )
  }

  const kpiItems = [
    {
      label: "Tâches en retard",
      value: metrics.lateTasks.length,
      helper: "À traiter",
    },
    {
      label: "Tâches prévues aujourd'hui",
      value: metrics.scheduledToday.length,
      helper: "Planifiées",
    },
    {
      label: "Tâches complétées aujourd'hui",
      value: metrics.completedToday.length,
      helper: "Clôturées",
    },
    {
      label: "Nouvelles tâches aujourd'hui",
      value: metrics.createdToday.length,
      helper: "Reçues",
    },
  ]

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-50">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Shopfloor</p>
            <h1 className="text-4xl font-semibold leading-tight">Tableau de pilotage</h1>
            <p className="text-sm text-slate-400">Vue synthétique des interventions Mobility Work</p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            variant="outline"
            className="border-slate-700 bg-slate-900 text-slate-50 hover:bg-slate-800"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpiItems.map((item) => (
            <Card key={item.label} className="border-slate-800 bg-slate-900/60 text-slate-100">
              <CardHeader className="space-y-2">
                <CardTitle className="text-sm uppercase tracking-wide text-slate-400">{item.label}</CardTitle>
                <p className="text-5xl font-bold tracking-tight text-white">{item.value.toLocaleString("fr-FR")}</p>
                <p className="text-xs text-slate-500">{item.helper}</p>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="border-slate-800 bg-slate-900/70 text-slate-100 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">Tâches en retard</CardTitle>
              <p className="text-sm text-slate-500">Planifiées mais non réalisées. Triées des plus urgentes aux plus anciennes.</p>
            </CardHeader>
            <CardContent className="px-0">
              {lateTasks.length === 0 ? (
                <div className="px-6 pb-6 text-center text-sm text-slate-400">Aucune tâche en retard 🎉</div>
              ) : (
                <div className="overflow-hidden">
                  <div className="hidden grid-cols-[1.1fr_1.5fr_0.8fr_0.6fr_0.9fr_0.7fr] gap-3 px-6 pb-3 text-xs uppercase tracking-wide text-slate-400 lg:grid">
                    <span>Équipement</span>
                    <span>Description</span>
                    <span>Date planifiée</span>
                    <span className="text-center">Retard</span>
                    <span>Assigné à</span>
                    <span>État</span>
                  </div>
                  <div className="divide-y divide-slate-800">
                    {lateTasks.map((task) => (
                      <div
                        key={task.id}
                        className="grid grid-cols-1 gap-3 px-6 py-4 text-sm text-slate-200 lg:grid-cols-[1.1fr_1.5fr_0.8fr_0.6fr_0.9fr_0.7fr]"
                      >
                        <span className="font-semibold text-white">{task.equipmentName || task.equipment || "-"}</span>
                        <span className="text-slate-300">{truncate(task.description)}</span>
                        <span>{formatDate(task.scheduledAt || task.startDateTime)}</span>
                        <span className="text-center font-mono text-lg text-amber-300">{calculateDaysLate(task)} j</span>
                        <span>{task.assigneeName || "Non assignée"}</span>
                        <span>
                          <span className="rounded-full bg-slate-800/80 px-3 py-1 text-xs font-semibold uppercase text-slate-200">
                            {stateLabels[resolveTaskState(task)] || "Autre"}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="border-slate-800 bg-slate-900/70 text-slate-100">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold">Nouvelles tâches</CardTitle>
                <p className="text-sm text-slate-500">Créées aujourd'hui</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {newTasksToday.length === 0 ? (
                  <p className="text-center text-sm text-slate-400">Aucune nouvelle tâche aujourd'hui.</p>
                ) : (
                  newTasksToday.map((task) => (
                    <div key={task.id} className="rounded-xl border border-slate-800/60 p-4">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{formatDate(getCreatedAt(task))}</span>
                        <span>{formatTime(getCreatedAt(task))}</span>
                      </div>
                      <p className="mt-2 text-lg font-semibold text-white">{task.equipmentName || task.equipment || "Équipement"}</p>
                      <p className="text-sm text-slate-300">{truncate(task.description, 80)}</p>
                      <p className="mt-3 inline-flex rounded-full bg-slate-800/80 px-3 py-1 text-xs font-semibold uppercase text-slate-200">
                        {stateLabels[resolveTaskState(task)] || "Autre"}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {ongoingTasks.length > 0 && (
              <Card className="border-slate-800 bg-slate-900/70 text-slate-100">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">Tâches en cours</CardTitle>
                  <p className="text-sm text-slate-500">Suivi rapide des interventions démarrées</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ongoingTasks.map((task) => (
                    <div key={task.id} className="rounded-lg border border-slate-800/60 px-4 py-3">
                      <p className="text-base font-semibold text-white">{task.equipmentName || task.equipment || "-"}</p>
                      <p className="text-sm text-slate-400">{truncate(task.description, 70)}</p>
                      <p className="mt-2 text-xs text-slate-500">Démarrée : {formatTime(task.startedAt || task.startDateTime)}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
