# Design Writeup: Timesheet Reconciliation Engine

## The Core Decision

The single most important design choice in this engine is that **the LLM never decides how much to pay someone**.

Hours, break deductions, payout amounts, and confidence bounds are all computed by deterministic rules. The LLM is used for exactly two things: extracting context from messy message threads (did the supervisor approve overtime? was there an equipment malfunction?) and generating human-readable explanations from pre-computed facts.

This isn't because the LLM can't do math. It's because payroll decisions need to be auditable, reproducible, and testable. If a worker disputes their payout, you need to point to a rule and say "this is why" — not "the model thought so." And you need the same input to always produce the same output, which stochastic text generation can't guarantee.

The LLM is genuinely useful for the language parts. A message like "Yeah no problem, I can stay" is clearly an overtime confirmation to a human but hard to capture with keyword matching alone. And generating a coherent explanation that cites specific timestamps and message content is exactly what language models are good at. So the architecture lets each tool do what it's best at.

## How the Pipeline Works

Every shift goes through six steps:

1. **Parse** — Four files (`facility.csv`, `worker.json`, `gps.json`, `messages.txt`) are read into typed Pydantic models. The parsers handle real-world messiness: time-only clock values from facility CSV exports, null fields for no-shows, overnight shifts where clock_out < clock_in, Latin-1 encoded files, and malformed message lines that get tagged rather than crashing the pipeline.

2. **GPS Analysis** — Each GPS event is checked against the facility's coordinates using a 100m geofence. The output is a presence summary: first/last on-site timestamps, coverage ratio (what fraction of the shift had GPS signal), whether the worker was at home during shift hours, and any visits to a secondary site. This is the closest thing to ground truth in the system.

3. **Message Context Extraction** — A deterministic keyword pass tags boolean signals: `overtime_approved`, `malfunction_reported`, `no_show_outreach`, `break_dispute`, `emergency_exception`. If an API key is configured, the LLM runs a second pass to catch nuance the keywords miss. The two results are merged with an OR strategy (if either pass detects a signal, it's flagged). Key message snippets are deduplicated semantically — not just exact-match, but substring containment after stripping timestamps and normalizing whitespace.

4. **Reconciliation Rules** — A prioritized rule chain decides base hours:
   - **No-show** first, because nothing else matters if nobody showed up.
   - **Agreement** second — if all available sources are within 15 minutes of each other, fast-path to high confidence.
   - **Equipment malfunction** third — if messages report a clock failure, the facility data is demoted and GPS/worker data is preferred.
   - **GPS-strong** — if GPS coverage is ≥80% and on-site data exists, use GPS-backed hours as the base.
   - **GPS-weak** — if coverage is <50%, fall back to worker or facility data and flag for review.
   - **Mixed fallback** — everything else, with medium confidence cap.

   After base hours are set, overlay rules fire: overtime policy checks (approved vs. unapproved), secondary site visit detection, emergency/incident flagging, and facility-worker spread alerts (>2 hour difference).

   This ordering is intentional. No-show prevents paying someone who wasn't there. Agreement fast-paths the easy cases. Malfunction fires before GPS-strong because a known system fault should override the normal evidence hierarchy — you shouldn't trust the facility clock if someone just told you it's broken.

5. **Confidence Scoring** — A numeric score starts at 100 and gets deductions for: source disagreement, weak GPS coverage, missing sources, major conflicts, unresolved policy issues. Bonuses for message corroboration. The score maps to high/medium/low, but rules can also hard-cap confidence (break disputes are always forced to low, for example). A few specific patterns — no-show with documented outreach, OT with GPS confirmation and explicit approval — override to high confidence. The output tracks whether an override was applied, so you can audit why a shift that "scored" low ended up labeled high.

6. **Explanation Generation** — The LLM gets the pre-computed recommendation, evidence, flags, and original messages, and writes a narrative explanation with optional reasoning steps. It's explicitly instructed not to change any numbers. If the LLM call fails (timeout, rate limit, bad JSON), a deterministic template fills in. The template now includes break policy context when relevant — instead of just "30 break minutes," it says "Break dispute resolved using worker_favor policy (worker=30, facility=60)."

## How I Handle Ambiguity

The general pattern: when evidence can't resolve a conflict, **don't pretend it can**. Lower confidence, add a flag explaining what's unresolved, and let the output be honest about uncertainty.

Break disputes are the clearest example. The engine offers three policies — `worker_favor`, `midpoint`, `facility_favor` — configurable via environment variable. The default is `worker_favor` because when the facility's break deduction is an automatic policy default and the worker provides a specific claim with message context, the risk of underpayment (and the legal exposure in jurisdictions with meal break penalties) outweighs the risk of moderate overpayment. But regardless of which policy is active, break disputes always get low confidence and a review flag. The engine picks a defensible number and says "a human should verify this."

The same pattern applies to emergency/incident cases (flagged, confidence capped at medium), secondary site visits without message corroboration (flagged for review), and no-shows without documented outreach (confidence downgraded, flag added).

In addition, the output now includes deterministic `confidence_suggestions` — actionable next data to collect so an operator can resolve uncertainty faster (for example: supervisor break attestation, explicit OT approval, dispatch/work-order proof for secondary-site visits, or GPS diagnostics when coverage is weak).

In the web UI, reasoning is rendered as a step-by-step timeline and paired with an \"Increase Confidence\" panel that surfaces these suggestions directly for reviewer workflow.

## Prompt Engineering

The LLM has two touchpoints, each with a different design goal:

**Message context extraction** asks for structured JSON output with bounded boolean keys and short evidence snippets. The prompt is deliberately narrow — it doesn't ask the model to reason about the shift, just to tag what it sees in the messages. The deterministic keyword pass runs first and always, so even if the LLM returns garbage, the core signals are captured. When the LLM does respond, its output is merged with the deterministic result (OR logic on booleans, semantic deduplication on snippets).

```
Extract reconciliation context as JSON with boolean keys:
overtime_approved, malfunction_reported, no_show_outreach,
break_dispute, emergency_exception,
and key_messages as short list of quoted message snippets.
Return ONLY valid JSON.
```

**Explanation generation** is grounded: the prompt includes the full pre-computed recommendation, evidence, and flags as JSON. The model's job is to narrate what's already decided, not to make new decisions. It's told to cite specific timestamps and messages, and not to change any numbers. This grounding means even if the model hallucinates slightly, the payout/hours/confidence are already locked in.

```
You are a staffing reconciliation analyst.
Produce strict JSON with keys: explanation (string),
reasoning_steps (array of short strings).
Cite specific timestamps and facts from evidence/messages.
Do not change numbers.
```

Both prompts require strict JSON output. Both have retry logic (exponential backoff, 3 attempts). Both use SHA256-keyed file caching so identical inputs don't re-call the API. And both have full deterministic fallbacks that produce valid output if the LLM is unavailable.

## Test Data Generation

I generated 20 scenarios covering a taxonomy of real-world conflicts: overtime disputes, no-shows, GPS gaps, break disputes, equipment failures, weather closures, training time, injury incidents, GPS battery death, missing worker submissions, unapproved overtime, multi-site work, night shifts, rounding disputes, tip/bonus adjustments, orientation time, emergency evacuations, facility time disputes, and supervisor late entries.

Each scenario uses the same four-file format as the starter shifts. The generated set uses 8 distinct worker identities across 8 roles, dates spread across January through July 2026, varied shift start times (5:30am, 7:00am, 8:30am, 9:00am, 10:00am, plus a 10pm overnight), and non-uniform GPS ping intervals.

All 20 pass a validation script that checks schema compliance, cross-file ID consistency, temporal ordering, and coordinate plausibility.

## Validation and Metrics

The test suite has 33 tests across four files:
- **Parser tests** — time-only parsing, null handling, message format variants.
- **Rule tests** — each starter shift verified for expected hours/confidence/flags, plus generated shift assertions (injury flagging, multi-site context, facility-worker spread, no-show outreach).
- **API tests** — health, upload, missing file, reconcile-by-ID.
- **Negative tests** — missing CSV columns, reversed clock times, extra JSON fields, zero GPS events, unrecognized message lines, Latin-1 encoding, empty CSV, invalid datetime, missing GPS timestamps, all-null-sources reconciliation.

Batch metrics across all 25 shifts (deterministic mode, LLM disabled):
- **Confidence distribution:** high=9, medium=8, low=8
- **Shifts with review/policy flags:** 15 out of 25 (60%)
- **Auto-approval candidates** (high confidence, no flags): 6 out of 25 (24%)

The auto-approval rate is intentionally conservative — the generated dataset is biased toward disputed scenarios. A production dataset with more routine shifts would have a higher auto-approval rate.

## What I'd Improve With More Time

1. **Jurisdiction-aware policy packs.** Break law varies by state. California's meal break penalty is materially different from Texas having no requirement. The engine's configurable break policy is a start, but a production system would need per-facility policy configuration tied to location.

2. **Persistent audit trail.** Right now the `meta` field captures which rule fired and whether confidence was overridden, but there's no durable trace log. A production system needs every decision to be replayable — what inputs went in, which rule chain fired, what the LLM returned, and what the human reviewer ultimately decided.

3. **Prompt benchmarking.** The current prompts work but haven't been systematically evaluated. I'd want a labeled test set of message threads with known ground-truth context tags, and precision/recall metrics for the extraction prompt across different models and temperatures.

4. **Batch throughput.** The current batch mode is sequential. For thousands of shifts per day, you'd want parallel reconciliation with rate-limited LLM calls, a job queue, and latency dashboards.

5. **OCR/PDF ingestion.** Many facilities still email scanned paper timesheets. Adding image-to-text extraction would expand the system's reach significantly.
