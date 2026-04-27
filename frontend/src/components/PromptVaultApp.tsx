"use client";

import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import { usePromptContext } from "@/context/PromptContext";
import { copyPrompt as copyPromptApi } from "@/data/promptApi";
import { Prompt } from "@/types/prompt";
import { fetchLlms, LlmOption } from "@/data/llmApi";

const PAGE_SIZE = 9;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PromptVaultApp() {
  const { prompts, loading, error, search, setSearch, activeTag, setActiveTag, savePrompt, refresh } = usePromptContext();
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);
  const [sort, setSort] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [toast, setToast] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", email: "", tags: [] as string[], model: "", desc: "" });
  const [tagInput, setTagInput] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [categorySearch, setCategorySearch] = useState("");
  const [showMoreCategories, setShowMoreCategories] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [llms, setLlms] = useState<LlmOption[]>([]);

  useEffect(() => {
    const saved = window.localStorage.getItem("promptvault_theme");
    const initial =
      saved === "light" || saved === "dark"
        ? saved
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(initial);
  }, []);

  useEffect(() => {
    document.body.classList.remove("theme-light", "theme-dark");
    document.body.classList.add(theme === "dark" ? "theme-dark" : "theme-light");
    window.localStorage.setItem("promptvault_theme", theme);
  }, [theme]);

  useEffect(() => {
    const dismissed = window.localStorage.getItem("promptvault_onboarding_dismissed") === "1";
    setOnboardingDismissed(dismissed);
  }, []);

  useEffect(() => {
    void loadLlms();
  }, []);

  const visiblePrompts = useMemo(() => {
    const q = search.toLowerCase();
    const list = prompts.filter((p) => {
      const matchTag = activeTag === "all" || (p.tags ?? []).includes(activeTag);
      const matchQ =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q) ||
        (p.desc ?? "").toLowerCase().includes(q) ||
        (p.tags ?? []).join(" ").toLowerCase().includes(q);
      return matchTag && matchQ;
    });
    return [...list].sort((a, b) => {
      if (sort === "newest") return (b.created ?? 0) - (a.created ?? 0);
      if (sort === "oldest") return (a.created ?? 0) - (b.created ?? 0);
      if (sort === "alpha") return a.title.localeCompare(b.title);
      if (sort === "copies") return (b.copies ?? 0) - (a.copies ?? 0);
      return 0;
    });
  }, [activeTag, prompts, search, sort]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = { all: prompts.length };
    prompts.forEach((p) => {
      (p.tags ?? []).forEach((t) => {
        counts[t] = (counts[t] ?? 0) + 1;
      });
    });
    return counts;
  }, [prompts]);

  const filteredCategoryEntries = useMemo(() => {
    const normalized = categorySearch.trim().toLowerCase();
    return Object.entries(tagCounts)
      .sort((a, b) => (a[0] === "all" ? -1 : b[1] - a[1]))
      .filter(([tag]) => {
        if (!normalized) return true;
        return tag.toLowerCase().includes(normalized);
      });
  }, [categorySearch, tagCounts]);

  const visibleCategories = useMemo(() => {
    const limit = showMoreCategories ? 10 : 5;
    const allTag = filteredCategoryEntries.find(([tag]) => tag === "all");
    const others = filteredCategoryEntries.filter(([tag]) => tag !== "all");
    const limited = others.slice(0, limit);
    return allTag ? [allTag, ...limited] : limited;
  }, [filteredCategoryEntries, showMoreCategories]);

  const totalPages = Math.max(1, Math.ceil(visiblePrompts.length / PAGE_SIZE));
  const pagePrompts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return visiblePrompts.slice(start, start + PAGE_SIZE);
  }, [currentPage, visiblePrompts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeTag, sort]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const searchSuggestions = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return [];
    const values = new Set<string>();

    prompts.forEach((prompt) => {
      const candidates = [prompt.title, prompt.author ?? "", prompt.desc ?? "", ...(prompt.tags ?? [])];
      candidates.forEach((candidate) => {
        const value = candidate.trim();
        if (!value) return;
        if (!value.toLowerCase().includes(normalized)) return;
        if (value.toLowerCase() === normalized) return;
        values.add(value);
      });
    });

    return Array.from(values).slice(0, 8);
  }, [prompts, search]);

  const selectedPrompt = useMemo(
    () => prompts.find((p) => p.id === currentViewId) ?? null,
    [currentViewId, prompts],
  );
  const reviewerTips = useMemo(() => {
    const tips: string[] = [];
    const normalizedTitle = form.title.trim();
    const normalizedBody = form.body.trim();
    const normalizedDesc = form.desc.trim();
    const hasOutputHint = /\b(formato|saida|output|retorne|json|markdown|lista)\b/i.test(normalizedBody);
    const hasContextHint = /\b(contexto|publico|objetivo|tom|restricao|limite)\b/i.test(normalizedBody);
    const hasActionVerb = /\b(crie|gere|escreva|resuma|explique|avalie|traduza)\b/i.test(normalizedBody);

    if (normalizedTitle.length < 8) {
      tips.push("esta sem titulo completo");
    } else if (normalizedTitle.split(/\s+/).length < 3) {
      tips.push("titulo pode ser mais especifico");
    }
    if (normalizedDesc.length < 20) {
      tips.push("a descricao pode melhorar: esta curta");
    }
    if (normalizedBody.length < 80) {
      tips.push("prompt curto: inclua contexto e objetivo");
    }
    if (!hasActionVerb) {
      tips.push("faltou um verbo de acao claro (ex.: crie, gere, explique)");
    }
    if (!hasContextHint) {
      tips.push("adicione contexto (publico, objetivo, tom ou restricoes)");
    }
    if (!hasOutputHint) {
      tips.push("defina formato de saida esperado (json, lista, markdown...)");
    }
    if (tips.length === 0) {
      tips.push("prompt bem estruturado");
    }
    return tips;
  }, [form.body, form.desc, form.title]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }

  function openNew() {
    const savedEmail = window.localStorage.getItem("promptvault_email") ?? "";
    setForm({ title: "", body: "", email: savedEmail, tags: [], model: "", desc: "" });
    setTagInput("");
    setFormOpen(true);
  }

  async function handleSave() {
    const email = form.email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      showToast("email invalido");
      return;
    }
    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      email,
      tags: form.tags,
      model: form.model.trim() || undefined,
      desc: form.desc.trim() || undefined,
    };
    if (!payload.title || !payload.body || !payload.desc) {
      showToast("Titulo, prompt e descricao curta sao obrigatorios");
      return;
    }
    window.localStorage.setItem("promptvault_email", email);
    await savePrompt(null, payload);
    setFormOpen(false);
    showToast("Prompt enviado para aprovacao");
  }

  async function handleCopy(prompt: Prompt) {
    await navigator.clipboard.writeText(prompt.body);
    await copyPromptApi(prompt.id);
    await refresh();
    showToast("Prompt copiado");
  }

  async function loadLlms() {
    const models = await fetchLlms();
    setLlms(models);
  }

  function dismissOnboarding() {
    window.localStorage.setItem("promptvault_onboarding_dismissed", "1");
    setOnboardingDismissed(true);
  }

  function applySearchSuggestion(value: string) {
    setSearch(value);
    setSearchFocused(false);
    setActiveSuggestionIndex(-1);
  }

  function formatCreatedAt(value?: number) {
    return new Date(value ?? Date.now()).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  function toMD(p: Prompt) {
    const tags = (p.tags ?? []).map((t) => `\`${t}\``).join(" ");
    return `# ${p.title}\n\n${p.desc ? `> ${p.desc}\n\n` : ""}**Modelo:** ${p.model || "nao especificado"}  \n**Tags:** ${
      tags || "—"
    }  \n**Criado:** ${formatCreatedAt(p.created)}  \n\n---\n\n\`\`\`\n${p.body}\n\`\`\`\n`;
  }

  function addTag(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return;
    if (form.tags.includes(normalized)) return;
    setForm((prev) => ({ ...prev, tags: [...prev.tags, normalized] }));
    setTagInput("");
  }

  function removeTag(tag: string) {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((item) => item !== tag) }));
  }

  function onTagInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === "," || event.key === "Tab") {
      event.preventDefault();
      addTag(tagInput);
      return;
    }
    if (event.key === "Backspace" && !tagInput && form.tags.length) {
      const last = form.tags[form.tags.length - 1];
      removeTag(last);
    }
  }

  function onGlobalKeys(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      setFormOpen(false);
      setCurrentViewId(null);
    }
  }

  return (
    <main onKeyDown={onGlobalKeys}>
      <header>
        <div className="header-inner">
          <a className="logo" href="#">
            <div className="logo-icon">MP</div>Marketplace<span> de Prompts</span>
          </a>
          <div className="nav-pills">
            <span onClick={openNew}>~/new</span>
          </div>
          <div className="header-right">
            <div className="stats-bar">
              <span>
                prompts: <b>{prompts.length}</b>
              </span>
              <span>
                tags: <b>{Object.keys(tagCounts).length - 1}</b>
              </span>
            </div>
            <button
              className="btn-theme"
              title={theme === "dark" ? "trocar para claro" : "trocar para escuro"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M21 14.5A8.5 8.5 0 0 1 9.5 3a7 7 0 1 0 11.5 11.5Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M12 2v2m0 16v2m10-10h-2M4 12H2m17.07-7.07-1.41 1.41M6.34 17.66l-1.41 1.41m13.14 0-1.41-1.41M6.34 6.34 4.93 4.93"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
            <button className="btn-new" onClick={openNew}>
              <span className="btn-new-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M5 7l6 5-6 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13 17h6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                </svg>
              </span>
              novo prompt
            </button>
          </div>
        </div>
      </header>

      <div className="hero-bar">
        <div className="hero-inner">
          <div className="hero-title">
            // <span>$find</span> · busca semantica e por tags · todos os prompts sao salvos no banco
          </div>
          <div className="search-row">
            <div className="search-wrap">
              <span className="search-prefix">$ grep -i "</span>
              <input
                id="search"
                type="text"
                placeholder='pesquisar prompts..."'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
                onKeyDown={(event) => {
                  if (!searchSuggestions.length) return;
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActiveSuggestionIndex((prev) => (prev + 1) % searchSuggestions.length);
                    return;
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActiveSuggestionIndex((prev) => (prev <= 0 ? searchSuggestions.length - 1 : prev - 1));
                    return;
                  }
                  if (event.key === "Enter" && activeSuggestionIndex >= 0) {
                    event.preventDefault();
                    applySearchSuggestion(searchSuggestions[activeSuggestionIndex]);
                    return;
                  }
                  if (event.key === "Escape") {
                    setSearchFocused(false);
                    setActiveSuggestionIndex(-1);
                  }
                }}
              />
              {searchFocused && searchSuggestions.length ? (
                <div className="search-autocomplete">
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion}-${index}`}
                      className={`search-suggestion ${activeSuggestionIndex === index ? "active" : ""}`}
                      onMouseEnter={() => setActiveSuggestionIndex(index)}
                      onClick={() => applySearchSuggestion(suggestion)}
                      type="button"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="newest">-- recentes</option>
              <option value="oldest">-- antigos</option>
              <option value="alpha">-- a-z</option>
              <option value="copies">-- mais copiados</option>
            </select>
          </div>
        </div>
      </div>

      <div className="main-wrap">
        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-label">// feed</div>
            <div className="view-actions">
              <button className="btn-md active-tab" type="button">
                todos
              </button>
            </div>
          </div>
          <div className="sidebar-section">
            <div className="sidebar-label">// categorias</div>
            <div className="category-search-wrap">
              <input
                className="field-input category-search"
                placeholder="buscar categoria"
                value={categorySearch}
                list="category-suggestions"
                onChange={(event) => setCategorySearch(event.target.value)}
              />
              <datalist id="category-suggestions">
                {Object.keys(tagCounts)
                  .filter((tag) => tag !== "all")
                  .map((tag) => (
                    <option key={tag} value={tag} />
                  ))}
              </datalist>
            </div>
            <div className="tag-list">
              {visibleCategories
                .map(([tag, count]) => (
                  <div
                    className={`tag-item ${activeTag === tag ? "active" : ""}`}
                    key={tag}
                    onClick={() => setActiveTag(tag)}
                  >
                    <span>{tag === "all" ? "# todos" : `#${tag}`}</span>
                    <span className="count">{count}</span>
                  </div>
                ))}
            </div>
            {filteredCategoryEntries.filter(([tag]) => tag !== "all").length > 5 ? (
              <button className="btn-md category-toggle" onClick={() => setShowMoreCategories((prev) => !prev)}>
                {showMoreCategories ? "mostrar menos" : "mostrar mais"}
              </button>
            ) : null}
          </div>
          <hr className="divider" />
          <div className="sidebar-section">
            <div className="sidebar-label">// ferramentas</div>
            <div className="tag-list">
              <div className="tag-item">
                <span>moderacao via URL secreta</span>
              </div>
            </div>
          </div>
        </aside>

        <main>
          <div className="grid-header">
            <div className="grid-info">
              mostrando <b>{pagePrompts.length}</b> de <b>{visiblePrompts.length}</b> prompts
            </div>
            <div className="sort-btns">
              <button className={`sort-btn ${viewMode === "grid" ? "active" : ""}`} onClick={() => setViewMode("grid")}>
                grid
              </button>
              <button className={`sort-btn ${viewMode === "list" ? "active" : ""}`} onClick={() => setViewMode("list")}>
                list
              </button>
            </div>
          </div>
          {loading ? <p>Carregando prompts...</p> : null}
          {error ? <p className="error">{error}</p> : null}
          <div className="cards-grid" style={{ gridTemplateColumns: viewMode === "list" ? "1fr" : undefined }}>
            {!pagePrompts.length ? (
              <div className="empty">
                <div className="empty-code">[ ]</div>
                <div style={{ fontSize: "14px", color: "var(--text2)" }}>nenhum prompt encontrado</div>
                <p>Tente outro filtro ou crie um novo prompt.</p>
                <button onClick={openNew}>+ adicionar prompt</button>
              </div>
            ) : (
              pagePrompts.map((p) => (
                <div className={`card ${expandedCards[p.id] ? "expanded" : ""}`} key={p.id}>
                  <div className="card-header">
                    <div className="card-title">{p.title}</div>
                    <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="icon-btn" onClick={() => void handleCopy(p)}>
                        cp
                      </button>
                    </div>
                  </div>
                  <div
                    className="prompt-expand-bar"
                    onClick={() => setExpandedCards((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                  >
                    {expandedCards[p.id] ? "recolher prompt" : "expandir prompt"}
                  </div>
                  {expandedCards[p.id] ? <div className="card-preview">{p.body}</div> : null}
                  <div className="card-desc">{p.desc || "sem descricao curta"}</div>
                  <div className="card-footer">
                    {(p.tags ?? []).slice(0, 2).map((t) => (
                      <span className="tag-pill" key={t}>
                        #{t}
                      </span>
                    ))}
                    <span className="meta">autor: {p.author || "anonimo"}</span>
                    <span className="copy-badge">copiado {p.copies ?? 0}x</span>
                  </div>
                  <div className="card-open-row">
                    <button className="btn-md" onClick={() => setCurrentViewId(p.id)}>
                      ver card expandido
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {totalPages > 1 ? (
            <div className="pagination">
              <button className="btn-md" disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => prev - 1)}>
                anterior
              </button>
              <span>
                pagina <b>{currentPage}</b> de <b>{totalPages}</b>
              </span>
              <button
                className="btn-md"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
              >
                proxima
              </button>
            </div>
          ) : null}
        </main>
      </div>

      {formOpen ? (
        <div className="overlay" onClick={(event) => (event.target === event.currentTarget ? setFormOpen(false) : null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">
                <span>// novo prompt</span> <span className="blink">_</span>
              </div>
              <button className="modal-close" onClick={() => setFormOpen(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div>
                <div className="field-label">titulo</div>
                <input className="field-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <div className="field-label">prompt</div>
                <textarea className="field-input" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
              </div>
              <div>
                <div className="field-label">autor</div>
                <input
                  className="field-input"
                  type="email"
                  value={form.email}
                  placeholder="seu@email.com"
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="field-row">
                <div>
                  <div className="field-label">tags</div>
                  <div className="tags-input-wrap">
                    <div className="tags-chip-list">
                      {form.tags.map((tag) => (
                        <button key={tag} type="button" className="tag-pill tag-chip-btn" onClick={() => removeTag(tag)}>
                          #{tag} ×
                        </button>
                      ))}
                    </div>
                    <input
                      className="field-input"
                      placeholder="digite e pressione enter"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={onTagInputKeyDown}
                      onBlur={() => addTag(tagInput)}
                    />
                  </div>
                </div>
                <div>
                  <div className="field-label">modelo utilizado</div>
                  <select className="field-input" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })}>
                    <option value="">selecione uma llm</option>
                    {llms.map((llm) => (
                      <option key={llm.id} value={llm.name}>
                        {llm.name}
                      </option>
                    ))}
                    {form.model && !llms.some((llm) => llm.name === form.model) ? (
                      <option value={form.model}>{form.model} (nao cadastrada)</option>
                    ) : null}
                  </select>
                </div>
              </div>
              <div>
                <div className="field-label">descricao curta</div>
                <input
                  className="field-input"
                  required
                  value={form.desc}
                  onChange={(e) => setForm({ ...form, desc: e.target.value })}
                />
              </div>
              <div className="review-box">
                <div className="field-label">agente revisor (v2)</div>
                {reviewerTips.map((tip) => (
                  <div key={tip} className="review-item">
                    {tip}
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setFormOpen(false)}>
                cancelar
              </button>
              <button className="btn-save" onClick={() => void handleSave()}>
                salvar prompt
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedPrompt ? (
        <div
          className="overlay"
          onClick={(event) => (event.target === event.currentTarget ? setCurrentViewId(null) : null)}
        >
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">
                // <span>{selectedPrompt.title}</span>
              </div>
              <button className="modal-close" onClick={() => setCurrentViewId(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="view-meta">
                criado {formatCreatedAt(selectedPrompt.created)}
                {selectedPrompt.author ? ` · autor: ${selectedPrompt.author}` : ""}
                {selectedPrompt.model ? ` · modelo: ${selectedPrompt.model}` : ""}
                {selectedPrompt.copies ? ` · copiado ${selectedPrompt.copies}x` : ""}
              </div>
              <div>
                <div className="field-label">prompt</div>
                <div className="view-prompt">{selectedPrompt.body}</div>
              </div>
              {(selectedPrompt.tags ?? []).length ? (
                <div>
                  <div className="field-label">tags</div>
                  <div className="view-tags">
                    {selectedPrompt.tags.map((t) => (
                      <span className="tag-pill" key={t}>
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {selectedPrompt.desc ? (
                <div>
                  <div className="field-label">descricao</div>
                  <div style={{ fontSize: "13px", color: "var(--text2)" }}>{selectedPrompt.desc}</div>
                </div>
              ) : null}
              <div className="view-actions">
                <button className="btn-copy" onClick={() => void handleCopy(selectedPrompt)}>
                  copiar prompt
                </button>
                <button
                  className="btn-md"
                  onClick={() => {
                    const blob = new Blob([toMD(selectedPrompt)], { type: "text/markdown" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `${selectedPrompt.title.toLowerCase().replace(/\s+/g, "-")}.md`;
                    a.click();
                  }}
                >
                  baixar .md
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="toast">
          <span className="dot" />
          {toast}
        </div>
      ) : null}

      {!onboardingDismissed ? (
        <div className="overlay" onClick={(e) => (e.target === e.currentTarget ? dismissOnboarding() : null)}>
          <div className="modal onboarding-modal">
            <div className="modal-header">
              <div className="modal-title">
                <span>// onboarding</span> <span className="blink">_</span>
              </div>
            </div>
            <div className="modal-body">
              <div className="onboarding-title">Crie prompts sem login</div>
              <div className="onboarding-copy">
                Ao criar um prompt, informe seu <b>email</b>. O prompt entra em fila para aprovação e só aparece no feed após liberar.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-save" onClick={dismissOnboarding}>
                entendi
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
