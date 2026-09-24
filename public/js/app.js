/* =========================================================
   Trabalink — telas (WF-01 a WF-08) e workflows
   Cada função tela*() equivale a uma página do Bubble; os
   atributos data-bb dão o nome do Group correspondente.
   Cada função wf*() equivale a um workflow do editor; aqui elas
   chamam a API (lib/app.js), que valida as regras no servidor.
   ========================================================= */

/* ---------- Navegação ----------
   Rota interna (#/pagina/id). Tenta refletir na barra de endereço para o
   botão voltar funcionar; se o navegador não permitir, segue só em memória. */
const Nav = {
  rota: (() => { try { return location.hash.startsWith("#/") ? location.hash : "#/"; } catch (e) { return "#/"; } })(),
  atual() { return this.rota; },
  caminho() { return this.rota.slice(2).split("?")[0]; },
  ir(h) {
    this.rota = h;
    try { history.pushState(null, "", h); } catch (e) { /* ambiente sem histórico */ }
    render();
    // mostra a tela na hora e confere no servidor se há algo mais novo
    if (Sync.carregado) Sync.recarregar().then(mudou => { if (mudou) atualizarSeOcioso(); }).catch(() => {});
  }
};
function sincronizarRota() { try { const h = location.hash.startsWith("#/") ? location.hash : "#/"; if (h !== Nav.rota) { Nav.rota = h; render(); } } catch (e) { } }

/* ---------- Utilidades ---------- */
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const brl = v => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: Number(v) % 1 ? 2 : 0 });
const dataBR = d => d ? new Date(d.length <= 10 ? d + "T12:00:00" : d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }) : "";
const dataHora = d => d ? new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
const agora = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19); }; // horário local
const iniciais = nome => (nome || "?").split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();
const opcao = (set, id) => (OPTION_SETS[set].find(o => o.id === id) || { nome: id || "—" }).nome;
const opcoesSelect = (set, selecionado, vazio) =>
  (vazio ? `<option value="">${esc(vazio)}</option>` : "") +
  OPTION_SETS[set].map(o => `<option value="${o.id}" ${o.id === selecionado ? "selected" : ""}>${esc(o.nome)}</option>`).join("");
function tempoRelativo(d) {
  const dias = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  return dataBR(d);
}

const CLASSE_STATUS = {
  aberta: "st-info", contratada: "st-ok", cancelada: "st-erro",
  enviada: "st-neutro", visualizada: "st-aviso", aceita: "st-ok", recusada: "st-erro",
  aguardando_inicio: "st-neutro", em_andamento: "st-info", entregue: "st-aviso", concluida: "st-ok"
};
const selo = (set, id) => `<span class="status ${CLASSE_STATUS[id] || "st-neutro"}">${esc(opcao(set, id))}</span>`;
const estrelas = n => { const c = Math.round(n || 0); return `<span class="estrelas" aria-hidden="true">${"★".repeat(c)}${"☆".repeat(5 - c)}</span>`; };

function avatar(usuario, classe = "") {
  const conteudo = usuario && usuario.foto ? `<img src="${esc(usuario.foto)}" alt="">` : esc(iniciais(usuario && usuario.nome));
  return `<div class="avatar ${classe}" aria-hidden="true">${conteudo}</div>`;
}
function vazio(icone, titulo, texto, acao = "") {
  return `<div class="vazio"><div class="icone" aria-hidden="true">${icone}</div><h3>${esc(titulo)}</h3><p>${esc(texto)}</p>${acao ? `<div style="margin-top:16px">${acao}</div>` : ""}</div>`;
}

/* ---------- Consultas (equivalem a "Do a search for") ---------- */
const Q = {
  perfilDoUsuario: uid => DB.filtrar("perfil_profissional", p => p.usuario_id === uid)[0] || null,
  usuarioDoPerfil: pid => { const p = DB.obter("perfil_profissional", pid); return p ? DB.obter("usuario", p.usuario_id) : null; },
  servicosAtivos: pid => DB.filtrar("servico", s => s.perfil_profissional_id === pid && s.ativo),
  habilidades: pid => DB.filtrar("profissional_habilidade", ph => ph.perfil_profissional_id === pid).map(ph => DB.obter("habilidade", ph.habilidade_id)).filter(Boolean),
  avaliacoesRecebidas: uid => DB.filtrar("avaliacao", a => a.avaliado_id === uid).sort((a, b) => b.criado_em.localeCompare(a.criado_em)),
  propostasDaDemanda: did => DB.filtrar("proposta", r => r.demanda_id === did),
  conversaDa: cid => DB.filtrar("conversa", v => v.contratacao_id === cid)[0],
  demandaDaContratacao: c => { const r = DB.obter("proposta", c.proposta_id); return r ? DB.obter("demanda", r.demanda_id) : null; },
  contratacoesDo: u => {
    if (!u) return [];
    const perfil = Q.perfilDoUsuario(u.id);
    return DB.filtrar("contratacao", c => c.contratante_id === u.id || (perfil && c.perfil_profissional_id === perfil.id))
      .sort((a, b) => ordemStatus(a.status) - ordemStatus(b.status));
  },
  notificacoesDo: uid => DB.filtrar("notificacao", n => n.destinatario_id === uid).sort((a, b) => b.data.localeCompare(a.data)),
  oportunidades: perfil => {
    const categorias = new Set([perfil.categoria_id, ...DB.filtrar("servico", s => s.perfil_profissional_id === perfil.id && s.ativo).map(s => s.categoria_id)]);
    const jaPropostas = new Set(DB.filtrar("proposta", r => r.perfil_profissional_id === perfil.id && r.status !== "cancelada").map(r => r.demanda_id));
    return DB.filtrar("demanda", d => d.status === "aberta" && categorias.has(d.categoria_id) && !jaPropostas.has(d.id))
      .sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  }
};
function ordemStatus(s) { return ["em_andamento", "entregue", "aguardando_inicio", "concluida", "cancelada"].indexOf(s); }

/* RN02: perfil mínimo para publicar serviço ou enviar proposta. */
function perfilMinimo(perfil) {
  return !!(perfil && perfil.titulo && perfil.biografia && perfil.biografia.length >= 20 && perfil.localizacao && perfil.categoria_id);
}
function completudePerfil(perfil) {
  if (!perfil) return 0;
  const itens = [perfil.titulo, perfil.biografia, perfil.localizacao, perfil.categoria_id, perfil.area_atendimento, perfil.disponibilidade, perfil.faixa_preco,
    Q.habilidades(perfil.id).length, Q.servicosAtivos(perfil.id).length, DB.filtrar("portfolio", i => i.perfil_profissional_id === perfil.id).length];
  return Math.round(itens.filter(Boolean).length / itens.length * 100);
}


/* ---------- Toast, modal ---------- */
function toast(texto, tipo = "") {
  const el = document.createElement("div");
  el.className = `toast ${tipo}`;
  el.setAttribute("role", "status");
  el.textContent = texto;
  const caixa = $("#toasts");
  while (caixa.children.length >= 2) caixa.firstChild.remove();
  caixa.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
function abrirModal(titulo, corpo) {
  fecharModal();
  const fundo = document.createElement("div");
  fundo.className = "modal-fundo";
  fundo.id = "modal";
  fundo.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo" data-bb="Popup ${esc(titulo)}">
    <div class="modal-topo"><h2 id="modal-titulo">${esc(titulo)}</h2><button class="icone-btn" data-act="fechar-modal" aria-label="Fechar">✕</button></div>${corpo}</div>`;
  fundo.addEventListener("mousedown", e => { if (e.target === fundo) fecharModal(); });
  document.body.appendChild(fundo);
  const foco = fundo.querySelector("input, select, textarea, button:not([data-act=fechar-modal])");
  if (foco) foco.focus();
}
function fecharModal() { const m = $("#modal"); if (m) m.remove(); }

/* ---------- Validação de formulário ---------- */
function validar(form) {
  let ok = true;
  form.querySelectorAll("[data-obrigatorio]").forEach(campo => {
    const input = campo.querySelector("input, select, textarea");
    let valido = input.type === "checkbox" ? input.checked : input.value.trim() !== "";
    if (valido && input.dataset.min) valido = Number(input.value) >= Number(input.dataset.min);
    if (valido && input.type === "email") valido = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.value);
    if (valido && input.dataset.minlen) valido = input.value.trim().length >= Number(input.dataset.minlen);
    campo.classList.toggle("invalido", !valido);
    if (!valido) ok = false;
  });
  const primeiro = form.querySelector(".invalido input, .invalido select, .invalido textarea");
  if (primeiro) primeiro.focus();
  return ok;
}
const campo = (rotulo, controle, { obrigatorio = false, erro = "Preencha este campo.", ajuda = "", classe = "" } = {}) =>
  `<div class="campo ${classe}" ${obrigatorio ? "data-obrigatorio" : ""}>${rotulo ? `<label>${esc(rotulo)}</label>` : ""}${controle}${ajuda ? `<span class="ajuda">${esc(ajuda)}</span>` : ""}<span class="erro-msg">${esc(erro)}</span></div>`;
/* CEP com preenchimento automático pelo ViaCEP. formato: "bairro" (Bairro, Cidade - UF) ou "cidade" (Cidade - UF) */
function campoCep(valor, formato = "cidade", alvo = "localizacao") {
  return campo("CEP", `<input class="input" name="cep" inputmode="numeric" autocomplete="postal-code" maxlength="9" placeholder="00000-000" value="${esc(valor || "")}" data-cep="${formato}" data-cep-alvo="${alvo}">`,
    { ajuda: "Preenche a localização automaticamente (ViaCEP).", erro: "CEP não encontrado." });
}
const formatarCep = v => { const d = String(v).replace(/\D/g, "").slice(0, 8); return d.length > 5 ? d.slice(0, 5) + "-" + d.slice(5) : d; };
async function aoDigitarCep(input) {
  input.value = formatarCep(input.value);
  const bloco = input.closest(".campo");
  const ajuda = bloco.querySelector(".ajuda");
  bloco.classList.remove("invalido");
  if (input.value.replace(/\D/g, "").length !== 8) return;
  ajuda.textContent = "Consultando CEP…";
  try {
    const r = await consultarCep(input.value);
    const alvo = input.form && input.form.querySelector(`[name="${input.dataset.cepAlvo}"]`);
    const local = input.dataset.cep === "bairro" && r.bairro ? `${r.bairro}, ${r.cidade} - ${r.uf}` : `${r.cidade} - ${r.uf}`;
    if (alvo) { alvo.value = local; alvo.closest(".campo")?.classList.remove("invalido"); }
    ajuda.textContent = `✓ ${r.logradouro ? r.logradouro + ", " : ""}${local}`;
  } catch (e) {
    bloco.querySelector(".erro-msg").textContent = e.message;
    bloco.classList.add("invalido");
    ajuda.textContent = "Preenche a localização automaticamente (ViaCEP).";
  }
}
function lerForm(form) { return Object.fromEntries(new FormData(form).entries()); }
function lerArquivo(input) {
  return new Promise(resolve => {
    const f = input && input.files && input.files[0];
    if (!f) return resolve("");
    if (f.size > 1.5 * 1024 * 1024) { toast("Imagem acima de 1,5 MB. Escolha um arquivo menor.", "erro"); return resolve(null); }
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.readAsDataURL(f);
  });
}

/* =========================================================
   Header (Reusable element)
   ========================================================= */
let painelAberto = null; // "notif" | "conta" | null
function renderHeader(rotaAtual) {
  const u = Sessao.usuario();
  const links = !u
    ? [["#/", "Encontrar profissionais"], ["#/demandas", "Demandas"], ["#/contratacoes", "Contratações"]]
    : u.papel === "contratante"
      ? [["#/", "Encontrar profissionais"], ["#/demandas", "Demandas"], ["#/contratacoes", "Contratações"]]
      : [["#/painel", "Painel"], ["#/oportunidades", "Oportunidades"], ["#/propostas", "Propostas"], ["#/contratacoes", "Contratações"], ["#/perfil-profissional", "Perfil profissional"]];
  const ativo = href => {
    const base = href.slice(2).split("/")[0];
    const atual = rotaAtual.split("/")[0];
    if (base === "") return atual === "" || atual === "perfil";
    return base === atual;
  };
  const naoLidas = u ? Q.notificacoesDo(u.id).filter(n => !n.lida).length : 0;
  $("#header").innerHTML = `
  <div class="header-in" data-bb="Group Header (Row)">
    <button class="icone-btn menu-mobile" data-act="menu" aria-label="Abrir menu" aria-expanded="false">☰</button>
    <a href="${u && u.papel === "profissional" ? "#/painel" : "#/"}" class="logo"><span class="logo-mark">T</span>Trabalink</a>
    <nav class="nav" id="nav" aria-label="Principal">${links.map(([h, t]) => `<a href="${h}" class="${ativo(h) ? "ativo" : ""}">${t}</a>`).join("")}${!u ? `<a href="#/entrar" class="so-mobile">Entrar</a>` : ""}</nav>
    <div class="header-acoes">
      ${!u ? `
        <a href="#/entrar" class="btn btn-suave btn-sm so-desktop">Entrar</a>
        <a href="#/entrar/cadastro" class="btn btn-primario btn-sm">Cadastrar</a>` : `
        <button class="icone-btn" data-act="painel-notif" aria-label="Notificações${naoLidas ? `, ${naoLidas} não lidas` : ""}" aria-expanded="${painelAberto === "notif"}">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          ${naoLidas ? `<span class="badge">${naoLidas}</span>` : ""}
        </button>
        <button class="usuario-chip" data-act="painel-conta" aria-expanded="${painelAberto === "conta"}" aria-label="Menu da conta">
          ${avatar(u, "avatar-sm")}
          <span class="texto"><span class="nome">${esc(u.nome)}</span><span class="papel">${esc(opcao("papel_usuario", u.papel))}</span></span>
        </button>`}
    </div>
    ${u && painelAberto === "notif" ? renderNotificacoes(u) : ""}
    ${u && painelAberto === "conta" ? `
      <div class="dropdown menu-conta" data-bb="Group Menu conta">
        ${u.papel === "profissional" ? `<a href="#/perfil/${Q.perfilDoUsuario(u.id)?.id}">Ver meu perfil público</a><a href="#/perfil-profissional">Gerenciar perfil profissional</a>` : `<a href="#/demandas">Minhas demandas</a>`}
        <a href="#/conta">Dados da conta</a>
        <button data-act="sair">Sair</button>
      </div>` : ""}
  </div>`;
}
function renderNotificacoes(u) {
  const lista = Q.notificacoesDo(u.id);
  return `<div class="dropdown" data-bb="Group Notificações (CMP-10)">
    <div class="dropdown-topo"><h3>Notificações</h3>${lista.some(n => !n.lida) ? `<button class="btn-texto btn" data-act="notif-todas">Marcar todas como lidas</button>` : ""}</div>
    <div class="dropdown-lista">${lista.length ? lista.map(n => `
      <button class="notif ${n.lida ? "lida" : "nao-lida"}" data-act="abrir-notif" data-id="${n.id}">
        <span class="ponto"></span>
        <span><span>${esc(n.texto)}</span><small>${esc(opcao("tipo_notificacao", n.tipo))} · ${dataHora(n.data)}</small></span>
      </button>`).join("") : vazio("🔔", "Nada por aqui", "Avisos de propostas, mensagens e status aparecem aqui.")}
    </div></div>`;
}

/* =========================================================
   WF-01 Busca e descoberta  (RF07, RF08)
   ========================================================= */
const filtrosBusca = { termo: "", local: "", categoria: "", preco: "", nota: "", disponibilidade: "", ordem: "relevancia" };
const filtrosAtivos = () => ["categoria", "preco", "nota", "disponibilidade"].filter(k => filtrosBusca[k]).length;
function telaBusca() {
  const f = filtrosBusca;
  const termo = f.termo.trim().toLowerCase();
  const local = f.local.trim().toLowerCase();
  let perfis = DB.todos("perfil_profissional").map(p => {
    const u = DB.obter("usuario", p.usuario_id);
    const servicos = Q.servicosAtivos(p.id);
    const habs = Q.habilidades(p.id);
    const precoMin = servicos.length ? Math.min(...servicos.map(s => s.preco_inicial)) : p.faixa_preco;
    return { p, u, servicos, habs, precoMin, total: Q.avaliacoesRecebidas(p.usuario_id).length };
  }).filter(x => x.u && x.u.status === "ativo" && perfilMinimo(x.p));

  perfis = perfis.filter(({ p, u, servicos, habs, precoMin }) => {
    if (termo) {
      const alvo = [u.nome, p.titulo, p.biografia, opcao("categoria", p.categoria_id), ...servicos.map(s => s.titulo), ...habs.map(h => h.nome)].join(" ").toLowerCase();
      if (!termo.split(/\s+/).every(t => alvo.includes(t))) return false;
    }
    if (local && !p.localizacao.toLowerCase().includes(local)) return false;
    if (f.categoria && p.categoria_id !== f.categoria && !servicos.some(s => s.categoria_id === f.categoria)) return false;
    if (f.preco) { const [min, max] = f.preco.split("-").map(Number); if (precoMin < min || (max && precoMin > max)) return false; }
    if (f.nota && p.media_avaliacao < Number(f.nota)) return false;
    if (f.disponibilidade && p.disponibilidade !== f.disponibilidade) return false;
    return true;
  });
  if (f.ordem === "nota") perfis.sort((a, b) => b.p.media_avaliacao - a.p.media_avaliacao);
  else if (f.ordem === "preco") perfis.sort((a, b) => a.precoMin - b.precoMin);
  else perfis.sort((a, b) => (b.p.media_avaliacao * 10 + b.total) - (a.p.media_avaliacao * 10 + a.total));

  const filtroSelect = (nome, rotulo, opcoes) => campo(rotulo, `<select class="select" name="${nome}" data-filtro>${opcoes}</select>`);
  const sel = (nome, pares) => pares.map(([v, t]) => `<option value="${v}" ${f[nome] === v ? "selected" : ""}>${t}</option>`).join("");

  return `
  <main class="pagina" data-bb="Page index">
    <section class="busca-hero" data-bb="Group Busca (Column)">
      <h1>Encontre o profissional certo para o seu serviço</h1>
      <form class="busca-barra" data-form="busca" role="search">
        <label class="sr-only" for="b-termo">Serviço</label>
        <input id="b-termo" class="input" name="termo" placeholder="Qual serviço você procura?" value="${esc(f.termo)}">
        <label class="sr-only" for="b-local">Cidade ou região</label>
        <input id="b-local" class="input" name="local" placeholder="Cidade ou região" value="${esc(f.local)}">
        <button class="btn btn-primario" type="submit">Buscar</button>
      </form>
    </section>
    <div class="grid-lateral" style="margin-top:36px">
      <aside data-bb="Group Filtros (Column)">
        <details class="filtros-det" ${window.innerWidth > 900 || filtrosAtivos() ? "open" : ""}>
        <summary><h2>Filtros${filtrosAtivos() ? ` <span class="contador">${filtrosAtivos()} ativo${filtrosAtivos() > 1 ? "s" : ""}</span>` : ""}</h2></summary>
        <div class="cartao filtros">
          ${filtroSelect("categoria", "Categoria", opcoesSelect("categoria", f.categoria, "Todas"))}
          ${filtroSelect("preco", "Faixa de preço", sel("preco", [["", "Qualquer valor"], ["0-100", "Até R$ 100"], ["100-250", "R$ 100 a R$ 250"], ["250-500", "R$ 250 a R$ 500"], ["500-0", "Acima de R$ 500"]]))}
          ${filtroSelect("nota", "Avaliação mínima", sel("nota", [["", "Qualquer nota"], ["4.5", "4,5 estrelas"], ["4", "4 estrelas"], ["3", "3 estrelas"]]))}
          ${filtroSelect("disponibilidade", "Disponibilidade", opcoesSelect("disponibilidade", f.disponibilidade, "Qualquer dia"))}
          <button class="btn btn-texto" data-act="limpar-filtros" style="margin-top:12px">Limpar filtros</button>
        </div></details>
      </aside>
      <section data-bb="Group Resultados (Column)">
        <div class="linha entre" style="margin-bottom:14px">
          <h2>Profissionais encontrados<span class="contador">${perfis.length} ${perfis.length === 1 ? "resultado" : "resultados"}</span></h2>
          <label class="linha pequeno suave">Ordenar por
            <select class="select" style="width:auto;min-height:38px" name="ordem" data-filtro>${sel("ordem", [["relevancia", "Relevância"], ["nota", "Melhor avaliação"], ["preco", "Menor preço"]])}</select>
          </label>
        </div>
        <div class="pilha" data-bb="RepeatingGroup Perfil Profissional">
          ${perfis.length ? perfis.map(({ p, u, precoMin, total }) => `
            <article class="resultado" data-bb="Group Cartão profissional">
              ${avatar(u, "")}
              <div>
                <h3>${esc(u.nome)}</h3>
                <p class="suave">${esc(p.titulo)}</p>
                <p class="suave pequeno">${esc(p.localizacao)} · ${esc(opcao("disponibilidade", p.disponibilidade))}</p>
              </div>
              <div class="preco">
                <p class="nota">${total ? `${p.media_avaliacao.toLocaleString("pt-BR")} ${estrelas(p.media_avaliacao)} <span class="pequeno">${total} ${total === 1 ? "avaliação" : "avaliações"}</span>` : `<span class="suave pequeno">Sem avaliações</span>`}</p>
                <p>A partir de ${brl(precoMin)}</p>
              </div>
              <div class="acao"><a class="btn btn-contorno" href="#/perfil/${p.id}">Ver perfil</a></div>
            </article>`).join("")
            : `<div class="cartao">${vazio("🔍", "Nenhum profissional encontrado", "Tente outro termo ou remova alguns filtros.", `<button class="btn btn-contorno" data-act="limpar-filtros">Limpar filtros</button>`)}</div>`}
        </div>
      </section>
    </div>
  </main>`;
}

/* =========================================================
   WF-02 Acesso e cadastro  (RF01, RF02)
   ========================================================= */
const CONTAS_DEMO = [["U01", "carla@trabalink.dev"], ["U02", "joao@trabalink.dev"], ["U06", "bruno@trabalink.dev"], ["U03", "mariana@trabalink.dev"]];
function telaAcesso(modo = "entrar") {
  const destaque = `
    <section class="boas-vindas" data-bb="Group Boas-vindas">
      <h1>Conexões profissionais mais simples e confiáveis</h1>
      <p>Divulgue seus serviços, encontre profissionais e acompanhe cada contratação em um único ambiente.</p>
      <ul><li>Perfis e portfólios organizados</li><li>Propostas registradas</li><li>Avaliações após a conclusão</li></ul>
    </section>`;
  const abas = `<div class="abas" role="tablist">
      <a href="#/entrar" role="tab" aria-selected="${modo === "entrar"}" class="${modo === "entrar" ? "ativo" : ""}">Entrar</a>
      <a href="#/entrar/cadastro" role="tab" aria-selected="${modo === "cadastro"}" class="${modo === "cadastro" ? "ativo" : ""}">Criar conta</a></div>`;
  let corpo;
  if (modo === "cadastro") {
    corpo = `
      <h2>Criar conta no Trabalink</h2>
      <p class="suave" style="margin:6px 0 24px">Escolha como você vai usar a plataforma.</p>
      <form class="form-grid" data-form="cadastro" novalidate data-bb="Group Formulário cadastro">
        <div class="campo" data-obrigatorio><span class="rotulo">Eu quero</span>
          <div class="opcoes-papel">
            <label class="opcao-papel"><input type="radio" name="papel" value="contratante" checked><span><strong>Contratar</strong><small>Publicar demandas e contratar</small></span></label>
            <label class="opcao-papel"><input type="radio" name="papel" value="profissional"><span><strong>Oferecer serviços</strong><small>Divulgar serviços e enviar propostas</small></span></label>
          </div></div>
        ${campo("Nome completo", `<input class="input" name="nome" autocomplete="name">`, { obrigatorio: true })}
        ${campo("E-mail", `<input class="input" type="email" name="email" autocomplete="email" placeholder="nome@email.com">`, { obrigatorio: true, erro: "Informe um e-mail válido." })}
        ${campo("Senha", `<input class="input" type="password" name="senha" autocomplete="new-password" data-minlen="8">`, { obrigatorio: true, erro: "A senha precisa ter ao menos 8 caracteres.", ajuda: "Mínimo de 8 caracteres." })}
        <div class="campo" data-obrigatorio>
          <label class="check"><input type="checkbox" name="termos"> <span>Li e aceito os <a href="#" data-act="termos">termos de uso e a política de privacidade</a>.</span></label>
          <span class="erro-msg">É preciso aceitar os termos para continuar.</span></div>
        <button class="btn btn-primario btn-bloco" type="submit">Criar conta</button>
      </form>`;
  } else if (modo === "recuperar") {
    corpo = `
      <h2>Recuperar senha</h2>
      <p class="suave" style="margin:6px 0 24px">Informe o e-mail cadastrado para receber o link de redefinição.</p>
      <form class="form-grid" data-form="recuperar" novalidate>
        ${campo("E-mail", `<input class="input" type="email" name="email" placeholder="nome@email.com">`, { obrigatorio: true, erro: "Informe um e-mail válido." })}
        <button class="btn btn-primario btn-bloco" type="submit">Enviar link</button>
        <a href="#/entrar" class="btn btn-texto">Voltar para o login</a>
      </form>`;
  } else {
    corpo = `
      <h2>Acessar o Trabalink</h2>
      <p class="suave" style="margin:6px 0 24px">Entre com sua conta ou faça seu cadastro.</p>
      <form class="form-grid" data-form="login" novalidate data-bb="Group Formulário login">
        ${campo("E-mail", `<input class="input" type="email" name="email" autocomplete="email" placeholder="nome@email.com">`, { obrigatorio: true, erro: "Informe um e-mail válido." })}
        ${campo("Senha", `<input class="input" type="password" name="senha" autocomplete="current-password">`, { obrigatorio: true })}
        <div style="text-align:right;margin-top:-10px"><a href="#/entrar/recuperar" class="pequeno">Esqueci minha senha</a></div>
        <button class="btn btn-primario btn-bloco" type="submit">Entrar</button>
      </form>
      <hr class="divisor">
      <p class="pequeno suave" style="margin-bottom:10px">Contas de demonstração (senha <strong>demo1234</strong>):</p>
      <div class="contas-demo">
        ${CONTAS_DEMO.map(([id, email]) => { const u = DB.obter("usuario", id); if (!u) return ""; return `
          <button class="conta-demo" data-act="login-demo" data-email="${email}">${avatar(u, "avatar-sm")}<span><strong>${esc(u.nome)}</strong><br><span class="pequeno suave">${esc(opcao("papel_usuario", u.papel))} · ${esc(email)}</span></span></button>`; }).join("")}
      </div>`;
  }
  return `<main class="pagina" data-bb="Page acesso"><div class="acesso">${destaque}
    <section class="cartao" style="padding:40px" data-bb="Group Acesso (Column)">${modo !== "recuperar" ? abas : ""}${corpo}</section></div></main>`;
}

/* =========================================================
   WF-03 Perfil profissional público  (RF08, RF15)
   ========================================================= */
function telaPerfil(pid) {
  const p = DB.obter("perfil_profissional", pid);
  const u = p && DB.obter("usuario", p.usuario_id);
  if (!p || !u) return telaNaoEncontrada();
  const eu = Sessao.usuario();
  const proprio = eu && eu.id === u.id;
  const servicos = Q.servicosAtivos(p.id);
  const habs = Q.habilidades(p.id);
  const portfolio = DB.filtrar("portfolio", i => i.perfil_profissional_id === p.id).sort((a, b) => a.ordem - b.ordem);
  const avals = Q.avaliacoesRecebidas(u.id);
  const ultima = avals[0];
  const contratacoes = p.total_concluidas || 0;
  let acoes;
  if (proprio) acoes = `<a class="btn btn-primario" href="#/perfil-profissional">Editar perfil</a><a class="btn btn-contorno" href="#/painel">Ir para o painel</a>`;
  else if (eu && eu.papel === "profissional") acoes = `<span class="aviso-box pequeno">Entre como contratante para solicitar este serviço.</span>`;
  else acoes = `<a class="btn btn-primario" href="#/demandas/nova?categoria=${p.categoria_id}&profissional=${p.id}">Solicitar serviço</a>
    <a class="btn btn-contorno" href="#/" >Ver outros profissionais</a>`;

  return `
  <main class="pagina" data-bb="Page perfil (Type of content: Perfil Profissional)">
    <section class="cartao perfil-topo" data-bb="Group Cabeçalho perfil (Row)">
      ${avatar(u, "avatar-lg")}
      <div class="info">
        <h1>${esc(u.nome)}</h1>
        <p class="suave" style="font-size:18px;margin-top:4px">${esc(p.titulo)}</p>
        <div class="meta-linha"><span>${esc(p.localizacao)}</span>${avals.length ? `<span>${p.media_avaliacao.toLocaleString("pt-BR")} ★</span><span>${avals.length} ${avals.length === 1 ? "avaliação" : "avaliações"}</span>` : `<span>Novo na plataforma</span>`}</div>
      </div>
      <div class="acoes">${acoes}</div>
    </section>
    <div class="grid-2" style="margin-top:24px">
      <div class="pilha">
        <section class="cartao" data-bb="Group Sobre e serviços">
          <h2>Sobre o profissional</h2>
          <p style="margin:12px 0 18px">${esc(p.biografia) || `<span class="suave">Este profissional ainda não escreveu a biografia.</span>`}</p>
          ${habs.length ? `<div class="chips">${habs.map(h => `<span class="chip">${esc(h.nome)}</span>`).join("")}</div>` : ""}
          <h2 style="margin:28px 0 14px">Serviços oferecidos</h2>
          <div class="pilha" data-bb="RepeatingGroup Serviço">
            ${servicos.length ? servicos.map(s => `
              <div class="cartao-interno servico-item">
                <div><h3>${esc(s.titulo)}</h3><p class="suave pequeno">${esc(s.descricao)}</p></div>
                <span class="destaque" style="white-space:nowrap">A partir de ${brl(s.preco_inicial)}</span>
              </div>`).join("") : `<p class="suave">Nenhum serviço ativo no momento.</p>`}
          </div>
        </section>
        <section class="cartao" data-bb="Group Portfólio">
          <h2 style="margin-bottom:16px">Portfólio</h2>
          ${portfolio.length ? `<div class="galeria" data-bb="RepeatingGroup Portfólio">${portfolio.map(i => `
            <figure class="galeria-item" style="margin:0">
              <div class="img">${i.arquivo ? `<img src="${esc(i.arquivo)}" alt="${esc(i.titulo)}">` : esc(i.titulo)}</div>
              <figcaption class="legenda"><strong>${esc(i.titulo)}</strong><br><span class="suave">${esc(i.descricao)}</span></figcaption>
            </figure>`).join("")}</div>` : `<p class="suave">Nenhum item publicado.</p>`}
        </section>
        <section class="cartao" data-bb="Group Avaliações">
          <div class="cartao-titulo"><h2>Avaliações</h2>${avals.length ? `<span class="nota">${p.media_avaliacao.toLocaleString("pt-BR")} ${estrelas(p.media_avaliacao)}</span>` : ""}</div>
          ${avals.length ? avals.map(a => { const autor = DB.obter("usuario", a.autor_id); return `
            <div class="avaliacao-item">
              <div class="linha entre"><strong>${esc(autor ? autor.nome : "Usuário")}</strong><span class="pequeno suave">${dataBR(a.criado_em)}</span></div>
              <div>${estrelas(a.nota)} <span class="sr-only">${a.nota} de 5</span></div>
              <p style="margin-top:4px">${esc(a.comentario)}</p>
            </div>`; }).join("") : `<p class="suave">As avaliações aparecem após a conclusão das contratações.</p>`}
        </section>
      </div>
      <aside class="cartao" data-bb="Group Informações">
        <h2 style="margin-bottom:20px">Informações</h2>
        <dl class="info-lista" style="margin:0">
          <div><dt>Disponibilidade</dt><dd>${esc(opcao("disponibilidade", p.disponibilidade))}</dd></div>
          <div><dt>Atendimento</dt><dd>${esc(opcao("area_atendimento", p.area_atendimento))}</dd></div>
          <div><dt>Faixa de preço</dt><dd>A partir de ${brl(p.faixa_preco)}</dd></div>
          <div><dt>Contratações concluídas</dt><dd>${contratacoes}</dd></div>
          ${ultima ? `<div><dt>Última avaliação</dt><dd>"${esc(ultima.comentario)}"</dd></div>` : ""}
        </dl>
      </aside>
    </div>
  </main>`;
}

/* =========================================================
   WF-04 Publicação de demanda  (RF09)
   ========================================================= */
function telaNovaDemanda(params, editarId) {
  const d = editarId ? DB.obter("demanda", editarId) : null;
  if (editarId && (!d || d.contratante_id !== Sessao.usuarioId)) return telaSemAcesso();
  if (d && d.status !== "aberta") return telaMensagem("Esta demanda não pode mais ser editada", "Somente demandas abertas podem ser alteradas.", `<a class="btn btn-primario" href="#/demandas/${d.id}">Ver demanda</a>`);
  const prof = params.get("profissional") ? DB.obter("perfil_profissional", params.get("profissional")) : null;
  const profNome = prof ? Q.usuarioDoPerfil(prof.id)?.nome : "";
  const v = d || { titulo: "", categoria_id: params.get("categoria") || "", descricao: "", orcamento: "", localizacao: "", cep: "", prazo: "" };
  const hoje = new Date().toISOString().slice(0, 10);
  return `
  <main class="pagina pagina-estreita" data-bb="Page nova-demanda">
    <div class="cabecalho-pagina"><div><h1>${d ? "Editar demanda" : "Publicar nova demanda"}</h1><p>Descreva a necessidade para receber propostas compatíveis.</p></div>
      <a class="btn btn-texto" href="#/demandas">← Minhas demandas</a></div>
    ${prof ? `<div class="aviso-box" style="margin-bottom:20px">Você veio do perfil de <strong>${esc(profNome)}</strong>. A demanda fica visível para todos os profissionais da categoria, e ele também poderá enviar proposta.</div>` : ""}
    <form class="cartao form-grid cols-2-1" data-form="demanda" data-id="${d ? d.id : ""}" novalidate data-bb="Group Formulário demanda">
      ${campo("Título da demanda", `<input class="input" name="titulo" maxlength="80" placeholder="Ex.: Instalação de iluminação" value="${esc(v.titulo)}">`, { obrigatorio: true })}
      ${campo("Categoria", `<select class="select" name="categoria_id">${opcoesSelect("categoria", v.categoria_id, "Selecione")}</select>`, { obrigatorio: true, erro: "Escolha uma categoria." })}
      ${campo("Descrição do serviço", `<textarea class="textarea" name="descricao" data-minlen="20" placeholder="Informe o problema, o resultado esperado e detalhes importantes.">${esc(v.descricao)}</textarea>`, { obrigatorio: true, erro: "Descreva com pelo menos 20 caracteres.", classe: "span-all" })}
      <div class="span-all form-grid cols-2">
        ${campoCep(v.cep, "bairro")}
        ${campo("Localização", `<input class="input" name="localizacao" placeholder="Bairro, cidade - UF" value="${esc(v.localizacao)}">`, { obrigatorio: true })}
        ${campo("Orçamento estimado (R$)", `<input class="input" type="number" name="orcamento" min="1" step="1" data-min="1" placeholder="0" value="${esc(v.orcamento)}">`, { obrigatorio: true, erro: "Informe um valor maior que zero." })}
        ${campo("Prazo desejado", `<input class="input" type="date" name="prazo" min="${hoje}" value="${esc(v.prazo)}">`, { ajuda: "Opcional. Em branco = prazo negociável." })}
      </div>
      <div class="span-all">${campo("Anexos opcionais: fotos ou documentos", `<div class="arquivo"><input type="file" name="anexos" multiple accept="image/*,.pdf"></div>`)}</div>
      <div class="span-all linha" style="justify-content:flex-end">
        <a class="btn btn-contorno" href="#/demandas">Cancelar</a>
        <button class="btn btn-primario" type="submit">${d ? "Salvar alterações" : "Publicar demanda"}</button>
      </div>
    </form>
  </main>`;
}

/* Minhas demandas (contratante) — lista com acesso a WF-04 e WF-05 */
function telaMinhasDemandas() {
  const u = Sessao.usuario();
  const demandas = DB.filtrar("demanda", d => d.contratante_id === u.id).sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  const grupos = [["aberta", "Abertas"], ["contratada", "Contratadas"], ["cancelada", "Canceladas"]];
  return `
  <main class="pagina" data-bb="Page demandas">
    <div class="cabecalho-pagina"><div><h1>Minhas demandas</h1><p>Acompanhe as propostas recebidas e escolha o profissional.</p></div>
      <a class="btn btn-primario" href="#/demandas/nova">+ Publicar demanda</a></div>
    ${demandas.length ? grupos.map(([st, titulo]) => {
      const lista = demandas.filter(d => d.status === st);
      if (!lista.length) return "";
      return `<h2 style="margin:28px 0 12px">${titulo} <span class="contador">${lista.length}</span></h2>
      <div class="pilha" data-bb="RepeatingGroup Demanda (${st})">${lista.map(d => {
        const props = Q.propostasDaDemanda(d.id).filter(r => r.status !== "cancelada");
        const novas = props.filter(r => r.status === "enviada").length;
        return `<article class="cartao cartao-sm lista-item">
          <div><h3>${esc(d.titulo)}</h3><p class="suave pequeno">${esc(opcao("categoria", d.categoria_id))} · ${esc(d.localizacao)} · publicada ${tempoRelativo(d.criado_em)}</p></div>
          <div style="text-align:right">${selo("status_demanda", d.status)}<p class="pequeno suave" style="margin-top:4px">${props.length} ${props.length === 1 ? "proposta" : "propostas"}${novas ? ` · <strong class="destaque">${novas} nova${novas > 1 ? "s" : ""}</strong>` : ""}</p></div>
          <a class="btn btn-contorno btn-sm" href="#/demandas/${d.id}">${st === "aberta" ? "Ver propostas" : "Detalhes"}</a>
        </article>`; }).join("")}</div>`;
    }).join("") : `<div class="cartao">${vazio("📝", "Você ainda não publicou demandas", "Descreva o serviço que precisa e receba propostas de profissionais.", `<a class="btn btn-primario" href="#/demandas/nova">Publicar demanda</a>`)}</div>`}
  </main>`;
}

/* =========================================================
   WF-05 Detalhe da demanda e envio de proposta  (RF10, RF11, RF12)
   ========================================================= */
function telaDemanda(did) {
  const d = DB.obter("demanda", did);
  if (!d) return telaNaoEncontrada();
  const u = Sessao.usuario();
  const dono = u && u.id === d.contratante_id;
  const perfil = u && u.papel === "profissional" ? Q.perfilDoUsuario(u.id) : null;
  const contratante = DB.obter("usuario", d.contratante_id);
  const props = Q.propostasDaDemanda(d.id).filter(r => r.status !== "cancelada");

  // RN04: ao abrir, as propostas enviadas passam a "visualizada" (no servidor).
  if (dono && props.some(r => r.status === "enviada")) acao("demanda.visualizar", { id: d.id }).then(() => atualizarSeOcioso()).catch(() => {});

  let lateral;
  if (dono) lateral = painelPropostasRecebidas(d);
  else if (perfil) lateral = painelEnviarProposta(d, perfil);
  else if (!u) lateral = `<section class="cartao"><h2>Enviar proposta</h2><p class="suave" style="margin:10px 0 20px">Entre como profissional para enviar uma proposta para esta demanda.</p><a class="btn btn-primario btn-bloco" href="#/entrar?voltar=${encodeURIComponent("#/demandas/" + d.id)}">Entrar</a></section>`;
  else lateral = `<section class="cartao"><h2>Demanda de outro contratante</h2><p class="suave" style="margin-top:10px">As propostas desta demanda são visíveis apenas para quem a publicou (RN08).</p></section>`;

  return `
  <main class="pagina" data-bb="Page demanda (Type of content: Demanda)">
    <a class="btn btn-texto" href="${dono ? "#/demandas" : perfil ? "#/oportunidades" : "#/"}" style="margin-bottom:12px">← Voltar</a>
    <div class="grid-demanda">
      <section class="cartao" data-bb="Group Detalhe demanda">
        <div class="linha entre" style="align-items:flex-start"><h1 style="font-size:26px">${esc(d.titulo)}</h1>${selo("status_demanda", d.status)}</div>
        <p class="suave" style="margin-top:8px">${esc(opcao("categoria", d.categoria_id))} · ${esc(d.localizacao)} · Publicada ${tempoRelativo(d.criado_em)}${dono ? "" : ` por ${esc(contratante?.nome.split(" ")[0])}`}</p>
        <h2 style="margin:28px 0 10px">Descrição</h2>
        <p>${esc(d.descricao)}</p>
        ${d.anexos && d.anexos.length ? `<p class="pequeno suave" style="margin-top:12px">Anexos: ${d.anexos.map(esc).join(", ")}</p>` : ""}
        <dl class="info-lista" style="margin:32px 0 0">
          <div><dt>Orçamento estimado</dt><dd>Até ${brl(d.orcamento)}</dd></div>
          <div><dt>Prazo desejado</dt><dd>${d.prazo ? "Até " + dataBR(d.prazo) : "Prazo negociável"}</dd></div>
          <div><dt>Propostas recebidas</dt><dd>${d.total_propostas} ${d.total_propostas === 1 ? "proposta" : "propostas"}</dd></div>
        </dl>
        ${dono && d.status === "aberta" ? `<div class="linha" style="margin-top:28px"><a class="btn btn-contorno btn-sm" href="#/demandas/${d.id}/editar">Editar demanda</a><button class="btn btn-perigo btn-sm" data-act="cancelar-demanda" data-id="${d.id}">Cancelar demanda</button></div>` : ""}
      </section>
      ${lateral}
    </div>
  </main>`;
}
function painelEnviarProposta(d, perfil) {
  const minha = DB.filtrar("proposta", r => r.demanda_id === d.id && r.perfil_profissional_id === perfil.id && r.status !== "cancelada")[0];
  if (minha) return `<section class="cartao" data-bb="Group Minha proposta">
      <div class="cartao-titulo"><h2>Sua proposta</h2>${selo("status_proposta", minha.status)}</div>
      <dl class="info-lista" style="margin:0"><div><dt>Valor</dt><dd>${brl(minha.valor)}</dd></div><div><dt>Prazo para execução</dt><dd>${minha.prazo} ${minha.prazo == 1 ? "dia" : "dias"}</dd></div><div><dt>Mensagem</dt><dd style="font-weight:400">${esc(minha.mensagem)}</dd></div></dl>
      ${minha.status === "aceita" ? `<a class="btn btn-primario btn-bloco" style="margin-top:24px" href="#/contratacoes/${DB.filtrar("contratacao", c => c.proposta_id === minha.id)[0]?.id}">Ir para a contratação</a>`
        : ["enviada", "visualizada"].includes(minha.status) ? `<button class="btn btn-perigo btn-bloco" style="margin-top:24px" data-act="cancelar-proposta" data-id="${minha.id}">Cancelar proposta</button>` : ""}
    </section>`;
  if (d.status !== "aberta") return `<section class="cartao"><h2>Enviar proposta</h2><div class="aviso-box alerta" style="margin-top:14px">Esta demanda não está mais aberta para propostas.</div></section>`;
  if (!perfilMinimo(perfil)) return `<section class="cartao"><h2>Enviar proposta</h2><div class="aviso-box alerta" style="margin:14px 0 20px">Complete título, biografia, categoria e localização do seu perfil para enviar propostas (RN02).</div><a class="btn btn-primario btn-bloco" href="#/perfil-profissional">Completar perfil</a></section>`;
  return `
    <form class="cartao form-grid" data-form="proposta" data-demanda="${d.id}" novalidate data-bb="Group Enviar proposta">
      <h2>Enviar proposta</h2>
      ${campo("Valor (R$)", `<input class="input" type="number" name="valor" min="1" data-min="1" placeholder="0">`, { obrigatorio: true, erro: "Informe um valor maior que zero.", ajuda: `Orçamento do contratante: até ${brl(d.orcamento)}` })}
      ${campo("Prazo para execução (dias)", `<input class="input" type="number" name="prazo" min="1" data-min="1" placeholder="Quantidade de dias">`, { obrigatorio: true, erro: "Informe ao menos 1 dia." })}
      ${campo("Mensagem", `<textarea class="textarea" name="mensagem" data-minlen="10" placeholder="Explique como pretende realizar o serviço."></textarea>`, { obrigatorio: true, erro: "Escreva ao menos 10 caracteres." })}
      <button class="btn btn-primario btn-bloco" type="submit">Enviar proposta</button>
    </form>`;
}
function painelPropostasRecebidas(d) {
  const props = Q.propostasDaDemanda(d.id).filter(r => r.status !== "cancelada").sort((a, b) => a.valor - b.valor);
  return `<section class="cartao" data-bb="Group Propostas recebidas (CMP-07)">
    <h2 style="margin-bottom:16px">Propostas recebidas</h2>
    ${props.length ? `<div class="pilha" data-bb="RepeatingGroup Proposta">${props.map(r => {
      const pr = DB.obter("perfil_profissional", r.perfil_profissional_id);
      const pu = pr && DB.obter("usuario", pr.usuario_id);
      const total = pu ? Q.avaliacoesRecebidas(pu.id).length : 0;
      return `<article class="cartao-interno proposta-card">
        <div class="linha entre" style="align-items:flex-start">
          <div class="linha">${avatar(pu, "avatar-sm")}<div><a href="#/perfil/${pr.id}" class="forte">${esc(pu?.nome)}</a><p class="pequeno suave">${total ? `${pr.media_avaliacao.toLocaleString("pt-BR")} ★ · ${total} aval.` : "Sem avaliações"}</p></div></div>
          ${selo("status_proposta", r.status)}
        </div>
        <p style="margin-top:12px">${esc(r.mensagem)}</p>
        <p class="pequeno" style="margin-top:8px"><strong class="destaque">${brl(r.valor)}</strong> · ${r.prazo} ${r.prazo == 1 ? "dia" : "dias"}</p>
        ${d.status === "aberta" && ["enviada", "visualizada"].includes(r.status) ? `<div class="rodape">
          <button class="btn btn-perigo btn-sm" data-act="recusar-proposta" data-id="${r.id}">Recusar</button>
          <button class="btn btn-primario btn-sm" data-act="aceitar-proposta" data-id="${r.id}">Aceitar e contratar</button></div>` : ""}
        ${r.status === "aceita" ? `<div class="rodape"><a class="btn btn-primario btn-sm" href="#/contratacoes/${DB.filtrar("contratacao", c => c.proposta_id === r.id)[0]?.id}">Abrir contratação</a></div>` : ""}
      </article>`; }).join("")}</div>`
      : vazio("📭", "Nenhuma proposta ainda", "Os profissionais da categoria já podem ver sua demanda.")}
  </section>`;
}

/* =========================================================
   WF-06 Acompanhamento da contratação e comunicação  (RF12–RF16)
   ========================================================= */
const ETAPAS = ["aguardando_inicio", "em_andamento", "entregue", "concluida"];
function telaContratacoes(cid) {
  const u = Sessao.usuario();
  const lista = Q.contratacoesDo(u);
  if (!lista.length) return `<main class="pagina">${`<div class="cartao">${vazio("🤝", "Nenhuma contratação ainda", u.papel === "contratante" ? "Aceite uma proposta em uma de suas demandas para iniciar uma contratação." : "Quando um contratante aceitar sua proposta, a contratação aparece aqui.", u.papel === "contratante" ? `<a class="btn btn-primario" href="#/demandas">Minhas demandas</a>` : `<a class="btn btn-primario" href="#/oportunidades">Ver oportunidades</a>`)}</div>`}</main>`;
  const c = cid ? lista.find(x => x.id === cid) : lista[0];
  if (cid && !c) return telaSemAcesso(); // RN08
  const d = Q.demandaDaContratacao(c);
  const pu = Q.usuarioDoPerfil(c.perfil_profissional_id);
  const ct = DB.obter("usuario", c.contratante_id);
  const souProf = pu && pu.id === u.id;
  const outro = souProf ? ct : pu;
  const conversa = Q.conversaDa(c.id);
  const msgs = conversa ? DB.filtrar("mensagem", m => m.conversa_id === conversa.id).sort((a, b) => a.data.localeCompare(b.data)) : [];
  // marca como lidas as mensagens recebidas (no servidor)
  if (msgs.some(m => m.remetente_id !== u.id && !m.lida)) acao("mensagem.lidas", { contratacao_id: c.id }).then(() => renderHeader(Nav.caminho())).catch(() => {});
  const proposta = DB.obter("proposta", c.proposta_id);
  const idx = ETAPAS.indexOf(c.status);
  const minhaAval = DB.filtrar("avaliacao", a => a.contratacao_id === c.id && a.autor_id === u.id)[0];
  const avalDoOutro = DB.filtrar("avaliacao", a => a.contratacao_id === c.id && a.autor_id !== u.id)[0];

  // Próxima ação permitida para quem está vendo (RN06)
  let proxima = "", botao = "";
  if (c.status === "aguardando_inicio" && souProf) { proxima = "Iniciar o serviço"; botao = `<button class="btn btn-primario btn-bloco" data-act="status" data-id="${c.id}" data-para="em_andamento">Marcar como em andamento</button>`; }
  else if (c.status === "em_andamento" && souProf) { proxima = "Marcar como entregue"; botao = `<button class="btn btn-primario btn-bloco" data-act="status" data-id="${c.id}" data-para="entregue">Marcar como entregue</button>`; }
  else if (c.status === "entregue" && !souProf) { proxima = "Confirmar a conclusão"; botao = `<button class="btn btn-primario btn-bloco" data-act="status" data-id="${c.id}" data-para="concluida">Confirmar conclusão</button>`; }
  else if (c.status === "concluida") { proxima = minhaAval ? "Contratação encerrada" : `Avaliar ${outro?.nome.split(" ")[0]}`; botao = minhaAval ? "" : `<button class="btn btn-primario btn-bloco" data-act="avaliar" data-id="${c.id}">Avaliar contratação</button>`; }
  else if (c.status === "cancelada") proxima = "Contratação cancelada";
  else proxima = souProf ? "Aguardar o contratante" : `Aguardar ${pu?.nome.split(" ")[0]}`;
  const podeCancelar = ["aguardando_inicio", "em_andamento"].includes(c.status);

  return `
  <main class="pagina" data-bb="Page contratacao">
    <div class="grid-lateral">
      <aside class="cartao" data-bb="Group Minhas contratações">
        <h2 style="margin-bottom:16px">Minhas contratações</h2>
        <nav class="contrato-lista" data-bb="RepeatingGroup Contratação">${lista.map(x => { const dx = Q.demandaDaContratacao(x); return `
          <a class="contrato-item ${x.id === c.id ? "ativo" : ""}" href="#/contratacoes/${x.id}" ${x.id === c.id ? 'aria-current="page"' : ""}>
            <h3>${esc(dx?.titulo)}</h3>${selo("status_contratacao", x.status)}</a>`; }).join("")}
        </nav>
      </aside>
      <section class="cartao" data-bb="Group Detalhe contratação (CMP-08)">
        <div class="linha entre" style="margin-bottom:20px"><h1 style="font-size:26px">${esc(d?.titulo)}</h1><span class="suave">com <a href="${souProf ? "#" : "#/perfil/" + c.perfil_profissional_id}" ${souProf ? 'tabindex="-1" style="pointer-events:none;color:inherit"' : ""}>${esc(outro?.nome)}</a></span></div>
        ${c.status === "cancelada" ? `<div class="aviso-box alerta">Esta contratação foi cancelada.</div>` : `
        <div class="etapas" role="list" aria-label="Etapas da contratação" data-bb="Group Etapas">
          ${ETAPAS.map((e, i) => { const h = (c.historico || []).filter(x => x.status === e).pop(); return `
            <div class="etapa ${i < idx ? "feita" : i === idx ? "atual feita" : ""}" role="listitem" ${i === idx ? 'aria-current="step"' : ""}>
              <span class="bola"></span><span>${i === 0 ? "Proposta aceita" : esc(opcao("status_contratacao", e))}${h ? `<br><small>${dataHora(h.data)}</small>` : ""}</span></div>`; }).join("")}
        </div>`}
        <div class="grid-contrato" style="margin-top:28px">
          <div>
            <h2 style="margin-bottom:12px">Mensagens</h2>
            <div class="chat" data-bb="Group Conversa">
              <div class="chat-msgs" id="chat-msgs" aria-live="polite" data-bb="RepeatingGroup Mensagem">
                ${msgs.length ? msgs.map(m => { const autor = DB.obter("usuario", m.remetente_id); const minha = m.remetente_id === u.id; return `
                  <div class="msg ${minha ? "minha" : ""}"><div class="autor">${minha ? "Você" : esc(autor?.nome.split(" ")[0])}<span class="hora">${dataHora(m.data)}</span></div>${esc(m.texto)}</div>`; }).join("")
                  : `<p class="suave pequeno" style="text-align:center;margin:auto">Nenhuma mensagem. Combine os detalhes por aqui.</p>`}
              </div>
              <p class="pequeno suave" style="margin:-8px 0 10px">Atualiza sozinho a cada poucos segundos.</p>
              ${c.status === "cancelada" ? `<p class="pequeno suave">A conversa foi encerrada.</p>` : `
              <form class="chat-form" data-form="mensagem" data-conversa="${conversa?.id}" data-contratacao="${c.id}">
                <label class="sr-only" for="msg-texto">Mensagem</label>
                <input id="msg-texto" class="input" name="texto" placeholder="Digite uma mensagem" autocomplete="off" maxlength="1000">
                <button class="btn btn-primario" type="submit">Enviar</button>
              </form>`}
            </div>
          </div>
          <aside class="pilha">
            <div class="cartao cartao-sm" data-bb="Group Resumo">
              <h2 style="margin-bottom:16px">Resumo</h2>
              <dl class="info-lista" style="margin:0">
                <div><dt>Valor combinado</dt><dd>${brl(c.valor_combinado)}</dd></div>
                <div><dt>Prazo combinado</dt><dd>${proposta ? `${proposta.prazo} ${proposta.prazo == 1 ? "dia" : "dias"}` : "—"}${d?.prazo ? ` · até ${dataBR(d.prazo)}` : ""}</dd></div>
                <div><dt>Próxima ação</dt><dd>${esc(proxima)}</dd></div>
              </dl>
              ${botao ? `<div style="margin-top:18px">${botao}</div>` : ""}
              ${podeCancelar ? `<button class="btn btn-texto btn-bloco" style="margin-top:8px;color:var(--erro)" data-act="status" data-id="${c.id}" data-para="cancelada">Cancelar contratação</button>` : ""}
            </div>
            ${c.status === "concluida" ? `<div class="cartao cartao-sm" data-bb="Group Avaliações da contratação (CMP-09)">
              <h3 style="margin-bottom:10px">Avaliações</h3>
              ${minhaAval ? `<p class="pequeno"><strong>Você:</strong> ${estrelas(minhaAval.nota)}<br>${esc(minhaAval.comentario)}</p>` : `<p class="pequeno suave">Você ainda não avaliou.</p>`}
              ${avalDoOutro ? `<p class="pequeno" style="margin-top:10px"><strong>${esc(outro?.nome.split(" ")[0])}:</strong> ${estrelas(avalDoOutro.nota)}<br>${esc(avalDoOutro.comentario)}</p>` : ""}
            </div>` : ""}
            <div class="cartao cartao-sm" data-bb="Group Histórico">
              <h3 style="margin-bottom:10px">Histórico</h3>
              <ul class="historico">${(c.historico || []).slice().reverse().map(h => `<li><span>${esc(opcao("status_contratacao", h.status))} · ${esc(DB.obter("usuario", h.autor_id)?.nome.split(" ")[0])}<br><span class="suave">${dataHora(h.data)}</span></span></li>`).join("")}</ul>
            </div>
          </aside>
        </div>
      </section>
    </div>
  </main>`;
}

/* =========================================================
   WF-07 Painel do profissional  (RF10, RF11, RF14–RF16)
   ========================================================= */
function telaPainel() {
  const u = Sessao.usuario();
  const perfil = Q.perfilDoUsuario(u.id);
  const ops = Q.oportunidades(perfil);
  const minhas = DB.filtrar("proposta", r => r.perfil_profissional_id === perfil.id && r.status !== "cancelada").sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  const pendentes = minhas.filter(r => ["enviada", "visualizada"].includes(r.status)).length;
  const ativas = DB.filtrar("contratacao", c => c.perfil_profissional_id === perfil.id && ["aguardando_inicio", "em_andamento", "entregue"].includes(c.status));
  const total = Q.avaliacoesRecebidas(u.id).length;
  const completo = completudePerfil(perfil);
  return `
  <main class="pagina" data-bb="Page painel">
    <div class="cabecalho-pagina"><div><h1>Painel do profissional</h1><p>Acompanhe oportunidades, propostas e serviços em andamento.</p></div></div>
    ${!perfilMinimo(perfil) ? `<div class="aviso-box alerta" style="margin-bottom:20px">Seu perfil está incompleto (${completo}%). Complete título, biografia, categoria e localização para enviar propostas. <a href="#/perfil-profissional"><strong>Completar agora</strong></a></div>` : ""}
    <div class="stats" data-bb="Group Indicadores (Row)">
      <a class="stat" href="#/oportunidades"><strong>${ops.length}</strong><span>Novas oportunidades</span></a>
      <a class="stat" href="#/propostas"><strong>${pendentes}</strong><span>Propostas aguardando</span></a>
      <a class="stat" href="#/contratacoes"><strong>${ativas.length}</strong><span>Contratações ativas</span></a>
      <a class="stat" href="#/perfil/${perfil.id}"><strong>${total ? perfil.media_avaliacao.toLocaleString("pt-BR") : "—"}</strong><span>Avaliação média${total ? ` (${total})` : ""}</span></a>
    </div>
    <div class="grid-2">
      <section class="cartao" data-bb="Group Oportunidades compatíveis (CMP-06)">
        <div class="cartao-titulo"><h2>Oportunidades compatíveis</h2><a href="#/oportunidades" class="pequeno">Ver todas</a></div>
        <div class="pilha">${ops.length ? ops.slice(0, 3).map(cartaoOportunidade).join("") : vazio("✨", "Sem oportunidades novas", "Novas demandas das suas categorias aparecem aqui.")}</div>
      </section>
      <div class="pilha">
        <section class="cartao" data-bb="Group Minhas propostas">
          <h2 style="margin-bottom:16px">Minhas propostas</h2>
          <div class="pilha">${minhas.length ? minhas.slice(0, 3).map(r => { const d = DB.obter("demanda", r.demanda_id); return `
            <a class="cartao-interno" href="#/demandas/${d.id}" style="color:inherit;display:block"><p>${esc(d.titulo)}</p><div class="linha entre" style="margin-top:6px">${selo("status_proposta", r.status)}<span class="pequeno destaque">${brl(r.valor)}</span></div></a>`; }).join("")
            : `<p class="suave">Você ainda não enviou propostas.</p>`}</div>
          <a class="btn btn-contorno btn-bloco" style="margin-top:16px" href="#/propostas">Ver todas as propostas</a>
        </section>
        ${ativas.length ? `<section class="cartao" data-bb="Group Contratações ativas">
          <h2 style="margin-bottom:16px">Em andamento</h2>
          <div class="pilha">${ativas.map(c => { const d = Q.demandaDaContratacao(c); return `<a class="cartao-interno" href="#/contratacoes/${c.id}" style="color:inherit;display:block"><p>${esc(d?.titulo)}</p><div class="linha entre" style="margin-top:6px">${selo("status_contratacao", c.status)}<span class="pequeno destaque">${brl(c.valor_combinado)}</span></div></a>`; }).join("")}</div>
        </section>` : ""}
      </div>
    </div>
  </main>`;
}
function cartaoOportunidade(d) {
  return `<article class="cartao-interno lista-item">
    <div><h3>${esc(d.titulo)}</h3><p class="pequeno suave">${esc(opcao("categoria", d.categoria_id))} · ${esc(d.localizacao)} · ${tempoRelativo(d.criado_em)}</p></div>
    <div><p class="valor-faixa">Até ${brl(d.orcamento)}</p><p class="pequeno suave">${d.prazo ? "Até " + dataBR(d.prazo) : "Prazo negociável"}</p></div>
    <a class="btn btn-contorno btn-sm" href="#/demandas/${d.id}">Ver demanda</a>
  </article>`;
}

/* Oportunidades (profissional) — lista completa */
const filtrosOp = { categoria: "", todas: false };
function telaOportunidades() {
  const perfil = Q.perfilDoUsuario(Sessao.usuarioId);
  let lista = filtrosOp.todas
    ? DB.filtrar("demanda", d => d.status === "aberta" && !DB.filtrar("proposta", r => r.demanda_id === d.id && r.perfil_profissional_id === perfil.id && r.status !== "cancelada").length)
    : Q.oportunidades(perfil);
  if (filtrosOp.categoria) lista = lista.filter(d => d.categoria_id === filtrosOp.categoria);
  lista.sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  return `
  <main class="pagina" data-bb="Page oportunidades">
    <div class="cabecalho-pagina"><div><h1>Oportunidades</h1><p>Demandas abertas que ainda não receberam proposta sua.</p></div></div>
    <div class="cartao cartao-sm linha" style="margin-bottom:20px" data-bb="Group Filtros oportunidades (Row)">
      <label class="linha pequeno">Categoria <select class="select" style="width:auto;min-height:40px" data-filtro-op="categoria">${opcoesSelect("categoria", filtrosOp.categoria, "Todas")}</select></label>
      <label class="check" style="margin-left:auto"><input type="checkbox" data-filtro-op="todas" ${filtrosOp.todas ? "checked" : ""}> Mostrar também fora das minhas categorias</label>
    </div>
    <div class="pilha" data-bb="RepeatingGroup Demanda">${lista.length ? lista.map(cartaoOportunidade).join("") : `<div class="cartao">${vazio("✨", "Nenhuma oportunidade encontrada", "Ajuste os filtros ou volte mais tarde.")}</div>`}</div>
  </main>`;
}

/* Propostas (profissional) — RF11 */
function telaPropostas() {
  const perfil = Q.perfilDoUsuario(Sessao.usuarioId);
  const lista = DB.filtrar("proposta", r => r.perfil_profissional_id === perfil.id).sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  return `
  <main class="pagina" data-bb="Page propostas">
    <div class="cabecalho-pagina"><div><h1>Minhas propostas</h1><p>Acompanhe o estado de cada proposta enviada.</p></div><a class="btn btn-primario" href="#/oportunidades">Buscar oportunidades</a></div>
    <div class="pilha" data-bb="RepeatingGroup Proposta">${lista.length ? lista.map(r => { const d = DB.obter("demanda", r.demanda_id); const c = DB.filtrar("contratacao", x => x.proposta_id === r.id)[0]; return `
      <article class="cartao cartao-sm lista-item">
        <div><h3>${esc(d.titulo)}</h3><p class="pequeno suave">${esc(opcao("categoria", d.categoria_id))} · ${esc(d.localizacao)} · enviada ${tempoRelativo(r.criado_em)}</p></div>
        <div style="text-align:right">${selo("status_proposta", r.status)}<p class="pequeno destaque" style="margin-top:4px">${brl(r.valor)} · ${r.prazo} ${r.prazo == 1 ? "dia" : "dias"}</p></div>
        <div class="linha">${c ? `<a class="btn btn-primario btn-sm" href="#/contratacoes/${c.id}">Contratação</a>` : `<a class="btn btn-contorno btn-sm" href="#/demandas/${d.id}">Ver demanda</a>`}
          ${["enviada", "visualizada"].includes(r.status) ? `<button class="btn btn-perigo btn-sm" data-act="cancelar-proposta" data-id="${r.id}">Cancelar</button>` : ""}</div>
      </article>`; }).join("") : `<div class="cartao">${vazio("📨", "Nenhuma proposta enviada", "Encontre demandas compatíveis e envie sua primeira proposta.", `<a class="btn btn-primario" href="#/oportunidades">Ver oportunidades</a>`)}</div>`}</div>
  </main>`;
}

/* =========================================================
   WF-08 Gestão de perfil e serviços  (RF03–RF06)
   ========================================================= */
let secaoPerfil = "dados";
function telaGestaoPerfil() {
  const u = Sessao.usuario();
  const p = Q.perfilDoUsuario(u.id);
  const habs = Q.habilidades(p.id);
  const servicos = DB.filtrar("servico", s => s.perfil_profissional_id === p.id);
  const portfolio = DB.filtrar("portfolio", i => i.perfil_profissional_id === p.id).sort((a, b) => a.ordem - b.ordem);
  const completo = completudePerfil(p);
  const secoes = [["dados", "Dados profissionais"], ["servicos", "Serviços"], ["portfolio", "Portfólio"], ["disponibilidade", "Disponibilidade"]];
  return `
  <main class="pagina" data-bb="Page perfil-profissional">
    <div class="cabecalho-pagina"><div><h1>Gerenciar perfil profissional</h1><p>Atualize as informações públicas, os serviços e o portfólio.</p></div>
      <div class="linha"><a class="btn btn-contorno" href="#/perfil/${p.id}">Ver perfil público</a><button class="btn btn-primario" data-act="salvar-perfil">Salvar alterações</button></div></div>
    <div class="grid-lateral">
      <aside class="cartao" data-bb="Group Configurações">
        <h2 style="margin-bottom:16px">Configurações</h2>
        <nav class="menu-lateral">${secoes.map(([id, t]) => `<a href="#sec-${id}" data-act="secao" data-sec="${id}" class="${secaoPerfil === id ? "ativo" : ""}">${t}</a>`).join("")}</nav>
        <p class="suave pequeno" style="margin-top:28px">Perfil público</p>
        <p class="destaque" style="font-size:18px">Completo em ${completo}%</p>
        <div class="barra" role="progressbar" aria-valuenow="${completo}" aria-valuemin="0" aria-valuemax="100" aria-label="Completude do perfil"><div style="width:${completo}%"></div></div>
        ${!perfilMinimo(p) ? `<p class="pequeno" style="color:var(--aviso);margin-top:12px">Preencha título, biografia, categoria e localização para publicar serviços e enviar propostas.</p>` : ""}
      </aside>
      <form class="pilha" data-form="perfil" novalidate>
        <section class="cartao" id="sec-dados" data-bb="Group Dados profissionais">
          <h2 style="margin-bottom:20px">Dados profissionais</h2>
          <div class="form-grid cols-2">
            ${campo("Título profissional", `<input class="input" name="titulo" maxlength="60" placeholder="Ex.: Eletricista residencial" value="${esc(p.titulo)}">`, { obrigatorio: true, classe: "span-2" })}
            ${campoCep(p.cep, "cidade")}
            ${campo("Localização", `<input class="input" name="localizacao" placeholder="Cidade - UF" value="${esc(p.localizacao)}">`, { obrigatorio: true })}
            ${campo("Biografia", `<textarea class="textarea" name="biografia" data-minlen="20" placeholder="Descreva sua experiência e forma de atendimento.">${esc(p.biografia)}</textarea>`, { obrigatorio: true, erro: "Escreva ao menos 20 caracteres.", classe: "span-2" })}
            ${campo("Categoria principal", `<select class="select" name="categoria_id">${opcoesSelect("categoria", p.categoria_id, "Selecione")}</select>`, { obrigatorio: true, erro: "Escolha uma categoria." })}
            ${campo("Área de atendimento", `<select class="select" name="area_atendimento">${opcoesSelect("area_atendimento", p.area_atendimento)}</select>`)}
            <div class="campo span-2"><label for="nova-hab">Habilidades</label>
              <div class="chips" style="margin-bottom:8px" data-bb="RepeatingGroup Profissional Habilidade">${habs.map(h => `<span class="chip">${esc(h.nome)}<button type="button" data-act="remover-hab" data-id="${h.id}" aria-label="Remover ${esc(h.nome)}">×</button></span>`).join("") || `<span class="suave pequeno">Nenhuma habilidade adicionada.</span>`}</div>
              <div class="linha" style="flex-wrap:nowrap"><input id="nova-hab" class="input" list="lista-habs" placeholder="Digite e pressione Adicionar"><datalist id="lista-habs">${DB.todos("habilidade").map(h => `<option value="${esc(h.nome)}">`).join("")}</datalist>
              <button type="button" class="btn btn-suave" data-act="adicionar-hab">Adicionar</button></div></div>
          </div>
        </section>
        <section class="cartao" id="sec-disponibilidade" data-bb="Group Disponibilidade">
          <h2 style="margin-bottom:20px">Disponibilidade e preço</h2>
          <div class="form-grid cols-2">
            ${campo("Disponibilidade", `<select class="select" name="disponibilidade">${opcoesSelect("disponibilidade", p.disponibilidade)}</select>`)}
            ${campo("Preço inicial de referência (R$)", `<input class="input" type="number" min="0" name="faixa_preco" value="${esc(p.faixa_preco)}">`, { ajuda: "Exibido quando não há serviço ativo." })}
          </div>
        </section>
      </form>
      <div class="so-grade"></div>
      <div class="pilha">
        <section class="cartao" id="sec-servicos" data-bb="Group Serviços publicados">
          <div class="cartao-titulo"><h2>Serviços publicados</h2><button class="btn btn-primario btn-sm" data-act="novo-servico">Novo serviço</button></div>
          <div class="pilha" data-bb="RepeatingGroup Serviço">${servicos.length ? servicos.map(s => `
            <div class="cartao-interno servico-gestao">
              <div><p class="forte">${esc(s.titulo)}</p><p class="pequeno suave">${esc(opcao("categoria", s.categoria_id))} · A partir de ${brl(s.preco_inicial)}</p></div>
              <label class="linha pequeno" style="gap:8px"><span class="${s.ativo ? "destaque" : "suave"}">${s.ativo ? "Ativo" : "Inativo"}</span>
                <span class="interruptor"><input type="checkbox" data-act="ativar-servico" data-id="${s.id}" ${s.ativo ? "checked" : ""} aria-label="Serviço ${esc(s.titulo)} ativo"><span></span></span></label>
              <button class="btn btn-contorno btn-sm" data-act="editar-servico" data-id="${s.id}">Editar</button>
            </div>`).join("") : vazio("🧰", "Nenhum serviço", "Publique seu primeiro serviço para aparecer na busca.")}</div>
        </section>
        <section class="cartao" id="sec-portfolio" data-bb="Group Portfólio">
          <div class="cartao-titulo"><h2>Portfólio</h2><button class="btn btn-contorno btn-sm" data-act="novo-item">Adicionar item</button></div>
          ${portfolio.length ? `<div class="galeria galeria-gestao" data-bb="RepeatingGroup Portfólio">${portfolio.map(i => `
            <div class="galeria-item"><div class="img">${i.arquivo ? `<img src="${esc(i.arquivo)}" alt="${esc(i.titulo)}">` : esc(i.titulo)}</div>
              <div class="legenda"><strong>${esc(i.titulo)}</strong></div>
              <div class="acoes-item"><button class="btn btn-texto btn-sm" data-act="editar-item" data-id="${i.id}">Editar</button><button class="btn btn-texto btn-sm" style="color:var(--erro)" data-act="remover-item" data-id="${i.id}">Remover</button></div>
            </div>`).join("")}</div>` : vazio("🖼️", "Portfólio vazio", "Mostre trabalhos anteriores para gerar confiança.")}
        </section>
      </div>
    </div>
  </main>`;
}
function formServico(s) {
  s = s || { titulo: "", categoria_id: Q.perfilDoUsuario(Sessao.usuarioId).categoria_id, descricao: "", preco_inicial: "", localizacao: Q.perfilDoUsuario(Sessao.usuarioId).localizacao, ativo: true };
  return `<form class="form-grid" data-form="servico" data-id="${s.id || ""}" novalidate>
    ${campo("Título do serviço", `<input class="input" name="titulo" maxlength="60" value="${esc(s.titulo)}">`, { obrigatorio: true })}
    <div class="form-grid cols-2">
      ${campo("Categoria", `<select class="select" name="categoria_id">${opcoesSelect("categoria", s.categoria_id, "Selecione")}</select>`, { obrigatorio: true, erro: "Escolha uma categoria." })}
      ${campo("Preço inicial (R$)", `<input class="input" type="number" name="preco_inicial" min="1" data-min="1" value="${esc(s.preco_inicial)}">`, { obrigatorio: true, erro: "Informe um valor maior que zero." })}
    </div>
    ${campo("Descrição", `<textarea class="textarea" name="descricao">${esc(s.descricao)}</textarea>`)}
    <div class="form-grid cols-2">${campoCep("", "cidade")}${campo("Localização", `<input class="input" name="localizacao" value="${esc(s.localizacao)}">`)}</div>
    <label class="check"><input type="checkbox" name="ativo" ${s.ativo ? "checked" : ""}> Serviço ativo (visível no perfil e na busca)</label>
    <div class="modal-rodape">${s.id ? `<button type="button" class="btn btn-perigo" data-act="remover-servico" data-id="${s.id}" style="margin-right:auto">Remover</button>` : ""}
      <button type="button" class="btn btn-contorno" data-act="fechar-modal">Cancelar</button><button class="btn btn-primario" type="submit">Salvar serviço</button></div>
  </form>`;
}
function formItem(i) {
  i = i || { titulo: "", descricao: "", arquivo: "" };
  return `<form class="form-grid" data-form="item" data-id="${i.id || ""}" novalidate>
    ${campo("Título", `<input class="input" name="titulo" maxlength="50" value="${esc(i.titulo)}">`, { obrigatorio: true })}
    ${campo("Descrição", `<textarea class="textarea" name="descricao">${esc(i.descricao)}</textarea>`)}
    ${campo("Imagem ou arquivo", `<div class="arquivo">${i.arquivo ? `<img src="${esc(i.arquivo)}" alt="" style="width:64px;height:48px;object-fit:cover;border-radius:6px">` : ""}<input type="file" name="arquivo" accept="image/*"></div>`, { ajuda: "Até 1,5 MB." })}
    <div class="modal-rodape"><button type="button" class="btn btn-contorno" data-act="fechar-modal">Cancelar</button><button class="btn btn-primario" type="submit">Salvar item</button></div>
  </form>`;
}

/* Dados da conta — RF03 (profissional e contratante) */
function telaConta() {
  const u = Sessao.usuario();
  return `<main class="pagina pagina-estreita" data-bb="Page conta">
    <div class="cabecalho-pagina"><div><h1>Dados da conta</h1><p>Informações pessoais usadas em todas as áreas do Trabalink.</p></div></div>
    <form class="cartao form-grid cols-2" data-form="conta" novalidate data-bb="Group Dados da conta">
      <div class="span-2 linha">${avatar(u, "avatar-lg")}<div class="campo"><label>Foto</label><input type="file" name="foto" accept="image/*"><span class="ajuda">JPG ou PNG, até 1,5 MB.</span></div></div>
      ${campo("Nome completo", `<input class="input" name="nome" value="${esc(u.nome)}">`, { obrigatorio: true })}
      ${campo("Telefone", `<input class="input" name="telefone" inputmode="tel" value="${esc(u.telefone)}">`)}
      ${campo("E-mail", `<input class="input" value="${esc(u.email)}" disabled>`, { ajuda: "O e-mail é o login e não pode ser alterado aqui." })}
      ${campo("Papel ativo", `<input class="input" value="${esc(opcao("papel_usuario", u.papel))}" disabled>`)}
      <div class="span-2 aviso-box pequeno">Seus dados são usados apenas para operar a plataforma (RNF06). Para solicitar a exclusão da conta, use a opção abaixo.</div>
      <div class="span-2 linha entre"><button type="button" class="btn btn-texto" style="color:var(--erro)" data-act="excluir-conta">Solicitar exclusão da conta</button><button class="btn btn-primario" type="submit">Salvar dados</button></div>
    </form></main>`;
}

/* ---------- Telas auxiliares ---------- */
function telaMensagem(titulo, texto, acao) { return `<main class="pagina pagina-estreita"><div class="cartao">${vazio("ℹ️", titulo, texto, acao)}</div></main>`; }
function telaNaoEncontrada() { return telaMensagem("Página não encontrada", "O endereço não existe ou o registro foi removido.", `<a class="btn btn-primario" href="#/">Ir para o início</a>`); }
function telaSemAcesso() { return telaMensagem("Acesso restrito", "Este conteúdo só pode ser consultado pelos usuários envolvidos (RN08).", `<a class="btn btn-primario" href="#/">Ir para o início</a>`); }

/* =========================================================
   Roteador (equivale à navegação entre páginas do Bubble)
   ========================================================= */
function exigir(papel) {
  const u = Sessao.usuario();
  if (!u) { Nav.ir("#/entrar?voltar=" + encodeURIComponent(Nav.atual())); return false; }
  if (papel && u.papel !== papel) { $("#app").innerHTML = telaMensagem("Área exclusiva", papel === "profissional" ? "Esta área é exclusiva para profissionais." : "Esta área é exclusiva para contratantes.", `<a class="btn btn-primario" href="${u.papel === "profissional" ? "#/painel" : "#/"}">Voltar</a>`); return null; }
  return true;
}
function render() {
  const [caminho, query] = (Nav.atual().slice(2) || "").split("?");
  const params = new URLSearchParams(query || "");
  const partes = caminho.split("/").filter(Boolean);
  const u = Sessao.usuario();
  painelAberto = null;
  renderHeader(caminho);
  let html = null;
  const r = partes[0] || "";
  const ok = papel => { const e = exigir(papel); return e === true; };

  if (r === "") html = u && u.papel === "profissional" && !params.has("busca") ? (Nav.ir("#/painel"), null) : telaBusca();
  else if (r === "busca") html = telaBusca();
  else if (r === "entrar") html = u ? (Nav.ir(u.papel === "profissional" ? "#/painel" : "#/"), null) : telaAcesso(partes[1] || "entrar");
  else if (r === "perfil" && partes[1]) html = telaPerfil(partes[1]);
  else if (r === "demandas") {
    if (partes[1] === "nova") { if (ok("contratante")) html = telaNovaDemanda(params); }
    else if (partes[1] && partes[2] === "editar") { if (ok("contratante")) html = telaNovaDemanda(params, partes[1]); }
    else if (partes[1]) html = telaDemanda(partes[1]);
    else if (!u) html = telaMensagem("Publique sua demanda", "Entre como contratante para publicar demandas e receber propostas de profissionais.", `<a class="btn btn-primario" href="#/entrar?voltar=%23%2Fdemandas">Entrar</a> <a class="btn btn-contorno" href="#/entrar/cadastro">Criar conta</a>`);
    else if (u.papel === "profissional") { Nav.ir("#/oportunidades"); return; }
    else html = telaMinhasDemandas();
  }
  else if (r === "contratacoes") { if (ok()) html = telaContratacoes(partes[1]); }
  else if (r === "painel") { if (ok("profissional")) html = telaPainel(); }
  else if (r === "oportunidades") { if (ok("profissional")) html = telaOportunidades(); }
  else if (r === "propostas") { if (ok("profissional")) html = telaPropostas(); }
  else if (r === "perfil-profissional") { if (ok("profissional")) html = telaGestaoPerfil(); }
  else if (r === "conta") { if (ok()) html = telaConta(); }
  else html = telaNaoEncontrada();

  if (html !== null && html !== undefined) {
    $("#app").innerHTML = html;
    window.scrollTo(0, 0);
    const chat = $("#chat-msgs"); if (chat) chat.scrollTop = chat.scrollHeight;
    const t = $("#app h1"); document.title = (t ? t.textContent + " · " : "") + "Trabalink";
  }
}
/* re-render sem perder a rolagem (após ações na mesma página) */
function atualizar() { const y = window.scrollY; render(); window.scrollTo(0, y); }

/* Chamado quando chegam dados novos do servidor (outra pessoa agiu).
   Não re-renderiza por cima de quem está digitando; na conversa,
   preserva o texto e o foco do campo de mensagem. */
let atualizacaoPendente = false;
function atualizarSeOcioso() {
  renderHeader(Nav.caminho());
  const ativo = document.activeElement;
  const digitando = ativo && ativo.matches("input, textarea, select") && ativo.id !== "msg-texto";
  if ($("#modal") || digitando) { atualizacaoPendente = true; return; }
  const msg = $("#msg-texto");
  const rascunho = msg ? msg.value : null;
  const focado = !!(ativo && ativo.id === "msg-texto");
  const chat = $("#chat-msgs");
  const noFim = !chat || chat.scrollHeight - chat.scrollTop - chat.clientHeight < 40;
  atualizacaoPendente = false;
  const y = window.scrollY; render(); window.scrollTo(0, y);
  const m2 = $("#msg-texto");
  if (m2 && rascunho !== null) { m2.value = rascunho; if (focado) m2.focus(); }
  const c2 = $("#chat-msgs"); if (c2 && noFim) c2.scrollTop = c2.scrollHeight;
}
document.addEventListener("focusout", () => setTimeout(() => {
  if (atualizacaoPendente && !$("#modal") && !(document.activeElement && document.activeElement.matches("input, textarea, select"))) atualizarSeOcioso();
}, 200));

/* =========================================================
   Workflows (formulários e botões): cada um chama a API
   ========================================================= */
function erroApi(e) {
  if (e.status === 401) {
    toast("Sua sessão expirou. Entre novamente.", "erro");
    Sync.forcar().catch(() => {}).finally(() => Nav.ir("#/entrar?voltar=" + encodeURIComponent(Nav.atual())));
    return;
  }
  toast(e.message, "erro");
  if (e.status === 409) Sync.forcar().then(atualizar).catch(() => {});
}

const FORMS = {
  async busca(form) {
    const v = lerForm(form);
    filtrosBusca.termo = v.termo;
    filtrosBusca.local = v.local;
    // Aceita CEP no campo de cidade: converte para a cidade pelo ViaCEP
    if (/^\d{5}-?\d{3}$/.test(v.local.trim())) {
      try { const r = await consultarCep(v.local); filtrosBusca.local = r.cidade; toast(`Buscando em ${r.cidade} - ${r.uf}.`); }
      catch (e) { toast(e.message, "erro"); filtrosBusca.local = ""; }
    }
    if (Nav.atual().startsWith("#/busca") || Nav.atual() === "#/") atualizar(); else Nav.ir("#/busca");
  },
  async login(form) {
    if (!validar(form)) return;
    const v = lerForm(form);
    await wfEntrar(v.email.trim(), v.senha);
  },
  async cadastro(form) {
    if (!validar(form)) return;
    const v = lerForm(form);
    try {
      await api("cadastro", { nome: v.nome, email: v.email, senha: v.senha, papel: v.papel, termos: !!v.termos });
    } catch (e) {
      if (e.status === 409) {
        const c = form.querySelector("[name=email]").closest(".campo");
        c.classList.add("invalido");
        c.querySelector(".erro-msg").textContent = e.message;
        return;
      }
      throw e;
    }
    await Sync.forcar();
    toast("Conta criada. Bem-vindo(a) ao Trabalink!", "ok");
    Nav.ir(v.papel === "profissional" ? "#/perfil-profissional" : "#/");
  },
  async recuperar(form) {
    if (!validar(form)) return;
    await api("recuperar", lerForm(form)).catch(() => {});
    toast("Se o e-mail estiver cadastrado, você receberá as instruções de redefinição.", "ok");
    Nav.ir("#/entrar");
  },
  async demanda(form) {
    if (!validar(form)) return;
    const v = lerForm(form);
    const anexos = [...(form.querySelector("[name=anexos]").files || [])].map(f => f.name);
    const r = await acao("demanda.salvar", { id: form.dataset.id || undefined, titulo: v.titulo, categoria_id: v.categoria_id, descricao: v.descricao, orcamento: v.orcamento, localizacao: v.localizacao, cep: v.cep, prazo: v.prazo, anexos });
    toast(form.dataset.id ? "Demanda atualizada." : "Demanda publicada. Os profissionais da categoria já podem enviar propostas.", "ok");
    Nav.ir("#/demandas/" + r.id);
  },
  async proposta(form) {
    if (!validar(form)) return;
    const v = lerForm(form);
    await acao("proposta.enviar", { demanda_id: form.dataset.demanda, valor: v.valor, prazo: v.prazo, mensagem: v.mensagem });
    toast("Proposta enviada ao contratante.", "ok");
    atualizar();
  },
  async mensagem(form) {
    const input = form.querySelector("[name=texto]");
    const texto = input.value.trim();
    if (!texto) return;
    input.value = "";
    try {
      await acao("mensagem.enviar", { contratacao_id: form.dataset.contratacao, texto });
    } catch (e) { input.value = texto; throw e; }
    atualizar();
    const c = $("#chat-msgs"); if (c) c.scrollTop = c.scrollHeight;
    const i = $("#msg-texto"); if (i) i.focus();
  },
  async avaliacao(form) {
    const v = lerForm(form);
    if (!v.nota) return toast("Escolha uma nota de 1 a 5.", "erro");
    await acao("avaliacao.criar", { contratacao_id: form.dataset.id, nota: v.nota, comentario: v.comentario });
    fecharModal();
    toast("Avaliação publicada. Obrigado!", "ok");
    atualizar();
  },
  async perfil(form) { await wfSalvarPerfil(form); },
  async servico(form) {
    if (!validar(form)) return;
    const v = lerForm(form);
    await acao("servico.salvar", { id: form.dataset.id || undefined, titulo: v.titulo, categoria_id: v.categoria_id, preco_inicial: v.preco_inicial, descricao: v.descricao, localizacao: v.localizacao, ativo: !!v.ativo });
    fecharModal(); toast("Serviço salvo.", "ok"); atualizarMantendoRascunho();
  },
  async item(form) {
    if (!validar(form)) return;
    const v = lerForm(form);
    const arquivo = await lerArquivo(form.querySelector("[name=arquivo]"));
    if (arquivo === null) return;
    await acao("portfolio.salvar", { id: form.dataset.id || undefined, titulo: v.titulo, descricao: v.descricao, arquivo: arquivo || undefined });
    fecharModal(); toast("Item do portfólio salvo.", "ok"); atualizarMantendoRascunho();
  },
  async conta(form) {
    if (!validar(form)) return;
    const v = lerForm(form);
    const foto = await lerArquivo(form.querySelector("[name=foto]"));
    if (foto === null) return;
    await acao("conta.salvar", { nome: v.nome, telefone: v.telefone, foto: foto || undefined });
    toast("Dados da conta atualizados.", "ok"); atualizar();
  }
};

async function wfEntrar(email, senha) {
  try { await api("login", { email, senha }); }
  catch (e) { return toast(e.message, "erro"); }
  await Sync.forcar();
  const u = Sessao.usuario();
  toast(`Olá, ${u.nome.split(" ")[0]}!`, "ok");
  const voltar = new URLSearchParams(Nav.atual().split("?")[1] || "").get("voltar");
  Nav.ir(voltar || (u.papel === "profissional" ? "#/painel" : "#/"));
}
async function wfSalvarPerfil(form) {
  form = form || $("[data-form=perfil]");
  if (!validar(form)) return toast("Revise os campos destacados.", "erro");
  await acao("perfil.salvar", lerForm(form));
  toast("Perfil salvo.", "ok"); atualizar();
}
function confirmar(titulo, texto, rotulo, act, id, extra = "") {
  const perigo = act.includes("cancel") || act.includes("recusar") || extra === "cancelada";
  abrirModal(titulo, `<p>${texto}</p><div class="modal-rodape"><button class="btn btn-contorno" data-act="fechar-modal">Voltar</button><button class="btn ${perigo ? "btn-perigo" : "btn-primario"}" data-act="${act}" data-id="${id}" data-para="${extra}" data-confirmado="1">${rotulo}</button></div>`);
}

const ACOES = {
  "menu"(el) { const n = $("#nav"); n.classList.toggle("aberto"); el.setAttribute("aria-expanded", n.classList.contains("aberto")); },
  "painel-notif"() { painelAberto = painelAberto === "notif" ? null : "notif"; renderHeader(Nav.caminho()); },
  "painel-conta"() { painelAberto = painelAberto === "conta" ? null : "conta"; renderHeader(Nav.caminho()); },
  "abrir-notif"(el) {
    const n = DB.obter("notificacao", el.dataset.id);
    painelAberto = null;
    if (!n.lida) acao("notificacao.lida", { id: n.id }).then(() => renderHeader(Nav.caminho())).catch(() => {});
    if (Nav.atual() === n.link) atualizar(); else Nav.ir(n.link);
  },
  async "notif-todas"() { await acao("notificacao.todas"); painelAberto = "notif"; renderHeader(Nav.caminho()); },
  async "sair"() { await api("sair", {}).catch(() => {}); await Sync.forcar(); toast("Você saiu da conta."); Nav.ir("#/"); },
  async "login-demo"(el) { await wfEntrar(el.dataset.email, "demo1234"); },
  "termos"() { abrirModal("Termos de uso", `<p>Versão acadêmica do Trabalink. Os dados informados são usados apenas para operar a plataforma: cadastro, busca, propostas, contratações e avaliações. Você pode atualizar seus dados a qualquer momento e solicitar a exclusão da conta.</p><div class="modal-rodape"><button class="btn btn-primario" data-act="fechar-modal">Entendi</button></div>`); },
  "fechar-modal"() { fecharModal(); if (atualizacaoPendente) atualizarSeOcioso(); },
  "limpar-filtros"() { Object.assign(filtrosBusca, { termo: "", local: "", categoria: "", preco: "", nota: "", disponibilidade: "", ordem: "relevancia" }); atualizar(); },
  async "cancelar-demanda"(el) {
    if (!el.dataset.confirmado) return confirmar("Cancelar demanda", "A demanda deixa de receber propostas e as propostas pendentes serão recusadas.", "Cancelar demanda", "cancelar-demanda", el.dataset.id);
    await acao("demanda.cancelar", { id: el.dataset.id });
    fecharModal(); toast("Demanda cancelada."); atualizar();
  },
  async "aceitar-proposta"(el) {
    if (!el.dataset.confirmado) {
      const r = DB.obter("proposta", el.dataset.id);
      return confirmar("Aceitar proposta", `Aceitar a proposta de <strong>${esc(Q.usuarioDoPerfil(r.perfil_profissional_id)?.nome)}</strong> por <strong>${brl(r.valor)}</strong>? As demais propostas desta demanda serão recusadas.`, "Aceitar e contratar", "aceitar-proposta", r.id);
    }
    const r = await acao("proposta.aceitar", { id: el.dataset.id });
    fecharModal();
    toast("Contratação criada. Combine os detalhes pela conversa.", "ok");
    Nav.ir("#/contratacoes/" + r.id);
  },
  async "recusar-proposta"(el) { await acao("proposta.recusar", { id: el.dataset.id }); toast("Proposta recusada."); atualizar(); },
  async "cancelar-proposta"(el) {
    if (!el.dataset.confirmado) return confirmar("Cancelar proposta", "O contratante não verá mais esta proposta.", "Cancelar proposta", "cancelar-proposta", el.dataset.id);
    await acao("proposta.cancelar", { id: el.dataset.id });
    fecharModal(); toast("Proposta cancelada."); atualizar();
  },
  async "status"(el) {
    const para = el.dataset.para;
    if (!el.dataset.confirmado) {
      const textos = { em_andamento: "Confirmar o início do serviço?", entregue: "Confirmar que o serviço foi entregue? O contratante será avisado para confirmar a conclusão.", concluida: "Confirmar que o serviço foi concluído? Depois disso, as duas partes podem avaliar.", cancelada: "Cancelar esta contratação? Essa ação não pode ser desfeita." };
      return confirmar("Atualizar status", textos[para], para === "cancelada" ? "Cancelar contratação" : "Confirmar", "status", el.dataset.id, para);
    }
    await acao("contratacao.status", { id: el.dataset.id, para });
    fecharModal(); toast(`Status atualizado: ${opcao("status_contratacao", para)}.`, "ok"); atualizar();
  },
  "avaliar"(el) {
    const c = DB.obter("contratacao", el.dataset.id);
    const pu = Q.usuarioDoPerfil(c.perfil_profissional_id);
    const outro = pu.id === Sessao.usuarioId ? DB.obter("usuario", c.contratante_id) : pu;
    abrirModal("Avaliar contratação", `<form class="form-grid" data-form="avaliacao" data-id="${c.id}">
      <p>Como foi a experiência com <strong>${esc(outro.nome)}</strong>?</p>
      <fieldset style="border:0;padding:0;margin:0"><legend class="rotulo" style="margin-bottom:6px">Nota</legend>
        <div class="seletor-nota">${[5, 4, 3, 2, 1].map(n => `<input type="radio" id="nota${n}" name="nota" value="${n}"><label for="nota${n}" title="${n} estrela${n > 1 ? "s" : ""}">★<span class="sr-only">${n} estrela${n > 1 ? "s" : ""}</span></label>`).join("")}</div></fieldset>
      ${campo("Comentário", `<textarea class="textarea" name="comentario" maxlength="500" placeholder="Conte como foi o serviço."></textarea>`)}
      <p class="pequeno suave">A avaliação é única e ficará visível no perfil (RN07).</p>
      <div class="modal-rodape"><button type="button" class="btn btn-contorno" data-act="fechar-modal">Cancelar</button><button class="btn btn-primario" type="submit">Publicar avaliação</button></div></form>`);
  },
  async "salvar-perfil"() { await wfSalvarPerfil(); },
  "secao"(el, e) {
    e.preventDefault();
    secaoPerfil = el.dataset.sec;
    document.querySelectorAll(".menu-lateral a").forEach(a => a.classList.toggle("ativo", a === el));
    const alvo = $("#sec-" + secaoPerfil);
    if (alvo) window.scrollTo({ top: alvo.getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" });
  },
  async "adicionar-hab"() {
    const input = $("#nova-hab"); const nome = input.value.trim(); if (!nome) return input.focus();
    guardarRascunhoPerfil();
    await acao("habilidade.adicionar", { nome });
    atualizarMantendoRascunho(); const i = $("#nova-hab"); if (i) i.focus();
  },
  async "remover-hab"(el) { guardarRascunhoPerfil(); await acao("habilidade.remover", { habilidade_id: el.dataset.id }); atualizarMantendoRascunho(); },
  "novo-servico"() { guardarRascunhoPerfil(); abrirModal("Novo serviço", formServico()); },
  "editar-servico"(el) { guardarRascunhoPerfil(); abrirModal("Editar serviço", formServico(DB.obter("servico", el.dataset.id))); },
  async "remover-servico"(el) { await acao("servico.remover", { id: el.dataset.id }); fecharModal(); toast("Serviço removido."); atualizarMantendoRascunho(); },
  async "ativar-servico"(el) {
    const ativo = el.checked;
    guardarRascunhoPerfil();
    try { await acao("servico.ativar", { id: el.dataset.id, ativo }); }
    catch (e) { el.checked = !ativo; throw e; }
    toast(ativo ? "Serviço ativado." : "Serviço desativado."); atualizarMantendoRascunho();
  },
  "novo-item"() { guardarRascunhoPerfil(); abrirModal("Adicionar item ao portfólio", formItem()); },
  "editar-item"(el) { guardarRascunhoPerfil(); abrirModal("Editar item do portfólio", formItem(DB.obter("portfolio", el.dataset.id))); },
  async "remover-item"(el) {
    if (!el.dataset.confirmado) { guardarRascunhoPerfil(); return confirmar("Remover item", "O item deixará de aparecer no perfil público.", "Remover", "remover-item", el.dataset.id, "cancelada"); }
    await acao("portfolio.remover", { id: el.dataset.id }); fecharModal(); toast("Item removido."); atualizarMantendoRascunho();
  },
  "excluir-conta"() { abrirModal("Solicitar exclusão", `<p>A solicitação inicia o procedimento de exclusão ou anonimização dos dados (RNF06). Nesta versão acadêmica, o pedido é tratado manualmente pela equipe.</p><div class="modal-rodape"><button class="btn btn-primario" data-act="fechar-modal">Entendi</button></div>`); },
  "estrutura"(el) { document.body.classList.toggle("mostrar-bb"); el.setAttribute("aria-pressed", document.body.classList.contains("mostrar-bb")); }
};

/* Mantém o que foi digitado em WF-08 ao adicionar habilidade, salvar serviço etc. */
let rascunhoPerfil = null;
function guardarRascunhoPerfil() { const f = $("[data-form=perfil]"); rascunhoPerfil = f ? lerForm(f) : null; }
function atualizarMantendoRascunho() {
  atualizar();
  const f = $("[data-form=perfil]");
  if (f && rascunhoPerfil) Object.entries(rascunhoPerfil).forEach(([k, v]) => { const el = f.querySelector(`[name="${k}"]`); if (el) el.value = v; });
  rascunhoPerfil = null;
}

/* ---------- Delegação de eventos ---------- */
let ocupado = false; // evita clique duplo enquanto a API responde
async function executar(fn, el) {
  if (ocupado) return;
  ocupado = true;
  const botao = el && (el.tagName === "BUTTON" ? el : el.querySelector ? el.querySelector("button[type=submit]") : null);
  if (botao) { botao.disabled = true; botao.setAttribute("aria-busy", "true"); }
  try { await fn(); }
  catch (e) { erroApi(e); }
  finally {
    ocupado = false;
    if (botao && botao.isConnected) { botao.disabled = false; botao.removeAttribute("aria-busy"); }
  }
}
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]");
  if (el && ACOES[el.dataset.act]) {
    if (el.tagName === "A" || el.tagName === "BUTTON") e.preventDefault();
    if (el.type === "checkbox") return; // tratado no change
    return executar(() => ACOES[el.dataset.act](el, e), el);
  }
  const link = e.target.closest('a[href^="#/"]');
  if (link) {
    e.preventDefault();
    painelAberto = null;
    const n = $("#nav"); if (n) n.classList.remove("aberto");
    return Nav.ir(link.getAttribute("href"));
  }
  if (painelAberto && !e.target.closest(".dropdown")) { painelAberto = null; renderHeader(Nav.caminho()); }
});
document.addEventListener("change", e => {
  const el = e.target;
  if (el.matches("[data-act=ativar-servico]")) return executar(() => ACOES["ativar-servico"](el));
  if (el.matches("[data-filtro]")) { filtrosBusca[el.name] = el.value; return atualizar(); }
  if (el.matches("[data-filtro-op]")) { filtrosOp[el.dataset.filtroOp] = el.type === "checkbox" ? el.checked : el.value; return atualizar(); }
});
document.addEventListener("input", e => {
  if (e.target.matches("[data-cep]")) return aoDigitarCep(e.target);
  const c = e.target.closest(".campo.invalido"); if (c) c.classList.remove("invalido");
});
document.addEventListener("submit", e => {
  const form = e.target.closest("[data-form]");
  if (!form || !FORMS[form.dataset.form]) return;
  e.preventDefault();
  executar(() => FORMS[form.dataset.form](form), form);
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { if ($("#modal")) ACOES["fechar-modal"](); else if (painelAberto) { painelAberto = null; renderHeader(Nav.caminho()); } }
});
window.addEventListener("hashchange", sincronizarRota);
window.addEventListener("popstate", sincronizarRota);

/* ---------- Início: carrega os dados do servidor e começa a sincronizar ---------- */
(async function iniciar() {
  $("#app").innerHTML = `<main class="pagina"><div class="cartao">${vazio("⏳", "Carregando o Trabalink…", "Conectando ao servidor.")}</div></main>`;
  try {
    await Sync.forcar();
  } catch (e) {
    $("#app").innerHTML = telaMensagem("Não foi possível conectar", e.message, `<button class="btn btn-primario" data-act="recarregar">Tentar de novo</button>`);
    return;
  }
  render();
  Sync.iniciar(atualizarSeOcioso);
})();
ACOES["recarregar"] = () => location.reload();
