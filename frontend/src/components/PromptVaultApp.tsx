"use client";

import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePromptContext } from "@/context/PromptContext";
import { copyPrompt as copyPromptApi } from "@/data/promptApi";
import { Prompt } from "@/types/prompt";
import { getToken } from "@/data/authStore";
import { createLlm, deleteLlm, fetchAdminLlms, fetchLlms, LlmOption } from "@/data/llmApi";

const PAGE_SIZE = 9;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PromptVaultApp() {
  const { user, isAdmin, login, register, logout } = useAuth();
  const { prompts, loading, error, search, setSearch, activeTag, setActiveTag, savePrompt, removePrompt, refresh } =
    usePromptContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);
  const [sort, setSort] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [toast, setToast] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", author: "", tags: [] as string[], model: "", desc: "" });
  const [tagInput, setTagInput] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [registerForm, setRegisterForm] = useState({ email: "", password: "", confirm: "" });
  const [adminTab, setAdminTab] = useState<"pending" | "users" | "llms">("pending");
  const [adminOpen, setAdminOpen] = useState(false);
  const [pending, setPending] = useState<Prompt[]>([]);
  const [pendingViewId, setPendingViewId] = useState<string | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; email: string; active: boolean; roles: Array<"USER" | "ADMIN"> }>>([]);
  const [activeTab, setActiveTab] = useState<"all" | "mine">("all");
  const [categorySearch, setCategorySearch] = useState("");
  const [showMoreCategories, setShowMoreCategories] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [llms, setLlms] = useState<LlmOption[]>([]);
  const [adminLlms, setAdminLlms] = useState<LlmOption[]>([]);
  const [newLlmName, setNewLlmName] = useState("");

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
      const mineMatch = activeTab === "all" || (!!user?.email && (p.author ?? "").toLowerCase() === user.email.toLowerCase());
      const matchTag = activeTag === "all" || (p.tags ?? []).includes(activeTag);
      const matchQ =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q) ||
        (p.desc ?? "").toLowerCase().includes(q) ||
        (p.tags ?? []).join(" ").toLowerCase().includes(q);
      return mineMatch && matchTag && matchQ;
    });
    return [...list].sort((a, b) => {
      if (sort === "newest") return (b.created ?? 0) - (a.created ?? 0);
      if (sort === "oldest") return (a.created ?? 0) - (b.created ?? 0);
      if (sort === "alpha") return a.title.localeCompare(b.title);
      if (sort === "copies") return (b.copies ?? 0) - (a.copies ?? 0);
      return 0;
    });
  }, [activeTab, activeTag, prompts, search, sort, user?.email]);

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
  }, [search, activeTag, sort, activeTab]);

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
  const selectedPendingPrompt = useMemo(
    () => pending.find((p) => p.id === pendingViewId) ?? null,
    [pendingViewId, pending],
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
    if (!user) {
      showToast("faça login para criar prompts");
      setAuthMode("login");
      setLoginOpen(true);
      return;
    }
    setEditingId(null);
    setForm({ title: "", body: "", author: user?.email ?? "", tags: [], model: "", desc: "" });
    setTagInput("");
    setFormOpen(true);
  }

  function openEdit(id: string) {
    const prompt = prompts.find((p) => p.id === id);
    if (!prompt) return;
    if (!canEditPrompt(prompt)) {
      showToast("Apenas o autor pode editar este prompt");
      return;
    }
    setEditingId(id);
    setForm({
      title: prompt.title,
      body: prompt.body,
      author: prompt.author ?? "",
      tags: [...(prompt.tags ?? [])],
      model: prompt.model ?? "",
      desc: prompt.desc ?? "",
    });
    setTagInput("");
    setFormOpen(true);
    setCurrentViewId(null);
  }

  async function handleSave() {
    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      author: form.author.trim() || undefined,
      tags: form.tags,
      model: form.model.trim() || undefined,
      desc: form.desc.trim() || undefined,
    };
    if (!payload.title || !payload.body || !payload.desc) {
      showToast("Titulo, prompt e descricao curta sao obrigatorios");
      return;
    }
    await savePrompt(editingId, payload);
    setFormOpen(false);
    setEditingId(null);
    if (editingId) {
      showToast("Prompt atualizado");
      return;
    }
    showToast(isAdmin ? "Prompt publicado" : "Prompt enviado para moderacao");
  }

  function validateEmail(email: string) {
    return EMAIL_REGEX.test(email.trim());
  }

  async function handleCopy(prompt: Prompt) {
    await navigator.clipboard.writeText(prompt.body);
    await copyPromptApi(prompt.id);
    await refresh();
    showToast("Prompt copiado");
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remover este prompt?")) return;
    await removePrompt(id);
    setCurrentViewId(null);
    showToast("Prompt removido");
  }

  async function loadLlms() {
    const models = await fetchLlms();
    setLlms(models);
  }

  async function loadAdminLlms() {
    const models = await fetchAdminLlms();
    setAdminLlms(models);
  }

  function canEditPrompt(prompt: Prompt) {
    if (isAdmin) return true;
    if (!user?.email) return false;
    return (prompt.author ?? "").toLowerCase() === user.email.toLowerCase();
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

  async function handleClearAll() {
    if (!window.confirm("Isso vai apagar TODOS os prompts. Continuar?")) return;
    await Promise.all(prompts.map((p) => removePrompt(p.id)));
    showToast("Tudo limpo");
  }

  function onImport(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    let done = 0;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const text = String(ev.target?.result ?? "");
        const titleMatch = text.match(/^#\s+(.+)/m);
        const bodyMatch = text.match(/```[\w]*\n([\s\S]+?)\n```/);
        const tagsMatch = text.match(/\*\*Tags:\*\*\s*(.+)/);
        const modelMatch = text.match(/\*\*Modelo:\*\*\s*(.+)/);
        await savePrompt(null, {
          title: titleMatch ? titleMatch[1].trim() : file.name.replace(/\.md$/i, ""),
          body: bodyMatch ? bodyMatch[1] : text,
          tags: tagsMatch
            ? tagsMatch[1]
                .replace(/`/g, "")
                .split(" ")
                .filter((t) => t && t !== "—")
            : [],
          model: modelMatch?.[1]?.trim() || undefined,
        });
        done += 1;
        if (done === files.length) showToast(`${done} arquivo(s) importado(s)`);
      };
      reader.readAsText(file);
    });
    event.target.value = "";
  }

  function toMD(p: Prompt) {
    const tags = (p.tags ?? []).map((t) => `\`${t}\``).join(" ");
    return `# ${p.title}\n\n${p.desc ? `> ${p.desc}\n\n` : ""}**Modelo:** ${p.model || "nao especificado"}  \n**Tags:** ${
      tags || "—"
    }  \n**Criado:** ${formatCreatedAt(p.created)}  \n\n---\n\n\`\`\`\n${
      p.body
    }\n\`\`\`\n`;
  }

  function exportAll() {
    const md = prompts.map(toMD).join("\n\n---\n\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `marketplace-prompts-export-${Date.now()}.md`;
    a.click();
    showToast(`${prompts.length} prompts exportados`);
  }

  async function loadPending() {
    const token = getToken();
    if (!token) return;
    const response = await fetch("http://localhost:8080/api/admin/prompts/pending", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(await response.text());
    const data = (await response.json()) as Prompt[];
    setPending(data);
  }

  async function loadUsers() {
    const token = getToken();
    if (!token) return;
    const response = await fetch("http://localhost:8080/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(await response.text());
    const data = (await response.json()) as Array<{ id: string; email: string; active: boolean; roles: Array<"USER" | "ADMIN"> }>;
    setUsers(data);
  }

  async function handleAddLlm() {
    const name = newLlmName.trim();
    if (!name) {
      showToast("Digite o nome da LLM");
      return;
    }
    await createLlm(name);
    setNewLlmName("");
    await Promise.all([loadAdminLlms(), loadLlms()]);
    showToast("LLM cadastrada");
  }

  async function handleDeleteLlm(id: string) {
    const result = await deleteLlm(id);
    await Promise.all([loadAdminLlms(), loadLlms()]);
    if (result.deleted) {
      showToast("LLM removida");
      return;
    }
    showToast("LLM inativada (ja estava em uso)");
  }

  async function approvePrompt(id: string) {
    const token = getToken();
    if (!token) return;
    const response = await fetch(`http://localhost:8080/api/admin/prompts/${id}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(await response.text());
    await loadPending();
    await refresh();
  }

  async function rejectPrompt(id: string) {
    const token = getToken();
    if (!token) return;
    const response = await fetch(`http://localhost:8080/api/admin/prompts/${id}/reject`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(await response.text());
    await loadPending();
  }

  async function updateUserRole(id: string, role: "USER" | "ADMIN") {
    const token = getToken();
    if (!token) return;
    const response = await fetch(`http://localhost:8080/api/admin/users/${id}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) throw new Error(await response.text());
    await loadUsers();
  }

  function onGlobalKeys(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      setFormOpen(false);
      setCurrentViewId(null);
      setAdminOpen(false);
      setLoginOpen(false);
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
            {isAdmin ? <span onClick={exportAll}>~/export</span> : null}
            {isAdmin ? (
              <span
                onClick={async () => {
                  setAdminOpen(true);
                  try {
                    await loadPending();
                    await loadUsers();
                    await loadAdminLlms();
                  } catch (err) {
                    showToast((err as Error).message);
                  }
                }}
              >
                ~/admin
              </span>
            ) : null}
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
            {user ? (
              <button className="btn-theme" title={`sair (${user.email})`} onClick={logout}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M10 7V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M15 12H3m0 0 3-3m-3 3 3 3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>sair</span>
              </button>
            ) : (
              <button className="btn-theme" title="entrar" onClick={() => setLoginOpen(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M14 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M9 12h12m0 0-3-3m3 3-3 3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>entrar</span>
              </button>
            )}
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
              <button className={`btn-md ${activeTab === "all" ? "active-tab" : ""}`} onClick={() => setActiveTab("all")}>
                todos
              </button>
              <button
                className={`btn-md ${activeTab === "mine" ? "active-tab" : ""}`}
                onClick={() => {
                  if (!user) {
                    setAuthMode("login");
                    setLoginOpen(true);
                    return;
                  }
                  setActiveTab("mine");
                }}
              >
                meus prompts
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
            {isAdmin ? (
              <div className="tag-list">
                <label className="tag-item">
                  <span>importar .md</span>
                  <input type="file" accept=".md,.txt" multiple onChange={onImport} hidden />
                </label>
                <div className="tag-item" onClick={exportAll}>
                  <span>exportar tudo</span>
                </div>
                <div className="tag-item clear-all" onClick={() => void handleClearAll()}>
                  <span>limpar tudo</span>
                </div>
              </div>
            ) : (
              <div className="tag-list">
                <div className="tag-item">
                  <span>somente admin</span>
                </div>
              </div>
            )}
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
                      {canEditPrompt(p) ? (
                        <>
                          <button className="icon-btn" onClick={() => openEdit(p.id)}>
                            ed
                          </button>
                          <button className="icon-btn del" onClick={() => void handleDelete(p.id)}>
                            rm
                          </button>
                        </>
                      ) : null}
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
                <span>{editingId ? "// editar prompt" : "// novo prompt"}</span> <span className="blink">_</span>
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
                <input className="field-input" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
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
                {canEditPrompt(selectedPrompt) ? (
                  <button className="btn-cancel" style={{ marginLeft: "auto" }} onClick={() => openEdit(selectedPrompt.id)}>
                    editar
                  </button>
                ) : null}
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

      {!user && !onboardingDismissed ? (
        <div className="overlay" onClick={(e) => (e.target === e.currentTarget ? dismissOnboarding() : null)}>
          <div className="modal onboarding-modal">
            <div className="modal-header">
              <div className="modal-title">
                <span>// onboarding</span> <span className="blink">_</span>
              </div>
            </div>
            <div className="modal-body">
              <div className="onboarding-title">Entre para criar e salvar seus prompts</div>
              <div className="onboarding-copy">
                Com login, voce cria prompts, acompanha copias e usa a aba de prompts pessoais.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={dismissOnboarding}>
                depois
              </button>
              <button
                className="btn-save"
                onClick={() => {
                  dismissOnboarding();
                  setAuthMode("login");
                  setLoginOpen(true);
                }}
              >
                fazer login
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {loginOpen ? (
        <div className="overlay" onClick={(e) => (e.target === e.currentTarget ? setLoginOpen(false) : null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">
                <span>// auth</span> <span className="blink">_</span>
              </div>
              <button className="modal-close" onClick={() => setLoginOpen(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="auth-tabs">
                <button
                  className={`auth-tab ${authMode === "login" ? "active" : ""}`}
                  onClick={() => setAuthMode("login")}
                  type="button"
                >
                  login
                </button>
                <button
                  className={`auth-tab ${authMode === "register" ? "active" : ""}`}
                  onClick={() => setAuthMode("register")}
                  type="button"
                >
                  criar conta
                </button>
              </div>

              <div>
                <div className="field-label">email</div>
                <input
                  className="field-input"
                  type="email"
                  value={authMode === "login" ? loginForm.email : registerForm.email}
                  onChange={(ev) =>
                    authMode === "login"
                      ? setLoginForm({ ...loginForm, email: ev.target.value })
                      : setRegisterForm({ ...registerForm, email: ev.target.value })
                  }
                  placeholder="seu@email.com"
                />
              </div>
              <div>
                <div className="field-label">senha</div>
                <input
                  className="field-input"
                  type="password"
                  value={authMode === "login" ? loginForm.password : registerForm.password}
                  onChange={(ev) =>
                    authMode === "login"
                      ? setLoginForm({ ...loginForm, password: ev.target.value })
                      : setRegisterForm({ ...registerForm, password: ev.target.value })
                  }
                  placeholder="min 8 caracteres"
                />
              </div>

              {authMode === "register" ? (
                <>
                  <div>
                    <div className="field-label">confirmar senha</div>
                    <input
                      className="field-input"
                      type="password"
                      value={registerForm.confirm}
                      onChange={(ev) => setRegisterForm({ ...registerForm, confirm: ev.target.value })}
                      placeholder="repita a senha"
                    />
                  </div>
                  <div className="auth-hint">
                    recomendacao: use pelo menos <b>8</b> caracteres. (API aceita até <b>72</b>.)
                  </div>
                </>
              ) : null}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setLoginOpen(false)}>
                cancelar
              </button>
              <button
                className="btn-save"
                onClick={async () => {
                  try {
                    if (authMode === "login") {
                      if (!validateEmail(loginForm.email)) {
                        showToast("email invalido");
                        return;
                      }
                      await login(loginForm.email, loginForm.password);
                    } else {
                      if (!registerForm.email.trim() || !registerForm.password) {
                        showToast("preencha email e senha");
                        return;
                      }
                      if (!validateEmail(registerForm.email)) {
                        showToast("email invalido");
                        return;
                      }
                      if (registerForm.password.length < 8) {
                        showToast("senha deve ter pelo menos 8 caracteres");
                        return;
                      }
                      if (registerForm.password !== registerForm.confirm) {
                        showToast("senhas nao conferem");
                        return;
                      }
                      await register(registerForm.email, registerForm.password);
                    }
                    setLoginOpen(false);
                    showToast(authMode === "login" ? "logado" : "conta criada");
                  } catch (err) {
                    showToast((err as Error).message || "falha no login");
                  }
                }}
              >
                {authMode === "login" ? "entrar" : "criar conta"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {adminOpen ? (
        <div className="overlay" onClick={(e) => (e.target === e.currentTarget ? setAdminOpen(false) : null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">
                <span>// admin</span> <span className="blink">_</span>
              </div>
              <button className="modal-close" onClick={() => setAdminOpen(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="view-actions">
                <button className={`btn-md ${adminTab === "pending" ? "" : ""}`} onClick={() => setAdminTab("pending")}>
                  prompts pendentes ({pending.length})
                </button>
                <button className={`btn-md ${adminTab === "users" ? "" : ""}`} onClick={() => setAdminTab("users")}>
                  usuarios ativos ({users.length})
                </button>
                <button className={`btn-md ${adminTab === "llms" ? "" : ""}`} onClick={() => setAdminTab("llms")}>
                  llms ({adminLlms.length})
                </button>
              </div>

              {adminTab === "pending" ? (
                pending.length ? (
                  pending.map((p) => (
                    <div key={p.id} className="card" style={{ cursor: "default" }}>
                      <div className="card-header">
                        <div className="card-title">{p.title}</div>
                        <div className="view-actions" style={{ marginLeft: "auto" }}>
                          <button className="btn-md" onClick={() => setPendingViewId(p.id)}>
                            ver completo
                          </button>
                          <button
                            className="btn-copy"
                            onClick={async () => {
                              try {
                                await approvePrompt(p.id);
                                showToast("aprovado");
                              } catch (err) {
                                showToast((err as Error).message);
                              }
                            }}
                          >
                            aprovar
                          </button>
                          <button
                            className="btn-md"
                            onClick={async () => {
                              try {
                                await rejectPrompt(p.id);
                                showToast("reprovado (soft delete)");
                              } catch (err) {
                                showToast((err as Error).message);
                              }
                            }}
                          >
                            reprovar
                          </button>
                        </div>
                      </div>
                      <div className="card-preview">{p.body.slice(0, 200)}{p.body.length > 200 ? "..." : ""}</div>
                    </div>
                  ))
                ) : (
                  <div className="empty" style={{ padding: 24 }}>
                    <div style={{ fontSize: "14px", color: "var(--text2)" }}>sem prompts pendentes</div>
                  </div>
                )
              ) : adminTab === "users" ? (
                users.map((u) => (
                  <div key={u.id} className="card" style={{ cursor: "default" }}>
                    <div className="card-header">
                      <div className="card-title">{u.email}</div>
                      <div className="meta">roles: {(u.roles || []).join(", ")}</div>
                    </div>
                    <div className="view-actions">
                      <button className="btn-copy" onClick={() => void updateUserRole(u.id, "USER")}>
                        set USER
                      </button>
                      <button className="btn-md" onClick={() => void updateUserRole(u.id, "ADMIN")}>
                        set ADMIN
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div className="view-actions">
                    <input
                      className="field-input"
                      placeholder="nova llm (ex.: gpt-4.1)"
                      value={newLlmName}
                      onChange={(event) => setNewLlmName(event.target.value)}
                    />
                    <button className="btn-copy" onClick={() => void handleAddLlm()}>
                      cadastrar
                    </button>
                  </div>
                  {adminLlms.length ? (
                    adminLlms.map((llm) => (
                      <div key={llm.id} className="card" style={{ cursor: "default" }}>
                        <div className="card-header">
                          <div className="card-title">
                            {llm.name} {!llm.active ? <span className="llm-inactive-pill">inativa</span> : null}
                          </div>
                        </div>
                        <div className="view-actions">
                          <button className="btn-md" disabled={!llm.active} onClick={() => void handleDeleteLlm(llm.id)}>
                            {llm.active ? "remover/inativar" : "inativa"}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty" style={{ padding: 24 }}>
                      <div style={{ fontSize: "14px", color: "var(--text2)" }}>nenhuma llm cadastrada</div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setAdminOpen(false)}>
                fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedPendingPrompt ? (
        <div className="overlay" onClick={(e) => (e.target === e.currentTarget ? setPendingViewId(null) : null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">
                // <span>{selectedPendingPrompt.title}</span>
              </div>
              <button className="modal-close" onClick={() => setPendingViewId(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="view-meta">
                criado {formatCreatedAt(selectedPendingPrompt.created)}
                {selectedPendingPrompt.author ? ` · autor: ${selectedPendingPrompt.author}` : ""}
                {selectedPendingPrompt.model ? ` · modelo: ${selectedPendingPrompt.model}` : ""}
              </div>
              <div>
                <div className="field-label">prompt completo</div>
                <div className="view-prompt">{selectedPendingPrompt.body}</div>
              </div>
              <div className="view-actions">
                <button
                  className="btn-copy"
                  onClick={async () => {
                    await approvePrompt(selectedPendingPrompt.id);
                    setPendingViewId(null);
                    showToast("aprovado");
                  }}
                >
                  aprovar
                </button>
                <button
                  className="btn-md"
                  onClick={async () => {
                    await rejectPrompt(selectedPendingPrompt.id);
                    setPendingViewId(null);
                    showToast("reprovado (soft delete)");
                  }}
                >
                  reprovar
                </button>
                <button className="btn-cancel" style={{ marginLeft: "auto" }} onClick={() => setPendingViewId(null)}>
                  fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
