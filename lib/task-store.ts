import type { MobilityWorkTask } from "@/types/task"

// In-memory task store (replace with database for production)
class TaskStore {
  private tasks: Map<string, MobilityWorkTask> = new Map()

  addTask(task: MobilityWorkTask) {
    this.tasks.set(task.id, task)
  }

  getAllTasks(): MobilityWorkTask[] {
    return Array.from(this.tasks.values())
  }

  getTaskById(id: string): MobilityWorkTask | undefined {
    return this.tasks.get(id)
  }

  updateTask(id: string, updates: Partial<MobilityWorkTask>) {
    const task = this.tasks.get(id)
    if (task) {
      this.tasks.set(id, { ...task, ...updates })
    }
  }

  deleteTask(id: string) {
    this.tasks.delete(id)
  }
}

export const taskStore = new TaskStore()
