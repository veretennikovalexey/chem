// Interactive periodic table — front-end rendering.
//
// Data lives in elements.json (single source of truth), served locally.
// Each element: { num, sym, col, row, en, ru, group, metal, noble, conf }.
// Each cell is a link to /<num>.html; the symbol->number hover is pure CSS.
// `metal` and `noble` come straight from the data, so both tables tint exactly
// the same elements.

fetch("elements.json")
  .then((r) => r.json())
  .then((elements) => {
    const table = document.getElementById("table");

    for (const el of elements) {
      const cell = document.createElement("a");
      cell.className =
        "cell" + (el.metal ? " metal" : "") + (el.noble ? " noble" : "");
      cell.href = el.num + ".html";
      cell.style.gridColumn = el.col;
      cell.style.gridRow = el.row;

      const sym = document.createElement("span");
      sym.className = "sym";
      sym.textContent = el.sym;

      const num = document.createElement("span");
      num.className = "num";
      num.textContent = el.num;

      cell.appendChild(sym);
      cell.appendChild(num);
      table.appendChild(cell);
    }
  });
