"""Cliente HTTP da API Flask. O dashboard NUNCA acessa o MySQL direto:
tudo passa pela API, que já aplica login, perfis e isolamento por empresa."""
import os
from pathlib import Path

import requests
import streamlit as st
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")  # barbershop/.env
API_URL = os.getenv("API_URL", "http://localhost:5000/api").rstrip("/")


class ApiError(Exception):
    def __init__(self, mensagem, status=None):
        super().__init__(mensagem)
        self.status = status


def _headers():
    token = st.session_state.get("token")
    return {"Authorization": f"Bearer {token}"} if token else {}


def _request(method, path, **kwargs):
    try:
        resp = requests.request(
            method, f"{API_URL}{path}", headers=_headers(), timeout=20, **kwargs
        )
    except requests.ConnectionError:
        raise ApiError(f"Não foi possível conectar à API em {API_URL}. O servidor Flask está rodando?")
    except requests.Timeout:
        raise ApiError("A API demorou demais para responder.")

    if resp.status_code == 401 and st.session_state.get("token"):
        logout()  # token expirado ou inválido
        raise ApiError("Sua sessão expirou. Entre novamente.", 401)

    try:
        corpo = resp.json()
    except ValueError:
        corpo = {}
    if not resp.ok:
        raise ApiError(corpo.get("erro", f"Erro {resp.status_code} na API"), resp.status_code)
    return corpo


def get(path, **params):
    params = {k: v for k, v in params.items() if v not in (None, "")}
    return _request("GET", path, params=params)


def login(email, senha):
    dados = _request("POST", "/auth/login", json={"email": email, "senha": senha})
    st.session_state["token"] = dados["token"]
    st.session_state["usuario"] = dados["usuario"]
    return dados["usuario"]


def logout():
    for chave in ("token", "usuario"):
        st.session_state.pop(chave, None)


def usuario():
    return st.session_state.get("usuario")


def exigir_login(perfis=None):
    """Chame no topo de cada página. Interrompe a página se não houver login ou perfil."""
    if not st.session_state.get("token"):
        st.warning("Faça login na página inicial para continuar.")
        st.stop()
    if perfis and usuario()["perfil"] not in perfis:
        st.error("Seu perfil não tem acesso a esta página.")
        st.stop()
