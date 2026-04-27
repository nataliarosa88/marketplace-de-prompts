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
