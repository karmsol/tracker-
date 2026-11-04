import { z } from "zod";

const iso = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Use a real date");

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72)
  .regex(/[A-Za-z]/, "Include a letter")
  .regex(/[0-9]/, "Include a number");

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  password: passwordSchema,
  organization: z.string().trim().min(2).max(80),
});

export const recurrenceSchema = z.object({
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "CUSTOM"]),
  interval: z.number().int().min(1).max(52).optional(),
  byWeekday: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  ordinal: z.number().int().min(1).max(5).nullable().optional(),
  customText: z.string().max(160).nullable().optional(),
});

export const taskWriteSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(20_000).nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.number().int().min(1).max(4).optional(),
  dueAt: iso.nullable().optional(),
  startAt: iso.nullable().optional(),
  estimateMinutes: z.number().int().min(0).max(100_000).nullable().optional(),
  projectId: z.string().nullable().optional(),
  sectionId: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  assigneeIds: z.array(z.string()).max(30).optional(),
  labelIds: z.array(z.string()).max(20).optional(),
  labelNames: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  checklist: z.array(z.string().trim().min(1).max(200)).max(40).optional(),
  recurrence: recurrenceSchema.nullable().optional(),
  remind: z.boolean().optional(),
});

export const taskPatchSchema = taskWriteSchema.partial().extend({
  trackedMinutes: z.number().int().min(1).max(24 * 60).optional(),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(8_000),
});

export const bulkSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.number().int().min(1).max(4).optional(),
  assigneeIds: z.array(z.string()).max(30).optional(),
  projectId: z.string().nullable().optional(),
  dueAt: iso.nullable().optional(),
  deleted: z.boolean().optional(),
});

export const projectSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(2_000).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  memberIds: z.array(z.string()).max(100).optional(),
});

export const inviteSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().max(80).optional(),
  role: z.enum(["ADMIN", "EMPLOYEE"]).default("EMPLOYEE"),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(20),
  name: z.string().trim().min(2).max(80),
  password: passwordSchema,
});

export const aiDraftSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4_000).nullable().optional(),
  assigneeNames: z.array(z.string()).max(10).default([]),
  assigneeSelf: z.boolean().optional(),
  dueAt: iso.nullable().optional(),
  priority: z.number().int().min(1).max(4).optional(),
  projectName: z.string().nullable().optional(),
  labels: z.array(z.string()).max(8).default([]),
  recurrence: recurrenceSchema.nullable().optional(),
  reminder: z.boolean().optional(),
});

export type TaskWrite = z.infer<typeof taskWriteSchema>;
