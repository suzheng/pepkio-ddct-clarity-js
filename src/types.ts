// SPDX-License-Identifier: MIT
import type {
  CtRow,
  DdctInput,
  PlateFormat,
  ReplicateType,
} from "./schemas.js";

export type RunStatus = "queued" | "running" | "completed" | "failed" | (string & {});

export interface RunOptions {
  idempotency_key?: string;
  label?: string;
  [key: string]: unknown;
}

export interface RunResult<T = DdctResult> {
  run_id: string;
  status: RunStatus;
  result?: T;
  error?: string | { message?: string; code?: string; details?: unknown } | null;
  result_url?: string;
  permalink?: string;
  duration_ms?: number;
}

export interface ManifestExample {
  name: string;
  description?: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
}

export interface ToolManifest {
  schema_version: string;
  tool_id: string;
  title: string;
  description?: string;
  tags?: string[];
  category?: string;
  execution_mode?: string;
  estimated_runtime_sec?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  agent_notes?: string;
  example_prompts?: string[];
  examples?: ManifestExample[];
  limits?: Record<string, unknown>;
  input_schema?: Record<string, unknown>;
}

export interface ExampleMeta {
  name: string;
  description?: string;
}

export type RowFlag =
  | "missing"
  | "unusual_ct"
  | "outlier"
  | "zero_variance"
  | (string & {});

export interface FlaggedRow extends CtRow {
  row_index: number;
  flags: RowFlag[];
}

export type WarningCode =
  | "missing_values"
  | "unusual_ct"
  | "outlier_replicate"
  | "ref_gene_unstable"
  | "unusual_efficiency"
  | "single_replicate"
  | "insufficient_for_pvalue"
  | "zero_variance"
  | "no_calibrator"
  | "no_reference_genes"
  | "no_target_genes"
  | (string & {});

export interface DdctWarning {
  code: WarningCode;
  message: string;
  gene?: string;
  group?: string;
}

export interface GeneGroupResult {
  gene: string;
  group: string;
  n: number;
  delta_ct_mean: number;
  delta_ct_sem: number | null;
  delta_ct_sd: number | null;
  delta_delta_ct: number | null;
  fold_change: number | null;
  log2_fold_change: number | null;
  fold_change_sem: number | null;
  p_value: number | null;
  significance: "ns" | "*" | "**" | "***" | "n/a" | (string & {});
}

export interface PlateWellCell {
  well: string;
  row: number;
  col: number;
  ct: number | null;
  gene: string | null;
  group: string | null;
  is_outlier: boolean;
  is_empty: boolean;
}

export interface DdctResult {
  warnings?: DdctWarning[];
  has_blocking_errors: boolean;
  flagged_rows?: FlaggedRow[];
  method?: "livak" | "pfaffl" | (string & {});
  formula?: string;
  reference_genes?: string[];
  calibrator_group?: string;
  replicate_type?: ReplicateType;
  gene_results?: GeneGroupResult[];
  plate_cells?: PlateWellCell[] | null;
  methods_paragraph?: string;
  [key: string]: unknown;
}

export class PepkioAPIError extends Error {
  readonly status: number;
  readonly body?: unknown;
  readonly runId?: string;
  readonly code?: string;

  constructor(
    message: string,
    opts: { status: number; body?: unknown; runId?: string; code?: string },
  ) {
    super(message);
    this.name = "PepkioAPIError";
    this.status = opts.status;
    this.body = opts.body;
    this.runId = opts.runId;
    this.code = opts.code;
  }
}

export type {
  CtRow,
  DdctInput,
  PlateFormat,
  ReplicateType,
};
