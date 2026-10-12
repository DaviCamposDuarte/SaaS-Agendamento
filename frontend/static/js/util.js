// Funções puras (sem DOM): datas, valores, texto e layout da agenda.

export const pad = (n) => String(n).padStart(2, "0");
export const isoData = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseData(texto) {
  const [a, m, d] = texto.split("-").map(Number);
  return new Date(a, m - 1, d);
}
export function hoje() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
export const addDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const addMeses = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
export const mesmoDia = (a, b) => isoData(a) === isoData(b);

// A API manda "2026-10-20T14:30:00" (horário local, sem fuso): fatiar o texto evita
// qualquer conversão de fuso do navegador.
export const hora = (iso) => (iso ? iso.slice(11, 16) : "");
export const dataBR = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");
export const minutosDoDia = (iso) => Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
export const horaParaMin = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
export const minParaHora = (min) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;

export const capitalizar = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : "");
export const normalizar = (t) =>
  String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function iniciais(nome) {
  const p = String(nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
export function nomeCurto(nome) {
  const p = String(nome ?? "").trim().split(/\s+/).filter(Boolean);
  return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0] ?? "";
}

// "35,50" | "35.50" | "R$ 1.234,50" -> número com 2 casas (NaN se inválido)
export function parseValor(texto) {
  let s = String(texto ?? "").replace(/[^\d,.-]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) && s !== "" ? Math.round(n * 100) / 100 : NaN;
}
export const valorParaInput = (n) => Number(n).toFixed(2).replace(".", ",");
export const centavos = (n) => Math.round(Number(n) * 100);

// Distribui eventos que se sobrepõem em "faixas" lado a lado.
// eventos: [{ini, fim}] em minutos. Devolve os mesmos objetos com lane/total.
export function organizarFaixas(eventos) {
  const ordenados = [...eventos].sort((a, b) => a.ini - b.ini || a.fim - b.fim);
  const saida = [];
  let grupo = [];
  let fimGrupo = -1;
  let fimsFaixas = [];

  const fechar = () => {
    const total = grupo.length ? Math.max(...grupo.map((e) => e.lane)) + 1 : 1;
    grupo.forEach((e) => (e.total = total));
    saida.push(...grupo);
    grupo = [];
  };

  for (const e of ordenados) {
    if (e.ini >= fimGrupo) {
      fechar();
      fimsFaixas = [];
      fimGrupo = -1;
    }
    let lane = fimsFaixas.findIndex((fim) => fim <= e.ini);
    if (lane === -1) {
      lane = fimsFaixas.length;
      fimsFaixas.push(e.fim);
    } else {
      fimsFaixas[lane] = e.fim;
    }
    e.lane = lane;
    grupo.push(e);
    fimGrupo = Math.max(fimGrupo, e.fim);
  }
  fechar();
  return saida;
}

// Grade do mês (semanas começando na segunda). Devolve {inicio, semanas}
export function gradeMes(ref) {
  const primeiro = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const diasNoMes = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
  const offset = (primeiro.getDay() + 6) % 7;
  return { inicio: addDias(primeiro, -offset), semanas: Math.ceil((offset + diasNoMes) / 7) };
}

export const segundaDaSemana = (d) => addDias(d, -((d.getDay() + 6) % 7));

// Escala "bonita" para eixo Y: 3 intervalos iguais (ex.: 0, 5k, 10k, 15k)
export function escalaGrafico(max) {
  if (!(max > 0)) return { passo: 1, topo: 3 };
  const alvo = max / 3;
  const pot = 10 ** Math.floor(Math.log10(alvo));
  const m = alvo / pot;
  const bonito = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
  const passo = bonito * pot;
  return { passo, topo: passo * 3 };
}
export function compacto(v) {
  if (v >= 1000) {
    const k = v / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1).replace(".", ",")}k`;
  }
  return String(Math.round(v));
}

// ---- gráficos interativos
// frac = posição do mouse dentro do gráfico (0 a 1) -> índice do ponto mais próximo
export function indicePorFracao(frac, n, modo = "linha") {
  if (n <= 0) return -1;
  const f = Math.min(1, Math.max(0, frac));
  if (modo === "barras") return Math.min(n - 1, Math.floor(f * n));
  return n <= 1 ? 0 : Math.round(f * (n - 1));
}
// posição horizontal (em %) do ponto i
export function posicaoX(i, n, modo = "linha") {
  if (modo === "barras") return ((i + 0.5) / n) * 100;
  return n <= 1 ? 50 : (i / (n - 1)) * 100;
}
// Cards curtos ocupam, no mínimo, este tempo na grade (evita sobreposição visual)
export const MIN_VISUAL_MIN = 20;
