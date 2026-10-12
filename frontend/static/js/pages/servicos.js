import { api } from "../api.js";
import { estado, nomeUnidade } from "../state.js";
import {
  $, $$, abrirModal, blocoErro, brl, cabecalhoModal, campo, carregando, esc, fecharModal, icon, mensagemErro,
  opcoes, toast, vazio,
} from "../ui.js";
import { parseValor, valorParaInput } from "../util.js";

const filtro = { inativos: false };

export async function render(el, { recarregar }) {
  const lista = await api.get("/servicos", { unidade_id: estado.unidadeId, incluir_inativos: filtro.inativos ? "true" : null });
  const nomeDe = (id) => estado.unidades.find((u) => u.id === id)?.nome ?? "";
  const multiplas = estado.unidades.length > 1;

  el.innerHTML = `
    <section class="page-intro">
      <div><p class="eyebrow">CATÁLOGO</p><h1>Serviços</h1><p>Duração e preço de cada serviço · ${esc(nomeUnidade())}</p></div>
      <button class="primary-button" id="novo">${icon("plus", 18)}Novo serviço</button>
    </section>
    <section class="agenda-toolbar"><label class="check-line"><input type="checkbox" id="inativos" ${filtro.inativos ? "checked" : ""} /> Mostrar inativos</label></section>
    <section class="appointments-card">${lista.length ? `<div class="table-wrap"><table>
      <thead><tr><th>SERVIÇO</th>${multiplas ? "<th>UNIDADE</th>" : ""}<th>DURAÇÃO</th><th class="num">PREÇO</th><th>STATUS</th><th></th></tr></thead>
      <tbody>${lista.map((s) => `<tr>
        <td><strong style="color:var(--ink)">${esc(s.nome)}</strong></td>${multiplas ? `<td>${esc(nomeDe(s.unidade_id))}</td>` : ""}
        <td>${s.duracao_min} min</td><td class="num">${brl(s.preco)}</td>
        <td>${s.ativo ? '<span class="status green"><i></i>Ativo</span>' : '<span class="status gray"><i></i>Inativo</span>'}</td>
        <td><div class="acoes-linha"><button class="icon-button small" data-edit="${s.id}" aria-label="Editar">${icon("edit", 15)}</button>
          <button class="secondary-button small" data-toggle="${s.id}">${s.ativo ? "Desativar" : "Reativar"}</button></div></td></tr>`).join("")}</tbody></table></div>`
      : vazio("Nenhum serviço cadastrado", "Cadastre os serviços para poder agendar.")}</section>`;

  $("#novo", el).addEventListener("click", () => abrirServico(null, recarregar));
  $("#inativos", el).addEventListener("change", (e) => { filtro.inativos = e.target.checked; recarregar(); });
  $$("[data-edit]", el).forEach((b) => b.addEventListener("click", () => abrirServico(lista.find((s) => s.id === Number(b.dataset.edit)), recarregar)));
  $$("[data-toggle]", el).forEach((b) => b.addEventListener("click", async () => {
    const s = lista.find((x) => x.id === Number(b.dataset.toggle));
    try {
      if (s.ativo) await api.del(`/servicos/${s.id}`);
      else await api.patch(`/servicos/${s.id}`, { ativo: true });
      toast(s.ativo ? "Serviço desativado" : "Serviço reativado");
      recarregar();
    } catch (e) {
      toast(mensagemErro(e), "erro");
    }
  }));
}

function abrirServico(servico, onSaved) {
  const edicao = Boolean(servico);
  const unidadeInicial = servico?.unidade_id ?? estado.unidadeId ?? estado.unidades[0]?.id;
  const card = abrirModal(`
    ${cabecalhoModal("CATÁLOGO", edicao ? "Editar serviço" : "Novo serviço")}
    <div id="sv-erro"></div>
    <div class="form-grid">
      ${campo("Unidade", `<select id="sv-un" ${edicao ? "disabled" : ""}>${opcoes(estado.unidades.map((u) => [u.id, u.nome]), unidadeInicial)}</select>`, { cheio: true })}
      ${campo("Nome", `<input id="sv-nome" placeholder="Ex.: Corte masculino" value="${esc(servico?.nome ?? "")}" />`, { cheio: true })}
      ${campo("Duração (minutos)", `<input id="sv-dur" type="number" min="5" max="600" step="5" value="${servico?.duracao_min ?? 30}" />`)}
      ${campo("Preço (R$)", `<input id="sv-preco" inputmode="decimal" placeholder="0,00" value="${servico ? esc(valorParaInput(servico.preco)) : ""}" />`)}
    </div>
    <div class="modal-actions"><button class="secondary-button" data-fechar>Cancelar</button><button class="primary-button" id="sv-salvar">${edicao ? "Salvar" : "Cadastrar serviço"}</button></div>`);

  $("#sv-salvar", card).addEventListener("click", async (ev) => {
    const botao = ev.currentTarget;
    const preco = parseValor($("#sv-preco", card).value);
    const dur = Number($("#sv-dur", card).value);
    const nome = $("#sv-nome", card).value.trim();
    const erro = (m) => ($("#sv-erro", card).innerHTML = blocoErro(new Error(m)));
    if (nome.length < 2) return erro("Informe o nome do serviço.");
    if (!(dur >= 5)) return erro("A duração mínima é de 5 minutos.");
    if (Number.isNaN(preco) || preco <= 0) return erro("Informe um preço maior que zero.");
    const corpo = { nome, duracao_min: dur, preco: preco.toFixed(2) };
    botao.disabled = true;
    try {
      if (edicao) await api.patch(`/servicos/${servico.id}`, corpo);
      else await api.post("/servicos", { ...corpo, unidade_id: Number($("#sv-un", card).value) });
      fecharModal();
      toast(edicao ? "Serviço atualizado" : "Serviço cadastrado");
      onSaved?.();
    } catch (e) {
      $("#sv-erro", card).innerHTML = blocoErro(e);
      botao.disabled = false;
    }
  });
}
