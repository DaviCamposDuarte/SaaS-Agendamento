import { brl, esc, icon, FORMAS } from "../ui.js";
import { compacto, escalaGrafico, indicePorFracao, parseData, posicaoX } from "../util.js";

const BASE = 145; // altura útil do gráfico (px) = altura do <svg>
const ALT = 125; // altura do maior valor
const W = 550;

export function cartaoMetrica({ titulo, valor, icone, tendencia = null, texto = "", negativo = false }) {
  const t =
    tendencia === null || tendencia === undefined
      ? ""
      : `<span class="trend ${negativo ? "negative" : ""}">${icon(negativo ? "arrowDown" : "arrowUp", 12)}${esc(String(Math.abs(tendencia)).replace(".", ","))}%</span>`;
  return `<article class="metric-card">
    <div class="metric-top"><span>${esc(titulo)}</span><div class="metric-icon">${icon(icone)}</div></div>
    <strong class="metric-value">${esc(valor)}</strong>
    <div class="metric-foot">${t}<span>${esc(texto)}</span></div>
  </article>`;
}

/** Converte /relatorios/faturamento-diario em pontos para os gráficos. */
export function pontosDiarios(diario) {
  const longo = diario.length > 31;
  return diario.map((d) => ({
    data: d.data,
    rotulo: longo ? `${d.data.slice(8)}/${d.data.slice(5, 7)}` : String(Number(d.data.slice(8))),
    valor: Number(d.faturamento),
    titulo: parseData(d.data).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" }),
    linhas: [
      ["Faturamento", brl(d.faturamento)],
      ["Atendimentos", String(d.atendimentos)],
    ],
  }));
}

// ----------------------------------------------------------------- linha / barras
function eixos(pontos, modo) {
  const max = Math.max(0, ...pontos.map((p) => p.valor));
  const { passo, topo } = escalaGrafico(max);
  const n = pontos.length;
  const y = (v) => BASE - (v / topo) * ALT;
  const grade = [0, 1, 2, 3].map((k) => `<line x1="0" y1="${y(k * passo).toFixed(1)}" x2="${W}" y2="${y(k * passo).toFixed(1)}"/>`).join("");
  const cada = Math.max(1, Math.ceil(n / 8));
  const rotulosX = pontos
    .map((p, i) => (i % cada === 0 ? `<span style="position:absolute;left:${posicaoX(i, n, modo)}%;transform:translateX(-50%)">${esc(p.rotulo)}</span>` : ""))
    .join("");
  const rotulosY = [3, 2, 1, 0].map((k) => `<span>${compacto(k * passo)}</span>`).join("");
  return { passo, topo, y, grade, rotulosX, rotulosY, n };
}

const camadaInterativa = '<div class="chart-guide" hidden></div><div class="chart-dot" hidden></div><div class="chart-tip" hidden></div><div class="chart-hit"></div>';

// pontos: [{rotulo, valor, titulo, linhas:[[rotulo, valor]]}]
export function graficoLinha(pontos, { aria = "Gráfico de faturamento" } = {}) {
  const { topo, y, grade, rotulosX, rotulosY, n } = eixos(pontos, "linha");
  const x = (i) => (n <= 1 ? W / 2 : (i * W) / (n - 1));
  const linha = pontos.map((p, i) => `${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
  const area = n > 1 ? `<polygon points="0,${BASE} ${linha} ${W},${BASE}" class="chart-area"/>` : "";
  return `<div class="line-chart" data-modo="linha" data-topo="${topo}">
    <div class="y-labels">${rotulosY}</div>
    <svg viewBox="0 0 ${W} ${BASE}" preserveAspectRatio="none" role="img" aria-label="${esc(aria)}">${grade}${area}<polyline points="${linha}" class="chart-line"/></svg>
    ${camadaInterativa}
    <div class="x-labels">${rotulosX}</div>
  </div>`;
}

export function graficoBarras(pontos, { aria = "Gráfico de faturamento" } = {}) {
  const { topo, grade, rotulosX, rotulosY } = eixos(pontos, "barras");
  const barras = pontos
    .map((p) => `<span class="bar" style="height:${((p.valor / topo) * ALT * 100) / BASE}%"></span>`)
    .join("");
  return `<div class="line-chart" data-modo="barras" data-topo="${topo}">
    <div class="y-labels">${rotulosY}</div>
    <svg viewBox="0 0 ${W} ${BASE}" preserveAspectRatio="none" role="img" aria-label="${esc(aria)}">${grade}</svg>
    <div class="bars">${barras}</div>
    ${camadaInterativa}
    <div class="x-labels">${rotulosX}</div>
  </div>`;
}

/**
 * Liga o mouse/toque ao gráfico: guia vertical, destaque do ponto e tooltip.
 * aoClicar(ponto) é opcional (ex.: abrir a agenda do dia clicado).
 */
export function ligarGrafico(raiz, pontos, { aoClicar } = {}) {
  const graf = raiz.querySelector(".line-chart");
  if (!graf || !pontos.length) return;
  const modo = graf.dataset.modo;
  const topo = Number(graf.dataset.topo);
  const n = pontos.length;
  const hit = graf.querySelector(".chart-hit");
  const tip = graf.querySelector(".chart-tip");
  const guia = graf.querySelector(".chart-guide");
  const dot = graf.querySelector(".chart-dot");
  const barras = [...graf.querySelectorAll(".bar")];
  let atual = -1;

  const esconder = () => {
    atual = -1;
    tip.hidden = guia.hidden = dot.hidden = true;
    barras.forEach((b) => b.classList.remove("ativa"));
  };

  const mostrar = (i) => {
    atual = i;
    const p = pontos[i];
    const x = posicaoX(i, n, modo);
    const yv = BASE - (p.valor / topo) * ALT;
    barras.forEach((b, k) => b.classList.toggle("ativa", k === i));
    if (modo === "linha") {
      guia.hidden = dot.hidden = false;
      guia.style.left = dot.style.left = `${x}%`;
      dot.style.top = `${yv}px`;
    }
    tip.innerHTML = `<strong>${esc(p.titulo ?? p.rotulo)}</strong>${(p.linhas ?? [["Valor", String(p.valor)]])
      .map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`)
      .join("")}${aoClicar ? "<em>Clique para abrir o dia</em>" : ""}`;
    tip.hidden = false;
    tip.style.left = `${x}%`;
    tip.style.transform = x > 70 ? "translateX(-100%)" : x < 30 ? "translateX(0)" : "translateX(-50%)";
    const altTip = tip.offsetHeight || 80;
    tip.style.top = `${yv - altTip - 12 >= -4 ? yv - altTip - 12 : yv + 14}px`;
  };

  const indice = (e) => {
    const r = hit.getBoundingClientRect();
    return indicePorFracao((e.clientX - r.left) / (r.width || 1), n, modo);
  };
  hit.addEventListener("pointermove", (e) => {
    const i = indice(e);
    if (i !== atual) mostrar(i);
  });
  hit.addEventListener("pointerdown", (e) => mostrar(indice(e)));
  hit.addEventListener("pointerleave", esconder);
  if (aoClicar) {
    hit.style.cursor = "pointer";
    hit.addEventListener("click", (e) => aoClicar(pontos[indice(e)]));
  }
}

// ----------------------------------------------------------------- rosca
const CORES = ["#245e52", "#47719a", "#b17a2f", "#9183b2", "#bc564f", "#709abb"];

// fatias: [{nome, valor, texto}]
export function graficoRosca(fatias, { rotuloTotal = "Total", formatar = brl } = {}) {
  const total = fatias.reduce((t, f) => t + f.valor, 0);
  if (!(total > 0)) return "";
  const R = 70;
  const C = 2 * Math.PI * R;
  let acc = 0;
  const segs = fatias
    .map((f, i) => {
      const len = Math.max(0, (f.valor / total) * C - (fatias.length > 1 ? 2 : 0));
      const seg = `<circle class="donut-seg" data-i="${i}" cx="100" cy="100" r="${R}" fill="none" stroke="${CORES[i % CORES.length]}" stroke-width="26"
        stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}" transform="rotate(-90 100 100)"><title>${esc(f.nome)}</title></circle>`;
      acc += (f.valor / total) * C;
      return seg;
    })
    .join("");
  return `<div class="donut-wrap" data-total="${total}">
    <div class="donut"><svg viewBox="0 0 200 200" role="img" aria-label="${esc(rotuloTotal)} por categoria">${segs}</svg>
      <div class="donut-centro"><small>${esc(rotuloTotal)}</small><strong>${esc(formatar(total))}</strong><span>&nbsp;</span></div></div>
    <ul class="donut-legenda">${fatias
      .map((f, i) => `<li data-i="${i}"><i style="background:${CORES[i % CORES.length]}"></i><div><strong>${esc(f.nome)}</strong><small>${esc(f.texto ?? "")}</small></div><b>${((f.valor / total) * 100).toFixed(0)}%</b></li>`)
      .join("")}</ul></div>`;
}

export function ligarRosca(raiz, fatias, { rotuloTotal = "Total", formatar = brl } = {}) {
  const wrap = raiz.querySelector(".donut-wrap");
  if (!wrap) return;
  const total = fatias.reduce((t, f) => t + f.valor, 0);
  const centro = wrap.querySelector(".donut-centro");
  const itens = [...wrap.querySelectorAll("[data-i]")];
  const mostrar = (i) => {
    const f = fatias[i];
    itens.forEach((el) => {
      const ativo = Number(el.dataset.i) === i;
      el.classList.toggle("ativa", ativo);
      el.classList.toggle("dim", !ativo);
    });
    centro.innerHTML = `<small>${esc(f.nome)}</small><strong>${esc(formatar(f.valor))}</strong><span>${((f.valor / total) * 100).toFixed(1).replace(".", ",")}% do total</span>`;
  };
  const limpar = () => {
    itens.forEach((el) => el.classList.remove("ativa", "dim"));
    centro.innerHTML = `<small>${esc(rotuloTotal)}</small><strong>${esc(formatar(total))}</strong><span>&nbsp;</span>`;
  };
  itens.forEach((el) => {
    el.addEventListener("pointerenter", () => mostrar(Number(el.dataset.i)));
    el.addEventListener("pointerleave", limpar);
  });
}

export const fatiasFormas = (formas) =>
  formas.map((f) => ({ nome: FORMAS[f.forma] ?? f.forma, valor: Number(f.total), texto: `${brl(f.total)} · ${f.quantidade}x` }));

// ------------------------------------------------------------------ barras de progresso
// itens: [{nome, texto, pct}]
export function listaProgresso(itens) {
  return `<div class="service-list">${itens
    .map(
      (it, i) => `<div class="service-row" title="${esc(it.nome)} — ${esc(it.texto)}"><span class="service-rank">${String(i + 1).padStart(2, "0")}</span>
        <div class="service-info"><div><strong>${esc(it.nome)}</strong><span>${esc(it.texto)}</span></div>
        <div class="progress"><span style="width:${Math.max(2, Math.min(100, it.pct))}%"></span></div></div></div>`
    )
    .join("")}</div>`;
}
