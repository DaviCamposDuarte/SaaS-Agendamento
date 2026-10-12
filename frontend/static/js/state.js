import { api, currentUser } from "./api.js";

const CHAVE_UNIDADE = "bb_unidade";

export const estado = {
  empresa: null,
  unidades: [],
  unidadeId: JSON.parse(localStorage.getItem(CHAVE_UNIDADE) || "null"),
};

export async function carregarUnidades() {
  estado.unidades = await api.get("/unidades");
  if (estado.unidadeId && !estado.unidades.some((u) => u.id === estado.unidadeId)) {
    estado.unidadeId = null;
  }
  return estado.unidades;
}

export function setUnidade(id) {
  estado.unidadeId = id;
  localStorage.setItem(CHAVE_UNIDADE, JSON.stringify(id));
}

export const nomeUnidade = (id = estado.unidadeId) =>
  id ? estado.unidades.find((u) => u.id === id)?.nome ?? "Unidade" : "Todas as unidades";

export const perfil = () => currentUser()?.perfil;
export const ehGerente = () => ["admin", "gerente"].includes(perfil());
export const ehAdmin = () => perfil() === "admin";
