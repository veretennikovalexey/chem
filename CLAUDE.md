# CLAUDE.md — Project: Interactive Periodic Table (`chem`)

A minimal, local, fast web app that displays the periodic table of the elements.
This file holds all the working info for the project and the current plan.
Keep it updated as new tasks are agreed in chat.

---

## Core requirements (from the user)

- **Minimal code** — no frameworks, no build step, as few files as possible.
- **Local** — runs fully offline on the user's machine.
- **Fast** — instant load, no heavy dependencies.

## Tech stack (chosen)

- **Frontend:** Vanilla JavaScript + HTML + CSS. No frameworks, no bundler, no npm.
- **Serving / backend:** Node.js built-in `http` module (`server.js`). No external
  packages, no `npm install` — just `node server.js`. Serves the static files on
  port 1429 and renders the per-element pages on the fly.
- **Data store:** a plain local JSON file (`elements.json`) — see "Data storage".
- **Why:** A framework or heavy backend would add code and slow things down, which
  breaks the "minimal / fast" requirement. The user is comfortable running
  `node server.js`, and Node's built-in `http` server needs zero dependencies while
  staying fast and fully offline.

## Data storage — local JSON, not SQLite

- All element data lives in **`elements.json`** (one array, one object per element:
  `{ num, sym, col, row, en, ru, group, metal, noble, ar, conf }`). This is the **single source of truth** — the
  front-end grid and the server-rendered element pages both read it.
- **Why JSON instead of SQLite:** the dataset is 118 fixed, read-only rows. A JSON
  file is dependency-free (no `npm install`, no native module, no experimental
  `node:sqlite` flag), loads instantly, and is trivial to edit by hand — it fits the
  project's "minimal / local / fast" rules. SQLite would add setup and moving parts
  for zero benefit at this scale. **If the data later grows or needs real querying,
  relations, or writes from the app, revisit and migrate to SQLite then.**

## Port

- `3000` is **already in use** on this machine — do **not** use it.
- This project runs on **port 1429**.
- URL: `http://localhost:1429/index.html`

## Run / dev commands

```bash
# from the project root (the chem/ folder)
node server.js
# then open http://localhost:1429/index.html in the browser
```

## Project structure

```
chem/
├── CLAUDE.md        # this file — project info & plan
├── server.js        # Node server: static files + dynamic /N.html pages (port 1429)
├── elements.json    # local data store: 118 elements { num, sym, col, row, en, ru, group, metal, noble, ar, conf }
├── index.html       # long form (18 groups): markup + root grid container
├── app.js           # fetches elements.json, renders the long-form grid of links
├── short.html       # short form (8 groups): markup + grid + series containers
├── short.js         # renders the short-form table from the same elements.json
└── style.css        # both grids + hover styles + element-page styles
```

## Conventions

- Dependency-free. No npm packages, no bundler, no CDN.
- One responsibility per file: server (`server.js`) / data (`elements.json`) /
  markup (`index.html`) / style (`style.css`) / logic (`app.js`).
- All 118 elements live in `elements.json` as
  `{ num, sym, col, row, en, ru, group, metal, noble, conf }` —
  the lanthanides (57–71) sit in grid row 9 and the actinides (89–103) in grid
  row 10 (row 8 is an empty spacer).
- Prefer CSS for layout and the hover effect; use JS only for data + rendering.

---

## Task 1 — Periodic table with hover-to-reveal atomic number — ✅ DONE

**Goal:** The user opens the browser and sees a wide periodic table. Each cell is a
square showing **only the element symbol** (e.g. `O`). On hover, the symbol is
**replaced by its atomic number** in the same square (e.g. oxygen `O` → `8`).

**How it was built:** an 18-column CSS Grid (`style.css`) in the standard
periodic-table shape; `app.js` creates one cell per element; each cell holds a
`.sym` (symbol) and a `.num` (atomic number) span; pure-CSS `:hover` hides the
symbol and shows the number. Served by `node server.js` on port 1429.

**Verified:** 118 unique elements, valid non-overlapping grid positions; the render
loop produces 118 cells; oxygen shows `O` by default and `8` on hover.

## Task 2 — Click an element to open its page (`/N.html`) — ✅ DONE

**Goal:** Clicking an element (e.g. `8`) opens `http://localhost:1429/8.html`. At the
top of that page: **"8. O"**, then the element name **in English**, then **in
Russian** (e.g. `Oxygen` / `Кислород`). All data stored locally.

**How it was built:**

1. **Data** — added English + Russian names to `elements.json` (now the single
   source of truth: `{ num, sym, col, row, en, ru, group, metal, conf }`).
2. **Grid links** — `app.js` now fetches `elements.json` and renders each cell as an
   `<a href="N.html">` (the symbol→number hover is unchanged).
3. **Element pages** — `server.js` matches `/<number>.html`, looks the element up in
   `elements.json`, and renders the page on the fly (no 118 static files). Header is
   `N. Sym`, then the English name, then the Russian name. Unknown numbers → 404.
4. **Styling** — element-page styles added to `style.css`; a small "← Periodic table"
   back link returns to the grid.

**Verified:** `/8.html` → `8. O` / `Oxygen` / `Кислород`; `/1.html` → Hydrogen /
Водород; `/118.html` → Oganesson / Оганесон; `/`, `/style.css`, `/app.js`,
`/elements.json` all HTTP 200; `/999.html`, `/0.html`, `/nope.html` → 404; the grid
renders 118 `<a>` cells each linking to the correct `N.html`.

## Task 3 — Group, electron formula & orbital diagram on the element page — ✅ DONE

**Goal:** Enrich each element (and `elements.json`) with: the **group** as a Roman
numeral (I…VIII), the **electron configuration** (with superscripts), and a
**quantum-cell diagram** of the outer (valence) level — squares with up/down
arrows for the electrons. Everything fits on one screen.

**How it was built:**

1. **Data** — `elements.json` gained two fields per element: `group` (Roman numeral,
   derived from the column; lanthanides/actinides = III) and `conf`, the full
   electron configuration in Klechkovsky/Aufbau filling order as `[n, l, count]`
   entries. Electron counts sum to Z for all 118.
2. **Electron formula** — `server.js` renders `conf` as `1s² 2s² 2p⁴ …` using
   `<sup>` for the superscripts.
3. **Orbital diagram** — the outer valence level is drawn: every subshell of the
   highest shell n (ns, np) plus a partially-filled (n-1)d / (n-2)f, each labelled
   (2s, 2p, …) with its boxes (s=1, p=3, d=5, f=7), filled by Hund's rule (one ↑
   per box, then pair with ↓). A filled inner d¹⁰/f¹⁴ stays in the core and is not
   drawn. E.g. carbon → `2s` ↑↓ | `2p` ↑ ↑ ▯.
4. **Layout** — compact centered card; labels in Russian (Группа, Электронная
   формула, Графическая формула). Header/paddings trimmed so it fits on screen.

**Note on configurations:** these follow the idealized Klechkovsky/Aufbau order, so
known real-world exceptions (Cr, Cu, Pd, Au, La, …) appear in their "textbook rule"
form (e.g. Cr = …4s² 3d⁴). Real ground-state exceptions can be layered in later.

**Verified:** `conf` sums equal Z for all 118; groups valid; outer-level diagram
spot-checks — C → `2s` ↑↓ / `2p` ↑ ↑ ▯; O → `2s` ↑↓ / `2p` ↑↓ ↑ ↑;
Ne → `2s` ↑↓ / `2p` ↑↓ ↑↓ ↑↓; Na → `3s` ↑; Fe → `4s` ↑↓ / `3d` ↑↓ ↑ ↑ ↑ ↑;
Kr → `4s` ↑↓ / `4p` ↑↓ ↑↓ ↑↓ (filled 3d hidden); groups I/V/VI/VIII correct.

## Task 4 — Short form of the table (`short.html`) — ✅ DONE

**Goal:** A second page, `short.html`, with the same 118 elements laid out in the
**short (8-group) form** of the periodic system, with **period numbers** and
**group numbers**.

**Research — are Roman numerals used?** Yes, for the short form. The short form
numbers its groups **I…VIII in Roman numerals**, each split into a **главная (А)**
and a **побочная (Б)** subgroup; the group number is printed above the column.
The modern IUPAC scheme (Arabic **1–18**, no A/B) belongs to the *long* form and
explicitly deprecates the old Roman "IA/VIIB" labels — they are ambiguous because
CAS and old-IUPAC assign A and B to opposite halves. So: **long form → Arabic 1–18,
short form → Roman I–VIII + А/Б.** Periods stay Arabic (1–7).

**How it was built:**

1. **No new data.** The short-form position is derived in `short.js` from the
   long-form `col`/`row` already in `elements.json`:
   - period — `row` 1–7; lanthanide row 9 → period 6, actinide row 10 → period 7;
   - ряд — small periods (1–3) take one row, big periods take two: the d-block
     half (`col ≤ 10`) first, the p-block half (`col ≥ 11`) second → 11 rows;
   - group — `el.group` (the Roman numeral added in Task 3) *is* the 8-group number;
   - subgroup — А for `col` 1–2 and 13–18 (s-/p-block), Б for `col` 3–12 (d-block).
2. **Layout — one uniform lattice.** CSS grid: column 1 = period number (spans both
   rows of a big period), then **17 equal 44px columns with the same 4px gap**, so
   every element sits in its own cell and the spacing is identical everywhere.
   Groups I–VII take **2 columns each** (А left, Б right — the standard variant, so
   K/Cu, Sc/Ga, Mn/Br sit in neighbouring columns); group VIII takes **3** for the
   triads Fe Co Ni / Ru Rh Pd / Os Ir Pt / Hs Mt Ds, with the noble gases in the
   first of the three. Column of an element = `2·group − 1` (А) or `2·group` (Б);
   group VIII = `15 + (col − 8)`.
   **→ Superseded by Task 7:** group VIII is now **4** columns (18 in total) so the
   triads sit in Б, not in the А column shared with the noble gases.
3. **Lanthanides / actinides** — La (57) and Ac (89) stay in group III Б marked
   `La*` / `Ac**`; 58–71 and 90–103 are listed in two rows under the table.
4. **Behaviour** — identical to the long form: symbol → atomic number on hover,
   each cell links to `/N.html`. Cross-links between `index.html` and `short.html`.

**Verified:** `short.js` was run against a DOM shim — 118 elements placed exactly
once (90 in the grid + 28 in the series rows), **no two elements share a grid cell**,
all 17 columns used, every cell links to `N.html`, the column always matches
`el.group`, А columns hold only главные подгруппы and Б columns only побочные,
8 Roman headers spanning the right columns, 7 period labels with the right two-row
spans. Spot-checks:
H → 1/IА, He → 1/VIIIА, K → IА and Cu → IБ, Sc → IIIБ and Ga → IIIА, Mn → VIIБ and
Br → VIIА, Fe Co Ni → VIIIБ, La* → IIIБ, Ac** → IIIБ, Rf → IVБ, Nh → IIIА,
Og → VIIIА. Server: `/short.html`, `/short.js` → 200.

## Task 5 — Metals tinted on the long form (`index.html`) — ✅ DONE

**Goal:** On `index.html`, fill the metal cells with a barely-visible, pleasant
background color (color chosen by Claude).

**How it was built:**

1. **Classification** — non-metals are the unmetals + noble gases + the metalloids
   (B, Si, Ge, As, Sb, Te, At); everything else is a metal and gets the extra class
   `metal` on its cell. Initially a `NON_METALS` set inside `app.js`; **moved into
   `elements.json` as the `metal` boolean in Task 6**, when the short form needed
   the same flag.
2. **Color** — `.cell.metal { background: #fdf3e3; }` — a faint warm sand tint,
   readable next to the white non-metals without shouting. Hover is
   `#f4e4c6` (a shade deeper of the same warm tone, so metals still visibly
   respond to hover); non-metals keep the neutral `#eeeeee` hover.
   `.cell.metal:hover` outranks `.cell:hover` on specificity.
3. **Scope** — long form only. `short.html` / `short.js` are untouched.

**Verified:** 118 cells rendered, 92 metals / 26 non-metals; the non-metal set is
exactly `H He B C N O F Ne Si P S Cl Ar Ge As Se Br Kr Sb Te I Xe At Rn Ts Og`;
spot-checks Fe/Li/Al/La/U/Po/Au/Hg → metal, O/He/B/Si/As/I/At/Og → not; every cell
still links to `N.html` with both the symbol and number spans; `short.js` has no
reference to the class.

## Task 6 — Same metal tint on the short form (`short.html`) — ✅ DONE

**Goal:** Color the elements on `short.html` exactly like the long form — the same
elements, the same color.

**How it was built:**

1. **Flag moved into the data.** As Task 5 anticipated, a second page now needs the
   metal flag, so the hard-coded `NON_METALS` set left `app.js` and became a 9th
   field in `elements.json`: `{ num, sym, col, row, en, ru, group, metal, conf }`,
   `metal` being a boolean. One source of truth, no duplicated set — and the
   server-rendered element pages can use it later for free.
2. **Both renderers read it.** `app.js` and `short.js` each set
   `cell.className = el.metal ? "cell metal" : "cell"`. Because `short.js` builds
   every cell through the shared `cellLink()`, the lanthanide/actinide rows under
   the table are tinted too.
3. **No new CSS.** The `.cell.metal` rules from Task 5 already apply on both pages —
   `style.css` is shared.

**Verified:** both forms render 118 cells with 92 metals / 26 non-metals and
**zero mismatches element-by-element** between the long and the short form; the
short form matches the `metal` flag in `elements.json` for all 118; all 28
lanthanide/actinide series cells are tinted; the short grid still places 90 cells
with no overlaps and every cell links to `N.html`; `conf` sums still equal Z for
all 118 after the file was rewritten.

## Task 7 — Triads moved into subgroup Б of group VIII (`short.html`) — ✅ DONE

**Goal:** Fe, Ru, Os and Hs (and with them the whole triad) must sit in the
**побочная подгруппа Б** of group VIII, not in the А column with the noble gases.

**Research — who is right?** The user is. VIII А is the noble gases (p-elements,
completed shell); VIII Б is the iron triad (Fe Co Ni) plus the two platinum triads
(Ru Rh Pd, Os Ir Pt) and their 7th-period analogues Hs Mt Ds — d-elements, so
побочная подгруппа. In the classic *printed* short table the group VIII box is 3
cells wide, the triad fills it and the noble gas is printed flush left, i.e.
visually under Fe — but that table prints no per-column А/Б captions; subgroup
membership is shown by shifting the symbol left (главная) or right (побочная)
inside the box. **This** table does print А/Б as column headers, so the old
compromise stopped working: a column captioned «А» cannot contain iron. Widening
group VIII also follows the classic "главные слева, побочные справа" rule more
faithfully than the previous layout did.

**How it was built:**

1. **Group VIII is now 4 lattice columns** — one А column (15) for the noble gases,
   then three Б columns (16–18) for the triad. The lattice went 17 → **18** columns
   (`grid-template-columns: 40px repeat(18, 44px)` in `style.css`).
2. **`short.js`** — `place()` now returns `VIII_A + 1 + (col − 8)` for the d-block
   half of group VIII (`VIII_A = 15`); the noble gases keep column 15. The header
   loop spans the Roman `VIII` over 4 columns and its `Б` caption over 3.
3. **Nothing else changed** — periods, ряды, series rows, links and hover are
   untouched, and the long form is not affected at all.

**Verified:** DOM shim — 90 grid cells + 28 series = 118, no overlaps, all 18
columns used, `VIII` header spans `16 / span 4`, its `Б` spans `17 / span 3`,
А columns are exactly 2,4,6,8,10,12,14,16, and **every** element's column matches
its subgroup (0 errors). Positions: Fe/Ru/Os/Hs → first Б column, Co/Rh/Ir/Mt →
second, Ni/Pd/Pt/Ds → third; He Ne Ar Kr Xe Rn Og all in the А column. Server:
`/short.html`, `/short.js`, `/26.html` → 200.

## Task 8 — Noble gases tinted on both forms — ✅ DONE

**Goal:** Give the inert gases their own quiet background color, stored and applied
the same way as the metal tint.

**How it was built:**

1. **Flag in the data** — a new boolean `noble` in `elements.json` (10th field, right
   after `metal`), true for He, Ne, Ar, Kr, Xe, Rn, Og. Same pattern as `metal`:
   one source of truth, both renderers read it, the element pages can use it later.
2. **Both renderers** — `app.js` and `short.js` now compose the class list:
   `"cell" + (el.metal ? " metal" : "") + (el.noble ? " noble" : "")`.
3. **Color** — `.cell.noble { background: #eaf1f8; }`, a faint cool blue — the cold
   counterpart of the warm metal sand, so the two categories never read as the same
   tint. Hover `#cfe0f0`, a shade deeper of the same tone.
4. **No conflict with `metal`** — noble gases are non-metals, so no cell ever carries
   both classes.

**Verified:** 7 noble cells on each form (`He Ne Ar Kr Xe Rn Og`), 92 metals
unchanged, **zero class mismatches element-by-element** between the long and the
short form, no cell is both `metal` and `noble`, all 118 cells still link to
`N.html`, and `conf` sums still equal Z for all 118 after the JSON was rewritten.

## Task 9 — Relative atomic mass Ar on the element card — ✅ DONE

**Goal:** Show the relative atomic mass **Ar** on every element page — rounded to a
whole number for all elements (oxygen → 16), with **chlorine** the single exception
at one decimal place (35.5).

**How it was built:**

1. **Data** — an 11th field `ar` in `elements.json`, inserted between `noble` and
   `conf`: `{ num, sym, col, row, en, ru, group, metal, noble, ar, conf }`. It holds
   the **exact IUPAC standard atomic weight** (abridged: H 1.0080, O 15.999,
   Cl 35.45 …); for the elements with no stable isotope it is the mass number of
   the most stable isotope (Tc 97, Pm 145, Po 209 … Og 294).
2. **Rounding is a display rule, not stored data.** `server.js` gained
   `formatAr(el)` with an `AR_DECIMALS = { 17: 1 }` table: everything renders via
   `toFixed(0)`, chlorine via `toFixed(1)`. Keeping the true value in the JSON and
   the rule in one function means the precision of any element can be changed by
   one number, and the data stays honest.
3. **Layout** — a new `.prop` row, «Относительная атомная масса A<sub>r</sub>», the
   first line of the props block, above Группа. No new CSS beyond `.prop sub`
   sharing the existing small-superscript size.

**Source:** IUPAC standard atomic weights via Wikipedia, *List of chemical elements*
(abridged values; `[ ]` entries = mass number of the most stable isotope).

**Note on Dy:** dysprosium is exactly 162.50, the one halfway value in the table.
It renders as **163** (round half up). If a textbook the user works from prints 162,
this is the single line to change.

**Verified:** all 118 elements have a numeric `ar`; `ar ≥ Z` and within a plausible
range for every element; only chlorine renders with a decimal point, and it renders
`35.5`; 36 hand-checked values against the reference table (H 1, O 16, Ar 40, K 39,
Ca 40, Fe 56, Cu 64, Ag 108, Au 197, Pb 207, U 238, Og 294 …) all match. No
regression after the JSON rewrite: 118 elements numbered 1–118, key order intact,
`conf` sums still equal Z, 92 metals / 7 noble gases unchanged. Server: `/`,
`/index.html`, `/short.html`, `/style.css`, `/app.js`, `/short.js`,
`/elements.json`, `/8.html` → 200; `/999.html` → 404. Rendered cards spot-checked:
H 1, O 16, Cl 35.5, Ar 40, Fe 56, Dy 163, Pb 207, Og 294.

## Decisions (resolved in chat)

- **Server:** Node (`node server.js`), dependency-free — chosen over Python because
  the user already runs servers that way.
- **Hover:** the symbol is **replaced** by the atomic number (not a badge/tooltip).
- **Element pages:** rendered **dynamically** by `server.js` from `elements.json`
  (not 118 static HTML files) to keep the file count low.
- **Storage:** local **JSON** (`elements.json`), not SQLite — see "Data storage".
- **Scope:** grid cells show a single centered letter; the category colors are the
  warm metal tint (Tasks 5–6) and the cool noble-gas tint (Task 8), both on both
  forms.
- **Metals:** metalloids (B, Si, Ge, As, Sb, Te, At) count as **non**-metals and stay
  white; Po is a metal. Ts and Og are treated as non-metals.
- **Noble gases:** He Ne Ar Kr Xe Rn **and Og** (group by column 18, even though Og
  is predicted to be reactive) — they get the cool tint, never the metal one.
- **Group VIII of the short form:** 4 columns — А for the noble gases, three Б for
  the triads (Task 7). The А/Б column captions are authoritative: no element may
  stand in the column of the other subgroup.
- **Atomic mass:** `elements.json` stores the **exact** IUPAC value; the rounding
  (integers everywhere, one decimal for Cl) is a **render rule** in `server.js`.
  Radioactive elements use the mass number of the most stable isotope. Dy 162.50
  rounds **up** to 163.
- **Electron config:** idealized Klechkovsky/Aufbau order (no real ground-state
  exceptions yet). The graphical formula shows the **outer valence level** — the
  highest-shell ns/np plus a partially-filled (n-1)d / (n-2)f; a filled inner
  d¹⁰/f¹⁴ stays in the core and is not drawn.

## Roadmap (future — not started)

- Further tasks to be defined in chat. Update this file whenever a new task is agreed.
- Element pages now show number, symbol, EN/RU names, Ar, group, electron formula
  and the outer-level orbital diagram. Possible next steps: real ground-state config
  exceptions, or further properties (density, melting point, electronegativity) —
  all as new fields in `elements.json`.
- Ar could also be printed in the grid cells themselves (a small number under the
  symbol), the way a wall chart does it.
- The short form could also show the А/Б subgroup on the element page, or mark the
  s-/p-/d-/f-block with color on both grids.
- A small legend under the grids ("металлы / инертные газы") would make the two
  tints self-explanatory; the element page could show the same tint in its header.
