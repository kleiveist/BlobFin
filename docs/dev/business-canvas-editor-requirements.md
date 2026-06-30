<!-- AUTO-GENERATED:backlink START -->
[<- Back](dev.md)
<!-- AUTO-GENERATED:backlink END -->
# Business Canvas Editor - Developer Requirements

## 1. Scope

This document describes the standalone requirements for rebuilding the existing Business Canvas Editor as a generic visual canvas editor on another platform.

The requirements are derived from the current editor implementation in:

- `frontend/src/features/self-employment/business-canvas/`
- `frontend/src/domain/businessIdeaCanvas.ts`
- `frontend/src/types.ts`
- `frontend/src/tests/businessIdeaCanvas.test.ts`
- `frontend/src/tests/businessCanvasController.test.ts`
- `frontend/src/tests/followUpUi.test.ts`

The target implementation must reproduce the generic editor behavior: canvas surface, nodes, groups, connections, arrows, selection, editing, colors, shapes, drag-and-drop, resizing, copy/paste, grouping, alignment, navigation, and robust persistence/import behavior.

This document is not an implementation plan and does not define a JSON schema. It describes behavior and acceptance requirements.

## 2. Non-Goals

The standalone editor must not depend on source-app-specific business workflows.

Do not document or rebuild:

- The source app's staged workflow system.
- The source app's card taxonomy or category labels.
- The source app's Gantt/analysis panel.
- Any app-specific completion, project planning, or business-validation logic.
- A detailed JSON field schema.

The current code includes some app-specific metadata dropdowns and a side analysis panel. For a generic standalone editor, those controls are out of scope unless they are replaced by generic metadata extension points.

## 3. Editor Surface

The editor consists of a root editor, a top toolbar, a workbench, a viewport, a transformed canvas-content layer, overlay toolbars, context menus, and popovers.

Required structure:

- Root editor container: `.business-canvas-editor`.
- Workbench container: `.business-canvas-workbench`.
- Viewport: `.business-canvas-viewport`, with clipped visible area, grid background, pointer handling, and pan/zoom interaction.
- Canvas content layer: `.business-canvas-content`, with fixed internal size and CSS transform.
- Toolbar overlay layer: `.business-canvas-toolbar-layer`, positioned over the workbench and outside the transformed content coordinate system.
- SVG edge layer: `.business-canvas-edges`, rendered inside the transformed content layer.
- Floating context menus and palette popovers, positioned in viewport/screen coordinates.

The current internal canvas size is `2600 x 1900`. Logical node coordinates are offset by an internal origin of `1200`, so a node with logical `x=0, y=0` is rendered at `left=1200px, top=1200px` inside the content layer.

The default viewport is:

- translate x: `-900`
- translate y: `-1020`
- zoom: `1`

The visible viewport is smaller than the internal canvas. The current desktop viewport height is clamped between roughly `460px` and `760px` depending on available browser height. The viewport clips overflow and uses a grid background.

The content layer must use a transform equivalent to:

```css
transform: translate(viewportX, viewportY) scale(zoom);
transform-origin: 0 0;
```

Desktop behavior is the primary target. Responsive behavior exists below `980px`, but the same canvas model and pointer interactions remain in effect.

## 4. Canvas Rendering

Rendering order must preserve the current visual model:

1. Group nodes render first.
2. SVG edges render above groups.
3. Card nodes render above edges.
4. Selection rectangles render above the base canvas content.
5. Floating toolbars render in a separate overlay layer above the canvas.
6. Context menus and palette popovers render as fixed overlays.

Required layers and relative stacking:

- Group nodes: background containers.
- Edge SVG: connection paths and hit targets.
- Normal card nodes: foreground cards.
- Selected card nodes: above normal cards.
- Dragging nodes: above selected nodes.
- Toolbar layer: above all transformed content.
- Dropdown menus: above toolbar controls.

The implementation should not rely only on DOM order for the major layer categories. Groups, edges, nodes, selections, and toolbars need explicit layer semantics.

Current z-index expectations:

- Group node: low background layer.
- Edge SVG: above groups.
- Normal node: above edges.
- Selection rectangle: above edges and below selected cards.
- Selected node: above normal nodes.
- Dragging node: top canvas item layer.
- Toolbar layer: above transformed content.
- Dropdown menus: above toolbar layer.

## 5. Node Model

The editor must support normal cards and group cards as first-class canvas nodes.

Generic card requirements:

- Every node has a stable ID.
- Every node has a type/kind. The generic editor must at least support normal text cards and group nodes.
- Each node has logical position `x/y`.
- Each node has rendered position `left/top`, derived from `x/y` plus the internal origin.
- Each node has `width/height`.
- Each node has a color token or custom color.
- Each normal card has editable text content.
- Each node is focusable using `tabindex="0"` or equivalent keyboard focus support.
- Selected nodes must expose a visible selected state.
- Editing nodes must expose a visible editing state.
- Dragging nodes must expose a visible dragging state.

Normal text cards:

- Default new card text: "Neue Karte" in the current UI. A standalone editor may localize this, but it must create a visible editable text card.
- Default new card size: `240 x 110`.
- Text is vertically centered in the card.
- Text wraps across multiple lines and preserves line breaks.
- Text may be empty; empty text must not break selection, editing, or persistence.
- Current text editing is inline via `contenteditable`.
- Markdown rendering inside cards is not implemented in the current editor. Status: zu verifizieren.

Additional imported node kinds:

- The domain parser recognizes file and link node kinds and renders their file path or URL as node text.
- The current UI does not expose creation controls for file or link cards. Status: zu verifizieren.

Group nodes:

- Group nodes are a separate node type.
- Group nodes render as visible rectangular containers with a dashed border.
- Group nodes have a title/name.
- Group nodes do not render connection anchors in the current UI.
- Group nodes use a background/container visual style and sit behind normal cards.

Node shape requirements:

- `rounded-rectangle`
- `rectangle`
- `ellipse`
- `diamond`

The shape control is available for normal cards. Group nodes currently render as rectangular containers.

Node size requirements:

- Minimum size is `100 x 60`.
- Resize uses the bottom-right resize handle.
- Resize snaps to grid when snap is enabled.
- Resize updates connected edges live while dragging.
- Resize of group nodes is allowed when a group is selected.
- Resizing a group does not currently resize contained cards. Status: zu verifizieren for standalone behavior.

Node overlap:

- Free overlap is allowed.
- No collision avoidance is enforced during drag.
- Selected and dragging nodes are raised visually.
- Normal stacking among same-layer cards should be deterministic. Current DOM order is based on node array order, while selected/dragging state changes visual priority.

## 6. Group Model

Groups are own nodes, not just metadata.

Group creation requirements:

- A new empty group can be created from the canvas context menu at a specific canvas point.
- Default empty group size is `320 x 220`.
- Default empty group color uses the fourth standard palette color in the current implementation.
- A group can be created from a multi-selection of at least two normal cards.
- Group-from-selection creates a group bounding box around the selected cards with padding.
- Current group-from-selection padding is `32`.
- Group-from-selection stores membership metadata for selected card IDs.

Group containment requirements:

- A card is considered geometrically inside a group when its full rectangle lies inside the group rectangle.
- Selection rectangle logic selects only normal cards, not group nodes.
- Current group drag behavior uses geometric containment, not only saved membership metadata.
- Saved group membership metadata must be kept stable for persistence and external editing, but the UI must not depend only on metadata when deciding which visible cards move with a group.

Group selection:

- Clicking a group selects the group.
- A selected group displays the selected node state and a resize handle.
- A selected group shows a compact toolbar with color and delete actions.
- The group toolbar is positioned near the group's right side and translated left so it remains inside/near the group area.

Group moving:

- Dragging a group by itself moves the group and any fully contained normal cards.
- If a normal card is already part of the current selection, dragging the group must not implicitly add all contained cards.
- Multi-selecting a group with external cards moves the explicit selection together.
- Group drag previews must update the visible positions of all affected nodes and live edges.

Group resizing:

- Group resizing is done by the same bottom-right resize handle as normal nodes.
- The group's minimum size is the same node minimum size.
- Contained cards are not scaled by group resize in the current implementation. Status: zu verifizieren.

Group editing:

- Group names are edited through an inline text input.
- Group name editing can be opened from the node context menu.
- Enter commits the name.
- Escape leaves edit mode.
- Blur commits the current value.
- The group name must be stored both as visible node title and in group metadata where the platform supports side metadata.

Grouping and ungrouping:

- Grouping selected cards is implemented.
- Empty group creation is implemented.
- Explicit ungrouping is not visible in the current code. Status: zu verifizieren.

Drop zones:

- Dedicated drop-zone UI is not visible in the current implementation.
- Geometric containment must still be supported.
- If the standalone editor adds drop zones, they must not conflict with free positioning. Status: zu verifizieren.

Group connections:

- The current UI blocks creating new connections to group nodes.
- Imported/rendered edges that reference a group may render because edge rendering works on node geometry generally. Status: zu verifizieren.
- A standalone editor must define whether group-to-card and group-to-group connections are supported. If unsupported, import must report or safely ignore those edges.

## 7. Edge / Arrow Model

Edges connect two nodes with a directed or undirected visual line.

Required edge concepts:

- Stable edge ID.
- Source node.
- Target node.
- Source side: `top`, `right`, `bottom`, `left`.
- Target side: `top`, `right`, `bottom`, `left`.
- Source marker: `none` or `arrow`.
- Target marker: `none` or `arrow`.
- Optional edge label text.

Direction presets:

- `none`: no arrow markers; rendered as dashed in the current UI.
- `forward`: arrow at target end.
- `backward`: arrow at start end.
- `both`: arrows at both ends.

Rendering:

- Edges are rendered in SVG.
- Each edge group contains a wide transparent hit path and a visible line path.
- The visible edge is a cubic Bezier curve.
- Control points project outward from the selected sides.
- Control distance is clamped between `80` and `220`, based on node distance.
- The edge label position is calculated around half the curve length using sampled cubic points.
- Edge hit targets must be wide enough for reliable pointer selection.

Arrow markers:

- Arrowheads must use marker geometry or equivalent platform-native arrows.
- Marker orientation must follow the curve direction.
- The same marker style must work at start and target ends.

Live updates:

- Moving or resizing connected nodes must update edge geometry during the drag preview.
- After a project update, current code normalizes saved edge sides to the shortest side pair between connected nodes.
- A standalone implementation must either reproduce dynamic shortest-side normalization or explicitly preserve manual side anchors. To match the current editor, normalize to shortest available side after node geometry changes.

Creating edges:

- Normal cards expose four anchor handles when hovered, selected, armed for connection, or highlighted as connection targets.
- Dragging from an anchor starts a connection preview.
- Hovering a valid target card highlights the target.
- Dropping on a valid target card creates a forward edge.
- Dropping on the source card is ignored.
- Dropping on a group is ignored.
- Dropping on empty canvas after moving opens a line menu to create a new connected card at that point.
- A selected normal card can be armed using the connect action; the next valid target card click creates an edge from the selected card's right side.

Line menu:

- Edge midpoint/branch controls appear on hover or selection.
- The branch handle allows starting a connection from the nearest endpoint of the existing edge.
- Clicking a branch without moving opens a small line menu.
- The line menu contains a "new card" action.
- Creating a card from a line menu adds a new card near the line point and adds a new edge from the nearest endpoint to that card.
- The existing edge is not split in the current implementation. Status: zu verifizieren for desired standalone behavior.

Edge selection and editing:

- Clicking the transparent hit path selects the edge.
- Clicking the edge label selects the edge and enters label editing.
- A selected edge shows an edge toolbar.
- The edge toolbar supports direction change, label edit, and delete.
- Edge label editing uses an input field.
- Enter commits an edge label.
- Escape cancels edge label edits.
- Blur commits the current draft label.
- Empty edge labels are stored as absent/empty and should not render permanent label chrome unless selected.

Edge deletion:

- Selected edge can be deleted from the edge toolbar.
- Delete/Backspace deletes a selected edge.
- Deleting a node deletes all edges connected to that node.

Conflict cases:

- Import must reject or repair edges referencing missing nodes.
- Current parsing rejects missing edge endpoints.
- Current rendering skips an edge if either endpoint is missing.
- Duplicate edge IDs must be detected or resolved during import.

## 8. Interaction Model

Pointer interaction requirements:

- Left click on a node selects it.
- Shift-click or Meta/Cmd-click toggles a node in the current selection.
- Left drag on selected nodes moves the selected nodes.
- Left drag on a resize handle resizes only that node.
- Left drag on empty viewport starts a selection rectangle.
- Middle mouse drag pans the viewport.
- Holding Space and left dragging pans the viewport.
- Ctrl+mouse wheel zooms the viewport at the cursor position.
- Double-clicking normal card text enters inline edit mode.
- Right-click opens a context menu.

Pan requirements:

- Panning changes viewport translation, not node coordinates.
- Live pan preview applies directly to the content transform using animation frames.
- On pointer release, the viewport translation is persisted.
- The viewport cursor changes between grab and grabbing.

Zoom requirements:

- Zoom range is `0.4` to `2.0`.
- Zoom buttons change zoom by `0.1`.
- Ctrl+wheel changes zoom by `0.06` per wheel step.
- Button zoom uses the viewport center as the zoom focal point.
- Wheel zoom uses the mouse position as the zoom focal point.
- Zoom must keep the chosen viewport point visually stable.
- Wheel zoom is previewed live and committed after a short debounce.

Grid and snapping:

- Default grid size is `20`.
- Grid snapping is enabled by default.
- Snap can be toggled from the top toolbar.
- Node creation, dragging, resizing, paste placement, and viewport-point insertion must snap when enabled.
- If snap is disabled or grid size is invalid, values are rounded to whole pixels.
- Grid size is normalized to a safe range. Current normalization clamps between `5` and `80`.

Keyboard interaction:

- Arrow keys move selected nodes by `10px`.
- Shift+Arrow moves selected nodes by `1px`.
- Arrow movement is disabled while focus is inside an input, textarea, select, or contenteditable element.
- Ctrl/Cmd+C copies the selected normal cards.
- Ctrl/Cmd+V pastes copied cards.
- Delete/Backspace deletes selected nodes or selected edge.
- Escape closes active overlays, cancels selection drag, clears armed connection, closes edit states, and clears connection preview.
- Space is tracked for viewport panning when the active focus is not editable.

## 9. Buttons, Menus and Toolbars

Top toolbar requirements:

| Control | Requirement |
| --- | --- |
| Add card | Creates a normal text card at the visible top-left canvas point. |
| Paste | Pastes copied cards; disabled when clipboard is empty. |
| Zoom out | Decreases zoom by `0.1`, clamped to the zoom range. |
| Zoom in | Increases zoom by `0.1`, clamped to the zoom range. |
| Snap toggle | Enables/disables grid snapping. |
| App-specific metadata dropdowns | Excluded from standalone generic requirements. |

Single normal-card toolbar requirements:

| Control | Requirement |
| --- | --- |
| Color | Opens the color palette for the selected card. |
| Shape | Opens shape dropdown with rounded rectangle, rectangle, ellipse, and diamond. |
| Connect | Arms the card for connection from its right side. |
| Copy | Copies selected normal cards. |
| Duplicate | Copies and immediately pastes the selected normal card(s) offset from source. |
| Delete | Deletes selected nodes and their connected edges. |

Single group toolbar requirements:

| Control | Requirement |
| --- | --- |
| Color | Opens the color palette for the selected group. |
| Delete | Deletes the selected group and removes related group metadata. |

Multi-selection toolbar requirements:

| Control | Requirement |
| --- | --- |
| Selection count | Shows number of selected nodes. |
| Copy | Copies selected normal cards only. |
| Paste | Pastes clipboard; disabled when clipboard is empty. |
| Create group | Creates a group around selected normal cards when at least two cards are selected. |
| Color | Applies a color to all selected nodes. |
| Align left | Sets all selected nodes to the minimum selected `x`. |
| Align top | Sets all selected nodes to the minimum selected `y`. |
| Delete | Deletes selected nodes and connected edges. |

Edge toolbar requirements:

| Control | Requirement |
| --- | --- |
| Direction dropdown | Sets edge direction to none, forward, backward, or both. |
| Edit label | Opens edge label input. |
| Delete | Deletes selected edge. |

Canvas context menu requirements:

| Context | Actions |
| --- | --- |
| Empty canvas | New card, new group, paste at clicked canvas point. |
| Node | Edit, copy, change color, delete. |
| Multi-selection | Copy selection, create group, change color, delete selection. |

Palette popover requirements:

- Shows the standard palette row.
- Shows a custom palette row when custom colors exist.
- Applies selected color to target node IDs.
- Provides a palette editor action.

Palette editor requirements:

- Contains a color name input.
- Contains a hex color picker/input.
- Saves only valid `#RRGGBB` values.
- Shows an inline validation error for missing name or invalid color.
- Closes without saving through close action.

Controls present in code but not visibly rendered:

- Reset view action exists in event handling and resets to default viewport. Status: zu verifizieren.
- Canvas center action is not visible as a distinct control. Status: zu verifizieren.

Controls not found in current editor:

- Explicit import/export buttons in the canvas UI. Status: zu verifizieren.
- Send forward/backward or bring-to-front/send-to-back actions. Status: zu verifizieren.
- Distribute horizontally/vertically actions. Status: zu verifizieren.
- Explicit ungroup action. Status: zu verifizieren.
- Confirmation dialogs for destructive actions. Status: zu verifizieren.
- Undo/redo controls. Status: zu verifizieren.

## 10. Colors and Shapes

Color system requirements:

- Nodes use a color token or custom hex color.
- Standard color classes follow `business-canvas-color-*`.
- Current standard tokens are numeric `1` through `6`.
- Non-standard hex colors use `business-canvas-color-custom` plus `--business-canvas-custom-color`.
- Color meaning must be generic visual categorization only.
- Color must not be tied to source-app-specific category labels.
- Default new card color comes from the active generic color/category in the current app integration. For standalone mode, define a generic default color.
- Default new group color is the fourth standard palette color in the current implementation.

Palette requirements:

- Standard palette always appears first.
- Custom colors can be added by name and hex value.
- New custom colors appear before older custom colors.
- The visible custom row currently shows up to the same count as the standard row.
- Custom colors must round-trip through persistence and Markdown import/export.

Visual contrast and readability:

- Text must remain readable on all standard and custom colors.
- Borders should mix the node color with the neutral border color.
- Background should use a low-opacity tint of the node color.
- Selected state must be visually distinguishable regardless of node color.
- Focus state must be visible for keyboard users.

Shape requirements:

- Rounded rectangle: normal default card shape.
- Rectangle: square corners.
- Ellipse: fully rounded outline, with increased internal padding.
- Diamond: clipped diamond shape, with increased internal padding.
- Groups use visible rectangular containers.

Shape control:

- Shape changes apply to selected normal cards.
- Shape changes do not apply to groups in the current UI.
- Multi-selection shape change is not exposed in the current toolbar. Status: zu verifizieren.

## 11. Layout, Ordering and Arrangement

Positioning:

- Canvas layout is free-form.
- Nodes can overlap.
- Nodes can be placed anywhere inside the internal canvas by pointer drag; keyboard movement is clamped to internal canvas bounds.
- New cards created from the top toolbar appear at the current visible top-left canvas point with a small inset.
- New cards created from context menu appear at the clicked canvas point.
- Pasted cards appear with an offset or at a context-menu point.

Internal bounds:

- Internal content size is `2600 x 1900`.
- Internal origin offset is `1200`.
- Keyboard movement clamps selected node bounds within the internal canvas coordinate range.
- Pointer drag clamping is not visible in the current code. Status: zu verifizieren.

Alignment:

- Multi-selection supports align left.
- Multi-selection supports align top.
- Align left uses the minimum selected `x`.
- Align top uses the minimum selected `y`.

Ordering:

- Groups are always visually behind normal cards.
- Edges are visually between groups and normal cards.
- Selected nodes rise above unselected nodes.
- Dragging nodes rise above selected nodes.
- Same-layer ordering follows deterministic render order unless selection/drag state overrides it.

Not currently implemented:

- Bring forward.
- Send backward.
- Bring to front.
- Send to back.
- Auto-layout.
- Distribution.
- Collision avoidance.

Each of these is Status: zu verifizieren for a standalone editor.

Bounding boxes:

- Multi-selection toolbar position is based on the bounding box of selected nodes.
- Group-from-selection uses a padded bounding box.
- Selection rectangle selects only cards fully contained within the rectangle.

Zoom-aware interaction:

- Pointer deltas for node drag and resize must be divided by current zoom.
- Viewport-to-canvas coordinate conversion must subtract the transformed content rectangle, divide by zoom, and subtract the internal origin.
- Toolbar positions must convert canvas coordinates back into viewport coordinates using viewport translation and zoom.

## 12. Editing Behavior

Card text editing:

- Double-clicking a normal card's text enters inline edit mode.
- The node context menu's edit action enters edit mode.
- Card text editing uses inline contenteditable behavior.
- Text is selected when editing starts.
- Input updates persist the card text immediately in the current implementation.
- Blur exits edit mode and saves current text.
- Escape exits edit mode; because text input updates are already persisted, Escape is not a guaranteed revert. Status: zu verifizieren for desired standalone behavior.
- Empty card text is allowed.
- Multi-line text is supported by the visual style using preserved whitespace.
- Markdown syntax is not rendered as rich text in the current card body. Status: zu verifizieren.

Group name editing:

- Group edit mode uses a text input.
- Input updates persist the group name in current implementation.
- Enter commits and exits edit mode.
- Escape exits edit mode.
- Blur commits current value.
- Empty group names fall back to generated display names.

Edge label editing:

- Edge labels use a draft-edit flow.
- Opening edit mode focuses and selects the label input.
- Input updates the draft.
- Enter commits the draft.
- Blur commits the draft.
- Escape cancels the draft.
- Empty committed labels are removed or treated as absent.

Validation:

- Card text and group names accept empty strings.
- Palette custom color save validates non-empty name and valid `#RRGGBB` color.
- Imported data must validate IDs, supported node kinds, numeric positions, positive dimensions, supported sides, and supported arrow endpoints.

## 13. Selection and Focus Rules

Single selection:

- Clicking a node selects only that node unless modifier selection is active.
- Selecting a node clears selected edge state.
- Selecting an edge clears selected nodes.
- Selecting a new node exits node editing and edge-label editing as needed.

Multi-selection:

- Shift-click toggles node membership.
- Meta/Cmd-click toggles node membership.
- Selection order must be stable and duplicate-free.
- Multi-selection can contain normal cards and groups.
- Copy only includes normal cards, not groups.
- Group-only multi-selection must not show normal-card metadata controls.

Selection rectangle:

- Dragging from an empty viewport creates a selection rectangle.
- Rectangle may be dragged in any direction.
- Only normal cards fully inside the normalized rectangle are selected.
- Groups are not selected by the rectangle in the current implementation.
- If drag does not move beyond threshold, selection is cleared.

Edge selection:

- Edge hit path selects the edge.
- Edge label button selects the edge and enters label edit.
- Selected edge shows the edge toolbar.

Deselect behavior:

- Empty viewport pointer down clears node selection, selected edge, edit state, armed connection, line menu, and overlays.
- Escape clears overlays, active connection preview, line menu, palette editor, edit states, and armed connection.

Focus behavior:

- Nodes are keyboard-focusable.
- Buttons and dropdown summaries have accessible labels.
- Edge label input has an accessible label.
- Group name input has an accessible label.
- Current node articles do not expose `aria-selected` or a dedicated role. A standalone rebuild should provide accessible selection semantics.
- Keyboard selection of nodes without pointer interaction is not clearly implemented. Status: zu verifizieren.

Context-sensitive toolbars:

- Single card selection shows card toolbar.
- Single group selection shows group toolbar.
- Multi-selection shows multi-toolbar.
- Selected edge shows edge toolbar.
- No toolbar renders for empty selection.

## 14. Markdown Import / Edit Requirements

The standalone editor must support a human-readable Markdown representation of a canvas. This Markdown mode is an import/edit/export surface, not a replacement for the editor's internal runtime model.

Goals:

- A `.md` file can describe the complete canvas in a readable way.
- A human can edit cards, groups, positions, sizes, colors, shapes, and connections without editing JSON.
- The editor can import Markdown, render the canvas, allow visual edits, and export equivalent Markdown without losing supported content.
- Stable IDs survive round trips.
- Import should preserve existing IDs unless there is a duplicate or invalid ID conflict.
- Markdown export must not depend on source-app-specific metadata.

Markdown must represent:

- Canvas metadata: internal size, viewport, grid size, snap state.
- Cards: ID, text, position, size, color, shape, and order.
- Groups: ID, name, position, size, color, contained card IDs where known.
- Connections: ID, source card/group ID, source side, target card/group ID, target side, direction, optional label.
- Arrow direction: none, forward, backward, both.
- Layer/order information where relevant.
- Notes/comments if the standalone editor introduces them. Current editor has no generic note/comment feature. Status: zu verifizieren.

Markdown should avoid a raw JSON block as its main representation. A rough acceptable structure:

```md
# Business Canvas

Canvas:
- Size: 2600 x 1900
- Viewport: x=-900, y=-1020, zoom=1
- Grid: size=20, snap=true

## Cards

### Card: card-problem
Text:
Customer problem summary

Position: x=0, y=0
Size: 240 x 110
Color: 1
Shape: rounded-rectangle

### Card: card-solution
Text:
Solution summary

Position: x=320, y=0
Size: 240 x 110
Color: #64748b
Shape: rectangle

## Groups

### Group: group-discovery
Name: Discovery
Position: x=-40, y=-40
Size: 680 x 240
Color: 4
Contains: card-problem, card-solution

## Connections

- Edge: edge-problem-solution
  From: card-problem right
  To: card-solution left
  Direction: forward
  Label: validates
```

Markdown import behavior:

- Unknown sections should be preserved if possible or reported as unsupported.
- Missing optional values should use documented defaults.
- Missing required values should produce clear import errors.
- Duplicate IDs should be repaired only with explicit user confirmation or reported as import errors.
- Connections to missing nodes must be rejected or imported as broken references with visible warnings. The current parser rejects them.
- Import must normalize unsupported shapes to the default shape with a warning.
- Import must normalize unsupported colors to a default color or preserve valid hex colors.
- Import must support multiline card text.
- Import must not require users to know the internal JSON field names.

Markdown export behavior:

- Export must include every visible card, group, and edge.
- Export must preserve stable IDs.
- Export must include positions and sizes after visual editing.
- Export must include colors and shapes after visual editing.
- Export must include edge sides and direction.
- Export must include group names and membership where known.
- Export must be deterministic so diffs are readable.

## 15. Persistence Requirements

The canvas state must be storable and restorable without losing editor semantics.

Required persistence behavior:

- Nodes, groups, edges, viewport, grid settings, colors, shapes, group metadata, and custom palette values must round-trip.
- IDs must remain stable across saves.
- Import must not replace existing IDs unnecessarily.
- New duplicated or pasted cards must receive fresh IDs.
- Deleting nodes must remove connected edges.
- Deleting nodes must remove stale node metadata.
- Deleting grouped nodes must remove them from group membership metadata.
- Deleting groups must remove group metadata.
- Edge labels and direction markers must persist.
- Custom colors must persist.
- Invalid or legacy data must be normalized safely.

Current robustness behavior:

- Duplicate node IDs are rejected during parse.
- Edges referencing missing nodes are rejected during parse.
- Missing node metadata is filled from defaults.
- Group metadata is normalized so membership only includes existing normal cards.
- Unknown extra canvas fields are dropped during serialization.
- Unsupported node types are rejected during parse.

No detailed JSON specification is part of this document.

## 16. Error Handling and Edge Cases

Missing nodes:

- Edges with missing endpoints must not crash rendering.
- Import should reject or flag such edges.
- Current rendering skips such edges.

Broken connections:

- Broken edges must be visible in import validation.
- Users should be able to delete or repair broken edges if the editor imports them.

Duplicate IDs:

- Duplicate node IDs must be rejected or repaired with explicit conflict handling.
- Duplicate edge IDs must also be rejected or repaired. Current explicit duplicate-edge behavior is Status: zu verifizieren.

Empty text:

- Empty cards are valid.
- Empty edge labels are treated as absent labels.
- Empty group names fall back to generated display names.

Large canvas and many nodes:

- The viewport must remain responsive with large internal canvas dimensions.
- Drag preview should avoid full rerender on every pointer move where possible.
- Current implementation updates dragged nodes and live edge paths directly during pointer movement.
- Performance expectations for very large node counts are Status: zu verifizieren.

Strong zoom/pan:

- Zoom must clamp to `0.4` to `2.0`.
- Coordinate conversion must remain stable at both limits.
- Pan values may move the content substantially; the editor must not lose the canvas.
- Reset view should restore default viewport. Visible control Status: zu verifizieren.

Nodes outside the visible area:

- Nodes may exist outside the current viewport.
- Top-toolbar new card placement must use visible top-left conversion so new content appears where the user can see it.
- Keyboard movement clamps to internal canvas bounds.
- Pointer drag boundary rules are Status: zu verifizieren.

Groups without content:

- Empty groups are valid.
- Empty groups can be selected, moved, resized, renamed, recolored, and deleted.

Connections between groups:

- Current UI does not allow creating group connections.
- Import/render behavior for group-connected edges is Status: zu verifizieren.

Undo/redo:

- No undo/redo implementation is visible in the current canvas module.
- A standalone editor should provide undo/redo for destructive actions and drag/edit operations or else require stronger confirmation for destructive operations. Status: zu verifizieren.

Duplication collisions:

- Duplicate/paste offsets copied cards by `24px` when no target point is provided.
- Paste at context point aligns copied bounding box to that point.
- IDs are regenerated.
- The editor does not enforce collision-free placement.

Deleting grouped nodes:

- Deleting a card removes it from group membership metadata.
- Deleting a group does not delete contained cards unless those cards are explicitly selected.
- Deleting a group removes group metadata.

Deleting nodes with connections:

- All edges whose start or target node is deleted are removed.

Destructive confirmations:

- Current node and edge deletion execute immediately.
- Confirmation dialogs are not visible in the canvas module. Status: zu verifizieren.

## 17. Accessibility Requirements

Minimum accessibility requirements for a standalone rebuild:

- The canvas viewport should expose a region or application landmark with a descriptive accessible name.
- Nodes must be keyboard focusable.
- Selected nodes should expose `aria-selected` or equivalent state.
- Toolbars must use accessible button names.
- Icon-only buttons must have `aria-label`.
- Dropdown menus must be keyboard navigable and expose menu/menuitem semantics or native equivalent.
- Edge labels must be reachable and editable by keyboard.
- Group name input must have an accessible label.
- Color choices must expose names, not only color swatches.
- Shape choices must expose names.
- Focus outlines must be visible.
- Keyboard movement must not trigger while an editable field has focus.
- Escape behavior must be predictable and must not trap focus.
- Custom colors must maintain sufficient contrast for readable text and visible focus/selection state.

Current implementation notes:

- Nodes are focusable with `tabindex="0"`.
- Several buttons and inputs include `aria-label`.
- SVG edge layer has an accessible label.
- Dropdown menus use `role="menu"` on menu containers.
- Node articles do not clearly expose role or selection state. Status: zu verifizieren.
- Full keyboard-only creation, selection, and connection workflows are not clearly implemented. Status: zu verifizieren.

## 18. Acceptance Criteria

- An external developer can rebuild the generic Business Canvas Editor from this document without relying on source-app-specific business logic.
- The editor surface, viewport, transformed content layer, zoom, pan, and grid behavior are specified.
- Normal cards, group nodes, positions, dimensions, colors, shapes, focus, selection, dragging, and resizing are specified.
- Group creation, containment, selection, moving, resizing, naming, and metadata expectations are specified.
- Edges, sides, arrow ends, direction presets, labels, rendering layer, live geometry updates, creation, selection, and deletion are specified.
- All generic visible controls and menus are documented.
- Missing or unclear controls are marked with `Status: zu verifizieren`.
- Generic color and shape behavior is documented without app-specific taxonomy.
- Free layout, alignment, bounding boxes, stacking, canvas bounds, scroll/pan, and zoom-aware interaction are specified.
- Editing behavior for cards, groups, and edge labels is specified.
- Single selection, multi-selection, selection rectangle, edge selection, deselection, and context toolbars are specified.
- Markdown import/edit/export requirements are included.
- Persistence requirements are described without a detailed JSON schema.
- Error handling and edge cases are covered.
- Accessibility requirements are included.
- Source-app-specific staged workflow and taxonomy systems are excluded.
- The documentation lives under `docs/dev/`.
- The docs index links to this document.

## 19. Review Checklist

- Editor surface complete?
- Canvas rendering and layers complete?
- Buttons, menus, toolbars, popovers complete?
- Node functions complete?
- Group functions complete?
- Connection and arrow functions complete?
- Drag, resize, pan, zoom, and keyboard interactions complete?
- Selection and focus rules complete?
- Colors and shapes documented generically?
- Markdown import/edit/export requirement understandable?
- Persistence described without JSON schema detail?
- Excluded source-app systems not documented?
- All unclear features marked with `Status: zu verifizieren`?
- Documentation usable for an external platform rebuild?

## 20. Open Questions / To Verify

- `Status: zu verifizieren` - Should standalone mode support explicit ungrouping?
- `Status: zu verifizieren` - Should group resize affect contained cards or only the group container?
- `Status: zu verifizieren` - Should group-to-card and group-to-group connections be supported?
- `Status: zu verifizieren` - Should edge midpoint insertion split the existing edge or add an additional edge as current behavior does?
- `Status: zu verifizieren` - Should pointer dragging clamp nodes to internal canvas bounds?
- `Status: zu verifizieren` - Should reset/center view be visible in the top toolbar?
- `Status: zu verifizieren` - Should import/export be available directly from the canvas toolbar?
- `Status: zu verifizieren` - Should undo/redo be required before destructive actions can execute without confirmation?
- `Status: zu verifizieren` - Should file/link node kinds be first-class editable cards in the standalone editor?
- `Status: zu verifizieren` - Should Markdown card text render as Markdown or remain plain editable text?
- `Status: zu verifizieren` - Should custom notes/comments be supported in Markdown and UI?
- `Status: zu verifizieren` - What performance threshold is required for very large canvases?
