<<<<<<< HEAD
# Barbershop - Gestão para barbearias e salões

Stack: Flask + MySQL + Streamlit + HTML/CSS/JS.

## Como começar
1. `cp .env.example .env`
2. `docker compose up -d` (MySQL local)
3. Backend: `cd backend && python -m venv venv && pip install -r requirements.txt`
4. Dashboard: `cd dashboard && pip install -r requirements.txt && streamlit run app.py`

## Rodando o backend
```bash
cd backend
flask --app run db init        # só na primeira vez
flask --app run db migrate -m "schema inicial"
flask --app run db upgrade
python run.py                  # http://localhost:5000/api/health
pytest                         # testes (usam SQLite em memória)
```

## Dashboard (Streamlit)
Com a API rodando (`python run.py`), em outro terminal:
```bash
cd dashboard
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
streamlit run app.py             # http://localhost:8501
```
Entre com o e-mail e a senha de um usuário da API. Faturamento, profissionais e visão geral
são exclusivos de gerente/admin; Agenda e Clientes também aparecem para a recepção.
O dashboard usa a variável `API_URL` do `.env` (padrão `http://localhost:5000/api`).

## Interface web
Com a API rodando (`python run.py`), abra **http://localhost:5000/** e entre com seu usuário.
O layout vem do Figma (`frontend/static/css/app.css`). Para aumentar ou diminuir todas as fontes,
altere `--t` no início do CSS (padrão `1.3`).
Os arquivos antigos vazios `frontend/templates/{base,login,agenda,clientes}.html` e `frontend/static/js/agenda.js`
não são mais usados e podem ser apagados.
=======