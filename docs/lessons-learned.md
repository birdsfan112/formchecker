# Lessons Learned
# Running log of surprises, wrong assumptions, and corrections.
# Update at the end of every session. Read at the start of every session.

---

## How to Use This Doc

At the end of each session, Claude will ask: "What surprised us today?"
Log it here. Over time this becomes the project's institutional memory —
the things that tripped you up once and shouldn't trip you up again.

---

## Log

### [Date] — [Session Topic]

**What we assumed:**
> e.g. "The invisible barrier was caused by a nearby building."

**What was actually true:**
> e.g. "It was an elevated platform geometry above the walkable surface."

**How we found out:**
> e.g. "Added print statements to log player Y position and found it was being blocked at height, not horizontal position."

**What to watch for next time:**
> e.g. "When debugging collision/barrier issues in Roblox, always check geometry on all three axes before assuming horizontal obstruction."

**Should this update a reference doc?**
> e.g. "Yes — added to assumptions-surfacing.md under 'Common Assumption Traps: In Code'"

---

### 2026-04-24 — Archived from CLAUDE.md during compaction

**ngrok needs HTTP upstream, not HTTPS.** When ngrok proxies to a local HTTPS server, it gets confused. Point ngrok at the HTTP port (8080) and let ngrok handle TLS termination.

**Phone screen recordings are the best debug tool.** When tuning thresholds that show debug overlays, have Scott screen-record on his phone rather than memorizing numbers at 6 feet. Extract frames with ffmpeg (`fps=1/5` gives one frame per 5 seconds) and read the debug text from still images. More reliable than verbal reports. (Full workflow: `docs/debug-video-workflow.md`.)

---

[Add new entries above this line, newest first]

---

## Patterns (Claude fills this in periodically)
> Once 3+ similar lessons appear, Claude should surface the pattern and suggest
> adding it to the relevant reference doc as a standing rule.

| Pattern Noticed | Relevant Doc to Update | Done? |
|---|---|---|
| | | |

---

## Checklist Review Prompt (for Claude)
At the end of each session, ask Scott:
> "Anything surprise us today that we should log here? And do any of the patterns
> in this doc suggest we should update one of the other reference docs?"
