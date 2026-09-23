import { syncAllPreviews } from "../src/previews/sync";

/** sincroniza public/previews/ con las piezas generadas (para Remotion Studio) */
const results = await syncAllPreviews();
let total = 0;
for (const r of results) {
  console.log(`   • ${r.project}: ${r.pieces} pieza(s) en previews`);
  total += r.pieces;
}
console.log(`✅ ${total} previews listos en public/previews/`);
