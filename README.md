# Pepkio ΔΔCt Clarity

Typed Node.js and TypeScript client for qPCR relative gene expression analysis using Livak 2^-ΔΔCt and Pfaffl efficiency-corrected models via the Pepkio Tools REST API.

# What It Does

Processing real-time quantitative PCR (RT-qPCR) datasets in spreadsheets often leads to mathematical errors during logarithmic error propagation, multi-reference gene normalization, and primer efficiency adjustments.

This package provides a typed Node.js client and command-line interface (CLI) for the hosted Pepkio ΔΔCt Clarity REST API. It ingests raw Ct / Cq values, normalizes target genes against single or multiple reference genes via geometric mean averaging, applies either the standard Livak (2^-ΔΔCt) or Pfaffl efficiency-corrected model, flags technical replicate outliers, and calculates fold changes with asymmetric confidence intervals.

Programmatic runs require a network connection and a Pepkio API key. Calculation algorithms and statistical models are executed remotely by the Pepkio API engine.

# Features

- **Dual Quantification Models**: Supports standard Livak 2^-ΔΔCt (100% amplification efficiency) and Pfaffl efficiency-corrected quantification with custom primer efficiencies.
- **Multi-Reference Gene Normalization**: Geometric mean normalization across single or multiple housekeeping genes (e.g. *GAPDH*, *ACTB*, *18S*) in compliance with MIQE guidelines.
- **Asymmetric Error Propagation**: Rigorous quadrature error propagation across replicates yielding exact asymmetric confidence intervals ($2^{-(\Delta\Delta C_t \pm SE)}$).
- **Quality Control & Outlier Detection**: Automatic flagging of high-variance replicates ($\Delta C_t$ standard deviation $> 0.5$) and plate quality checks.
- **Typed ESM Client**: Full TypeScript definitions with Zod schema validation and promise-based helper methods (`analyze`, `run`, `getManifest`, `getExamples`).
- **Command-Line Interface (CLI)**: Inspect manifests, list built-in examples, and execute relative quantification directly from the terminal.

# Installation

```bash
npm install pepkio-ddct-clarity
```

Requires Node.js 18 or newer.

# Configuration

Set an API key with **tools:run** scope before invoking `run()` or `analyze()`:

```bash
export PEPKIO_API_KEY="your-api-key"
```

Create and manage keys in your [Pepkio Account](https://www.pepkio.com/account/api-keys).

Optional configuration variables:

| Variable | Purpose |
|----------|---------|
| `PEPKIO_API_KEY` | Production API key (required for `run` and `analyze`) |
| `LOCAL_PEPKIO_API_KEY` | Local development key when `PEPKIO_API_BASE_URL` points to `tools.localtest.me` |
| `PEPKIO_API_BASE_URL` | API base URL (default: `https://tools.pepkio.com`) |

# Quick Example

```javascript
import { PepkioClient } from "pepkio-ddct-clarity";

const client = new PepkioClient();

// Run relative quantification using a built-in example dataset
const input = await client.getExampleInput("il6_livak_example");
const response = await client.run(input);

if (response.result) {
  console.log("Analysis Status:", response.status);
  for (const group of response.result.gene_groups ?? []) {
    console.log(`Target: ${group.target_gene}, Sample: ${group.sample_name}, Fold Change: ${group.fold_change}`);
  }
}
```

# CLI

Inspect tool metadata and available examples:

```bash
npx pepkio-ddct-clarity manifest --examples
```

Execute a relative quantification run using a built-in example:

```bash
npx pepkio-ddct-clarity run --example il6_livak_example
```

# Typical Use Cases

- **Gene Expression Profiling**: Quantifying target gene expression changes under drug treatments, gene knockdowns, or environmental stimuli.
- **RNA-Seq Validation**: Orthogonal RT-qPCR verification of differentially expressed genes (DEGs) identified from sequencing experiments.
- **Multi-Housekeeping Panel Normalization**: Geometric averaging of stable reference genes according to MIQE best practices.
- **Amplification Efficiency Correction**: Applying Pfaffl model corrections for primer pairs with sub-optimal or divergent amplification efficiencies.
- **Plate Reader Automation**: Streamlining 96-well and 384-well qPCR dataset workflows within Node.js microservices and bioinformatics pipelines.

# Scientific Background

Relative quantification determines the fold change in target gene expression in test samples relative to a calibrator control, normalized to internal reference genes.

Under the Livak ($2^{-\Delta\Delta C_t}$) method, PCR amplification efficiency is assumed to be 100% ($E = 2$). The difference in threshold cycles is $\Delta C_t = C_{t,\text{target}} - C_{t,\text{reference}}$, and $\Delta\Delta C_t = \Delta C_{t,\text{treated}} - \Delta C_{t,\text{calibrator}}$. When primer efficiencies differ from 2.0, the Pfaffl model corrects for efficiency ($E = 10^{-1/\text{slope}}$) as $\text{Ratio} = (E_{\text{target}}^{\Delta C_{t,\text{target}}}) / (E_{\text{ref}}^{\Delta C_{t,\text{ref}}})$. Because fold change is exponential, standard error must be propagated in the linear Ct domain before exponential transformation, producing asymmetric error bounds.

# Web Application

For researchers who prefer a graphical interface, an interactive web version is available.

Web Application: https://www.pepkio.com/tools/ddct-clarity

The web application provides interactive 96/384-well plate heatmaps, customizable fold-change bar charts, MIQE-compliant export tables, and shareable experiment URLs.

# Documentation and Resources

GitHub Repository: https://github.com/pepkio/pepkio-ddct-clarity-js

Web Application: https://www.pepkio.com/tools/ddct-clarity

Python client (PyPI): https://pypi.org/project/pepkio-ddct-clarity/

# About Pepkio

Pepkio (https://www.pepkio.com/) develops software tools and bioinformatics solutions for life science researchers, including laboratory calculators and analysis services (https://www.pepkio.com/cro).

A semantic, AI-native version of this document in the K2F format is available at https://k2f.dev (https://k2f.dev/v/f636f06bae9988767a24d263d334a0f8b34b554243ee550fd7dee7ce779398bf)
