import { api, currentUser } from "../api.js";
import { ehGerente, estado, nomeUnidade } from "../state.js";
import { $, STATUS_ABERTOS, blocoErro, brl, esc, icon, pct } from "../ui.js";
import { capitalizar, hoje, isoData } from "../util.js";
import { cartaoMetrica, graficoLinha, ligarGrafico, listaProgresso, pontosDiarios } from "../components/graficos.js";
import { irParaDia } from "./agenda.js";
import { tabelaAgendamentos, ligarTabela } from "../components/tabela-agendamentos.js";
import { abrirDetalhe } from "../components/detalhe-agendamento.js";
import { abrirNovoAgendamento } from "../components/novo-agendamento.js";

const saudacao = () => {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
};

export async function render(el, { recarregar }) {
  const usuario = currentUser();
  const gerente = ehGerente();
  const dia = hoje();
  const inicioMes = new Date(dia.getFullYear(), dia.getMonth(), 1);
  const uid = estado.unidadeId;
  const periodo = { data_inicio: isoData(inicioMes), data_fim: isoData(dia), unidade_id: uid };

  const [agenda, resumo, diario, servicos] = await Promise.all([
    api.get("/agendamentos", { data: isoData(dia), unidade_id: uid }),
    gerente ? api.get("/relatorios/resumo", periodo) : null,
    gerente ? api.get("/relatorios/faturamento-diario", periodo) : null,
    gerente ? api.get("/relatorios/servicos-mais-vendidos", { ...periodo, limite: 5 }) : null,
  ]);

  const validos = agenda.filter((a) => !["cancelado", "faltou"].includes(a.status));
  const abertos = agenda.filter((a) => STATUS_ABERTOS.includes(a.status));
  const aReceber = abertos.reduce((t, a) => t + Number(a.saldo), 0);

  let metricas;
  if (gerente) {
    const v = resumo.variacao_pct;
    metricas = [
      cartaoMetrica({ titulo: "Agendamentos hoje", valor: String(validos.length), icone: "calendar", texto: `${abertos.length} em aberto` }),
      cartaoMetrica({ titulo: "Faturamento no mês", valor: brl(resumo.faturamento), icone: "wallet", tendencia: v, negativo: v !== null && v < 0, texto: v === null ? "sem período anterior" : "vs. período anterior" }),
      cartaoMetrica({ titulo: "Novos clientes", valor: String(resumo.clientes.novos), icone: "users", texto: `${resumo.clientes.recorrentes} recorrentes no mês` }),
      cartaoMetrica({ titulo: "Cancelamentos", valor: String(resumo.agendamentos.por_status.cancelado ?? 0), icone: "close", texto: `taxa de ${pct(resumo.taxa_cancelamento_pct)}` }),
    ];
  } else {
    metricas = [
      cartaoMetrica({ titulo: "Agendamentos hoje", valor: String(validos.length), icone: "calendar", texto: "sem cancelados" }),
      cartaoMetrica({ titulo: "Em aberto", valor: String(abertos.length), icone: "clock", texto: "aguardando atendimento" }),
      cartaoMetrica({ titulo: "Concluídos", valor: String(agenda.filter((a) => a.status === "concluido").length), icone: "check", texto: "hoje" }),
      cartaoMetrica({ titulo: "A receber hoje", valor: brl(aReceber), icone: "wallet", texto: "dos atendimentos em aberto" }),
    ];
  }

  let graficos = "";
  let pontos = [];
  if (gerente) {
    pontos = pontosDiarios(diario);
    const temReceita = diario.some((d) => Number(d.faturamento) > 0);
    const v = resumo.variacao_pct;
    const maxQtd = Math.max(1, ...servicos.map((s) => s.quantidade));
    graficos = `<section class="charts-grid">
      <div class="chart-card revenue-card">
        <div class="card-heading"><div><h2>Faturamento</h2><p>Pagamentos recebidos no mês, por dia</p></div></div>
        <div class="revenue-summary"><strong>${brl(resumo.faturamento)}</strong>
          ${v === null ? "" : `<span class="trend ${v < 0 ? "negative" : ""}">${icon(v < 0 ? "arrowDown" : "arrowUp", 12)}${esc(String(Math.abs(v)).replace(".", ","))}%</span><span>vs. período anterior</span>`}</div>
        ${temReceita ? graficoLinha(pontos) : '<div class="vazio"><strong>Sem pagamentos no mês</strong><span>Os valores aparecem aqui quando atendimentos forem concluídos.</span></div>'}
      </div>
      <div class="chart-card services-card">
        <div class="card-heading"><div><h2>Serviços mais realizados</h2><p>Este mês</p></div></div>
        ${servicos.length ? listaProgresso(servicos.map((s) => ({ nome: s.servico, texto: `${s.quantidade} atendimentos`, pct: (s.quantidade / maxQtd) * 100 }))) : '<div class="vazio"><strong>Nenhum atendimento concluído</strong></div>'}
      </div>
    </section>`;
  }

  el.innerHTML = `
    <section class="page-intro">
      <div><p class="eyebrow">VISÃO GERAL</p><h1>Olá, ${esc(usuario.nome.split(" ")[0])}. ${saudacao()}!</h1><p>Acompanhe a operação de hoje.</p></div>
      <button class="primary-button" id="novo-ag">${icon("plus", 18)}Novo agendamento</button>
    </section>
    <section class="metrics-grid">${metricas.join("")}</section>
    ${graficos}
    <section class="appointments-card">
      <div class="card-heading appointment-heading">
        <div><h2>Agenda de hoje</h2><p>${esc(capitalizar(dia.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })))} · ${esc(nomeUnidade())}</p></div>
        <a class="link-button" href="#/agenda">Ver agenda completa ${icon("arrowRight", 15)}</a>
      </div>
      <div id="tabela-hoje">${tabelaAgendamentos(agenda, { vazioTexto: "Nenhum agendamento para hoje", vazioSub: "Clique em “Novo agendamento” para começar." })}</div>
    </section>`;

  if (pontos.some((p) => p.valor > 0)) ligarGrafico($(".revenue-card", el), pontos, { aoClicar: (p) => irParaDia(p.data) });
  $("#novo-ag", el).addEventListener("click", () => abrirNovoAgendamento({ onSaved: recarregar }));
  ligarTabela(el, (id) => abrirDetalhe(id, { onChange: recarregar }));
}
