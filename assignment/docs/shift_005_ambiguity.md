# Ambiguity Analysis: Shift 005 — Break Dispute (`SHF-8841E`)

## The Situation

Alex Torres, an Inventory Clerk paid $20/hour, was scheduled for an 8-hour shift (07:00–15:00) at a warehouse on January 20, 2026. He clocked in at 06:58 and clocked out at 15:02. All three data sources confirm he was present for the full shift. The only dispute is about what happened during lunch.

**Facility says:** 60-minute unpaid break (standard policy). Net paid hours: ~7.07.
**Worker says:** 30-minute break — he ate at his desk while continuing inventory work. Net paid hours: ~7.57.
**GPS says:** Continuous on-site presence from 06:55 to 15:05, with a ping every 30–60 minutes. No movement off-site during the lunch window. Activity remains "stationary" at 12:00 and 12:30.

The messages tell a story with a beginning, middle, and no resolution:
- **11:45** — Supervisor reminds Alex to take lunch.
- **11:52** — Alex says he'll grab food soon.
- **12:03** — Alex says he's grabbing food now.
- **15:10** — Alex tells the staffing agent: "Didn't really get a full break — had to finish the inventory count."

## What Is Actually Ambiguous

This is not a clock-in/clock-out dispute. All sources agree on the shift window. The ambiguity is narrowly about **whether Alex was relieved of duty during the meal period**, which determines whether 30 or 60 minutes should be deducted as unpaid.

Three things make this genuinely hard to resolve:

1. **GPS proves presence, not work state.** Alex was on-site at 12:00 and 12:30, but GPS cannot distinguish "eating at desk while scanning inventory" from "eating at desk while watching a video." Presence is not the same as productive work, and presence is not the same as being on break.

2. **The messages are suggestive but not conclusive.** Alex said he'd grab food at 11:52, said he was grabbing it at 12:03, and later claimed he didn't get a full break. But there's no supervisor response confirming or denying this. The supervisor reminded him to take lunch — that's all. We don't know if the supervisor observed what actually happened.

3. **The facility's 60-minute deduction is a policy default, not an observation.** The facility CSV note says "Standard 1hr unpaid lunch per facility policy." This means the system automatically applies a 60-minute deduction regardless of what actually happened. It doesn't mean someone verified Alex took a full hour off.

## How the Engine Handles It

The engine applies a configurable `BREAK_DISPUTE_POLICY` setting:
- `worker_favor` (current default) → uses the smaller break claim (30 min), producing **7.5 paid hours / $150.00**
- `midpoint` → splits the difference (45 min), producing **7.25 paid hours / $145.00**
- `facility_favor` → uses the larger break claim (60 min), producing **7.0 paid hours / $140.00**

Regardless of which policy is active, the engine:
- Sets confidence to **low**
- Adds a flag: `"Requires human review — break dispute unresolved"`
- Does **not** auto-approve the shift

The decision to default to `worker_favor` is deliberate. When the facility's deduction is a blanket policy default and the worker provides a specific, contextual claim backed by contemporaneous messages, the risk of underpayment (and the legal exposure that comes with it) outweighs the risk of a $10 overpayment. This is a conservative payroll stance, not a ruling on who is right.

## Why This Matters at Scale

The $10 difference on this single shift seems small. But break disputes are one of the most common conflict types in hourly staffing:

- A facility with 200 shifts/week and a 5% break dispute rate produces 10 disputed shifts/week.
- At $10/shift, that's $500/week in aggregate uncertainty — or ~$26,000/year from one facility.
- More importantly, systematically deducting 60 minutes when workers consistently report 30 creates a pattern that looks like wage theft in an audit, even if it's just a blunt policy default.

The right answer isn't to pick a number. It's to flag the dispute, apply a defensible default, and escalate.

## What Additional Data Would Resolve This

Ranked by how decisively each would close the ambiguity:

1. **Supervisor attestation** — Did the supervisor observe Alex working through lunch? A single message like "Yeah, Alex was helping with the count through lunch" would move this to high confidence immediately.

2. **Task/system activity logs** — Inventory systems typically log scan events with timestamps. If Alex's scanner shows activity from 12:00–12:30, that's strong evidence of a working lunch. If there's a 60-minute gap in scan activity, that supports the facility's deduction.

3. **Facility "working lunch" policy** — Does this facility allow paid working lunches? Some do, some don't. If facility policy says interrupted breaks must be paid, the worker's claim is supported by policy itself.

4. **Jurisdiction-specific meal break law** — In California, if a meal break is interrupted by work duties, the employer owes the worker one hour of penalty pay. In Texas, there's no such requirement. The correct resolution depends on where this facility is located, and the engine doesn't currently model jurisdiction.

5. **Badge/access log or camera footage** — Did Alex leave the work floor at all during the lunch window? Physical evidence would settle it.

## Confidence Assessment

**Current: Low.** This is correct and should remain low until one of the above data points is available.

| If this happened... | Confidence would become... |
|---|---|
| Supervisor confirms Alex worked through lunch | **High** — worker claim corroborated by authority |
| Scan logs show continuous activity 12:00–12:45 | **High** — system evidence supports short/no break |
| Scan logs show 60-min gap in activity | **High** — but favoring the facility's 60-min deduction |
| Facility policy explicitly allows paid working lunches | **Medium** — supports worker but still needs duration clarity |
| No additional data available | **Low** — remains flagged for human review |

## My Reasoning

I chose to build the break dispute as a configurable policy rather than a fixed rule because there is no objectively correct answer here without additional evidence. The assignment's own description calls this "intentionally ambiguous," and I think the most honest engineering response to genuine ambiguity is not to pretend you can resolve it — it's to make the resolution strategy transparent, configurable, and clearly flagged for human judgment.

The engine does not try to be clever about this case. It says: here's what each source claims, here's the GPS timeline, here's what the messages suggest, I've applied your configured policy, confidence is low, a human should look at this.

That's the right answer for a production system handling payroll.
