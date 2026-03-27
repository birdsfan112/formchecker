# Decision Validation Checklist
# Use before implementing any meaningful change

---

## Before You Propose a Change

- [ ] Have I read the relevant files/context directly (not inferred from naming or memory)?
- [ ] Do I understand the current state well enough to describe it accurately?
- [ ] Can I state the problem in one clear sentence?
- [ ] Have I identified what is *actually* causing the problem vs. what I first assumed?

---

## Before Scott Confirms the Plan

Present the following explicitly:

**The goal:**
> "We are trying to accomplish X."

**My proposed approach:**
> "I plan to do Y."

**Why this approach:**
> "I'm choosing this because Z."

**Alternatives I considered:**
> "I could also have done A or B, but didn't because..."

**What I'm assuming:**
> "This plan relies on the following being true: ..."

**What I haven't verified:**
> "I haven't confirmed X — I'm inferring it from Y."

**Risks:**
> "If my assumption about X is wrong, then Y could happen."

---

## After Implementing

- [ ] Does the change actually solve the original problem?
- [ ] Did anything unexpected happen?
- [ ] Did I touch anything outside the scope of the task?
- [ ] Is the original goal still the right goal, or has something shifted?
- [ ] What should be documented or flagged for the next session?

---

## Checklist Review Prompt (for Claude)
At natural stopping points, ask Scott:
> "We've learned a few things this session. Does anything here suggest we should update this checklist?"
