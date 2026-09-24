// Apaga todos os dados e recria os de demonstração: npm run reset
// Na Vercel/Neon: rode no seu PC com DATABASE_URL definida (copie do painel da Vercel).
import { resetar } from "../lib/db.js";

await resetar();
console.log("Banco recriado com os dados de demonstração (senha das contas: demo1234).");
process.exit(0);
