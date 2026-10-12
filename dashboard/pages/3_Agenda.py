from datetime import date

import pandas as pd
import streamlit as st

from components.formatos import STATUS, brl, hora
from services import api_client as api

st.set_page_config(page_title="Agenda", page_icon="📅", layout="wide")
api.exigir_login()

st.title("📅 Agenda")

try:
    unidades = api.get("/unidades")
except api.ApiError as e:
    st.error(str(e))
    st.stop()

st.sidebar.header("Filtros")
dia = st.sidebar.date_input("Dia", value=date.today(), format="DD/MM/YYYY")
opcoes_un = {"Todas as unidades": None, **{u["nome"]: u["id"] for u in unidades}}
unidade_id = opcoes_un[st.sidebar.selectbox("Unidade", list(opcoes_un))]

try:
    profs = api.get("/profissionais", unidade_id=unidade_id)
    opcoes_prof = {"Todos os profissionais": None, **{p["nome"]: p["id"] for p in profs}}
    profissional_id = opcoes_prof[st.sidebar.selectbox("Profissional", list(opcoes_prof))]

    opcoes_status = {"Todos os status": None, **{v: k for k, v in STATUS.items()}}
    status = opcoes_status[st.sidebar.selectbox("Status", list(opcoes_status))]

    agenda = api.get(
        "/agendamentos",
        data=dia.isoformat(),
        unidade_id=unidade_id,
        profissional_id=profissional_id,
        status=status,
    )
except api.ApiError as e:
    st.error(str(e))
    st.stop()

ativos = [a for a in agenda if a["status"] not in ("cancelado", "faltou")]
m1, m2, m3, m4 = st.columns(4)
m1.metric("Agendamentos", len(agenda))
m2.metric("Em aberto", sum(a["status"] in ("agendado", "confirmado", "em_atendimento") for a in agenda))
m3.metric("Concluídos", sum(a["status"] == "concluido" for a in agenda))
m4.metric("Valor previsto", brl(sum(float(a["valor_total"]) for a in ativos)))

if not agenda:
    st.info("Nenhum agendamento para os filtros selecionados.")
    st.stop()

df = pd.DataFrame(
    [
        {
            "Horário": f"{hora(a['inicio'])} – {hora(a['fim'])}",
            "Cliente": a["cliente"]["nome"],
            "Profissional": a["profissional"]["nome"],
            "Serviços": ", ".join(s["nome"] for s in a["servicos"]),
            "Valor": brl(a["valor_total"]),
            "Pago": brl(a["pago"]),
            "Status": STATUS[a["status"]],
        }
        for a in agenda
    ]
)
st.dataframe(df, hide_index=True)
st.caption("Este painel é para consulta. Agendar, confirmar e receber pagamentos é feito pela API/site.")
