import { Prompt } from "@/types/prompt";

export function filterPrompts(prompts: Prompt[], query: string, tag: string): Prompt[] {
  const normalizedQuery = query.trim().toLowerCase();

  return prompts.filter((prompt) => {
    const matchTag = tag === "all" || prompt.tags.includes(tag);
    const matchQuery =
      normalizedQuery.length === 0 ||
      prompt.title.toLowerCase().includes(normalizedQuery) ||
      prompt.body.toLowerCase().includes(normalizedQuery) ||
      (prompt.desc ?? "").toLowerCase().includes(normalizedQuery) ||
      prompt.tags.some((item) => item.toLowerCase().includes(normalizedQuery));

    return matchTag && matchQuery;
  });
}
