import { Prompt } from "@/types/prompt";
import { LlmOption, DeleteLlmResult } from "@/data/llmApi";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Falha na requisicao");
  }
  return (await response.json()) as T;
}

function base(secret: string) {
  return `${API_URL}/s/${encodeURIComponent(secret)}/admin`;
}

export async function fetchPendingPrompts(secret: string): Promise<Prompt[]> {
  const response = await fetch(`${base(secret)}/prompts/pending`, { cache: "no-store" });
  return handleResponse<Prompt[]>(response);
}

export async function approvePrompt(secret: string, id: string): Promise<void> {
  const response = await fetch(`${base(secret)}/prompts/${encodeURIComponent(id)}/approve`, { method: "POST" });
  await handleResponse(response);
}

export async function rejectPrompt(secret: string, id: string): Promise<void> {
  const response = await fetch(`${base(secret)}/prompts/${encodeURIComponent(id)}/reject`, { method: "POST" });
  await handleResponse(response);
}

export async function fetchAdminLlms(secret: string): Promise<LlmOption[]> {
  const response = await fetch(`${base(secret)}/llms`, { cache: "no-store" });
  return handleResponse<LlmOption[]>(response);
}

export async function createAdminLlm(secret: string, name: string): Promise<LlmOption> {
  const response = await fetch(`${base(secret)}/llms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return handleResponse<LlmOption>(response);
}

export async function deleteAdminLlm(secret: string, id: string): Promise<DeleteLlmResult> {
  const response = await fetch(`${base(secret)}/llms/${encodeURIComponent(id)}`, { method: "DELETE" });
  return handleResponse<DeleteLlmResult>(response);
}

