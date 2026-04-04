import { z } from "zod";

export const publicContactSubmissionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  message: z.string().trim().min(1).max(10000),
  locale: z.enum(["en", "es"]),
  sourcePath: z.string().trim().min(1).max(2048).startsWith("/"),
});

export type PublicContactSubmissionInput = z.infer<typeof publicContactSubmissionSchema>;
