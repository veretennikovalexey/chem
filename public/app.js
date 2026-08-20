// Interactive periodic table — front-end rendering.
//
// Data lives in elements.json (single source of truth), served locally.
// Each element: { num, sym, col, row, en, ru, group, metal, noble, nonmet, conf }.
// Each cell is a link to /<num>.html; the symbol->number hover is pure CSS.
// `metal`, `noble` and `nonmet` come straight from the data, so both tables tint
// exactly the same elements.

fetch("elements.json")
  .then((r) => r.json())
  .then((elements) => {
    const table = document.getElementById("table");

    for (const el of elements) {
      const cell = document.createElement("a");
      cell.className =
        "cell" +
        (el.metal ? " metal" : "") +
        (el.noble ? " noble" : "") +
        (el.nonmet ? " nonmet" : "");
      cell.href = el.num + ".html";
      cell.style.gridColumn = el.col;
      cell.style.gridRow = el.row;

      const sym = document.createElement("span");
      sym.className = "sym";
      sym.textContent = el.sym;
      // Diatomic simple substances (H2 N2 O2 F2 Cl2 Br2 I2) carry their
      // molecular subscript; the flag `dia` comes from elements.json.
      if (el.dia) {
        const sub = document.createElement("sub");
        sub.textContent = "2";
        sym.appendChild(sub);
      }

      const num = document.createElement("span");
      num.className = "num";
      num.textContent = el.num;

      cell.appendChild(sym);
      cell.appendChild(num);
      table.appendChild(cell);
    }
  });
