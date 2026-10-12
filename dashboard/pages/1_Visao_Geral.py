import pandas as pd
import streamlit as st

from components import graficos
from components.filtros import filtro_periodo
from components.formatos import FORMAS, brl, pct
from services import api_client as api

st.set_page_config(page_title="Visão geral", page_icon="📊", layout="wide")
api.exigir_login(perfis=("admin", "gerente"))

st.title("📊 Visão geral")
filtro = filtro_periodo()

try:
    resumo = api.get("/relatorios/resumo", **filtro.params())
    diario = api.get("/relatorios/faturamento-diario", **filtro.params())
    formas = api.get("/relatorios/por-forma-pagamento", **filtro.params())
except api.ApiError as e:
    st.error(str(e))
    st.stop()

variacao = resumo["variacao_pct"]
delta = f"{variacao:+.1f}% vs. período anterior".replace(".", ",") if variacao is not None else None

c1, c2, c3, c4 = st.columns(4)
c1.metric("Faturamento", brl(resumo["faturamento"]), delta)
c2.metric("Atendimentos concluídos", resumo["atendimentos"])
c3.metric("Ticket médio", brl(resumo["ticket_medio"]))
c4.metric("Comissões", brl(resumo["comissoes"]))

c5, c6, c7, c8 = st.columns(4)
c5.metric("Taxa de faltas", pct(resumo["taxa_faltas_pct"]))
c6.metric("Taxa de cancelamento", pct(resumo["taxa_cancelamento_pct"]))
clientes = resumo["clientes"]
c7.metric("Clientes atendidos", clientes["atendidos"])
c8.metric("Novos / recorrentes", f"{clientes['novos']} / {clientes['recorrentes']}")

st.divider()
esquerda, direita = st.columns([2, 1])

with esquerda:
    df = pd.DataFrame(diario)
    if df.empty or pd.to_numeric(df["faturamento"]).sum() == 0:
        st.info("Nenhum pagamento recebido no período.")
    else:
        df["faturamento"] = pd.to_numeric(df["faturamento"])
        df["data"] = pd.to_datetime(df["data"])
        st.plotly_chart(
            graficos.barras_diarias(df, "data", "faturamento", "Faturamento por dia", "R$")
        )

with direita:
    if not formas:
        st.info("Sem pagamentos por forma no período.")
    else:
        df_f = pd.DataFrame(formas)
        df_f["total"] = pd.to_numeric(df_f["total"])
        df_f["forma"] = df_f["forma"].map(FORMAS)
        st.plotly_chart(graficos.rosca(df_f, "forma", "total", "Formas de pagamento"))

por_status = resumo["agendamentos"]["por_status"]
if por_status:
    st.caption(
        f"Agendamentos no período: {resumo['agendamentos']['total']} — "
        + ", ".join(f"{k.replace('_', ' ')}: {v}" for k, v in por_status.items())
    )
