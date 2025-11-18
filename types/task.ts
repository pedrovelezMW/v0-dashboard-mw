export interface MobilityWorkTask {
  id: string
  title?: string
  description: string
  startDateTime: string
  endDateTime: string
  allDay?: boolean
  equipment?: number | string
  equipmentName?: string
  descriptionShort?: string
  assigneeName?: string
  assignees?: (number | string | { firstName: string; lastName: string; email: string })[]
  status?: "pending" | "in-progress" | "completed" | "scheduled"
  taskState?: string
  createdAt?: string
  scheduledAt?: string
  completedAt?: string
  startedAt?: string
  priority?: string
  tags?: Array<{
    code: string
    name: string
    groupId: number | null
    groupName: string | null
  }>
  mobilityWorkData?: any
}

export interface TaskStats {
  late: MobilityWorkTask[]
  next: MobilityWorkTask[]
  upcoming48h: MobilityWorkTask[]
}
