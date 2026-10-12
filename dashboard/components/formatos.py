from datetime import datetime
from decimal import Decimal


def brl(valor):
    """'1234.5' -> 'R$ 1.234,50'"""
    numero = Decimal(str(valor or 0))
    texto = f"{numero:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {texto}"


def pct(valor):
    return f"{float(valor or 0):.1f}%".replace(".", ",")


def data_hora(iso):
    return datetime.fromisoformat(iso).strftime("%d/%m/%Y %H:%M") if iso else ""


def hora(iso):
    return datetime.fromisoformat(iso).strftime("%H:%M") if iso else ""


def telefone(digitos):
    d = digitos or ""
    if len(d) == 11:
        return f"({d[:2]}) {d[2:7]}-{d[7:]}"
    if len(d) == 10:
        return f"({d[:2]}) {d[2:6]}-{d[6:]}"
    return d


FORMAS = {"dinheiro": "Dinheiro", "pix": "Pix", "debito": "Débito", "credito": "Crédito"}

STATUS = {
    "agendado": "🕓 Agendado",
    "confirmado": "✅ Confirmado",
    "em_atendimento": "✂️ Em atendimento",
    "concluido": "💰 Concluído",
    "cancelado": "❌ Cancelado",
    "faltou": "🚫 Faltou",
}
