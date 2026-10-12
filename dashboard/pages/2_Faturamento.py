import pandas as pd
import streamlit as st

from components import graficos
from components.filtros import filtro_periodo
from components.formatos import brl
from services import api_client as api

st.set_page_config(page_title="Faturamento", page_icon="💰", layout="wide")
api.exigir_login(perfis=("admin", "gerente"))

st.title("💰 Faturamento")
filtro = filtro_periodo()

try:
    unidades = api.get("/relatorios/por-unidade", **filtro.params())
    profissionais = api.get("/relatorios/por-profissional", **filtro.params())
    servicos = api.get("/relatorios/servicos-mais-vendidos", **filtro.params())
except api.ApiError as e:
    st.error(str(e))
    st.stop()

aba_un, aba_prof, aba_serv = st.tabs(["Por unidade", "Por profissional", "Serviços mais vendidos"])


def mostrar(dados, nome_col, colunas, valor_col, titulo, vazio):
    if not dados:
        st.info(vazio)
        return
    df = pd.DataFrame(dados)
    grafico = df[[nome_col, valor_col]].copy()
    grafico[valor_col] = pd.to_numeric(grafico[valor_col])
    st.plotly_chart(graficos.barras_horizontais(grafico, valor_col, nome_col, titulo, "R$"))

    tabela = df[list(colunas)].rename(columns=colunas)
    for col in colunas.values():
        if "R$" in col:
            tabela[col] = tabela[col].map(brl)
    st.dataframe(tabela, hide_index=True)


with aba_un:
    mostrar(
        unidades, "unidade",
        {"unidade": "Unidade", "faturamento": "Faturamento (R$)", "atendimentos": "Atendimentos",
         "ticket_medio": "Ticket médio (R$)"},
        "faturamento", "Faturamento por unidade", "Sem dados de unidades no período.",
    )

with aba_prof:
    mostrar(
        profissionais, "profissional",
        {"profissional": "Profissional", "receita": "Receita (R$)", "atendimentos": "Atendimentos",
         "ticket_medio": "Ticket médio (R$)", "faltas": "Faltas"},
        "receita", "Receita por profissional", "Sem dados de profissionais no período.",
    )

with aba_serv:
    mostrar(
        servicos, "servico",
        {"servico": "Serviço", "quantidade": "Quantidade", "receita": "Receita (R$)"},
        "receita", "Receita por serviço", "Nenhum serviço concluído no período.",
    )

st.caption(
    "Faturamento = pagamentos recebidos no período (caixa). "
    "Receita = valor dos serviços dos atendimentos concluídos no período."
)
