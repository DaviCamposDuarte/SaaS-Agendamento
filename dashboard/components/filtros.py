from datetime import date
from types import SimpleNamespace

import streamlit as st

from services import api_client as api


def filtro_periodo(com_unidade=True):
    """Filtros da barra lateral: período e unidade. Devolve um objeto com .params()."""
    hoje = date.today()
    st.sidebar.header("Filtros")
    periodo = st.sidebar.date_input(
        "Período", value=(hoje.replace(day=1), hoje), format="DD/MM/YYYY"
    )
    if not isinstance(periodo, (tuple, list)) or len(periodo) != 2:
        st.info("Selecione a data inicial e a data final no filtro ao lado.")
        st.stop()

    unidade_id = None
    if com_unidade:
        try:
            unidades = api.get("/unidades")
        except api.ApiError as e:
            st.error(str(e))
            st.stop()
        opcoes = {"Todas as unidades": None, **{u["nome"]: u["id"] for u in unidades}}
        escolha = st.sidebar.selectbox("Unidade", list(opcoes))
        unidade_id = opcoes[escolha]

    inicio, fim = periodo
    return SimpleNamespace(
        data_inicio=inicio,
        data_fim=fim,
        unidade_id=unidade_id,
        params=lambda: {
            "data_inicio": inicio.isoformat(),
            "data_fim": fim.isoformat(),
            "unidade_id": unidade_id,
        },
    )
