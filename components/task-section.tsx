import type { MobilityWorkTask } from "@/types/task"
import { TaskCard } from "./task-card"

interface TaskSectionProps {
  title: string
  description: string
  tasks: MobilityWorkTask[]
  emptyMessage?: string
}

export function TaskSection({ title, description, tasks, emptyMessage = "No tasks found" }: TaskSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}
