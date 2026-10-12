import { api } from "../api.js";
import { estado, nomeUnidade } from "../state.js";
import { $, brl, esc, pct, vazio } from "../ui.js";
import { iniciais } from "../util.js";
import { cartaoMetrica, listaProgresso } from "../components/graficos.js";
import { htmlBarraPeriodo, ligarBarraPeriodo, paramsPeriodo } from "../components/periodo.js";
import { STATUS } from "../ui.js";

export async function render(el, { recarregar }) {
  el.innerHTML = `
    <section class="page-intro">
      <div><p class="eyebrow">INDICADORES</p><h1>Relatórios</h1><p>Equipe, serviços e clientes · ${esc(nomeUnidade())}</p></div>
    </section>
    ${htmlBarraPeriodo()}
    <div id="rel-corpo"><div class="carregando">Carregando...</div></div>`;
  ligarBarraPeriodo(el, recarregar);

  const params = { ...paramsPeriodo(), unidade_id: estado.unidadeId };
  const [r, profs, servicos] = await Promise.all([
    api.get("/relatorios/resumo", params),
    api.get("/relatorios/por-profissional", params),
    api.get("/relatorios/servicos-mais-vendidos", { ...params, limite: 10 }),
  ]);

  const maxQtd = Math.max(1, ...servicos.map((s) => s.quantidade));
  const porStatus = Object.entries(r.agendamentos.por_status);
  const totalComissoes = profs.reduce((t, p) => t + Number(p.comissao), 0);

  $("#rel-corpo", el).innerHTML = `
    <section class="metrics-grid">
      ${cartaoMetrica({ titulo: "Taxa de faltas", valor: pct(r.taxa_faltas_pct), icone: "close", texto: "entre os atendimentos do período" })}
      ${cartaoMetrica({ titulo: "Taxa de cancelamento", valor: pct(r.taxa_cancelamento_pct), icone: "calendar", texto: `de ${r.agendamentos.total} agendamentos` })}
      ${cartaoMetrica({ titulo: "Clientes atendidos", valor: String(r.clientes.atendidos), icone: "users", texto: "com atendimento concluído" })}
      ${cartaoMetrica({ titulo: "Novos / recorrentes", valor: `${r.clientes.novos} / ${r.clientes.recorrentes}`, icone: "sparkles", texto: "primeira visita no período" })}
    </section>

    <section class="appointments-card" style="margin-bottom:14px">
      <div class="card-heading appointment-heading"><div><h2>Desempenho por profissional</h2><p>Receita dos atendimentos concluídos e comissão a pagar</p></div></div>
      ${profs.length ? `<div class="table-wrap"><table class="tabela-compacta">
        <thead><tr><th>PROFISSIONAL</th><th class="num">ATEND.</th><th class="num">RECEITA</th><th class="num">TICKET</th><th class="num">FALTAS</th><th class="num">% COM.</th><th class="num">COMISSÃO</th></tr></thead>
        <tbody>${profs.map((p) => `<tr><td><div class="client-cell"><span class="mini-avatar">${esc(iniciais(p.profissional))}</span><strong>${esc(p.profissional)}</strong></div></td>
          <td class="num">${p.atendimentos}</td><td class="num">${brl(p.receita)}</td><td class="num">${brl(p.ticket_medio)}</td><td class="num">${p.faltas}</td>
          <td class="num">${Number(p.comissao_pct).toFixed(0)}%</td><td class="num"><strong style="color:var(--ink)">${brl(p.comissao)}</strong></td></tr>`).join("")}
          <tr><td colspan="6"><strong style="color:var(--ink)">Total de comissões</strong></td><td class="num"><strong style="color:var(--ink)">${brl(totalComissoes)}</strong></td></tr></tbody></table></div>`
        : vazio("Nenhum profissional com movimento")}
    </section>

    <section class="duas-colunas">
      <div class="chart-card" style="min-height:0">
        <div class="card-heading"><div><h2>Serviços mais vendidos</h2><p>Por receita no período</p></div></div>
        ${servicos.length ? listaProgresso(servicos.map((s) => ({ nome: s.servico, texto: `${s.quantidade}x · ${brl(s.receita)}`, pct: (s.quantidade / maxQtd) * 100 }))) : vazio("Nenhum serviço concluído")}
      </div>
      <div class="chart-card" style="min-height:0">
        <div class="card-heading"><div><h2>Agendamentos por status</h2><p>Que começaram no período</p></div></div>
        ${porStatus.length ? `<div class="linhas" style="margin-top:6px">${porStatus.map(([s, n]) => `<div class="linha"><span>${esc(STATUS[s]?.rotulo ?? s)}</span><strong>${n}</strong></div>`).join("")}</div>` : vazio("Nenhum agendamento")}
      </div>
    </section>`;
}
