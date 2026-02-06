# OPS-490: PVFARM Codebase Research — Technical Reference

**Date**: 2026-02-06
**Companion to**: [OPS-467 Layout Tools MVP Framework](./OPS-467-layout-tools-mvp-framework.md)
**Codebase**: PVFARM monorepo (`luxembourg-v2/`)
**Scope**: 24 technical questions across object models, existing tools, UI/rendering, and algorithms.

---

## Object Models

### Tracker (Single-Axis)

**File**: `bim-app/bim-ts/src/sat/Sat.ts`
**Type**: `SatProps extends ArchetypePropsRoot`

Key properties:
- `length` — tracker length
- `modules_orientation` — landscape/portrait
- `rows_count` — number of rows in tracker
- `rows_gap` — gap between rows
- `string_size` — modules per string
- `strings_count` — strings per tracker
- `max_tilt` — maximum tilt angle
- `module` — PV module reference
- `string` — string configuration
- Frame variants: `BasicUnderModulesPilesFrameProps`, `BasicModulesRowFrameProps`, `ExactFrameProps`
- `placement` — position/rotation
- `piles` — foundation configuration
- `leading_edge` — leading edge height
- `lv_wiring` — low-voltage wiring configuration
- `cost_breakdown` — per-tracker cost data

### Fixed Tilt Tracker

**File**: `bim-app/bim-ts/src/ft/FT.ts`
**Type**: `FtProps`

Fixed-tilt variant with array config, tilt angle, racking configuration.

### Road

**File**: `bim-app/bim-ts/src/archetypes/Road.ts`
**Type**: `RoadProps`

Key properties:
- `constraints` — enum: support or equipment road
- Geometry: `GraphGeometry` polyline (points + edges)
- `width` — road width
- Computed: `length`, `area`

### Boundary

**File**: `bim-app/bim-ts/src/archetypes/Boundary.ts`

Key properties:
- `boundary_type` — enum: include or exclude (`BoundaryType`)
- `source_type` — enum: origin or equipment
- Geometry: `ExtrudedPolygonGeometry`
- `Boundary2DDescription` with `pointsWorldSpace: Vector2[]`

### Equipment

**Inverter**: `bim-app/bim-ts/src/archetypes/Inverter/Inverter.ts`
- `InverterProps` — dimensions (width/height/depth), max_voltage_input, max_current_input, dc_inputs_number, max_power, mppt voltage ranges

**Transformer**: `bim-app/bim-ts/src/archetypes/transformer/Transformer.ts`
- `TransformerProps` — dimensions, commercial specs, electrical specs

**Combiner Box**: `bim-app/bim-ts/src/archetypes/CombinerBox.ts`
- `CombinerBoxProps` — dimensions, input/output specs

### Block (Logical Grouping — NO Explicit Geometry)

**Config**: `FarmLayoutConfigType.ts`
- `BlockEquipment` configuration defines block parameters
- `generate_blocks` boolean toggle per site area
- `BlockNumberSolver` handles assignment of trackers to blocks
- **No explicit block mask geometry type exists in the codebase**
- Blocks are inferred groupings, not geometric objects

### Row (Inferred Grouping — NOT an Explicit Object)

**File**: `bim-app/bim-ts/src/trackers/rows/RowsCalculator.ts`

Rows are computed, not stored:
- Grouped by rotation angle
- Sorted by position
- Split by spacing threshold (distance exceeds r2r → new row)
- No row-level selection API

### Offsets (Hierarchical)

**Per-tracker**: Frame props (within tracker)

**Per-layout global** (`FarmLayoutConfigType.ts`):
- `block_offset` — block boundary distance
- `transformer_offset` — transformer placement distance
- `inverter_offset` — inverter placement distance
- `combiner_box_offset` — combiner box placement distance
- `tracker_offset` — tracker-to-tracker distance
- `row_to_row_space` — r2r spacing
- `equipment_glass_to_glass` — equipment-to-glass distance
- `support_glass_to_glass` — support-road-to-glass distance

---

## Existing Tools & Operations

### Layout Generation

**File**: `bim-app/layout-service/src/farm-layout/LayoutAlgorithms.ts`
**Entry point**: `generateFarmLayout()`

**`LayoutGenerationTarget` enum**:
| Value | Name | Description |
|-------|------|-------------|
| 0 | NoBlockingMaxDc | Max DC without blocking |
| 1 | NoBlockingTargetDc | Target DC without blocking |
| 2 | NoBlockingTargetDcAndMaxR2R | Target DC + max r2r without blocking |
| 3 | BlockingMaxDc | Max DC with blocking |
| 4 | BlockingTargetDc | Target DC with blocking |

**Multiple solver backends** (see Algorithms section below). All perform full global regeneration.

### Selection

**File**: `bim-app/kreo-engine/engine-ts/src/controls/InteractiveEntitiesClickSelector.ts`
**Lasso**: `bim-app/kreo-engine/engine-ts/src/gizmos/RectSelectorGizmo.ts`

Current capabilities:
- Click — select single object
- Ctrl+Click — add/toggle selection
- Shift+Click — remove from selection
- Alt+Click — hierarchy selection (parent/child)
- Lasso L-to-R — inclusive (everything touched)
- Lasso R-to-L — precise (only fully enclosed)
- `RectSelectionMode` enum

**Missing**:
- No contiguous field selection
- No tab-cycling (individual → row → contiguous field → all)
- No row-level selection
- No pre-highlight on hover

### Move/Copy

**File**: `bim-app/kreo-engine/engine-ts/src/controls/EditControlsMouseDragConsumer.ts`

Current capabilities:
- Drag to move on plane
- Basic snap: `snapToObjects` (boolean), `snapToGridStep` (number, 0–100m)

**Missing**:
- No copy implementation found
- No array copy
- No integration with offset-based snap system

### Road Editing

**Files**:
- `bim-app/kreo-engine/engine-ts/src/controls/InteractiveRoadAdder.ts` — polyline road drawing
- `bim-app/kreo-engine/engine-ts/src/controls/InteractiveRoadAround.ts` — parallel offset road creation
- `bim-app/kreo-engine/engine-ts/src/controls/InteractiveRoadsBoundariesTrim.ts` — trim roads by boundaries
- `bim-app/bim-ts/src/roads/RoadsTrim.ts` — `trimRoadByBoundary()` function

**Critical**: Moving a road triggers **full deletion of ALL trackers** + complete re-layout. No adaptive/local update.

### Block/Mask Editing

**File**: `autoblocking/src/solver.py`

Current capabilities:
- OR-Tools constraint programming via `cut_tree()`
- ILR domain intervals
- Automatic block assignment

**Missing**:
- No explicit mask geometry editing UI
- No split/join operations
- No mask-first or skid-first workflows
- No extract-from-generate workflow

### Snap System

**File**: `bim-app/kreo-engine/engine-ts/src/SnappingSettings.ts`
**Gizmo**: `SnappingPointGizmo` (9 point type categories × 3 visual states)

Current capabilities:
- `snapToObjects: boolean` — global on/off
- `snapToGridStep: number` — 0 to 100 meters
- 9 snap point type categories (enum `SnappingPointType`)

**Missing**:
- No configurable category enable/disable
- No priority system
- No running vs override distinction
- No offset-based snapping (r2r, clear distance, etc.)
- No color-coded visual feedback

### Alignment

**File**: `bim-app/bim-ts/src/catalog/AlignSolarArrays.ts`
**Function**: `alignSolarArraysRelativeRow()`

Current capabilities:
- `AlignArrayMode`: Center, Top, Bottom
- `EdgeAnchor`: toMax, toMin
- Groups trackers by row, aligns perpendicular

**Missing**:
- Not a 2-pick flow (reference → targets)
- No lock-after-align
- No noodle-align
- No per-object-type behaviors (road, equipment, block)

### Trim/Extend

**Road trim**: `bim-app/bim-ts/src/roads/RoadsTrim.ts` — `trimRoadByBoundary()`
**Interactive road trim**: `InteractiveRoadsBoundariesTrim.ts`
**Tracker pruner**: `tracker-pruner/src/solver.ts`
- `adjust_v1` — string size downgrade (replace with smaller fitting string)
- `adjust_v2` — vertical shift (move tracker to fit)

---

## UI & Rendering

### Preview/Ghost Rendering

**Current state**: **Minimal.** Equipment text preview only.
- No visual preview layer for placement operations
- No hover-to-preview capability
- No ghost rendering (dimmed inactive objects)
- System generates and commits immediately — no "preview before commit" pattern
- This is the single largest gap vs the framework's requirements

### Toolbar/Tool System

**Framework**: Svelte 5.31.0

**Navbar**: `NavbarContext`, `NavbarItem`, `NavbarItemGroup` — panel-based navigation, not traditional toolbar.

**Property UI**: `PUI_Builder` — declarative property panel construction. `UiBindings` for panel registration.

**Pattern**: Panels bound to selected object properties. Not tool-state-driven.

### Mode System

**Current state**: **No Tracker Mode / Block Mode concept.**

Instead: capability flags per site area:
- `generate_arrays: boolean`
- `generate_blocks: boolean`
- `FarmLayoutContext.isAugmentMode()` — generate vs augment distinction

The framework's 3-mode system (Tracker/Block/Normal) with ghost rendering is entirely new infrastructure.

### Sub Areas

**Types** (3):
- `AllSiteArea` — entire site
- `UnallocatedSubarea` — unassigned area
- `SiteSubarea` — user-defined area with priority, zones, `equipmentBoundaries`

**Constraints**:
- Hard-boundary only (geometric polygons)
- Objects cannot belong to multiple sub-areas
- No calculated/on-the-fly type
- No contiguous area detection

### Layout Panel

**File**: `bim-app/engine-ui/src/layout-panel-new/LayoutRootPanel.ts`

**5 groups**:

1. **buildableArea** — site boundaries, zones
2. **roads** — equipment/support road options, widths, orientations, angles
3. **solarArrays** — PV module selection, generate toggle, DC power, ILR range, r2r spacing, alignment options
4. **blocking** — block equipment, NEC multiplier, pixeling placement, offsets (block, transformer, inverter, combiner box, tracker)
5. **aiAssistantConfig** — AI assistant settings

**Persistence**: localStorage
**UI**: Svelte 5.31 with `PUI_Builder` for declarative property panels

---

## Algorithms & Solvers

### Solver Backends

| Solver | Language | Description |
|--------|----------|-------------|
| **polygon-filler** | TypeScript | Scanline-based polygon filling |
| **nonblocking-filler** | Python | Grid-based with 64 trial offsets for optimal placement |
| **site-filler** | Python + C++ | Box placement algorithm |
| **regular-filler** | TypeScript | Simplified fill variant |
| **mccarthy_solver** | Python | Wrapper around polygon_filler_with_blocks |
| **autoblocking** | Python + OR-Tools | Constraint programming for block optimization |
| **pixeling_solver** | Python + shapely | Combiner/inverter placement |

**🔴 Critical**: ALL solvers perform **full global regeneration**. No incremental or local fill capability exists today.

**However**: Sub-area generation already works — solvers can be scoped to a site sub-area. This means scoping to a contiguous area is architecturally feasible, but needs implementation.

**API**: Solvers accessed via REST API (`solvers-api` FastAPI service).

### Adaptive Road Editing

**Current behavior**: Moving a road triggers **full deletion of ALL trackers** across the entire site + complete re-layout via the solver. No local/adaptive update.

### ILR Calculation

**Computation**: Real-time per-block via `LazyDerivedAsync`
**Formula**: `dcPowerKw / maxDcPowerKw` (DC power ÷ inverter max power)
**Display**: Project metrics, blocking settings panel, property panel

### Block Height (formerly "Height Preference")

**Does not exist in the codebase.** Road placement is currently driven by:
- ILR ranges
- Equipment access requirements
- Blocking strategies
- Height is only controlled through r2r spacing, ground elevation, and tracker dimensions

The framework's "block height" concept (driving auto road placement in Max DC and Aligned fill modes) is a new concept that needs definition and implementation.

---

## Key Architectural Findings

1. **All solvers do global regeneration** — but sub-area generation exists, so incremental scoping to contiguous areas is feasible. Not a fundamental blocker, but requires solver team work.

2. **No block mask geometry type** — blocks are purely logical groupings via `BlockEquipment` config. The mask-first, skid-first, and extract-from-generate workflows all need an explicit geometric abstraction that doesn't exist today.

3. **No mode system** — the framework's Tracker Mode / Block Mode / Normal Mode with ghost rendering is entirely new. Current system uses capability flags, not modes.

4. **No preview/ghost rendering layer** — system generates and commits immediately. The "preview before commit" principle requires a complete new rendering layer. This is the largest new capability needed.

5. **Basic snap system** — current snap is a global on/off toggle with a grid step. The framework's offset-based, category-configurable, priority-driven snap system is a major expansion.

6. **Row is inferred, not explicit** — `RowsCalculator.ts` computes rows on-the-fly from rotation and spacing. This is fine for Tab-cycling (can compute row membership at selection time) but means there's no persistent row object to reference.

7. **Block height doesn't exist** — the concept needs definition before it can be implemented.

8. **Interactive gap** — current architecture is batch-dispatch to solvers via REST API. The framework requires real-time interactive preview. Bridging this gap (streaming, local compute, or preview limiting) is the most critical architectural challenge.

---

## File Paths Quick Reference

| Capability | Key Files |
|-----------|-----------|
| Tracker model | `bim-app/bim-ts/src/sat/Sat.ts` |
| Fixed tilt model | `bim-app/bim-ts/src/ft/FT.ts` |
| Road model | `bim-app/bim-ts/src/archetypes/Road.ts` |
| Boundary model | `bim-app/bim-ts/src/archetypes/Boundary.ts` |
| Inverter model | `bim-app/bim-ts/src/archetypes/Inverter/Inverter.ts` |
| Transformer model | `bim-app/bim-ts/src/archetypes/transformer/Transformer.ts` |
| Combiner box model | `bim-app/bim-ts/src/archetypes/CombinerBox.ts` |
| Block config | `FarmLayoutConfigType.ts` |
| Row calculator | `bim-app/bim-ts/src/trackers/rows/RowsCalculator.ts` |
| Layout generation | `bim-app/layout-service/src/farm-layout/LayoutAlgorithms.ts` |
| Selection | `bim-app/kreo-engine/engine-ts/src/controls/InteractiveEntitiesClickSelector.ts` |
| Lasso | `bim-app/kreo-engine/engine-ts/src/gizmos/RectSelectorGizmo.ts` |
| Move/drag | `bim-app/kreo-engine/engine-ts/src/controls/EditControlsMouseDragConsumer.ts` |
| Snap settings | `bim-app/kreo-engine/engine-ts/src/SnappingSettings.ts` |
| Alignment | `bim-app/bim-ts/src/catalog/AlignSolarArrays.ts` |
| Road editing | `bim-app/kreo-engine/engine-ts/src/controls/InteractiveRoadAdder.ts` |
| Road trim | `bim-app/bim-ts/src/roads/RoadsTrim.ts` |
| Tracker pruner | `tracker-pruner/src/solver.ts` |
| Autoblocking | `autoblocking/src/solver.py` |
| Layout panel | `bim-app/engine-ui/src/layout-panel-new/LayoutRootPanel.ts` |
| Navbar | `NavbarContext`, `NavbarItem`, `NavbarItemGroup` |
| Property UI | `PUI_Builder`, `UiBindings` |
