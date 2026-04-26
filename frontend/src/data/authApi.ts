import { AuthUser, setToken, setUser } from "@/data/authStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

async function handleJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const txt = await response.text();
    if (!txt) throw new Error("Falha na requisicao");
    try {
      const parsed = JSON.parse(txt) as { message?: string };
      throw new Error(parsed.message || txt);
    } catch {
      throw new Error(txt);
    }
  }
  return (await response.json()) as T;
}

type LoginResponse = {
  token: string;
  user: AuthUser;
};

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await handleJson<LoginResponse>(response);
  setToken(data.token);
  setUser(data.user);
  return data.user;
}

export async function register(email: string, password: string): Promise<AuthUser> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await handleJson<LoginResponse>(response);
  setToken(data.token);
  setUser(data.user);
  return data.user;
}

export function logout() {
  setToken(null);
  setUser(null);
}

