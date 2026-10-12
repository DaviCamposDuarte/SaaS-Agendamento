// Cliente da API (mesma origem: o Flask serve a interface e a API).
const TOKEN = "bb_token";
const USER = "bb_user";

export class ApiError extends Error {
  constructor(mensagem, status, dados) {
    super(mensagem);
    this.status = status;
    this.dados = dados;
  }
}

export const getToken = () => localStorage.getItem(TOKEN);
export const currentUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER) || "null");
  } catch {
    return null;
  }
};
export function setSession(token, usuario) {
  localStorage.setItem(TOKEN, token);
  localStorage.setItem(USER, JSON.stringify(usuario));
}
export function clearSession() {
  localStorage.removeItem(TOKEN);
  localStorage.removeItem(USER);
}

async function request(metodo, caminho, { params, corpo } = {}) {
  const url = new URL(`/api${caminho}`, window.location.origin);
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== null && v !== undefined && v !== "") url.searchParams.set(k, v);
  }
  const token = getToken();
  const headers = {};
  if (corpo !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let resp;
  try {
    resp = await fetch(url, {
      method: metodo,
      headers,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ApiError("Sem conexão com o servidor. Verifique se a API está rodando.", 0, null);
  }

  let dados = null;
  if (resp.status !== 204) {
    try {
      dados = await resp.json();
    } catch {
      dados = null;
    }
  }
  if (!resp.ok) {
    if (resp.status === 401 && token && !caminho.startsWith("/auth/login")) {
      clearSession();
      window.dispatchEvent(new Event("sessao-expirada"));
    }
    throw new ApiError(dados?.erro || `Erro ${resp.status} na API`, resp.status, dados);
  }
  return dados;
}

export const api = {
  get: (caminho, params) => request("GET", caminho, { params }),
  post: (caminho, corpo = {}) => request("POST", caminho, { corpo }),
  patch: (caminho, corpo = {}) => request("PATCH", caminho, { corpo }),
  del: (caminho) => request("DELETE", caminho),
};
