import { $$, chipStatus, esc, icon, vazio } from "../ui.js";
import { hora, iniciais } from "../util.js";

export function tabelaAgendamentos(lista, { vazioTexto = "Nenhum agendamento", vazioSub = "" } = {}) {
  if (!lista.length) return vazio(vazioTexto, vazioSub);
  return `<div class="table-wrap"><table>
    <thead><tr><th>HORÁRIO</th><th>CLIENTE</th><th>SERVIÇO</th><th>PROFISSIONAL</th><th>STATUS</th><th></th></tr></thead>
    <tbody>${lista
      .map(
        (a) => `<tr class="clicavel" data-ag="${a.id}">
      <td><span class="time-cell">${icon("clock", 15)}${hora(a.inicio)}</span></td>
      <td><div class="client-cell"><span class="mini-avatar">${esc(iniciais(a.cliente.nome))}</span><strong>${esc(a.cliente.nome)}</strong></div></td>
      <td>${esc(a.servicos.map((s) => s.nome).join(" + "))}</td>
      <td>${esc(a.profissional.nome)}</td>
      <td>${chipStatus(a.status)}</td>
      <td><button class="more-button" aria-label="Abrir agendamento">${icon("more", 18)}</button></td>
    </tr>`
      )
      .join("")}</tbody></table></div>`;
}

export function ligarTabela(raiz, aoAbrir) {
  $$("[data-ag]", raiz).forEach((tr) => tr.addEventListener("click", () => aoAbrir(Number(tr.dataset.ag))));
}
