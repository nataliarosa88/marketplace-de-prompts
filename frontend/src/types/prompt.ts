export type Prompt = {
  id: string;
  title: string;
  body: string;
  author?: string;
  tags: string[];
  model?: string;
  desc?: string;
  created: number;
  updated?: number;
  createdAt?: string;
  updatedAt?: string;
  copies: number;
};

export type PromptInput = {
  title: string;
  body: string;
  author?: string;
  tags: string[];
  model?: string;
  desc?: string;
  copies?: number;
};
