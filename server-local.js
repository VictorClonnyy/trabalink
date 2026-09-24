// Servidor para rodar no seu PC (npm run dev). Na Vercel este arquivo não é usado.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { tratar } from "./lib/app.js";

const PORTA = Number(process.env.PORT || 3000);
const PUBLICO = path.resolve("public");
const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon" };

http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) return tratar(req, res);
  let arquivo = path.join(PUBLICO, decodeURIComponent(req.url.split("?")[0]));
  if (!arquivo.startsWith(PUBLICO)) { res.statusCode = 403; return res.end(); }
  if (fs.existsSync(arquivo) && fs.statSync(arquivo).isDirectory()) arquivo = path.join(arquivo, "index.html");
  if (!fs.existsSync(arquivo)) { res.statusCode = 404; return res.end("Não encontrado"); }
  res.setHeader("Content-Type", TIPOS[path.extname(arquivo)] || "application/octet-stream");
  fs.createReadStream(arquivo).pipe(res);
}).listen(PORTA, () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === "IPv4" && !i.internal).map(i => i.address);
  console.log(`\nTrabalink rodando:\n  neste computador:  http://localhost:${PORTA}`);
  ips.forEach(ip => console.log(`  na mesma rede:     http://${ip}:${PORTA}`));
  console.log("\nContas de teste: carla@trabalink.dev / joao@trabalink.dev (senha demo1234). Ctrl+C para parar.\n");
});
