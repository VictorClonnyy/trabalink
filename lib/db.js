/* Banco de dados do Trabalink.
   - Na Vercel: Postgres (Neon), pela variável DATABASE_URL.
   - No seu PC: PGlite (Postgres embutido) em ./.dados-local, sem instalar nada.
   As tabelas seguem o DER do relatório (seção 5) + historico_status. */
import crypto from "node:crypto";
import { SEED } from "./seed.js";

let conexao = null;
let pronto = null;

async function conectar() {
  if (conexao) return conexao;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    conexao = {
      tipo: "neon",
      query: async (texto, params = []) => (typeof sql.query === "function" ? sql.query(texto, params) : sql(texto, params))
    };
  } else {
    if (process.env.VERCEL) throw new Error("DATABASE_URL não configurada. Adicione um banco Neon em Storage no painel da Vercel.");
    const nome = "@electric-sql/pglite"; // import por variável: não entra no pacote da Vercel
    const { PGlite } = await import(nome);
    const pg = new PGlite(process.env.PGLITE_DIR || "./.dados-local");
    conexao = { tipo: "pglite", query: async (texto, params = []) => (await pg.query(texto, params)).rows };
  }
  return conexao;
}

export async function q(texto, params) {
  if (!pronto) pronto = preparar();
  await pronto;
  return (await conectar()).query(texto, params);
}

const ESQUEMA = [
  `create table if not exists meta (chave text primary key, valor bigint not null)`,
  `create table if not exists usuario (id text primary key, nome text not null, email text not null unique, senha_hash text not null,
     papel text not null, telefone text not null default '', foto text not null default '', status text not null default 'ativo', criado_em text not null)`,
  `create table if not exists perfil_profissional (id text primary key, usuario_id text not null unique references usuario(id), titulo text not null default '',
     categoria_id text not null default '', biografia text not null default '', localizacao text not null default '', cep text not null default '',
     area_atendimento text not null default '25km', disponibilidade text not null default 'seg_sex', faixa_preco double precision not null default 0,
     media_avaliacao double precision not null default 0)`,
  `create table if not exists habilidade (id text primary key, nome text not null unique, descricao text not null default '')`,
  `create table if not exists profissional_habilidade (id text primary key, perfil_profissional_id text not null references perfil_profissional(id),
     habilidade_id text not null references habilidade(id), nivel_experiencia text not null default 'intermediario', unique (perfil_profissional_id, habilidade_id))`,
  `create table if not exists portfolio (id text primary key, perfil_profissional_id text not null references perfil_profissional(id), titulo text not null,
     descricao text not null default '', arquivo text not null default '', ordem integer not null default 1)`,
  `create table if not exists servico (id text primary key, perfil_profissional_id text not null references perfil_profissional(id), categoria_id text not null,
     titulo text not null, descricao text not null default '', preco_inicial double precision not null, localizacao text not null default '', ativo boolean not null default true)`,
  `create table if not exists demanda (id text primary key, contratante_id text not null references usuario(id), categoria_id text not null, titulo text not null,
     descricao text not null, orcamento double precision not null, localizacao text not null, cep text not null default '', prazo text not null default '',
     status text not null default 'aberta', anexos text not null default '[]', criado_em text not null)`,
  `create table if not exists proposta (id text primary key, demanda_id text not null references demanda(id), perfil_profissional_id text not null references perfil_profissional(id),
     valor double precision not null, prazo integer not null, mensagem text not null, status text not null default 'enviada', criado_em text not null)`,
  `create table if not exists contratacao (id text primary key, proposta_id text not null unique references proposta(id), contratante_id text not null references usuario(id),
     perfil_profissional_id text not null references perfil_profissional(id), valor_combinado double precision not null, status text not null,
     data_inicio text not null default '', data_conclusao text not null default '')`,
  `create table if not exists historico_status (id text primary key, contratacao_id text not null references contratacao(id), status text not null,
     autor_id text not null references usuario(id), data text not null)`,
  `create table if not exists conversa (id text primary key, contratacao_id text not null unique references contratacao(id), ultima_atividade text not null)`,
  `create table if not exists mensagem (id text primary key, conversa_id text not null references conversa(id), remetente_id text not null references usuario(id),
     texto text not null, anexo text not null default '', data text not null, lida boolean not null default false)`,
  `create table if not exists avaliacao (id text primary key, contratacao_id text not null references contratacao(id), autor_id text not null references usuario(id),
     avaliado_id text not null references usuario(id), nota integer not null check (nota between 1 and 5), comentario text not null default '', criado_em text not null,
     unique (contratacao_id, autor_id))`,
  `create table if not exists notificacao (id text primary key, destinatario_id text not null references usuario(id), tipo text not null, texto text not null,
     link text not null default '', lida boolean not null default false, data text not null)`,
  `create index if not exists ix_mensagem_conversa on mensagem (conversa_id)`,
  `create index if not exists ix_notificacao_dest on notificacao (destinatario_id)`,
  `create index if not exists ix_proposta_demanda on proposta (demanda_id)`
];

async function preparar() {
  const c = await conectar();
  let existe = true;
  try { await c.query("select valor from meta where chave = 'versao'"); } catch (e) { existe = false; }
  if (existe) return;
  for (const s of ESQUEMA) await c.query(s);
  await semear(c);
}

export function hashSenha(senha) {
  const sal = crypto.randomBytes(16).toString("hex");
  return sal + ":" + crypto.scryptSync(senha, sal, 32).toString("hex");
}
export function conferirSenha(senha, guardado) {
  const [sal, h] = String(guardado).split(":");
  if (!sal || !h) return false;
  const calc = crypto.scryptSync(senha, sal, 32);
  const esperado = Buffer.from(h, "hex");
  return esperado.length === calc.length && crypto.timingSafeEqual(calc, esperado);
}

async function inserir(c, tabela, reg) {
  const cols = Object.keys(reg);
  await c.query(`insert into ${tabela} (${cols.join(",")}) values (${cols.map((_, i) => "$" + (i + 1)).join(",")})`, cols.map(k => reg[k]));
}

async function semear(c) {
  const S = SEED;
  const hashDemo = hashSenha("demo1234");
  const agora = new Date().toISOString();
  for (const u of S.usuario) await inserir(c, "usuario", { id: u.id, nome: u.nome, email: u.email, senha_hash: hashDemo, papel: u.papel, telefone: u.telefone, foto: u.foto, status: u.status, criado_em: agora });
  for (const p of S.perfil_profissional) await inserir(c, "perfil_profissional", p);
  for (const h of S.habilidade) await inserir(c, "habilidade", h);
  for (const ph of S.profissional_habilidade) await inserir(c, "profissional_habilidade", ph);
  for (const i of S.portfolio) await inserir(c, "portfolio", i);
  for (const s of S.servico) await inserir(c, "servico", s);
  for (const d of S.demanda) await inserir(c, "demanda", { ...d, anexos: JSON.stringify(d.anexos || []) });
  for (const r of S.proposta) await inserir(c, "proposta", r);
  for (const ct of S.contratacao) {
    const { historico, ...resto } = ct;
    await inserir(c, "contratacao", resto);
    let n = 1;
    for (const h of historico || []) await inserir(c, "historico_status", { id: `${ct.id}-H${n++}`, contratacao_id: ct.id, status: h.status, autor_id: h.autor_id, data: h.data });
  }
  for (const v of S.conversa) await inserir(c, "conversa", v);
  for (const m of S.mensagem) await inserir(c, "mensagem", m);
  for (const a of S.avaliacao) await inserir(c, "avaliacao", a);
  for (const n of S.notificacao) await inserir(c, "notificacao", n);
  await c.query(`update perfil_profissional p set media_avaliacao = coalesce((select round(avg(nota)::numeric, 1)::float8 from avaliacao a where a.avaliado_id = p.usuario_id), 0)`);
  await c.query("insert into meta (chave, valor) values ('versao', 1)");
}

/* Apaga tudo e recria com os dados de demonstração (npm run reset). */
export async function resetar() {
  const c = await conectar();
  const tabelas = ["notificacao", "avaliacao", "mensagem", "conversa", "historico_status", "contratacao", "proposta", "demanda", "servico", "portfolio", "profissional_habilidade", "habilidade", "perfil_profissional", "usuario", "meta"];
  for (const t of tabelas) await c.query(`drop table if exists ${t} cascade`);
  pronto = null;
  await q("select 1");
}
