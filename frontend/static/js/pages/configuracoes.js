import { currentUser } from "../api.js";
import { estado } from "../state.js";
import { esc, PERFIS } from "../ui.js";

export async function render(el) {
  const u = currentUser();
  el.innerHTML = `
    <section class="page-intro">
      <div><p class="eyebrow">SISTEMA</p><h1>Configurações</h1><p>Dados da sua conta e o que vem por aí.</p></div>
    </section>
    <section class="duas-colunas">
      <div class="chart-card" style="min-height:0">
        <div class="card-heading"><div><h2>Sua conta</h2><p>Informações do login atual</p></div></div>
        <div class="linhas" style="margin-top:6px">
          <div class="linha"><span>Empresa</span><strong>${esc(estado.empresa?.nome ?? "")}</strong></div>
          <div class="linha"><span>Usuário</span><strong>${esc(u.nome)}</strong></div>
          <div class="linha"><span>E-mail</span><strong>${esc(u.email)}</strong></div>
          <div class="linha"><span>Perfil</span><strong>${esc(PERFIS[u.perfil] ?? u.perfil)}</strong></div>
        </div>
      </div>
      <div class="chart-card" style="min-height:0">
        <div class="card-heading"><div><h2>Em desenvolvimento</h2><p>Ainda não disponível nesta versão</p></div></div>
        <div class="linhas" style="margin-top:6px">
          <div class="linha"><span>Horário de funcionamento por unidade</span><span class="tag">em breve</span></div>
          <div class="linha"><span>Bloqueios de agenda (folgas, almoço)</span><span class="tag">em breve</span></div>
          <div class="linha"><span>Cadastro de usuários e permissões</span><span class="tag">em breve</span></div>
          <div class="linha"><span>Lembretes por WhatsApp</span><span class="tag">em breve</span></div>
        </div>
      </div>
    </section>`;
}
