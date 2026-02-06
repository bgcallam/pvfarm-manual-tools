# Manual Blocks Proto Decision Log

Date: 2026-02-06
Owner: Codex (autonomous implementation)
Context: PVFARM Manual Blocks Proto

## Product Decisions

1. Scope to demo-critical flows only.
- Implemented: mode switching, fill preview/commit, align rigid/noodle preview/commit, block mode ghosting, block fill preview/commit.
- Deferred: full CAD-level snapping, true solver integration, persistent selection graph, multi-object editing, stamp palette management.
- Why: The goal is a visual prototype for dev direction, not a production layout engine.

2. Deterministic local geometry over backend solver calls.
- Use lightweight local geometry generation for trackers, road, and blocks.
- Why: keeps interaction immediate and predictable in a prototype environment.

3. Storyboard-driven UX contract.
- The UI behavior follows the OPS-491 storyboard sequence so stakeholders can validate the intended interaction model quickly.
- Why: this is the fastest path to a convincing design/dev handoff artifact.

4. Explicit state machine for interaction steps.
- Represent tool flow as explicit interaction steps (fill preview/commit, align pick 1/2, align mode toggle, block preview/commit).
- Why: improves testability and avoids ambiguous transient behavior.

5. Keep existing visual system, improve clarity over redesign.
- Preserve current dark control shell and site canvas structure, add contextual status and guidance in-place.
- Why: minimize churn while improving demo readability.

## Technical Decisions

1. Move geometry logic into reusable pure helpers.
- Why: easier to validate, easier to evolve into production implementation.

2. Keep keyboard vocabulary from framework (`T`, `B`, `N`, `Space`).
- Why: aligns with framework expectations and demo script.

3. Smoke test strategy.
- Use build checks plus end-to-end manual smoke via browser interactions.
- Why: high signal for this prototype without over-investing in brittle automation.

## Out of Scope (Intentional)

- Real solver-backed preview streaming.
- Full sub-area and contiguous-area computational model.
- Full OSnap category model and smart guide hard constraints.
- Production-level data persistence/API integration.

## Final Implementation Notes (Completed)

- Default startup mode/tool is `Tracker` + `Fill` to match the demo narrative.
- Aligned fill defaults to ~126 trackers on the current parcel geometry (within the storyboard's ~120 target range).
- Align flow is implemented as strict 2-pick gating:
  1. Pick boundary reference.
  2. Pick north field.
  3. Preview (`Rigid` / `Noodle` via Space).
  4. Click to commit.
- Noodle alignment is implemented as column-wise variable shift to emulate contour-following behavior while preserving north-south tracker orientation.
- Block mode fill creates 5 masks (3 north, 2 south) with fixed ILR labels for stable demos.

## Smoke Test Results

Date: 2026-02-06
Environment: local Vite dev server (`npm run dev`), Chrome DevTools MCP interaction pass.

Checks performed:
1. Initial state validation: pending workflow, tracker count 0.
2. Fill commit in Tracker mode: succeeds; tracker count updates (~126); capacity updates.
3. Align flow:
- Pick 1 north boundary succeeds.
- Pick 2 north field succeeds.
- Space toggles Rigid -> Noodle and updates indicator.
- Commit succeeds; workflow status shows aligned (noodle).
4. Block flow:
- Switch to Block mode (`B`) and use Fill.
- Block preview/commit succeeds; 5 ILR labels visible.
- Workflow status shows blocks done.
5. Build verification: `npm run build` passes.

Known prototype limitations (intentional):
- No production solver integration or persisted project state.
- No full snap catalog or hard constraint guides.
- Block masks are deterministic demo slices, not electrical optimization outputs.
