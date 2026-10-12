import pandas as pd
import streamlit as st

from components import graficos
from components.filtros import filtro_periodo
from components.formatos import brl
from services import api_client as api

st.set_page_config(page_title="Profissionais", page_icon="✂️", layout="wide")
api.exigir_login(perfis=("admin", "gerente"))

st.title("✂️ Profissionais e comissões")
filtro = filtro_periodo()

try:
    linhas = api.get("/relatorios/por-profissional", **filtro.params())
except api.ApiError as e:
    st.error(str(e))
    st.stop()

if not linhas:
    st.info("Nenhum profissional com movimento no período.")
    st.stop()

df = pd.DataFrame(linhas)
for col in ("receita", "ticket_medio", "comissao", "comissao_pct"):
    df[col] = pd.to_numeric(df[col])

m1, m2, m3 = st.columns(3)
m1.metric("Comissões a pagar", brl(df["comissao"].sum()))
m2.metric("Receita dos profissionais", brl(df["receita"].sum()))
m3.metric("Atendimentos", int(df["atendimentos"].sum()))

esquerda, direita = st.columns(2)
with esquerda:
    st.plotly_chart(graficos.barras_horizontais(df, "receita", "profissional", "Receita", "R$"))
with direita:
    st.plotly_chart(graficos.barras_horizontais(df, "comissao", "profissional", "Comissão", "R$"))

tabela = pd.DataFrame(
    {
        "Profissional": df["profissional"],
        "Atendimentos": df["atendimentos"],
        "Receita": df["receita"].map(brl),
        "Ticket médio": df["ticket_medio"].map(brl),
        "Faltas": df["faltas"],
        "% comissão": df["comissao_pct"].map(lambda v: f"{v:.0f}%"),
        "Comissão": df["comissao"].map(brl),
    }
)
st.dataframe(tabela, hide_index=True)
st.caption("A comissão é calculada no fechamento de cada atendimento, com o % do profissional naquele momento.")
