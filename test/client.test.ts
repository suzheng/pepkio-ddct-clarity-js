import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PepkioClient } from "../src/client.js";
import {
  DEFAULT_API_BASE_URL,
  TOOL_ID,
  apiPath,
  resolveApiKey,
  resolveBaseUrl,
} from "../src/config.js";
import { parseRunInput } from "../src/schemas.js";
import { PepkioAPIError, type ToolManifest } from "../src/types.js";

const mockManifest: ToolManifest = {
  schema_version: "1.0",
  tool_id: TOOL_ID,
  title: "ΔΔCt Clarity",
  description: "qPCR ΔΔCt calculator with transparent error propagation.",
  examples: [
    {
      name: "il6_livak_example",
      description: "IL6 Livak ΔΔCt calculation",
      input: {
        rows: [
          { gene: "GAPDH", group: "Control", ct: 20.5, well: "A1" },
          { gene: "GAPDH", group: "Control", ct: 20.6, well: "A2" },
          { gene: "GAPDH", group: "Control", ct: 20.4, well: "A3" },
          { gene: "IL6", group: "Control", ct: 30, well: "B1" },
          { gene: "IL6", group: "Control", ct: 30.2, well: "B2" },
          { gene: "IL6", group: "Control", ct: 29.8, well: "B3" },
          { gene: "GAPDH", group: "Treatment", ct: 20.7, well: "C1" },
          { gene: "GAPDH", group: "Treatment", ct: 20.5, well: "C2" },
          { gene: "GAPDH", group: "Treatment", ct: 20.6, well: "C3" },
          { gene: "IL6", group: "Treatment", ct: 28, well: "D1" },
          { gene: "IL6", group: "Treatment", ct: 28.2, well: "D2" },
          { gene: "IL6", group: "Treatment", ct: 27.8, well: "D3" },
        ],
        reference_genes: ["GAPDH"],
        calibrator_group: "Control",
        replicate_type: "technical",
      },
      output: {
        has_blocking_errors: false,
        method: "livak",
      },
    },
    {
      name: "no_target_gene_blocks",
      description: "Validation failure when no target gene present",
      input: {
        rows: [
          { gene: "GAPDH", group: "Control", ct: 20.5 },
          { gene: "GAPDH", group: "Treatment", ct: 20.6 },
        ],
        reference_genes: ["GAPDH"],
        calibrator_group: "Control",
        replicate_type: "technical",
      },
      output: {
        has_blocking_errors: true,
      },
    },
  ],
};

describe("PepkioClient unit tests", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  it("getManifest() fetches and returns tool_id", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockManifest),
    } as unknown as Response);

    const client = new PepkioClient({ apiKey: "test-key" });
    const manifest = await client.getManifest();

    expect(manifest.tool_id).toBe(TOOL_ID);
    expect(manifest.title).toBe("ΔΔCt Clarity");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(url).toBe("https://tools.pepkio.com/api/tools/v1/tools/ddct-clarity/manifest");
    expect((init as RequestInit)?.method).toBe("GET");
  });

  it("caches getManifest() calls", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockManifest),
    } as unknown as Response);

    const client = new PepkioClient({ apiKey: "test-key" });
    const first = await client.getManifest();
    const second = await client.getManifest();

    expect(first).toBe(second);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("listExamples() extracts examples from manifest", () => {
    const client = new PepkioClient({ apiKey: "test-key" });
    const examples = client.listExamples(mockManifest);

    expect(examples).toHaveLength(2);
    expect(examples[0].name).toBe("il6_livak_example");
    expect(examples[1].name).toBe("no_target_gene_blocks");
  });

  it("getExampleInput() retrieves and parses example", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockManifest),
    } as unknown as Response);

    const client = new PepkioClient({ apiKey: "test-key" });
    const input = await client.getExampleInput("il6_livak_example");

    expect(input.reference_genes).toEqual(["GAPDH"]);
    expect(input.calibrator_group).toBe("Control");
    expect(input.replicate_type).toBe("technical");
    expect(input.rows.length).toBe(12);
  });

  it("getExampleInput() throws on unknown example name", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockManifest),
    } as unknown as Response);

    const client = new PepkioClient({ apiKey: "test-key" });
    await expect(client.getExampleInput("non_existent")).rejects.toThrow(
      /Example "non_existent" not found/,
    );
  });

  it("run() sends validated input and options", async () => {
    const mockResult = {
      run_id: "run-123",
      status: "completed",
      result: {
        has_blocking_errors: false,
        method: "livak",
        gene_results: [],
      },
      error: null,
      result_url: "https://tools.pepkio.com/api/tools/v1/runs/run-123",
      permalink: "https://tools.pepkio.com/r/run-123",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockResult),
    } as unknown as Response);

    const client = new PepkioClient({
      apiKey: "secret-key",
      baseUrl: "https://tools.pepkio.com",
    });

    const res = await client.run(
      mockManifest.examples![0].input as unknown as Parameters<typeof client.run>[0],
      { label: "test-run", idempotency_key: "idem-1" },
    );

    expect(res.run_id).toBe("run-123");
    expect(res.status).toBe("completed");
    expect(res.result?.method).toBe("livak");

    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(url).toBe("https://tools.pepkio.com/api/tools/v1/tools/ddct-clarity/run");
    const parsedBody = JSON.parse((init as RequestInit).body as string);
    expect(parsedBody.options.label).toBe("test-run");
    expect(parsedBody.options.idempotency_key).toBe("idem-1");
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer secret-key",
      "Content-Type": "application/json",
    });
  });

  it("analyze() convenience helper formats and calls run()", async () => {
    const mockResult = {
      run_id: "run-456",
      status: "completed",
      result: {
        has_blocking_errors: false,
        method: "livak",
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockResult),
    } as unknown as Response);

    const client = new PepkioClient({ apiKey: "test-key" });
    const res = await client.analyze({
      rows: [
        { gene: "GAPDH", group: "Control", ct: 20.5 },
        { gene: "IL6", group: "Control", ct: 30.0 },
      ],
      referenceGenes: ["GAPDH"],
      calibratorGroup: "Control",
      replicateType: "technical",
    });

    expect(res.run_id).toBe("run-456");
    expect(res.status).toBe("completed");
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    const parsed = JSON.parse((init as RequestInit).body as string);
    expect(parsed.input.reference_genes).toEqual(["GAPDH"]);
    expect(parsed.input.calibrator_group).toBe("Control");
  });

  it("getRun() fetches previous run by ID", async () => {
    const mockRun = {
      run_id: "run-789",
      status: "completed",
      result: { has_blocking_errors: false },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockRun),
    } as unknown as Response);

    const client = new PepkioClient({ apiKey: "test-key" });
    const res = await client.getRun("run-789");

    expect(res.run_id).toBe("run-789");
    const [url] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(url).toBe("https://tools.pepkio.com/api/tools/v1/runs/run-789");
  });

  it("waitForRun() polls until run is completed", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ run_id: "run-poll", status: "running" }),
        } as unknown as Response;
      }
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            run_id: "run-poll",
            status: "completed",
            result: { has_blocking_errors: false },
          }),
      } as unknown as Response;
    });

    const client = new PepkioClient({ apiKey: "test-key" });
    const res = await client.waitForRun("run-poll", { intervalMs: 10, timeoutMs: 1000 });

    expect(res.status).toBe("completed");
    expect(callCount).toBe(2);
  });

  it("waitForRun() throws on timeout", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ run_id: "run-timeout", status: "running" }),
    } as unknown as Response);

    const client = new PepkioClient({ apiKey: "test-key" });
    await expect(
      client.waitForRun("run-timeout", { intervalMs: 20, timeoutMs: 50 }),
    ).rejects.toThrow(/Timed out waiting for run/);
  });

  it("throws PepkioAPIError on HTTP 500 error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => JSON.stringify({ error: { message: "Internal server fault" } }),
    } as unknown as Response);

    const client = new PepkioClient({ apiKey: "test-key" });
    await expect(
      client.run({
        rows: [{ gene: "GAPDH", group: "Control", ct: 20 }],
        reference_genes: ["GAPDH"],
        calibrator_group: "Control",
        replicate_type: "technical",
      }),
    ).rejects.toThrow(PepkioAPIError);
  });

  it("throws PepkioAPIError when error field is present in response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          run_id: "run-failed",
          status: "failed",
          error: { message: "Calculation aborted" },
        }),
    } as unknown as Response);

    const client = new PepkioClient({ apiKey: "test-key" });
    await expect(
      client.run({
        rows: [{ gene: "GAPDH", group: "Control", ct: 20 }],
        reference_genes: ["GAPDH"],
        calibrator_group: "Control",
        replicate_type: "technical",
      }),
    ).rejects.toThrow(/Calculation aborted/);
  });

  it("throws when calling run() without API key", async () => {
    delete process.env.PEPKIO_API_KEY;
    delete process.env.LOCAL_PEPKIO_API_KEY;

    const client = new PepkioClient();
    await expect(
      client.run({
        rows: [{ gene: "GAPDH", group: "Control", ct: 20 }],
        reference_genes: ["GAPDH"],
        calibrator_group: "Control",
        replicate_type: "technical",
      }),
    ).rejects.toThrow(/API key required/);
  });

  it("resolves config and URLs correctly", () => {
    expect(DEFAULT_API_BASE_URL).toBe("https://tools.pepkio.com");
    expect(resolveBaseUrl()).toBe("https://tools.pepkio.com");
    expect(resolveBaseUrl("https://override.example.com/")).toBe("https://override.example.com");

    expect(apiPath("https://tools.pepkio.com", "/tools/ddct-clarity/run")).toBe(
      "https://tools.pepkio.com/api/tools/v1/tools/ddct-clarity/run",
    );
    expect(apiPath("https://tools.pepkio.com", "runs/123")).toBe(
      "https://tools.pepkio.com/api/tools/v1/runs/123",
    );

    process.env.PEPKIO_API_KEY = "prod-key";
    process.env.LOCAL_PEPKIO_API_KEY = "local-key";

    expect(resolveApiKey("https://tools.pepkio.com")).toBe("prod-key");
    expect(resolveApiKey("https://tools.localtest.me")).toBe("local-key");
    expect(resolveApiKey("https://tools.pepkio.com", "override-key")).toBe("override-key");
  });

  it("validates input schema with parseRunInput", () => {
    const valid = {
      rows: [{ gene: "GAPDH", group: "Control", ct: 20.5 }],
      reference_genes: ["GAPDH"],
      calibrator_group: "Control",
      replicate_type: "technical",
    };
    expect(() => parseRunInput(valid)).not.toThrow();

    const invalid = {
      rows: [],
      reference_genes: [],
    };
    expect(() => parseRunInput(invalid)).toThrow();
  });
});
