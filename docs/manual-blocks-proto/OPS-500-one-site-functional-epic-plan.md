# OPS-500: One-Site Functional Manual Tools Plan

Date: 2026-02-07
Owner: Codex
Project: Manual Blocks Proto (PVFARM)

## Purpose
Build a functional mini-manual-tools prototype for exactly one site/parcel set in this repo, with tool interoperability and reliable interaction behavior suitable for engineering handoff.

## Deep-Dive Concept Mapping (Spec -> Real PVFARM -> Prototype)

1. Site scope
- Real PVFARM supports site/sub-area structures (`AllSiteArea`, `UnallocatedSubarea`, `SiteSubarea`).
- Prototype scope is intentionally single-site only.
- Decision: remove sub-area semantics from interactions; keep contiguous field semantics only.

2. Field and contiguous selection
- Real PVFARM interaction engine uses click-select + topology-aware selection/snap systems.
- Prototype equivalent must still preserve field-level intent.
- Decision: contiguous field is derived from nearest tracker graph adjacency and road-side partitioning.

3. Row semantics
- In this prototype, user requirement is vertical row selection.
- Decision: `row` scope selects trackers sharing near-identical center X within the hovered contiguous field.

4. All semantics
- In production systems, “all” can be contextual and not global depending on active context.
- Decision: `all` in this prototype means contiguous field only (never whole site).

5. Tool interoperability
- Tools should compose in order: Fill -> Align -> Edit/Trim/Select with stable state.
- Decision: all local edits are scoped to active contiguous field when seed exists.

6. Exiting commands
- Decision: `Esc` always exits active command to neutral `select` context and clears active field seed.

7. Stamp tool
- User explicitly out-of-scope for this pass.
- Decision: remove stamp tool and related state/UX.

## Functional Scope (In)

1. Tracker/Block/Normal mode switching.
2. Fill preview/commit in tracker mode.
3. Align 2-pick flow + rigid/noodle preview/commit.
4. Edit actions scoped to active contiguous field.
5. Trim/Extend actions scoped to active contiguous field.
6. Select scopes:
- individual
- row (vertical)
- field (hovered contiguous field)
- all (contiguous field only)
7. Move/Copy/Array actions from Select.
8. OSnap + Smart Guides toggles.
9. Conductor startup/run scripts.

## Out of Scope (Explicit)

1. Multi-sub-area workflows.
2. Stamp/segment road stamping workflows.
3. Production solver integration or streaming previews.
4. Multi-site projects.
5. Persistence/API integration.

## Acceptance Criteria

1. No stamp tool appears in UI or state model.
2. No sub-area controls/overlays appear in UI or state model.
3. Clicking Edit/Trim/Select sets active contiguous field seed.
4. `row` selection reports vertical column counts (not horizontal bands).
5. `all` selection count is less than total trackers unless the site truly has one contiguous field.
6. `Esc` from any active command returns to select context and clears active seed.
7. Build succeeds (`npm run build`).
8. Smoke pass validates end-to-end tool interplay.

## Smoke Matrix

1. Fill commit from tracker mode.
2. Align pick1/pick2 + commit.
3. Edit click updates active seed + edit counter.
4. Trim click updates active seed + trim counter.
5. Select row shows narrow vertical selection count.
6. Select all shows contiguous field count (not site total).
7. Esc from edit/trim returns to select and clears seed.
8. Conductor run path boots local app successfully.

## Risks

1. Field adjacency heuristic can over/under-connect at extreme spacing values.
2. Selection preview depends on pointer location and may differ from click target if users move rapidly.
3. Prototype intentionally diverges from production data structures for speed.

## Mitigations

1. Keep adjacency tied to tracker dimensions (scale-relative thresholds).
2. Compute click selection from click-nearest tracker, not only hover state.
3. Document all intentional divergence in decision log and Linear epic.
