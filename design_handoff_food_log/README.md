# Handoff: 食物熱量記錄 (Food Weight/Calorie Log)

## Overview
A personal-use web app for logging food entries the user has already weighed and calculated: a photo, weight (g), protein (g), and calories (kcal) per entry. The core interaction beyond basic CRUD is a **multi-select grid**: the user can click multiple food cards at once and see a running total (weight/protein/calories) for just the selected items — replacing the user's prior workaround of scrolling an Instagram grid and opening each photo individually to read the numbers.

Single user, no accounts, no backend. Data persists in the browser via `localStorage`.

## About the Design Files
The bundled file `食物熱量記錄.dc.html` is a **design reference built in HTML** — a working prototype demonstrating the intended layout, visual style, and interaction behavior. It is not production code to copy as-is. The task is to **recreate this design in the target codebase's environment** (React/Vue/native/etc., whichever the project already uses — or the most appropriate choice if starting fresh), following its existing conventions for state management, styling, and file structure.

Note: the file is a "Design Component" — it uses a small proprietary templating runtime (`support.js`, not included) to stream-render. Read it as a spec for markup/logic/styling, not as literal importable code. `styles.css` (also bundled) IS plain, framework-agnostic CSS and can be adapted directly — it holds the actual design tokens (CSS variables) and component class definitions the design uses.

## Fidelity
**High-fidelity.** Colors, type, spacing, and component styles are final (taken from the bundled `styles.css` design-system tokens, "Modernist" — flat, architectural, Archivo type, red accent on off-white, zero border radius, strong 2px rules). Recreate pixel-close using the codebase's existing styling approach, substituting equivalent tokens if the codebase already has its own theme.

## Screens / Views
This is a single-page app with one persistent screen and one modal overlay.

### 1. Main screen — Food grid
**Purpose:** Browse, search, and multi-select logged food entries.

**Layout:**
- Top nav bar (`.nav`): flex row, `space-between`-style (brand pinned left via `margin-right:auto`), 2px bottom divider. Contains:
  - Brand/title text, left: "食物熱量記錄" (Archivo, weight 800, ~18px)
  - Search field: pill-ish container (surface bg, 1px divider border, 6px/10px padding) with a search icon (18px) + a borderless text input, placeholder "搜尋食物名稱". `flex:1, max-width:320px`.
  - Primary button, right: "+ 新增食物" (plus icon + label), solid accent fill.
- Main content area: `max-width:1200px`, centered, `padding: 24px 16px` (scale up with the codebase's spacing scale).
  - **Grid** (when there are items matching the search): CSS grid, `grid-template-columns: repeat(auto-fill, minmax(170px, 1fr))`, `gap: 16px`.
  - **Empty state** (zero items total): centered column, image-placeholder icon (opacity 0.35), heading "還沒有任何紀錄", muted subtext "拍下食物照片，記錄重量、蛋白質與熱量，開始建立你的資料庫", primary CTA button "+ 新增第一筆紀錄".
  - **No-results state** (items exist but search matches none): centered muted text `找不到符合「{query}」的紀錄`.

**Food card component** (repeats in the grid):
- Container: surface background, `padding:8px`, `display:flex; flex-direction:column; gap:8px`, `border: 2px solid transparent` — border becomes the accent color when the card is selected (this is the ENTIRE selection affordance on the card body). `cursor:pointer`, whole card is clickable to toggle selection.
- Photo area: square (`aspect-ratio:1`), `overflow:hidden`, neutral-200 background fallback.
  - Photo renders with `filter: grayscale(1) contrast(1.08)` by default (a deliberate design-system choice — photography prints black & white; this can be toggled off as a variant/setting).
  - If no photo: centered camera-outline icon, muted color.
  - Selected-state badge: 24×24 accent-filled square, top-left, white checkmark icon, shown only when the card is selected.
  - Two small icon buttons, top-right of the photo, stacked vertically (26×26, translucent background, edit-pencil icon and trash icon). Clicking either must `stopPropagation` so it doesn't also toggle selection.
- Food name: Archivo 800, 15px, single line with ellipsis overflow.
- Meta row: three small pill tags — weight (neutral tint, "{n} g"), protein (accent tint, "{n} g 蛋白質"), calories (outline accent style, "{n} kcal").

**Floating selection summary bar** (only rendered when 1+ cards are selected):
- Fixed position, horizontally centered, 24px from the bottom, `z-index` above content.
- Dark pill/bar: background = the design's near-black text color, text color = the light background color (i.e. inverted from the page), generous padding (14px/24px), large shadow, `flex-wrap:wrap` for small screens.
- Content, left to right: "已選 {n} 項" label → three stat blocks (each: big Archivo-800 number in a lighter accent tint suited to a dark background, small uppercase muted label underneath — 重量/蛋白質/熱量) → a "清除選取" button (outlined, light text/border, clears the selection).
- Totals = sum of weight/protein/calories across only the currently-selected items.

### 2. Add / Edit modal
**Purpose:** Create a new entry or edit/delete an existing one.

**Layout:** Standard centered modal over a dark 50%-opacity backdrop (click backdrop to close; clicking inside the dialog must not close it).
- Dialog surface: `width: min(480px, 92vw)`, surface background, large shadow, no border radius.
- Header row: title ("新增紀錄" or "編輯紀錄") + a plain icon-only close (×) button, top-right.
- Body:
  - Row: 120×120 photo-upload box (dashed border, surface-on-bg fill) next to the "食物名稱" text field. Clicking the box opens the device's file picker; shows the chosen photo once picked (uncropped `object-fit:cover`, no grayscale filter in edit mode — full color while editing), otherwise a camera icon + "上傳照片" caption.
  - Below: a 3-column grid of number fields — 重量 (g), 蛋白質 (g), 熱量 (kcal). All default to empty/0.
- Footer (`.dialog-actions`, space-between):
  - Left: a "刪除" button in accent-tinted text — **only present when editing an existing entry**, absent when adding a new one.
  - Right: "取消" (secondary) and "儲存" (primary, disabled until the name field is non-empty).

## Interactions & Behavior
- **Card click** → toggles that card's id in/out of a `selectedIds` set/array. No limit on selection count.
- **Edit icon click** (on a card) → opens the modal pre-filled with that item's data, `stopPropagation` so the card isn't also toggled.
- **Delete icon click** (on a card) or **Delete button** (in the modal) → removes the item. In this prototype it's gated by `window.confirm(...)`; in production, use the app's real confirm/toast pattern. Deleting an item also removes it from `selectedIds` if it was selected.
- **Search input** → live-filters the grid by case-insensitive substring match on the food name. Clearing it shows all items again.
- **Add photo** (in modal) → clicking the upload box triggers a native file input (`accept="image/*"`); the chosen file is read and previewed immediately (in the real app, decide whether to store the image as a data URL, upload it, or use local file storage — the prototype uses a `FileReader` → data URL for simplicity, not production-appropriate for a real backend).
- **Save** → validates that the name is non-empty (weight/protein/calories default to 0 if left blank/invalid); creates a new record (prototype: timestamp-ish generated id + `createdAt`) or patches the existing one; closes the modal.
- **Clear selection** button (floating bar) → empties `selectedIds`.
- No pagination/virtualization considered — fine for a personal food log; flag to the developer if the real data volume could be large.

## State Management
Suggested state shape (translate into whatever the target framework/store uses):
- `items: { id, name, imageUrl, weight: number, protein: number, calories: number, createdAt }[]` — persisted (in the prototype: `localStorage`; in production: real backend/DB per item, since this is meant to be a "record of past data").
- `selectedIds: string[]` (or `Set<string>`) — transient, not persisted; cleared on demand or optionally on data refresh.
- `search: string` — transient.
- `modal: { open: boolean, editingId: string|null, formName, formWeight, formProtein, formCalories, formImage }` — transient, reset whenever the modal opens.
- Derived: filtered/sorted list from `items` + `search`; selection totals from `items` filtered by `selectedIds`.
- Settings/variants exposed as tweakable in the prototype (implement as real user settings or simple constants, as appropriate):
  - Sort order: newest first / oldest first / by name.
  - Grayscale vs. full-color food photos in the grid.
  - Whether delete requires a confirmation step.

## Design Tokens
All taken from the bundled `styles.css` ("Modernist" design system). Use these values directly, or map them onto the target codebase's existing token names if it already has a theme.

**Color**
- Background: `#f3f2f2` · Surface (cards/inputs): `#eae9e9` · Text/ink: `#201e1d`
- Accent (single accent system): `#ec3013`, with a full tonal ramp `--color-accent-100…900` (100 `#fff2ef` → 900 `#4d170e`); use 100–300 for tints, 500 as base, 700–900 for text-on-tint / pressed states, 400 for accent text on a dark surface.
- Neutral ramp: `--color-neutral-100 #f8f4f4` … `--color-neutral-900 #2d2b2b`.
- Divider: `color-mix(in srgb, #201e1d 40%, transparent)`.

**Type**
- Both heading and body: **Archivo** (Google Fonts), heading weight 800.
- Scale: h1 42px / h2 32px / h3 25px / h4 20px / h5 16px / h6 13px (uppercase, letter-spacing 0.08em). Body 15px, line-height 1.55.

**Spacing** (1.00× density)
- `--space-1: 4px · --space-2: 8px · --space-3: 12px · --space-4: 16px · --space-6: 24px · --space-8: 32px`

**Radius**
- All zero: `--radius-sm/md/lg: 0px`. Do not round any corner — this is a deliberate part of the system's flat, architectural look.

**Shadow**
- `--shadow-sm`, `--shadow-md`, `--shadow-lg` — soft ink-tinted shadows tuned to the light background (see `styles.css` for exact values).

**Components reused from the system** (see `styles.css` for full CSS): `.btn`/`.btn-primary`/`.btn-secondary`, `.card`, `.tag`/`.tag-accent`/`.tag-neutral`/`.tag-outline`, `.field`/`.input`, `.nav`, `.dialog-backdrop`/`.dialog`.

## Assets
- **Food photos**: user-uploaded, no stock/placeholder images used. Rendered through a black & white filter by default (`grayscale(1) contrast(1.08)`), per the design system's photography rule — a deliberate stylistic choice, not a bug; flag to the user if they'd rather ship this in color.
- **Icons**: simple line icons in the [Lucide](https://lucide.dev) style (search, plus, pencil, trash-2, x, check, camera, image) — inline SVG, `stroke="currentColor"`, `stroke-width="2"`, no fill. Use the Lucide package directly in the target codebase rather than hand-copying the inline paths.

## Files
- `食物熱量記錄.dc.html` — the interactive design prototype (markup + logic + inline styles), for reference only (see "About the Design Files" above).
- `styles.css` — the actual design-system stylesheet (CSS variables + component classes) referenced by the prototype. Portable as-is if the target project doesn't already have conflicting global styles.
