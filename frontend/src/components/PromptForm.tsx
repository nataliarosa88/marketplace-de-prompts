"use client";

import { FormEvent, useMemo, useState } from "react";
import { Prompt, PromptInput } from "@/types/prompt";

type PromptFormProps = {
  selectedPrompt: Prompt | null;
  onSave: (id: string | null, payload: PromptInput) => Promise<void>;
  onClose: () => void;
};

export function PromptForm({ selectedPrompt, onSave, onClose }: PromptFormProps) {
  const [title, setTitle] = useState(selectedPrompt?.title ?? "");
  const [body, setBody] = useState(selectedPrompt?.body ?? "");
  const [tags, setTags] = useState(selectedPrompt?.tags.join(", ") ?? "");
  const [model, setModel] = useState(selectedPrompt?.model ?? "");
  const [desc, setDesc] = useState(selectedPrompt?.desc ?? "");
  const [saving, setSaving] = useState(false);
  const modeText = useMemo(() => (selectedPrompt ? "Editar" : "Novo"), [selectedPrompt]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      return;
    }

    const payload: PromptInput = {
      title: title.trim(),
      body: body.trim(),
      tags: tags
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
      model: model.trim() || undefined,
      desc: desc.trim() || undefined,
    };

    try {
      setSaving(true);
      await onSave(selectedPrompt?.id ?? null, payload);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="prompt-form" onSubmit={handleSubmit}>
      <h2>{modeText} prompt</h2>
      <label>
        Titulo
        <input value={title} onChange={(event) => setTitle(event.target.value)} required />
      </label>
      <label>
        Prompt
        <textarea value={body} onChange={(event) => setBody(event.target.value)} required />
      </label>
      <label>
        Tags (separadas por virgula)
        <input value={tags} onChange={(event) => setTags(event.target.value)} />
      </label>
      <label>
        Modelo
        <input value={model} onChange={(event) => setModel(event.target.value)} />
      </label>
      <label>
        Descricao curta
        <input value={desc} onChange={(event) => setDesc(event.target.value)} />
      </label>
      <div className="prompt-form-actions">
        <button type="button" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}
