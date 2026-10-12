import { api } from "../api.js";
import { estado } from "../state.js";
import {
  $, STATUS_ABERTOS, abrirModal, blocoErro, brl, cabecalhoModal, campo, debounce, esc,
  fecharModal, icon, opcoes, telefone, toast,
} from "../ui.js";
import { hoje, hora as horaDe, horaParaMin, iniciais, isoData, minParaHora } from "../util.js";

/**
 * Modal "Novo agendamento".
 * opcoes: { cliente?, data?: "AAAA-MM-DD", hora?: "HH:MM", profissionalId?, unidadeId?, onSaved?: fn }
 */
export async function abrirNovoAgendamento({ cliente = null, data = null, hora = null, profissionalId = null, unidadeId = null, onSaved } = {}) {
  const f = {
    cliente,
    novoCliente: false,
    unidadeId: unidadeId ?? estado.unidadeId ?? estado.unidades[0]?.id ?? null,
    servicoIds: new Set(),
    profissionalId: "",
  };
  let servicos = [];
  let profissionais = [];
  let predefinido = profissionalId;

  const card = abrirModal(
    `${cabecalhoModal("NOVO REGISTRO", "Novo agendamento")}
    <div id="na-erro"></div>
    <div class="form-grid">
      <div class="field full"><span>Cliente</span><div id="na-cliente"></div></div>
      ${estado.unidades.length > 1 ? campo("Unidade", `<select id="na-unidade">${opcoes(estado.unidades.map((u) => [u.id, u.nome]), f.unidadeId)}</select>`, { cheio: true }) : ""}
      <div class="field full"><span>Serviços</span><div id="na-servicos" class="opcoes-servicos"></div></div>
      ${campo("Profissional", '<select id="na-prof"></select>', { cheio: true })}
      ${campo("Data", `<input type="date" id="na-data" value="${esc(data ?? isoData(hoje()))}" />`)}
      ${campo("Horário", `<input type="time" id="na-hora" step="900" value="${esc(hora ?? "09:00")}" />`)}
      <div class="field full"><p class="dica" id="na-ocupados"></p></div>
      ${campo("Observações", '<textarea id="na-obs" maxlength="1000" placeholder="Opcional"></textarea>', { cheio: true })}
    </div>
    <div class="resumo-box" id="na-resumo"></div>
    <div class="modal-actions"><button class="secondary-button" data-fechar>Cancelar</button><button class="primary-button" id="na-salvar">Confirmar agendamento</button></div>`,
    { largura: 640 }
  );

  const erro = (e) => {
    $("#na-erro", card).innerHTML = e ? blocoErro(typeof e === "string" ? new Error(e) : e) : "";
  };

  // ------------------------------------------------------------ cliente
  function desenharCliente() {
    const el = $("#na-cliente", card);
    if (f.cliente) {
      el.innerHTML = `<div class="cliente-escolhido"><span class="mini-avatar">${esc(iniciais(f.cliente.nome))}</span>
        <div><strong>${esc(f.cliente.nome)}</strong><small>${esc(telefone(f.cliente.telefone) || "sem telefone")}</small></div>
        <button type="button" class="icon-button small" id="na-trocar" aria-label="Trocar cliente">${icon("close", 15)}</button></div>`;
      $("#na-trocar", card).onclick = () => {
        f.cliente = null;
        desenharCliente();
      };
      return;
    }
    if (f.novoCliente) {
      el.innerHTML = `<div class="form-grid" style="padding:0 0 8px">
          <label class="field"><span>Nome</span><input id="na-cn" placeholder="Nome completo" autocomplete="off" /></label>
          <label class="field"><span>Telefone</span><input id="na-ct" inputmode="tel" placeholder="(31) 99999-0000" /></label>
        </div><button type="button" class="link-inline" id="na-existente">Buscar cliente já cadastrado</button>`;
      $("#na-existente", card).onclick = () => {
        f.novoCliente = false;
        desenharCliente();
      };
      $("#na-cn", card).focus();
      return;
    }
    el.innerHTML = `<input id="na-busca" placeholder="Busque por nome ou telefone" autocomplete="off" />
      <div class="resultados" id="na-res" hidden></div>
      <div style="margin-top:8px"><button type="button" class="link-inline" id="na-novo">＋ Cadastrar novo cliente</button></div>`;
    const buscar = debounce(async () => {
      const q = $("#na-busca", card)?.value.trim() ?? "";
      const res = $("#na-res", card);
      if (!res) return;
      if (q.length < 2) {
        res.hidden = true;
        return;
      }
      try {
        const d = await api.get("/clientes", { busca: q, por_pagina: 6 });
        res.hidden = false;
        res.innerHTML = d.itens.length
          ? d.itens.map((c) => `<button type="button" data-id="${c.id}"><span class="mini-avatar">${esc(iniciais(c.nome))}</span>${esc(c.nome)}<small>${esc(telefone(c.telefone))}</small></button>`).join("")
          : '<div class="notif-vazio">Nenhum cliente encontrado.</div>';
        res.querySelectorAll("button").forEach((b) => {
          b.onclick = () => {
            f.cliente = d.itens.find((c) => c.id === Number(b.dataset.id));
            desenharCliente();
          };
        });
      } catch (e) {
        erro(e);
      }
    }, 250);
    $("#na-busca", card).addEventListener("input", buscar);
    $("#na-novo", card).onclick = () => {
      f.novoCliente = true;
      desenharCliente();
    };
    if (!cliente) $("#na-busca", card).focus();
  }

  // ------------------------------------------------- serviços / profissional
  const selecionados = () => servicos.filter((s) => f.servicoIds.has(s.id));

  function desenharServicos() {
    const el = $("#na-servicos", card);
    if (!servicos.length) {
      el.innerHTML = '<p class="dica alerta" style="grid-column:1/-1">Esta unidade ainda não tem serviços cadastrados.</p>';
      return;
    }
    el.innerHTML = servicos
      .map((s) => `<label class="servico-opcao${f.servicoIds.has(s.id) ? " sel" : ""}"><input type="checkbox" value="${s.id}"${f.servicoIds.has(s.id) ? " checked" : ""} />
        <div><strong>${esc(s.nome)}</strong><small>${s.duracao_min} min · ${brl(s.preco)}</small></div></label>`)
      .join("");
  }

  function desenharProfissionais() {
    const ids = [...f.servicoIds];
    const elegiveis = profissionais.filter((p) => ids.every((id) => p.servicos.some((s) => s.id === id)));
    if (!elegiveis.some((p) => String(p.id) === String(f.profissionalId))) f.profissionalId = "";
    $("#na-prof", card).innerHTML = opcoes(
      elegiveis.map((p) => [p.id, p.nome]),
      f.profissionalId,
      { vazio: elegiveis.length ? "Selecione o profissional" : "Nenhum profissional realiza estes serviços" }
    );
  }

  function atualizarResumo() {
    const sel = selecionados();
    const el = $("#na-resumo", card);
    if (!sel.length) {
      el.innerHTML = "<span>Selecione ao menos um serviço.</span>";
      return;
    }
    const dur = sel.reduce((t, s) => t + s.duracao_min, 0);
    const total = sel.reduce((t, s) => t + Number(s.preco), 0);
    const h = $("#na-hora", card).value;
    const fim = /^\d{2}:\d{2}$/.test(h) ? minParaHora(horaParaMin(h) + dur) : "—";
    el.innerHTML = `<span>Duração: <strong>${dur} min</strong></span><span>Término previsto: <strong>${fim}</strong></span><span>Total: <strong>${brl(total)}</strong></span>`;
  }

  const atualizarOcupados = debounce(async () => {
    const el = $("#na-ocupados", card);
    if (!el) return;
    const pid = f.profissionalId;
    const dia = $("#na-data", card).value;
    if (!pid || !dia) {
      el.textContent = "";
      return;
    }
    try {
      const lista = await api.get("/agendamentos", { data: dia, profissional_id: pid });
      if (pid !== f.profissionalId) return; // trocou de profissional enquanto carregava
      const ocupados = lista.filter((a) => STATUS_ABERTOS.includes(a.status) || a.status === "concluido");
      el.textContent = ocupados.length
        ? `Horários ocupados neste dia: ${ocupados.map((a) => `${horaDe(a.inicio)}–${horaDe(a.fim)}`).join(", ")}`
        : "Profissional livre neste dia.";
    } catch {
      el.textContent = "";
    }
  }, 200);

  async function carregarUnidade() {
    $("#na-servicos", card).innerHTML = '<p class="dica" style="grid-column:1/-1">Carregando serviços...</p>';
    try {
      [servicos, profissionais] = await Promise.all([
        api.get("/servicos", { unidade_id: f.unidadeId }),
        api.get("/profissionais", { unidade_id: f.unidadeId }),
      ]);
    } catch (e) {
      erro(e);
      return;
    }
    f.servicoIds.clear();
    f.profissionalId = "";
    if (predefinido && profissionais.some((p) => p.id === predefinido)) f.profissionalId = String(predefinido);
    predefinido = null; // vale só na primeira carga (trocar de unidade zera)
    desenharServicos();
    desenharProfissionais();
    atualizarResumo();
    atualizarOcupados();
  }

  // ----------------------------------------------------------- eventos
  $("#na-servicos", card).addEventListener("change", (e) => {
    const input = e.target.closest("input[type=checkbox]");
    if (!input) return;
    const id = Number(input.value);
    input.checked ? f.servicoIds.add(id) : f.servicoIds.delete(id);
    input.closest(".servico-opcao").classList.toggle("sel", input.checked);
    desenharProfissionais();
    atualizarResumo();
    atualizarOcupados();
  });
  $("#na-prof", card).addEventListener("change", (e) => {
    f.profissionalId = e.target.value;
    atualizarOcupados();
  });
  $("#na-data", card).addEventListener("change", atualizarOcupados);
  $("#na-hora", card).addEventListener("input", atualizarResumo);
  $("#na-unidade", card)?.addEventListener("change", (e) => {
    f.unidadeId = Number(e.target.value);
    carregarUnidade();
  });

  $("#na-salvar", card).addEventListener("click", async (ev) => {
    const botao = ev.currentTarget;
    erro(null);
    botao.disabled = true;
    try {
      let cli = f.cliente;
      if (!cli && f.novoCliente) {
        const nome = $("#na-cn", card).value.trim();
        const tel = $("#na-ct", card).value.trim();
        if (nome.length < 2) throw new Error("Informe o nome do cliente.");
        cli = await api.post("/clientes", { nome, telefone: tel || null });
        f.cliente = cli; // se o agendamento falhar, não tenta cadastrar de novo
        f.novoCliente = false;
        desenharCliente();
      }
      if (!cli) throw new Error("Selecione ou cadastre o cliente.");
      if (!f.servicoIds.size) throw new Error("Selecione ao menos um serviço.");
      if (!f.profissionalId) throw new Error("Selecione o profissional.");
      const dia = $("#na-data", card).value;
      const h = $("#na-hora", card).value;
      if (!dia || !/^\d{2}:\d{2}$/.test(h)) throw new Error("Informe a data e o horário.");

      const ag = await api.post("/agendamentos", {
        unidade_id: f.unidadeId,
        cliente_id: cli.id,
        profissional_id: Number(f.profissionalId),
        inicio: `${dia}T${h}:00`,
        servico_ids: [...f.servicoIds],
        observacoes: $("#na-obs", card).value.trim() || null,
      });
      fecharModal();
      toast("Agendamento criado!");
      onSaved?.(ag);
    } catch (e) {
      erro(e);
      botao.disabled = false;
    }
  });

  desenharCliente();
  atualizarResumo();
  await carregarUnidade();
}
