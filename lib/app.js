/* API do Trabalink. Toda regra de negócio é validada aqui, no servidor (RNF05, RNF15):
   o navegador só pede ações e recebe os dados que o usuário pode ver (RN08). */
import crypto from "node:crypto";
import { q, hashSenha, conferirSenha } from "./db.js";
import { OPTION_SETS } from "./opcoes.js";

/* ---------- utilidades ---------- */
class ErroApi extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const falha = (msg, status = 400) => { throw new ErroApi(status, msg); };
const novoId = p => p + Date.now().toString(36) + crypto.randomBytes(3).toString("hex");
const agora = () => new Date().toISOString();
const hoje = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10); // data de Brasília
const opcaoValida = (set, v) => OPTION_SETS[set].some(o => o.id === v);
const nomeOpcao = (set, v) => (OPTION_SETS[set].find(o => o.id === v) || { nome: v }).nome;
const texto = (v, max = 2000) => String(v ?? "").trim().slice(0, max);
const numero = v => { const n = Number(v); return Number.isFinite(n) ? n : NaN; };
const um = async (sql, p) => (await q(sql, p))[0] || null;

async function subirVersao() { await q("update meta set valor = valor + 1 where chave = 'versao'"); }
async function notificar(destino, tipo, txt, link, autorId) {
  if (!destino || destino === autorId) return;
  await q("insert into notificacao (id, destinatario_id, tipo, texto, link, lida, data) values ($1,$2,$3,$4,$5,false,$6)", [novoId("N"), destino, tipo, txt, link, agora()]);
}

/* ---------- sessão (cookie assinado com HMAC) ---------- */
const SEGREDO = process.env.SESSION_SECRET
  || (process.env.DATABASE_URL && crypto.createHash("sha256").update("trabalink:" + process.env.DATABASE_URL).digest("hex"))
  || "trabalink-desenvolvimento-local";
const b64 = s => Buffer.from(s).toString("base64url");
function assinar(uid) {
  const corpo = b64(JSON.stringify({ uid, exp: Date.now() + 30 * 864e5 }));
  return corpo + "." + crypto.createHmac("sha256", SEGREDO).update(corpo).digest("base64url");
}
function lerToken(token) {
  if (!token || !token.includes(".")) return null;
  const [corpo, sig] = token.split(".");
  const esperado = crypto.createHmac("sha256", SEGREDO).update(corpo).digest("base64url");
  if (sig.length !== esperado.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(esperado))) return null;
  try { const d = JSON.parse(Buffer.from(corpo, "base64url").toString()); return d.exp > Date.now() ? d.uid : null; } catch { return null; }
}
function cookieSessao(req, valor, maxAge) {
  const https = (req.headers["x-forwarded-proto"] || "").includes("https");
  return `tl_sessao=${valor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${https ? "; Secure" : ""}`;
}
function lerCookie(req, nome) {
  const m = (req.headers.cookie || "").split(/;\s*/).find(c => c.startsWith(nome + "="));
  return m ? decodeURIComponent(m.slice(nome.length + 1)) : null;
}
async function usuarioDaSessao(req) {
  const uid = lerToken(lerCookie(req, "tl_sessao"));
  if (!uid) return null;
  return um("select id, nome, email, papel, telefone, foto, status from usuario where id = $1 and status = 'ativo'", [uid]);
}
const perfilDe = uid => um("select * from perfil_profissional where usuario_id = $1", [uid]);
function perfilMinimo(p) { return !!(p && p.titulo && p.biografia && p.biografia.length >= 20 && p.localizacao && p.categoria_id); }

/* ---------- estado visível ao usuário (Privacy Rules) ---------- */
async function estado(eu) {
  const uid = eu ? eu.id : "";
  const perfil = eu ? await perfilDe(uid) : null;
  const pid = perfil ? perfil.id : "";
  const [versao] = await q("select valor from meta where chave = 'versao'");
  const d = {};
  d.usuario = await q("select id, nome, papel, foto, status, case when id = $1 then email else '' end as email, case when id = $1 then telefone else '' end as telefone from usuario", [uid]);
  d.perfil_profissional = await q(`select p.*, (select count(*)::int from contratacao c where c.perfil_profissional_id = p.id and c.status = 'concluida') as total_concluidas from perfil_profissional p`);
  d.habilidade = await q("select * from habilidade order by nome");
  d.profissional_habilidade = await q("select * from profissional_habilidade");
  d.portfolio = await q("select * from portfolio order by ordem");
  d.servico = await q("select * from servico");
  d.avaliacao = await q("select * from avaliacao");
  d.contratacao = await q(`select c.* from contratacao c where c.contratante_id = $1 or c.perfil_profissional_id = $2`, [uid, pid]);
  const cids = d.contratacao.map(c => c.id);
  d.proposta = await q(`select r.* from proposta r join demanda dm on dm.id = r.demanda_id where r.perfil_profissional_id = $2 or dm.contratante_id = $1`, [uid, pid]);
  d.demanda = (await q(`select dm.*, (select count(*)::int from proposta r where r.demanda_id = dm.id and r.status <> 'cancelada') as total_propostas from demanda dm
      where dm.status = 'aberta' or dm.contratante_id = $1 or exists (select 1 from proposta r where r.demanda_id = dm.id and r.perfil_profissional_id = $2)`, [uid, pid]))
    .map(x => ({ ...x, anexos: JSON.parse(x.anexos || "[]") }));
  const hist = cids.length ? await q("select * from historico_status where contratacao_id = any($1) order by data", [cids]) : [];
  d.contratacao.forEach(c => { c.historico = hist.filter(h => h.contratacao_id === c.id); });
  d.conversa = cids.length ? await q("select * from conversa where contratacao_id = any($1)", [cids]) : [];
  const vids = d.conversa.map(v => v.id);
  d.mensagem = vids.length ? await q("select * from mensagem where conversa_id = any($1) order by data", [vids]) : [];
  d.notificacao = uid ? await q("select * from notificacao where destinatario_id = $1 order by data desc limit 50", [uid]) : [];
  return { versao: Number(versao.valor), eu, dados: d };
}

/* ---------- ViaCEP ---------- */
async function consultarCep(cep) {
  cep = String(cep || "").replace(/\D/g, "");
  if (cep.length !== 8) falha("Informe um CEP com 8 dígitos.");
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: ctl.signal });
    if (!r.ok) falha("CEP inválido.", r.status === 400 ? 400 : 502);
    const j = await r.json();
    if (j.erro) falha("CEP não encontrado.", 404);
    return { cep: j.cep, logradouro: j.logradouro, bairro: j.bairro, cidade: j.localidade, uf: j.uf };
  } catch (e) {
    if (e instanceof ErroApi) throw e;
    falha("Não foi possível consultar o ViaCEP agora. Preencha a localização manualmente.", 502);
  } finally { clearTimeout(t); }
}

/* ---------- autenticação ---------- */
async function cadastrar(req, b) {
  const nome = texto(b.nome, 80), email = texto(b.email, 120).toLowerCase(), senha = String(b.senha || "");
  if (!nome) falha("Informe o nome.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) falha("Informe um e-mail válido.");
  if (senha.length < 8) falha("A senha precisa ter ao menos 8 caracteres.");
  if (!opcaoValida("papel_usuario", b.papel)) falha("Escolha como vai usar a plataforma.");
  if (!b.termos) falha("É preciso aceitar os termos.");
  if (await um("select id from usuario where email = $1", [email])) falha("Este e-mail já possui conta (RN01).", 409);
  const id = novoId("U");
  await q("insert into usuario (id, nome, email, senha_hash, papel, telefone, foto, status, criado_em) values ($1,$2,$3,$4,$5,'','','ativo',$6)", [id, nome, email, hashSenha(senha), b.papel, agora()]);
  if (b.papel === "profissional") await q("insert into perfil_profissional (id, usuario_id) values ($1,$2)", [novoId("P"), id]);
  await subirVersao();
  return { ok: true, _cookie: cookieSessao(req, assinar(id), 30 * 86400) };
}
async function entrar(req, b) {
  const u = await um("select id, senha_hash, status from usuario where email = $1", [texto(b.email).toLowerCase()]);
  if (!u || u.status !== "ativo" || !conferirSenha(String(b.senha || ""), u.senha_hash)) falha("E-mail ou senha incorretos.", 401);
  return { ok: true, _cookie: cookieSessao(req, assinar(u.id), 30 * 86400) };
}

/* ---------- ações (equivalem aos workflows do Bubble) ---------- */
const ACOES = {
  async "conta.salvar"(eu, b) {
    const nome = texto(b.nome, 80);
    if (!nome) falha("Informe o nome.");
    const foto = b.foto === undefined ? null : String(b.foto);
    if (foto && (!foto.startsWith("data:image/") || foto.length > 2.2e6)) falha("Foto inválida ou acima de 1,5 MB.");
    await q("update usuario set nome = $2, telefone = $3, foto = coalesce($4, foto) where id = $1", [eu.id, nome, texto(b.telefone, 30), foto]);
  },
  async "perfil.salvar"(eu, b, perfil) {
    exigirPerfil(perfil);
    if (!texto(b.titulo) || !texto(b.localizacao) || texto(b.biografia).length < 20 || !opcaoValida("categoria", b.categoria_id)) falha("Preencha título, localização, biografia (mín. 20 caracteres) e categoria.");
    await q(`update perfil_profissional set titulo=$2, localizacao=$3, cep=$4, biografia=$5, categoria_id=$6, area_atendimento=$7, disponibilidade=$8, faixa_preco=$9 where id=$1`,
      [perfil.id, texto(b.titulo, 60), texto(b.localizacao, 120), texto(b.cep, 9), texto(b.biografia, 1500), b.categoria_id,
        opcaoValida("area_atendimento", b.area_atendimento) ? b.area_atendimento : "25km", opcaoValida("disponibilidade", b.disponibilidade) ? b.disponibilidade : "seg_sex", Math.max(0, numero(b.faixa_preco) || 0)]);
  },
  async "habilidade.adicionar"(eu, b, perfil) {
    exigirPerfil(perfil);
    const nome = texto(b.nome, 40);
    if (!nome) falha("Digite a habilidade.");
    let h = await um("select id from habilidade where lower(nome) = lower($1)", [nome]);
    if (!h) { h = { id: novoId("H") }; await q("insert into habilidade (id, nome, descricao) values ($1,$2,'')", [h.id, nome]); }
    if (await um("select id from profissional_habilidade where perfil_profissional_id=$1 and habilidade_id=$2", [perfil.id, h.id])) falha("Habilidade já adicionada.");
    await q("insert into profissional_habilidade (id, perfil_profissional_id, habilidade_id, nivel_experiencia) values ($1,$2,$3,'intermediario')", [novoId("PH"), perfil.id, h.id]);
  },
  async "habilidade.remover"(eu, b, perfil) {
    exigirPerfil(perfil);
    await q("delete from profissional_habilidade where perfil_profissional_id=$1 and habilidade_id=$2", [perfil.id, b.habilidade_id]);
  },
  async "servico.salvar"(eu, b, perfil) {
    exigirPerfil(perfil);
    const ativo = !!b.ativo;
    if (ativo && !perfilMinimo(perfil)) falha("Complete os dados profissionais antes de ativar serviços (RN02).");
    if (!texto(b.titulo) || !opcaoValida("categoria", b.categoria_id) || !(numero(b.preco_inicial) > 0)) falha("Preencha título, categoria e preço maior que zero.");
    const campos = [texto(b.titulo, 60), b.categoria_id, numero(b.preco_inicial), texto(b.descricao, 1000), texto(b.localizacao, 120), ativo];
    if (b.id) {
      const r = await q("update servico set titulo=$3, categoria_id=$4, preco_inicial=$5, descricao=$6, localizacao=$7, ativo=$8 where id=$1 and perfil_profissional_id=$2 returning id", [b.id, perfil.id, ...campos]);
      if (!r.length) falha("Serviço não encontrado.", 404);
    } else await q("insert into servico (id, perfil_profissional_id, titulo, categoria_id, preco_inicial, descricao, localizacao, ativo) values ($1,$2,$3,$4,$5,$6,$7,$8)", [novoId("S"), perfil.id, ...campos]);
  },
  async "servico.ativar"(eu, b, perfil) {
    exigirPerfil(perfil);
    if (b.ativo && !perfilMinimo(perfil)) falha("Complete os dados profissionais antes de ativar serviços (RN02).");
    await q("update servico set ativo=$3 where id=$1 and perfil_profissional_id=$2", [b.id, perfil.id, !!b.ativo]);
  },
  async "servico.remover"(eu, b, perfil) { exigirPerfil(perfil); await q("delete from servico where id=$1 and perfil_profissional_id=$2", [b.id, perfil.id]); },
  async "portfolio.salvar"(eu, b, perfil) {
    exigirPerfil(perfil);
    if (!texto(b.titulo)) falha("Informe o título.");
    const arquivo = b.arquivo ? String(b.arquivo) : null;
    if (arquivo && (!arquivo.startsWith("data:image/") || arquivo.length > 2.2e6)) falha("Imagem inválida ou acima de 1,5 MB.");
    if (b.id) {
      const r = await q("update portfolio set titulo=$3, descricao=$4, arquivo=coalesce($5, arquivo) where id=$1 and perfil_profissional_id=$2 returning id", [b.id, perfil.id, texto(b.titulo, 50), texto(b.descricao, 500), arquivo]);
      if (!r.length) falha("Item não encontrado.", 404);
    } else {
      const [{ n }] = await q("select count(*)::int as n from portfolio where perfil_profissional_id=$1", [perfil.id]);
      await q("insert into portfolio (id, perfil_profissional_id, titulo, descricao, arquivo, ordem) values ($1,$2,$3,$4,$5,$6)", [novoId("PF"), perfil.id, texto(b.titulo, 50), texto(b.descricao, 500), arquivo || "", n + 1]);
    }
  },
  async "portfolio.remover"(eu, b, perfil) { exigirPerfil(perfil); await q("delete from portfolio where id=$1 and perfil_profissional_id=$2", [b.id, perfil.id]); },

  async "demanda.salvar"(eu, b) {
    exigirPapel(eu, "contratante");
    const orc = numero(b.orcamento);
    if (!texto(b.titulo) || !opcaoValida("categoria", b.categoria_id) || texto(b.descricao).length < 20 || !(orc > 0) || !texto(b.localizacao)) falha("Preencha título, categoria, descrição (mín. 20), orçamento e localização.");
    if (b.prazo && !/^\d{4}-\d{2}-\d{2}$/.test(b.prazo)) falha("Prazo inválido.");
    const anexos = JSON.stringify((Array.isArray(b.anexos) ? b.anexos : []).slice(0, 10).map(a => texto(a, 120)));
    const campos = [texto(b.titulo, 80), b.categoria_id, texto(b.descricao, 3000), orc, texto(b.localizacao, 120), texto(b.cep, 9), b.prazo || ""];
    if (b.id) {
      const r = await q(`update demanda set titulo=$3, categoria_id=$4, descricao=$5, orcamento=$6, localizacao=$7, cep=$8, prazo=$9, anexos = case when $10 = '[]' then anexos else $10 end
        where id=$1 and contratante_id=$2 and status='aberta' returning id`, [b.id, eu.id, ...campos, anexos]);
      if (!r.length) falha("Somente demandas abertas podem ser editadas.", 409);
      return { id: b.id };
    }
    const id = novoId("D");
    await q("insert into demanda (id, contratante_id, titulo, categoria_id, descricao, orcamento, localizacao, cep, prazo, status, anexos, criado_em) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'aberta',$10,$11)", [id, eu.id, ...campos, anexos, agora()]);
    return { id };
  },
  async "demanda.cancelar"(eu, b) {
    const r = await q("update demanda set status='cancelada' where id=$1 and contratante_id=$2 and status='aberta' returning titulo", [b.id, eu.id]);
    if (!r.length) falha("A demanda não está mais aberta.", 409);
    const recusadas = await q("update proposta set status='recusada' where demanda_id=$1 and status in ('enviada','visualizada') returning perfil_profissional_id", [b.id]);
    for (const x of recusadas) await notificar((await um("select usuario_id from perfil_profissional where id=$1", [x.perfil_profissional_id])).usuario_id, "mudanca_status", `A demanda "${r[0].titulo}" foi cancelada pelo contratante.`, "#/propostas", eu.id);
  },
  async "demanda.visualizar"(eu, b) {
    const d = await um("select titulo from demanda where id=$1 and contratante_id=$2", [b.id, eu.id]);
    if (!d) return { semMudanca: true };
    const vistas = await q("update proposta set status='visualizada' where demanda_id=$1 and status='enviada' returning perfil_profissional_id", [b.id]);
    if (!vistas.length) return { semMudanca: true };
    for (const x of vistas) await notificar((await um("select usuario_id from perfil_profissional where id=$1", [x.perfil_profissional_id])).usuario_id, "mudanca_status", `Sua proposta para "${d.titulo}" foi visualizada.`, "#/propostas", eu.id);
  },

  async "proposta.enviar"(eu, b, perfil) {
    exigirPerfil(perfil);
    if (!perfilMinimo(perfil)) falha("Complete o perfil para enviar propostas (RN02).");
    const d = await um("select id, titulo, contratante_id, status from demanda where id=$1", [b.demanda_id]);
    if (!d || d.status !== "aberta") falha("A demanda não está mais aberta para propostas.", 409);
    const valor = numero(b.valor), prazo = Math.round(numero(b.prazo));
    if (!(valor > 0) || !(prazo >= 1) || texto(b.mensagem).length < 10) falha("Informe valor, prazo (dias) e uma mensagem de ao menos 10 caracteres.");
    if (await um("select id from proposta where demanda_id=$1 and perfil_profissional_id=$2 and status <> 'cancelada'", [d.id, perfil.id])) falha("Você já enviou proposta para esta demanda.", 409);
    await q("insert into proposta (id, demanda_id, perfil_profissional_id, valor, prazo, mensagem, status, criado_em) values ($1,$2,$3,$4,$5,$6,'enviada',$7)", [novoId("R"), d.id, perfil.id, valor, prazo, texto(b.mensagem, 1500), agora()]);
    await notificar(d.contratante_id, "proposta", `Nova proposta recebida em "${d.titulo}".`, "#/demandas/" + d.id, eu.id);
  },
  async "proposta.cancelar"(eu, b, perfil) {
    exigirPerfil(perfil);
    const r = await q("update proposta set status='cancelada' where id=$1 and perfil_profissional_id=$2 and status in ('enviada','visualizada') returning id", [b.id, perfil.id]);
    if (!r.length) falha("A proposta não pode mais ser cancelada.", 409);
  },
  async "proposta.recusar"(eu, b) {
    const r = await q(`update proposta r set status='recusada' from demanda d where r.id=$1 and d.id=r.demanda_id and d.contratante_id=$2 and d.status='aberta' and r.status in ('enviada','visualizada')
      returning r.perfil_profissional_id, d.titulo`, [b.id, eu.id]);
    if (!r.length) falha("Esta proposta não pode mais ser recusada.", 409);
    await notificar((await um("select usuario_id from perfil_profissional where id=$1", [r[0].perfil_profissional_id])).usuario_id, "proposta", `Sua proposta para "${r[0].titulo}" foi recusada.`, "#/propostas", eu.id);
  },
  /* RN05 + RNF15: a primeira aceitação "reserva" a demanda (aberta -> contratada); uma segunda tentativa simultânea não encontra a demanda aberta. */
  async "proposta.aceitar"(eu, b) {
    const r = await um("select * from proposta where id=$1", [b.id]);
    if (!r) falha("Proposta não encontrada.", 404);
    if (!["enviada", "visualizada"].includes(r.status)) falha("Esta proposta não está mais disponível.", 409);
    const d = await q("update demanda set status='contratada' where id=$1 and contratante_id=$2 and status='aberta' returning id, titulo", [r.demanda_id, eu.id]);
    if (!d.length) falha("A demanda já foi contratada ou cancelada.", 409);
    await q("update proposta set status='aceita' where id=$1", [r.id]);
    const outras = await q("update proposta set status='recusada' where demanda_id=$1 and id<>$2 and status in ('enviada','visualizada') returning perfil_profissional_id", [r.demanda_id, r.id]);
    const cid = novoId("C"), t = agora();
    await q("insert into contratacao (id, proposta_id, contratante_id, perfil_profissional_id, valor_combinado, status) values ($1,$2,$3,$4,$5,'aguardando_inicio')", [cid, r.id, eu.id, r.perfil_profissional_id, r.valor]);
    await q("insert into historico_status (id, contratacao_id, status, autor_id, data) values ($1,$2,'aguardando_inicio',$3,$4)", [novoId("HS"), cid, eu.id, t]);
    await q("insert into conversa (id, contratacao_id, ultima_atividade) values ($1,$2,$3)", [novoId("V"), cid, t]);
    const profUid = (await um("select usuario_id from perfil_profissional where id=$1", [r.perfil_profissional_id])).usuario_id;
    await notificar(profUid, "proposta", `Sua proposta para "${d[0].titulo}" foi aceita.`, "#/contratacoes/" + cid, eu.id);
    for (const x of outras) await notificar((await um("select usuario_id from perfil_profissional where id=$1", [x.perfil_profissional_id])).usuario_id, "proposta", `A demanda "${d[0].titulo}" foi contratada com outro profissional.`, "#/propostas", eu.id);
    return { id: cid };
  },

  /* RN06: transições permitidas e quem pode executá-las */
  async "contratacao.status"(eu, b) {
    const c = await contratacaoDoUsuario(eu, b.id);
    const souProf = c.prof_uid === eu.id;
    const regra = { em_andamento: ["aguardando_inicio", souProf], entregue: ["em_andamento", souProf], concluida: ["entregue", !souProf], cancelada: [null, true] }[b.para];
    if (!regra) falha("Status inválido.");
    const [de, pode] = regra;
    const origens = b.para === "cancelada" ? ["aguardando_inicio", "em_andamento"] : [de];
    if (!pode || !origens.includes(c.status)) falha("Esta mudança de status não é permitida agora.", 409);
    let set = "status=$2";
    const params = [c.id, b.para, c.status];
    if (b.para === "em_andamento") { set += ", data_inicio=$4"; params.push(hoje()); }
    if (b.para === "concluida") { set += ", data_conclusao=$4"; params.push(hoje()); }
    const r = await q(`update contratacao set ${set} where id=$1 and status=$3 returning id`, params);
    if (!r.length) falha("O status mudou enquanto você decidia. Atualize a página.", 409);
    await q("insert into historico_status (id, contratacao_id, status, autor_id, data) values ($1,$2,$3,$4,$5)", [novoId("HS"), c.id, b.para, eu.id, agora()]);
    await notificar(souProf ? c.contratante_id : c.prof_uid, "mudanca_status", `"${c.titulo}" mudou para ${nomeOpcao("status_contratacao", b.para)}.`, "#/contratacoes/" + c.id, eu.id);
  },
  async "mensagem.enviar"(eu, b) {
    const c = await contratacaoDoUsuario(eu, b.contratacao_id);
    if (c.status === "cancelada") falha("A conversa desta contratação foi encerrada.", 409);
    const txt = texto(b.texto, 1000);
    if (!txt) falha("Digite uma mensagem.");
    let v = await um("select id from conversa where contratacao_id=$1", [c.id]);
    if (!v) { v = { id: novoId("V") }; await q("insert into conversa (id, contratacao_id, ultima_atividade) values ($1,$2,$3)", [v.id, c.id, agora()]); }
    const t = agora();
    await q("insert into mensagem (id, conversa_id, remetente_id, texto, anexo, data, lida) values ($1,$2,$3,$4,'',$5,false)", [novoId("M"), v.id, eu.id, txt, t]);
    await q("update conversa set ultima_atividade=$2 where id=$1", [v.id, t]);
    // uma notificação por conversa não lida, para não lotar o sino
    const destino = c.prof_uid === eu.id ? c.contratante_id : c.prof_uid;
    const link = "#/contratacoes/" + c.id;
    const pendente = await um("select id from notificacao where destinatario_id=$1 and tipo='mensagem' and link=$2 and lida=false", [destino, link]);
    if (pendente) await q("update notificacao set texto=$2, data=$3 where id=$1", [pendente.id, `${eu.nome} enviou mensagens em "${c.titulo}".`, t]);
    else await notificar(destino, "mensagem", `${eu.nome} enviou uma mensagem em "${c.titulo}".`, link, eu.id);
  },
  async "mensagem.lidas"(eu, b) {
    const c = await contratacaoDoUsuario(eu, b.contratacao_id);
    const r = await q("update mensagem m set lida=true from conversa v where v.id=m.conversa_id and v.contratacao_id=$1 and m.remetente_id<>$2 and m.lida=false returning m.id", [c.id, eu.id]);
    await q("update notificacao set lida=true where destinatario_id=$1 and tipo='mensagem' and link=$2 and lida=false", [eu.id, "#/contratacoes/" + c.id]);
    if (!r.length) return { semMudanca: true };
  },
  /* RN07: só após a conclusão e uma vez por parte (unique no banco) */
  async "avaliacao.criar"(eu, b) {
    const c = await contratacaoDoUsuario(eu, b.contratacao_id);
    if (c.status !== "concluida") falha("A avaliação só é liberada após a conclusão.", 409);
    const nota = Math.round(numero(b.nota));
    if (!(nota >= 1 && nota <= 5)) falha("Escolha uma nota de 1 a 5.");
    const avaliado = c.prof_uid === eu.id ? c.contratante_id : c.prof_uid;
    try {
      await q("insert into avaliacao (id, contratacao_id, autor_id, avaliado_id, nota, comentario, criado_em) values ($1,$2,$3,$4,$5,$6,$7)", [novoId("A"), c.id, eu.id, avaliado, nota, texto(b.comentario, 500), agora()]);
    } catch (e) { falha("Você já avaliou esta contratação.", 409); }
    await q("update perfil_profissional set media_avaliacao = coalesce((select round(avg(nota)::numeric, 1)::float8 from avaliacao where avaliado_id=$1), 0) where usuario_id=$1", [avaliado]);
    await notificar(avaliado, "avaliacao", `${eu.nome} avaliou a contratação "${c.titulo}".`, "#/contratacoes/" + c.id, eu.id);
  },
  async "notificacao.lida"(eu, b) { await q("update notificacao set lida=true where id=$1 and destinatario_id=$2", [b.id, eu.id]); },
  async "notificacao.todas"(eu) { await q("update notificacao set lida=true where destinatario_id=$1 and lida=false", [eu.id]); }
};
function exigirPerfil(perfil) { if (!perfil) falha("Área exclusiva para profissionais.", 403); }
function exigirPapel(eu, papel) { if (eu.papel !== papel) falha(papel === "contratante" ? "Área exclusiva para contratantes." : "Área exclusiva para profissionais.", 403); }
async function contratacaoDoUsuario(eu, id) {
  const c = await um(`select c.*, p.usuario_id as prof_uid, d.titulo from contratacao c join perfil_profissional p on p.id=c.perfil_profissional_id
    join proposta r on r.id=c.proposta_id join demanda d on d.id=r.demanda_id where c.id=$1`, [id]);
  if (!c || (c.contratante_id !== eu.id && c.prof_uid !== eu.id)) falha("Acesso restrito aos envolvidos (RN08).", 403);
  return c;
}

/* ---------- roteador (Vercel e servidor local usam o mesmo) ---------- */
async function lerCorpo(req) {
  if (req.body !== undefined && typeof req.body === "object" && req.body !== null) return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return {}; } }
  const partes = [];
  let total = 0;
  for await (const p of req) { total += p.length; if (total > 4e6) falha("Envio muito grande.", 413); partes.push(p); }
  try { return JSON.parse(Buffer.concat(partes).toString() || "{}"); } catch { return {}; }
}
function responder(res, status, obj, cookie) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (cookie) res.setHeader("Set-Cookie", cookie);
  res.end(JSON.stringify(obj));
}

export async function tratar(req, res) {
  try {
    const url = new URL(req.url, "http://x");
    const rota = (url.searchParams.get("rota") || url.pathname.replace(/^\/api\/?/, "")).replace(/\/+$/, "");
    const metodo = req.method;
    if (metodo === "GET" && rota === "estado") {
      const eu = await usuarioDaSessao(req);
      const cliente = Number(url.searchParams.get("versao") || 0);
      const [v] = await q("select valor from meta where chave = 'versao'");
      if (cliente && Number(v.valor) === cliente && url.searchParams.get("uid") === (eu ? eu.id : "")) return responder(res, 200, { versao: cliente, mudou: false });
      return responder(res, 200, { ...(await estado(eu)), mudou: true });
    }
    if (metodo === "GET" && rota === "cep") return responder(res, 200, await consultarCep(url.searchParams.get("cep")));
    if (metodo !== "POST") falha("Rota não encontrada.", 404);
    const b = await lerCorpo(req);
    if (rota === "cadastro") { const r = await cadastrar(req, b); return responder(res, 200, { ok: true }, r._cookie); }
    if (rota === "login") { const r = await entrar(req, b); return responder(res, 200, { ok: true }, r._cookie); }
    if (rota === "sair") return responder(res, 200, { ok: true }, cookieSessao(req, "", 0));
    if (rota === "recuperar") return responder(res, 200, { ok: true });
    if (rota.startsWith("acao/")) {
      const nome = rota.slice(5);
      if (!ACOES[nome]) falha("Ação desconhecida.", 404);
      const eu = await usuarioDaSessao(req);
      if (!eu) falha("Sua sessão expirou. Entre novamente.", 401);
      const perfil = eu.papel === "profissional" ? await perfilDe(eu.id) : null;
      const r = (await ACOES[nome](eu, b, perfil)) || {};
      if (!r.semMudanca) await subirVersao();
      return responder(res, 200, { ok: true, ...r });
    }
    falha("Rota não encontrada.", 404);
  } catch (e) {
    if (e instanceof ErroApi) return responder(res, e.status, { erro: e.message });
    console.error(e);
    return responder(res, 500, { erro: "Erro no servidor. Tente de novo em instantes." });
  }
}
