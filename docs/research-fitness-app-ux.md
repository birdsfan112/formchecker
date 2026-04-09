# Fitness App UX Research — Exercise Library Patterns

*Research compiled 2026-04-09 to inform FormChecker Exercise Framework redesign.*

---

## 8x3 App

- Bodyweight fitness app, companion to Reddit's Recommended Routine
- Pulled from iOS App Store July 2025, Android still exists
- Built by solo developer (Dmytro Novosad)
- Clean, distraction-free UI — users praised simplicity
- Video demonstrations for each exercise progression
- "Calisthenics Skill Tree" visualizing progression
- Succeeded through focus and simplicity, not visual spectacle

**Takeaway for FormChecker:** A solo-dev app can feel polished if it's focused. Scope discipline beats feature sprawl.

---

## Exercise Picker Patterns

### Search-First (Hevy, Fitbod)
- Big search bar + filter chips for equipment/muscle group
- Hevy has 400+ exercises; Fitbod adds AI recommendations
- Best for large libraries where users know what they want

### Body Map (MuscleWiki)
- Interactive anatomical diagram — tap a muscle to see exercises
- Intuitive for users who think in terms of "what hurts" or "what I want to work"
- High implementation cost; overkill for a focused bodyweight app

### Category-First (JEFIT)
- Pick muscle group from a grid, then see a filtered list
- 1,400+ exercises; redesigned to use collapsible filter categories
- Works well when library is large and users browse rather than search

### Custom Exercise Flow (universal pattern)
- Name → muscle groups → equipment → upload media → save
- Sits alongside built-in library rather than replacing it
- Essential for Phase 6 user-created exercises

**Recommendation for FormChecker:** Search bar + filter chips (muscle group, movement pattern). Library is currently 22 exercises — category-first is overkill now but filter chips scale to 50+.

---

## Exercise Demonstrations

| Format | Used By | Notes |
|--------|---------|-------|
| Animated GIFs | ExerciseDB (11k+ exercises) | Common, bandwidth-heavy |
| Short HD video | JEFIT (1,400+ exercises) | High quality, high storage cost |
| 3D anatomical animations | Muscle and Motion (premium) | Best clarity, high build cost |
| Static illustrations/silhouettes | Budget/focused apps | Lighter, consistent, easier to maintain |

**Key principle:** Consistency of style matters more than format choice. One clean illustration system beats a mix of GIFs, PNGs, and inconsistent art styles.

**FormChecker current state:** Canvas-drawn bezier silhouettes — consistent, zero external assets. Planned upgrade (visual-polish-sprint.md) is base64-embedded PNGs. The framework should accommodate both without forcing a format choice.

---

## What Separates Professional from Hobby

### Typography & Spacing
- One font family, 3–4 sizes max
- Obsessive consistent spacing (use a 4px or 8px grid)
- Random spacing is the #1 amateur tell — more than color or icons

### Color
- Energy colors (orange/red) for active states and CTAs
- Trust colors (blue/green) for progress and completion
- Limited palette: 2–3 colors + neutrals
- FormChecker uses orange accents — consistent with fitness app conventions

### Animation
- Subtle transitions signal state changes without distracting
- Every animation needs: trigger → rules → feedback → result
- Small actions (button press) → modest animation
- Milestones (workout complete, new PR) → celebration animation
- No animation for its own sake

### Empty & Loading States
- Professional apps design for EVERY state
- Under 1s: no loading indicator
- 1–3s: skeleton screens (ghost placeholders)
- 3–10s: progress bar with context ("Loading exercise library...")
- Error states: plain language, actionable ("Camera not found — check permissions")
- First-time states: onboarding hint, not a blank screen
- Power user states: fewer prompts, more density

**FormChecker gaps:** Camera permission denied state could be more actionable. Exercise picker empty state (if filtered to zero results) not designed.

---

## Technical Architecture

### Standard Exercise Data Schema
```json
{
  "id": "pushup",
  "name": "Push-Up",
  "force": "push",
  "level": "beginner",
  "mechanic": "compound",
  "equipment": "body only",
  "primaryMuscles": ["chest"],
  "secondaryMuscles": ["triceps", "shoulders"],
  "instructions": ["Start in plank position...", "Lower your chest..."],
  "category": "strength",
  "images": ["pushup_start.gif", "pushup_end.gif"]
}
```

### Taxonomy Dimensions
- **By muscle group:** chest, back, legs, core, shoulders, arms
- **By equipment:** body only, pull-up bar, rings, parallettes, resistance band
- **By mechanic:** compound (multi-joint) vs isolation (single-joint)
- **By movement pattern:** push, pull, squat, hinge, carry, core
- **By difficulty:** beginner, intermediate, advanced

### Media & Performance
- Store media separately, reference by URL or key
- Serve via CDN for large libraries
- Lazy load images — don't load off-screen exercise cards
- Virtual scrolling for lists of 50+ exercises (only render visible items)

### Open-Source Exercise Databases
| Source | Count | License | Notes |
|--------|-------|---------|-------|
| ExerciseDB | 11,000+ | CC | Includes GIF demos |
| free-exercise-db | 800+ | Public domain | JSON format |
| wger | 500+ | AGPLv3 | REST API available |
| wrkout/exercises.json | 2,500+ | MIT | Clean JSON schema |

**FormChecker note:** We're a focused bodyweight app — we don't need 11k exercises. But adopting the standard schema fields (primaryMuscles, equipment, level, mechanic) makes future integration possible without a rewrite.
