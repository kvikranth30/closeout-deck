# Problem Context: Why Timesheet Reconciliation Matters

## The Business Problem

Staffing companies place workers at customer facilities—warehouses, manufacturing plants, logistics centers. For every shift, they must answer two questions:

1. **Payout**: How much do I pay the worker?
2. **Billing**: How much do I invoice the customer?

Seems simple. It's not.

---

## Three Sources of Truth (That Disagree)

### 1. Customer Systems (Facility Data)
- Hardware time clocks at facility entrances
- QR codes scanned on arrival/departure
- Paper sign-in sheets (yes, still common)
- Supervisor manual entries

**Problems:**
- Customer-controlled, staffing company has no visibility
- Often paper-based, arrives days later
- Doesn't capture work done outside clock-in areas
- Malfunctions go unnoticed

### 2. Time Tracking (Worker Submissions)
- Web or mobile app clock-in/out
- Worker-reported times
- Break logging

**Problems:**
- Self-reported (prone to rounding, errors, fraud)
- Requires worker compliance
- Depends on worker having phone/access
- Can be submitted late or amended

### 3. Location Intelligence (GPS Data)
- Background location tracking
- Geofence entry/exit events
- Activity detection (stationary, walking, driving)

**Why it's ground truth:**
- Passive, doesn't require worker action
- Objective measurement of presence
- Timestamps are system-generated

**Limitations:**
- Signal can be lost indoors (warehouses, basements)
- Battery/permission issues
- Shows presence, not necessarily work

---

## Why Conflicts Happen

### Scenario: Worker Claims 10 Hours, Facility Says 8

| Source | Clock In | Clock Out | Hours |
|--------|----------|-----------|-------|
| Facility | 6:00 AM | 2:00 PM | 8.0 |
| Worker | 6:00 AM | 4:45 PM | 10.75 |
| GPS | 5:58 AM | 4:42 PM | — |

Who's right? It depends:

- **GPS shows worker on-site until 4:42 PM** → Worker claim looks valid
- **Messages show supervisor approved overtime** → Even more confidence
- **Facility clock maxes out at 8 hours** → System limitation, not fraud

Without AI to reason through this, a human must manually review every discrepancy. At scale (thousands of shifts/day), this is impossible.

---

## The Cost of Getting It Wrong

### Underpaying Workers
- Legal liability (wage theft lawsuits)
- Worker churn and dissatisfaction
- Reputation damage

### Overpaying Workers
- Direct financial loss
- Encourages gaming the system
- Customer disputes when billed

### Billing Mismatches
- Customer disputes
- Revenue leakage
- Damaged relationships

---

## Current State: Manual Hell

Today, operations teams:

1. Download facility reports (often emailed as Excel/PDF)
2. Cross-reference with app submissions
3. Check GPS logs for discrepancies
4. Read through message threads for context
5. Make judgment calls
6. Enter approved times into payroll

This takes **15-30 minutes per disputed shift**. With 5% dispute rate on 10,000 shifts/week = 500 hours/week of manual reconciliation.

---

## The Opportunity: AI-Powered Reconciliation

What if an AI could:

- Ingest all three data sources automatically
- Detect conflicts and reason through them
- Use GPS as the tiebreaker when sources disagree
- Factor in message context (approvals, exceptions, explanations)
- Output a recommended payout with explanation
- Flag uncertain cases for human review

**The goal:** Chaos to Closeout in seconds, not hours.

---

## What Good Looks Like

A good reconciliation engine should:

### Handle Clear Cases Quickly
- All sources agree → High confidence, auto-approve
- Worker no-show confirmed by GPS → High confidence, $0 payout

### Reason Through Conflicts
- Not just pick one source, but weigh evidence
- Explain WHY one source is more reliable in this case
- Cite specific evidence (GPS timestamps, message quotes)

### Know When It Doesn't Know
- Flag cases that need human review
- Explain what's uncertain and why
- Suggest what additional info would help

### Be Robust to Messy Data
- Missing fields, inconsistent formats
- Partial GPS data, signal gaps
- Ambiguous messages

---

## Edge Cases to Consider

As you build your engine, think about:

- **Overtime disputes**: Who authorized it? Is there approval in messages?
- **No-shows**: How do you distinguish from GPS failure?
- **GPS gaps**: Indoor work, signal loss—how to handle missing data?
- **Split shifts**: Worker left and returned—was it authorized?
- **Break disputes**: Paid vs unpaid breaks, did they actually take them?
- **Equipment issues**: Clock malfunctioned, who do you believe?
- **Multi-site work**: Sent to secondary location—is travel time paid?
- **Training time**: Different rate? Who confirms completion?
- **Weather/emergency**: Site closed early—who pays?

---

## Success Metrics

For a production system, we'd measure:

- **Auto-approval rate**: % of shifts resolved without human review
- **Accuracy**: % of AI recommendations confirmed by human auditors
- **Time savings**: Minutes saved per shift vs manual process
- **Dispute reduction**: Fewer worker/customer complaints

For this assignment, focus on building something that demonstrates:

- Thoughtful handling of conflicts
- Clear reasoning in explanations
- Appropriate confidence calibration
- Graceful handling of edge cases
