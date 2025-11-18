export interface MobilityWorkTask {
  id: string
  equipment?: number | string
  description: string
  startDateTime: string
  endDateTime: string
  allDay: boolean
  assignees?: (number | string | { firstName: string; lastName: string; email: string })[]
  status?: "pending" | "in-progress" | "completed" | "scheduled"
  createdAt: string
  mobilityWorkData?: {
    taskId?: string
    tags?: Array<{
      code: string
      name: string
      groupId: number | null
      groupName: string | null
    }>
    scheduledBy?: {
      userId: string
      firstName: string
      lastName: string
    }
    associatedTo?: {
      _type: string
      type: string
      id: string
      legacyId?: string
      itemCode?: string | null
      name: string
      tags?: Array<{
        code: string
        name: string
        groupId: number | null
        groupName: string | null
      }>
      costCenter?: string
    }
    metadata?: any[]
  }
}

export interface TaskStats {
  late: MobilityWorkTask[]
  next: MobilityWorkTask[]
  upcoming48h: MobilityWorkTask[]
}
