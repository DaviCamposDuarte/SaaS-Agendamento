import { api } from "../api.js";
import { ehGerente, estado } from "../state.js";
import {
  $, $$, FORMAS, STATUS_ABERTOS, abrirModal, blocoErro, brl, cabecalhoModal, campo, carregando,
  chipStatus, confirmar, esc, icon, mensagemErro, opcoes, telefone, toast,
} from "../ui.js";
import { centavos, dataBR, hora, parseValor, valorParaInput } from "../util.js";

/** Modal com os dados do agendamento, mudança de status, recebimento e reagendamento. */
export async function abrirDetalhe(id, { onChange } = {}) {
  const card = abrirModal(carregando(), { largura: 620 });
  let d = null; // { agendamento, pagamentos, resumo }

  const carregar = async () => {
    d = await api.get(`/agendamentos/${id}/pagamentos`);
  };
  const depoisDeAlterar = async () => {
    onChange?.();
    await carregar();
    visaoResumo();
  };

  // ------------------------------------------------------------ resumo
  function visaoResumo() {
    const a = d.agendamento;
    const aberto = STATUS_ABERTOS.includes(a.status);
    const saldo = Number(a.saldo);
    const unidade = estado.unidades.length > 1 ? estado.unidades.find((u) => u.id === a.unidade_id)?.nome : "";

    card.innerHTML = `
      ${cabecalhoModal(`AGENDAMENTO #${a.id}`, a.cliente.nome, `<div class="detalhe-topo">${chipStatus(a.status)}</div>`)}
      <div class="detail-grid">
        <div class="detail-item"><small>Data</small><span>${dataBR(a.inicio)}</span></div>
        <div class="detail-item"><small>Horário</small><span>${hora(a.inicio)} – ${hora(a.fim)} · ${a.duracao_min} min</span></div>
        <div class="detail-item"><small>Profissional</small><span>${esc(a.profissional.nome)}</span></div>
        <div class="detail-item"><small>Telefone</small><span>${esc(telefone(a.cliente.telefone) || "—")}</span></div>
        ${unidade ? `<div class="detail-item"><small>Unidade</small><span>${esc(unidade)}</span></div>` : ""}
      </div>

      <p class="secao-titulo">Serviços</p>
      <div class="linhas">
        ${a.servicos.map((s) => `<div class="linha"><div>${esc(s.nome)}<small>${s.duracao_min} min</small></div><strong>${brl(s.preco)}</strong></div>`).join("")}
        <div class="linha total"><span>Total</span><span>${brl(a.valor_total)}</span></div>
      </div>

      <div class="dinheiro-box">
        <div><small>Total</small><strong>${brl(a.valor_total)}</strong></div>
        <div><small>Pago</small><strong>${brl(a.pago)}</strong></div>
        <div class="${saldo > 0 ? "saldo-aberto" : "saldo-ok"}"><small>Saldo</small><strong>${brl(a.saldo)}</strong></div>
      </div>

      ${d.pagamentos.length ? `<p class="secao-titulo">Pagamentos</p><div class="linhas">${d.pagamentos
        .map((p) => `<div class="linha"><div>${esc(FORMAS[p.forma] ?? p.forma)}<small>${dataBR(p.pago_em)} ${hora(p.pago_em)}</small></div>
          <div style="display:flex;align-items:center;gap:8px"><strong>${brl(p.valor)}</strong>
          ${ehGerente() && a.status !== "concluido" ? `<button class="icon-button small" data-estorno="${p.id}" aria-label="Estornar pagamento" title="Estornar">${icon("trash", 15)}</button>` : ""}</div></div>`)
        .join("")}</div>` : ""}

      ${a.comissao && ehGerente() ? `<p class="nota-rodape">Comissão do profissional: <strong>${brl(a.comissao.valor)}</strong> (${esc(a.comissao.pct)}%)</p>` : ""}
      ${a.observacoes ? `<p class="secao-titulo">Observações</p><p class="dica">${esc(a.observacoes)}</p>` : ""}

      ${aberto ? `<div class="modal-actions espalhado">
        <div class="grupo">
          ${a.status !== "em_atendimento" ? '<button class="ghost-danger" id="ac-faltou">Faltou</button>' : ""}
          <button class="ghost-danger" id="ac-cancelar">Cancelar</button>
        </div>
        <div class="grupo">
          <button class="secondary-button" id="ac-reagendar">Reagendar</button>
          ${a.status === "agendado" ? '<button class="secondary-button" id="ac-confirmar">Confirmar</button>' : ""}
          ${a.status !== "em_atendimento" ? '<button class="secondary-button" id="ac-iniciar">Iniciar atendimento</button>' : ""}
          <button class="primary-button" id="ac-receber">${icon("wallet", 16)}Receber e concluir</button>
        </div></div>` : ""}`;

    const mudar = async (status, mensagem) => {
      try {
        await api.post(`/agendamentos/${id}/status`, { status });
        toast(mensagem);
        await depoisDeAlterar();
      } catch (e) {
        toast(mensagemErro(e), "erro");
      }
    };
    $("#ac-confirmar", card)?.addEventListener("click", () => mudar("confirmado", "Agendamento confirmado"));
    $("#ac-iniciar", card)?.addEventListener("click", () => mudar("em_atendimento", "Atendimento iniciado"));
    $("#ac-faltou", card)?.addEventListener("click", async () => {
      if (await confirmar("Marcar este cliente como faltante?", { titulo: "Registrar falta", ok: "Marcar falta", perigo: true })) mudar("faltou", "Falta registrada");
    });
    $("#ac-cancelar", card)?.addEventListener("click", async () => {
      if (await confirmar("O horário será liberado na agenda do profissional.", { titulo: "Cancelar agendamento?", ok: "Cancelar agendamento", perigo: true })) mudar("cancelado", "Agendamento cancelado");
    });
    $("#ac-receber", card)?.addEventListener("click", visaoPagamento);
    $("#ac-reagendar", card)?.addEventListener("click", visaoReagendar);

    $$("[data-estorno]", card).forEach((b) =>
      b.addEventListener("click", async () => {
        if (!(await confirmar("O valor sairá do caixa deste atendimento.", { titulo: "Estornar pagamento?", ok: "Estornar", perigo: true }))) return;
        try {
          await api.del(`/pagamentos/${b.dataset.estorno}`);
          toast("Pagamento estornado");
          await depoisDeAlterar();
        } catch (e) {
          toast(mensagemErro(e), "erro");
        }
      })
    );
  }

  // --------------------------------------------------------- pagamento
  function visaoPagamento() {
    const a = d.agendamento;
    const saldoCent = centavos(a.saldo);
    let linhas = saldoCent > 0 ? [{ forma: "pix", valor: valorParaInput(a.saldo) }] : [];

    card.innerHTML = `
      ${cabecalhoModal("RECEBIMENTO", a.cliente.nome)}
      <div class="dinheiro-box">
        <div><small>Total</small><strong>${brl(a.valor_total)}</strong></div>
        <div><small>Já pago</small><strong>${brl(a.pago)}</strong></div>
        <div class="${saldoCent > 0 ? "saldo-aberto" : "saldo-ok"}"><small>A receber</small><strong>${brl(a.saldo)}</strong></div>
      </div>
      <p class="secao-titulo">Formas de pagamento</p>
      <div id="pg-linhas"></div>
      <button type="button" class="link-inline" id="pg-add">＋ Dividir em outra forma</button>
      <p class="confere" id="pg-confere"></p>
      <div id="pg-erro"></div>
      <div class="modal-actions espalhado">
        <button class="secondary-button" id="pg-voltar">Voltar</button>
        <div class="grupo">
          <button class="secondary-button" id="pg-parcial">Registrar sem concluir</button>
          <button class="primary-button" id="pg-concluir">Concluir atendimento</button>
        </div>
      </div>`;

    const informado = () => linhas.reduce((t, l) => { const v = parseValor(l.valor); return t + (Number.isNaN(v) ? 0 : centavos(v)); }, 0);

    function atualizarConfere() {
      const inf = informado();
      const el = $("#pg-confere", card);
      let cls = "ok", txt = "Confere ✓";
      if (saldoCent === 0 && inf === 0) txt = "Tudo já foi pago. Basta concluir.";
      else if (inf < saldoCent) { cls = "falta"; txt = `Faltam ${brl((saldoCent - inf) / 100)}`; }
      else if (inf > saldoCent) { cls = "excede"; txt = `Passou ${brl((inf - saldoCent) / 100)} do valor`; }
      el.className = `confere ${cls}`;
      el.textContent = txt;
      $("#pg-concluir", card).disabled = inf !== saldoCent;
      $("#pg-parcial", card).disabled = !(inf > 0 && inf <= saldoCent);
    }

    function desenharLinhas() {
      $("#pg-linhas", card).innerHTML = linhas
        .map((l, i) => `<div class="pay-row">
          <select data-i="${i}" data-k="forma" aria-label="Forma de pagamento">${opcoes(Object.entries(FORMAS), l.forma)}</select>
          <input data-i="${i}" data-k="valor" inputmode="decimal" value="${esc(l.valor)}" placeholder="0,00" aria-label="Valor" />
          <button class="icon-button" data-rm="${i}" aria-label="Remover forma">${icon("close", 16)}</button></div>`)
        .join("");
      atualizarConfere();
    }

    $("#pg-linhas", card).addEventListener("input", (e) => {
      const i = e.target.dataset.i;
      if (i === undefined) return;
      linhas[i][e.target.dataset.k] = e.target.value;
      atualizarConfere();
    });
    $("#pg-linhas", card).addEventListener("click", (e) => {
      const rm = e.target.closest("[data-rm]");
      if (!rm) return;
      linhas.splice(Number(rm.dataset.rm), 1);
      desenharLinhas();
    });
    $("#pg-add", card).addEventListener("click", () => {
      const falta = Math.max(0, saldoCent - informado());
      linhas.push({ forma: "dinheiro", valor: falta ? valorParaInput(falta / 100) : "" });
      desenharLinhas();
    });
    $("#pg-voltar", card).addEventListener("click", visaoResumo);

    const montar = () =>
      linhas
        .map((l) => ({ forma: l.forma, valor: parseValor(l.valor) }))
        .filter((l) => !Number.isNaN(l.valor) && l.valor > 0)
        .map((l) => ({ forma: l.forma, valor: l.valor.toFixed(2) }));

    const enviar = async (caminho, mensagem, botao) => {
      botao.disabled = true;
      $("#pg-erro", card).innerHTML = "";
      try {
        await api.post(`/agendamentos/${id}/${caminho}`, { pagamentos: montar() });
        toast(mensagem);
        await depoisDeAlterar();
      } catch (e) {
        $("#pg-erro", card).innerHTML = blocoErro(e);
        atualizarConfere();
      }
    };
    $("#pg-concluir", card).addEventListener("click", (e) => enviar("concluir", "Atendimento concluído!", e.currentTarget));
    $("#pg-parcial", card).addEventListener("click", (e) => enviar("pagamentos", "Pagamento registrado", e.currentTarget));

    desenharLinhas();
  }

  // ------------------------------------------------------- reagendamento
  async function visaoReagendar() {
    const a = d.agendamento;
    card.innerHTML = `${cabecalhoModal("REAGENDAR", a.cliente.nome)}${carregando()}`;
    let profs;
    try {
      profs = await api.get("/profissionais", { unidade_id: a.unidade_id });
    } catch (e) {
      card.innerHTML = `${cabecalhoModal("REAGENDAR", a.cliente.nome)}${blocoErro(e)}`;
      return;
    }
    const ids = a.servicos.map((s) => s.id);
    const elegiveis = profs.filter((p) => p.id === a.profissional.id || ids.every((i) => p.servicos.some((s) => s.id === i)));

    card.innerHTML = `
      ${cabecalhoModal("REAGENDAR", a.cliente.nome)}
      <div id="rg-erro"></div>
      <div class="form-grid">
        ${campo("Data", `<input type="date" id="rg-data" value="${esc(a.inicio.slice(0, 10))}" />`)}
        ${campo("Horário", `<input type="time" id="rg-hora" step="900" value="${esc(hora(a.inicio))}" />`)}
        ${campo("Profissional", `<select id="rg-prof">${opcoes(elegiveis.map((p) => [p.id, p.nome]), a.profissional.id)}</select>`, { cheio: true })}
      </div>
      <p class="dica">Duração do atendimento: ${a.duracao_min} min (o término é recalculado).</p>
      <div class="modal-actions"><button class="secondary-button" id="rg-voltar">Voltar</button><button class="primary-button" id="rg-salvar">Salvar novo horário</button></div>`;

    $("#rg-voltar", card).addEventListener("click", visaoResumo);
    $("#rg-salvar", card).addEventListener("click", async (e) => {
      const dia = $("#rg-data", card).value;
      const h = $("#rg-hora", card).value;
      if (!dia || !/^\d{2}:\d{2}$/.test(h)) {
        $("#rg-erro", card).innerHTML = blocoErro(new Error("Informe a data e o horário."));
        return;
      }
      e.currentTarget.disabled = true;
      try {
        await api.patch(`/agendamentos/${id}`, { inicio: `${dia}T${h}:00`, profissional_id: Number($("#rg-prof", card).value) });
        toast("Agendamento reagendado");
        await depoisDeAlterar();
      } catch (err) {
        $("#rg-erro", card).innerHTML = blocoErro(err);
        e.currentTarget.disabled = false;
      }
    });
  }

  try {
    await carregar();
    visaoResumo();
  } catch (e) {
    card.innerHTML = `${cabecalhoModal("AGENDAMENTO", "Não foi possível abrir")}${blocoErro(e)}`;
  }
}
