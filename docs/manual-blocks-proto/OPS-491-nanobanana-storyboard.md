# OPS-491: Layout Tools — Nano Banana Storyboard

**Date**: 2026-02-06
**Companion to**: [OPS-467 Layout Tools MVP Framework](./OPS-467-layout-tools-mvp-framework.md)
**Purpose**: Image generation prompts for each frame of a layout tools storyboard.
**Image generator**: Nano Banana (already has site/boundary context loaded — parcels, terrain, coordinate system are pre-established)

---

## Shared Context (include at the top of every prompt)

> **Application context**: This is a utility-scale solar photovoltaic (PV) plant design application called PVFARM. The user views the site from directly above — a top-down orthographic 2D plan view, like a satellite map or architectural floor plan. The interface looks like a modern design tool (think Figma or Illustrator) with a dark toolbar on the left, a properties panel on the right, and a large canvas in the center showing the site map.
>
> **What the site looks like**: The site has exactly **two land parcels** — irregular polygons outlined in thin white or light-gray lines, like a property boundary survey. Both parcels are oddly shaped but composed entirely of straight-line segments (no curves — think property boundaries drawn with a ruler at various angles). The left parcel is larger (the working parcel). The right parcel is smaller and sits slightly northeast. Between and around the parcels is natural terrain (muted greens and browns). The parcels are the buildable areas where solar equipment can be placed.
>
> **Parcel shapes**: The left (working) parcel is roughly pentagonal — imagine a rectangle with the top-right corner pushed inward and the top-left corner extended upward, so the northern boundary is an irregular zigzag of 3–4 straight segments at different angles. The southern boundary is more regular (nearly horizontal). The right parcel is roughly quadrilateral, a skewed trapezoid. Both have only straight edges, never curved.
>
> **What a tracker looks like from above**: A single-axis solar tracker appears as a narrow dark-blue rectangle, roughly 5× longer than it is wide, always oriented **north-south** (long axis running vertically on screen). Trackers never rotate — they are always vertical. They are arranged in horizontal rows running east-west across a parcel, with uniform row-to-row (r2r) spacing between them. From above at site scale, a filled parcel looks like a field of thin vertical blue dashes arranged in evenly-spaced horizontal stripes — like a comb pattern or barcode rotated 90°.
>
> **What a road looks like from above**: Roads are pale gray or off-white strips, slightly wider than a tracker is long. In this storyboard, the Aligned fill mode auto-places a single east-west road (horizontal line) that bisects the working parcel, dividing it into a northern half and a southern half.
>
> **What a block looks like from above**: A block is a translucent colored rectangle overlaid on top of a group of trackers. Each block has a distinct color — adjacent blocks use contrasting colors like a political map (four-color-theorem style: blues, greens, oranges, purples). The block rectangles tile the entire buildable area with no gaps or overlaps. Each block has a small label showing its ILR value (e.g., "1.32 ILR"). This site is small enough to have about **5 blocks** total.
>
> **Consistent details across all frames**:
> - The site always shows both parcels, but we are only working on the **left (larger) parcel**. The right parcel remains empty and untouched throughout.
> - The working parcel contains approximately 120 north-south trackers. This count stays the same across all frames — the trackers shift position but never change in number.
> - Trackers are ALWAYS oriented north-south (vertical on screen). They never rotate, bend, or tilt.
> - The active tool is indicated by a highlighted icon in the left toolbar.
> - The mouse cursor is visible in every frame, positioned where the current operation is happening.

---

## Frame 1 — Empty Site

**Prompt**: Show the PVFARM application with the site viewed from directly above. The canvas shows two irregularly-shaped land parcels outlined in thin white boundary lines against natural terrain (muted greens and browns). Both parcels have only straight-line edges — no curves. The left parcel is larger with an irregular northern boundary (several angled straight segments creating a zigzag top edge). The right parcel is smaller, a skewed trapezoid shape, sitting slightly northeast. Both parcels are completely empty — no trackers, no roads, no equipment, no blocks. The left toolbar shows a column of small tool icons (all dimmed/inactive). The right panel is collapsed or shows general site properties. The mouse cursor rests near the center of the left parcel. This is the blank canvas before any design work begins.

---

## Frame 2 — Fill Tool, Aligned Mode, Hovering (Preview)

**Prompt**: Same PVFARM top-down view of the two-parcel site. The **Fill tool** is now active — this works like the paint-bucket fill in Photoshop or Illustrator, but instead of flooding an area with color, it floods a bounded area with solar trackers. Its icon in the left toolbar is highlighted (the icon looks like a paint bucket with a small lightning bolt, representing solar energy).

The mouse cursor (now showing a small paint-bucket icon) hovers inside the left parcel. Because the cursor is inside a bounded area, the tool shows a **live preview** of what will happen if the user clicks.

The fill mode is **Aligned** — the most structured of the three modes. Aligned mode does three things simultaneously: (1) places trackers in a grid-aligned pattern, (2) automatically inserts an east-west road to bisect the parcel based on the configured block height, and (3) aligns tracker rows to a clean grid. The result is orderly and structured, sacrificing some density for geometric consistency.

The preview shows:
- Approximately 120 north-south trackers (dark blue vertical rectangles) arranged in neat, evenly-spaced horizontal rows across the left parcel. The rows are visually uniform — every tracker in a row sits at the same north-south position, and the east-west spacing between trackers within a row is consistent.
- A single east-west road (pale gray horizontal strip) auto-placed near the vertical center of the parcel, bisecting it into a north half and south half. The road was placed by the Aligned fill algorithm based on block-height settings — the user didn't draw it manually.
- Trackers respect the road's clear-distance setback — there is a gap between the road edges and the nearest tracker rows.
- All preview objects are rendered slightly transparent or with a blue glow to indicate this is a preview, not yet committed.
- Where the parcel boundary angles inward (especially the irregular northern edge), trackers are absent — the grid-aligned pattern is clipped by the boundary, leaving empty slivers at non-orthogonal edges.

A small floating tooltip near the cursor reads: **"Aligned · +1.1 MW · 120 trackers"**

A mode indicator shows **"Fill: Aligned"** — the user can press Spacebar to cycle to Mega DC or Max DC, but we stay on Aligned.

The right parcel remains completely empty.

---

## Frame 3 — Aligned Fill Committed

**Prompt**: Same view. The user has clicked to commit the Aligned fill. All preview objects are now solid at full opacity — they are permanent placed objects:

- 120 north-south trackers (dark blue vertical rectangles) in neat horizontal rows across the left parcel. The rows are grid-aligned — clean, orderly, uniform spacing. Every tracker is vertical (north-south).
- One east-west road (pale gray horizontal strip) bisecting the parcel. The road was auto-placed by the Aligned fill algorithm.
- Trackers fill both the north half (above road) and south half (below road) of the parcel, respecting the road setback and boundary edges.

The key visual feature: the northern edge of the tracker field is a **straight horizontal line** — because Aligned mode places trackers on a rigid grid, the northernmost row of trackers sits at a uniform distance from the road, regardless of how the boundary zigzags above it. This means there is wasted empty space between the straight top edge of the tracker field and the irregular northern boundary. In some places the boundary is close to the trackers; in other places there is a large empty gap. This wasted space is the problem that the Align tool will solve in subsequent frames.

The Fill tool is still active in the toolbar. The right parcel remains empty.

---

## Frame 4 — Align Tool Selected, Picking Northern Boundary (Pick 1)

**Prompt**: Same view with the committed Aligned fill — 120 trackers in neat rows, east-west road bisecting the left parcel. The **Align tool** is now active in the toolbar (highlighted icon — looks like horizontal lines with an alignment arrow). The Align tool works like alignment tools in Illustrator or Figma, but specialized for solar layout: the user picks a reference object first (Pick 1), then picks the objects to align to it (Pick 2).

This is **Pick 1** — selecting the alignment reference. The mouse cursor hovers over the **northern boundary edge** of the left parcel. The irregular northern boundary (the zigzag of 3–4 angled straight segments) is highlighted with a colored glow — bright cyan — to show it is being targeted as the alignment reference. A small tooltip near the cursor reads: **"Reference: North boundary"**

The trackers and road remain exactly as in the previous frame. The empty space between the straight tracker field edge and the irregular north boundary is clearly visible — this gap is what we're about to close. The right parcel remains empty.

---

## Frame 5 — Picking North Field (Pick 2), Rigid Align Preview

**Prompt**: Same view. The northern boundary is confirmed as the reference (stays highlighted in cyan). Now the user is on **Pick 2** — selecting the objects to align.

The user has selected all trackers in the **northern half** of the left parcel (above the east-west road). The selected trackers are highlighted with a bright outline or subtle glow. The southern trackers (below the road) are NOT selected — they remain at normal opacity, unaffected.

The tool shows a **Rigid align preview**: the entire selected field (all north-half trackers) shifts northward as a single rigid unit — every tracker moves the same distance north. Semi-transparent "ghost" copies of the selected trackers appear at their new positions, pressed closer to the northern boundary. The original positions are shown dimmed.

But because the field moves as a **rigid block** and the northern boundary is irregular, the result is imperfect: the field shifts until the closest point reaches the boundary setback, but the rest of the field still has varying amounts of empty space above it. The rigid shift closed the gap at one point but not everywhere.

A tooltip near the cursor reads: **"Align: Rigid · ↑ 8.2m"**
Mode indicator: **"Align: Rigid"** — Spacebar toggles to Noodle.

The southern field and the right parcel are unchanged.

---

## Frame 6 — Spacebar Toggled to Noodle Align Preview

**Prompt**: Same view, same selection (north-half trackers selected, northern boundary as reference). The user has pressed Spacebar to toggle from Rigid to **Noodle** alignment. The mode indicator now reads **"Align: Noodle"**.

The preview changes dramatically. Instead of shifting the entire field north as one rigid block, **noodle-align independently slides each row of trackers north or south so that every row maintains a consistent setback distance from the boundary at its position**.

**How to visualize noodle-align**: Imagine a **pin-art toy** (the desk toy with hundreds of metal pins that you push your hand into to create an imprint). Each horizontal row of trackers is one pin. The northern boundary is the hand pressing down from above. Each pin (row) independently slides north until it is exactly the setback distance from the boundary at that east-west position. Where a segment of the northern boundary juts south (closer to the road), the rows at that position don't slide as far north. Where the boundary extends north (away from the road), the rows at that position slide further north.

The result in the preview:
- Every tracker is still a north-south (vertical) rectangle — trackers do NOT rotate, bend, or tilt. They are always vertical.
- But the north-south position of each row varies independently. Some rows sit further north, some further south, depending on where the boundary is above them.
- The **top edge of the tracker field is now a staircase/stepped line** that follows the contour of the irregular northern boundary — each step is one row, and each step sits at a consistent setback from the boundary segment above it.
- Row-to-row spacing (the east-west distance between adjacent trackers in the same row) is unchanged. What changes is each row's north-south position.
- The overall effect: the field "conforms" to the boundary shape without any individual tracker rotating. The conformity happens through collective row shifting — like pins, like teeth of a comb pressed against an irregular surface.

The preview shows these adjusted positions as semi-transparent tracker outlines. The original (grid-aligned) positions are dimmed behind them. The gap between field edge and boundary is now uniformly small everywhere — the wasted space from Frame 3 is gone.

Tooltip: **"Align: Noodle · follows boundary contour"**

The southern field (below road) is completely unaffected — it stays in its original grid-aligned positions. The road stays in place. The right parcel stays empty. Still ~120 trackers total.

---

## Frame 7 — Noodle Align Committed

**Prompt**: Same view. The user has clicked to commit the noodle alignment. The north-half trackers are now at full opacity in their noodled positions.

The visual contrast between north and south is the key feature of this frame:

- **North half** (above road): The tracker field has a **stepped/staircase northern edge** that follows the contour of the irregular boundary. Each row sits at a different north-south position, maintaining a consistent setback from whichever boundary segment is above it. Where the boundary angles inward, rows are further south. Where the boundary extends outward, rows are further north. The empty space between field and boundary is uniformly narrow — no wasted gaps. The trackers are still perfectly vertical (north-south) — only their row positions shifted.

- **South half** (below road): The tracker field retains its original grid-aligned appearance from the Aligned fill — rows are at uniform north-south positions, the southern edge is a straight horizontal line. There is still some wasted space between the tracker field edge and the irregular southern boundary.

This contrast clearly demonstrates what noodle-align does: it takes a rigid grid and makes each row independently press toward the reference boundary, like pins in a pin-art toy, closing the gaps without rotating any individual tracker.

Still ~120 trackers total. The right parcel remains empty.

---

## Frame 8 — Switch to Block Mode, Block Fill Preview

**Prompt**: Same view. The user has pressed **B** to switch from Tracker Mode to **Block Mode**. The mode indicator reads **"Block Mode"**. The visual change is immediate:

- All 120 trackers and the east-west road are now **ghosted** — rendered at approximately 30% opacity in dimmed gray. They are visible for spatial context but are not interactive or selectable. This is the ghost rendering system: in Block Mode, tracker-layer objects fade to background.
- The **Block Fill tool** is active in the toolbar (highlighted icon — looks like a grid of colored rectangles).

The mouse cursor (now showing a grid icon) hovers inside the left parcel. The tool shows a **live preview** of block assignment: the parcel is tiled with **5 translucent colored rectangles**. Each rectangle is a **block mask** — a boundary defining which trackers belong to that block.

The 5 blocks tile the entire working parcel with no gaps or overlaps, like a political map:
- **3 blocks in the north half** (above the road): one soft blue, one warm orange, one muted green. Because the north half is wider at one end than the other (irregular boundary), the blocks are slightly different sizes — the algorithm adapts the grid to fill the space.
- **2 blocks in the south half** (below the road): one light purple, one golden yellow. The road acts as a natural dividing line — no block crosses the road.
- Adjacent blocks always use contrasting colors so every block is visually distinct from its neighbors.

Each block has a small ILR label: **"1.31"**, **"1.34"**, **"1.29"**, **"1.33"**, **"1.30"**. The blocks are translucent enough that the ghosted trackers are visible underneath, showing which trackers fall within which block.

Tooltip: **"Block Fill · 5 blocks · ILR range 1.29–1.34"**

The right parcel remains empty — no ghosts, no blocks. All work has happened on the left parcel only.

---

## Frame 9 — Block Fill Committed, Final State

**Prompt**: Same view. The user has clicked to commit the block fill. The 5 blocks are now at full opacity (though still translucent enough to see the ghosted trackers underneath).

Final state of the left parcel:
- **3 blocks in the north half**: soft blue, warm orange, muted green. Their northern edges follow the stepped/staircase contour from the noodle alignment — the block boundaries conform to the tracker positions, not the original grid.
- **2 blocks in the south half**: light purple, golden yellow. Their southern edges are more regular (grid-aligned fill, no noodle applied to this side).
- The east-west road is visible as a ghosted gray horizontal line separating north and south block groups.
- Each block displays its ILR value label.
- Through the translucent block colors, the ghosted trackers (dimmed blue vertical dashes at ~30% opacity) are visible, showing the layout within each block. In the north half, you can see the pin-shifted rows; in the south half, the regular grid rows.

The right parcel remains completely empty and untouched — this entire storyboard has operated on a single parcel while the second parcel waits for its turn.

This is the final state: **Aligned fill → noodle alignment to northern boundary → block assignment**, all on one parcel of a two-parcel site.

---

## Frame Summary

| Frame | Tool | Mode | What Happens |
|-------|------|------|-------------|
| 1 | — | — | Empty site, 2 irregularly-shaped parcels, no objects |
| 2 | Fill (Aligned) | Tracker | Preview: ~120 trackers grid-fill the left parcel + auto east-west road |
| 3 | Fill (Aligned) | Tracker | Committed: trackers + road placed, straight field edges, visible gap at irregular north boundary |
| 4 | Align | Tracker | Pick 1: irregular northern boundary selected as reference (cyan highlight) |
| 5 | Align (Rigid) | Tracker | Pick 2: north-half trackers selected, rigid shift preview — gap partially closed |
| 6 | Align (Noodle) | Tracker | Spacebar toggle: noodle preview — rows independently slide like pins, staircase edge follows boundary |
| 7 | Align (Noodle) | Tracker | Committed: north field conforms to boundary, south field unchanged — contrast visible |
| 8 | Fill (Block) | Block | Preview: 5 colored block masks tile the parcel (3 north, 2 south), trackers ghosted |
| 9 | Fill (Block) | Block | Committed: final state — blocks + ghosted trackers + ILR labels, right parcel still empty |
