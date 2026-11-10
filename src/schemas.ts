// SPDX-License-Identifier: MIT
import { z } from "zod";

export const REPLICATE_TYPES = ["technical", "biological"] as const;
export type ReplicateType = (typeof REPLICATE_TYPES)[number];

export const PLATE_FORMATS = ["96", "384", "none"] as const;
export type PlateFormat = (typeof PLATE_FORMATS)[number];

export const ctRowSchema = z.object({
  gene: z.string().min(1),
  group: z.string().min(1),
  ct: z.number().nullable(),
  well: z.string().optional(),
  sample_id: z.string().optional(),
});

export type CtRow = z.infer<typeof ctRowSchema>;

export const ddctInputSchema = z.object({
  rows: z.array(ctRowSchema).min(1),
  reference_genes: z.array(z.string().min(1)).min(1),
  calibrator_group: z.string().min(1),
  gene_efficiencies: z.record(z.string(), z.number().min(0).max(200)).optional(),
  replicate_type: z.enum(REPLICATE_TYPES),
  plate_format: z.enum(PLATE_FORMATS).optional(),
});

export type DdctInput = z.infer<typeof ddctInputSchema>;

export function parseRunInput(input: unknown): DdctInput {
  return ddctInputSchema.parse(input);
}
