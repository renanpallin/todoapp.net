import { parseApiError } from "./errors";

const BASE_URL = "/api/auth";

export interface AuthResponse {
  token: string;
  username: string;
}

async function authRequest(
  url: string,
  body: { username: string; password: string }
): Promise<AuthResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return response.json();
}

export const authApi = {
  register: (username: string, password: string) =>
    authRequest(`${BASE_URL}/register`, { username, password }),

  login: (username: string, password: string) =>
    authRequest(`${BASE_URL}/login`, { username, password }),
};
