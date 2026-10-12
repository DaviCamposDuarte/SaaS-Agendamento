import { api } from "../api.js";
import { ehGerente } from "../state.js";
import {
  $, abrirModal, blocoErro, brl, cabecalhoModal, campo, carregando, chipStatus, confirmar, debounce,
  esc, fecharModal, icon, telefone, toast, vazio,
} from "../ui.js";
import { dataBR, hora, iniciais } from "../util.js";
import { abrirNovoAgendamento } from "../components/novo-agendamento.js";

const pag = { pagina: 1, busca: "" };
const POR_PAGINA = 15;

export async function render(el, { recarregar }) {
  el.innerHTML = `
    <section class="page-intro">
      <div><p class="eyebrow">RELACIONAMENTO</p><h1>Clientes</h1><p>Cadastro, busca e histórico de atendimentos.</p></div>
      <button class="primary-button" id="novo-cliente">${icon("plus", 18)}Novo cliente</button>
    </section>
    <section class="agenda-toolbar">
      <label class="search-box" style="width:min(380px,100%)">${icon("search", 17)}<input id="busca" placeholder="Buscar por nome, telefone ou e-mail..." value="${esc(pag.busca)}" /></label>
    </section>
    <section class="appointments-card"><div id="tabela">${carregando()}</div></section>`;

  const tabela = $("#tabela", el);

  async function carregarTabela() {
    let d;
    try {
      d = await api.get("/clientes", { busca: pag.busca, pagina: pag.pagina, por_pagina: POR_PAGINA });
    } catch (e) {
      tabela.innerHTML = blocoErro(e);
      return;
    }
    const totalPaginas = Math.max(1, Math.ceil(d.total / d.por_pagina));
    if (pag.pagina > totalPaginas) {
      pag.pagina = totalPaginas;
      return carregarTabela();
    }
    if (!d.itens.length) {
      tabela.innerHTML = vazio(pag.busca ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado", pag.busca ? "Tente outro nome ou telefone." : "Cadastre o primeiro em “Novo cliente”.");
      return;
    }
    tabela.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>CLIENTE</th><th>TELEFONE</th><th>E-MAIL</th><th>NASCIMENTO</th><th></th></tr></thead>
      <tbody>${d.itens
        .map(
          (c) => `<tr class="clicavel" data-id="${c.id}">
          <td><div class="client-cell"><span class="mini-avatar">${esc(iniciais(c.nome))}</span><strong>${esc(c.nome)}</strong></div></td>
          <td>${esc(telefone(c.telefone) || "—")}</td><td>${esc(c.email || "—")}</td>
          <td>${c.nascimento ? dataBR(c.nascimento) : "—"}</td>
          <td><button class="more-button" aria-label="Abrir cliente">${icon("chevron", 18)}</button></td></tr>`
        )
        .join("")}</tbody></table></div>
      <div class="barra-pagina"><span>${d.total} cliente${d.total === 1 ? "" : "s"}</span>
        <div class="grupo"><button class="secondary-button small" id="pg-ant" ${pag.pagina <= 1 ? "disabled" : ""}>Anterior</button>
        <span>Página ${pag.pagina} de ${totalPaginas}</span>
        <button class="secondary-button small" id="pg-prox" ${pag.pagina >= totalPaginas ? "disabled" : ""}>Próxima</button></div></div>`;
    tabela.querySelectorAll("tr[data-id]").forEach((tr) => tr.addEventListener("click", () => abrirCliente(Number(tr.dataset.id), { onChange: carregarTabela })));
    $("#pg-ant", tabela).addEventListener("click", () => { pag.pagina--; carregarTabela(); });
    $("#pg-prox", tabela).addEventListener("click", () => { pag.pagina++; carregarTabela(); });
  }

  $("#busca", el).addEventListener("input", debounce((e) => {
    pag.busca = e.target.value.trim();
    pag.pagina = 1;
    carregarTabela();
  }, 300));
  $("#novo-cliente", el).addEventListener("click", () => abrirCliente(null, { onChange: carregarTabela }));
  await carregarTabela();
}

/** Modal de cliente: cadastro (id = null) ou edição com histórico. */
export async function abrirCliente(id, { onChange } = {}) {
  const card = abrirModal(carregando(), { largura: 640 });
  let cliente = null;
  let historico = null;
  if (id) {
    try {
      historico = await api.get(`/clientes/${id}/historico`);
      cliente = historico.cliente;
    } catch (e) {
      card.innerHTML = `${cabecalhoModal("CLIENTE", "Não foi possível abrir")}${blocoErro(e)}`;
      return;
    }
  }

  const h = historico;
  card.innerHTML = `
    ${cabecalhoModal(id ? "CLIENTE" : "NOVO REGISTRO", cliente ? cliente.nome : "Novo cliente")}
    <div id="cl-erro"></div>
    <div class="form-grid">
      ${campo("Nome", `<input id="cl-nome" value="${esc(cliente?.nome ?? "")}" autocomplete="off" />`, { cheio: true })}
      ${campo("Telefone", `<input id="cl-tel" inputmode="tel" placeholder="(31) 99999-0000" value="${esc(telefone(cliente?.telefone) ?? "")}" />`)}
      ${campo("E-mail", `<input id="cl-email" type="email" value="${esc(cliente?.email ?? "")}" />`)}
      ${campo("Nascimento", `<input id="cl-nasc" type="date" value="${esc(cliente?.nascimento ?? "")}" />`)}
      ${campo("Observações", `<textarea id="cl-obs" maxlength="2000" placeholder="Preferências, alergias, lembretes...">${esc(cliente?.observacoes ?? "")}</textarea>`, { cheio: true })}
    </div>
    ${h ? `<p class="secao-titulo">Histórico</p>
      <div class="dinheiro-box">
        <div><small>Visitas</small><strong>${h.resumo.total_visitas}</strong></div>
        <div><small>Total gasto</small><strong>${brl(h.resumo.total_gasto)}</strong></div>
        <div><small>Última visita</small><strong>${h.resumo.ultima_visita ? dataBR(h.resumo.ultima_visita) : "—"}</strong></div>
      </div>
      <div class="linhas" style="margin-top:14px">${h.agendamentos.length
        ? h.agendamentos.slice(0, 8).map((a) => `<div class="linha"><div>${dataBR(a.inicio)} ${hora(a.inicio)} · ${esc(a.servicos.map((s) => s.nome).join(" + "))}<small>${esc(a.profissional)} · ${esc(a.unidade)}</small></div><div style="display:flex;align-items:center;gap:10px"><strong>${brl(a.valor_total)}</strong>${chipStatus(a.status)}</div></div>`).join("")
        : '<div class="linha"><span class="dica">Este cliente ainda não tem agendamentos.</span></div>'}</div>
      ${h.agendamentos.length > 8 ? `<p class="dica" style="margin-top:8px">Mostrando os 8 mais recentes de ${h.agendamentos.length}.</p>` : ""}` : ""}
    <div class="modal-actions espalhado">
      <div class="grupo">${id && ehGerente() ? '<button class="ghost-danger" id="cl-excluir">Excluir</button>' : ""}${id ? '<button class="secondary-button" id="cl-agendar">Novo agendamento</button>' : ""}</div>
      <div class="grupo"><button class="secondary-button" data-fechar>Fechar</button><button class="primary-button" id="cl-salvar">${id ? "Salvar alterações" : "Cadastrar cliente"}</button></div>
    </div>`;

  const erro = (e) => ($("#cl-erro", card).innerHTML = e ? blocoErro(typeof e === "string" ? new Error(e) : e) : "");

  $("#cl-salvar", card).addEventListener("click", async (ev) => {
    const botao = ev.currentTarget;
    const nome = $("#cl-nome", card).value.trim();
    if (nome.length < 2) return erro("Informe o nome do cliente.");
    const corpo = {
      nome,
      telefone: $("#cl-tel", card).value.trim() || null,
      email: $("#cl-email", card).value.trim() || null,
      nascimento: $("#cl-nasc", card).value || null,
      observacoes: $("#cl-obs", card).value.trim() || null,
    };
    botao.disabled = true;
    erro(null);
    try {
      if (id) await api.patch(`/clientes/${id}`, corpo);
      else await api.post("/clientes", corpo);
      fecharModal();
      toast(id ? "Cliente atualizado" : "Cliente cadastrado");
      onChange?.();
    } catch (e) {
      erro(e);
      botao.disabled = false;
    }
  });

  $("#cl-agendar", card)?.addEventListener("click", () => {
    fecharModal();
    abrirNovoAgendamento({ cliente: { id: cliente.id, nome: cliente.nome, telefone: cliente.telefone }, onSaved: onChange });
  });

  $("#cl-excluir", card)?.addEventListener("click", async () => {
    if (!(await confirmar("O cadastro será removido. Clientes com agendamentos não podem ser excluídos.", { titulo: "Excluir cliente?", ok: "Excluir", perigo: true }))) return;
    try {
      await api.del(`/clientes/${id}`);
      fecharModal();
      toast("Cliente excluído");
      onChange?.();
    } catch (e) {
      erro(e);
    }
  });
}
