import { api } from "../api.js";
import { ehAdmin } from "../state.js";
import { $, $$, abrirModal, blocoErro, cabecalhoModal, campo, esc, fecharModal, icon, mensagemErro, toast, vazio } from "../ui.js";

export async function render(el, { recarregar }) {
  const lista = await api.get("/unidades", { incluir_inativas: "true" });
  const admin = ehAdmin();

  el.innerHTML = `
    <section class="page-intro">
      <div><p class="eyebrow">ESTRUTURA</p><h1>Unidades</h1><p>Lojas da empresa. Cada uma tem sua própria equipe, serviços e agenda.</p></div>
      ${admin ? `<button class="primary-button" id="novo">${icon("plus", 18)}Nova unidade</button>` : ""}
    </section>
    <section class="appointments-card">${lista.length ? `<div class="table-wrap"><table>
      <thead><tr><th>UNIDADE</th><th>ENDEREÇO</th><th>TELEFONE</th><th>STATUS</th>${admin ? "<th></th>" : ""}</tr></thead>
      <tbody>${lista.map((u) => `<tr>
        <td><strong style="color:var(--ink)">${esc(u.nome)}</strong></td><td>${esc(u.endereco || "—")}</td><td>${esc(u.telefone || "—")}</td>
        <td>${u.ativa ? '<span class="status green"><i></i>Ativa</span>' : '<span class="status gray"><i></i>Inativa</span>'}</td>
        ${admin ? `<td><div class="acoes-linha"><button class="icon-button small" data-edit="${u.id}" aria-label="Editar">${icon("edit", 15)}</button>
          <button class="secondary-button small" data-toggle="${u.id}">${u.ativa ? "Desativar" : "Reativar"}</button></div></td>` : ""}</tr>`).join("")}</tbody></table></div>`
      : vazio("Nenhuma unidade")}
    ${admin ? "" : '<p class="nota-rodape" style="padding:14px 20px">Apenas administradores criam ou alteram unidades.</p>'}</section>`;

  const mudou = () => {
    window.dispatchEvent(new Event("unidades-alteradas")); // atualiza o seletor no topo
    recarregar();
  };
  $("#novo", el)?.addEventListener("click", () => abrirUnidade(null, mudou));
  $$("[data-edit]", el).forEach((b) => b.addEventListener("click", () => abrirUnidade(lista.find((u) => u.id === Number(b.dataset.edit)), mudou)));
  $$("[data-toggle]", el).forEach((b) => b.addEventListener("click", async () => {
    const u = lista.find((x) => x.id === Number(b.dataset.toggle));
    try {
      if (u.ativa) await api.del(`/unidades/${u.id}`);
      else await api.patch(`/unidades/${u.id}`, { ativa: true });
      toast(u.ativa ? "Unidade desativada" : "Unidade reativada");
      mudou();
    } catch (e) {
      toast(mensagemErro(e), "erro");
    }
  }));
}

function abrirUnidade(unidade, onSaved) {
  const edicao = Boolean(unidade);
  const card = abrirModal(`
    ${cabecalhoModal("ESTRUTURA", edicao ? "Editar unidade" : "Nova unidade")}
    <div id="un-erro"></div>
    <div class="form-grid">
      ${campo("Nome", `<input id="un-nome" placeholder="Ex.: Unidade Centro" value="${esc(unidade?.nome ?? "")}" />`, { cheio: true })}
      ${campo("Endereço", `<input id="un-end" value="${esc(unidade?.endereco ?? "")}" />`, { cheio: true })}
      ${campo("Telefone", `<input id="un-tel" inputmode="tel" value="${esc(unidade?.telefone ?? "")}" />`)}
    </div>
    <div class="modal-actions"><button class="secondary-button" data-fechar>Cancelar</button><button class="primary-button" id="un-salvar">${edicao ? "Salvar" : "Criar unidade"}</button></div>`);

  $("#un-salvar", card).addEventListener("click", async (ev) => {
    const botao = ev.currentTarget;
    const nome = $("#un-nome", card).value.trim();
    if (nome.length < 2) return ($("#un-erro", card).innerHTML = blocoErro(new Error("Informe o nome da unidade.")));
    const corpo = { nome, endereco: $("#un-end", card).value.trim() || null, telefone: $("#un-tel", card).value.trim() || null };
    botao.disabled = true;
    try {
      if (edicao) await api.patch(`/unidades/${unidade.id}`, corpo);
      else await api.post("/unidades", corpo);
      fecharModal();
      toast(edicao ? "Unidade atualizada" : "Unidade criada");
      onSaved?.();
    } catch (e) {
      $("#un-erro", card).innerHTML = blocoErro(e);
      botao.disabled = false;
    }
  });
}
