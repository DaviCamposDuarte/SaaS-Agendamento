import { api, clearSession, currentUser, getToken, setSession } from "./api.js";
import { carregarUnidades, ehGerente, estado, nomeUnidade, setUnidade } from "./state.js";
import { $, $$, STATUS_ABERTOS, PERFIS, blocoErro, campo, carregando, esc, fecharModal, icon, mensagemErro } from "./ui.js";
import { hoje, iniciais, isoData } from "./util.js";

const app = document.getElementById("app");

const ROTAS = {
  dashboard: { rotulo: "Dashboard", icone: "grid", carregar: () => import("./pages/dashboard.js") },
  agenda: { rotulo: "Agenda", icone: "calendar", carregar: () => import("./pages/agenda.js"), badge: true },
  clientes: { rotulo: "Clientes", icone: "users", carregar: () => import("./pages/clientes.js") },
  profissionais: { rotulo: "Profissionais", icone: "briefcase", carregar: () => import("./pages/profissionais.js"), gerente: true },
  servicos: { rotulo: "Serviços", icone: "sparkles", carregar: () => import("./pages/servicos.js"), gerente: true },
  unidades: { rotulo: "Unidades", icone: "building", carregar: () => import("./pages/unidades.js"), gerente: true },
  financeiro: { rotulo: "Financeiro", icone: "wallet", carregar: () => import("./pages/financeiro.js"), gerente: true },
  relatorios: { rotulo: "Relatórios", icone: "chart", carregar: () => import("./pages/relatorios.js"), gerente: true },
  configuracoes: { rotulo: "Configurações", icone: "settings", carregar: () => import("./pages/configuracoes.js"), gerente: true },
};
const rotasVisiveis = () => Object.entries(ROTAS).filter(([, r]) => !r.gerente || ehGerente());

// ------------------------------------------------------------------ login
function telaLogin(aviso = "") {
  fecharModal();
  app.className = "";
  app.innerHTML = `
    <div class="login-wrap">
      <form class="login-card" id="form-login" novalidate>
        <div class="login-brand"><div class="brand-mark">B</div><div><strong>Barbershop</strong><span>Gestão inteligente</span></div></div>
        <h1>Entrar</h1>
        <p class="sub">Acesse a agenda e o painel da sua barbearia.</p>
        <div id="login-erro">${aviso ? `<div class="form-erro">${esc(aviso)}</div>` : ""}</div>
        ${campo("E-mail", '<input type="email" id="login-email" autocomplete="username" placeholder="voce@exemplo.com" required />')}
        ${campo("Senha", '<input type="password" id="login-senha" autocomplete="current-password" placeholder="Sua senha" required />')}
        <button class="primary-button" type="submit">Entrar</button>
      </form>
    </div>`;
  $("#login-email").focus();
  $("#form-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const botao = $("button[type=submit]", e.target);
    botao.disabled = true;
    try {
      const dados = await api.post("/auth/login", { email: $("#login-email").value, senha: $("#login-senha").value });
      setSession(dados.token, dados.usuario);
      await iniciar();
    } catch (err) {
      $("#login-erro").innerHTML = blocoErro(err);
      botao.disabled = false;
    }
  });
}

function sair() {
  clearSession();
  telaLogin();
}
window.addEventListener("sessao-expirada", () => telaLogin("Sua sessão expirou. Entre novamente."));

// ------------------------------------------------------------------ shell
function htmlShell() {
  const usuario = currentUser();
  const empresa = estado.empresa?.nome ?? "Barbershop";
  return `
    <div class="mobile-overlay" id="ov-menu"></div>
    <aside class="sidebar" id="sidebar">
      <div class="brand">
        <div class="brand-mark">${esc(iniciais(empresa)[0])}</div>
        <div><strong>${esc(empresa)}</strong><span>Gestão inteligente</span></div>
        <button class="icon-button sidebar-close" id="fechar-menu" aria-label="Fechar menu">${icon("close")}</button>
      </div>
      <div class="nav-label">MENU PRINCIPAL</div>
      <nav>
        ${rotasVisiveis().map(([chave, r]) => `
          <button class="nav-item" data-rota="${chave}">${icon(r.icone)}<span>${r.rotulo}</span>${r.badge ? '<span class="nav-badge" id="badge-agenda" hidden></span>' : ""}</button>`).join("")}
      </nav>
      <div class="sidebar-footer"><div class="version">BARBERSHOP · V0.1</div></div>
    </aside>
    <div class="app-content">
      <header class="topbar">
        <button class="icon-button mobile-menu" id="abrir-menu" aria-label="Abrir menu">${icon("menu")}</button>
        <div class="unit-select" id="unit-select">
          <button class="unit-trigger" id="unit-trigger">
            <span class="unit-icon">${icon("building", 17)}</span>
            <span><small>Unidade</small><span id="unit-nome">${esc(nomeUnidade())}</span></span>
            ${icon("arrowDown", 15)}
          </button>
          <div class="dropdown unit-menu" id="unit-menu" hidden></div>
        </div>
        <div class="header-actions">
          <div class="notification-wrap">
            <button class="icon-button notification-button" id="notif-btn" aria-label="Notificações">${icon("bell")}</button>
            <div class="dropdown notification-menu" id="notif-menu" hidden>
              <div class="notification-head"><strong>Notificações</strong></div>
              <div class="notif-vazio">Nenhuma notificação por enquanto.<br />Avisos de agendamentos e pagamentos aparecerão aqui.</div>
            </div>
          </div>
          <div class="header-separator"></div>
          <div class="notification-wrap">
            <button class="profile-button" id="perfil-btn">
              <div class="avatar">${esc(iniciais(usuario.nome))}</div>
              <div class="profile-copy"><strong>${esc(usuario.nome)}</strong><span>${esc(PERFIS[usuario.perfil] ?? usuario.perfil)}</span></div>
              ${icon("arrowDown", 14)}
            </button>
            <div class="dropdown profile-menu" id="perfil-menu" hidden>
              <div class="info"><strong>${esc(usuario.nome)}</strong><span>${esc(usuario.email)}</span></div>
              <button id="btn-sair">${icon("logout", 16)}Sair</button>
            </div>
          </div>
        </div>
      </header>
      <main><div id="view"></div></main>
    </div>`;
}

function desenharMenuUnidades() {
  const itens = [{ id: null, nome: "Todas as unidades" }, ...estado.unidades];
  $("#unit-menu").innerHTML = itens
    .map((u) => `<button data-unidade="${u.id ?? ""}" class="${(estado.unidadeId ?? null) === u.id ? "selected" : ""}"><span>${esc(u.nome)}</span>${(estado.unidadeId ?? null) === u.id ? '<span class="check">✓</span>' : ""}</button>`)
    .join("");
  $("#unit-nome").textContent = nomeUnidade();
}

function montarShell() {
  app.className = "app-shell";
  app.innerHTML = htmlShell();
  desenharMenuUnidades();

  const menuLateral = (abrir) => {
    $("#sidebar").classList.toggle("open", abrir);
    $("#ov-menu").classList.toggle("show", abrir);
  };
  $("#abrir-menu").addEventListener("click", () => menuLateral(true));
  $("#fechar-menu").addEventListener("click", () => menuLateral(false));
  $("#ov-menu").addEventListener("click", () => menuLateral(false));

  $$(".nav-item").forEach((b) =>
    b.addEventListener("click", () => {
      menuLateral(false);
      if (location.hash === `#/${b.dataset.rota}`) rotear();
      else location.hash = `#/${b.dataset.rota}`;
    })
  );

  const dropdowns = ["#unit-menu", "#notif-menu", "#perfil-menu"];
  const alternar = (id) => dropdowns.forEach((d) => { const el = $(d); el.hidden = d === id ? !el.hidden : true; });
  $("#unit-trigger").addEventListener("click", () => alternar("#unit-menu"));
  $("#notif-btn").addEventListener("click", () => alternar("#notif-menu"));
  $("#perfil-btn").addEventListener("click", () => alternar("#perfil-menu"));
  document.addEventListener("mousedown", (e) => {
    if (!e.target.closest(".unit-select, .notification-wrap")) dropdowns.forEach((d) => { const el = $(d); if (el) el.hidden = true; });
  });

  $("#unit-menu").addEventListener("click", (e) => {
    const b = e.target.closest("[data-unidade]");
    if (!b) return;
    setUnidade(b.dataset.unidade ? Number(b.dataset.unidade) : null);
    desenharMenuUnidades();
    $("#unit-menu").hidden = true;
    rotear();
  });
  $("#btn-sair").addEventListener("click", sair);
}

// ----------------------------------------------------------------- rotas
async function atualizarBadge() {
  const el = $("#badge-agenda");
  if (!el) return;
  try {
    const lista = await api.get("/agendamentos", { data: isoData(hoje()), unidade_id: estado.unidadeId });
    const n = lista.filter((a) => STATUS_ABERTOS.includes(a.status)).length;
    el.textContent = n;
    el.hidden = n === 0;
  } catch {
    el.hidden = true;
  }
}

async function rotear() {
  const pedida = (location.hash.replace(/^#\/?/, "") || "dashboard").split("?")[0];
  const chave = ROTAS[pedida] && (!ROTAS[pedida].gerente || ehGerente()) ? pedida : "dashboard";

  $$(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.rota === chave));
  const view = $("#view");
  if (!view) return;
  const alvo = document.createElement("div"); // cada navegação ganha um contêiner novo: respostas atrasadas não sobrescrevem a tela atual
  alvo.innerHTML = carregando();
  view.replaceChildren(alvo);
  window.scrollTo({ top: 0 });

  try {
    const modulo = await ROTAS[chave].carregar();
    await modulo.render(alvo, { recarregar: rotear });
  } catch (err) {
    if (err.status === 401) return;
    alvo.innerHTML = `<div class="placeholder-card"><h2>Não foi possível carregar</h2><p>${esc(mensagemErro(err))}</p><button class="secondary-button" id="tentar">Tentar de novo</button></div>`;
    $("#tentar", alvo)?.addEventListener("click", rotear);
    console.error(err);
  }
  atualizarBadge();
}

window.addEventListener("unidades-alteradas", async () => {
  try {
    await carregarUnidades();
    if ($("#unit-menu")) desenharMenuUnidades();
  } catch {
    /* mantém a lista anterior */
  }
});

window.addEventListener("hashchange", () => {
  if ($("#view")) rotear();
});

// ------------------------------------------------------------------ boot
async function iniciar() {
  if (!getToken()) return telaLogin();
  try {
    const me = await api.get("/auth/me");
    setSession(getToken(), me.usuario);
    estado.empresa = me.empresa;
    await carregarUnidades();
    montarShell();
    await rotear();
  } catch (err) {
    if (err.status === 401) return telaLogin();
    app.className = "";
    app.innerHTML = `<div class="login-wrap"><div class="login-card"><h1>Não foi possível iniciar</h1><p class="sub">${esc(mensagemErro(err))}</p><button class="primary-button" id="recarregar">Tentar de novo</button></div></div>`;
    $("#recarregar").addEventListener("click", iniciar);
  }
}

iniciar();
