import { z } from "zod";
import { OBJECTIVE_LEVELS, OBJECTIVE_STATUSES } from "../constants.js";

export const createObjectiveSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  level: z.enum(OBJECTIVE_LEVELS).optional().default("task"),
  status: z.enum(OBJECTIVE_STATUSES).optional().default("planned"),
  parentId: z.string().uuid().optional().nullable(),
  ownerAgentId: z.string().uuid().optional().nullable(),
});

export type CreateObjective = z.infer<typeof createObjectiveSchema>;

export const updateObjectiveSchema = createObjectiveSchema.partial();

export type UpdateObjective = z.infer<typeof updateObjectiveSchema>;

// Backward-compat aliases
export const createGoalSchema = createObjectiveSchema;
export type CreateGoal = CreateObjective;
export const updateGoalSchema = updateObjectiveSchema;
export type UpdateGoal = UpdateObjective;
