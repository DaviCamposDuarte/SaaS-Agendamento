import pandas as pd
import streamlit as st

from components.formatos import STATUS, brl, data_hora, telefone
from services import api_client as api

st.set_page_config(page_title="Clientes", page_icon="👥", layout="wide")
api.exigir_login()

st.title("👥 Clientes")
busca = st.text_input("Buscar por nome, telefone ou e-mail")

try:
    dados = api.get("/clientes", busca=busca, por_pagina=50)
except api.ApiError as e:
    st.error(str(e))
    st.stop()

clientes = dados["itens"]
st.caption(f"{dados['total']} cliente(s) encontrado(s)" + (" — mostrando os 50 primeiros" if dados["total"] > 50 else ""))

if not clientes:
    st.info("Nenhum cliente encontrado.")
    st.stop()

st.dataframe(
    pd.DataFrame(
        [{"Nome": c["nome"], "Telefone": telefone(c["telefone"]), "E-mail": c["email"] or ""} for c in clientes]
    ),
    hide_index=True,
)

st.divider()
st.subheader("Histórico")
por_nome = {f"{c['nome']} ({telefone(c['telefone']) or 'sem telefone'})": c["id"] for c in clientes}
escolhido = st.selectbox("Cliente", list(por_nome))

try:
    hist = api.get(f"/clientes/{por_nome[escolhido]}/historico")
except api.ApiError as e:
    st.error(str(e))
    st.stop()

r = hist["resumo"]
m1, m2, m3 = st.columns(3)
m1.metric("Visitas concluídas", r["total_visitas"])
m2.metric("Total gasto", brl(r["total_gasto"]))
m3.metric("Última visita", data_hora(r["ultima_visita"]) or "—")

if hist["agendamentos"]:
    st.dataframe(
        pd.DataFrame(
            [
                {
                    "Data": data_hora(a["inicio"]),
                    "Unidade": a["unidade"],
                    "Profissional": a["profissional"],
                    "Serviços": ", ".join(s["nome"] for s in a["servicos"]),
                    "Valor": brl(a["valor_total"]),
                    "Status": STATUS[a["status"]],
                }
                for a in hist["agendamentos"]
            ]
        ),
        hide_index=True,
    )
else:
    st.info("Este cliente ainda não tem agendamentos.")
