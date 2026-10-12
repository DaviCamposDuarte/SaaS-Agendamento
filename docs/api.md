# API

Todas as rotas ficam sob `/api`. Erros voltam em JSON: `{"erro": "mensagem"}`.
Rotas protegidas exigem o header `Authorization: Bearer <token>`.

## Auth

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/registrar` | Cria empresa, unidade "Matriz" e usuário admin. Retorna token. |
| POST | `/api/auth/login` | Retorna token e dados do usuário. |
| GET | `/api/auth/me` | Dados do usuário logado e da empresa. |

### Registrar
```json
{"empresa_nome": "Barbearia X", "cnpj": "opcional", "nome": "Fulano",
 "email": "fulano@x.com", "senha": "123456"}
```

### Login
```json
{"email": "fulano@x.com", "senha": "123456"}
```

## Permissões

| Perfil | Pode |
|---|---|
| `admin` | Tudo |
| `gerente` | Serviços, profissionais, exclusão de clientes + tudo que a recepção faz |
| `recepcao` | Listar tudo, cadastrar e editar clientes |

Toda consulta é filtrada pela empresa do token. Recursos de outra empresa respondem **404**.
Campos desconhecidos no corpo (ex.: `empresa_id`) são rejeitados com **422**.

## Unidades — `/api/unidades`

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| GET | `/` | login | Lista. `?incluir_inativas=true` |
| GET | `/<id>` | login | Detalhe |
| POST | `/` | admin | `{nome, endereco?, telefone?}` |
| PATCH | `/<id>` | admin | Atualiza campos enviados (`ativa` reativa) |
| DELETE | `/<id>` | admin | Desativa (não apaga) |

## Serviços — `/api/servicos`

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| GET | `/` | login | `?unidade_id=` `?incluir_inativos=true` |
| GET | `/<id>` | login | Detalhe |
| POST | `/` | gerente | `{unidade_id, nome, duracao_min, preco}` |
| PATCH | `/<id>` | gerente | Não permite trocar `unidade_id` |
| DELETE | `/<id>` | gerente | Desativa |

`preco` volta como string com 2 casas (`"35.00"`).

## Profissionais — `/api/profissionais`

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| GET | `/` | login | `?unidade_id=` `?servico_id=` `?incluir_inativos=true` |
| GET | `/<id>` | login | Detalhe com serviços |
| POST | `/` | gerente | `{unidade_id, nome, telefone?, comissao_pct?, servico_ids?}` |
| PATCH | `/<id>` | gerente | `servico_ids` substitui a lista inteira |
| DELETE | `/<id>` | gerente | Desativa |

`servico_ids` só aceita serviços da mesma unidade do profissional.

## Clientes — `/api/clientes`

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| GET | `/` | login | `?busca=` (nome, e-mail, telefone) `?pagina=1` `?por_pagina=20` (máx. 100) |
| GET | `/<id>` | login | Detalhe |
| GET | `/<id>/historico` | login | Agendamentos do cliente + resumo (visitas, total gasto, última visita) |
| POST | `/` | login | `{nome, telefone?, email?, nascimento?, observacoes?}` |
| PATCH | `/<id>` | login | Atualiza campos enviados |
| DELETE | `/<id>` | gerente | Exclui. 409 se tiver agendamentos |

Telefone é guardado só com dígitos e é único por empresa (409 se repetir).
A listagem devolve `{itens, total, pagina, por_pagina}`.

## Agendamentos — `/api/agendamentos`

Qualquer usuário logado (inclusive recepção) cria, altera e muda status.
Datas/horas são **horário local, sem fuso**: `2026-10-20T14:30:00`. Com fuso (`Z`, `+03:00`) → 422.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/` | `?data=AAAA-MM-DD` (um dia) ou `?data_inicio=&data_fim=` (máx. 62 dias). Sem datas: hoje. Filtros: `unidade_id`, `profissional_id`, `cliente_id`, `status`. Ordenado por horário. |
| GET | `/<id>` | Detalhe |
| POST | `/` | `{unidade_id, cliente_id, profissional_id, inicio, servico_ids[], observacoes?}` |
| PATCH | `/<id>` | `inicio`, `profissional_id`, `servico_ids`, `observacoes`. Só se `agendado` ou `confirmado`. |
| POST | `/<id>/status` | `{"status": "confirmado"}` |

### Regras
- `fim` = `inicio` + soma da duração dos serviços (calculado pelo servidor).
- Preço e duração são **congelados** no agendamento; mudar o serviço depois não altera o histórico.
- O profissional precisa ser da unidade, estar ativo e realizar todos os serviços pedidos (422).
- **Conflito (409)**: mesmo profissional com horário sobreposto. Horários colados (10:00–10:30 e 10:30–11:00) são permitidos. `cancelado` e `faltou` não ocupam a agenda. A resposta traz `conflito: {agendamento_id, inicio, fim}`.

### Status
```
agendado ──► confirmado ──► em_atendimento ──► concluido
   │             │                 │
   ├─────────────┴──► faltou       └──► cancelado
   └──► em_atendimento / cancelado
```
`concluido`, `cancelado` e `faltou` são finais. Transição inválida → 409 com `permitidos`.

## Pagamentos

Qualquer usuário logado registra e conclui. Só `gerente`/`admin` estorna.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/agendamentos/<id>/pagamentos` | Agendamento + pagamentos + `resumo {total, pago, saldo}` |
| POST | `/api/agendamentos/<id>/pagamentos` | `{"pagamentos": [{"forma": "pix", "valor": 20}]}`. Sinal, parcial ou dividido. A soma nunca passa do total (422). |
| POST | `/api/agendamentos/<id>/concluir` | `{"pagamentos": [...]}` (opcional). Registra o que vier e conclui. Só conclui se o total pago fechar **exatamente** o valor (422, com `saldo`). Tudo ou nada. |
| DELETE | `/api/pagamentos/<id>` | Estorno (gerente). 409 se o atendimento já foi concluído. |

Formas: `dinheiro`, `pix`, `debito`, `credito`.

### Regras
- `concluir` aceita agendamentos `agendado`, `confirmado` ou `em_atendimento`.
- `POST /status` com `concluido` é recusado (409): concluir exige pagamento.
- Cancelar ou marcar falta com pagamento registrado → 409. Estorne antes.
- **Comissão**: ao concluir, grava `comissao.pct` (do profissional) e `comissao.valor` = total × pct, arredondado ao centavo. Fica congelada: mudar o % depois não altera o passado.
- `pago_em` e `concluido_em` usam o **horário local** (`APP_TIMEZONE`, padrão `America/Sao_Paulo`), o mesmo relógio dos agendamentos.

## Relatórios — `/api/relatorios` (somente gerente/admin)

Parâmetros comuns: `data_inicio`, `data_fim` (AAAA-MM-DD, padrão: dia 1 do mês até hoje, máx. 366 dias),
`unidade_id`, `profissional_id` (404 se forem de outra empresa).

| Rota | Retorna |
|---|---|
| `/resumo` | KPIs: `faturamento`, `faturamento_anterior`, `variacao_pct`, `atendimentos`, `ticket_medio`, `comissoes`, `agendamentos {total, por_status}`, `taxa_faltas_pct`, `taxa_cancelamento_pct`, `clientes {atendidos, novos, recorrentes}` |
| `/faturamento-diario` | Um item por dia do período (dias sem movimento vêm zerados): `{data, faturamento, atendimentos}` |
| `/por-profissional` | `{profissional, atendimentos, receita, ticket_medio, faltas, comissao_pct, comissao}` |
| `/por-unidade` | `{unidade, faturamento, atendimentos, receita, ticket_medio}` |
| `/por-forma-pagamento` | `{forma, total, quantidade}` |
| `/servicos-mais-vendidos` | `{servico, quantidade, receita}`. `?limite=10` (máx. 50) |

### Definições
- **Faturamento** (caixa): soma dos pagamentos pela data em que foram recebidos (`pago_em`).
- **Receita / ticket médio**: soma dos serviços dos atendimentos concluídos no período (`concluido_em`).
- **Variação**: faturamento contra o período anterior de mesma duração.
- **Taxa de faltas**: faltas ÷ (concluídos + faltas), entre os atendimentos que começaram no período.
- **Taxa de cancelamento**: cancelados ÷ todos os agendamentos que começaram no período.
- **Cliente novo**: primeira visita concluída caiu dentro do período. **Recorrente**: já tinha visita antes.
- **Comissões**: soma da comissão congelada nos atendimentos concluídos no período.

## Interface web (recepção e gestão)

Servida pelo próprio Flask em `http://localhost:5000/`. É uma página única (HTML + CSS + JavaScript puro, sem build)
em `frontend/`, baseada no layout do Figma, que consome esta API com o token JWT guardado no navegador.

| Tela | Quem acessa | O que faz |
|---|---|---|
| Dashboard | todos | Hoje: agenda e números. Gerente/admin: faturamento, serviços e clientes do mês |
| Agenda | todos | Dia / semana / mês, filtro por profissional, busca, clique no horário vazio para agendar |
| Clientes | todos | Busca, cadastro, edição e histórico |
| Profissionais, Serviços | gerente/admin | Cadastro com comissão e serviços realizados |
| Unidades | ver: gerente/admin · criar/editar: admin | |
| Financeiro, Relatórios | gerente/admin | Mesmos dados de `/api/relatorios` |

Dentro de um agendamento: confirmar, iniciar atendimento, reagendar, marcar falta, cancelar,
receber (dividindo em formas de pagamento) e concluir.
