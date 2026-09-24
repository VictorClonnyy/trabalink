/* =========================================================
   Camada de dados do navegador
   O servidor é a fonte da verdade. O navegador guarda só uma cópia
   do que o usuário pode ver (DB) e a atualiza sozinho (Sync):
   a cada 3 s na conversa, 8 s nas demais telas, 25 s em aba oculta.
   ========================================================= */

async function api(rota, corpo) {
  let r;
  try {
    r = await fetch("/api/" + rota, corpo === undefined
      ? { credentials: "same-origin" }
      : { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  } catch (e) {
    throw new Error("Sem conexão com o servidor. Verifique a internet e tente de novo.");
  }
  let j = {};
  try { j = await r.json(); } catch (e) { /* resposta vazia */ }
  if (!r.ok) {
    const erro = new Error(j.erro || "Erro inesperado (" + r.status + ").");
    erro.status = r.status;
    throw erro;
  }
  return j;
}
/* Executa uma ação no servidor e recarrega os dados. */
async function acao(nome, corpo = {}) {
  const r = await api("acao/" + nome, corpo);
  await Sync.recarregar();
  return r;
}

const VAZIO = { usuario: [], perfil_profissional: [], habilidade: [], profissional_habilidade: [], portfolio: [], servico: [], demanda: [], proposta: [], contratacao: [], conversa: [], mensagem: [], avaliacao: [], notificacao: [] };
const DB = {
  dados: JSON.parse(JSON.stringify(VAZIO)),
  todos(t) { return this.dados[t] || []; },
  obter(t, id) { return this.todos(t).find(r => r.id === id) || null; },
  filtrar(t, fn) { return this.todos(t).filter(fn); }
};

const Sessao = {
  eu: null,
  get usuarioId() { return this.eu ? this.eu.id : null; },
  usuario() { return this.eu ? (DB.obter("usuario", this.eu.id) ? Object.assign({}, DB.obter("usuario", this.eu.id), this.eu) : this.eu) : null; }
};

const Sync = {
  versao: 0,
  timer: null,
  carregado: false,
  offline: false,
  async recarregar() {
    const uid = Sessao.usuarioId || "";
    const r = await api(`estado?versao=${this.versao}&uid=${encodeURIComponent(uid)}`);
    this.offline = false;
    if (!r.mudou) return false;
    this.versao = r.versao;
    Sessao.eu = r.eu;
    DB.dados = Object.assign(JSON.parse(JSON.stringify(VAZIO)), r.dados);
    this.carregado = true;
    return true;
  },
  forcar() { this.versao = 0; return this.recarregar(); },
  intervalo() {
    if (document.hidden) return 25000;
    return Nav.caminho().startsWith("contratacoes") ? 3000 : 8000;
  },
  iniciar(aoMudar) {
    const ciclo = async () => {
      try {
        if (await this.recarregar()) aoMudar();
      } catch (e) {
        if (!this.offline) { this.offline = true; toast(e.message, "erro"); }
      }
      this.timer = setTimeout(ciclo, this.intervalo());
    };
    this.timer = setTimeout(ciclo, this.intervalo());
    document.addEventListener("visibilitychange", () => { if (!document.hidden) { clearTimeout(this.timer); ciclo(); } });
  }
};

/* ---------- ViaCEP (pela API do Trabalink, com consulta direta como reserva) ---------- */
const cacheCep = {};
async function consultarCep(cep) {
  cep = String(cep || "").replace(/\D/g, "");
  if (cep.length !== 8) throw new Error("Informe um CEP com 8 dígitos.");
  if (cacheCep[cep]) return cacheCep[cep];
  try {
    cacheCep[cep] = await api("cep?cep=" + cep);
  } catch (e) {
    if (e.status === 404 || e.status === 400) throw e;
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`).then(x => x.json()).catch(() => null);
    if (!r) throw new Error("Não foi possível consultar o CEP agora. Preencha a localização manualmente.");
    if (r.erro) throw new Error("CEP não encontrado.");
    cacheCep[cep] = { cep: r.cep, logradouro: r.logradouro, bairro: r.bairro, cidade: r.localidade, uf: r.uf };
  }
  return cacheCep[cep];
}
