# OPS-500: One-Site Functional Manual Tools Plan (Replan v7.1)

Date: 2026-02-10
Owner: Codex
Project: Manual Blocks Proto (PVFARM)
Spec: OPS-467 Layout Tools — MVP Framework v7.0 + user clarifications (2026-02-10)

## Purpose
Build a functional, tool-complete prototype for one site that mirrors the real PVFARM interaction model:
select-act, mode-aware editing, and mini-solvers for fill, align, and block assignment. The deliverable
is a working UI/UX prototype suitable for engineering handoff and UX validation.

## Spec Alignment (OPS-467 v7.0 + clarifications)
- Modes: Tracker / Block / Normal with explicit switching and mode-dependent UI.
- Tools: Fill, Edit, Assignment, Align, Trim/Extend, Move/Copy/Array (context actions).
- Infrastructure: selection pre-highlight + tab cycling, OSnap categories, contiguous field/area
  detection, ghost rendering, delete preview, live block recolorization.
- Generation settings: offsets, ILR targets/range, road step, string sizes, gap tolerance,
  block height/width distances, object-removes-underlying toggle.

## Clarifications (User)
- Road placement is a draw tool (click to polyline).
- Skid is a positioned square with a capacity.
- Tracker string sizes stay the same; the number of strings on the tracker changes (1/2/3).
- Fill with no roads fills the entire parcel.
- Notch tool is skipped for this prototype.
- Remove assignment is a modifier on Fill (eraser behavior).
- Block height/width UI must show both: distance + approximate count.
  - Height: "X ft, approx Y rows" (Y derived from row spacing).
  - Width: "X ft, approx 3-4 strings" (approx based on string count + tracker size).
- Gap tolerance can be simple; adjust later if needed.

## Scope In
1. Modes + UI model
- Explicit T/B/N switching; mode indicator always visible.
- Tool selection in black menu bar.
- Floating tool settings panel in viewport.
- Post-selection context menu (Move/Copy/Array + tool actions).
- Display lock to 2D top-down while tools are active.

2. Infrastructure
- Contiguous field/area detection from road/boundary geometry.
- Selection pre-highlight on hover; Tab cycles scope (T/B) or object type (N).
- OSnap categories (offset + geometric) with toggleable categories.
- Arrow key nudge; Shift multiplies step (Adobe pattern).
- Ghost rendering of inactive mode objects.

3. Tools
- Fill (Tracker mode): Mega DC / Max DC / Aligned. Trackers only, no roads.
- Fill (Block mode): Skid placement with shape modes (Blob / Desired Height / Max Width).
- Edit (Tracker mode): road/boundary vertex edit (point/segment/add-remove) + string size cycling.
- Assignment (Block mode): select block/skid → assign unassigned trackers; remove assignment via
  Fill modifier (eraser).
- Align: equipment/trackers (N/S/E/W) + roads/boundaries (rigid/noodle).
- Trim/Extend: Revit-style selection flow; tracker trim downgrades string size if possible.
- Move/Copy/Array: selection context actions; array spacing uses generation settings.

## Scope Out
- Notch tool (skipped for prototype).
- Boolean divide/join, Stamp, Smart Guides, Active Regen, Shape Library.
- Multi-site/sub-area workflows, persistence/API integration.

## Coordination / Risk Flags
- Canvas.tsx remains the merge hotspot; keep diffs scoped and commit in tool-sized steps.
- Contiguous field detection and road segmentation are foundational for all tool correctness.
- Block boundary generation must stay deterministic and cheap for interactive preview.

## Implementation Plan (Ordered for dependencies)
1. Foundations
- Data model additions (string count, skid, block boundary, selection state).
- Geometry helpers + contiguous field detection + snap categories.
- Selection pre-highlight + tab cycling in all modes.

2. Tracker Mode Tools
- Fill modes (mega/max/aligned) + gap tolerance + block height distance.
- Road draw tool (polyline) + road editing preview + delete-under-road logic.
- Trim/Extend flows + string size downgrade behavior.
- Align flows for trackers/roads, rigid/noodle preview.

3. Block Mode Tools
- Skid placement + block boundary algorithms (blob/height/width).
- Assignment tool + remove-assignment modifier.
- Live block recolorization + ILR indicators.

4. UI + Feedback
- Toolbar updates (tool icons + modes).
- Tool settings panel per tool + generation settings (distance + approx row/string labels).
- Selection context menu + Move/Copy/Array behaviors.
- Ghost rendering + delete preview + mode indicator.

5. Tests + Smoke
- Unit tests for geometry, fill solver, block assignment, contiguous fields.
- Manual smoke of every tool/workflow at each stage.
- Build verification (`npm run build`).

## Acceptance Criteria
- All tools in scope work end-to-end with select-act + preview/commit/cancel.
- Fill does not place roads; road draw is separate.
- Skids only absorb unassigned trackers; delete skid unassigns only.
- Remove assignment works as a Fill modifier (eraser).
- String count changes (1/2/3) are visible and affect tracker dimensions/labels.
- Generation settings panel shows both distance and approximate counts.
- Contiguous field scoping is enforced for all tools.
- Manual smoke matrix passes for each tool and each mode.

## Smoke Matrix (Manual)
1. Mode switching: T/B/N + mode indicator updates.
2. Selection: hover pre-highlight, Tab cycles scope/type, selection menu appears.
3. Fill (Tracker): Mega/Max/Aligned preview + commit. No roads placed.
4. Road draw: click-polyline, double-click/Enter commit, Escape cancel.
5. Edit (Road/Boundary): point/segment/add-remove, delete preview, commit/cancel.
6. Edit (String size): select tracker(s), spacebar cycle size, commit/cancel.
7. Align: trackers/equipment (N/S/E/W) + roads/boundaries rigid/noodle.
8. Trim/Extend: select cutting edge → trim; extend projection.
9. Move/Copy/Array: move selection, copy creates duplicate, array spacing uses settings.
10. Block Mode Fill: skid placement + shape modes + live ILR.
11. Assignment: assign unassigned trackers, remove assignment via Fill modifier.
12. Ghost rendering: inactive mode ghosted, active mode normal.
13. Build: `npm run build` succeeds.
