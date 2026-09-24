// Função serverless da Vercel: todas as rotas /api/* chegam aqui (ver vercel.json).
import { tratar } from "../lib/app.js";

export default function handler(req, res) {
  return tratar(req, res);
}
