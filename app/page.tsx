"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import useSWR from "swr"
import Image from "next/image"
import { AlertCircle } from "lucide-react"
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

const fetcher = async ([url, apiKey]: [string, string]) => {
  const response = await fetch(url, {
    headers: {
      "x-api-key": apiKey,
    },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message = payload?.error || `Erreur ${response.status}`
    const error = new Error(message) as Error & { status?: number }
    error.status = response.status
    throw error
  }

  return response.json()
}

type Language = "fr" | "en"

const translations = {
  fr: {
    apiKeyTitle: "🔐 API KEY",
    apiKeySubtitle: "Configurer la connexion Mobility Work",
    apiKeyHelper: "Saisissez votre clé API pour activer la synchronisation des tâches.",
    apiKeyPlaceholder: "Votre clé API",
    apiKeyPrimary: "Activer la synchronisation",
    apiKeyReset: "Réinitialiser",
    apiKeyToggleHide: "Masquer",
    apiKeyToggleShow: "Afficher",
    tagFilterTitle: "🏷️ FILTRAGE PAR TAG",
    tagFilterHelper: "Affiche uniquement les tâches qui contiennent au moins un des tags indiqués (séparez par des virgules).",
    tagFilterPlaceholder: "Ex : Sécurité, Électrique",
    tagFilterApply: "Appliquer",
    tagFilterClear: "Effacer les tags",
    tagFilterEmpty: "Aucun filtre de tag actif. Toutes les tâches sont affichées.",
    mainHeaderBadge: "🏭 MAIN HEADER",
    mainHeaderTitle: "Shopfloor Visual Management",
    mainHeaderBody: "",
    syncBadge: "🔄 SYNCHRONISATION",
    syncTitle: "État de synchronisation",
    syncLastUpdate: "Dernière mise à jour :",
    syncAutoRefresh: "Actualisation automatique toutes les 30 secondes.",
    kpiBadge: "📊 DAILY KPIs",
    sectionsBadge: "🗂️ SECTIONS",
    kpiCreatedLabel: "Tâches créées aujourd'hui",
    kpiCreatedHelper: "Nouvelles tâches",
    kpiScheduledLabel: "Tâches planifiées aujourd'hui",
    kpiScheduledHelper: "Programmées pour le shift",
    kpiDoneLabel: "Tâches réalisées aujourd'hui",
    kpiDoneHelper: "Clôturées",
    kpiLateLabel: "Tâches en retard",
    kpiLateHelper: "À traiter en priorité",
    plannedTodayTitle: "Tâches du jour",
    plannedTodayHelper: "Toutes les tâches prévues aujourd'hui qui ne sont pas terminées.",
    plannedTodayEmpty: "Aucune tâche planifiée en attente aujourd'hui.",
    newInterventions: "Nouvelles tâches",
    newInterventionsHelper: "Tâches enregistrées aujourd'hui.",
    newInterventionsEmpty: "Aucune nouvelle tâche pour le moment.",
    ongoingTasksTitle: "Tâches en cours",
    ongoingTasksHelper: "Suivi rapide des tâches démarrées",
    startedLabel: "Démarrée :",
    lateTitle: "Retards de tâches",
    lateHelper: "Tâches programmées non réalisées. Suivi des retards accumulés.",
    lateEmpty: "Aucun retard à signaler 🎉",
    tableEquipment: "Équipement",
    tableDescription: "Description",
    tablePlannedDate: "Date planifiée",
    tableDelay: "Retard",
    tableAssignee: "Assigné à",
    tableStatus: "État",
    daysLabel: "Jours",
    unassigned: "Non assignée",
    defaultEquipment: "Équipement",
    statePlanned: "Planifiée",
    stateOngoing: "En cours",
    stateCompleted: "Terminée",
    stateCanceled: "Annulée",
    statePending: "À traiter",
    stateOther: "Autre",
    newTaskLabel: "Nouvelle tâche",
    createdOn: "Créée le",
    assignedTo: "Assignée à :",
    languageToggle: "Langue",
    syncInProgress: "Synchronisation en cours…",
    secondsAgo: "il y a quelques secondes",
    secondsAgoExact: (value: number) => `il y a ${value} secondes`,
    minutesAgo: (value: number) => `il y a ${value} minutes`,
    hoursAgo: (value: number) => `il y a ${value} heures`,
    daysAgo: (value: number) => `il y a ${value} jours`,
    atLabel: "à",
    plannedOn: "Planifiée le",
    lateSuffix: "de retard",
  },
  en: {
    apiKeyTitle: "🔐 API KEY",
    apiKeySubtitle: "Set up Mobility Work connection",
    apiKeyHelper: "Enter your API key to enable task sync.",
    apiKeyPlaceholder: "Your API key",
    apiKeyPrimary: "Enable sync",
    apiKeyReset: "Reset",
    apiKeyToggleHide: "Hide",
    apiKeyToggleShow: "Show",
    tagFilterTitle: "🏷️ TAG FILTER",
    tagFilterHelper: "Only show tasks that contain at least one of the provided tags (comma-separated).",
    tagFilterPlaceholder: "e.g. Safety, Electrical",
    tagFilterApply: "Apply",
    tagFilterClear: "Clear tags",
    tagFilterEmpty: "No active tag filter. All tasks are visible.",
    mainHeaderBadge: "🏭 MAIN HEADER",
    mainHeaderTitle: "Shopfloor Visual Management",
    mainHeaderBody: "",
    syncBadge: "🔄 SYNCHRONISATION",
    syncTitle: "Sync status",
    syncLastUpdate: "Last update:",
    syncAutoRefresh: "Auto-refresh every 30 seconds.",
    kpiBadge: "📊 DAILY KPIs",
    sectionsBadge: "🗂️ SECTIONS",
    kpiCreatedLabel: "Tasks created today",
    kpiCreatedHelper: "New tasks",
    kpiScheduledLabel: "Tasks scheduled today",
    kpiScheduledHelper: "Planned for the shift",
    kpiDoneLabel: "Tasks completed today",
    kpiDoneHelper: "Closed",
    kpiLateLabel: "Late tasks",
    kpiLateHelper: "Priority to handle",
    plannedTodayTitle: "Today's tasks",
    plannedTodayHelper: "Every task scheduled today that is not completed.",
    plannedTodayEmpty: "No pending task planned for today.",
    newInterventions: "New tasks",
    newInterventionsHelper: "Tasks recorded today.",
    newInterventionsEmpty: "No new task for now.",
    ongoingTasksTitle: "Ongoing tasks",
    ongoingTasksHelper: "Quick follow-up of started tasks",
    startedLabel: "Started:",
    lateTitle: "Delayed tasks",
    lateHelper: "Scheduled tasks not yet done. Tracking accumulated delays.",
    lateEmpty: "No delays to report 🎉",
    tableEquipment: "Equipment",
    tableDescription: "Description",
    tablePlannedDate: "Planned date",
    tableDelay: "Delay",
    tableAssignee: "Assigned to",
    tableStatus: "Status",
    daysLabel: "Days",
    unassigned: "Unassigned",
    defaultEquipment: "Equipment",
    statePlanned: "Planned",
    stateOngoing: "Ongoing",
    stateCompleted: "Completed",
    stateCanceled: "Canceled",
    statePending: "To process",
    stateOther: "Other",
    newTaskLabel: "New task",
    createdOn: "Created on",
    assignedTo: "Assigned to:",
    languageToggle: "Language",
    syncInProgress: "Sync in progress…",
    secondsAgo: "a few seconds ago",
    secondsAgoExact: (value: number) => `${value} seconds ago`,
    minutesAgo: (value: number) => `${value} minutes ago`,
    hoursAgo: (value: number) => `${value} hours ago`,
    daysAgo: (value: number) => `${value} days ago`,
    atLabel: "at",
    plannedOn: "Planned on",
    lateSuffix: "late",
  },
} as const

const formatTimeSince = (date: Date | null, now: number, language: Language) => {
  const t = translations[language]

  if (!date) return t.syncInProgress

  const diffSeconds = Math.max(0, Math.floor((now - date.getTime()) / 1000))

  if (diffSeconds < 5) return t.secondsAgo
  if (diffSeconds < 60) return typeof t.secondsAgoExact === "function" ? t.secondsAgoExact(diffSeconds) : t.secondsAgo

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60 && typeof t.minutesAgo === "function") return t.minutesAgo(diffMinutes)

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24 && typeof t.hoursAgo === "function") return t.hoursAgo(diffHours)

  const diffDays = Math.floor(diffHours / 24)
  if (typeof t.daysAgo === "function") return t.daysAgo(diffDays)

  return t.syncInProgress
}

const stateLabels: Record<Language, Record<string, string>> = {
  fr: {
    planned: translations.fr.statePlanned,
    scheduled: translations.fr.statePlanned,
    ongoing: translations.fr.stateOngoing,
    "in-progress": translations.fr.stateOngoing,
    completed: translations.fr.stateCompleted,
    canceled: translations.fr.stateCanceled,
    pending: translations.fr.statePending,
  },
  en: {
    planned: translations.en.statePlanned,
    scheduled: translations.en.statePlanned,
    ongoing: translations.en.stateOngoing,
    "in-progress": translations.en.stateOngoing,
    completed: translations.en.stateCompleted,
    canceled: translations.en.stateCanceled,
    pending: translations.en.statePending,
  },
}

const formatDelayTooltip = (dateLabel: string, timeLabel: string, daysLate: number, language: Language) => {
  const t = translations[language]
  const delayPart = `${daysLate} ${t.daysLabel.toLowerCase()} ${language === "fr" ? t.lateSuffix : t.lateSuffix}`
  return `${t.plannedOn} ${dateLabel} ${t.atLabel} ${timeLabel} • ${delayPart}`
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
  const [language, setLanguage] = useState<Language>("fr")
  const [apiKey, setApiKey] = useState("")
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [isEditingApiKey, setIsEditingApiKey] = useState(false)
  const [hasLoadedStoredKey, setHasLoadedStoredKey] = useState(false)
  const [showApiConfig, setShowApiConfig] = useState(true)
  const [tagFilterInput, setTagFilterInput] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const { data, error } = useSWR(apiKey ? ["/api/tasks", apiKey] : null, fetcher, {
    refreshInterval: apiKey ? 30000 : 0,
  })
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [relativeNow, setRelativeNow] = useState(Date.now())
  const [taskNotifications, setTaskNotifications] = useState<MobilityWorkTask[]>([])
  const seenTaskIds = useRef<Set<string>>(new Set())
  const hasInitializedTasks = useRef(false)
  const locale = language === "fr" ? "fr-FR" : "en-US"
  const t = translations[language]

  useEffect(() => {
    const storedKey = localStorage.getItem("mobilityWorkApiKey") || ""
    setApiKey(storedKey)
    setApiKeyInput("")
    setHasLoadedStoredKey(true)

    const storedLanguage = (localStorage.getItem("dashboardLanguage") as Language | null) || "fr"
    setLanguage(storedLanguage)

    const storedTags = localStorage.getItem("dashboardTags")
    if (storedTags) {
      try {
        const parsed = JSON.parse(storedTags)
        if (Array.isArray(parsed)) {
          setSelectedTags(parsed.filter((tag) => typeof tag === "string"))
        }
      } catch (error) {
        console.error("[v0] Failed to parse stored tags", error)
      }
    }
  }, [])

  useEffect(() => {
    if (!hasLoadedStoredKey) return

    if (apiKey) {
      localStorage.setItem("mobilityWorkApiKey", apiKey)
    } else {
      localStorage.removeItem("mobilityWorkApiKey")
    }
  }, [apiKey, hasLoadedStoredKey])

  useEffect(() => {
    localStorage.setItem("dashboardLanguage", language)
  }, [language])

  useEffect(() => {
    localStorage.setItem("dashboardTags", JSON.stringify(selectedTags))
  }, [selectedTags])

  const normalizedSelectedTags = useMemo(
    () => selectedTags.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
    [selectedTags],
  )

  const tasks: MobilityWorkTask[] = useMemo(() => {
    const sourceTasks: MobilityWorkTask[] = data?.tasks || []

    if (normalizedSelectedTags.length === 0) return sourceTasks

    return sourceTasks.filter((task) => {
      const taskTags = (task.tags || [])
        .flatMap((tag) => [tag.name, tag.code])
        .filter(Boolean)
        .map((tag) => tag.trim().toLowerCase())

      if (taskTags.length === 0) return false

      return normalizedSelectedTags.some((selectedTag) => taskTags.includes(selectedTag))
    })
  }, [data?.tasks, normalizedSelectedTags])

  const handleSaveApiKey = () => {
    const trimmed = apiKeyInput.trim()
    if (!trimmed) return

    setApiKey(trimmed)
    setApiKeyInput("")
    setIsEditingApiKey(false)
  }

  const handleClearApiKey = () => {
    setApiKey("")
    setApiKeyInput("")
    setIsEditingApiKey(false)
  }

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
  const plannedTodayTasks = useMemo(() => {
    const excludedStates = new Set(["completed", "canceled"])
    return [...metrics.scheduledToday]
      .filter((task) => !excludedStates.has(resolveTaskState(task)))
      .sort((a, b) => {
        const dateA = new Date(getScheduledAt(a) || "").getTime()
        const dateB = new Date(getScheduledAt(b) || "").getTime()
        return dateA - dateB
      })
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
    const now = Date.now()
    const fiveMinutesAgo = now - 5 * 60 * 1000

    tasks.forEach((task) => {
      const rawId =
        task.id || task.mobilityWorkData?.id || `${task.equipmentName || task.equipment || "unknown"}-${getCreatedAt(task)}`
      const taskId = String(rawId)

      if (!seen.has(taskId)) {
        seen.add(taskId)
        if (hasInitializedTasks.current) {
          const createdAt = getCreatedAt(task)
          const createdAtDate = createdAt ? new Date(createdAt) : null
          const createdAtTime = createdAtDate?.getTime()

          if (createdAtTime && !Number.isNaN(createdAtTime) && createdAtTime >= fiveMinutesAgo) {
            newlyCreated.push(task)
          }
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
  const lastUpdatedLabel = formatTimeSince(lastUpdatedAt, relativeNow, language)

  const hasApiKey = Boolean(apiKey)
  const errorMessage = error instanceof Error ? error.message : null

  const kpiItems = [
    { label: t.kpiCreatedLabel, value: metrics.createdToday.length, helper: t.kpiCreatedHelper },
    { label: t.kpiScheduledLabel, value: metrics.scheduledToday.length, helper: t.kpiScheduledHelper },
    { label: t.kpiDoneLabel, value: plannedAndCompletedToday, helper: t.kpiDoneHelper },
    { label: t.kpiLateLabel, value: metrics.lateTasks.length, helper: t.kpiLateHelper },
  ]

  const maskedApiKeyDisplay = hasApiKey && !isEditingApiKey ? "********" : apiKeyInput

  const handleAddTagsFromInput = () => {
    const parts = tagFilterInput
      .split(/[,;]/)
      .map((part) => part.trim())
      .filter(Boolean)

    if (parts.length === 0) return

    setSelectedTags((prev) => {
      const existing = new Set(prev.map((tag) => tag.trim().toLowerCase()))
      const next = [...prev]

      parts.forEach((part) => {
        const normalized = part.toLowerCase()
        if (!existing.has(normalized)) {
          existing.add(normalized)
          next.push(part)
        }
      })

      return next
    })

    setTagFilterInput("")
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const normalized = tagToRemove.trim().toLowerCase()
    setSelectedTags((prev) => prev.filter((tag) => tag.trim().toLowerCase() !== normalized))
  }

  const handleClearTags = () => {
    setSelectedTags([])
    setTagFilterInput("")
  }

  return (
    <div className="relative min-h-screen bg-[#EEF7FF] px-4 py-8 text-[#4D5870]">
      {activeNotification && (
        <div className="pointer-events-none fixed inset-x-0 top-6 z-50 flex justify-center px-4">
          <div
            className="w-full max-w-5xl scale-[1.2] rounded-[28px] border-[6px] border-[#FF9D9D] bg-[#FFCECE] p-10 text-[#4D5870] shadow-2xl"
            style={{ transformOrigin: "top center" }}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.6em] text-[#4D5870]/70">{t.newTaskLabel}</p>
            <h2 className="mt-4 text-5xl font-black leading-tight text-[#2C7AF2]">
              {activeNotification.equipmentName || activeNotification.equipment || t.defaultEquipment}
            </h2>
            <p className="mt-4 text-2xl font-semibold text-[#4D5870]">
              {truncate(activeNotification.description, 180)}
            </p>
            <div className="mt-6 flex flex-col gap-3 text-lg font-semibold sm:flex-row sm:items-center sm:justify-between">
              <span>
                {t.createdOn} {activeNotificationCreatedAt ? formatDate(activeNotificationCreatedAt) : "-"} {t.atLabel}{" "}
                {activeNotificationCreatedAt ? formatTime(activeNotificationCreatedAt) : "-"}
              </span>
              <span>
                {t.assignedTo} {activeNotification.assigneeName || t.unassigned}
              </span>
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-7xl space-y-8">

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex items-center justify-center rounded-2xl border border-white/60 bg-white/80 p-6 shadow">
            <div className="relative h-24 w-full overflow-hidden rounded-xl bg-white/80 shadow-sm ring-1 ring-[#DDE7F0]/70">
              <Image
                src="/Logo%20Mobility%20Work@2x%20(1).png"
                alt="Mobility Work logo"
                fill
                sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
                className="object-contain"
                priority
              />
            </div>
          </div>
          <div className="rounded-2xl border border-white/60 bg-white/70 p-4 text-sm text-[#4D5870]/80 shadow">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#4D5870]/60">{t.apiKeyTitle}</p>
                <p className="text-sm font-semibold text-[#4D5870]">{t.apiKeySubtitle}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowApiConfig((current) => !current)}
                className="min-w-[120px] text-[#4D5870]"
              >
                {showApiConfig ? t.apiKeyToggleHide : t.apiKeyToggleShow}
              </Button>
            </div>
            {showApiConfig && (
              <div className="mt-3 flex flex-col gap-3">
                <p className="text-sm text-[#4D5870]/70">{t.apiKeyHelper}</p>
                {errorMessage && (
                  <div className="inline-flex items-center gap-2 rounded-lg bg-[#FFCECE] px-3 py-2 text-xs font-semibold text-[#4D5870]">
                    <AlertCircle className="h-4 w-4 text-[#FF9D9D]" />
                    <span>{errorMessage}</span>
                  </div>
                )}
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="password"
                    className="w-full rounded-lg border border-[#DDE7F0] bg-[#F7F8FA] px-3 py-2 text-sm text-[#4D5870] shadow-inner focus:border-[#2C7AF2] focus:outline-none"
                    placeholder={t.apiKeyPlaceholder}
                    value={maskedApiKeyDisplay}
                    onFocus={() => {
                      if (!isEditingApiKey) {
                        setIsEditingApiKey(true)
                        setApiKeyInput("")
                      }
                    }}
                    onChange={(event) => {
                      setIsEditingApiKey(true)
                      setApiKeyInput(event.target.value)
                    }}
                    onBlur={() => {
                      if (!apiKeyInput.trim() && hasApiKey) {
                        setIsEditingApiKey(false)
                        setApiKeyInput("")
                      }
                    }}
                    autoComplete="off"
                  />
                  <div className="flex flex-wrap justify-end gap-2 sm:justify-start">
                    <Button onClick={handleSaveApiKey} disabled={!apiKeyInput.trim()}>
                      {t.apiKeyPrimary}
                    </Button>
                    {hasApiKey && (
                      <Button variant="ghost" onClick={handleClearApiKey} className="text-[#4D5870]">
                        {t.apiKeyReset}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2 rounded-lg border border-[#EEF2FB] bg-[#F7F8FA] p-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4D5870]/60">{t.tagFilterTitle}</p>
                      <p className="text-sm text-[#4D5870]/70">{t.tagFilterHelper}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      className="w-full rounded-lg border border-[#DDE7F0] bg-white px-3 py-2 text-sm text-[#4D5870] shadow-inner focus:border-[#2C7AF2] focus:outline-none"
                      placeholder={t.tagFilterPlaceholder}
                      value={tagFilterInput}
                      onChange={(event) => setTagFilterInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          handleAddTagsFromInput()
                        }
                      }}
                    />
                    <div className="flex flex-wrap justify-end gap-2 sm:justify-start">
                      <Button onClick={handleAddTagsFromInput} disabled={!tagFilterInput.trim()}>
                        {t.tagFilterApply}
                      </Button>
                      {selectedTags.length > 0 && (
                        <Button variant="ghost" onClick={handleClearTags} className="text-[#4D5870]">
                          {t.tagFilterClear}
                        </Button>
                      )}
                    </div>
                  </div>
                  {selectedTags.length === 0 ? (
                    <p className="text-xs text-[#4D5870]/70">{t.tagFilterEmpty}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2C7AF2] shadow"
                        >
                          {tag}
                          <button
                            type="button"
                            className="text-[#4D5870]/70 transition hover:text-[#2C7AF2]"
                            onClick={() => handleRemoveTag(tag)}
                            aria-label={`Remove tag ${tag}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-white/60 bg-white/70 px-5 py-3 text-sm text-[#4D5870]/80 shadow">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4D5870]/60">{t.syncBadge}</p>
            <p className="text-base font-semibold text-[#2C7AF2]">{t.syncTitle}</p>
            <p className="text-sm text-[#4D5870]">{t.syncLastUpdate} {lastUpdatedLabel}</p>
            <p className="text-xs text-[#4D5870]/60">{t.syncAutoRefresh}</p>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/60 bg-white/70 p-4 text-center text-xs font-semibold text-[#4D5870] shadow">
            <span className="uppercase tracking-[0.25em] text-[#4D5870]/70">{t.languageToggle}</span>
            <div className="inline-flex overflow-hidden rounded-lg border border-[#DDE7F0] bg-white shadow-sm">
              {(["fr", "en"] as Language[]).map((lang) => (
                <button
                  key={lang}
                  className={`px-3 py-2 text-xs font-semibold transition ${
                    language === lang ? "bg-[#2C7AF2] text-white" : "text-[#4D5870] hover:bg-[#EEF7FF]"
                  }`}
                  onClick={() => setLanguage(lang)}
                  type="button"
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold leading-tight text-[#2C7AF2]">{t.mainHeaderTitle}</h1>
        </header>

        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#4D5870]/60">{t.kpiBadge}</p>
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpiItems.map((item) => (
            <Card key={item.label} className="border-[#DDE7F0] bg-white text-[#4D5870]">
              <CardHeader className="space-y-2">
                <CardTitle className="text-sm uppercase tracking-wide text-[#4D5870]/70">{item.label}</CardTitle>
                <p className="text-5xl font-bold tracking-tight text-[#2C7AF2]">{item.value.toLocaleString(locale)}</p>
                <p className="text-xs text-[#4D5870]/60">{item.helper}</p>
              </CardHeader>
            </Card>
          ))}
        </section>

        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#4D5870]/60">{t.sectionsBadge}</p>
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="flex flex-col gap-6">
            <Card className="border-[#DDE7F0] bg-white text-[#4D5870]">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold">{t.plannedTodayTitle}</CardTitle>
                <p className="text-sm text-[#4D5870]/70">{t.plannedTodayHelper}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {plannedTodayTasks.length === 0 ? (
                  <p className="text-center text-sm text-[#4D5870]/70">{t.plannedTodayEmpty}</p>
                ) : (
                  <div className="overflow-hidden">
                    <div className="hidden grid-cols-[1.1fr_1.4fr_0.9fr_0.9fr_0.8fr] gap-3 px-1 pb-2 text-xs uppercase tracking-wide text-[#4D5870]/60 md:grid">
                      <span>{t.tableEquipment}</span>
                      <span>{t.tableDescription}</span>
                      <span>{t.tablePlannedDate}</span>
                      <span>{t.tableAssignee}</span>
                      <span>{t.tableStatus}</span>
                    </div>
                    <div className="divide-y divide-[#EEF2FB] rounded-xl border border-[#EEF2FB] bg-[#F7F8FA] shadow-sm ring-1 ring-[#DDE7F0]/70">
                      {plannedTodayTasks.map((task) => {
                        const scheduledDate = getScheduledAt(task)
                        const state = resolveTaskState(task)
                        return (
                          <div
                            key={task.id}
                            className="grid grid-cols-1 gap-3 px-4 py-3 text-sm text-[#4D5870] md:grid-cols-[1.1fr_1.4fr_0.9fr_0.9fr_0.8fr]"
                          >
                            <p className="text-base font-semibold text-[#2C7AF2]">{task.equipmentName || task.equipment || t.defaultEquipment}</p>
                            <p className="text-[#4D5870]/80">{truncate(task.description, 90)}</p>
                            <div className="flex flex-col text-[#4D5870]/80" title={`${formatDate(scheduledDate)} ${t.atLabel} ${formatTime(scheduledDate)}`}>
                              <span className="text-xs uppercase tracking-wide text-[#4D5870]/60">{t.tablePlannedDate}</span>
                              <span className="text-base font-semibold text-[#2C7AF2]">{formatDate(scheduledDate)}</span>
                              <span className="text-sm font-semibold text-[#2C7AF2]">{formatTime(scheduledDate)}</span>
                            </div>
                            <div className="flex flex-col justify-center gap-1 text-[#4D5870]/80">
                              <span className="text-xs uppercase tracking-wide text-[#4D5870]/60">{t.tableAssignee}</span>
                              <span className="font-semibold">{task.assigneeName || t.unassigned}</span>
                            </div>
                            <div className="flex flex-col items-start justify-center gap-2 md:items-center">
                              <span className="text-xs uppercase tracking-wide text-[#4D5870]/60">{t.tableStatus}</span>
                              <span className="inline-flex rounded-full bg-[#DDF6E6] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#00DB2B]">
                                {stateLabels[language][state] || t.stateOther}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-[#DDE7F0] bg-white text-[#4D5870]">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold">{t.newInterventions}</CardTitle>
                <p className="text-sm text-[#4D5870]/70">{t.newInterventionsHelper}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {newTasksToday.length === 0 ? (
                  <p className="text-center text-sm text-[#4D5870]/70">{t.newInterventionsEmpty}</p>
                ) : (
                  newTasksToday.map((task) => (
                    <div key={task.id} className="rounded-xl border border-[#EEF2FB] bg-[#F7F8FA] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#4D5870]/70">
                        <span className="font-semibold uppercase tracking-wide">{t.createdOn}</span>
                        <span className="text-[#2C7AF2]">{formatDate(getCreatedAt(task))}</span>
                        <span className="text-[#2C7AF2]">{formatTime(getCreatedAt(task))}</span>
                      </div>
                      <p className="mt-2 text-lg font-semibold text-[#2C7AF2]">
                        {task.equipmentName || task.equipment || t.defaultEquipment}
                      </p>
                      <p className="text-sm text-[#4D5870]">{truncate(task.description, 80)}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#4D5870]/70">
                        <span className="inline-flex rounded-full bg-[#DDF6E6] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#00DB2B]">
                          {stateLabels[language][resolveTaskState(task)] || t.stateOther}
                        </span>
                        <span className="font-semibold">{t.assignedTo} {task.assigneeName || t.unassigned}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {ongoingTasks.length > 0 && (
              <Card className="border-[#DDE7F0] bg-white text-[#4D5870]">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">{t.ongoingTasksTitle}</CardTitle>
                  <p className="text-sm text-[#4D5870]/70">{t.ongoingTasksHelper}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ongoingTasks.map((task) => (
                    <div key={task.id} className="rounded-lg border border-[#EEF2FB] bg-[#F7F8FA] px-4 py-3">
                      <p className="text-base font-semibold text-[#2C7AF2]">{task.equipmentName || task.equipment || "-"}</p>
                      <p className="text-sm text-[#4D5870]/80">{truncate(task.description, 70)}</p>
                      <p className="mt-2 text-xs text-[#4D5870]/70">
                        {t.startedLabel} {formatTime(task.startedAt || task.startDateTime)}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
          <Card className="border-[#DDE7F0] bg-white text-[#4D5870]">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">{t.lateTitle}</CardTitle>
              <p className="text-sm text-[#4D5870]/70">{t.lateHelper}</p>
            </CardHeader>
            <CardContent className="px-0">
              {lateTasks.length === 0 ? (
                <div className="px-6 pb-6 text-center text-sm text-[#4D5870]/70">{t.lateEmpty}</div>
              ) : (
                <div className="overflow-hidden">
                  <div className="hidden grid-cols-[1.1fr_1.5fr_0.8fr_0.8fr_0.9fr_0.7fr] gap-3 px-6 pb-3 text-xs uppercase tracking-wide text-[#4D5870]/60 lg:grid">
                    <span>{t.tableEquipment}</span>
                    <span>{t.tableDescription}</span>
                    <span>{t.tablePlannedDate}</span>
                    <span className="text-center">{t.tableDelay}</span>
                    <span>{t.tableAssignee}</span>
                    <span>{t.tableStatus}</span>
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
                          <div
                            className="flex flex-col items-center justify-center gap-1 text-center"
                            title={formatDelayTooltip(formatDate(scheduledDate), formatTime(scheduledDate), daysLate, language)}
                          >
                            <span className="text-xs uppercase tracking-wide text-[#4D5870]/60">{t.daysLabel}</span>
                            <span className="text-2xl font-bold text-[#FF9D9D]">{daysLate}</span>
                          </div>
                          <span>{task.assigneeName || t.unassigned}</span>
                          <span>
                            <span className="rounded-full bg-[#F7F8FA] px-3 py-1 text-xs font-semibold uppercase text-[#4D5870]">
                              {stateLabels[language][resolveTaskState(task)] || t.stateOther}
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
