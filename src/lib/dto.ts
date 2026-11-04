export type TaskLabelDTO = { id: string; name: string; color: string };

export type ChecklistDTO = { id: string; title: string; done: boolean; position: number };

export type RecurrenceDTO = {
  frequency: string;
  interval: number;
  byWeekday: number[];
  ordinal: number | null;
  customText: string | null;
};

export type TaskDTO = {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  priority: number;
  dueAt: string | null;
  startAt: string | null;
  estimateMinutes: number | null;
  trackedMinutes: number;
  position: number;
  projectId: string | null;
  sectionId: string | null;
  parentId: string | null;
  reporterId: string;
  completedAt: string | null;
  assigneeIds: string[];
  labelIds: string[];
  labels: TaskLabelDTO[];
  checklist: ChecklistDTO[];
  commentCount: number;
  subtaskCount: number;
  attachmentCount: number;
  recurrence: RecurrenceDTO | null;
};

export type MemberDTO = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE";
  active: boolean;
  title: string | null;
  image: string | null;
};

export type ProjectDTO = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  archivedAt: string | null;
  position: number;
  sections: { id: string; name: string; position: number }[];
  memberIds: string[];
};

export type Bootstrap = {
  me: MemberDTO & { locale: string; theme: string; onboardingDone: boolean };
  org: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    workingDays: number[];
    workStart: string;
    workEnd: string;
    notifyOnAssign: boolean;
    emailOnAssign: boolean;
    digestHour: number;
    weeklyReportDay: number;
    hasLogo: boolean;
  };
  members: MemberDTO[];
  projects: ProjectDTO[];
  labels: TaskLabelDTO[];
  notifications: { id: string; type: string; title: string; body: string; link: string | null; readAt: string | null; createdAt: string }[];
  filters: { id: string; name: string; query: string }[];
};
