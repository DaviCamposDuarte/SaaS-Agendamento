import { hora } from "./util.js";

const ICONES = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  calendar: '<path d="M8 2v4M16 2v4M3 9h18"/><rect x="3" y="4" width="18" height="17" rx="2"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/>',
  sparkles: '<path d="m12 3 1.4 3.6L17 8l-3.6 1.4L12 13l-1.4-3.6L7 8l3.6-1.4L12 3ZM5 14l.9 2.1L8 17l-2.1.9L5 20l-.9-2.1L2 17l2.1-.9L5 14ZM19 13l.9 2.1L22 16l-2.1.9L19 19l-.9-2.1L16 16l2.1-.9L19 13Z"/>',
  building: '<path d="M3 21h18M6 21V5l6-3v19M18 21V9l-6-2M8.5 8h1M8.5 12h1M8.5 16h1M15 12h1M15 16h1"/>',
  wallet: '<path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h16v10a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6"/><path d="M16 14h2"/>',
  chart: '<path d="M3 3v18h18M7 16l4-5 4 3 5-7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.37.26.61.66.6 1.1v.1h1v4h-.1a1.7 1.7 0 0 0-1.5.8Z"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  arrowUp: '<path d="m18 15-6-6-6 6"/>',
  arrowDown: '<path d="m6 9 6 6 6-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  more: '<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>',
  arrowLeft: '<path d="m15 18-6-6 6-6"/>',
  arrowRight: '<path d="m9 18 6-6-6-6"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
};

export const icon = (nome, tamanho = 19) =>
  `<svg width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] ?? ""}</svg>`;

// Todo texto vindo da API/usuário passa por aqui antes de entrar no HTML (evita XSS).
export const esc = (valor) =>
  String(valor ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
export const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];

export function debounce(fn, ms = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export const brl = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const pct = (v) => `${Number(v || 0).toFixed(1).replace(".", ",")}%`;
export const telefone = (d) => {
  const t = String(d ?? "");
  if (t.length === 11) return `(${t.slice(0, 2)}) ${t.slice(2, 7)}-${t.slice(7)}`;
  if (t.length === 10) return `(${t.slice(0, 2)}) ${t.slice(2, 6)}-${t.slice(6)}`;
  return t;
};

// tom = cor do chip na tabela; evento = cor do bloco no calendário
export const STATUS = {
  agendado: { rotulo: "Agendado", tom: "amber", evento: "amber" },
  confirmado: { rotulo: "Confirmado", tom: "green", evento: "sage" },
  em_atendimento: { rotulo: "Em atendimento", tom: "blue", evento: "blue" },
  concluido: { rotulo: "Concluído", tom: "violet", evento: "violet" },
  cancelado: { rotulo: "Cancelado", tom: "gray", evento: "gray" },
  faltou: { rotulo: "Faltou", tom: "red", evento: "gray" },
};
export const STATUS_ABERTOS = ["agendado", "confirmado", "em_atendimento"];
export const chipStatus = (s) =>
  `<span class="status ${STATUS[s]?.tom ?? "gray"}"><i></i>${esc(STATUS[s]?.rotulo ?? s)}</span>`;
export const FORMAS = { dinheiro: "Dinheiro", pix: "Pix", debito: "Débito", credito: "Crédito" };
export const PERFIS = { admin: "Administrador", gerente: "Gerente", recepcao: "Recepção" };

export const carregando = (texto = "Carregando...") => `<div class="carregando">${esc(texto)}</div>`;
export const vazio = (texto, sub = "") =>
  `<div class="vazio"><strong>${esc(texto)}</strong>${sub ? `<span>${esc(sub)}</span>` : ""}</div>`;
export const blocoErro = (err) =>
  `<div class="form-erro">${esc(mensagemErro(err))}</div>`;

export const campo = (rotulo, controle, { cheio = false } = {}) =>
  `<label class="field${cheio ? " full" : ""}"><span>${esc(rotulo)}</span>${controle}</label>`;
export const opcoes = (itens, selecionado, { vazio: textoVazio } = {}) =>
  (textoVazio !== undefined ? `<option value="">${esc(textoVazio)}</option>` : "") +
  itens
    .map(([valor, rotulo]) => `<option value="${esc(valor)}"${String(valor) === String(selecionado ?? "") ? " selected" : ""}>${esc(rotulo)}</option>`)
    .join("");

// ---------- mensagens de erro legíveis
const ROTULOS = {
  inicio: "Horário", servico_ids: "Serviços", nome: "Nome", telefone: "Telefone", email: "E-mail",
  preco: "Preço", duracao_min: "Duração", comissao_pct: "Comissão", valor: "Valor", forma: "Forma",
  nascimento: "Nascimento", unidade_id: "Unidade", profissional_id: "Profissional", cliente_id: "Cliente",
  senha: "Senha", endereco: "Endereço", pagamentos: "Pagamentos", observacoes: "Observações",
};
export function mensagemErro(err) {
  const d = err?.dados;
  if (d?.campos) {
    const partes = [];
    const percorrer = (o, caminho) => {
      if (Array.isArray(o)) {
        const nome = caminho.filter((c) => !/^\d+$/.test(c)).map((c) => ROTULOS[c] ?? c).join(" › ");
        partes.push((nome ? `${nome}: ` : "") + o.join(", "));
      } else if (o && typeof o === "object") {
        for (const [k, v] of Object.entries(o)) percorrer(v, [...caminho, k]);
      } else {
        partes.push(String(o));
      }
    };
    percorrer(d.campos, []);
    return partes.join(" · ") || err.message;
  }
  if (d?.conflito) return `${err.message} (${hora(d.conflito.inicio)}–${hora(d.conflito.fim)})`;
  return err?.message || "Erro inesperado";
}

// ---------- toast
export function toast(mensagem, tipo = "ok") {
  const area = document.getElementById("toasts");
  if (!area) return;
  const el = document.createElement("div");
  el.className = `toast ${tipo === "erro" ? "erro" : ""}`;
  el.textContent = mensagem;
  area.appendChild(el);
  setTimeout(() => el.remove(), tipo === "erro" ? 6000 : 3500);
}

// ---------- modal
let modalAtual = null;

export function abrirModal(html, { largura = 540 } = {}) {
  fecharModal();
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" style="width:min(${largura}px,100%)">${html}</div>`;
  overlay.addEventListener("mousedown", (e) => {
    if (e.target === overlay) fecharModal();
  });
  const card = overlay.firstElementChild;
  card.addEventListener("click", (e) => {
    if (e.target.closest("[data-fechar]")) fecharModal();
  });
  document.body.appendChild(overlay);
  document.body.classList.add("sem-scroll");
  modalAtual = overlay;
  return card;
}

export function fecharModal() {
  if (modalAtual) {
    modalAtual.remove();
    modalAtual = null;
    document.body.classList.remove("sem-scroll");
  }
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") fecharModal();
});

export const cabecalhoModal = (eyebrow, titulo, extra = "") =>
  `<div class="modal-head"><div><p class="eyebrow">${esc(eyebrow)}</p><h2>${esc(titulo)}</h2>${extra}</div><button class="icon-button" data-fechar aria-label="Fechar">${icon("close")}</button></div>`;

export function confirmar(mensagem, { titulo = "Confirmar", ok = "Confirmar", perigo = false } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.style.zIndex = "150";
    overlay.innerHTML = `<div class="modal-card" style="width:min(400px,100%)"><div class="modal-head"><div><h2>${esc(titulo)}</h2></div></div><p class="confirm-texto">${esc(mensagem)}</p><div class="modal-actions"><button class="secondary-button" data-r="0">Voltar</button><button class="${perigo ? "danger-button" : "primary-button"}" data-r="1">${esc(ok)}</button></div></div>`;
    const fim = (v) => {
      overlay.remove();
      resolve(v);
    };
    overlay.addEventListener("click", (e) => {
      const b = e.target.closest("[data-r]");
      if (b) fim(b.dataset.r === "1");
      else if (e.target === overlay) fim(false);
    });
    document.body.appendChild(overlay);
    overlay.querySelector('[data-r="1"]').focus();
  });
}
