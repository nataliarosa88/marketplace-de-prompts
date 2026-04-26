"use client";

import { Prompt } from "@/types/prompt";

type PromptListProps = {
  prompts: Prompt[];
  onCopy: (prompt: Prompt) => void;
  onEdit: (prompt: Prompt) => void;
  onDelete: (id: string) => void;
};

export function PromptList({ prompts, onCopy, onEdit, onDelete }: PromptListProps) {
  if (prompts.length === 0) {
    return <p className="empty">Nenhum prompt encontrado.</p>;
  }

  return (
    <ul className="prompt-grid">
      {prompts.map((prompt) => (
        <li key={prompt.id} className="prompt-card">
          <h3>{prompt.title}</h3>
          <p>{prompt.desc ?? prompt.body.slice(0, 120)}</p>
          <small>{prompt.model ? `Modelo: ${prompt.model}` : "Sem modelo"}</small>
          <div className="prompt-tags">
            {prompt.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
          <div className="prompt-card-actions">
            <button onClick={() => onCopy(prompt)}>Copiar</button>
            <button onClick={() => onEdit(prompt)}>Editar</button>
            <button onClick={() => onDelete(prompt.id)}>Remover</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
