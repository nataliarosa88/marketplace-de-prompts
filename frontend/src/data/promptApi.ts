import { Prompt, PromptInput } from "@/types/prompt";
import { getToken } from "@/data/authStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

function normalizePrompt(prompt: Prompt): Prompt {
  return {
    ...prompt,
    created:
      prompt.created ??
      (prompt.createdAt ? new Date(prompt.createdAt).getTime() : Date.now()),
    updated:
      prompt.updated ??
      (prompt.updatedAt ? new Date(prompt.updatedAt).getTime() : undefined),
    copies: prompt.copies ?? 0,
    tags: prompt.tags ?? [],
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Falha na requisicao");
  }

  return (await response.json()) as T;
}

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? getToken() : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchPrompts(): Promise<Prompt[]> {
  const response = await fetch(`${API_URL}/prompts`, { cache: "no-store" });
  const prompts = await handleResponse<Prompt[]>(response);
  return prompts.map(normalizePrompt);
}

export async function createPrompt(payload: PromptInput): Promise<Prompt> {
  const response = await fetch(`${API_URL}/prompts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const prompt = await handleResponse<Prompt>(response);
  return normalizePrompt(prompt);
}

export async function updatePrompt(id: string, payload: PromptInput): Promise<Prompt> {
  const response = await fetch(`${API_URL}/prompts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const prompt = await handleResponse<Prompt>(response);
  return normalizePrompt(prompt);
}

export async function deletePrompt(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/prompts/${id}`, { method: "DELETE", headers: authHeaders() });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Falha ao remover prompt");
  }
}

export async function copyPrompt(id: string): Promise<Prompt> {
  const response = await fetch(`${API_URL}/prompts/${id}/copy`, {
    method: "POST",
    headers: authHeaders(),
  });
  const prompt = await handleResponse<Prompt>(response);
  return normalizePrompt(prompt);
}
