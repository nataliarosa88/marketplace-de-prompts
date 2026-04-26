import { filterPrompts } from "@/logic/filterPrompts";
import { Prompt } from "@/types/prompt";

const basePrompt: Prompt = {
  id: "1",
  title: "Revisor de Codigo",
  body: "Analise bugs e performance",
  tags: ["codigo", "revisao"],
  model: "GPT-4o",
  desc: "Prompt de revisao",
  createdAt: "2026-04-01T10:00:00Z",
  copies: 0,
};

describe("filterPrompts", () => {
  it("filtra por texto", () => {
    const result = filterPrompts([basePrompt], "bugs", "all");
    expect(result).toHaveLength(1);
  });

  it("filtra por tag", () => {
    const result = filterPrompts([basePrompt], "", "codigo");
    expect(result).toHaveLength(1);
    expect(filterPrompts([basePrompt], "", "marketing")).toHaveLength(0);
  });
});
