const TOKEN_KEY = 'nexteducation.token';

// localStorage is the simplest option while learning. We will reconsider it for production.
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(message, status, body = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status; // 0 = the server could not be reached
    this.body = body;
  }
}

// The auth system will register a function here, called when the session is over
let onSessionExpired = () => {};
export const setSessionExpiredHandler = (fn) => {
  onSessionExpired = fn;
};

export async function api(path, { method = 'GET', body, signal, expireSession = true } = {}) {
  const token = tokenStore.get();
  let response;

  try {
    response = await fetch(`/api${path}`, {
      method,
      signal,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Impossible de joindre le serveur. Vérifie ta connexion.', 0);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // A 401 while we hold a token means the session is over (the JWT lasts 1 hour)
    if (response.status === 401 && token && expireSession) {
      tokenStore.clear();
      onSessionExpired();
    }
    throw new ApiError(
      data?.message ?? 'Une erreur est survenue. Réessaie dans un instant.',
      response.status,
      data,
    );
  }
  return data;
}