import { api } from "../api.js";
import { estado, nomeUnidade } from "../state.js";
import { $, brl, esc, vazio } from "../ui.js";
import {
  cartaoMetrica, fatiasFormas, graficoBarras, graficoLinha, graficoRosca, ligarGrafico, ligarRosca, pontosDiarios,
} from "../components/graficos.js";
import { htmlBarraPeriodo, ligarBarraPeriodo, paramsPeriodo } from "../components/periodo.js";
import { irParaDia } from "./agenda.js";

let modoGrafico = "linha"; // lembra a escolha ao trocar de período

export async function render(el, { recarregar }) {
  el.innerHTML = `
    <section class="page-intro">
      <div><p class="eyebrow">FINANCEIRO</p><h1>Faturamento</h1><p>Entradas por período, forma de pagamento e unidade · ${esc(nomeUnidade())}</p></div>
    </section>
    ${htmlBarraPeriodo()}
    <div id="fin-corpo"><div class="carregando">Carregando...</div></div>`;
  ligarBarraPeriodo(el, recarregar);

  const params = { ...paramsPeriodo(), unidade_id: estado.unidadeId };
  const [r, diario, formas, unidades] = await Promise.all([
    api.get("/relatorios/resumo", params),
    api.get("/relatorios/faturamento-diario", params),
    api.get("/relatorios/por-forma-pagamento", params),
    api.get("/relatorios/por-unidade", params),
  ]);

  const v = r.variacao_pct;
  const pontos = pontosDiarios(diario);
  const temReceita = pontos.some((p) => p.valor > 0);
  const fatias = fatiasFormas(formas);

  $("#fin-corpo", el).innerHTML = `
    <section class="metrics-grid">
      ${cartaoMetrica({ titulo: "Faturamento", valor: brl(r.faturamento), icone: "wallet", tendencia: v, negativo: v !== null && v < 0, texto: v === null ? "sem período anterior" : "vs. período anterior" })}
      ${cartaoMetrica({ titulo: "Receita dos atendimentos", valor: brl(r.receita_atendimentos), icone: "chart", texto: "serviços concluídos" })}
      ${cartaoMetrica({ titulo: "Ticket médio", valor: brl(r.ticket_medio), icone: "users", texto: "por atendimento" })}
      ${cartaoMetrica({ titulo: "Atendimentos", valor: String(r.atendimentos), icone: "calendar", texto: "concluídos no período" })}
    </section>
    <section class="chart-card revenue-card" style="margin-bottom:14px">
      <div class="card-heading"><div><h2>Faturamento por dia</h2><p>Passe o mouse para ver os valores · clique em um dia para abrir a agenda</p></div>
        ${temReceita ? `<div class="chart-tools"><div class="view-tabs" id="modo-grafico">
          <button data-modo="linha" class="${modoGrafico === "linha" ? "active" : ""}">Linha</button>
          <button data-modo="barras" class="${modoGrafico === "barras" ? "active" : ""}">Barras</button></div></div>` : ""}</div>
      <div id="fin-grafico">${temReceita ? "" : vazio("Sem pagamentos no período", "Os valores aparecem quando atendimentos são concluídos.")}</div>
    </section>
    <section class="duas-colunas">
      <div class="chart-card" style="min-height:0">
        <div class="card-heading"><div><h2>Por forma de pagamento</h2><p>Passe o mouse sobre a rosca ou a legenda</p></div></div>
        <div id="fin-rosca">${fatias.some((f) => f.valor > 0) ? graficoRosca(fatias) : vazio("Nenhum pagamento no período")}</div>
      </div>
      <div class="appointments-card">
        <div class="card-heading appointment-heading"><div><h2>Por unidade</h2><p>Faturamento e atendimentos</p></div></div>
        ${unidades.length ? `<div class="table-wrap"><table class="tabela-compacta"><thead><tr><th>UNIDADE</th><th class="num">FATURAMENTO</th><th class="num">ATEND.</th><th class="num">TICKET</th></tr></thead>
          <tbody>${unidades.map((u) => `<tr><td><strong style="color:var(--ink)">${esc(u.unidade)}</strong></td><td class="num">${brl(u.faturamento)}</td><td class="num">${u.atendimentos}</td><td class="num">${brl(u.ticket_medio)}</td></tr>`).join("")}</tbody></table></div>` : vazio("Sem unidades")}
      </div>
    </section>
    <p class="nota-rodape">Faturamento = pagamentos recebidos no período (caixa). Receita = valor dos serviços dos atendimentos concluídos no período. Os dois costumam coincidir; diferem quando há sinal pago de um atendimento ainda não concluído.</p>`;

  const desenharGrafico = () => {
    const alvo = $("#fin-grafico", el);
    alvo.innerHTML = modoGrafico === "barras" ? graficoBarras(pontos) : graficoLinha(pontos);
    ligarGrafico(alvo, pontos, { aoClicar: (p) => irParaDia(p.data) });
  };
  if (temReceita) {
    desenharGrafico();
    el.querySelectorAll("#modo-grafico [data-modo]").forEach((b) =>
      b.addEventListener("click", () => {
        modoGrafico = b.dataset.modo;
        el.querySelectorAll("#modo-grafico [data-modo]").forEach((x) => x.classList.toggle("active", x === b));
        desenharGrafico();
      })
    );
  }
  if (fatias.some((f) => f.valor > 0)) ligarRosca($("#fin-rosca", el), fatias);
}
