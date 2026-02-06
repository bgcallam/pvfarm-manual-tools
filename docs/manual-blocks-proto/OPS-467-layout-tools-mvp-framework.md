# OPS-467: Layout Tools — MVP Framework

**Status**: Working draft (v4.0 — phase labels removed, refining before prioritization)
**Owner**: Ben
**Source**: Manual Blocking Workshop + Miro table + refinement sessions 2026-02-06
**Miro**: [Tools and Layouts frame](https://miro.com/app/board/uXjVIuBT1TI=/?moveToWidget=3458764653400784904&cot=14)
**Linear**: [OPS-467](https://linear.app/unfoldings/issue/OPS-467/determine-layout-tool-priority-based-on-layout-testing-results)
**Codebase research**: [OPS-490 Technical Reference](./OPS-490-pvfarm-codebase-research.md)
**Date**: 2026-02-06

---

## Definitions

Framework-specific terms only. Standard platform terms (tracker, row, block, equipment, sub area, ILR, GCR, r2r, setback, block height) are not redefined here.

| Term | Definition |
|------|------------|
| **Contiguous field** | Adjacent trackers NOT separated by a road or boundary. Roads and boundaries define contiguity limits. |
| **Contiguous area** | The zone affected by an edit or fill operation, bounded by roads and boundaries. Detected on-the-fly — not defined by hard-boundary sub areas. Auto-trim / auto-regen operates within this area only. |
| **Mask (Block Mask)** | Geometric boundary defining which trackers belong to a block. Does not exist as an explicit type in the codebase today — needs a new abstraction. Created mask-first, skid-first, or extracted from auto-generate. |
| **OSnap** | Object Snap — snapping to offset distances and geometric points. Primarily offset-based (road clear distance, r2r, array offset); object-point snapping used mainly during Move. |
| **Smart Guide** | Relationship-based alignment aid that enforces design criteria. Toggleable via modifier key. SketchUp-style color-coded feedback. |
| **Ghost** | Dimmed, non-interactive rendering of objects from the inactive mode. Provides spatial context without clutter. |
| **Noodle-align** | Deformable alignment where an object (road or tracker field) conforms to follow a non-orthogonal reference, rather than rigidly shifting. The road or field "noodles" along the boundary. |
| **Stamp** | Predefined object or object group placed from a palette. Can be individual (single tracker, road segment) or compound (masks + trackers + equipment bundled). Combined fill = array copy of a stamp from the palette, placing trackers and auto-grouping into blocks in one pass. |

---

## Core Principles

1. **Preview before commit.** Hover → preview → toggle options → click to commit. Every tool follows this pattern. Users always see what will happen before it happens. Preview size may be limited for large areas to avoid latency.

2. **Trackers first, then blocks.** The solver can't optimize trackers/roads and blocks simultaneously — especially on constrained/irregular sites (EU). Solve trackers + roads first (Tracker Mode), then group blocks (Block Mode).

3. **Independent regeneration.** Regenerating trackers should not require regenerating blocks (though it may invalidate them). Regenerating blocks should not move trackers.

4. **Local edits, local consequences.** When geometry changes, auto-trim and auto-regen apply within the contiguous area only — detected on-the-fly, not hard-boundary. No global cascade. Either delete overlapping objects (including setbacks) or regenerate locally. Never squish outward.

5. **Scope control.** Sub areas limit the blast radius of any operation. Tools respect sub area boundaries.

---

## Modes

Three modes control what objects are visible, selectable, and editable.

**Tracker Mode** (`T`) — Roads + Trackers + Boundaries
Operates on trackers, roads, boundaries. Masks and equipment are ghosted for spatial context.

**Block Mode** (`B`) — Block Masks + Equipment
Operates on block masks, skids/equipment, electrical groupings. Trackers and roads are ghosted for spatial context.

**Normal Mode** (`N`) — Combined View
All objects visible and interactive. No ghosting. Used for overview, general navigation, and non-tool-specific tasks.

Mode switching is explicit (deliberate user action, not inferred). The UI adapts to the active mode — toolbar, right-click menus, and settings panels show only mode-relevant options (see Context-Specific UI).

---

## Modifiers

Consistent across all tools. Users learn one vocabulary. All primary hotkeys target the left hand.

| Modifier | Action | Precedent |
|----------|--------|-----------|
| **T / B / N** | Switch mode: Tracker / Block / Normal. | — |
| **Spacebar** | Toggle context-dependent options with live preview. Fill: Mega DC / Max DC / Aligned. Edit: string size table. Stamp: H/V orientation. Align: align type. | Revit orientation toggle |
| **Tab** | Cycle selection scope: individual → row → contiguous field → all. | Revit tab-cycling |
| **Shift+Tab** | Reverse tab-cycle direction. | Revit |
| **Hold [key]** (TBD) | Temporarily switch tool sub-mode. Release → return to default. Left-hand key. | Illustrator hold-A |
| **Shift** | Lock current inference/guide direction. Release to unlock. | SketchUp inference lock |
| **Alt/Option** | Suppress all snaps. Free positioning while held. | AutoCAD F3 |
| **Ctrl/Cmd** | Snap override — one-time snap mode selector for next action only. | AutoCAD Shift+Right-click |
| **Ctrl/Cmd+Click** | Add to selection. | Standard |
| **Shift+Click** | Remove from selection. | Revit |

**Open**: Hold-key assignment needs a specific left-hand key. Existing app hotkeys need deconflicting — audit current keybindings before finalizing.

---

## Infrastructure

Always-active behaviors — not discrete tools. Each has a persistent, collapsible settings panel (Adobe/Figma pattern).

### Object Snaps (OSnap)

Snapping to offset distances and geometric points. **Most snaps are offset-based, not object-based.** When placing or adjusting layout objects, snapping targets the configured offset distances (road clear distance, r2r, array offset, etc.). Direct object-point snapping (motor, EOR) is primarily useful during Move.

Configurable: users enable/disable snap categories. Keep 4–6 active at a time (AutoCAD best practice).

**Priority**: Proximity-based — closest applicable snap point wins. No fixed hierarchy.

**Snap catalog** (👁️ = MVP candidate, needs team review):

| Category | Snap Type | Description |
|----------|-----------|-------------|
| **Offset — Tracker** | 👁️ R2R spacing | Row-to-row distance |
| | 👁️ Array offset | Distance between tracker groups/arrays |
| | GCR step | Ground coverage ratio intervals |
| | String gap | Gap between strings within a tracker |
| **Offset — Road** | 👁️ Road clear distance | Setback from road edge to nearest tracker |
| | Road step distance | Intervals along road for placement |
| **Offset — Equipment** | Equipment/skid offset | Distance from equipment to trackers |
| | Block offset | Block boundary offset from equipment |
| **Offset — Boundary** | Boundary setback | Setback distance from boundary edge |
| **Geometric** | 👁️ Perpendicular | 90° to reference edge |
| | 👁️ Parallel | Parallel to reference edge |
| | 👁️ Road centerline | Center of road width |
| | 👁️ Road edge | Edge of road |
| | 👁️ Boundary vertex | Corner point of boundary |
| | 👁️ Boundary edge | Segment of boundary |
| | Boundary midpoint | Midpoint of boundary segment |
| | Extension line | Projected continuation of an edge |
| **Object-Point** (Move) | Motor | Tracker motor point |
| | End of Row (EOR) | Last tracker in a row |
| | Equipment connection | Electrical connection points on equipment |

**Running vs Override** (AutoCAD pattern): Running OSnap stays active until changed. Override OSnap (Ctrl/Cmd + right-click) selects a one-time snap type, suppressing running snaps for that pick.

**Visual feedback**: Color-coded highlight + tooltip (SketchUp pattern — green for endpoint, magenta for parallel/perpendicular).

---

### Smart Guides

Relationship-based alignment aids focused on enforcing design criteria — not pixel-precise placement.

**Guide types**: alignment (collinear edges/centers), equidistant (equal spacing), offset/setback enforcement, parallel/perpendicular, extension lines.

**Approach**: SketchUp-style automatic inference with color-coded feedback. Guides appear dynamically during operations, disappear when complete. No grid needed.

**Triple redundancy**: Color + tooltip + dotted geometry so the user always knows what constraint is active.

**Soft vs Hard**: Toggled by modifier key. Soft = visual only (default). Hard = prevents violating design criteria while modifier is held. Release modifier → back to soft.

**Advanced** (flag for dev): AutoCAD-style hover-to-establish reference points → snap to guide intersection.

---

### Selection System

How users pick things. Always available, works identically regardless of active tool.

**Current state** (codebase): `InteractiveEntitiesClickSelector` supports Click, Ctrl+Click (add/toggle), Shift+Click (remove), Alt+Click (hierarchy). `RectSelectorGizmo` supports lasso with L-to-R (inclusive) vs R-to-L (precise). No contiguous field, no tab-cycling, no row-level selection, no pre-highlight on hover.

**New behaviors**: Pre-highlight on hover. **Tab-cycling**: individual → row → contiguous field → all. Row detection can leverage existing `RowsCalculator` grouping logic. Contiguous field detection is new (on-the-fly, based on road/boundary analysis).

**Post-selection actions** (context menu): Add to sub area, Move, Copy, Align to..., object-type-specific actions.

**Import to sub area**: Select objects → add to an existing sub area. Critical ask — must be a post-selection action.

---

### Sub Areas

Spatial scope limiters for manual edits and organizational containers.

**Current state** (codebase): 3 types — `AllSiteArea`, `UnallocatedSubarea`, `SiteSubarea` (with priority, zones, equipmentBoundaries). Hard-boundary only. Objects cannot belong to multiple sub-areas. No calculated/on-the-fly type.

**Contiguous area detection**: The "contiguous area" concept (for scoping Fill and Edit operations) requires on-the-fly detection from roads and boundaries. This is separate from hard-boundary sub areas — it's a computed, transient scope. Both systems coexist: sub areas for organization, contiguous areas for operation scoping.

**Key ask**: Select objects → import/add to existing sub area (post-selection action).

---

### Move / Copy

Default behavior when dragging a selection. Always available.

**Move**: Drag selected objects. Respects active snaps and guides.

**Copy**: Modifier + drag. Creates a single copy at the drop location.

**Array copy**: Select objects → enter copy mode → mouse distance from original determines number of copies. Copies are spaced at implicit offsets from current layout settings (r2r for trackers, road step distance for roads). Move mouse diagonally → copies in 2D (grid array). Distance = count × offset. Live preview shows copies appearing/disappearing as mouse moves. Auto-populates offset values from Generation Settings.

---

### Generation Settings (Layout Panel Sync)

Global settings affecting tool behavior, synchronized bidirectionally with the existing Layout Panel. The editing panel provides a streamlined view; values stay linked.

**Current Layout Panel** (codebase): `LayoutRootPanel` with 5 groups — buildableArea, roads, solarArrays, blocking, aiAssistantConfig. Persistent state in localStorage.

**MVP settings** (subset of Layout Panel — not all settings apply to tools):

- **Offsets** — r2r, equipment offset, block offset, boundary offset, array offset.
- **ILR targets / ranges** — constraint indicators during block operations.
- **Road step distance** — for fill and array-copy spacing.
- **Module / string configuration** — available string sizes for Edit spacebar toggle.
- **Block height** — drives auto road placement in Max DC and Aligned fill modes. New concept — needs definition.
- **Equipment-removes-trackers toggle** — whether placing/moving equipment removes trackers underneath.

**Panel behavior**: Persistent, collapsible (Adobe/Figma). Change in one place → reflected in the other.

---

### Context-Specific UI

UI adapts to active mode and tool (Maya-style): toolbar, right-click menus, settings panels show only relevant options. Mode indicator always visible.

**Example — Tracker Mode + Fill**: Toolbar shows Fill (active), Edit, Align, Trim/Extend. Settings: fill mode toggle, gap tolerance, road step distance, r2r. Right-click on tracker: Move, Copy, Select Row, Align to...

**Example — Block Mode + Edit**: Toolbar shows Fill, Edit (active), Align. Settings: ILR indicator, snap settings, mask edit sub-mode. Right-click on mask: Divide, Join, Extrude, Add racks.

---

### Visual Feedback

**Ghost rendering**: In Tracker Mode, masks/equipment are ghosted (dimmed, non-interactive). In Block Mode, trackers/roads are ghosted. In Normal Mode, nothing is ghosted. Provides spatial context without clutter.

**Fill preview overlay**: When filling a contiguous area that already contains objects, existing objects are grayed out and the preview renders on top. Users always get a preview regardless of existing content. For very large areas, preview may be size-limited to maintain responsiveness (see Extension Map — Interactive note).

**Automatic block recoloration**: Blocks are auto-recolored on create, modify, split, or join. Users never manually recolor.

**Capacity/ILR target indicators**: During operations, ILR and capacity targets from Generation Settings display as visual indicators showing whether edits stay within constraints.

**Preview tooltips**: Every tool has mode-specific tooltips that update live during preview. See per-tool sections below for specifics.

---

## Tools

### Fill

**Tracker Mode — Flood-fill area with trackers.**

Core interaction: hover over bounded area → existing objects gray out, preview appears on top → tooltip shows fill metrics → spacebar toggles fill mode (preview updates live) → click to commit.

**Fill modes** (spacebar toggle):

| Mode | Roads | Alignment | Use Case |
|------|-------|-----------|----------|
| **Mega DC** | Works with existing roads only | None — max density | Maximum density, user handles grouping later |
| **Max DC** | Block-height-driven auto road placement | Grid-aligned | Balance density + structure |
| **Aligned** | Block-height-driven auto road placement | Full alignment priority | Most structured |

No blocking in Tracker Mode fill — blocking is a separate manual step in Block Mode.

**Settings** (from Generation Settings): fill mode, gap tolerance, road step distance, block height, r2r and gap.

**Block Mode — Group trackers into blocks.**

Three entry points (spacebar toggle): mask-first (draw orthogonal rectangle → system assigns trackers within), skid-first (place equipment → system generates mask boundary), or extract-from-generate (masks derived from auto-generate mode via the current Layout Panel — the system already produces block groupings, so users can extract those masks as a starting point and refine manually).

**Mask placement across boundaries**: Hover on one side of a road/boundary → mask stays on that side. Hover over the delineator itself → mask extends to both sides.

**Settings**: rectangle vs skid point (spacebar), gap tolerance, max distance to road, block shape by equipment-to-road relationship.

**Requirements**: ILR-compliant blocks, boundary modification auto-moves tracker assignment to covering mask.

#### Preview Tooltips — Fill

| Context | Tooltip Content |
|---------|----------------|
| Tracker Mode | Total fill power (e.g., "+2.3 MW"), tracker count, r2r |
| Block Mode | ILR for the mask being created/modified, tracker count in mask |

---

### Edit

**Tracker Mode — Vertex manipulation** on roads, boundaries, and tracker adjustment.

Core interaction: select object → vertices/control points appear → drag to modify → system auto-trims/auto-regens the contiguous area.

**Sub-modes** (spacebar or hold-key toggle): point edit, line/segment edit, add/remove point.

**String size toggle**: Select tracker → spacebar cycles through available string sizes / size tables from project assets. Preview updates live showing the tracker at each size.

**Adaptive road editing**: Moving road points → trackers on either side adapt. Toggle: Adaptive ON (removes trackers under road + locally adjusts nearby trackers) vs Adaptive OFF (removes only trackers under road). Spacebar toggles fill mode for adaptive updates.

**Boundary editing**: Same pattern as road editing — auto-trim + auto-regen for contiguous area. Overlap (including setbacks from Generation Settings) → delete or regen.

**Equipment placement**: Whether moving equipment removes trackers underneath is controlled by the equipment-removes-trackers toggle in Generation Settings.

**Block Mode — Modify block mask geometry.** Extrude block boundary, select racks to add to boundary, ILR range indicator.

**Requirements**: Active OSnaps and Smart Guides during all edits. Boundary modification auto-moves tracker assignment to covering mask.

**Reference**: Illustrator/Figma (point editing), Revit (adaptive), Siteshift (masks).

#### Preview Tooltips — Edit

| Context | Tooltip Content |
|---------|----------------|
| Tracker Mode (road/boundary edit) | Affected area metrics, tracker count delta, constraint status |
| Tracker Mode (string size toggle) | New string size, power delta |
| Block Mode (mask edit) | Updated ILR, tracker count in mask |

---

### Align

2-pick flow: (1) reference object, (2) objects to align. One tool — spacebar toggles alignment type.

**Trackers**: Align to boundary → spacebar toggles rigid (shift entire field) vs noodle-align (deform field to follow non-orthogonal boundary). Contiguous field + align to road → shifts trackers as close to road as possible.

**Roads**: Align to boundary → spacebar toggles rigid align vs noodle-align. Noodle deforms road to conform to non-orthogonal boundary.

**Blocks**: Align mask edges to other objects or masks.

**Equipment**: Align to sub-object snaps (e.g., motor).

**Settings**: bounding box vs segment toggle, alignment options matching snap settings, respect offsets/r2r/gaps.

#### Preview Tooltips — Align

| Context | Tooltip Content |
|---------|----------------|
| Tracker align | Offset distance, r2r status, alignment type (rigid/noodle) |
| Road align | Deformation preview, affected tracker count |
| Block align | ILR impact, edge-to-edge distance |

---

### Trim / Extend

Separate tool from Edit — interaction pattern differs from vertex editing. Trim removes geometry beyond a boundary; extend projects geometry to reach a boundary.

**Tracker Mode**: Trim trackers to boundary (replace with smaller string size or remove). Extend trackers to boundary (extend using largest fitting string). Respects setback and layout settings from Generation Settings.

**Roads**: Trim road to boundary. Extend road to boundary.

**Flow**: 2-pick — (1) trim/extend boundary, (2) objects to trim/extend.

**Reference**: Revit trim/extend, AutoCAD trim/extend.

#### Preview Tooltips — Trim / Extend

| Context | Tooltip Content |
|---------|----------------|
| Tracker trim | Trackers removed count, string size changes, power delta |
| Tracker extend | Trackers added count, string sizes used, power delta |
| Road trim/extend | New road length, affected trackers |

---

### Stamp

Place predefined objects or object groups into the scene from a palette. Requires a save/manage mechanism (the palette/library system — significant feature in its own right).

**Tracker Mode**: Primary road placement tool. Hover for preview, spacebar toggles H/V orientation, click to commit. Modes: noodle (follow seam vs strict H/V), block-height placement, array mode (parallel roads at step distance intervals).

**Block Mode**: Stamp predefined block shapes. Toggle "full blocks only."

**Cross-mode stamps**: Stamps can be individual objects (single tracker, single road) OR compound groups that span both modes — masks + trackers + equipment bundled together. This is the natural home for cross-mode selection: selecting trackers and masks simultaneously becomes meaningful when saving/placing compound stamps.

**Combined fill** (Stamp + Fill): Array copy of a stamp from the palette — places trackers and auto-groups them into blocks in one pass. Essentially Fill with a Stamp as the unit, instead of individual trackers. Comes after separate Fill and Stamp workflows are proven.

**Depends on**: Shape Library / Palette system.

---

### Boolean — Divide / Join

Separate tool — boolean operations are conceptually different from trim/extend or vertex editing.

**Block Mode** (primary use): Divide (split a mask into 2 blocks) and Join (merge two shapes into the same block, even if non-contiguous).

**Flow**: 2-pick — (1) source mask, (2) second mask or split line.

---

## Deferred Items

| Item | Reason |
|------|--------|
| Pin (location toggle) | Simplify MVP. Can add post-launch. |
| Lock (relationship constraint) | Simplify MVP. Lock-after-align adds complexity. Locks would be undone by full layout generation anyway. |
| Shape Library / Palette | Required for Stamp. Significant feature. |
| Swap / Replace | Not blocking first-win workflow. |
| Offset tool | Same as today. UI refresh only. |
| Turn radius for road crossings | "NOT MVP." |
| LV-aware pinning | "LV makes this much more complicated." |
| Boundary setback snaps | Can already offset boundaries. |
| GCR / equipment sub-object snaps | Snap expansion — add after core offset snaps are proven. |

---

## Open Questions

1. **All three fill modes in MVP?** Or start with Mega DC + one other?
2. **Hold-key for sub-mode switching**: Which left-hand key?
3. **Block height definition**: What exactly determines auto road placement in Max DC and Aligned? Is it row count? Elevation? Needs definition.
4. **Block mask abstraction**: New BIM archetype or extend existing boundary/config system? (Codebase has no explicit mask geometry — dev decision.)
5. **Contiguous area detection**: Algorithm for on-the-fly detection from roads and boundaries?
6. **Interactive solver**: Current solvers kick off and return. Can we stream preview results? Do local computation for small areas? Sub-area generation already works — how do we scope to contiguous areas?
7. **Preview size limiting**: What's the threshold for degraded preview? Can we show partial results for large bucket-fill areas?
8. **Trim/Extend scope**: Exact behaviors for tracker trimming (string downgrade vs remove) and road trimming.
9. **Existing hotkey conflicts**: Audit current app keybindings before finalizing modifier table.

---

## Technical Questions (Answered)

*Full details in [OPS-490 Technical Reference](./OPS-490-pvfarm-codebase-research.md). Key findings below.*

### Object Model

- **Tracker**: `SatProps` — length, modules_orientation, rows_count/gap, string_size/count, max_tilt, frame variants, placement, piles, cost_breakdown.
- **Road**: `RoadProps` — constraints (support/equipment), `GraphGeometry` polyline, width, computed length/area.
- **Boundary**: `boundary_type` (include/exclude), `source_type`, `ExtrudedPolygonGeometry`, `Boundary2DDescription` with `pointsWorldSpace`.
- **Block mask**: **No explicit geometry type.** Blocks = logical groupings via `BlockEquipment` config + `BlockNumberSolver`.
- **Equipment**: `InverterProps`, `TransformerProps`, `CombinerBoxProps` — dimensions, electrical specs.
- **Row**: **Not explicit.** Inferred in `RowsCalculator.ts` — grouped by rotation, sorted by position, split by spacing.
- **Offsets**: Hierarchical — per-tracker frame props + global layout config.

### Existing Tools

- **Layout generation**: `generateFarmLayout()` with 5 targets. Multiple solver backends. All global regen.
- **Selection**: Click, Ctrl+Click, Shift+Click, Alt+Click, lasso (L-to-R / R-to-L). No tab-cycling, no contiguous field.
- **Move/Copy**: Drag with basic snap (on/off + grid step). No copy implementation.
- **Road editing**: Polyline drawing, parallel offset, trim by boundary. Road move = full tracker deletion + regen.
- **Snap system**: Basic toggle (`snapToObjects` bool + `snapToGridStep`). 9 point categories. No configurable categories or priority.
- **Alignment**: `alignSolarArraysRelativeRow()` — Center/Top/Bottom. Not 2-pick. No lock.
- **Trim/Extend**: `trimRoadByBoundary()`. Tracker pruner with string downgrade + vertical shift.

### UI & Rendering

- **No preview/ghost layer.** System generates and commits immediately.
- **No mode system.** Capability flags (`generate_arrays`, `generate_blocks`) per site area.
- **Sub areas**: Hard-boundary only. 3 types. No multi-membership. No calculated type.
- **Layout Panel**: 5 groups (buildableArea, roads, solarArrays, blocking, aiAssistantConfig).

### Algorithms

- **Multiple solvers**: polygon-filler (TS), nonblocking-filler (Python), site-filler (Python+C++), autoblocking (OR-Tools), pixeling-solver (shapely). **All global regeneration** — but sub-area generation exists, so incremental scoping is feasible.
- **ILR**: Real-time per-block via `LazyDerivedAsync`. Formula: `dcPowerKw / maxDcPowerKw`.
- **Block height**: Does not exist in codebase. Road placement driven by ILR ranges and blocking strategies.

---

## Extension Map

**🔴 Critical requirement: Interactive.** The current system dispatches to solvers (Python/C++ via REST API) and waits for batch results. The framework requires real-time preview — hover → see result before commit. Options to investigate: streaming solver results as they compute, local (in-browser TypeScript) computation for small contiguous areas, preview size limiting for large areas. Sub-area generation already works, so scoping solvers to contiguous areas is feasible. This is the single most important architectural shift.

*Status: ✅ exists, ⚠️ partial, ❌ new.*

| Capability | Status | Current State | What Needs to Change |
|-----------|--------|--------------|---------------------|
| Tracker placement / generate | ✅ | `generateFarmLayout()` with 5 targets. Multiple solver backends. All global regen. | Interactive paint-bucket with local/incremental fill within contiguous area. Preview before commit. Spacebar toggle between fill modes. |
| Road editing (vertex) | ✅ | `InteractiveRoadAdder`, `InteractiveRoadsBoundariesTrim`. | Road move → currently deletes ALL trackers + full regen. Need: adaptive local-only update scoped to contiguous area. |
| Block mask editing | ⚠️ | `autoblocking/solver.py` (OR-Tools). No explicit mask geometry. Blocks = logical groupings. | Need: mask geometry abstraction, mask-first + skid-first + extract-from-generate workflows, interactive mask editing. |
| Auto-blocking | ✅ | OR-Tools constraint programming, `BlockNumberSolver`, pixeling-solver. Global. | Need: Block Mode Fill that operates locally, ILR-constrained mask generation per contiguous area. |
| Selection (click, lasso) | ⚠️ | Click, Ctrl+Click, Shift+Click, Alt+Click, lasso L-to-R / R-to-L. | No contiguous field. No tab-cycling. No row-level. No pre-highlight. Need all four. |
| Move/Copy | ⚠️ | `EditControlsMouseDragConsumer` with basic snap (on/off + grid step). | No copy. Need: modifier+drag copy, array copy (distance = count × offset, diagonal = 2D), snap integration. |
| Snap system | ⚠️ | `snapToObjects` (bool) + `snapToGridStep` (0–100m). 9 point categories. | No configurable categories. No priority. No running vs override. Major expansion to offset-based snap system. |
| Smart guides | ❌ | Nothing. | Entirely new. Relationship inference, automatic activation, color-coded feedback, modifier-key soft/hard toggle. |
| Alignment (2-pick) | ⚠️ | `alignSolarArraysRelativeRow()` — Center/Top/Bottom. Groups by row. | Not 2-pick. No noodle-align. Need: 2-pick flow, spacebar toggle, noodle for roads + tracker fields. |
| Preview/ghost rendering | ❌ | Equipment text preview only. Generate-and-commit. | Full preview layer, ghost-opposite-mode, fill overlay (gray existing + preview on top), live tooltips. Major new capability. |
| Mode switching UI | ❌ | Capability flags per site area. No Tracker/Block/Normal. | Explicit 3-mode system with hotkeys (T/B/N), mode-dependent UI, ghost rendering per mode. |
| Tab-cycling selection | ❌ | Nothing. | New. Tab cycles individual → row → contiguous field → all. Row detection via `RowsCalculator`. Contiguous field detection: new. |
| Context-specific menus | ⚠️ | `PUI_Builder` for property panels. Panels are property-focused. | Mode-dependent toolbar/menu filtering, tool-specific right-click menus, Maya-style adaptive UI. |
| ILR live feedback | ✅ | Real-time per-block via `LazyDerivedAsync`. Displayed in project metrics + property panel. | Extend to preview context: per-mask display before commit, fill tooltip integration, constraint indicator. |
| Sub area scoping | ✅ | 3 types (AllSiteArea, UnallocatedSubarea, SiteSubarea). Hard-boundary. No multi-membership. | Import-to-sub-area post-selection action. Contiguous area detection is separate (on-the-fly, not hard-boundary). |
| Contiguous area detection | ❌ | Nothing. | New algorithm: detect contiguous areas on-the-fly from road/boundary geometry. Critical for scoping Fill, Edit, auto-regen. |
| Block recoloration | ❌ | Nothing found. | Automatic recoloration on create/modify/split/join. |
| Layout Panel sync | ✅ | `LayoutRootPanel` with 5 groups. Persistent in localStorage. | Bidirectional sync to editing panel. Straightforward — panel structure is well-defined. |

**Summary**: 6 ✅ exist (need extension) · 6 ⚠️ partial (significant gaps) · 7 ❌ new (build from scratch).

---

## Design Precedent Summary

### Snap/Guide Hierarchy

**AutoCAD OSnap**: Proximity-based priority. Running snaps + override snaps. 4–6 modes active. Shift+Right-click for override.

**Illustrator Smart Guides**: Selective enabling. Magenta visual language. Cmd/Ctrl to bypass. Configurable tolerance.

**SketchUp Inference**: Automatic (no configuration). Color-coded: green = endpoint, light blue = midpoint, red = on edge, magenta = parallel/perpendicular. Shift to lock direction. Triple redundancy: color + tooltip + geometry.

**Revit Selection**: Tab cycles overlapping candidates. Pre-highlight. Scope drilling: element → face → edge → point. Ctrl = add, Shift = remove.

### Recommended Pattern for PVFARM

Primary: SketchUp-style automatic inference with color-coded feedback. Enhanced with AutoCAD-style configurable OSnap for offset precision. Selection: Revit-style tab-cycling with pre-highlight. Modifiers: Shift to lock (SketchUp), Alt to suppress (AutoCAD), Spacebar to toggle (Revit). Panels: Adobe/Figma persistent collapsible.

### Reference Applications

| Application | Relevant Patterns |
|------------|-------------------|
| Adobe Illustrator | Bucket fill with gap settings, smart guides, per-feature toggles |
| AutoCAD | OSnap modes + running vs override, proximity priority, object snap tracking |
| Revit | Spacebar toggle, adaptive placement, trim/extend, align, tab selection |
| SketchUp | Inference system, color-coded snaps, shift-to-lock, minimal configuration |
| Siteshift | Block masks |
| Figma | Point/vertex editing, persistent settings panels |
| Maya | Context-specific UI (mode-dependent toolbars/menus) |

---

## Next Steps

- [x] **Codebase research** (OPS-490): All 24 questions answered. Key findings: no block mask geometry, no mode system, no preview layer, all solvers global-regen-only (but sub-area gen exists), block height doesn't exist.
- [ ] **🔴 Interactive architecture**: Solvers currently batch-dispatch. Determine approach for real-time preview — streaming, local compute, preview size limiting.
- [ ] **🔴 Block mask abstraction**: No explicit mask geometry. Dev team needs to decide architecture.
- [ ] **🟡 Define block height**: New concept — what does it mean, how does it drive road placement?
- [ ] **Prioritization pass**: Re-add phase labels (P1/P2/TBD) after refining is complete.
- [ ] **Platform research**: Trim/Extend patterns in AutoCAD, Revit, SketchUp.
- [ ] **Illustrator smart guide deep dive**: Priority when multiple guides compete.
- [ ] **Snap list review**: Finalize MVP vs later snap types with team.
- [ ] **Hotkey audit**: Deconflict with existing app keybindings.
- [ ] **Nano Banana image generation prompts** (OPS-491): Detailed prompts showing each tool's core interactions.
