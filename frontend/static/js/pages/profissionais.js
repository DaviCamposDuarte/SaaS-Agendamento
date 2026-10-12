import { api } from "../api.js";
import { estado, nomeUnidade } from "../state.js";
import {
  $, $$, abrirModal, blocoErro, brl, cabecalhoModal, campo, esc, fecharModal, icon, mensagemErro, opcoes, toast, vazio,
} from "../ui.js";
import { iniciais, parseValor, valorParaInput } from "../util.js";

const filtro = { inativos: false };

export async function render(el, { recarregar }) {
  const lista = await api.get("/profissionais", { unidade_id: estado.unidadeId, incluir_inativos: filtro.inativos ? "true" : null });
  const nomeDe = (id) => estado.unidades.find((u) => u.id === id)?.nome ?? "";
  const multiplas = estado.unidades.length > 1;

  el.innerHTML = `
    <section class="page-intro">
      <div><p class="eyebrow">EQUIPE</p><h1>Profissionais</h1><p>Quem atende, o que faz e quanto ganha de comissão · ${esc(nomeUnidade())}</p></div>
      <button class="primary-button" id="novo">${icon("plus", 18)}Novo profissional</button>
    </section>
    <section class="agenda-toolbar"><label class="check-line"><input type="checkbox" id="inativos" ${filtro.inativos ? "checked" : ""} /> Mostrar inativos</label></section>
    <section class="appointments-card">${lista.length ? `<div class="table-wrap"><table>
      <thead><tr><th>PROFISSIONAL</th>${multiplas ? "<th>UNIDADE</th>" : ""}<th>SERVIÇOS</th><th class="num">COMISSÃO</th><th>STATUS</th><th></th></tr></thead>
      <tbody>${lista.map((p) => `<tr>
        <td><div class="client-cell"><span class="mini-avatar">${esc(iniciais(p.nome))}</span><strong>${esc(p.nome)}</strong></div></td>
        ${multiplas ? `<td>${esc(nomeDe(p.unidade_id))}</td>` : ""}
        <td style="white-space:normal">${p.servicos.length ? p.servicos.map((s) => `<span class="tag">${esc(s.nome)}</span>`).join("") : '<span class="dica alerta">Nenhum serviço vinculado</span>'}</td>
        <td class="num">${esc(Number(p.comissao_pct).toFixed(0))}%</td>
        <td>${p.ativo ? '<span class="status green"><i></i>Ativo</span>' : '<span class="status gray"><i></i>Inativo</span>'}</td>
        <td><div class="acoes-linha"><button class="icon-button small" data-edit="${p.id}" aria-label="Editar">${icon("edit", 15)}</button>
          <button class="secondary-button small" data-toggle="${p.id}">${p.ativo ? "Desativar" : "Reativar"}</button></div></td></tr>`).join("")}</tbody></table></div>`
      : vazio("Nenhum profissional cadastrado", "Cadastre a equipe para poder agendar.")}</section>`;

  $("#novo", el).addEventListener("click", () => abrirProfissional(null, recarregar));
  $("#inativos", el).addEventListener("change", (e) => { filtro.inativos = e.target.checked; recarregar(); });
  $$("[data-edit]", el).forEach((b) => b.addEventListener("click", () => abrirProfissional(lista.find((p) => p.id === Number(b.dataset.edit)), recarregar)));
  $$("[data-toggle]", el).forEach((b) => b.addEventListener("click", async () => {
    const p = lista.find((x) => x.id === Number(b.dataset.toggle));
    try {
      if (p.ativo) await api.del(`/profissionais/${p.id}`);
      else await api.patch(`/profissionais/${p.id}`, { ativo: true });
      toast(p.ativo ? "Profissional desativado" : "Profissional reativado");
      recarregar();
    } catch (e) {
      toast(mensagemErro(e), "erro");
    }
  }));
}

async function abrirProfissional(prof, onSaved) {
  const edicao = Boolean(prof);
  let unidadeId = prof?.unidade_id ?? estado.unidadeId ?? estado.unidades[0]?.id;
  const marcados = new Set((prof?.servicos ?? []).map((s) => s.id));

  const card = abrirModal(`
    ${cabecalhoModal("EQUIPE", edicao ? "Editar profissional" : "Novo profissional")}
    <div id="pf-erro"></div>
    <div class="form-grid">
      ${campo("Unidade", `<select id="pf-un" ${edicao ? "disabled" : ""}>${opcoes(estado.unidades.map((u) => [u.id, u.nome]), unidadeId)}</select>`, { cheio: true })}
      ${campo("Nome", `<input id="pf-nome" value="${esc(prof?.nome ?? "")}" />`, { cheio: true })}
      ${campo("Telefone", `<input id="pf-tel" inputmode="tel" value="${esc(prof?.telefone ?? "")}" />`)}
      ${campo("Comissão (%)", `<input id="pf-com" inputmode="decimal" value="${valorParaInput(prof?.comissao_pct ?? 0)}" />`)}
      <div class="field full"><span>Serviços que realiza</span><div id="pf-servicos" class="opcoes-servicos"></div>
        <small>O profissional só aparece no agendamento dos serviços marcados aqui.</small></div>
    </div>
    <div class="modal-actions"><button class="secondary-button" data-fechar>Cancelar</button><button class="primary-button" id="pf-salvar">${edicao ? "Salvar" : "Cadastrar profissional"}</button></div>`, { largura: 600 });

  async function carregarServicos() {
    const alvo = $("#pf-servicos", card);
    alvo.innerHTML = '<p class="dica" style="grid-column:1/-1">Carregando...</p>';
    try {
      const servicos = await api.get("/servicos", { unidade_id: unidadeId });
      alvo.innerHTML = servicos.length
        ? servicos.map((s) => `<label class="servico-opcao${marcados.has(s.id) ? " sel" : ""}"><input type="checkbox" value="${s.id}"${marcados.has(s.id) ? " checked" : ""} /><div><strong>${esc(s.nome)}</strong><small>${s.duracao_min} min · ${brl(s.preco)}</small></div></label>`).join("")
        : '<p class="dica alerta" style="grid-column:1/-1">Esta unidade ainda não tem serviços. Cadastre-os primeiro.</p>';
    } catch (e) {
      alvo.innerHTML = blocoErro(e);
    }
  }
  $("#pf-servicos", card).addEventListener("change", (e) => {
    const input = e.target.closest("input[type=checkbox]");
    if (!input) return;
    input.checked ? marcados.add(Number(input.value)) : marcados.delete(Number(input.value));
    input.closest(".servico-opcao").classList.toggle("sel", input.checked);
  });
  $("#pf-un", card).addEventListener("change", (e) => {
    unidadeId = Number(e.target.value);
    marcados.clear();
    carregarServicos();
  });

  $("#pf-salvar", card).addEventListener("click", async (ev) => {
    const botao = ev.currentTarget;
    const erro = (m) => ($("#pf-erro", card).innerHTML = blocoErro(new Error(m)));
    const nome = $("#pf-nome", card).value.trim();
    const comissao = parseValor($("#pf-com", card).value || "0");
    if (nome.length < 2) return erro("Informe o nome do profissional.");
    if (Number.isNaN(comissao) || comissao < 0 || comissao > 100) return erro("A comissão deve estar entre 0% e 100%.");
    const corpo = {
      nome,
      telefone: $("#pf-tel", card).value.trim() || null,
      comissao_pct: comissao.toFixed(2),
      servico_ids: [...marcados],
    };
    botao.disabled = true;
    try {
      if (edicao) await api.patch(`/profissionais/${prof.id}`, corpo);
      else await api.post("/profissionais", { ...corpo, unidade_id: unidadeId });
      fecharModal();
      toast(edicao ? "Profissional atualizado" : "Profissional cadastrado");
      onSaved?.();
    } catch (e) {
      $("#pf-erro", card).innerHTML = blocoErro(e);
      botao.disabled = false;
    }
  });

  await carregarServicos();
}
