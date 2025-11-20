"use client"

import { useEffect, useState } from "react"
import { X, AlertTriangle, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { MobilityWorkTask } from "@/types/task"

interface NewTaskNotificationProps {
  task: MobilityWorkTask
  onDismiss: () => void
}

export function NewTaskNotification({ task, onDismiss }: NewTaskNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)

  // Check if task is critical based on tags
  const isCritical = task.mobilityWorkData?.tags?.some(
    (tag) =>
      tag.name.toLowerCase().includes("urgent") ||
      tag.name.toLowerCase().includes("critical") ||
      tag.name.toLowerCase().includes("prioritaire") ||
      tag.code.toLowerCase().includes("urgent") ||
      tag.code.toLowerCase().includes("critical"),
  )

  // Get assignee names
  const getAssigneeDisplay = () => {
    if (!task.assignees || task.assignees.length === 0) {
      return "Unassigned"
    }

    const assigneeNames = task.assignees.map((assignee) => {
      // Handle object assignees with firstName, lastName, email
      if (typeof assignee === "object" && assignee !== null) {
        const { firstName, lastName, email } = assignee
        if (firstName && lastName) {
          return `${firstName} ${lastName}`
        }
        if (email) {
          return email
        }
        return "Unknown"
      }
      // Handle string assignees (emails or IDs)
      if (typeof assignee === "string") {
        return assignee
      }
      // Handle number assignees (user IDs)
      return `User #${assignee}`
    })

    return assigneeNames.join(", ")
  }

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(onDismiss, 300) // Wait for animation to complete
  }

  // Auto-dismiss after 15 seconds
  useEffect(() => {
    const timer = setTimeout(handleDismiss, 15000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4
        transition-all duration-300 ease-out
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}
      `}
    >
      <div
        className={`
          rounded-lg border-2 shadow-lg p-4
          animate-pulse-slow
          ${
            isCritical
              ? "bg-destructive/10 border-destructive text-destructive-foreground"
              : "bg-primary/10 border-primary text-primary-foreground"
          }
        `}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {isCritical ? <AlertTriangle className="h-5 w-5 animate-pulse" /> : <User className="h-5 w-5" />}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm uppercase tracking-wide">
                New Task {isCritical && "- CRITICAL"}
              </span>
            </div>
            <p className="font-medium text-base mb-2">{task.description}</p>
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                <span>For: {getAssigneeDisplay()}</span>
              </div>
              {task.mobilityWorkData?.associatedTo && (
                <div className="flex items-center gap-1">
                  <span>Equipment: {task.mobilityWorkData.associatedTo.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Dismiss button */}
          <Button variant="ghost" size="icon" className="flex-shrink-0 h-6 w-6" onClick={handleDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
