import { $, $$, esc } from "../ui.js";
import { addDias, hoje, isoData, parseData } from "../util.js";

// Período compartilhado entre Financeiro e Relatórios (continua o mesmo ao trocar de tela)
const inicioMes = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
export const periodo = { preset: "mes", inicio: inicioMes(hoje()), fim: hoje() };

const PRESETS = {
  mes: { rotulo: "Este mês", calcular: () => [inicioMes(hoje()), hoje()] },
  anterior: {
    rotulo: "Mês passado",
    calcular: () => {
      const h = hoje();
      return [new Date(h.getFullYear(), h.getMonth() - 1, 1), new Date(h.getFullYear(), h.getMonth(), 0)];
    },
  },
  "30d": { rotulo: "Últimos 30 dias", calcular: () => [addDias(hoje(), -29), hoje()] },
  ano: { rotulo: "Este ano", calcular: () => [new Date(hoje().getFullYear(), 0, 1), hoje()] },
};

export const paramsPeriodo = () => ({ data_inicio: isoData(periodo.inicio), data_fim: isoData(periodo.fim) });

export function htmlBarraPeriodo() {
  return `<section class="agenda-toolbar" id="barra-periodo">
    <div class="view-tabs">${Object.entries(PRESETS)
      .map(([k, p]) => `<button data-preset="${k}" class="${periodo.preset === k ? "active" : ""}">${esc(p.rotulo)}</button>`)
      .join("")}</div>
    <div class="grupo">
      <label class="mini-label">De <input type="date" id="per-ini" value="${isoData(periodo.inicio)}" /></label>
      <label class="mini-label">até <input type="date" id="per-fim" value="${isoData(periodo.fim)}" /></label>
    </div>
  </section>`;
}

export function ligarBarraPeriodo(raiz, aoMudar) {
  $$("[data-preset]", raiz).forEach((b) =>
    b.addEventListener("click", () => {
      periodo.preset = b.dataset.preset;
      [periodo.inicio, periodo.fim] = PRESETS[periodo.preset].calcular();
      aoMudar();
    })
  );
  const datas = () => {
    const ini = $("#per-ini", raiz).value;
    const fim = $("#per-fim", raiz).value;
    if (!ini || !fim || fim < ini) return;
    periodo.preset = "custom";
    periodo.inicio = parseData(ini);
    periodo.fim = parseData(fim);
    aoMudar();
  };
  $("#per-ini", raiz).addEventListener("change", datas);
  $("#per-fim", raiz).addEventListener("change", datas);
}
