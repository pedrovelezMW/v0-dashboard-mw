import type { MobilityWorkTask } from "@/types/task"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDateTime, getTimeUntil, isTaskLate } from "@/lib/task-utils"
import { Clock, AlertCircle, Calendar } from "lucide-react"

interface TaskCardProps {
  task: MobilityWorkTask
}

export function TaskCard({ task }: TaskCardProps) {
  const late = isTaskLate(task)
  const timeUntil = getTimeUntil(task.startDateTime)

  const formatAssignee = (assignee: number | string | { firstName?: string; lastName?: string; email?: string }) => {
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
    if (typeof assignee === "string") {
      return assignee
    }
    return `User #${assignee}`
  }

  return (
    <Card className={late ? "border-destructive" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">{task.description}</CardTitle>
          <Badge variant={late ? "destructive" : task.status === "completed" ? "secondary" : "default"}>
            {task.status || "pending"}
          </Badge>
        </div>
        {task.equipment && <CardDescription>Equipment #{task.equipment}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formatDateTime(task.startDateTime)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {late ? (
            <>
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-destructive font-medium">{timeUntil}</span>
            </>
          ) : (
            <>
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{timeUntil}</span>
            </>
          )}
        </div>
        {task.assignees && task.assignees.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {task.assignees.map((assignee, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {formatAssignee(assignee)}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
