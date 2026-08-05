// Short-form (Mendeleev, 8-group) periodic table — front-end rendering.
//
// Same data source as the long form: elements.json.
// The table is one uniform grid: 17 equal columns of the same width and the
// same gap, so every element sits in its own cell of an invisible lattice.
//   groups I..VII -> 2 columns each (А | Б),  group VIII -> 3 (the triads)
// The short-form position is derived from the long-form column/row:
//   period  : row 1..7; the lanthanide row 9 -> period 6, actinide row 10 -> 7
//   ряд     : small periods (1-3) take one row, big periods take two —
//             the d-block half (col<=10) first, the p-block half (col>=11) second
//   group   : el.group (Roman I..VIII) — already the 8-group numbering
//   subgroup: А (главная) for s-/p-block (col 1-2, 13-18),
//             Б (побочная) for the d-block (col 3-12)
// Each cell links to /<num>.html; the symbol->number hover is pure CSS.
// Metals carry the extra `metal` class (the flag lives in elements.json), so
// the tint is identical in the short and the long form — series rows included.

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
const RYADS = 11; // 3 small periods + 4 big periods x 2
const HEAD_ROWS = 2; // group numbers, then the А/Б labels

// Lanthanides / actinides live under the table; only La and Ac stay in group III Б.
const inSeries = (el) => (el.row === 9 || el.row === 10) && el.col > 3;

const isMain = (el) => el.col <= 2 || el.col >= 13; // А (главная) vs Б (побочная)

function place(el) {
  const per = el.row <= 7 ? el.row : el.row === 9 ? 6 : 7;
  const ryad = per <= 3 ? per : el.col <= 10 ? 2 * per - 4 : 2 * per - 3;
  const g = ROMAN.indexOf(el.group) + 1;
  // Column of the invisible 17-column lattice.
  // Group VIII is three columns wide: the noble gas takes the first, the
  // triad (Fe Co Ni ...) spreads across all three.
  const sub =
    g === 8
      ? isMain(el)
        ? 15
        : 15 + (el.col - 8)
      : isMain(el)
      ? 2 * g - 1
      : 2 * g;
  return { per, ryad, sub };
}

function cellLink(el, mark) {
  const cell = document.createElement("a");
  cell.className = el.metal ? "cell metal" : "cell";
  cell.href = el.num + ".html";
  cell.title = el.ru;

  const sym = document.createElement("span");
  sym.className = "sym";
  sym.textContent = el.sym + (mark || "");

  const num = document.createElement("span");
  num.className = "num";
  num.textContent = el.num;

  cell.appendChild(sym);
  cell.appendChild(num);
  return cell;
}

function add(parent, className, text, col, row) {
  const div = document.createElement("div");
  div.className = className;
  div.textContent = text;
  div.style.gridColumn = col;
  div.style.gridRow = row;
  parent.appendChild(div);
  return div;
}

fetch("elements.json")
  .then((r) => r.json())
  .then((elements) => {
    const table = document.getElementById("short");

    // ---- header: group number (Roman) over its columns, then А / Б ----
    ROMAN.forEach((roman, i) => {
      const g = i + 1;
      const first = g === 8 ? 16 : 2 * g; // +1 for the period column
      add(table, "ghead", roman, `${first} / span ${g === 8 ? 3 : 2}`, 1);
      add(table, "gsub", "А", first, 2);
      add(table, "gsub", "Б", `${first + 1} / span ${g === 8 ? 2 : 1}`, 2);
    });

    // ---- period labels (one per period; big periods span two ряды) ----
    for (let per = 1; per <= 7; per++) {
      const first = per <= 3 ? per : 2 * per - 4;
      add(table, "phead", per, 1, `${first + HEAD_ROWS} / span ${per <= 3 ? 1 : 2}`);
    }

    // ---- the elements ----
    for (const el of elements) {
      if (inSeries(el)) continue;
      const { ryad, sub } = place(el);
      const cell = cellLink(el, el.num === 57 ? "*" : el.num === 89 ? "**" : "");
      cell.style.gridColumn = sub + 1; // +1 for the period column
      cell.style.gridRow = ryad + HEAD_ROWS;
      table.appendChild(cell);
    }

    // ---- lanthanides / actinides under the table ----
    const series = document.getElementById("series");
    [
      ["* Лантаноиды", 9],
      ["** Актиноиды", 10],
    ].forEach(([name, row]) => {
      const line = document.createElement("div");
      line.className = "series-row";

      const label = document.createElement("div");
      label.className = "series-label";
      label.textContent = name;
      line.appendChild(label);

      elements
        .filter((el) => el.row === row && el.col > 3)
        .forEach((el) => line.appendChild(cellLink(el)));

      series.appendChild(line);
    });
  });
