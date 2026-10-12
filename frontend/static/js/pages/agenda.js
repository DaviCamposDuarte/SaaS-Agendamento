import { api } from "../api.js";
import { estado } from "../state.js";
import { $, $$, STATUS, chipStatus, esc, icon, opcoes } from "../ui.js";
import {
  MIN_VISUAL_MIN, addDias, addMeses, capitalizar, gradeMes, hoje, hora, iniciais, isoData, mesmoDia,
  minParaHora, minutosDoDia, nomeCurto, normalizar, organizarFaixas, parseData, segundaDaSemana,
} from "../util.js";
import { tabelaAgendamentos, ligarTabela } from "../components/tabela-agendamentos.js";
import { abrirDetalhe } from "../components/detalhe-agendamento.js";
import { abrirNovoAgendamento } from "../components/novo-agendamento.js";

// Estado da tela (continua o mesmo quando você sai e volta)
const ag = { view: "dia", ref: hoje(), prof: "", busca: "" };
const H = 80; // altura de uma hora na grade (px)
const LARGURA_COLUNA = 190; // largura mínima de cada coluna (px); abaixo disso a grade rola na horizontal
const DIAS_CURTOS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
const APAGADOS = ["cancelado", "faltou"];
const COR_STATUS = { agendado: "#b98b4a", confirmado: "#529380", em_atendimento: "#709abb", concluido: "#9183b2" };

/** Usado por outros gráficos/telas: abre a agenda no dia pedido. */
export function irParaDia(data) {
  ag.view = "dia";
  ag.prof = "";
  ag.ref = typeof data === "string" ? parseData(data) : data;
  location.hash = "#/agenda";
}

const unicoDia = () => ag.view === "dia" || ag.view === "lista";

function intervalo() {
  const r = ag.ref;
  if (unicoDia()) return { inicio: r, fim: r };
  if (ag.view === "semana") {
    const seg = segundaDaSemana(r);
    return { inicio: seg, fim: addDias(seg, 6) };
  }
  return { inicio: new Date(r.getFullYear(), r.getMonth(), 1), fim: new Date(r.getFullYear(), r.getMonth() + 1, 0) };
}

function titulo() {
  const { inicio, fim } = intervalo();
  if (unicoDia()) return capitalizar(ag.ref.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
  if (ag.view === "mes") return capitalizar(ag.ref.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }));
  const mes = (d) => d.toLocaleDateString("pt-BR", { month: "long" });
  return inicio.getMonth() === fim.getMonth()
    ? `${inicio.getDate()} — ${fim.getDate()} de ${mes(fim)}, ${fim.getFullYear()}`
    : `${inicio.getDate()} de ${mes(inicio).slice(0, 3)} — ${fim.getDate()} de ${mes(fim).slice(0, 3)}, ${fim.getFullYear()}`;
}

const passo = (direcao) => {
  if (unicoDia()) ag.ref = addDias(ag.ref, direcao);
  else if (ag.view === "semana") ag.ref = addDias(ag.ref, 7 * direcao);
  else ag.ref = addMeses(ag.ref, direcao);
};

// ---------------------------------------------------------------- grade de horários
function faixaDeHoras(agendamentos) {
  let h0 = 8;
  let h1 = 19;
  agendamentos.forEach((a) => {
    h0 = Math.min(h0, Math.floor(minutosDoDia(a.inicio) / 60));
    h1 = Math.max(h1, Math.ceil(minutosDoDia(a.fim) / 60));
  });
  return { h0, h1: Math.min(h1, 24) };
}

function htmlEvento({ a, ini, fim, lane, total }, h0, mostrarProf) {
  const topo = ((ini - h0 * 60) / 60) * H + 1;
  const alt = ((fim - ini) / 60) * H - 3;
  // quanto menor o cartão (ou mais estreito), menos texto: nada de texto cortado e sobreposto
  const nivel = total >= 3 || alt < 44 ? 1 : alt < 68 ? 2 : 3;
  const servicos = a.servicos.map((s) => s.nome).join(" + ");
  const nome = esc(a.cliente.nome);
  const conteudo =
    nivel === 1
      ? `<strong><b>${hora(a.inicio)}</b> ${nome}</strong>`
      : nivel === 2
        ? `<strong>${nome}</strong><span>${hora(a.inicio)} · ${esc(servicos)}</span>`
        : `<strong>${nome}</strong><span>${esc(servicos)}</span><small>${hora(a.inicio)}–${hora(a.fim)}${mostrarProf ? ` · ${esc(nomeCurto(a.profissional.nome))}` : ""}</small>`;
  const dica = `${a.cliente.nome} — ${servicos}\n${hora(a.inicio)}–${hora(a.fim)} · ${a.profissional.nome} · ${STATUS[a.status].rotulo}`;
  return `<div class="calendar-event ev-${nivel} ${STATUS[a.status].evento}${APAGADOS.includes(a.status) ? " muted" : ""}" data-ag="${a.id}" role="button" tabindex="0"
    title="${esc(dica)}" style="top:${topo}px;height:${alt}px;left:calc(${(lane * 100) / total}% + 2px);width:calc(${100 / total}% - 4px)">${conteudo}</div>`;
}

/**
 * colunas: [{chave, cabecalho, classe?, eventos:[agendamento], mostrarProf?, hoje?}]
 * Cada coluna é um dia (visão semanal de um profissional) ou um profissional (visão do dia).
 */
function htmlGrade(colunas, { h0, h1 }) {
  const n = colunas.length;
  const largura = 52 + n * LARGURA_COLUNA;
  const agora = new Date();
  const agoraMin = agora.getHours() * 60 + agora.getMinutes();
  const horas = Array.from({ length: h1 - h0 });

  const cabecalho = colunas.map((c) => `<div class="${c.classe ?? ""}">${c.cabecalho}</div>`).join("");
  const eixo = horas.map((_, i) => `<span style="top:${i * H}px">${String(h0 + i).padStart(2, "0")}:00</span>`).join("");
  const corpo = colunas
    .map((c) => {
      const eventos = organizarFaixas(
        c.eventos.map((a) => {
          const ini = minutosDoDia(a.inicio);
          return { a, ini, fim: Math.max(minutosDoDia(a.fim), ini + MIN_VISUAL_MIN) };
        })
      );
      const agoraLinha = c.hoje && agoraMin >= h0 * 60 && agoraMin <= h1 * 60 ? `<div class="now-line" style="top:${((agoraMin - h0 * 60) / 60) * H}px"></div>` : "";
      return `<div class="day-column" data-chave="${esc(c.chave)}">${horas.map(() => '<div class="hour-cell"></div>').join("")}${eventos.map((e) => htmlEvento(e, h0, c.mostrarProf)).join("")}${agoraLinha}</div>`;
    })
    .join("");
  const legenda = Object.entries(COR_STATUS).map(([s, cor]) => `<span><i style="background:${cor}"></i>${STATUS[s].rotulo}</span>`).join("");

  return `<section class="calendar-card" style="--h:${H}px">
    <div class="calendar-head" style="grid-template-columns:52px repeat(${n},minmax(${LARGURA_COLUNA}px,1fr));min-width:${largura}px"><div></div>${cabecalho}</div>
    <div class="calendar-body" style="height:${(h1 - h0) * H}px;min-width:${largura}px"><div class="time-axis">${eixo}</div>
      <div class="calendar-grid" style="grid-template-columns:repeat(${n},minmax(${LARGURA_COLUNA}px,1fr))">${corpo}</div></div>
    <div class="legenda">${legenda}<span style="margin-left:auto">Clique em um horário vazio para agendar</span></div>
  </section>`;
}

function ligarGrade(corpo, h0, aoClicarVazio, abrir) {
  $$(".calendar-event", corpo).forEach((ev) => {
    ev.addEventListener("click", (e) => {
      e.stopPropagation();
      abrir(Number(ev.dataset.ag));
    });
    ev.addEventListener("keydown", (e) => {
      if (e.key === "Enter") abrir(Number(ev.dataset.ag));
    });
  });
  $$(".day-column", corpo).forEach((col) =>
    col.addEventListener("click", (e) => {
      if (e.target.closest(".calendar-event")) return;
      const y = e.clientY - col.getBoundingClientRect().top;
      const min = Math.floor((h0 * 60 + (y / H) * 60) / 30) * 30;
      aoClicarVazio(col.dataset.chave, minParaHora(min));
    })
  );
}

export async function render(el, { recarregar }) {
  const { inicio, fim } = intervalo();
  const [lista, profs] = await Promise.all([
    api.get("/agendamentos", {
      data_inicio: isoData(inicio),
      data_fim: isoData(fim),
      unidade_id: estado.unidadeId,
      profissional_id: ag.prof || null,
    }),
    api.get("/profissionais", { unidade_id: estado.unidadeId }),
  ]);

  el.innerHTML = `
    <section class="page-intro">
      <div><p class="eyebrow">ORGANIZAÇÃO</p><h1>Agenda</h1><p>Visualize e gerencie os agendamentos da equipe.</p></div>
      <button class="primary-button" id="novo-ag">${icon("plus", 18)}Novo agendamento</button>
    </section>
    <section class="agenda-toolbar">
      <div class="view-tabs">${[["dia", "Dia"], ["semana", "Semana"], ["mes", "Mês"], ["lista", "Lista"]].map(([k, r]) => `<button data-view="${k}" class="${ag.view === k ? "active" : ""}">${r}</button>`).join("")}</div>
      <div class="date-nav">
        <button class="icon-button" id="nav-ant" aria-label="Anterior">${icon("arrowLeft", 17)}</button>
        <strong>${esc(titulo())}</strong>
        <button class="icon-button" id="nav-prox" aria-label="Próximo">${icon("arrowRight", 17)}</button>
        <button class="secondary-button small" id="nav-hoje">Hoje</button>
      </div>
      <div class="grupo">
        <select id="f-prof" aria-label="Profissional">${opcoes(profs.map((p) => [p.id, p.nome]), ag.prof, { vazio: "Todos os profissionais" })}</select>
        <label class="search-box">${icon("search", 17)}<input id="f-busca" placeholder="Buscar cliente..." value="${esc(ag.busca)}" /></label>
      </div>
    </section>
    <div id="agenda-corpo"></div>`;

  const corpo = $("#agenda-corpo", el);
  const abrir = (id) => abrirDetalhe(id, { onChange: recarregar });
  const novoEm = (opcoesNovo) => abrirNovoAgendamento({ ...opcoesNovo, onSaved: recarregar });
  const filtrada = () => {
    const q = normalizar(ag.busca);
    return q ? lista.filter((a) => normalizar(a.cliente.nome).includes(q)) : lista;
  };
  const nomeUn = (id) => (estado.unidades.length > 1 ? estado.unidades.find((u) => u.id === id)?.nome ?? "" : "");

  function desenhar() {
    const dados = filtrada();
    if (ag.view === "dia") desenharDia(dados);
    else if (ag.view === "semana") (ag.prof ? desenharSemanaGrade : desenharSemanaLista)(dados);
    else if (ag.view === "mes") desenharMes(dados);
    else desenharLista(dados);
  }

  // ------------------------------------------------ dia: uma coluna por profissional
  function desenharDia(dados) {
    let equipe = ag.prof ? profs.filter((p) => String(p.id) === ag.prof) : [...profs];
    const conhecidos = new Set(equipe.map((p) => p.id));
    dados.forEach((a) => {
      if (!conhecidos.has(a.profissional.id)) {
        conhecidos.add(a.profissional.id);
        equipe.push({ id: a.profissional.id, nome: a.profissional.nome, unidade_id: a.unidade_id });
      }
    });
    equipe.sort((x, y) => x.unidade_id - y.unidade_id || x.nome.localeCompare(y.nome));
    if (!equipe.length) {
      corpo.innerHTML = '<section class="appointments-card"><div class="vazio"><strong>Nenhum profissional cadastrado</strong><span>Cadastre a equipe na aba Profissionais.</span></div></section>';
      return;
    }
    const ehHoje = mesmoDia(ag.ref, hoje());
    const colunas = equipe.map((p) => {
      const eventos = dados.filter((a) => a.profissional.id === p.id);
      const ativos = eventos.filter((a) => !APAGADOS.includes(a.status)).length;
      return {
        chave: String(p.id),
        classe: "col-prof-head",
        cabecalho: `<span class="mini-avatar">${esc(iniciais(p.nome))}</span><div><strong>${esc(p.nome)}</strong><small>${[nomeUn(p.unidade_id), `${ativos} agend.`].filter(Boolean).map(esc).join(" · ")}</small></div>`,
        eventos,
        hoje: ehHoje,
      };
    });
    const faixa = faixaDeHoras(dados);
    corpo.innerHTML = htmlGrade(colunas, faixa);
    ligarGrade(corpo, faixa.h0, (chave, hhmm) => {
      const prof = equipe.find((p) => String(p.id) === chave);
      novoEm({ data: isoData(ag.ref), hora: hhmm, profissionalId: prof.id, unidadeId: prof.unidade_id });
    }, abrir);
  }

  // ------------------------------------------- semana (um profissional): grade por dia
  function desenharSemanaGrade(dados) {
    const seg = intervalo().inicio;
    const porDia = {};
    dados.forEach((a) => (porDia[a.inicio.slice(0, 10)] ||= []).push(a));
    const nDias = (porDia[isoData(addDias(seg, 6))] || []).length ? 7 : 6;
    const prof = profs.find((p) => String(p.id) === ag.prof);
    const colunas = Array.from({ length: nDias }, (_, i) => {
      const d = addDias(seg, i);
      const dia = isoData(d);
      return {
        chave: dia,
        classe: mesmoDia(d, hoje()) ? "today hoje-col" : "",
        cabecalho: `<span>${DIAS_CURTOS[i]}</span><strong>${d.getDate()}</strong>`,
        eventos: porDia[dia] || [],
        hoje: mesmoDia(d, hoje()),
      };
    });
    const faixa = faixaDeHoras(dados);
    corpo.innerHTML = htmlGrade(colunas, faixa);
    ligarGrade(corpo, faixa.h0, (chave, hhmm) => novoEm({ data: chave, hora: hhmm, profissionalId: prof?.id, unidadeId: prof?.unidade_id }), abrir);
  }

  // ------------------------------------ semana (todos): lista legível por dia
  function desenharSemanaLista(dados) {
    const seg = intervalo().inicio;
    const porDia = {};
    dados.forEach((a) => (porDia[a.inicio.slice(0, 10)] ||= []).push(a));
    const nDias = (porDia[isoData(addDias(seg, 6))] || []).length ? 7 : 6;
    const dias = Array.from({ length: nDias }, (_, i) => {
      const d = addDias(seg, i);
      const dia = isoData(d);
      const itens = porDia[dia] || [];
      const ativos = itens.filter((a) => !APAGADOS.includes(a.status)).length;
      return `<div class="week-day${mesmoDia(d, hoje()) ? " hoje" : ""}">
        <button class="week-head" data-dia="${dia}" title="Abrir o dia"><span>${DIAS_CURTOS[i]}</span><strong>${d.getDate()}</strong><small>${ativos} agend.</small></button>
        <div class="week-items">${itens.length ? itens.map((a) => `<button class="week-item ${STATUS[a.status].evento}${APAGADOS.includes(a.status) ? " muted" : ""}" data-ag="${a.id}">
            <b>${hora(a.inicio)}</b><span class="nome">${esc(a.cliente.nome)}</span><small>${esc(a.servicos.map((s) => s.nome).join(" + "))} · ${esc(nomeCurto(a.profissional.nome))}</small></button>`).join("") : '<p class="dica" style="padding:10px 4px">Sem agendamentos</p>'}</div></div>`;
    }).join("");
    corpo.innerHTML = `<p class="dica" style="margin:0 0 10px">Escolha um profissional no filtro para ver a semana em grade de horários, ou clique no dia para ver a equipe lado a lado.</p>
      <section class="week-scroll"><div class="week-list" style="grid-template-columns:repeat(${nDias},minmax(190px,1fr))">${dias}</div></section>`;
    $$("[data-ag]", corpo).forEach((b) => b.addEventListener("click", () => abrir(Number(b.dataset.ag))));
    $$("[data-dia]", corpo).forEach((b) => b.addEventListener("click", () => {
      ag.view = "dia";
      ag.ref = parseData(b.dataset.dia);
      recarregar();
    }));
  }

  // -------------------------------------------------------------- mês
  function desenharMes(dados) {
    const { inicio: gi, semanas } = gradeMes(ag.ref);
    const contagem = {};
    dados.filter((a) => !APAGADOS.includes(a.status)).forEach((a) => {
      const k = a.inicio.slice(0, 10);
      contagem[k] = (contagem[k] || 0) + 1;
    });
    const celulas = Array.from({ length: semanas * 7 }, (_, i) => {
      const d = addDias(gi, i);
      const dentro = d.getMonth() === ag.ref.getMonth();
      const n = contagem[isoData(d)] || 0;
      return `<button class="month-cell${dentro ? "" : " fora"}${mesmoDia(d, hoje()) ? " hoje" : ""}" ${dentro ? `data-dia="${isoData(d)}"` : "disabled"}>
        <span class="n">${d.getDate()}</span>${dentro && n ? `<span class="qtd">${n} agend.</span>` : ""}</button>`;
    }).join("");
    corpo.innerHTML = `<section class="appointments-card month-card">
      <div class="month-week-head">${DIAS_CURTOS.map((d) => `<div>${d}</div>`).join("")}</div>
      <div class="month-grid">${celulas}</div></section>`;
    $$("[data-dia]", corpo).forEach((b) =>
      b.addEventListener("click", () => {
        ag.view = "dia";
        ag.ref = parseData(b.dataset.dia);
        recarregar();
      })
    );
  }

  // ------------------------------------------------------------- lista
  function desenharLista(dados) {
    const ativos = dados.filter((a) => !APAGADOS.includes(a.status)).length;
    corpo.innerHTML = `<section class="appointments-card alternate-view">
      <div class="card-heading"><div><h2>${esc(titulo())}</h2><p>${ativos} agendamento${ativos === 1 ? "" : "s"} ativo${ativos === 1 ? "" : "s"}${dados.length !== ativos ? ` · ${dados.length - ativos} cancelado/falta` : ""}</p></div></div>
      ${tabelaAgendamentos(dados, { vazioTexto: "Nenhum agendamento neste dia", vazioSub: "Use “Novo agendamento” para marcar um horário." })}</section>`;
    ligarTabela(corpo, abrir);
  }

  // ------------------------------------------------------- eventos
  $$("[data-view]", el).forEach((b) =>
    b.addEventListener("click", () => {
      ag.view = b.dataset.view;
      recarregar();
    })
  );
  $("#nav-ant", el).addEventListener("click", () => { passo(-1); recarregar(); });
  $("#nav-prox", el).addEventListener("click", () => { passo(1); recarregar(); });
  $("#nav-hoje", el).addEventListener("click", () => { ag.ref = hoje(); recarregar(); });
  $("#f-prof", el).addEventListener("change", (e) => { ag.prof = e.target.value; recarregar(); });
  $("#f-busca", el).addEventListener("input", (e) => { ag.busca = e.target.value; desenhar(); });
  $("#novo-ag", el).addEventListener("click", () => novoEm({ data: unicoDia() ? isoData(ag.ref) : null }));

  desenhar();
}
