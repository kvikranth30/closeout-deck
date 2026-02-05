# Take-Home Assignment: Build a Timesheet Reconciliation Engine

## Background

HyperTrack Closeout Copilot helps staffing companies answer two questions for every shift:

- **Payout**: How much do I pay the worker?
- **Billing**: How much do I invoice the customer?

The challenge: time & attendance data comes from **three conflicting sources**:

1. **Customer systems** — Facility timesheets (clock hardware, paper, QR codes)
2. **Time tracking** — Worker-submitted times via app
3. **Location intelligence** — GPS tracking (the ground truth)

Data arrives in different formats, at different times, and often conflicts. A worker might claim 10 hours while the facility says 8—who's right? That's where GPS and message context come in.

---

## Your Task

Build an **AI-powered reconciliation engine** that:

1. **Ingests** timesheet data from multiple sources/formats
2. **Reconciles** conflicts using GPS as ground truth and message context
3. **Outputs** a payout recommendation with confidence score and explanation

---

## What You'll Receive

- **5 starter test shifts** in `test_shifts/` (CSV, JSON, text formats)—including one intentionally ambiguous scenario (Shift 005)
- **Schema documentation** in `DATA_SCHEMA.md` showing the target output format
- **Problem context** in `PROBLEM_CONTEXT.md` explaining why this matters
- **LLM API info** in `API_KEY.md`—use your own API key for both your engine AND to generate test data
- **Reference output** in `reference/sample_output.json`

---

## Requirements

### Part 1: Build the Engine

Your reconciliation engine should:

- Parse and normalize data from the provided formats (CSV, JSON, plain text)
- Detect and reason through conflicts between sources
- Use GPS data to verify claims where available
- Consider message context (manager approvals, exceptions, explanations)
- Produce a recommendation with:
  - **Recommended hours** and payout amount
  - **Confidence score** (High / Medium / Low)
  - **Human-readable explanation** citing evidence from the sources
  - **Flags** for issues needing human review

### Part 2: Generate Test Data

The 4 starter shifts are just examples. In reality, there are **dozens of conflict scenarios** that can occur:

- Late arrivals, early departures
- Equipment failures, weather delays
- Double bookings, split shifts
- Injury claims, incident reports
- Tip allocation, bonus adjustments
- Training time, orientation
- Break disputes
- And many more...

**Use an LLM to generate your own expanded test dataset** (minimum 10 scenarios, ideally 15-20+) in the same format as the starter shifts. Real-world closeout has dozens of edge cases:

- Your understanding of the problem domain
- Your ability to think through edge cases
- How robust your engine is beyond the happy paths

---

## What Matters

| Aspect | Why It's Important |
|--------|----------------------|
| **AI Engineering** | Can you use an LLM to reason about messy, conflicting data? |
| **Systems Thinking** | How do you structure ingestion → reconciliation → output? |
| **Handling Ambiguity** | What do you do when there's no clear answer? |
| **Test Data Quality** | Did you think of creative edge cases? Realistic messiness? |
| **Code Quality** | Is it clean, extensible, and well-organized? |
| **Domain Curiosity** | Do you understand why this problem matters? |

---

## Time Expectation

**4-6 hours.** We value your time. A focused, working demo with clear reasoning beats a sprawling incomplete one.

---

## Deliverables

1. **Working reconciliation engine** — CLI or simple web UI that processes shifts
2. **Your generated test dataset** — 10+ scenarios you created (show us you understand the problem space)
3. **Ambiguity analysis for Shift 005** (1 page) — The "Break Dispute" scenario has no clear right answer. Write up:
   - What's ambiguous and why
   - What assumptions you made and your reasoning
   - What additional data would resolve the ambiguity
   - Your confidence level and what would change it
4. **Brief writeup** (1-2 pages):
   - Architecture and design decisions
   - How you approached prompt engineering for reconciliation
   - How you approached generating test data (what scenarios did you think of?)
   - How you handle conflicts and ambiguity
   - What you'd improve with more time

---

## Stretch Goals (Not Required)

- Handle additional input formats (PDF, images of paper timesheets)
- Batch processing multiple shifts efficiently
- Suggestions for what additional data would increase confidence
- Web UI showing the reconciliation reasoning step-by-step

---

## Getting Started

```bash
# Explore the test data
ls test_shifts/

# Each shift folder contains:
# - facility.csv    (customer system data)
# - worker.json     (worker-submitted times)
# - gps.json        (location tracking events)
# - messages.txt    (SMS/chat between worker, agent, supervisor)

# See the expected output format
cat reference/sample_output.json

# Review the schema
cat DATA_SCHEMA.md
```

---

## Questions?

If something is unclear, that's intentional — real-world data is messy and ambiguous. Make reasonable assumptions and document them in your writeup.

Good luck! We're excited to see what you build.
