import streamlit as st

from services import api_client as api

st.set_page_config(page_title="Barbershop", page_icon="💈", layout="wide")


def tela_login():
    _, centro, _ = st.columns([1, 1.2, 1])
    with centro:
        st.title("💈 Barbershop")
        st.caption("Painel de gestão")
        with st.form("login"):
            email = st.text_input("E-mail")
            senha = st.text_input("Senha", type="password")
            entrar = st.form_submit_button("Entrar", type="primary")
        if entrar:
            try:
                api.login(email, senha)
                st.rerun()
            except api.ApiError as e:
                st.error(str(e))


def tela_inicial():
    usuario = api.usuario()
    st.sidebar.write(f"**{usuario['nome']}**")
    st.sidebar.caption(f"Perfil: {usuario['perfil']}")
    if st.sidebar.button("Sair"):
        api.logout()
        st.rerun()

    st.title("💈 Barbershop")
    st.write(f"Olá, **{usuario['nome']}**! Use o menu lateral para navegar.")

    if usuario["perfil"] in ("admin", "gerente"):
        st.markdown(
            """
            - **Visão geral** — faturamento, ticket médio, faltas e clientes
            - **Faturamento** — por unidade, profissional e serviço
            - **Agenda** — atendimentos do dia
            - **Clientes** — busca e histórico
            - **Profissionais** — produtividade e comissões
            """
        )
    else:
        st.markdown("- **Agenda** — atendimentos do dia\n- **Clientes** — busca e histórico")


if st.session_state.get("token"):
    tela_inicial()
else:
    tela_login()
