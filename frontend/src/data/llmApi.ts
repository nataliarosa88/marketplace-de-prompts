import { getToken } from "@/data/authStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

export type LlmOption = {
  id: string;
  name: string;
  active: boolean;
};

export type DeleteLlmResult = {
  id: string;
  name: string;
  active: boolean;
  deleted: boolean;
};

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? getToken() : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Falha na requisicao");
  }
  return (await response.json()) as T;
}

export async function fetchLlms(): Promise<LlmOption[]> {
  const response = await fetch(`${API_URL}/llms`, { cache: "no-store" });
  return handleResponse<LlmOption[]>(response);
}

export async function fetchAdminLlms(): Promise<LlmOption[]> {
  const response = await fetch(`${API_URL}/admin/llms`, { headers: authHeaders(), cache: "no-store" });
  return handleResponse<LlmOption[]>(response);
}

export async function createLlm(name: string): Promise<LlmOption> {
  const response = await fetch(`${API_URL}/admin/llms`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name }),
  });
  return handleResponse<LlmOption>(response);
}

export async function deleteLlm(id: string): Promise<DeleteLlmResult> {
  const response = await fetch(`${API_URL}/admin/llms/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse<DeleteLlmResult>(response);
}
