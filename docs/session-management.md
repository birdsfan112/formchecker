# \# Session Management Protocol

# \# Keeping long sessions on track and context healthy

# 

# \---

# 

# \## Session Start

# 1\. Review CLAUDE.md

# 2\. Review project reference docs in ./docs/ — read them, don't just list them

# 3\. Confirm today's goal by summarizing it naturally, not quoting the doc back:

# &#x20;  - Read project-goals.md, then say something like: "We're building X, currently

# &#x20;    in phase Y, and last time we were working on Z. Does that still reflect where

# &#x20;    you want to go today, or has anything shifted?"

# &#x20;  - If there's a lessons-learned.md, briefly surface anything relevant to today's task

# 4\. Identify any open items from the last session

# 5\. Agree on a stopping condition: "We'll know we're done when Y"

# 

# \---

# 

# \## Staying On Track Mid-Session

# 

# Every 3–5 meaningful interactions, do a brief reset:

# \- "Are we still working toward \[original goal]?"

# \- "Have any of our assumptions changed?"

# \- "Is there anything I've drifted from in CLAUDE.md or the reference docs?"

# 

# Warning signs that context is drifting:

# \- You're solving a sub-problem and have lost sight of the main goal

# \- You're making changes that feel right but can't be directly tied to the session goal

# \- You've been in the same area of the codebase/document for a long time without progress

# \- You're reasoning from memory rather than re-reading the source

# 

# If drift is detected:

# 1\. Stop

# 2\. Re-state the original goal

# 3\. Describe where you actually are relative to that goal

# 4\. Ask Scott: "Do you want to course-correct, or has the goal shifted?"

# 

# \---

# 

# \## Scope Creep Prevention

# \- Flag anything that's outside the current task scope — don't fix it

# \- Keep a running "noticed but not touching" list to revisit later:

# 

# | Item Noticed | Where | Priority (Scott fills in) |

# |---|---|---|

# | | | |

# 

# \---

# 

# \## Session End Protocol

# 1\. Summarize what was accomplished

# 2\. List what's still open

# 3\. Document any lessons learned or surprises

# 4\. Note any assumptions that were wrong and what the correction was

# 5\. Ask Scott: "Should we update any reference docs based on what we learned today?"

# 6\. Leave a clear breadcrumb for the next session: "Next time, we should start by..."

# 

# \---

# 

# \## Context Window Management

# 

# \### Warning before compaction — REQUIRED

# \*\*Never compact or clear context without warning Scott first.\*\* This is not optional.

# 

# When the context window is getting full, stop and say:

# > "We're getting close to the context limit. Before I compact, here's where we

# > stand: \[brief summary of session goal, what's done, what's open, any live

# > assumptions]. Want me to go ahead and compact, or is there anything you want

# > to capture first?"

# 

# Wait for Scott's confirmation before compacting.

# 

# \### After compaction

# When resuming after a compaction, don't just ask a generic check-in question.

# Synthesize what you know and present it naturally:

# > "Picking up where we left off — we're working on \[project], currently in

# > \[phase]. Last session we \[accomplishment]. We were in the middle of \[task]

# > when context cleared. Ready to keep going, or do you want to adjust direction?"

# 

# \### General context health

# \- For long sessions: prefer re-reading source files over relying on earlier conversation

# \- Don't try to hold the entire project in context — pull in what's relevant to the current task

# \- If reasoning feels less sharp, flag it proactively — don't wait until context forces a reset

# 

# \---

# 

# \## Checklist Review Prompt (for Claude)

# At session end, ask Scott naturally — not by reading from a script:

# > "We accomplished \[X] today and left \[Y] open. Anything about how this session

# > went suggest we should update the reference docs or change how we run sessions?"

